# Transcriptor AINA

App web per transcriure àudios en català amb els models de reconeixement de la parla del
[Projecte AINA](https://projecteaina.cat) (Barcelona Supercomputing Center), publicats a
[Hugging Face](https://huggingface.co/projecte-aina).

- Puja un fitxer (MP3, WAV, M4A, OGG, FLAC, WebM, MP4…) o grava directament amb el micròfon.
- El text apareix a mesura que es transcriu, amb marques de temps.
- Clic a una marca de temps per escoltar aquell fragment; el text es pot corregir a mà.
- Exporta a TXT, SRT, VTT (subtítols) o JSON.

## Models disponibles

| Clau (`TRANSCRIPTOR_MODEL`) | Model a Hugging Face | Motor |
|---|---|---|
| `aina-3catparla` (per defecte) | `projecte-aina/faster-whisper-large-v3-ca-3catparla` | faster-whisper (CTranslate2) |
| `aina-3catparla-transformers` | `projecte-aina/whisper-large-v3-ca-3catparla` | Transformers |
| `bsc-puntuat` | `BSC-LT/whisper-large-v3-ca-punctuated-3370h` | Transformers |

Es poden afegir altres models editant `MODELS` a `app/config.py`.
Els models es descarreguen de Hugging Face la primera vegada que es fan servir (uns 3 GB cadascun).

## Posar-la en marxa

```bash
cd transcriptor-aina
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Obriu <http://localhost:8000>. Per fer servir els models de Transformers, instal·leu també
`transformers` i `torch` i tingueu `ffmpeg` al sistema.

Amb Docker:

```bash
docker build -t transcriptor-aina .
docker run -p 8000:8000 -v aina-models:/models transcriptor-aina
# amb GPU NVIDIA: afegiu --gpus all
```

Per provar la interfície sense descarregar cap model: `TRANSCRIPTOR_MOTOR=simulat uvicorn app.main:app`.

## Configuració (variables d'entorn)

| Variable | Per defecte | Descripció |
|---|---|---|
| `TRANSCRIPTOR_MODEL` | `aina-3catparla` | Model preseleccionat |
| `TRANSCRIPTOR_DISPOSITIU` | `auto` | `auto`, `cpu` o `cuda` |
| `TRANSCRIPTOR_COMPUTE_TYPE` | `auto` | Tipus de càlcul de faster-whisper (`int8` va bé en CPU, `float16` en GPU) |
| `TRANSCRIPTOR_MIDA_MAXIMA_MB` | `500` | Mida màxima del fitxer |
| `TRANSCRIPTOR_DIR_TEMPORAL` | `/tmp/transcriptor-aina` | On es desa l'àudio mentre es processa |
| `TRANSCRIPTOR_MOTOR` | `real` | `simulat` per a proves sense model |

Rendiment orientatiu del model large-v3: en GPU, uns minuts per hora d'àudio; en CPU amb `int8`,
aproximadament el temps real o una mica més.

## API

| Mètode | Ruta | |
|---|---|---|
| `GET` | `/api/models` | Llista de models |
| `POST` | `/api/transcripcions` | Formulari multipart: `fitxer`, `model`, `idioma` (`ca`), `vad` (`true`), `context`. Retorna `{id}` |
| `GET` | `/api/transcripcions/{id}?des_de=N` | Estat, progrés i segments (a partir del segment N) |
| `GET` | `/api/transcripcions/{id}/descarrega/{txt\|srt\|vtt\|json}` | Resultat final |

Els àudios es transcriuen d'un en un (cua) i s'esborren del disc en acabar. Les transcripcions
només es guarden a memòria: es perden si es reinicia el servidor.

## Proves

```bash
pip install -r requirements-dev.txt
pytest
```

## Estructura

```
app/config.py   models i configuració
app/engine.py   motors faster-whisper, Transformers i simulat
app/formats.py  exportació TXT / SRT / VTT / JSON
app/main.py     API (FastAPI) i cua de feines
app/static/     interfície web
```
