from __future__ import annotations
import argparse
import hashlib
from pathlib import Path
import shutil

from .perception import MODEL_FILE, MODEL_REPO, MODEL_REVISION


def main():
    parser = argparse.ArgumentParser(description="Touchline's local football vision and speech service")
    sub = parser.add_subparsers(dest="command", required=True)
    setup = sub.add_parser("setup", help="Download pinned Apache-2.0 RF-DETR ONNX weights")
    setup.add_argument("--model", type=Path)
    serve = sub.add_parser("serve", help="Start the private loopback API")
    serve.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    if args.command == "setup":
        from huggingface_hub import hf_hub_download
        root = Path(__file__).resolve().parents[3]
        target = args.model or root / "artifacts/models/rfdetr-nano-int8.onnx"
        downloaded = hf_hub_download(MODEL_REPO, MODEL_FILE, revision=MODEL_REVISION)
        target.parent.mkdir(parents=True, exist_ok=True)
        if Path(downloaded).resolve() != target.resolve():
            shutil.copyfile(downloaded, target)
        with target.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        print(f"Model: {target}\nRevision: {MODEL_REVISION}\nSHA-256: {digest}\nLicense: Apache-2.0 (publisher model card)")
    else:
        import uvicorn
        from .service import create_app
        uvicorn.run(create_app(), host="127.0.0.1", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
