#!/usr/bin/env python3
"""Headless check that server.py serves the game."""

from __future__ import annotations

import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = 18904


def wait_for_line(proc: subprocess.Popen[str], needle: str, timeout: float) -> str:
    deadline = time.time() + timeout
    assert proc.stdout is not None
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line:
            if needle in line:
                return line
        elif proc.poll() is not None:
            break
        else:
            time.sleep(0.02)
    raise AssertionError(f"server did not report {needle!r} before exit {proc.poll()}")


def fetch(path: str) -> tuple[int, str, str]:
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{path}", timeout=5) as response:
        body = response.read().decode("utf-8", errors="replace")
        return response.status, response.headers.get("Content-Type", ""), body


def main() -> None:
    proc = subprocess.Popen(
        [sys.executable, "server.py", "--no-browser", "--port", str(PORT)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        line = wait_for_line(proc, f"Serving http://127.0.0.1:{PORT}/index.html", 8)
        assert "index.html" in line
        status, content_type, html = fetch("/index.html")
        assert status == 200, status
        assert "text/html" in content_type
        assert "<canvas" in html
        assert "Mech Pit Brawl" in html
        assert "src/ui/main.js" in html

        status, content_type, script = fetch("/src/ui/main.js")
        assert status == 200, status
        assert "javascript" in content_type
        assert "createMatch" in script

        status, _, core = fetch("/src/core/match.js")
        assert status == 200
        assert "export function step" in core

        status, _, manifest = fetch("/arcade.json")
        assert status == 200
        assert '"mechpitbrawl"' in manifest
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=3)


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, urllib.error.URLError, OSError) as error:
        print(f"smoke failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    print("smoke ok")
