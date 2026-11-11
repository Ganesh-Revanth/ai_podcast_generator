import re
import difflib
import logging
from dataclasses import dataclass, field
from typing import List, Set, Dict

from app.db import models

logger = logging.getLogger(__name__)

STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
    'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
    'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'says', 'said',
    'india', 'new', 'delhi', 'first', 'two', 'over', 'amid', 'after', 'today'
}

def tokenize_and_clean(text: str) -> Set[str]:
    """Extracts lowercase alphabetic words from text excluding common stop words."""
    if not text:
        return set()
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    return {w for w in words if w not in STOPWORDS}

def calculate_title_similarity(title_a: str, title_b: str) -> float:
    """
    Computes a composite similarity score between two headlines using
    Jaccard token set similarity and SequenceMatcher ratio.
    """
    if not title_a or not title_b:
        return 0.0

    clean_a = re.sub(r'[^a-zA-Z0-9\s]', ' ', title_a.lower()).strip()
    clean_b = re.sub(r'[^a-zA-Z0-9\s]', ' ', title_b.lower()).strip()

    if clean_a == clean_b:
        return 1.0

    tokens_a = tokenize_and_clean(title_a)
    tokens_b = tokenize_and_clean(title_b)

    if not tokens_a or not tokens_b:
        return 0.0

    intersection = tokens_a.intersection(tokens_b)
    if not intersection:
        # Zero topical word overlap means completely different stories
        return 0.0

    union = tokens_a.union(tokens_b)
    jaccard = len(intersection) / len(union) if union else 0.0
    seq_ratio = difflib.SequenceMatcher(None, clean_a, clean_b).ratio()

    # Blend token overlap and sequence ratio
    return max(jaccard, seq_ratio)

def deduplicate_articles(articles: List[models.Article], similarity_threshold: float = 0.60) -> List[models.Article]:
    """
    Deduplicates near-identical stories across outlets.
    If two articles cover the same event (similarity >= threshold), the article with
    richer content is retained.
    """
    if not articles:
        return []

    unique_articles: List[models.Article] = []

    for candidate in articles:
        is_duplicate = False
        for idx, existing in enumerate(unique_articles):
            sim = calculate_title_similarity(candidate.title, existing.title)
            if sim >= similarity_threshold:
                is_duplicate = True
                logger.info(
                    f"Deduplication: '{candidate.title}' ({candidate.source}) matched "
                    f"'{existing.title}' ({existing.source}) with similarity {sim:.2f}"
                )
                # Keep the richer article
                candidate_len = len(candidate.content or "")
                existing_len = len(existing.content or "")
                if candidate_len > existing_len:
                    unique_articles[idx] = candidate
                break

        if not is_duplicate:
            unique_articles.append(candidate)

    return unique_articles

@dataclass
class TopicCluster:
    title: str
    category: str
    articles: List[models.Article] = field(default_factory=list)

def _generate_cluster_title(articles: List[models.Article], fallback_cat: str) -> str:
    """Generates an intuitive segment title based on common keywords across cluster articles."""
    if not articles:
        return fallback_cat or "General News"
    if len(articles) == 1:
        # Single story segment
        return articles[0].title

    # Multiple stories: find top shared keywords
    all_tokens: Dict[str, int] = {}
    for a in articles:
        for t in tokenize_and_clean(a.title):
            all_tokens[t] = all_tokens.get(t, 0) + 1

    # Filter tokens present in more than one story
    shared_tokens = [w.capitalize() for w, count in all_tokens.items() if count > 1]
    if shared_tokens:
        top_keywords = " & ".join(shared_tokens[:2])
        return f"{fallback_cat}: {top_keywords}"
    
    return f"{fallback_cat} Roundup"

def cluster_articles_by_topic(articles: List[models.Article]) -> List[TopicCluster]:
    """
    Groups articles by topic/category so the podcast script can dedicate
    one cohesive segment per topic.
    """
    if not articles:
        return []

    clusters: List[TopicCluster] = []

    for article in articles:
        article_cat = (article.category or "General").strip().title()
        article_tokens = tokenize_and_clean(article.title + " " + (article.content[:300] if article.content else ""))

        matched_cluster = None
        for c in clusters:
            # Check if category matches or if there is strong topical keyword overlap
            same_category = (c.category.lower() == article_cat.lower())
            
            # Check keyword overlap with existing articles in cluster
            cluster_tokens = set()
            for ca in c.articles:
                cluster_tokens.update(tokenize_and_clean(ca.title))

            overlap = article_tokens.intersection(cluster_tokens)
            if same_category or len(overlap) >= 2:
                matched_cluster = c
                break

        if matched_cluster:
            matched_cluster.articles.append(article)
        else:
            clusters.append(TopicCluster(
                title="", # will generate title after all assigned
                category=article_cat,
                articles=[article]
            ))

    # Refine titles for all clusters
    for cluster in clusters:
        cluster.title = _generate_cluster_title(cluster.articles, cluster.category)

    return clusters
