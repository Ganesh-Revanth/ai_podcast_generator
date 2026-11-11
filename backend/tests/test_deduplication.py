import pytest
from app.db import models
from app.services.curation_service import (
    calculate_title_similarity,
    deduplicate_articles,
    tokenize_and_clean
)

def test_tokenize_and_clean():
    tokens = tokenize_and_clean("ISRO launches quantum navigation satellite into orbit today")
    assert "isro" in tokens
    assert "quantum" in tokens
    assert "satellite" in tokens
    # stop words like "into", "today" should be excluded
    assert "into" not in tokens
    assert "today" not in tokens

def test_calculate_title_similarity():
    # Exactly identical
    assert calculate_title_similarity(
        "ISRO launches Chandrayaan sample return mission",
        "ISRO launches Chandrayaan sample return mission"
    ) == 1.0

    # Near-identical reporting across outlets
    score = calculate_title_similarity(
        "ISRO prepares Chandrayaan-4 lunar sample return mission",
        "ISRO to launch Chandrayaan-4 lunar sample return mission"
    )
    assert score >= 0.65

    # Completely different stories
    diff_score = calculate_title_similarity(
        "Sensex surges 800 points as banking stocks rally",
        "ISRO launches new communication satellite"
    )
    assert diff_score < 0.25

def test_deduplicate_articles():
    art1 = models.Article(
        id=1,
        source="The Hindu",
        title="ISRO announces Chandrayaan-4 lunar sample mission",
        content="Short feed summary",
        url="https://thehindu.com/isro-chandrayaan4"
    )
    art2 = models.Article(
        id=2,
        source="NDTV",
        title="ISRO reveals Chandrayaan-4 lunar sample return mission details",
        content="Full extracted text with comprehensive reporting details on the lunar mission.",
        url="https://ndtv.com/isro-chandrayaan-4-mission"
    )
    art3 = models.Article(
        id=3,
        source="Times of India",
        title="Reserve Bank of India keeps repo rate unchanged at 6.5 percent",
        content="Monetary Policy Committee decision announced in Mumbai today.",
        url="https://timesofindia.com/rbi-repo-rate"
    )

    candidates = [art1, art2, art3]
    deduped = deduplicate_articles(candidates, similarity_threshold=0.60)

    # Should eliminate one of art1 or art2 and retain art2 because art2 has richer content
    assert len(deduped) == 2
    titles = [a.title for a in deduped]
    assert art3.title in titles
    # art2 has longer content, so it should be retained over art1
    assert art2.title in titles
    assert art1.title not in titles
