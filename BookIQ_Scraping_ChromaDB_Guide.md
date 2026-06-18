# Deep Dive: Web Scraping & Leveraging ChromaDB

This guide provides a detailed, line-by-line breakdown of two critical components in the BookIQ architecture: how data is automatically gathered via **Web Scraping**, and how that data is made searchable via semantic meaning using **ChromaDB**.

---

## Part 1: Automated Web Scraping in Detail

Web scraping is the process of writing code that mimics a human browsing a website. It downloads the webpage's raw HTML and extracts the necessary data. In BookIQ, this is handled in `backend/books/scraper.py`.

### The Core Scraping Function

We use `requests` to download the HTML and `BeautifulSoup` to parse it. 

Here is the actual line-by-line breakdown of the scraping logic:

```python
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://books.toscrape.com/catalogue/category/books_1/page-1.html"

def scrape_books(max_pages: int = 2):
    # 1. Initialize an empty list to store the scraped books
    scraped_data = []
    
    # 2. Start a loop to go through multiple pages (Pagination)
    current_url = BASE_URL
    pages_scraped = 0
    
    while current_url and pages_scraped < max_pages:
        # 3. HTTP GET Request
        # The code visits the URL. 'response' contains the server's reply (status code + HTML body).
        response = requests.get(current_url)
        
        # 4. Parsing the HTML
        # We hand the raw HTML text to BeautifulSoup. 'html.parser' tells it how to read the text.
        # 'soup' is now an object that allows us to search the HTML like a tree.
        soup = BeautifulSoup(response.text, "html.parser")
        
        # 5. Finding Book Containers
        # soup.find_all looks for all <article> HTML tags that have the class name "product_pod".
        # On this website, every book on the list page is wrapped in an <article class="product_pod">.
        book_articles = soup.find_all("article", class_="product_pod")
        
        # 6. Looping through each book on the page
        for article in book_articles:
            
            # --- EXTRACTING TITLE ---
            # Finds the first <h3> tag, then looks for the <a> (link) tag inside it.
            # We extract the 'title' attribute of that link.
            title_element = article.find("h3").find("a")
            title = title_element["title"]
            
            # --- EXTRACTING PRICE ---
            # Finds a <p> tag with the class "price_color". Gets the text inside (e.g., "£51.77").
            price_element = article.find("p", class_="price_color")
            price_text = price_element.text
            
            # --- EXTRACTING RATING ---
            # Finds a <p> tag that has "star-rating" in its class list.
            # The HTML looks like: <p class="star-rating Three">
            rating_element = article.find("p", class_="star-rating")
            # We look at the second class name (e.g., "Three") to determine the rating.
            rating_class = rating_element["class"][1] 
            
            # --- EXTRACTING IMAGE URL ---
            # Finds the <img> tag and gets the 'src' attribute.
            img_element = article.find("img")
            relative_img_url = img_element["src"]
            # urljoin combines the base URL with the relative image path to create a full, clickable link.
            full_img_url = urljoin(current_url, relative_img_url)
            
            # 7. Add the extracted data to our list
            scraped_data.append({
                "title": title,
                "price": price_text,
                "rating": rating_class,
                "cover_image": full_img_url
            })
            
        # 8. Handling Pagination (Going to the next page)
        # Looks for the "next" button at the bottom of the page.
        next_button = soup.find("li", class_="next")
        if next_button:
            next_url_relative = next_button.find("a")["href"]
            current_url = urljoin(current_url, next_url_relative)
        else:
            # If no "next" button is found, we break the loop.
            current_url = None 
            
        pages_scraped += 1
        
    return scraped_data
```

### The Caching Strategy (Why it's important)
If you run this code often, the website might ban your IP address for sending too many requests. BookIQ uses a caching system: before running `requests.get()`, it checks a local folder. If it has downloaded that exact URL in the last 24 hours, it just reads the saved HTML file from the hard drive instead of bothering the remote server again.

---

## Part 2: Leveraging ChromaDB (Vector Database)

A standard relational database (like SQLite) stores data in tables. If you search for "lonely", it looks for the exact word "l-o-n-e-l-y".

**ChromaDB is a Vector Database.** It doesn't look for words; it looks for *meaning*. It does this by using **Embeddings**.

### What is an Embedding?
An embedding is a translation of text into a high-dimensional mathematical array (a vector). 
*   The word "Apple" might become `[0.12, -0.45, 0.89...]`
*   The word "Banana" might become `[0.15, -0.42, 0.85...]`
Because they are both fruits, their mathematical numbers are "close" to each other in vector space.

### Initializing ChromaDB
```python
# ai_service.py 
def _get_chroma_collection():
    global _chroma_client, _collection
    if _collection is None:
        import chromadb
        
        # 1. We tell ChromaDB to save its data permanently to the hard drive in a specific folder.
        db_path = os.path.join(settings.BASE_DIR, "chroma_db")
        _chroma_client = chromadb.PersistentClient(path=db_path)
        
        # 2. We create (or open) a "collection" named "bookiq_chunks". 
        # A collection is the vector DB equivalent of a SQL table.
        _collection = _chroma_client.get_or_create_collection(name="bookiq_chunks")
        
    return _collection
```

### Inserting Data into ChromaDB
When a new book is added, we must convert its description into vectors and save it.

```python
# ai_service.py
def store_book_embeddings(book_id: int, title: str, text: str):
    # 1. Break the long description into smaller ~300 word chunks.
    chunks = smart_chunk(text, book_id, title)
    
    embedder = _get_embedder() # The SentenceTransformer AI model
    collection = _get_chroma_collection()

    # 2. Extract just the text strings from our chunk list
    texts = [c["text"] for c in chunks]
    
    # 3. Create unique IDs for each chunk (e.g., "book_5_chunk_1")
    ids = [c["id"] for c in chunks]
    
    # 4. Prepare metadata (so we know which book this chunk belongs to)
    metadatas = [c["metadata"] for c in chunks]

    # 5. THE MAGIC: Convert the list of text strings into a list of mathematical vectors.
    # The 'all-MiniLM-L6-v2' model converts each chunk into an array of 384 numbers.
    embeddings = embedder.encode(texts).tolist()
    
    # 6. Save everything into ChromaDB.
    collection.add(
        ids=ids, 
        embeddings=embeddings, 
        documents=texts, 
        metadatas=metadatas
    )
```

### Querying ChromaDB (Semantic Search)
When the user asks the chatbot a question, this code runs.

```python
# ai_service.py
def similarity_search(query: str, n_results: int = 5) -> list[dict]:
    embedder = _get_embedder()
    collection = _get_chroma_collection()

    # 1. Take the user's question (e.g., "Books about space travel")
    # and convert it into a vector using the EXACT SAME AI MODEL used during insertion.
    query_embedding = embedder.encode(query).tolist()

    # 2. Query ChromaDB
    # We pass the question's vector to the database.
    results = collection.query(
        query_embeddings=[query_embedding], # The math array of the question
        n_results=n_results,                # How many chunks we want back (top 5)
        include=["metadatas", "documents", "distances"] # What data to return
    )

    # HOW CHROMA SEARCHES (Under the hood):
    # ChromaDB calculates the "Cosine Distance" between the question's vector 
    # and EVERY single chunk vector in the database. 
    # A smaller distance means the concepts are closer in meaning.
    
    chunks = []
    # 3. Format the results
    # results["documents"][0] contains the top 5 text chunks
    # results["distances"][0] contains the distance score for each chunk
    for i in range(len(results["documents"][0])):
        
        # We convert the 'distance' into a 'similarity score' (1.0 = exact match, 0.0 = completely unrelated)
        # The formula (1 - distance / 2) is a standard math conversion for cosine similarity.
        distance = results["distances"][0][i]
        similarity_score = 1.0 - (distance / 2.0)
        
        chunks.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score": similarity_score, # We use this score in the LangGraph agent to filter out bad results
        })

    return chunks
```

### Summary of the Flow
1. **Scraping** gets the raw text from the internet.
2. **Chunking** breaks that text down.
3. **Embedding** turns that text into math (vectors).
4. **ChromaDB** stores that math.
5. **Searching** turns a user's question into math, and asks ChromaDB "Which stored math is closest to this question's math?"
This is a great piece of code to learn from! Think of BeautifulSoup (the tool we are using here) as a highly organized filing system, and the HTML of the website is a massive cabinet. 

Before this code runs, we told BeautifulSoup: *"Find every book on this page and put them in a list called `book_articles`."*

Now, let's walk through what the code does with that list, step-by-step, in plain English.

---

### Step 1: The Loop Begins
```python
for article in book_articles:
```
**What it means:** "Take the first book in our list, call it `article`, and do the following steps. When you're done, move to the second book, and repeat."

### Step 2: Grabbing the Title
```python
title_element = article.find("h3").find("a")
title = title_element["title"]
```
**What it means:** 
1. `find("h3")`: Look inside this specific book's HTML for a heading tag (`<h3>`).
2. `find("a")`: Inside that heading, look for a link tag (`<a>`).
3. Websites often hide the full, untruncated title of a book inside a "title attribute" so it appears when you hover your mouse over it. `title_element["title"]` reaches into that HTML tag and plucks out the exact text of the title (e.g., *"A Light in the Attic"*).

### Step 3: Grabbing the Price
```python
price_element = article.find("p", class_="price_color")
price_text = price_element.text
```
**What it means:**
1. Look for a paragraph tag (`<p>`). But not just any paragraph! Find the specific one that the web developer named `class="price_color"`.
2. `.text`: Once we find that paragraph, strip away all the messy HTML code and just give me the raw text inside of it (e.g., *"£51.77"*).

### Step 4: Grabbing the Star Rating
```python
rating_element = article.find("p", class_="star-rating")
rating_class = rating_element["class"][1] 
```
**What it means:**
1. Find a paragraph tag named `class="star-rating"`.
2. On this specific website, the HTML for a 3-star rating looks like this: `<p class="star-rating Three">`. 
3. `["class"][1]`: Because there are two words in the class name ("star-rating" and "Three"), this code tells Python to grab the second word in that list (index 1). So, `rating_class` becomes the word *"Three"*.

### Step 5: Grabbing the Image URL
```python
img_element = article.find("img")
relative_img_url = img_element["src"]
full_img_url = urljoin(current_url, relative_img_url)
```
**What it means:**
1. Find the image tag (`<img>`).
2. Grab the `src` attribute, which contains the link to the image file (e.g., `"../../media/cache/cover.jpg"`).
3. **The problem:** That is a *relative* link. It doesn't start with "https://". If you put `"../../media/cache/cover.jpg"` in your browser, it won't work.
4. **The solution:** `urljoin` acts like glue. It takes the main website URL ("https://books.toscrape.com") and glues the relative image link to the end of it, creating a perfect, working link!

### Step 6: Saving the Loot
```python
scraped_data.append({
    "title": title,
    "price": price_text,
    "rating": rating_class,
    "cover_image": full_img_url
})
```
**What it means:** Now that we have extracted the four pieces of data for this book, we bundle them together into a neat dictionary (like a digital folder) and `append` (add) it to our master list called `scraped_data`.

*(The loop then repeats for the next book on the page until all 20 books are done).*

---

### Step 7: Turning the Page (Pagination)
Once we finish all the books on Page 1, we need to go to Page 2!

```python
next_button = soup.find("li", class_="next")
if next_button:
    next_url_relative = next_button.find("a")["href"]
    current_url = urljoin(current_url, next_url_relative)
else:
    current_url = None 
```
**What it means:**
1. Look at the very bottom of the webpage HTML for a list item tag (`<li>`) named `class="next"`.
2. **IF** that button exists, find the link (`href`) inside it. Glue that link to our base URL (just like we did with the images) to figure out the exact web address for Page 2. Update `current_url` so the whole scraping process starts over on the new page.
3. **ELSE** (if the button doesn't exist), it means we have hit the very last page of the website! We set `current_url` to `None`, which safely stops the entire program from running anymore.