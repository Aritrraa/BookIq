# The Ultimate BookIQ Interview Q&A Guide

This guide is designed to help you easily understand the complex parts of your project so you can confidently explain them in an interview. 

For every question, we provide the **Simple Concept** (so you understand it in your head) followed by the **Professional Answer** (what you should actually say to the interviewer).

---

## Category 1: Architecture & System Design

### Q1: Why did you use two different databases (SQLite and ChromaDB) instead of just one?
**The Simple Concept:** Imagine a library. SQLite is the computer at the front desk—you type in "Author: J.K. Rowling" and it gives you exact matches instantly. ChromaDB is the librarian who has actually read the books. If you ask the librarian, "Do you have any books about feeling lonely in the wilderness?", they can give you a book even if the words "lonely" or "wilderness" aren't in the title. You need both to run a good library.

**The Professional Answer:** 
> "I used a dual-database architecture because relational and vector databases serve entirely different purposes. I used SQLite to store structured, deterministic metadata—like titles, exact genre tags, and star ratings—which is perfect for rendering the frontend dashboard and handling strict filtering. However, SQL cannot perform semantic search based on meaning. For that, I implemented ChromaDB to store 384-dimensional text embeddings of the book descriptions. This allows the AI agent to search for concepts and themes rather than relying on exact keyword matches."

### Q2: How did you ensure your web server didn't freeze when the AI was thinking?
**The Simple Concept:** If you go to a restaurant and the cashier goes back to the kitchen to cook your meal themselves, the line stops moving. Instead, the cashier takes your order, hands the ticket to the kitchen (a background thread), and immediately helps the next customer. 

**The Professional Answer:**
> "Generating AI summaries and text embeddings requires calling external APIs and running local models, which can take several seconds. If I ran this synchronously in my Django Views, it would block the HTTP request and freeze the user's browser. To solve this, I decoupled the AI processing from the web request. When a book is uploaded, Django immediately saves the raw data to SQLite and returns a success response to the user. Simultaneously, it spawns a native Python background thread (`threading.Thread`) to handle the heavy AI generation and vector embedding asynchronously behind the scenes."

---

## Category 2: AI & RAG Pipelines

### Q3: How do you prevent your AI from hallucinating (making things up)?
**The Simple Concept:** If you ask a student a hard question, they might guess and lie. If you give the student an open textbook and say, "Answer the question using *only* the highlighted paragraphs on page 42," they will give you a factual answer. That "open textbook" is RAG.

**The Professional Answer:**
> "LLMs are prone to hallucination, especially regarding specific or private datasets. I solved this by implementing a Retrieval-Augmented Generation (RAG) pipeline. When a user asks a question, my system does not rely on the LLM's internal training data. Instead, it first converts the question into a vector, searches ChromaDB for the most semantically relevant text chunks from my actual book database, and then injects those specific chunks into the LLM's prompt as strict context. The LLM acts only as a reasoning engine over the provided facts."

### Q4: Why did you use LangGraph instead of a standard RAG pipeline?
**The Simple Concept:** Standard RAG is a straight pipe: Search -> Answer. If the search fails, the answer is garbage. LangGraph is a flow-chart. It says: Search -> Did the search work? -> If yes, Answer. If no, try searching a different way.

**The Professional Answer:**
> "I chose LangGraph because standard LangChain RAG pipelines are highly linear and brittle. By using LangGraph, I created a stateful, agentic workflow. My agent evaluates its own retrieval step by checking the cosine similarity scores of the chunks. If the scores fall below a 15% relevance threshold, the graph conditionally routes to a fallback node—abandoning the vector search and instead enriching the context using structured metadata from SQLite. This cyclical decision-making prevents the LLM from generating answers based on poor retrieval data."

---

## Category 3: Web Scraping

### Q5: How did you automate getting book data from the internet?
**The Simple Concept:** The code acts like an invisible web browser. It visits a website, looks at the invisible HTML code that makes up the page, finds the exact HTML tags that hold the title and price, saves them, and then looks for the HTML tag for the "Next Page" button to click it automatically.

**The Professional Answer:**
> "I built an automated web scraper using Python's `requests` library to handle HTTP GET requests and `BeautifulSoup4` to parse the DOM tree. The script targets specific HTML classes and CSS selectors to extract book titles, prices, ratings, and image URLs. To handle pagination, it recursively searches for the 'Next' anchor tag and resolves the relative URLs using `urllib.parse.urljoin` to continue the scrape loop."

### Q6: What happens if you scrape a website too fast or too often? How did you handle that?
**The Simple Concept:** If you call a store 100 times a minute to ask for prices, they will block your phone number. To fix this, if we call and get the prices once, we write them down on a notepad. Before calling again, we check our notepad first. 

**The Professional Answer:**
> "Aggressive scraping can lead to IP bans or rate-limiting from the target server. To mitigate this and optimize performance, I implemented a local file-based caching system. Before executing an HTTP request, the scraper hashes the target URL using MD5 and checks if a corresponding JSON payload exists in the local cache directory. If the data was scraped recently, it loads from disk instead of hitting the remote server, vastly reducing network overhead and ensuring respectful scraping practices."

---

## Category 4: React & Frontend Integration

### Q7: How does your React app remember the conversation history with the AI?
**The Simple Concept:** The AI has no memory (it's "stateless"). Every time you talk to it, it's like meeting it for the first time. So, every time the user sends a new message, the React frontend gathers up the last 6 text messages and sends the entire transcript to the AI so it knows what you were talking about.

**The Professional Answer:**
> "Because HTTP APIs and LLMs are inherently stateless, I had to manage conversational memory on the client side. In my React `AskPage` component, I maintain the chat history using the `useState` hook. When the user submits a new prompt, my JavaScript logic slices the array to grab the last 6 messages. This payload is sent to the Django backend, where the LangGraph agent concatenates the history with the new prompt, ensuring the ChromaDB search query and the final LLM response are fully context-aware."

### Q8: Why did you write Vanilla CSS from scratch instead of using Tailwind or Bootstrap?
**The Simple Concept:** Buying a pre-built house (Tailwind) is fast, but building a house brick-by-brick (Vanilla CSS) proves you actually know how architecture works and lets you build exactly what you want without leftover junk.

**The Professional Answer:**
> "While utility-first frameworks like Tailwind are excellent for rapid prototyping, they can result in heavily bloated HTML and a steep learning curve for new team members reading the JSX. I chose to use Vanilla CSS leveraging CSS Custom Properties (CSS Variables) at the `:root` level. This allowed me to create a highly performant, custom design token system. It keeps my React components semantically clean, reduces the JavaScript bundle size, and demonstrates a deep, fundamental understanding of CSS Grid, Flexbox, and cascading inheritance."
