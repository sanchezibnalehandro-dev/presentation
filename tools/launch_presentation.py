#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Open the Digital Neanderthals presenter in one click (stdlib only).

Reuses a compatible local server or starts a new loopback-only server.
Does not launch the independent Course Studio module.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORTS = range(8000, 8011)
REQUIRED = [
    "index.html", "audience.html", "presenter.js", "audience.js",
    "styles.css", "data/slides-data.js", "content/notes-data.js",
    "vendor/qrcode.min.js",
] + [f"assets/slides/{i:02d}.png" for i in range(1, 26)]


def is_our_server(port: int) -> bool:
    """Check that this port serves the real presenter and the final PNG."""
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/index.html", timeout=0.8) as r:
            body = r.read(16000)
            if r.status != 200 or b'data/slides-data.js' not in body or b'presenter.js' not in body:
                return False
        with urllib.request.urlopen(f"http://{HOST}:{port}/assets/slides/25.png", timeout=1.5) as r:
            return r.status == 200 and r.read(8) == b"\x89PNG\r\n\x1a\n"
    except (OSError, urllib.error.URLError, ValueError):
        return False


def port_in_use(port: int) -> bool:
    try:
        with socket.create_connection((HOST, port), timeout=0.3):
            return True
    except OSError:
        return False


def open_presenter(port: int) -> None:
    url = f"http://localhost:{port}/index.html"
    print("Digital Neanderthals:", url, flush=True)
    try:
        if os.name == "nt":
            os.startfile(url)  # type: ignore[attr-defined]
        else:
            webbrowser.open(url, new=2)
    except OSError:
        print("Open the URL shown above in your browser.", flush=True)


def start_server(port: int) -> subprocess.Popen:
    logs = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "SanchezPresentation"
    logs.mkdir(parents=True, exist_ok=True)
    args = [sys.executable, "-m", "http.server", str(port),
            "--bind", HOST, "--directory", str(ROOT)]
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
    with (logs / f"server-{port}.log").open("ab") as log:
        return subprocess.Popen(
            args, cwd=str(ROOT), stdin=subprocess.DEVNULL,
            stdout=log, stderr=subprocess.STDOUT,
            creationflags=flags, start_new_session=os.name != "nt",
        )


def main() -> int:
    missing = [path for path in REQUIRED if not (ROOT / path).is_file()]
    if missing:
        print("Presentation is incomplete. Missing files:", *missing, sep="\n", file=sys.stderr)
        return 1

    for port in PORTS:
        if is_our_server(port):
            print("Reusing an existing presentation server.", flush=True)
            open_presenter(port)
            return 0

    port = next((p for p in PORTS if not port_in_use(p)), None)
    if port is None:
        print("Ports 8000-8010 are busy. Close another local server and retry.", file=sys.stderr)
        return 1

    try:
        server = start_server(port)
    except OSError as exc:
        print("Could not start the local server:", exc, file=sys.stderr)
        return 1

    deadline = time.monotonic() + 8.0
    while time.monotonic() < deadline:
        if is_our_server(port):
            open_presenter(port)
            return 0
        if server.poll() is not None:
            break
        time.sleep(0.25)

    print("Presentation server did not respond. Check the SanchezPresentation log.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
