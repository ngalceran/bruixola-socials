import time

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _espera(id_feina, segons=5):
    limit = time.time() + segons
    while time.time() < limit:
        d = client.get(f"/api/transcripcions/{id_feina}").json()
        if d["estat"] in ("acabada", "error"):
            return d
        time.sleep(0.05)
    raise AssertionError("La feina no ha acabat")


def test_models():
    d = client.get("/api/models").json()
    assert d["simulat"] is True
    assert any(m["repo"].startswith("projecte-aina/") for m in d["models"])


def test_flux_complet():
    r = client.post("/api/transcripcions", files={"fitxer": ("entrevista à.mp3", b"fals", "audio/mpeg")}, data={"idioma": "ca"})
    assert r.status_code == 202
    d = _espera(r.json()["id"])
    assert d["estat"] == "acabada", d
    assert len(d["segments"]) == 3 and d["progres"] == 1.0
    # Només els segments nous
    assert client.get(f"/api/transcripcions/{d['id']}?des_de=2").json()["segments"] == d["segments"][2:]
    srt = client.get(f"/api/transcripcions/{d['id']}/descarrega/srt")
    assert srt.status_code == 200 and srt.text.startswith("1\n00:00:00,000")
    assert "UTF-8''entrevista%20%C3%A0.srt" in srt.headers["content-disposition"]


def test_rebutja_formats_i_buits():
    assert client.post("/api/transcripcions", files={"fitxer": ("x.exe", b"a")}).status_code == 415
    assert client.post("/api/transcripcions", files={"fitxer": ("x.wav", b"")}).status_code == 400
    assert client.post("/api/transcripcions", files={"fitxer": ("x.wav", b"a")}, data={"model": "no"}).status_code == 400


def test_feina_inexistent():
    assert client.get("/api/transcripcions/res").status_code == 404


def test_pagina():
    r = client.get("/")
    assert r.status_code == 200 and "Transcriptor AINA" in r.text
