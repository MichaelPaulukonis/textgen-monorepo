#!/usr/bin/env python3
"""Scan corpus files for text-encoding problems.

Usage:
  python3 scripts/scan-encoding.py [CORPUS_DIR] [--json OUT.json]

CORPUS_DIR defaults to ../corpus relative to this script.

Per file, reports: detected encoding (ascii / utf-8 / latin1 / cp1252),
BOM, NUL bytes, double-encoded UTF-8 ("mojibake", e.g. "Ã©" for "é"),
and U+FFFD replacement chars (data already lost upstream).

Exits 1 if any UTF-8 file contains mojibake or U+FFFD.

Catches double-encoding and replacement chars only. Other wrong-codepage
damage (e.g. CP437 or MacRoman read as cp1252/cp1251) decodes as valid
UTF-8 and has to be spotted by eye in the "clean utf-8" listing - look for
out-of-place chars like "‚", "Š", "Ћ", "Õ" in the top non-ASCII chars.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

MOJIBAKE = re.compile(
    r'Ã[\x80-\xbf€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡-¿]|â€[\x80-\xbf™œ˜¦”“¢¡]|Â[\xa0-\xbf]|ï»¿'
)


def scan_file(path, root):
    b = open(path, 'rb').read()
    r = {'file': os.path.relpath(path, root), 'size': len(b)}
    r['bom'] = ('utf8' if b.startswith(b'\xef\xbb\xbf') else
                'utf16le' if b.startswith(b'\xff\xfe') else
                'utf16be' if b.startswith(b'\xfe\xff') else '')
    r['nul'] = b.count(b'\x00')
    hi = sum(1 for x in b if x >= 0x80)
    r['nonascii_bytes'] = hi
    try:
        t = b.decode('utf-8')
        r['enc'] = 'ascii' if hi == 0 else 'utf-8'
        r['fffd'] = t.count('�')
        m = MOJIBAKE.findall(t)
        r['mojibake'] = len(m)
        r['mojibake_top'] = Counter(m).most_common(5)
        r['nonascii_chars'] = Counter(ch for ch in t if ord(ch) > 127).most_common(8)
    except UnicodeDecodeError:
        # C1 range (0x80-0x9F) is printable in cp1252 but control chars in latin1
        c1 = sum(1 for x in b if 0x80 <= x <= 0x9f)
        r['enc'] = 'cp1252' if c1 else 'latin1'
        r['c1_bytes'] = c1
        t = b.decode('cp1252', 'replace')
        r['nonascii_chars'] = Counter(ch for ch in t if ord(ch) > 127).most_common(8)
    return r


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('root', nargs='?', default=os.path.join(here, '..', 'corpus'))
    ap.add_argument('--json', help='write full per-file results here')
    args = ap.parse_args()
    root = os.path.abspath(args.root)

    rows = []
    for dp, _, fn in os.walk(root):
        for f in fn:
            if f != '.DS_Store':
                rows.append(scan_file(os.path.join(dp, f), root))
    rows.sort(key=lambda r: r['file'])

    if args.json:
        with open(args.json, 'w') as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)

    print('Encodings:', dict(Counter(r['enc'] for r in rows)))
    print('UTF-8 BOM files:', sum(1 for r in rows if r['bom'] == 'utf8'))
    for r in rows:
        if r['bom'] and r['bom'] != 'utf8':
            print(f"  [{r['bom']} BOM] {r['file']}")
        if r['nul']:
            print(f"  [NUL x{r['nul']}] {r['file']}")

    print('\n--- non-UTF-8 files ---')
    for r in rows:
        if r['enc'] in ('cp1252', 'latin1'):
            print(f"[{r['enc']}] {r['file']} c1={r['c1_bytes']} top={r['nonascii_chars'][:6]}")

    bad = [r for r in rows if r.get('mojibake') or r.get('fffd')]
    print('\n--- damaged UTF-8 files ---')
    for r in bad:
        print(f"[BAD] {r['file']} mojibake={r['mojibake']} fffd={r['fffd']} top={r['mojibake_top']}")

    print('\n--- clean UTF-8 files (eyeball top chars for wrong-codepage damage) ---')
    for r in rows:
        if r['enc'] == 'utf-8' and r not in bad:
            print(f"{r['file']} n={r['nonascii_bytes']} top={r['nonascii_chars'][:6]}")

    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
