import pytest
from unittest.mock import patch
from app.services.news_service import extract_full_article_text

def test_extract_full_article_text_with_trafilatura():
    mock_html = "<html><body><article><p>This is a full article extracted by trafilatura with substantial in-depth reporting about the scientific discovery.</p></article></body></html>"
    extracted_text = "This is a full article extracted by trafilatura with substantial in-depth reporting about the scientific discovery."

    with patch("trafilatura.fetch_url", return_value=mock_html):
        with patch("trafilatura.extract", return_value=extracted_text):
            result = extract_full_article_text("https://example.com/news/1", fallback_html="<p>Short fallback</p>")
            assert result == extracted_text

def test_extract_full_article_text_fallback_on_failure():
    # When fetch_url returns None or extract returns None/short text
    with patch("trafilatura.fetch_url", return_value=None):
        result = extract_full_article_text(
            "https://example.com/paywalled-news",
            fallback_html="<p>Feed summary description that serves as fallback.</p>"
        )
        assert result == "Feed summary description that serves as fallback."

def test_extract_full_article_text_custom_scheme():
    # custom:// URLs should immediately use fallback without network fetch
    result = extract_full_article_text("custom://episode/123", fallback_html="Direct custom text.")
    assert result == "Direct custom text."

