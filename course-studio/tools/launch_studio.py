#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Single-click local Course Studio launcher (Python stdlib only).

Starts a loopback-only static server when necessary, then opens the studio.
Never touches public hosting or uploads lesson files.
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

HOST = "127.0.0.1"
PORTS = range(8000, 8011)
ROUTE = "/course-studio/"
REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX = REPO_ROOT / "course-studio" / "index.html"


def studio_is_running(port: int) -> bool:
    """Check that this is Course Studio, not just another service on the port."""
    url = "http://{}:{}{}".format(HOST, port, ROUTE)
    try:
        req = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=0.7) as response:
            if response.status != 200:
                return False
            data = response.read(25000)
            return b"COURSE STUDIO" in data and b'id="workArea"' in data
    except (OSError, urllib.error.URLError, ValueError):
        return False


def port_in_use(port: int) -> bool:
    try:
        with socket.create_connection((HOST, port), timeout=0.3):
            return True
    except OSError:
        return False


def start_server(port: int) -> subprocess.Popen:
    """Launch a detached local-only server; keep errors in a local log."""
    log_dir = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "SanchezCourseStudio"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / ("server-{}.log".format(port))
    argv = [sys.executable, "-m", "http.server", str(port),
            "--bind", HOST, "--directory", str(REPO_ROOT)]
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
    with log_path.open("ab") as log:
        return subprocess.Popen(
            argv, cwd=str(REPO_ROOT), stdin=subprocess.DEVNULL,
            stdout=log, stderr=subprocess.STDOUT,
            creationflags=flags, start_new_session=os.name != "nt",
        )


def open_studio(port: int) -> None:
    url = "http://localhost:{}{}".format(port, ROUTE)
    print("Course Studio:", url, flush=True)
    try:
        if os.name == "nt":
            os.startfile(url)  # type: ignore[attr-defined]
        elif not webbrowser.open(url, new=2):
            print("Open the URL shown above in your browser.", flush=True)
    except OSError:
        print("Open the URL shown above in your browser.", flush=True)


def main() -> int:
    if not INDEX.is_file():
        print("Course Studio is missing. Run this launcher from its repository.", file=sys.stderr)
        return 1

    # First reuse any existing copy on the preferred local ports. Do not
    # start another HTTP server just because the launcher was clicked twice.
    for port in PORTS:
        if studio_is_running(port):
            print("Using the running Course Studio server.", flush=True)
            open_studio(port)
            return 0

    # Port 8000 may be occupied by another application: choose the next free one.
    port = next((p for p in PORTS if not port_in_use(p)), None)
    if port is None:
        print("Ports 8000-8010 are occupied. Close another local server and retry.", file=sys.stderr)
        return 1

    try:
        server = start_server(port)
    except OSError as exc:
        print("Could not start Python HTTP server:", exc, file=sys.stderr)
        return 1

    # Wait for our own studio response, not merely for an open TCP port.
    end = time.monotonic() + 7.0
    while time.monotonic() < end:
        if studio_is_running(port):
            print("Local server started.", flush=True)
            open_studio(port)
            return 0
        if server.poll() is not None:
            break
        time.sleep(0.2)

    print("Server did not respond. Check the log under LOCALAPPDATA/SanchezCourseStudio.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
