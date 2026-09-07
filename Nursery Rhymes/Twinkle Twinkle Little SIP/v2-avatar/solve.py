#!/usr/bin/env python3
"""Playbook 4 - motion-aware rate-smoothing solve.

Raw per-word anchoring gives a rate that lurches (1.0x -> 2.34x -> 0.94x), which
reads far worse than a uniformly-off rate. So instead of using the anchors
directly, solve for a monotonic time-warp that:

  * hits the VISUAL lip anchors            (lip sync outranks everything)
  * keeps the rate near 1.0x where the frame is MOVING a lot
    (a held mouth at 1.9x is invisible; a sweeping gesture at 1.9x is not)
  * pushes stretch into non-face frames    (free - no lips to contradict)
  * varies smoothly, except across a real shot cut, where a jump is free
  * stays inside a hard speed cap

Unconstrained parameterisation: e_k = L * softmax(u)_k, so the segment song-
durations are automatically positive and sum to the slot length.
"""
import numpy as np


def solve(clip_span, slot, anchors, cuts, motion, face, mmotion=None, rests=(), fps=24,
          knot_dt=0.20, w_anchor=340.0, w_motion=1.7, w_smooth=5.0,
          speed_cap=(0.80, 1.55), rest_cap=(0.70, 2.20),
          w_cap=90.0, iters=1400, seed=0):
    c0, c1 = clip_span; s0, s1 = slot
    L = s1 - s0

    # ---- knots: regular grid + every anchor + every shot cut inside the span
    ks = set(np.arange(c0, c1, knot_dt).round(4)) | {round(c0, 4), round(c1, 4)}
    ks |= {round(a, 4) for a, _ in anchors if c0 < a < c1}
    cutset = {round(c, 4) for c in cuts if c0 < c < c1}
    ks |= cutset
    K = np.array(sorted(ks))
    K = K[(K >= c0) & (K <= c1)]
    d = np.diff(K)                                   # clip duration per interval
    keep = d > 1e-4
    K = np.concatenate([K[:1], K[1:][keep]]); d = np.diff(K)
    n = len(d)

    # ---- per-interval motion + face fraction
    def sample(sig, a, b):
        i0, i1 = int(a * fps), max(int(b * fps), int(a * fps) + 1)
        v = sig[i0:i1]
        return float(v.mean()) if len(v) else float(sig.mean())
    mot = np.array([sample(motion, K[i], K[i + 1]) for i in range(n)])
    fac = np.array([sample(face, K[i], K[i + 1]) for i in range(n)])
    mot = (mot - mot.min()) / (np.ptp(mot) + 1e-9)   # 0..1
    if mmotion is None:
        mm = mot
    else:
        mm = np.array([sample(mmotion, K[i], K[i + 1]) for i in range(n)])
        mm = (mm - mm.min()) / (np.ptp(mm) + 1e-9)
    # Two different reasons to hold the rate near 1.0:
    #   mouth moving -> she is articulating; retiming here breaks lip sync
    #   frame moving -> a gesture; retiming here reads as slow-mo / fast-mo
    # Where the mouth is STILL (a rest) both relax, so the solver spends its
    # compression there - which is the playbook's "align her rests" rule.
    mw = (0.10 + 0.90 * mm) * (0.30 + 0.70 * fac) + 0.55 * mot

    # RESTS, read off the 1/8s mouth strips by eye.  An automated mouth-motion
    # signal cannot separate "lips articulating" from "she moved her head" on
    # this footage without real landmarks, so these are hand-marked.  A rest is
    # a mouth-closed stretch: compressing it is invisible, so it is where all
    # the spare stretch should go (playbook 4, "align her rests to the song's").
    restw = np.ones(n)
    for r0, r1 in rests:
        for i in range(n):
            mid = 0.5 * (K[i] + K[i + 1])
            if r0 <= mid <= r1:
                restw[i] = 0.06
    mw = mw * restw

    # no smoothing penalty across a real cut - the rate may jump there for free
    is_cut = np.array([round(K[i + 1], 4) in cutset for i in range(n - 1)])
    sw = np.where(is_cut, 0.0, 1.0)
    # let the rate change freely at a rest boundary too - nobody sees a rate
    # change on a closed mouth, and pinning it there is what forced the
    # compression back out into the sung phrases
    sw = sw * np.minimum(restw[:-1], restw[1:]) ** 0.0
    for i in range(n - 1):
        if restw[i] != restw[i + 1]:
            sw[i] = 0.15

    # ---- anchors -> (interval index, fractional position, target song time)
    A = []
    for ct, st in anchors:
        if ct <= c0: A.append((0, 0.0, st)); continue
        if ct >= c1: A.append((n - 1, 1.0, st)); continue
        j = int(np.searchsorted(K, ct) - 1); j = min(max(j, 0), n - 1)
        A.append((j, (ct - K[j]) / d[j], st))

    # The speed cap exists to stop VISIBLE slow-mo / fast-mo on an articulating
    # mouth or a moving gesture.  Inside a hand-marked rest the mouth is closed
    # and still, so a much harder squeeze is invisible - and that is precisely
    # where the spare stretch has to go.  Hence a per-interval cap.
    # ...but a rest is only free to squeeze if the FRAME is also still.  E's
    # 5.85-7.40 has no readable face, yet she is standing up - squeezing that
    # gesture 3.6x would read as fast-forward.  So the rest allowance is scaled
    # down by how much the frame is moving.
    isrest = (restw < 1.0).astype(float)
    hi = speed_cap[1] + (rest_cap[1] - speed_cap[1]) * isrest * (1.0 - mot) ** 2.5
    lo = np.where(isrest > 0, rest_cap[0], speed_cap[0])
    rmin, rmax = 1.0 / hi, 1.0 / lo

    def unpack(u):
        p = np.exp(u - u.max()); e = L * p / p.sum()
        return e, e / d

    def loss(u):
        e, r = unpack(u)
        W = s0 + np.concatenate([[0.0], np.cumsum(e)])
        J = 0.0
        for j, f, st in A:
            J += w_anchor * (W[j] + f * e[j] - st) ** 2
        J += w_motion * np.sum(mw * (r - 1.0) ** 2)
        J += w_smooth * np.sum(sw * np.diff(r) ** 2)
        J += w_cap * (np.sum(np.clip(rmin - r, 0, None) ** 2) +
                      np.sum(np.clip(r - rmax, 0, None) ** 2))
        return J

    rng = np.random.default_rng(seed)
    u = np.log(d / d.sum()) + 1e-3 * rng.standard_normal(n)
    m_, v_ = np.zeros(n), np.zeros(n)
    lr, b1, b2, eps = 0.06, 0.9, 0.999, 1e-8
    base = loss(u)
    for t in range(1, iters + 1):
        g = np.zeros(n); h = 1e-5
        f0 = loss(u)
        for i in range(n):                     # finite-difference gradient
            u[i] += h; g[i] = (loss(u) - f0) / h; u[i] -= h
        m_ = b1 * m_ + (1 - b1) * g
        v_ = b2 * v_ + (1 - b2) * g * g
        u -= lr * (m_ / (1 - b1 ** t)) / (np.sqrt(v_ / (1 - b2 ** t)) + eps)
    e, r = unpack(u)
    W = s0 + np.concatenate([[0.0], np.cumsum(e)])
    err = [abs(W[j] + f * e[j] - st) for j, f, st in A]
    return dict(K=K, e=e, r=r, W=W, speed=1.0 / r, anchor_err=err,
                loss0=base, loss1=loss(u), motion=mot, face=fac, restw=restw)
