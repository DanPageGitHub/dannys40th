#!/usr/bin/env python3
"""Serve this folder at http://localhost:8080. Run from anywhere: python serve.py"""
import os
import http.server
import socketserver

# Always serve from the directory where this script lives
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

PORT = 8080

# Extensionless URLs -> .html so /visualiser2 and /visualiser2.html both work
EXTENSIONLESS = {'/visualiser2', '/visualiser2/', '/visualiser', '/visualiser/'}

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parts = self.path.split('?', 1)
        path = (parts[0].rstrip('/') or '/')
        q = ('?' + parts[1]) if len(parts) > 1 and parts[1] else ''
        if path in EXTENSIONLESS:
            self.path = (path + '.html' if path != '/' else '/index.html') + q
        super().do_GET()

print()
print("  Serving from:", SCRIPT_DIR)
print("  Open in Chrome:")
print("    http://localhost:8080")
print("    http://localhost:8080/visualiser2.html")
print("  Stop with Ctrl+C")
print()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
