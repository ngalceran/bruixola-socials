from app.formats import a_srt, a_txt, a_vtt

SEGS = [
    {"inici": 0.0, "final": 2.5, "text": " Bon dia. "},
    {"inici": 3661.25, "final": 3662.0, "text": "Fins aviat"},
    {"inici": 4000.0, "final": 4001.0, "text": "   "},
]


def test_txt():
    assert a_txt(SEGS) == "Bon dia.\nFins aviat\n"


def test_srt():
    assert a_srt(SEGS) == (
        "1\n00:00:00,000 --> 00:00:02,500\nBon dia.\n\n"
        "2\n01:01:01,250 --> 01:01:02,000\nFins aviat\n"
    )


def test_vtt():
    assert a_vtt(SEGS).startswith("WEBVTT\n\n00:00:00.000 --> 00:00:02.500\nBon dia.\n")
