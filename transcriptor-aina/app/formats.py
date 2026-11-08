"""Exportació de segments a TXT, SRT, VTT i JSON."""
from __future__ import annotations

import json
from typing import Iterable, TypedDict


class Segment(TypedDict):
    inici: float
    final: float
    text: str


def _ts(segons: float, separador: str) -> str:
    ms_total = max(0, int(round(segons * 1000)))
    h, resta = divmod(ms_total, 3_600_000)
    m, resta = divmod(resta, 60_000)
    s, ms = divmod(resta, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{separador}{ms:03d}"


def a_txt(segments: Iterable[Segment]) -> str:
    return "\n".join(s["text"].strip() for s in segments if s["text"].strip()) + "\n"


def a_srt(segments: Iterable[Segment]) -> str:
    blocs = []
    for i, s in enumerate((s for s in segments if s["text"].strip()), start=1):
        blocs.append(f"{i}\n{_ts(s['inici'], ',')} --> {_ts(s['final'], ',')}\n{s['text'].strip()}\n")
    return "\n".join(blocs)


def a_vtt(segments: Iterable[Segment]) -> str:
    cos = [
        f"{_ts(s['inici'], '.')} --> {_ts(s['final'], '.')}\n{s['text'].strip()}\n"
        for s in segments
        if s["text"].strip()
    ]
    return "WEBVTT\n\n" + "\n".join(cos)


def a_json(segments: Iterable[Segment], **extra) -> str:
    return json.dumps({**extra, "segments": list(segments)}, ensure_ascii=False, indent=2)


FORMATS = {
    "txt": ("text/plain; charset=utf-8", a_txt),
    "srt": ("application/x-subrip; charset=utf-8", a_srt),
    "vtt": ("text/vtt; charset=utf-8", a_vtt),
}
