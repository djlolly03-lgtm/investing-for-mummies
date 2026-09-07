"""
One-time setup: mint a Google refresh token for the IFM News Agency.

Run this once on your Mac. It opens a browser, you approve access to your own
Google Drive, and it prints the three values to paste into Vercel.

    ./venv/bin/python setup_google_oauth.py

Before running, create an OAuth client in Google Cloud Console:
  1. console.cloud.google.com -> create (or pick) a project
  2. APIs & Services -> Library -> enable "Google Drive API" and "Google Sheets API"
  3. APIs & Services -> OAuth consent screen -> External -> add yourself
     (djlolly03@gmail.com) under "Test users"
  4. APIs & Services -> Credentials -> Create credentials -> OAuth client ID
     -> Application type: "Desktop app"
  5. Copy the Client ID and Client secret, and paste them when prompted below.
"""

import http.server
import json
import socket
import sys
import threading
import urllib.parse
import webbrowser

import requests

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = " ".join([
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
])

_code: str | None = None


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global _code
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _code = (params.get("code") or [None])[0]
        error = (params.get("error") or [None])[0]

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        if _code:
            body = "<h2>Approved.</h2><p>You can close this tab and return to the Terminal.</p>"
        else:
            body = f"<h2>Something went wrong.</h2><p>{error or 'No authorization code returned.'}</p>"
        self.wfile.write(f"<html><body style='font-family:sans-serif;padding:40px'>{body}</body></html>".encode())

    def log_message(self, *args):
        pass


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> int:
    print("IFM News Agency — Google setup\n")
    client_id = input("Paste your OAuth Client ID:     ").strip()
    client_secret = input("Paste your OAuth Client secret: ").strip()
    if not client_id or not client_secret:
        print("\nBoth values are required. See the instructions at the top of this file.")
        return 1

    port = free_port()
    redirect_uri = f"http://localhost:{port}"

    server = http.server.HTTPServer(("127.0.0.1", port), CallbackHandler)
    threading.Thread(target=server.handle_request, daemon=True).start()

    auth_url = f"{AUTH_URL}?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",     # required to get a refresh token
        "prompt": "consent",          # forces a fresh refresh token every run
    })

    print(f"\nOpening your browser to approve access...")
    print(f"If it doesn't open, paste this into your browser:\n\n{auth_url}\n")
    webbrowser.open(auth_url)

    for _ in range(300):  # up to ~5 minutes
        if _code:
            break
        threading.Event().wait(1)
    server.server_close()

    if not _code:
        print("Timed out waiting for approval. Run the script again.")
        return 1

    print("Exchanging the approval for a refresh token...")
    r = requests.post(TOKEN_URL, data={
        "code": _code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }, timeout=30)

    if r.status_code != 200:
        print(f"\nGoogle rejected the exchange ({r.status_code}):\n{r.text}")
        return 1

    refresh_token = r.json().get("refresh_token")
    if not refresh_token:
        print("\nGoogle did not return a refresh token. This usually means you've "
              "approved this client before — revoke it at "
              "myaccount.google.com/permissions and run this again.")
        return 1

    print("\n" + "=" * 68)
    print("Done. Add these to Vercel (Project Settings -> Environment Variables):")
    print("=" * 68)
    print(f"GOOGLE_CLIENT_ID       {client_id}")
    print(f"GOOGLE_CLIENT_SECRET   {client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN   {refresh_token}")
    print(f"GOOGLE_DRIVE_FOLDER_ID 1D1zVyslxYlZCO4OeSxURSyzcunBXRGsl")
    print("=" * 68)
    print("\nAlso set ANTHROPIC_API_KEY and IFM_ADMIN_TOKEN (any long random string —")
    print("that's the password the Scan button will ask you for).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
