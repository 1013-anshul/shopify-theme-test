#!/usr/bin/env python3
"""Fail if any shipping or delivery copy disagrees with the shipping policy.

The facts, from /policies/shipping-policy:
  - Shipping is free on every order (no threshold, no "calculated at checkout").
  - Orders ship within 1–2 business days.
  - Delivery takes 4–7 days.

Usage:
  python3 scripts/check-shipping-copy.py          # scan the theme files in this repo
  python3 scripts/check-shipping-copy.py --live   # scan the pages customers see on vuraskincare.in

If the policy itself changes, update RULES and ALLOWED_DAY_RANGES below in the same commit as the copy.
"""
import html
import re
import sys
import urllib.request
from pathlib import Path

SITE = 'https://vuraskincare.in'
ALLOWED_DAY_RANGES = {(1, 2), (4, 7)}

# (reason, pattern) pairs, matched case-insensitively against plain text with tags stripped.
RULES = [
    ('Shipping is free, so it is never "calculated at checkout"',
     r'(shipping|delivery)[^."]{0,40}calculated at checkout'),
    ('Shipping is free on every order, with no charge or minimum',
     r'(shipping|delivery) (charges?|fees?|costs?) (of |is |are )?(rs\.?|₹)\s*\d'
     r'|(rs\.?|₹)\s*\d+\s*(shipping|delivery)'
     r'|free (shipping|delivery) (on orders )?(above|over|on orders over)'),
    ('Orders ship in 1–2 business days, not 24 hours or same/next day',
     r'(dispatch|ship|process|pack|sent out|send out)\w*[^.]{0,40}\b(24|twenty[- ]four)\s*(hours|hrs|hr|h)\b'
     r'|\b(24|twenty[- ]four)[- ]?(hours?|hrs|hr|h)\s+(dispatch|shipping)'
     r'|(same|next)[- ]day (dispatch|shipping|delivery)'),
]
DAY_RANGE = re.compile(r'\b(\d{1,2})\s*(?:–|—|-|to)\s*(\d{1,2})\s*(?:business\s+|working\s+)?days?\b', re.I)

THEME_GLOBS = [
    'sections/*.liquid', 'snippets/*.liquid', 'templates/**/*.json', 'templates/**/*.liquid', 'layout/*.liquid',
    'locales/en.default.json', 'config/settings_data.json', 'assets/vura*.js', 'assets/cart*.js',
]


def plain(text):
    text = re.sub(r'<(script|style)\b.*?</\1>', ' ', text, flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text).replace('\\"', '"')
    return re.sub(r'\s+', ' ', text)


def problems(text):
    found = []
    for reason, pattern in RULES:
        for m in re.finditer(pattern, text, re.I):
            found.append((reason, m.start(), m.end()))
    for m in DAY_RANGE.finditer(text):
        if (int(m.group(1)), int(m.group(2))) not in ALLOWED_DAY_RANGES:
            found.append(('Only 1–2 days (ship) and 4–7 days (delivery) are allowed', m.start(), m.end()))
    return found


def report(where, text, found):
    for reason, start, end in found:
        snippet = text[max(0, start - 60):end + 40].strip()
        print(f'{where}\n  {reason}\n  …{snippet}…\n')


def scan_files(root):
    bad = 0
    for pattern in THEME_GLOBS:
        for path in sorted(root.glob(pattern)):
            raw = path.read_text(encoding='utf-8', errors='replace')
            for lineno, line in enumerate(raw.splitlines(), 1):
                text = plain(line)
                found = problems(text)
                report(f'{path.relative_to(root)}:{lineno}', text, found)
                bad += len(found)
    return bad


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'vura-shipping-copy-check'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', errors='replace')


def live_urls():
    urls = [f'{SITE}/', f'{SITE}/cart', f'{SITE}/collections/all']
    index = fetch(f'{SITE}/sitemap.xml')
    for sub in re.findall(r'<loc>([^<]+)</loc>', index):  # products, pages, blog posts, agents.md
        urls += re.findall(r'<loc>([^<]+)</loc>', fetch(html.unescape(sub)))
    urls.append(f'{SITE}/pages/fitkari')  # ad landing page, not in the sitemap
    return list(dict.fromkeys(u for u in urls if '/policies/' not in u))


def scan_live():
    bad = 0
    urls = live_urls()
    for url in urls:
        try:
            text = plain(fetch(url))
        except Exception as e:  # a page that fails to load is reported, not silently skipped
            print(f'{url}\n  could not load: {e}\n')
            bad += 1
            continue
        found = problems(text)
        report(url, text, found)
        bad += len(found)
    print(f'Checked {len(urls)} live pages.')
    return bad


if __name__ == '__main__':
    bad = scan_live() if '--live' in sys.argv else scan_files(Path(__file__).resolve().parent.parent)
    if bad:
        print(f'{bad} shipping copy problem(s). Fix them to match /policies/shipping-policy.')
        sys.exit(1)
    print('Shipping copy matches the policy.')
