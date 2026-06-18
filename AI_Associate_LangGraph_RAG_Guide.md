# The AI Associate's Guide: LangChain, LangGraph & RAG Pipelines

This document is designed to give you a deep, technical understanding of modern AI application architecture, specifically tailored for an AI Associate interview. It uses the BookIQ project as a real-world reference.

---

## Part 1: Demystifying RAG (Retrieval-Augmented Generation)

Large Language Models (LLMs) like GPT-4 or Llama-3 have a massive problem: **Hallucinations**. If they don't know the answer, they make one up. They also don't know your private data (like your specific database of books).

**RAG is the solution.** It turns a "closed-book test" into an "open-book test". Before asking the LLM the question, you search your own database for the relevant text, and hand that text to the LLM saying: *"Only use this provided text to answer the question."*

### A standard RAG Pipeline has 3 steps:

#### Step 1: Ingestion (Chunking & Embedding)
You cannot feed a 500-page book to an LLM. You must chop it into "Chunks" and convert those chunks into mathematical vectors (Embeddings).

**The Code:**
```python
# ai_service.py
def store_book_embeddings(book_id, title, text):
    # 1. CHUNKING: Break the text into 300-word blocks with a 50-word overlap.
    chunks = smart_chunk(text) 
    
    # 2. EMBEDDING: Use an AI model (sentence-transformers) to convert the text chunks 
    # into a high-dimensional mathematical array (e.g., [0.12, -0.45...]).
    embedder = _get_embedder()
    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts)
    
    # 3. STORAGE: Save these vectors into a Vector Database (ChromaDB)
    collection = _get_chroma_collection()
    collection.add(embeddings=embeddings, documents=texts...)
```

#### Step 2: Retrieval (Semantic Search)
When the user asks a question, you convert their question into a vector using the *exact same* embedding model. Then, you ask the Vector Database to find the chunks that are mathematically closest to the question.

**The Code:**
```python
# ai_service.py
def similarity_search(query: str):
    query_embedding = embedder.encode(query)
    
    # ChromaDB uses 'Cosine Similarity' to find vectors pointing in the same direction.
    results = collection.query(query_embeddings=[query_embedding], n_results=5)
    
    return results["documents"] # Returns the top 5 most relevant chunks of text
```

#### Step 3: Generation
You take those 5 chunks of text and combine them with the user's original question into a single prompt for the LLM.

**The Code:**
```python
# The final prompt looks like this:
prompt = f"""
Use the following context to answer the user's question. 

Context:
[Chunk 1: "Harry Potter is a wizard..."]
[Chunk 2: "Hogwarts is a school..."]

Question: Who is Harry Potter?
"""
answer = _gpt(prompt)
```

---

## Part 2: LangChain Overview

**What is LangChain?**
LangChain is a framework (written in Python and JS) that makes it easy to build LLM applications. Before LangChain, developers had to write hundreds of lines of code to connect to the OpenAI API, format prompts, and parse responses. 

LangChain provides standard "building blocks":
1.  **Models:** Easy wrappers to connect to OpenAI, Groq, Anthropic, etc.
2.  **Prompt Templates:** Easy ways to insert variables into prompts.
3.  **Chains:** Linking steps together (e.g., Prompt -> Model -> Output Parser).
4.  **Tools:** Giving the LLM the ability to search the web, run Python code, or query a database.

**The Limitation of Standard LangChain:**
Standard LangChain "Chains" are linear. (Step A -> Step B -> Step C). If Step B fails, the chain breaks. This led to the creation of LangGraph.

---

## Part 3: LangGraph (Agentic Workflows)

**What is LangGraph?**
LangGraph is built *on top* of LangChain. It allows you to build **Stateful, Multi-Actor Applications**. Instead of a straight line, you build a "Graph" with loops, conditions, and memory.

This is what turns a simple script into an **AI Agent**. The agent can "think", evaluate its own work, and decide what to do next.

### The 3 Core Concepts of LangGraph:

1.  **State:** A shared dictionary of data. Every Node reads the State and updates it.
2.  **Nodes:** Python functions that do actual work (e.g., "Search DB", "Call LLM").
3.  **Edges:** The rules that dictate which Node runs next.

### Analyzing the BookIQ LangGraph Agent (`agent.py`)

**1. The State**
```python
class AgentState(TypedDict):
    question: str       # Input from user
    question_type: str  # Added by classify node
    chunks: list        # Added by search node
    context: str        # Added by evaluate node
    answer: str         # Added by generation node
```

**2. A Node (Evaluating the RAG Search)**
This is where the Agent acts "smart". It doesn't blindly pass data to the LLM. It checks if the search was actually successful.
```python
def evaluate_results(state: AgentState):
    chunks = state.get("chunks", [])
    
    # Check the relevance score from ChromaDB. If it's below 0.15, it's garbage data.
    good_chunks = [c for c in chunks if c.get("score") >= 0.15]

    if not good_chunks:
        # We update the State to show we have NO context
        return {"context": ""} 

    # Otherwise, we update the State with the good text
    context = "\n".join([c["text"] for c in good_chunks])
    return {"context": context}
```

**3. The Edges (Conditional Routing)**
This is the magic of LangGraph. We build the graph and set rules.

```python
def build_agent_graph():
    graph = StateGraph(AgentState)
    
    # Add our nodes (functions)
    graph.add_node("search", search_books)
    graph.add_node("evaluate", evaluate_results)
    graph.add_node("enrich", enrich_context) # A fallback node!
    graph.add_node("generate", generate_answer)
    
    graph.add_edge("search", "evaluate")
    
    # CONDITIONAL EDGE: Decide what to do based on the 'evaluate' node's results
    def should_enrich(state: AgentState):
        if state.get("context"):
            return "generate" # We have data, go to LLM
        return "enrich"       # We failed, take a detour to the fallback database
        
    graph.add_conditional_edges("evaluate", should_enrich, {
        "generate": "generate",
        "enrich": "enrich"
    })
    
    return graph.compile()
```

---

## Part 4: AI Associate Interview Questions

If you are interviewing for an AI Associate role, expect these questions based on this architecture.

**Q1: What is the purpose of "Chunking" in a RAG pipeline, and why is "Overlap" important?**
> **Answer:** LLMs have strict context window limits (e.g., 8k or 128k tokens). We cannot pass entire books or massive documents in a single prompt. Chunking breaks large documents into manageable pieces. "Overlap" is critical because if a sentence or concept is split right down the middle of a chunk boundary, the semantic meaning is lost. Overlapping chunks (e.g., by 50 words) ensures context is preserved across boundaries.

**Q2: Explain the difference between a Relational Database (like SQL) and a Vector Database (like ChromaDB). Why do we need Vector DBs for AI?**
> **Answer:** SQL databases store structured data in rows and columns and require exact keyword matches (e.g., `WHERE word = 'sad'`). Vector databases store text as high-dimensional mathematical embeddings. This enables *Semantic Search*. If a user searches for "depressing", a Vector DB will return chunks containing the word "sad" because their mathematical vectors exist close to each other in vector space, allowing the AI to search by *meaning*, not just exact words.

**Q3: Why would you choose to use LangGraph instead of a standard LangChain RAG pipeline?**
> **Answer:** Standard LangChain creates linear chains (`Prompt -> Retrieval -> LLM`). This is rigid. If the retrieval step returns irrelevant data, the LLM hallucinates based on bad data. LangGraph allows us to build stateful, cyclical agents. I can write a Node that evaluates the retrieval score. If the score is too low, LangGraph can conditionally route the application to try a different search query, fallback to a different database, or ask the user for clarification, making the application much more robust.

**Q4: How do you handle conversational memory in a stateless API?**
> **Answer:** LLM APIs (like OpenAI or Groq) are inherently stateless; they don't remember the previous API call. To give the AI memory, we must manage it client-side or in our own database. In my project, the frontend maintains an array of the chat history. When the user sends a new message, we slice the last 6 messages and send them in the API payload. The LangGraph agent concatenates this history to understand context before formulating a search query.

**Q5: What embedding model did you use, and why did you run it locally instead of using an API?**
> **Answer:** I used `sentence-transformers` (specifically `all-MiniLM-L6-v2`) to generate embeddings locally. While OpenAI's embedding API is powerful, running a lightweight model locally eliminates network latency during the critical search phase and is completely free, which is ideal for a fast, cost-effective RAG pipeline.
