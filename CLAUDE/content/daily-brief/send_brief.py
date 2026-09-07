#!/usr/bin/env python3
"""Sends the IFM Daily Brief via Gmail SMTP.
The app password lives in macOS Keychain (service "ifm-daily-brief-smtp",
account "djlolly03@gmail.com") — never stored in this file or logged in plaintext.
Usage: python3 send_brief.py <path-to-html-file>
"""
import sys
import subprocess
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

FROM_ADDR = "djlolly03@gmail.com"
TO_ADDRS = [
    "aditya@vantageservices.in",
    "hiral.sheth@gmail.com",
    "sakshi@investingformummies.com",
    "asba@moogaworld.com",
]
KEYCHAIN_SERVICE = "ifm-daily-brief-smtp"
KEYCHAIN_ACCOUNT = "djlolly03@gmail.com"

def get_app_password():
    r = subprocess.run(
        ["security", "find-generic-password", "-a", KEYCHAIN_ACCOUNT,
         "-s", KEYCHAIN_SERVICE, "-w"],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print("ERROR: could not read app password from Keychain", file=sys.stderr)
        sys.exit(1)
    return r.stdout.strip()

def main():
    if len(sys.argv) != 2:
        print("usage: send_brief.py <html-file>", file=sys.stderr)
        sys.exit(1)
    html_path = sys.argv[1]
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"IFM Daily Brief — {datetime.now().strftime('%-d %b %Y')}"
    msg["From"] = FROM_ADDR
    msg["To"] = ", ".join(TO_ADDRS)
    msg.attach(MIMEText("Your email client doesn't show HTML — open the Content Hub instead: https://ifm-deploy.vercel.app/content/", "plain"))
    msg.attach(MIMEText(html, "html"))

    password = get_app_password()
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(FROM_ADDR, password)
        server.sendmail(FROM_ADDR, TO_ADDRS, msg.as_string())
    print(f"Sent to {', '.join(TO_ADDRS)}")

if __name__ == "__main__":
    main()
