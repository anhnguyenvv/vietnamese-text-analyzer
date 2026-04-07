from flask import Flask

import routes.statistics as statistics_routes
from routes.statistics import statistics_bp


def _create_statistics_client():
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.register_blueprint(statistics_bp, url_prefix="/api/statistics")
    return app.test_client()


def test_statistics_returns_wordcloud(monkeypatch):
    client = _create_statistics_client()

    monkeypatch.setattr(
        statistics_routes,
        "analyze_text",
        lambda text, remove_stopwords=False: {
            "num_sentences": 1,
            "num_words": 3,
            "num_chars": 10,
            "avg_sentence_len": 3.0,
            "vocab_size": 3,
            "num_digits": 0,
            "num_special_chars": 0,
            "num_emojis": 0,
            "num_stopwords": 0,
            "word_freq": {"xin": 2, "chao": 1},
        },
    )
    monkeypatch.setattr(statistics_routes, "create_wordcloud", lambda word_freq: "BASE64_IMAGE")

    response = client.post(
        "/api/statistics/statistics",
        json={"text": "xin chao", "remove_stopwords": True},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert "stats" in payload
    assert payload["wordcloud"] == "BASE64_IMAGE"


def test_statistics_requires_text():
    client = _create_statistics_client()

    response = client.post(
        "/api/statistics/statistics",
        json={"text": ""},
    )

    assert response.status_code == 400
    assert "error" in response.get_json()
