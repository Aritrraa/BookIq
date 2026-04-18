"""
BookIQ Scraper
Scrapes books.toscrape.com using requests + BeautifulSoup.
Falls back gracefully if Selenium/Chrome not available.
Includes caching to avoid redundant scraping.
"""
import time
import logging
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://books.toscrape.com"
CACHE_DIR = Path(__file__).parent.parent / "scrape_cache"

RATING_MAP = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}

GENRE_DESCRIPTIONS = {
    "Mystery": "detective, crime, murder, investigation, clues, suspects, whodunit",
    "Science Fiction": "space, alien, robot, future, technology, planet, galaxy, time travel",
    "Romance": "love, heart, passion, relationship, kiss, wedding, couple",
    "Fantasy": "magic, dragon, wizard, kingdom, quest, spell, elf, dwarf",
    "Thriller": "danger, suspense, chase, escape, fear, threat, conspiracy",
    "Horror": "monster, ghost, evil, darkness, nightmare, terror, haunted",
    "History": "war, ancient, century, empire, civilization, historical, medieval",
    "Self-Help": "improve, success, habit, mindset, productivity, goal, growth",
    "Biography": "life, memoir, autobiography, story, journey, person, lived",
    "Children": "child, kids, young, adventure, friendship, school, fun",
    "Poetry": "poem, verse, stanza, rhyme, lyric",
    "Travel": "journey, country, explore, destination, trip, culture, world",
    "Art": "painting, sculpture, artist, design, creative, visual",
    "Music": "song, concert, album, musician, band, melody, rhythm",
    "Sports": "game, player, team, championship, athlete, training, match",
}


def _cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    key = hashlib.md5(url.encode()).hexdigest()
    return CACHE_DIR / f"{key}.json"


def _get_cached(url: str):
    p = _cache_path(url)
    if p.exists():
        try:
            data = json.loads(p.read_text())
            logger.debug(f"Cache hit: {url}")
            return data
        except Exception:
            pass
    return None


def _set_cache(url: str, data: dict):
    try:
        _cache_path(url).write_text(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        logger.warning(f"Cache write failed: {e}")


def _fetch_html(url: str, retries: int = 3) -> str:
    """Fetch URL with retries and caching."""
    cached = _get_cached(url)
    if cached and "html" in cached:
        return cached["html"]

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            html = resp.text
            _set_cache(url, {"html": html})
            return html
        except requests.RequestException as e:
            logger.warning(f"Fetch attempt {attempt+1} failed for {url}: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise ConnectionError(f"Failed to fetch {url} after {retries} attempts")


def _parse_rating(class_list) -> float:
    """Extract numeric rating from CSS class list."""
    for cls in class_list:
        if cls in RATING_MAP:
            return float(RATING_MAP[cls])
    return 0.0


def _scrape_book_detail(detail_url: str) -> dict:
    """Scrape individual book detail page."""
    cached = _get_cached(detail_url)
    if cached and "description" in cached:
        return cached

    try:
        html = _fetch_html(detail_url)
        soup = BeautifulSoup(html, "html.parser")

        desc_tag = soup.select_one("#product_description ~ p")
        description = desc_tag.get_text(strip=True) if desc_tag else ""

        # Extract table data
        table_data = {}
        for row in soup.select("table.table tr"):
            cells = row.find_all("td")
            if len(cells) == 2:
                key = row.find("th").get_text(strip=True)
                table_data[key] = cells[1].get_text(strip=True)

        upc = table_data.get("UPC", "")
        availability_text = table_data.get("Availability", "")
        num_reviews = 0
        match = re.search(r"\d+", table_data.get("Number of reviews", "0"))
        if match:
            num_reviews = int(match.group())

        result = {
            "description": description,
            "availability": availability_text,
            "num_reviews": num_reviews,
            "upc": upc,
        }
        _set_cache(detail_url, result)
        return result
    except Exception as e:
        logger.warning(f"Detail scrape failed for {detail_url}: {e}")
        return {"description": "", "availability": "", "num_reviews": 0}


def scrape_books(max_pages: int = 5, progress_callback=None) -> list[dict]:
    """
    Main scraping function.
    Scrapes books.toscrape.com up to max_pages pages.
    Returns list of book dicts.
    """
    books = []
    page = 1

    while page <= max_pages:
        if page == 1:
            url = f"{BASE_URL}/catalogue/page-1.html"
        else:
            url = f"{BASE_URL}/catalogue/page-{page}.html"

        logger.info(f"Scraping page {page}: {url}")

        try:
            html = _fetch_html(url)
        except ConnectionError as e:
            logger.error(f"Stopping scrape at page {page}: {e}")
            break

        soup = BeautifulSoup(html, "html.parser")
        book_articles = soup.select("article.product_pod")

        if not book_articles:
            logger.info("No books found, stopping.")
            break

        for article in book_articles:
            try:
                # Title
                title_tag = article.select_one("h3 a")
                title = title_tag["title"] if title_tag else "Unknown"

                # Relative URL → absolute
                rel_href = title_tag["href"].replace("../", "") if title_tag else ""
                book_url = urljoin(f"{BASE_URL}/catalogue/", rel_href)

                # Cover image
                img_tag = article.select_one("img")
                img_src = img_tag["src"].replace("../../", "") if img_tag else ""
                cover_image = urljoin(BASE_URL + "/", img_src)

                # Rating
                rating_tag = article.select_one("p.star-rating")
                rating = _parse_rating(rating_tag.get("class", [])) if rating_tag else 0.0

                # Price
                price_tag = article.select_one("p.price_color")
                price = price_tag.get_text(strip=True) if price_tag else ""

                # Get detail page data (description, availability, reviews)
                detail = _scrape_book_detail(book_url)
                time.sleep(0.3)  # polite crawl delay

                book = {
                    "title": title,
                    "author": "Unknown",  # books.toscrape doesn't show authors on list
                    "rating": rating,
                    "num_reviews": detail.get("num_reviews", 0),
                    "description": detail.get("description", ""),
                    "genre": "",  # filled by AI
                    "price": price,
                    "availability": detail.get("availability", ""),
                    "book_url": book_url,
                    "cover_image": cover_image,
                }
                books.append(book)
                logger.info(f"  ✓ {title[:50]}")

            except Exception as e:
                logger.warning(f"  ✗ Error parsing book: {e}")
                continue

        if progress_callback:
            progress_callback(page, len(books))

        # Check for next page
        next_btn = soup.select_one("li.next a")
        if not next_btn:
            break
        page += 1

    logger.info(f"Scraping complete: {len(books)} books collected")
    return books


def try_selenium_scrape(max_pages: int = 2) -> list[dict]:
    """
    Attempt Selenium-based scraping for JS-heavy content.
    Falls back to requests-based scraping if Chrome/Selenium unavailable.
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from webdriver_manager.chrome import ChromeDriverManager

        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")

        logger.info("Attempting Selenium scrape...")
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options,
        )

        books = []
        try:
            for page in range(1, max_pages + 1):
                url = f"{BASE_URL}/catalogue/page-{page}.html"
                driver.get(url)
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "article.product_pod"))
                )

                soup = BeautifulSoup(driver.page_source, "html.parser")
                for article in soup.select("article.product_pod"):
                    title_tag = article.select_one("h3 a")
                    if title_tag:
                        books.append({"title": title_tag["title"], "source": "selenium"})

            logger.info(f"Selenium scraped {len(books)} books")
        finally:
            driver.quit()

        return books

    except Exception as e:
        logger.warning(f"Selenium unavailable ({e}), falling back to requests.")
        return scrape_books(max_pages=max_pages)
