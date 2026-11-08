"""API web del Transcriptor AINA.

Les transcripcions es fan en un fil de treball amb una cua: els models són grans i és millor
processar els àudios d'un en un. El navegador consulta l'estat de la feina fins que acaba.
"""
from __future__ import annotations

import logging
import queue
import shutil
import threading
import time
import uuid
from urllib.parse import quote
from collections import OrderedDict
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .config import MODELS, settings
from .engine import ErrorTranscripcio, obtenir_motor
from .formats import FORMATS, a_json

log = logging.getLogger("transcriptor")
ESTATIC = Path(__file__).parent / "static"
EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".oga", ".opus", ".flac", ".webm", ".mp4", ".aac", ".wma", ".mkv", ".mov"}

app = FastAPI(title="Transcriptor AINA", version="1.0.0")

feines: "OrderedDict[str, dict]" = OrderedDict()
feines_lock = threading.Lock()
cua: "queue.Queue[str]" = queue.Queue()


def _vista(f: dict) -> dict:
    return {k: v for k, v in f.items() if not k.startswith("_")}


def _netejar_antigues() -> None:
    acabades = [k for k, f in feines.items() if f["estat"] in ("acabada", "error")]
    while len(acabades) > settings.feines_maximes:
        feines.pop(acabades.pop(0), None)


def _treballador() -> None:
    while True:
        id_feina = cua.get()
        with feines_lock:
            f = feines.get(id_feina)
        if f is None:
            continue
        ruta: Path = f["_ruta"]
        try:
            f["estat"] = "carregant-model"
            motor = obtenir_motor(f["model"])
            f["estat"] = "transcrivint"
            f["inici_proces"] = time.time()

            def on_segment(seg, progres: Optional[float]):
                f["segments"].append(seg)
                if progres is not None:
                    f["progres"] = round(progres, 3)

            res = motor.transcriure(ruta, f["_opcions"], on_segment)
            f.update(segments=res["segments"], durada=res["durada"], idioma=res["idioma"], progres=1.0, estat="acabada")
        except ErrorTranscripcio as e:
            f.update(estat="error", error=str(e))
        except Exception as e:  # noqa: BLE001 - qualsevol error s'ha de mostrar a l'usuari
            log.exception("Error transcrivint %s", id_feina)
            f.update(estat="error", error=f"No s'ha pogut transcriure l'àudio ({type(e).__name__}: {e})")
        finally:
            f["final_proces"] = time.time()
            shutil.rmtree(ruta.parent, ignore_errors=True)
            with feines_lock:
                _netejar_antigues()
            cua.task_done()


threading.Thread(target=_treballador, name="transcriptor", daemon=True).start()


@app.get("/api/models")
def models():
    return {
        "per_defecte": settings.model_per_defecte,
        "simulat": settings.motor == "simulat",
        "models": [{"id": k, **v} for k, v in MODELS.items()],
    }


@app.post("/api/transcripcions", status_code=202)
async def crear(
    fitxer: UploadFile = File(...),
    model: str = Form(None),
    idioma: str = Form("ca"),
    vad: bool = Form(True),
    context: str = Form(""),
):
    model = model or settings.model_per_defecte
    if model not in MODELS:
        raise HTTPException(400, f"Model desconegut: {model}")
    if idioma not in ("ca", "es", "en", "fr", "oc"):
        raise HTTPException(400, "Idioma no admès")
    ext = Path(fitxer.filename or "").suffix.lower() or ".webm"
    if ext not in EXTENSIONS:
        raise HTTPException(415, f"Format no admès ({ext}). Formats: {', '.join(sorted(EXTENSIONS))}")

    id_feina = uuid.uuid4().hex
    carpeta = settings.directori_temporal / id_feina
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / ("audio" + ext)
    limit = settings.mida_maxima_mb * 1024 * 1024
    mida = 0
    with ruta.open("wb") as sortida:
        while bloc := await fitxer.read(1024 * 1024):
            mida += len(bloc)
            if mida > limit:
                sortida.close()
                shutil.rmtree(carpeta, ignore_errors=True)
                raise HTTPException(413, f"El fitxer supera el límit de {settings.mida_maxima_mb} MB")
            sortida.write(bloc)
    if mida == 0:
        shutil.rmtree(carpeta, ignore_errors=True)
        raise HTTPException(400, "El fitxer és buit")

    feina = {
        "id": id_feina,
        "nom_fitxer": fitxer.filename,
        "model": model,
        "estat": "a-la-cua",
        "progres": 0.0,
        "segments": [],
        "durada": None,
        "idioma": idioma,
        "error": None,
        "creada": time.time(),
        "_ruta": ruta,
        "_opcions": {"idioma": idioma, "vad": vad, "context": context.strip()[:500]},
    }
    with feines_lock:
        feines[id_feina] = feina
    cua.put(id_feina)
    return {"id": id_feina}


def _feina(id_feina: str) -> dict:
    with feines_lock:
        f = feines.get(id_feina)
    if f is None:
        raise HTTPException(404, "Aquesta transcripció no existeix o ja s'ha esborrat")
    return f


@app.get("/api/transcripcions/{id_feina}")
def estat(id_feina: str, des_de: int = 0):
    """`des_de` permet demanar només els segments nous (el navegador ja té els anteriors)."""
    f = _feina(id_feina)
    v = _vista(f)
    v["total_segments"] = len(f["segments"])
    v["segments"] = f["segments"][max(0, des_de):]
    if f["estat"] == "a-la-cua":
        with feines_lock:
            pendents = [k for k, x in feines.items() if x["estat"] == "a-la-cua"]
        v["posicio_cua"] = pendents.index(id_feina) + 1 if id_feina in pendents else None
    return v


@app.get("/api/transcripcions/{id_feina}/descarrega/{fmt}")
def descarrega(id_feina: str, fmt: str):
    f = _feina(id_feina)
    if f["estat"] != "acabada":
        raise HTTPException(409, "La transcripció encara no ha acabat")
    nom = Path(f["nom_fitxer"] or "transcripcio").stem or "transcripcio"
    if fmt == "json":
        cos, tipus = a_json(f["segments"], model=MODELS[f["model"]]["repo"], durada=f["durada"]), "application/json"
    elif fmt in FORMATS:
        tipus, fn = FORMATS[fmt]
        cos = fn(f["segments"])
    else:
        raise HTTPException(400, "Format desconegut")
    return Response(cos, media_type=tipus, headers={"Content-Disposition": f"attachment; filename=\"transcripcio.{fmt}\"; filename*=UTF-8''{quote(nom)}.{fmt}"})


@app.get("/")
def inici():
    return FileResponse(ESTATIC / "index.html")


app.mount("/static", StaticFiles(directory=ESTATIC), name="static")
