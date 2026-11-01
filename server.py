#!/usr/bin/env python3
"""Serve Mech Pit Brawl on localhost and open it in the default browser.

The port comes from arcade.json (8804). If that port is taken, the next free
port is used. Pass --no-browser to skip launching a browser (used by tests)
and --port N to override the manifest port.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8804


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print("[http]", fmt % args, flush=True)


def manifest_port() -> int:
    try:
        data = json.loads((ROOT / "arcade.json").read_text(encoding="utf-8"))
        return int(data.get("port", DEFAULT_PORT))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return DEFAULT_PORT


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve Mech Pit Brawl locally.")
    parser.add_argument("--port", type=int, default=None, help="port override")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser")
    return parser.parse_args(argv)


def bind_server(start: int) -> tuple[ThreadingHTTPServer, int]:
    last_error: Exception | None = None
    for port in range(start, start + 30):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            return server, port
        except OSError as error:
            last_error = error
    print(f"Could not bind 127.0.0.1:{start} or the next 29 ports.", file=sys.stderr)
    if last_error:
        print(last_error, file=sys.stderr)
    raise SystemExit(1)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    os.chdir(ROOT)
    start = args.port if args.port is not None else manifest_port()
    server, port = bind_server(start)
    url = f"http://127.0.0.1:{port}/index.html"
    print(f"Serving {url}", flush=True)
    if not args.no_browser:
        try:
            webbrowser.open(url)
        except Exception as error:  # noqa: BLE001 — browser launch is best-effort
            print(f"Open {url} in a browser. ({error})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
