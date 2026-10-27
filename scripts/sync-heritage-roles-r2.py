#!/usr/bin/env python3
"""Upload and verify the 24 approved Heritage Frame WebP assets on Cloudflare R2."""
from __future__ import annotations

import hashlib
import mimetypes
import sys
import urllib.request
from pathlib import Path

try:
    import boto3
    from botocore.config import Config
except ImportError:
    print("Install boto3: pip install boto3", file=sys.stderr)
    raise SystemExit(1)

FE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = FE_ROOT.parent
ENV_FILE = WORKSPACE_ROOT / ".env.r2"
SOURCE_CANDIDATES = (
    FE_ROOT / "heritage-assets" / "cu-chi",
    FE_ROOT / "public" / "images" / "photo-roles" / "cu-chi",
)
TARGET_PREFIX = "media/photo-roles/cu-chi"


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit(f"Missing {path}. Add the R2 credentials locally before running this script.")
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    env = load_env(ENV_FILE)
    required = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE")
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise SystemExit(f"Missing keys in {ENV_FILE}: {', '.join(missing)}")

    source = next((candidate for candidate in SOURCE_CANDIDATES if candidate.is_dir()), None)
    if source is None:
        raise SystemExit("Heritage Frame source directory was not found.")
    assets = sorted(source.glob("st0[1-6]/*.webp"))
    if len(assets) != 24:
        raise SystemExit(f"Expected exactly 24 WebP assets, found {len(assets)} in {source}")

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )
    bucket = env["R2_BUCKET"]
    public_base = env["R2_PUBLIC_BASE"].rstrip("/")

    for index, path in enumerate(assets, start=1):
        relative = path.relative_to(source).as_posix()
        key = f"{TARGET_PREFIX}/{relative}"
        checksum = sha256(path)
        client.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={
                "ContentType": mimetypes.guess_type(path.name)[0] or "image/webp",
                "CacheControl": "public,max-age=31536000,immutable",
                "Metadata": {"sha256": checksum},
            },
        )
        head = client.head_object(Bucket=bucket, Key=key)
        if head.get("ContentLength") != path.stat().st_size or head.get("Metadata", {}).get("sha256") != checksum:
            raise SystemExit(f"R2 verification failed for {key}")
        print(f"[{index:02d}/24] uploaded {key}")

    for path in assets:
        relative = path.relative_to(source).as_posix()
        url = f"{public_base}/{TARGET_PREFIX}/{relative}"
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "TimeLens-R2-Verify/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise SystemExit(f"Public verification returned {response.status}: {url}")

    print(f"Verified 24 public assets at {public_base}/{TARGET_PREFIX}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
