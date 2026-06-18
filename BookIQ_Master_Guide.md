# The BookIQ Master Guide: From Beginner to Advanced AI Engineering

This document is designed to take you from a basic understanding of web development to an advanced understanding of AI architecture, specifically focusing on Retrieval-Augmented Generation (RAG) and Agentic Workflows (LangGraph). 

It is structured to help you truly learn the codebase and prepare for technical interviews.

---

## Part 1: The 10,000-Foot View (System Architecture)

**Interview Prep:** *“Can you describe the architecture of your BookIQ project?”*

**How to answer:** 
"BookIQ is a full-stack AI application. The frontend is built with React and Vanilla CSS for high performance. The backend is a Python Django REST API. For data storage, it uses a dual-database architecture: SQLite for structured relational metadata (like book titles, authors, and AI-generated summaries) and ChromaDB, a local vector database, to store semantic embeddings of the book descriptions. The core intelligence is driven by a LangGraph stateful agent that orchestrates a RAG pipeline, utilizing the Groq API (llama-3.3-70b) for text generation and sentence-transformers for local text embedding."

### Why this architecture?
1. **Dual Databases**: You can't perform SQL queries on "meaning". You need SQLite to filter by rating (`WHERE rating > 4`) and ChromaDB to search by concept ("books about loneliness").
2. **Local Embeddings**: By running `sentence-transformers` locally, you save money and reduce API latency compared to sending every chunk to OpenAI for embedding.
3. **LangGraph over Linear RAG**: A simple RAG pipeline fails if the vector search returns garbage. LangGraph allows the system to evaluate its own search results and fallback to database metadata if necessary.

---

## Part 2: The RAG Engine (`backend/books/ai_service.py`)

RAG (Retrieval-Augmented Generation) is how you give an LLM an "open-book test." 

### 1. Generating Embeddings (The "Indexing" Phase)

You can't search raw text mathematically. You must convert it to an **Embedding**—a long array of numbers (a vector) that represents the *meaning* of the text.

```python
# ai_service.py - Line 31
def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        # Loads the AI model into memory. all-MiniLM-L6-v2 converts 
        # text into a 384-dimensional vector.
        _embedder = SentenceTransformer("all-MiniLM-L6-v2") 
    return _embedder
```

### 2. Smart Chunking

LLMs have a "context window" (a memory limit). You can't feed a whole book into the LLM. You must break the book into "chunks".

```python
# ai_service.py - Line 54
def smart_chunk(text: str, book_id: int, title: str, chunk_size: int = 300, overlap: int = 50) -> list[dict]:
    # This function breaks long text into chunks of 300 words.
    # The 'overlap=50' is crucial for interviews!
    # If a sentence starts at the end of Chunk 1 and ends in Chunk 2, 
    # the LLM loses the context. Overlapping chunks ensures no meaning is cut in half.
```

### 3. Storing in ChromaDB

```python
# ai_service.py - Line 111
def store_book_embeddings(book_id: int, title: str, text: str) -> int:
    chunks = smart_chunk(text, book_id, title)
    embedder = _get_embedder()
    collection = _get_chroma_collection() # Connects to the local vector DB

    # Extracts just the text from our chunk dictionaries
    texts = [c["text"] for c in chunks] 
    
    # The embedder converts the text arrays into vector arrays
    embeddings = embedder.encode(texts, batch_size=32).tolist()
    
    # Saves the ID, the mathematical vector, the raw text, and metadata to ChromaDB
    collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
```

### 4. The Search (The "Retrieval" in RAG)

```python
# ai_service.py - Line 139
def similarity_search(query: str, n_results: int = 5, book_id: Optional[int] = None) -> list[dict]:
    embedder = _get_embedder()
    collection = _get_chroma_collection()

    # 1. Take the user's question and convert it into a vector
    query_embedding = embedder.encode(query).tolist()

    # 2. Ask ChromaDB to perform a "Cosine Similarity" search.
    # It compares the question's vector against all vectors in the DB 
    # and returns the closest matches.
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"book_id": str(book_id)} if book_id else None
    )
    # Returns the top 5 chunks of text that match the meaning of the question.
```

---

## Part 3: The Brain (`backend/books/agent.py`)

This is the most advanced part of the project. **LangGraph** allows you to build cyclic, conditional workflows (agents) instead of straight-line scripts.

### 1. The State
LangGraph works by passing a "State" dictionary between different functions (Nodes). Every node reads the state, does some work, and returns updates to the state.

```python
# agent.py - Line 23
class AgentState(TypedDict, total=False):
    question: str       # The user's input
    history: list       # Previous chat messages
    question_type: str  # Added by Node 1: factual, recommendation, etc.
    search_query: str   # Added by Node 1: optimized query
    chunks: list        # Added by Node 2: Raw ChromaDB results
    context: str        # Added by Node 3: Filtered, readable text for the LLM
    answer: str         # Added by Node 4: The final LLM response
    steps: list         # A trace of the path taken
```

### 2. The Nodes (Line-by-Line Breakdown)

**Node 1: Classify**
```python
# agent.py - Line 39
def classify_question(state: AgentState) -> dict:
    question = state["question"]
    # We ask Groq to categorize the question. Why? Because comparing two books
    # requires a different search strategy than asking a factual question.
    prompt = f'Classify this... Categories: factual, recommendation, comparison, general'
    q_type = _gpt(prompt) # Returns e.g., "comparison"

    # If it's a comparison, we search using the exact text. 
    # If there is chat history, we append it to the search query to maintain context.
    search_query = question
    if state.get("history") and q_type != "comparison":
        recent = " ".join([m["content"] for m in state["history"][-2:]])
        search_query = f"{recent} {question}"

    # Returns the updates to the AgentState
    return {"question_type": q_type, "search_query": search_query, "steps": ["classify"]}
```

**Node 2: Search**
```python
# agent.py - Line 77
def search_books(state: AgentState) -> dict:
    from .ai_service import similarity_search
    # Calls the ChromaDB search we defined in Part 2.
    # Note how it uses the 'question_type' from Node 1 to decide how many results to get!
    chunks = similarity_search(
        state.get("search_query"),
        n_results=8 if state.get("question_type") == "comparison" else 5,
    )
    return {"chunks": chunks}
```

**Node 3: Evaluate**
```python
# agent.py - Line 99
def evaluate_results(state: AgentState) -> dict:
    chunks = state.get("chunks", [])
    # CRITICAL: It doesn't blindly trust the DB. It checks the 'score'.
    # If the score is < 0.15, the chunk is irrelevant garbage.
    good = [c for c in chunks if c.get("score", 0) >= 0.15]

    if not good:
        # If no good chunks exist, it signals the graph to take a different path
        return {"context": "", "method": "metadata-fallback"}

    # Formats the good chunks into a string for the LLM
    context_parts = [f'[Source: "{c["metadata"]["title"]}"]\n{c["text"]}' for c in good]
    return {"context": "\n\n".join(context_parts), "method": "rag"}
```

**Node 4: Enrich (The Fallback Mechanism)**
```python
# agent.py - Line 139
def enrich_context(state: AgentState) -> dict:
    # If vector search failed, we query the standard SQLite database instead.
    # We pull the title, author, AI summary, and tags.
    # This prevents the bot from saying "I don't know" and instead allows it to
    # answer based on broad metadata.
```

**Node 5: Generate**
```python
# agent.py - Line 192
def generate_answer(state: AgentState) -> dict:
    # Gets the context (either from RAG chunks or Enrich SQLite data)
    context = state.get("context", "")
    q_type = state.get("question_type", "general")

    # Dynamically formats the "System Prompt" based on Node 1's classification.
    # This forces the LLM to output numbered lists for recommendations, or
    # bullet points for comparisons.
    type_instructions = {
        "factual": "Give a precise, well-cited factual answer.",
        "recommendation": "Give personalized book recommendations... Format as a numbered list."
    }

    system = f"You are BookIQ... This is a {q_type} question. {type_instructions.get(q_type, '')}"
    prompt = f"Book context:\n{context}\n\nQuestion: {state['question']}"

    # Makes the final call to Groq
    answer = _gpt(prompt, system=system, history=state["history"])
    return {"answer": answer}
```

### 3. Compiling the Graph

```python
# agent.py - Line 258
def build_agent_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    # ... add nodes ...
    
    graph.set_entry_point("classify")
    graph.add_edge("classify", "search")
    graph.add_edge("search", "evaluate")
    
    # Conditional edge: The graph looks at a custom function (should_enrich)
    # to decide where to go next based on the current State.
    graph.add_conditional_edges("evaluate", should_enrich, {
        "generate": "generate", 
        "enrich": "enrich",
    })
    graph.add_edge("enrich", "generate")
    graph.add_edge("generate", END)
    
    return graph.compile()
```

---

## Part 4: The Backend Integration (`backend/books/views.py`)

How does Django trigger the LangGraph agent?

```python
# views.py - Line 116
class AskView(APIView):
    def post(self, request):
        question = request.data.get("question")
        history = request.data.get("history", []) # Receives last 6 messages from React
        
        from .agent import agent_query
        # Triggers the entire graph execution
        result = agent_query(question, history=history) 
        
        return Response(result) # Sends answer, sources, and agent steps back to React
```

---

## Part 5: The Frontend (`frontend/src/pages/AskPage.jsx`)

The frontend is built in React. The most complex part is managing conversational memory.

```javascript
// AskPage.jsx
const send = async (q) => {
    // 1. Maintain conversation history. We take the current messages, 
    // remove the initial system greeting (slice(1)), and grab only the last 6 messages.
    // Why 6? To prevent sending too much text to the backend and hitting token limits.
    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content })).slice(-6);

    // 2. Optimistic UI update: Show the user's message immediately
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
        // 3. Call the Django API
        const res = await askQuestion(q, bookId || null, history);
        
        // 4. Append the Assistant's response to the chat window, 
        // including the LangGraph trace (res.agent_steps)
        setMessages(prev => [...prev, { 
            role: "assistant", 
            content: res.answer, 
            sources: res.sources,
            method: res.method,
            agent_steps: res.agent_steps, 
            question_type: res.question_type 
        }]);
    } catch (e) {
        // handle error
    }
}
```

---

## Part 6: Interview Preparation Questions

If you list this project on your resume, expect these questions:

**1. Why did you use LangGraph instead of a standard LangChain RAG chain?**
*Answer:* "Standard RAG is highly linear. If the vector search returns poor results, the LLM hallucinates or fails. By using LangGraph, I created a stateful agent that can evaluate its own retrieval step. If semantic similarity scores are below a threshold (0.15), the graph conditionally routes to a fallback node that enriches the context using structured metadata from SQLite before attempting generation."

**2. How did you handle chunking for your embeddings?**
*Answer:* "I implemented a smart chunking strategy. It first attempts to split on natural boundaries like paragraphs (`\n\n`), then falls back to sentence boundaries (`.!?`). If a block is still too large, it uses a word-based sliding window of ~300 words with a 50-word overlap. The overlap is critical to prevent losing semantic context for concepts that span across the cut-off point."

**3. What is the difference between your SQLite and ChromaDB usage?**
*Answer:* "SQLite is used for deterministic filtering and relational data—for example, rendering the dashboard, filtering books by rating, or managing the scrape logs. ChromaDB is used strictly for semantic search. It stores the 384-dimensional dense vectors generated by `sentence-transformers`, allowing the system to find text based on conceptual similarity rather than exact keyword matches."

**4. How does conversational memory work in your application?**
*Answer:* "Memory is managed on the client side (React). The `AskPage` component maintains a state array of message objects. When a new question is submitted, the frontend slices the last 6 messages and sends them as a `history` array in the POST request. In the backend, the LangGraph agent's 'Classify' node concatenates this history with the new question to formulate a context-aware search query for ChromaDB."
