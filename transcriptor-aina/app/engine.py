"""Motors de transcripció. Els models es carreguen la primera vegada que es fan servir i es reutilitzen."""
from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Callable, Optional

from .config import MODELS, settings
from .formats import Segment

# Es crida per cada segment nou amb el segment i el progrés (0-1, o None si no se sap).
OnSegment = Callable[[Segment, Optional[float]], None]


class ErrorTranscripcio(RuntimeError):
    pass


class Motor:
    def transcriure(self, ruta: Path, opcions: dict, on_segment: OnSegment) -> dict:
        raise NotImplementedError


class MotorFasterWhisper(Motor):
    """CTranslate2 via faster-whisper: el més ràpid, funciona bé en CPU amb int8."""

    def __init__(self, repo: str):
        from faster_whisper import WhisperModel  # import tardà: només si cal

        self.model = WhisperModel(repo, device=settings.dispositiu, compute_type=settings.compute_type)

    def transcriure(self, ruta, opcions, on_segment):
        segments, info = self.model.transcribe(
            str(ruta),
            language=opcions.get("idioma") or "ca",
            task="transcribe",
            beam_size=int(opcions.get("beam_size", 5)),
            vad_filter=bool(opcions.get("vad", True)),
            initial_prompt=opcions.get("context") or None,
        )
        durada = float(info.duration or 0)
        resultat: list[Segment] = []
        for s in segments:
            seg: Segment = {"inici": round(s.start, 2), "final": round(s.end, 2), "text": s.text.strip()}
            resultat.append(seg)
            on_segment(seg, min(1.0, s.end / durada) if durada else None)
        return {"segments": resultat, "durada": durada, "idioma": info.language}


class MotorTransformers(Motor):
    """Hugging Face Transformers: per als models AINA publicats només en format Transformers."""

    def __init__(self, repo: str):
        import torch
        from transformers import pipeline

        dispositiu = settings.dispositiu
        if dispositiu == "auto":
            dispositiu = "cuda:0" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if dispositiu.startswith("cuda") else torch.float32
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=repo,
            device=dispositiu,
            torch_dtype=dtype,
            chunk_length_s=30,
        )

    def transcriure(self, ruta, opcions, on_segment):
        sortida = self.pipe(
            str(ruta),
            return_timestamps=True,
            generate_kwargs={"language": opcions.get("idioma") or "ca", "task": "transcribe"},
        )
        resultat: list[Segment] = []
        anterior = 0.0
        for c in sortida.get("chunks") or [{"timestamp": (0.0, None), "text": sortida.get("text", "")}]:
            inici, final = c.get("timestamp") or (anterior, None)
            inici = anterior if inici is None else float(inici)
            final = inici if final is None else float(final)
            seg: Segment = {"inici": round(inici, 2), "final": round(final, 2), "text": c["text"].strip()}
            resultat.append(seg)
            on_segment(seg, None)
            anterior = final
        return {"segments": resultat, "durada": anterior, "idioma": opcions.get("idioma") or "ca"}


class MotorSimulat(Motor):
    """Sense model: per provar la interfície i l'API sense descarregar res."""

    FRASES = [
        "Bon dia i benvinguts a aquesta prova de transcripció.",
        "Aquest text és simulat: no s'ha carregat cap model.",
        "Configureu TRANSCRIPTOR_MOTOR=real per fer servir els models d'AINA.",
    ]

    def __init__(self, repo: str):
        self.repo = repo

    def transcriure(self, ruta, opcions, on_segment):
        resultat: list[Segment] = []
        for i, frase in enumerate(self.FRASES):
            seg: Segment = {"inici": i * 4.0, "final": i * 4.0 + 3.5, "text": frase}
            resultat.append(seg)
            on_segment(seg, (i + 1) / len(self.FRASES))
            time.sleep(float(opcions.get("_retard", 0)))
        return {"segments": resultat, "durada": len(self.FRASES) * 4.0, "idioma": "ca"}


_motors: dict[str, Motor] = {}
_lock = threading.Lock()


def obtenir_motor(clau_model: str) -> Motor:
    if clau_model not in MODELS:
        raise ErrorTranscripcio(f"Model desconegut: {clau_model}")
    with _lock:
        if clau_model not in _motors:
            info = MODELS[clau_model]
            if settings.motor == "simulat":
                cls = MotorSimulat
            elif info["motor"] == "faster-whisper":
                cls = MotorFasterWhisper
            else:
                cls = MotorTransformers
            try:
                _motors[clau_model] = cls(info["repo"])
            except ImportError as e:
                raise ErrorTranscripcio(
                    f"Falta una dependència per al motor {info['motor']}: {e.name}. Vegeu el README."
                ) from e
        return _motors[clau_model]
