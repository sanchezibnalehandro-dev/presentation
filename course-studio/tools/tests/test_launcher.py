"""Launcher contract tests, Python standard-library unittest.

Run: py -m unittest discover -s course-studio/tools/tests -v
"""
from __future__ import annotations
import importlib.util
from pathlib import Path
from unittest import TestCase, main
from unittest.mock import patch
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT = Path(__file__).resolve().parents[1] / "launch_studio.py"
spec = importlib.util.spec_from_file_location("launch_studio", SCRIPT)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/course-studio/":
            data = b'<title>COURSE STUDIO</title><div id="workArea"></div>'
        else:
            data = b"not found"
        self.send_response(200 if self.path == "/course-studio/" else 404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


class LauncherTests(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.http.server_address[1]
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()

    def test_identifies_studio(self):
        self.assertTrue(launcher.studio_is_running(self.port))

    def test_detects_occupied_port(self):
        self.assertTrue(launcher.port_in_use(self.port))

    def test_other_server_is_not_studio(self):
        with patch("urllib.request.urlopen") as urlopen:
            response = urlopen.return_value.__enter__.return_value
            response.status = 200
            response.read.return_value = b"<html>ANOTHER SERVICE</html>"
            self.assertFalse(launcher.studio_is_running(self.port))

    def test_main_reuses_running_server(self):
        with patch.object(launcher, "PORTS", range(self.port, self.port + 1)):
            with patch.object(launcher, "open_studio") as open_studio:
                with patch.object(launcher, "start_server") as start_server:
                    self.assertEqual(launcher.main(), 0)
                    open_studio.assert_called_once_with(self.port)
                    start_server.assert_not_called()

    def test_port_busy_chooses_next(self):
        busy_port = self.port
        free_port = 8010 if busy_port != 8010 else 8009
        with patch.object(launcher, "PORTS", [busy_port, free_port]):
            with patch.object(launcher, "port_in_use", side_effect=lambda p: p == busy_port):
                with patch.object(launcher, "studio_is_running", side_effect=lambda p: p == busy_port):
                    with patch.object(launcher, "open_studio"):
                        with patch.object(launcher, "start_server") as start_server:
                            self.assertEqual(launcher.main(), 0)
                            start_server.assert_not_called()


if __name__ == "__main__":
    main()
