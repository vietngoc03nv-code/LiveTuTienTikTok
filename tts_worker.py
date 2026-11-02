#!/usr/bin/env python3
"""
Tu Tiên TTS Worker Daemon:
- Tiếng Việt chuẩn xác (Chị Google) tốc độ cao (~0.4s)
- Lọc ký tự rác, chuẩn hóa Unicode NFC, chống vỡ tiếng trên Windows UTF-8
"""
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

# Đảm bảo I/O tiếng Việt UTF-8 chuẩn xác trên Windows
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from gtts import gTTS

CACHE_DIR = Path(__file__).resolve().parent / "data" / "tts-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

VIETNAMESE_ALLOWED_RE = re.compile(
    r"[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]"
)
BRACKET_EMOTE_RE = re.compile(r"\[[^\]]{1,24}\]")
REPEATED_CHARS_RE = re.compile(r"(.)\1{2,}", re.IGNORECASE)
MULTI_PUNCT_RE = re.compile(r"([.,!?])\1+")
MULTI_SPACE_RE = re.compile(r"\s+")
URL_RE = re.compile(r"https?://\S+")


def emit(payload: dict) -> None:
    data = (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def clean_and_normalize_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = unicodedata.normalize("NFC", unicodedata.normalize("NFKC", str(raw_text)))
    text = URL_RE.sub(" ", text)
    text = text.replace(":", ", ")
    text = BRACKET_EMOTE_RE.sub(" ", text)
    text = VIETNAMESE_ALLOWED_RE.sub(" ", text)
    text = MULTI_PUNCT_RE.sub(r"\1", text)
    text = REPEATED_CHARS_RE.sub(r"\1\1", text)
    text = MULTI_SPACE_RE.sub(" ", text).strip(" .,!?-")

    letters = re.findall(r"[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]", text)
    if len(letters) < 2:
        return ""

    if len(text) > 160:
        text = text[:160].rsplit(" ", 1)[0]

    text = text.strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text


def main() -> None:
    emit({
        "type": "ready",
        "model": "Tu Tiên AI Voice (Google Tiếng Việt)",
        "voice": "google",
        "sampleRate": 24000,
        "loadSec": 0.05,
    })

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            text = (req.get("text") or "").strip()

            norm_text = clean_and_normalize_text(text)
            if not norm_text:
                emit({"type": "result", "id": req_id, "ok": False, "error": "Filtered empty/spam text"})
                continue

            cache_key = hashlib.sha1(f"gtts::{norm_text}".encode("utf-8")).hexdigest()[:20]
            out_name = f"tutien_{cache_key}.mp3"
            out_path = CACHE_DIR / out_name

            if out_path.is_file() and out_path.stat().st_size > 200:
                emit({
                    "type": "result",
                    "id": req_id,
                    "ok": True,
                    "cached": True,
                    "voice": "google",
                    "file": out_name,
                    "url": f"/tts-cache/{out_name}",
                    "synthSec": 0.0,
                })
                continue

            t_synth = time.time()
            g = gTTS(text=norm_text, lang="vi", tld="com.vn")
            g.save(str(out_path))
            synth_sec = round(time.time() - t_synth, 2)

            emit({
                "type": "result",
                "id": req_id,
                "ok": True,
                "cached": False,
                "voice": "google",
                "file": out_name,
                "url": f"/tts-cache/{out_name}",
                "synthSec": synth_sec,
            })
        except Exception as exc:
            emit({
                "type": "result",
                "id": req_id,
                "ok": False,
                "error": str(exc),
            })


if __name__ == "__main__":
    main()
