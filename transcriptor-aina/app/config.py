"""Configuració per variables d'entorn (prefix TRANSCRIPTOR_)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Models de reconeixement de la parla publicats pel Projecte AINA (BSC) a Hugging Face.
# La clau és el que tria l'usuari; el valor indica el motor i l'identificador del model.
MODELS: dict[str, dict] = {
    "aina-3catparla": {
        "nom": "Whisper large-v3 · 3CatParla (AINA)",
        "descripcio": "Whisper large-v3 ajustat amb el corpus 3CatParla. Recomanat per a la majoria d'àudios en català.",
        "motor": "faster-whisper",
        "repo": "projecte-aina/faster-whisper-large-v3-ca-3catparla",
    },
    "aina-3catparla-transformers": {
        "nom": "Whisper large-v3 · 3CatParla (AINA, Transformers)",
        "descripcio": "El mateix model, executat amb Hugging Face Transformers (més lent, útil per comparar).",
        "motor": "transformers",
        "repo": "projecte-aina/whisper-large-v3-ca-3catparla",
    },
    "bsc-puntuat": {
        "nom": "Whisper large-v3 · puntuat 3370 h (BSC-LT)",
        "descripcio": "Ajustat amb 3.370 hores de català amb puntuació i majúscules.",
        "motor": "transformers",
        "repo": "BSC-LT/whisper-large-v3-ca-punctuated-3370h",
    },
}


def _env(name: str, default: str) -> str:
    return os.environ.get("TRANSCRIPTOR_" + name, default)


@dataclass
class Settings:
    model_per_defecte: str = field(default_factory=lambda: _env("MODEL", "aina-3catparla"))
    # "auto", "cpu" o "cuda"
    dispositiu: str = field(default_factory=lambda: _env("DISPOSITIU", "auto"))
    # Tipus de càlcul de CTranslate2: "auto", "int8", "float16", "int8_float16"...
    compute_type: str = field(default_factory=lambda: _env("COMPUTE_TYPE", "auto"))
    mida_maxima_mb: int = field(default_factory=lambda: int(_env("MIDA_MAXIMA_MB", "500")))
    directori_temporal: Path = field(default_factory=lambda: Path(_env("DIR_TEMPORAL", "/tmp/transcriptor-aina")))
    # Nombre de feines acabades que es guarden a memòria.
    feines_maximes: int = field(default_factory=lambda: int(_env("FEINES_MAXIMES", "50")))
    # "real" carrega els models; "simulat" retorna text fals (proves i desenvolupament de la interfície).
    motor: str = field(default_factory=lambda: _env("MOTOR", "real"))


settings = Settings()
