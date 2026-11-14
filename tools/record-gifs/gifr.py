"""Render captured terminal steps into an animated GIF.

A step is {"cmd": str, "out": str, "ec": int}: the command is "typed", its real output is printed line by line.
Nothing is invented: the text comes from real runs captured by capture.py / record.sh.
"""
import textwrap

from PIL import Image, ImageDraw, ImageFont

F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 15)
W, LH, COLS = 920, 19, 100
BG = (18, 20, 28)
FG = (214, 218, 228)
GR = (120, 200, 140)
RD = (240, 110, 110)
DIM = (120, 128, 150)
CY = (120, 180, 240)
YL = (230, 200, 110)


def build(steps, title, out, rows=16, linedelay=110):
    H = 40 + rows * LH + 14
    lines = []
    frames = []
    durs = []

    def render():
        im = Image.new('RGB', (W, H), BG)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, W, 30], fill=(34, 37, 50))
        for i, c in enumerate([(240, 95, 87), (250, 189, 46), (40, 200, 64)]):
            d.ellipse([12 + i * 20, 9, 24 + i * 20, 21], fill=c)
        d.text((W // 2 - len(title) * 4, 7), title, font=F, fill=DIM)
        y = 40
        for t, c in lines[-rows:]:
            d.text((14, y), t, font=F, fill=c)
            y += LH
        return im

    def add(dur):
        frames.append(render())
        durs.append(dur)

    def colour(l):
        if l.startswith(('All good', 'TRACK', 'CLI OK', 'SDK OK', 'ALL PASSED', '===')):
            return GR
        if l.startswith('Found'):
            return YL
        if l.startswith(('- ', 'CLI FAIL', 'SDK FAIL')):
            return RD
        if l.startswith('~'):
            return DIM
        return FG

    for s in steps:
        for cl in s['cmd'].split('\n'):
            comment = cl.startswith('#')
            txt = cl if comment else '$ ' + cl
            col = DIM if comment else CY
            lines.append(('', col))
            for i in range(4, len(txt) + 4, 4):
                lines[-1] = (txt[:i] + '▌', col)
                add(35)
            lines[-1] = (txt, col)
        add(300)
        for l in s['out'].split('\n'):
            if l == '':
                continue
            for w in textwrap.wrap(l, COLS - 2, subsequent_indent='  ') or ['']:
                lines.append((w, colour(l)))
                add(linedelay)
        if s['ec'] != 0:
            lines.append((f'exit code {s["ec"]}', RD))
            add(500)
        add(700)
    add(2500)
    pal = frames[-1].quantize(colors=32, method=Image.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
    mf = [q[0]]
    md = [durs[0]]
    for f, dd in zip(q[1:], durs[1:]):
        if f.tobytes() == mf[-1].tobytes():
            md[-1] += dd
        else:
            mf.append(f)
            md.append(dd)
    mf[0].save(out, save_all=True, append_images=mf[1:], duration=md, loop=0, optimize=False, disposal=1)
    return len(mf), sum(md) / 1000
