import pytest
from app.db import models
from app.services.curation_service import cluster_articles_by_topic

def test_cluster_articles_by_topic():
    tech1 = models.Article(
        id=1,
        source="The Hindu",
        title="India announces National Quantum Processor milestone",
        category="Technology",
        content="India has built a 50-qubit superconducting quantum processor."
    )
    tech2 = models.Article(
        id=2,
        source="NDTV",
        title="Government allocates GPU compute grants to AI startups",
        category="Technology",
        content="The IndiaAI Mission expands computing capacity."
    )
    biz1 = models.Article(
        id=3,
        source="Economic Times",
        title="Stock markets rally as inflation cools down to 4.2 percent",
        category="Business",
        content="Sensex and Nifty gained following wholesale price index data."
    )

    articles = [tech1, tech2, biz1]
    clusters = cluster_articles_by_topic(articles)

    assert len(clusters) == 2

    # Verify tech cluster contains both tech articles
    tech_cluster = next((c for c in clusters if c.category == "Technology"), None)
    assert tech_cluster is not None
    assert len(tech_cluster.articles) == 2
    assert tech1 in tech_cluster.articles
    assert tech2 in tech_cluster.articles
    assert len(tech_cluster.title) > 0

    # Verify business cluster contains biz article
    biz_cluster = next((c for c in clusters if c.category == "Business"), None)
    assert biz_cluster is not None
    assert len(biz_cluster.articles) == 1
    assert biz_cluster.articles[0] == biz1

def test_cluster_articles_empty():
    assert cluster_articles_by_topic([]) == []
