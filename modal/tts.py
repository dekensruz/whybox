"""The tutor's voice: Kokoro, an open-weight text-to-speech model, served on Modal.

Deploy from the project folder; the token the Whybox server sends is read from TTS_TOKEN in .env:
    python -m modal deploy modal/tts.py
"""

import io
import os
from pathlib import Path

import modal

app = modal.App("whybox-tts")


def shared_token() -> str:
    """TTS_TOKEN from the environment, or else from the project's .env (only this one value is read)."""
    token = os.environ.get("TTS_TOKEN", "").strip()
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not token and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("TTS_TOKEN="):
                token = line.split("=", 1)[1].strip().strip("\"'")
    return token

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("espeak-ng")
    .pip_install("kokoro>=0.9.4", "soundfile", "numpy", "fastapi[standard]")
    # Download the model and the French voice into the image, so a cold start does not wait for them.
    .run_commands("python -c \"from kokoro import KPipeline; list(KPipeline(lang_code='f', repo_id='hexgrad/Kokoro-82M')('Bonjour.', voice='ff_siwis'))\"")
)

# Kokoro's language codes and a natural voice for each language Whybox speaks.
VOICES = {"fr": ("f", "ff_siwis"), "en": ("a", "af_heart")}
MAX_CHARACTERS = 1200


@app.cls(
    image=image,
    cpu=2.0,
    memory=2048,
    scaledown_window=300,
    secrets=[modal.Secret.from_dict({"TTS_TOKEN": shared_token()})],
)
class Voice:
    @modal.enter()
    def load(self):
        from kokoro import KPipeline

        self.pipelines = {language: KPipeline(lang_code=code, repo_id="hexgrad/Kokoro-82M") for language, (code, _) in VOICES.items()}

    @modal.fastapi_endpoint(method="POST")
    def speak(self, body: dict):
        """{ token, text, language } -> 24 kHz mono WAV. The token keeps the endpoint for the Whybox server only."""
        import numpy as np
        import soundfile
        from fastapi import HTTPException, Response

        token = os.environ.get("TTS_TOKEN", "")
        if not token or body.get("token") != token:
            raise HTTPException(status_code=401, detail="Unauthorized")
        text = str(body.get("text", "")).strip()[:MAX_CHARACTERS]
        if not text:
            raise HTTPException(status_code=400, detail="Missing text")
        language = body.get("language") if body.get("language") in VOICES else "fr"
        _, voice = VOICES[language]

        chunks = [audio for _, _, audio in self.pipelines[language](text, voice=voice, speed=0.95)]
        audio = np.concatenate([np.asarray(chunk) for chunk in chunks]) if chunks else np.zeros(1)
        buffer = io.BytesIO()
        soundfile.write(buffer, audio, 24000, format="WAV", subtype="PCM_16")
        return Response(content=buffer.getvalue(), media_type="audio/wav")
