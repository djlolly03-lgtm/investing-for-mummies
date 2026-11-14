#!/usr/bin/env python3
"""Render a two-tone kinetic typography flash-card reel (1080x1920, 30 fps).

Mirrors the Meraki Club format: one short phrase per hard cut, two brand
colours inverted on every card, optional same-colour text swaps, a longer
end lockup, and an optional click track. Uses only Pillow, numpy and ffmpeg.
No paid APIs.

Example:
  python3 scripts/render_flash_type.py \\
      --config scripts/demo_copy.json \\
      --out demos/demo.mp4
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
import wave
import struct

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    sys.exit(f"Missing dependency: {e}. Install pillow and numpy.")


def hex_to_rgb(s: str):
    s = s.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


def contrast_color(bg, a, b):
    return b if bg == a else a


def load_font(path: str, size: int):
    if path and os.path.isfile(path):
        return ImageFont.truetype(path, size=size)
    # fallbacks
    for p in (
        os.path.join(os.path.dirname(__file__), "..", "fonts", "Anton-Regular.ttf"),
        "/usr/share/fonts/truetype/sand-box/google/Anton/Anton-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.isfile(p):
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def draw_text_block(draw, text, font, fill, cx, cy, tracking=0, stroke_width=0, stroke_fill=None):
    """Draw a single line centered at (cx, cy) with optional letter-spacing."""
    if tracking == 0:
        if stroke_width:
            draw.text((cx, cy), text, font=font, fill=fill, anchor="mm",
                      stroke_width=stroke_width, stroke_fill=stroke_fill)
        else:
            draw.text((cx, cy), text, font=font, fill=fill, anchor="mm")
        return
    # letter-spaced: measure and place
    glyphs = list(text)
    widths = [font.getlength(ch) for ch in glyphs]
    total = sum(widths) + tracking * max(0, len(glyphs) - 1)
    x = cx - total / 2
    for ch, w in zip(glyphs, widths):
        # anchor lm-ish: vertical center via anchor "lm" is mid-left of em box? use "ls" no.
        # Use "lt" then offset. Better: anchor "mm" on each glyph at x+w/2
        gx = x + w / 2
        if stroke_width:
            draw.text((gx, cy), ch, font=font, fill=fill, anchor="mm",
                      stroke_width=stroke_width, stroke_fill=stroke_fill)
        else:
            draw.text((gx, cy), ch, font=font, fill=fill, anchor="mm")
        x += w + tracking


def render_card(cfg, card, bg, fg, w, h):
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    lines = card.get("lines")
    if not lines:
        raw = card.get("text", "")
        lines = [ln for ln in raw.split("\n") if ln != ""] or [""]
    n = len(lines)
    if card.get("lockup") or (n > 1 and card.get("role") == "lockup"):
        size = int(card.get("font_size") or cfg.get("lockup_size") or cfg.get("two_line_size") or 80)
    elif n > 1:
        size = int(card.get("font_size") or cfg.get("two_line_size") or 90)
    elif card.get("emphasis"):
        size = int(card.get("font_size") or cfg.get("font_size_emphasis") or 110)
    else:
        size = int(card.get("font_size") or cfg.get("font_size") or 90)
    font_path = cfg.get("font") or ""
    # resolve relative to config or script
    if font_path and not os.path.isabs(font_path):
        bases = [
            os.path.dirname(os.path.abspath(cfg.get("_config_path") or "")),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
            os.getcwd(),
        ]
        for b in bases:
            p = os.path.normpath(os.path.join(b, font_path))
            if os.path.isfile(p):
                font_path = p
                break
    font = load_font(font_path, size)
    tracking = float(card.get("tracking", cfg.get("tracking", -2)))
    gap = int(card.get("line_gap", cfg.get("line_gap", 32)))
    # vertical stack centered on frame
    # approximate line height from a cap letter
    sample = font.getbbox("A")
    line_h = (sample[3] - sample[1]) if sample else size
    total_h = n * line_h + (n - 1) * gap
    y0 = h / 2 - total_h / 2 + line_h / 2
    y_shift = int(card.get("y_shift", cfg.get("y_shift", 0)))
    for i, line in enumerate(lines):
        cy = y0 + i * (line_h + gap) + y_shift
        draw_text_block(draw, line, font, fg, w / 2, cy, tracking=tracking)
    # optional logo image, centred (IFM end card)
    logo = card.get("image")
    if logo:
        base = os.path.dirname(os.path.abspath(cfg.get("_config_path") or __file__))
        lp = logo if os.path.isabs(logo) else os.path.join(base, logo)
        if not os.path.isfile(lp):
            lp = os.path.join(os.path.dirname(os.path.abspath(__file__)), logo)
        im = Image.open(lp).convert("RGBA")
        lw = int(card.get("image_width", 640))
        im = im.resize((lw, round(im.height * lw / im.width)), Image.LANCZOS)
        cy = h // 2 + int(card.get("image_y_shift", 0))
        img.paste(im, ((w - lw) // 2, cy - im.height // 2), im)
    # optional small footer (usually unused)
    footer = card.get("footer")
    if footer:
        fsize = int(cfg.get("footer_size") or max(28, size // 3))
        ff = load_font(font_path, fsize)
        draw.text((w / 2, h - int(cfg.get("footer_from_bottom", 140))), footer, font=ff, fill=fg, anchor="mm")
    return img


def seconds_to_frames(sec, fps):
    return max(1, int(round(float(sec) * fps)))


def build_click_track(cuts, duration, sr=44100, freq=1000, click_ms=18):
    """Short sine ticks at each cut, plus a quieter tick on a regular pulse if given."""
    n = int(round(duration * sr))
    audio = np.zeros(n, dtype=np.float32)
    length = int(sr * click_ms / 1000)
    t = np.arange(length) / sr
    env = np.exp(-t * 80)
    tone = (0.55 * np.sin(2 * math.pi * freq * t) * env).astype(np.float32)
    # a slightly lower confirmation tick for the first of a same-colour pair? same.
    for c in cuts:
        start = int(round(c * sr))
        end = min(n, start + length)
        audio[start:end] += tone[: end - start]
    # gentle noise floor so players don't look "silent"
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = np.clip(audio / peak * 0.7, -1, 1)
    return audio


def write_wav(path, audio, sr=44100):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser(description="Render a two-tone flash-type reel")
    ap.add_argument("--config", required=True, help="JSON config (cards, colours, font)")
    ap.add_argument("--out", required=True, help="Output mp4 path")
    ap.add_argument("--audio", default=None, help="clicks | none | path to audio file (overrides config)")
    args = ap.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["_config_path"] = os.path.abspath(args.config)

    w = int(cfg.get("width", 1080))
    h = int(cfg.get("height", 1920))
    fps = int(cfg.get("fps", 30))
    color_a = hex_to_rgb(cfg.get("color_a", "#F9CD46"))
    color_b = hex_to_rgb(cfg.get("color_b", "#F0718E"))
    start = (cfg.get("start_with") or "A").upper()
    bg = color_a if start == "A" else color_b
    cards = cfg["cards"]
    if not cards:
        sys.exit("config.cards is empty")

    frames = []
    cuts = [0.0]
    t = 0.0
    for i, card in enumerate(cards):
        if i > 0 and not card.get("keep_colors"):
            bg = contrast_color(bg, color_a, color_b)
        fg = contrast_color(bg, color_a, color_b)
        if "bg" in card:
            bg = hex_to_rgb(card["bg"]) if isinstance(card["bg"], str) else tuple(card["bg"])
        if "fg" in card:
            fg = hex_to_rgb(card["fg"]) if isinstance(card["fg"], str) else tuple(card["fg"])
        img = render_card(cfg, card, bg, fg, w, h)
        if "duration_frames" in card:
            nfr = int(card["duration_frames"])
        else:
            nfr = seconds_to_frames(card.get("duration", 0.5), fps)
        frames.append((img, nfr))
        t += nfr / fps
        cuts.append(t)
    duration = t

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)

    audio_mode = args.audio if args.audio is not None else cfg.get("audio", "clicks")
    with tempfile.TemporaryDirectory(prefix="flash-type-") as td:
        # write a lossless mkv/mp4 from a concat of pngs or a pipe
        # Use ffmpeg image2 pipe (raw rgb24) for speed
        cmd = [
            "ffmpeg", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{w}x{h}", "-r", str(fps),
            "-i", "pipe:0",
        ]
        wav_path = None
        if audio_mode and audio_mode != "none":
            wav_path = os.path.join(td, "bed.wav")
            if audio_mode == "clicks":
                write_wav(wav_path, build_click_track(cuts[:-1], duration))
            elif os.path.isfile(audio_mode):
                # take the provided file as-is
                wav_path = audio_mode
            else:
                sys.exit(f"Unknown --audio {audio_mode}")
            cmd += ["-i", wav_path, "-shortest"]
        cmd += [
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-profile:v", "high", "-crf", "18", "-preset", "medium",
            "-movflags", "+faststart",
        ]
        if wav_path:
            cmd += ["-c:a", "aac", "-b:a", "160k"]
        else:
            cmd += ["-an"]
        cmd += [out]
        log_path = os.path.join(td, "ffmpeg.log")
        with open(log_path, "w") as logf:
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=logf)
            try:
                for img, nfr in frames:
                    raw = img.convert("RGB").tobytes()
                    for _ in range(nfr):
                        proc.stdin.write(raw)
            except BrokenPipeError:
                pass
            finally:
                try:
                    proc.stdin.close()
                except Exception:
                    pass
            ret = proc.wait()
        if ret != 0:
            try:
                err = open(log_path, "r", errors="replace").read()[-4000]
            except Exception:
                err = ""
            sys.stderr.write(err)
            sys.exit(ret)

    print(f"wrote {out}  {duration:.3f}s  {sum(n for _, n in frames)} frames  {len(cards)} cards")
    print("cuts (s):", ", ".join(f"{c:.3f}" for c in cuts))


if __name__ == "__main__":
    main()
