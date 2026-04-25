"""
BookIQ LangGraph Agent
A stateful, multi-step RAG agent using LangGraph.

Graph flow:
  START -> classify -> search -> evaluate -> generate -> END
                                    |
                                    +-> enrich (if search results are poor) -> generate -> END
"""
import logging
import json
import re
from typing import Optional, Literal
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


# ── Agent State ───────────────────────────────────────────────────────────────

class AgentState(TypedDict, total=False):
    question: str
    book_id: Optional[int]
    history: list
    question_type: str          # factual | recommendation | comparison | general
    search_query: str
    chunks: list
    sources: list
    context: str
    answer: str
    method: str
    steps: list                 # traces each node visited


# ── Node Functions ────────────────────────────────────────────────────────────

def classify_question(state: AgentState) -> dict:
    """Classify the question type so downstream nodes can adapt."""
    from .ai_service import _gpt

    question = state["question"]
    prompt = (
        f'Classify this book-related question into exactly ONE category.\n'
        f'Question: "{question}"\n\n'
        f'Categories:\n'
        f'- factual: asking about specific facts, plots, authors, themes\n'
        f'- recommendation: asking for book suggestions\n'
        f'- comparison: asking to compare two or more books\n'
        f'- general: anything else (greetings, broad library questions)\n\n'
        f'Return ONLY the category word, nothing else.'
    )
    result = _gpt(prompt, max_tokens=10)
    q_type = result.strip().lower().split()[0] if result else "general"

    valid = {"factual", "recommendation", "comparison", "general"}
    if q_type not in valid:
        q_type = "general"

    # Build a smarter search query for comparisons
    search_query = question
    if q_type == "comparison":
        search_query = question  # keep full text for multi-book matching
    elif state.get("history"):
        recent = " ".join([m["content"] for m in state["history"][-2:]])
        search_query = f"{recent} {question}"

    logger.info(f"[Agent] Classified as: {q_type}")
    return {
        "question_type": q_type,
        "search_query": search_query,
        "steps": state.get("steps", []) + [f"classify:{q_type}"],
    }


def search_books(state: AgentState) -> dict:
    """Search ChromaDB for relevant book chunks."""
    from .ai_service import similarity_search

    chunks = []
    try:
        chunks = similarity_search(
            state.get("search_query", state["question"]),
            n_results=8 if state.get("question_type") == "comparison" else 5,
            book_id=state.get("book_id"),
        )
    except Exception as e:
        logger.warning(f"[Agent] Vector search error: {e}")

    logger.info(f"[Agent] Found {len(chunks)} chunks")
    return {
        "chunks": chunks,
        "steps": state.get("steps", []) + [f"search:{len(chunks)}_chunks"],
    }


def evaluate_results(state: AgentState) -> dict:
    """Evaluate search quality and build context + sources."""
    chunks = state.get("chunks", [])
    good = [c for c in chunks if c.get("score", 0) >= 0.15]

    if not good:
        logger.info("[Agent] No good chunks — will enrich from metadata")
        return {
            "context": "",
            "sources": [],
            "method": "metadata-fallback",
            "steps": state.get("steps", []) + ["evaluate:no_good_chunks"],
        }

    # Build context string with citations
    context_parts = []
    sources = []
    seen = set()
    for chunk in good[:5]:
        meta = chunk["metadata"]
        context_parts.append(
            f'[Source: "{meta["title"]}" chunk {meta["chunk_index"]+1}]\n{chunk["text"]}'
        )
        if meta["book_id"] not in seen:
            seen.add(meta["book_id"])
            sources.append({
                "book_id": int(meta["book_id"]),
                "title": meta["title"],
                "relevance_score": round(chunk["score"], 3),
            })

    logger.info(f"[Agent] {len(good)} quality chunks from {len(sources)} books")
    return {
        "context": "\n\n".join(context_parts),
        "sources": sources,
        "method": "rag",
        "steps": state.get("steps", []) + [f"evaluate:{len(good)}_good"],
    }


def enrich_context(state: AgentState) -> dict:
    """Fallback: build context from database metadata when RAG has no results."""
    from .models import Book

    book_id = state.get("book_id")
    if book_id:
        books_qs = list(Book.objects.filter(id=book_id))
        if not books_qs:
            books_qs = list(Book.objects.all()[:15])
    else:
        books_qs = list(Book.objects.all()[:15])

    if not books_qs:
        return {
            "context": "",
            "sources": [],
            "steps": state.get("steps", []) + ["enrich:no_books"],
        }

    lines = []
    for b in books_qs:
        parts = [f'Title: "{b.title}"']
        if b.author and b.author != "Unknown":
            parts.append(f"Author: {b.author}")
        genre = b.ai_genre or b.genre
        if genre:
            parts.append(f"Genre: {genre}")
        if b.rating:
            parts.append(f"Rating: {b.rating}/5")
        if b.ai_sentiment:
            parts.append(f"Tone: {b.ai_sentiment}")
        if b.ai_summary:
            parts.append(f"Summary: {b.ai_summary}")
        elif b.description:
            parts.append(f"Description: {b.description[:400]}")
        if b.ai_tags:
            parts.append(f"Themes: {', '.join(b.ai_tags)}")
        lines.append(" | ".join(parts))

    sources = [
        {"book_id": b.id, "title": b.title, "relevance_score": 0.0,
         "author": b.author, "cover_image": b.cover_image, "book_url": b.book_url}
        for b in books_qs[:5]
    ]

    logger.info(f"[Agent] Enriched with {len(books_qs)} books from DB")
    return {
        "context": "\n".join(lines),
        "sources": sources,
        "steps": state.get("steps", []) + [f"enrich:{len(books_qs)}_books"],
    }


def generate_answer(state: AgentState) -> dict:
    """Generate the final answer using Groq with full context."""
    from .ai_service import _gpt

    question = state["question"]
    context = state.get("context", "")
    q_type = state.get("question_type", "general")
    method = state.get("method", "rag")
    history = state.get("history")

    if not context:
        return {
            "answer": "I don't have enough information to answer that. Try adding more books or running the scraper.",
            "method": "error",
            "steps": state.get("steps", []) + ["generate:no_context"],
        }

    # Tailor the system prompt based on question type
    type_instructions = {
        "factual": "Give a precise, well-cited factual answer. Reference specific book titles and details.",
        "recommendation": "Give personalized book recommendations with reasons. Format as a numbered list with brief explanations for each.",
        "comparison": "Compare the books systematically. Use clear sections or bullet points for each aspect (themes, tone, style, etc.).",
        "general": "Give a helpful, well-structured overview referencing specific books from the library.",
    }

    system = (
        "You are BookIQ, an expert AI book assistant powered by a RAG pipeline. "
        f"This is a {q_type} question. {type_instructions.get(q_type, '')} "
        "IMPORTANT: Format your answer with clear line breaks, bullet points, and short paragraphs. "
        "Never output a single congested paragraph. Cite your sources."
    )

    if method == "rag":
        prompt = f"Book context:\n{context}\n\nQuestion: {question}\n\nAnswer with source citations."
    else:
        prompt = (
            f"Book library:\n\n{context}\n\n"
            f"User question: {question}\n\n"
            "Give a specific, helpful answer referencing actual books from the library above."
        )

    answer = _gpt(prompt, system=system, max_tokens=600, history=history)

    if not answer:
        answer = "Could not generate a response. Please check that GROQ_API_KEY is set in backend/.env."
        method = "error"

    logger.info(f"[Agent] Generated answer via {method}")
    return {
        "answer": answer,
        "method": method,
        "steps": state.get("steps", []) + [f"generate:{method}"],
    }


# ── Conditional Edges ─────────────────────────────────────────────────────────

def should_enrich(state: AgentState) -> Literal["enrich", "generate"]:
    """Route to enrich if no good RAG context, otherwise generate directly."""
    if state.get("context"):
        return "generate"
    return "enrich"


# ── Build the Graph ───────────────────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    """Construct and compile the LangGraph agent."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("classify", classify_question)
    graph.add_node("search", search_books)
    graph.add_node("evaluate", evaluate_results)
    graph.add_node("enrich", enrich_context)
    graph.add_node("generate", generate_answer)

    # Add edges
    graph.set_entry_point("classify")
    graph.add_edge("classify", "search")
    graph.add_edge("search", "evaluate")
    graph.add_conditional_edges("evaluate", should_enrich, {
        "generate": "generate",
        "enrich": "enrich",
    })
    graph.add_edge("enrich", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


# ── Singleton compiled graph ──────────────────────────────────────────────────
_agent = None

def get_agent():
    global _agent
    if _agent is None:
        _agent = build_agent_graph()
        logger.info("[Agent] LangGraph agent compiled.")
    return _agent


# ── Public API ────────────────────────────────────────────────────────────────

def agent_query(question: str, book_id: Optional[int] = None, history: list = None) -> dict:
    """
    Run the LangGraph agent for a book question.
    Returns: { answer, sources, chunks_used, method, agent_steps }
    """
    agent = get_agent()

    initial_state: AgentState = {
        "question": question,
        "book_id": book_id,
        "history": history or [],
        "question_type": "",
        "search_query": question,
        "chunks": [],
        "sources": [],
        "context": "",
        "answer": "",
        "method": "",
        "steps": [],
    }

    try:
        result = agent.invoke(initial_state)

        return {
            "answer": result.get("answer", "No answer generated."),
            "sources": result.get("sources", []),
            "chunks_used": len([c for c in result.get("chunks", []) if c.get("score", 0) >= 0.15]),
            "method": result.get("method", "agent"),
            "agent_steps": result.get("steps", []),
            "question_type": result.get("question_type", "general"),
        }
    except Exception as e:
        logger.error(f"[Agent] Error: {e}")
        return {
            "answer": f"Agent error: {e}. Please check your GROQ_API_KEY.",
            "sources": [],
            "chunks_used": 0,
            "method": "error",
            "agent_steps": ["error"],
            "question_type": "unknown",
        }
