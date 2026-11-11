#!/usr/bin/env python3
"""Block false aluminium claims in Vura copy.

Fitkari (potassium alum) CONTAINS aluminium, so Vura must never be called
"aluminium-free", "no aluminium salts", "free of aluminium" and so on. The true
claim is "no aluminium chlorohydrate". Decided Nov 11 2026 (memory note
vura-aluminium-claim-nov-2026).

Rules, per sentence:
  1. ALWAYS_BAD patterns fail ("no aluminium salts", "zero aluminium",
     "too big to absorb", ...). "no aluminium chlorohydrate" is fine.
  2. Any sentence that says "aluminium-free" / "aluminum free" fails unless it
     is one of the hand-reviewed sentences in ALLOWED (they explain the term, or
     say plainly that fitkari is NOT aluminium-free). A new sentence needs a
     human review before it is added to ALLOWED.

Usage:
  python3 check_claims.py FILE...      check markdown / html / liquid / json / tsx files
  python3 check_claims.py --live       check every page in the live sitemap
  import check_claims; check_claims.problems(text) -> list of bad sentences

Exit code 1 when anything fails. The same file lives in the theme repo as
scripts/check-claims.py; keep the two copies identical.
"""
import html
import re
import subprocess
import sys
import time

AL = r"alumin(?:i)?um"

ALWAYS_BAD = [
    rf"\bno {AL}(?![- ]chlorohydrate)\b",                 # "no aluminium", "No aluminium salts"
    rf"\b{AL}[- ]salts?[- ]free\b",                       # "aluminium-salt free"
    rf"\bfree (?:of|from) {AL}(?![- ]chlorohydrate)",     # "free from aluminium"
    rf"\b(?:zero|0 ?%) {AL}",                             # "zero aluminium", "0% aluminium"
    rf"\b(?:contains?|has|have) no {AL}(?![- ]chlorohydrate)",
    rf"\b(?:does not|do not|doesn't|don't|dont|doesnt) (?:contain|have) (?:any )?{AL}(?![- ]chlorohydrate)",
    rf"\bwithout {AL}(?![- ]chlorohydrate)",              # "without aluminium salts"
    r"\btoo (?:big|large) to (?:be )?absorb",             # the alum-molecule myth
    r"\bmolecules? (?:is|are) too (?:big|large)",
]

FREE = re.compile(rf"\b{AL}[- ]?free\b", re.I)

# Hand-reviewed sentences that mention "aluminium-free" honestly. Add to this
# list only after reading the sentence in context and confirming it does not
# say Vura or fitkari is aluminium-free.
ALLOWED = [
    # how-to-choose-aluminium-free-deodorant-india (post 11): explains the term, then says fitkari isn't strictly free
    "How to choose an aluminium-free deodorant in India: a 2026 guide",
    "Aluminium-Free Deodorant in India: How to Choose (2026)",
    "What aluminium-free really means, the ingredients worth checking, which format suits Indian weather, and a simple checklist before you buy.",
    "What aluminium-free really means, which ingredients to look for and avoid, roll-on vs spray vs stone, and how to compare price per ml before you buy.",
    "Short answer: an aluminium-free deodorant controls smell without blocking sweat.",
    'First, what "aluminium-free" means',
    "An aluminium-free deodorant leaves those out.",
    "So, strictly, these products are not aluminium-free.",
    'A good brand will say that plainly, which is why we say "no aluminium chlorohydrate" instead of "aluminium-free".',
    "What an aluminium-free deodorant will not do",
    "Do aluminium-free deodorants work in Indian summers?",
    "Is fitkari aluminium-free?",
    # how-to-read-a-deodorant-label (post 09)
    "Aluminium-free, alcohol-free, fragrance-free: how to read a deodorant label",
    "Aluminium-Free Deodorant? How to Read the Label",
    "What aluminium-free, alcohol-free and fragrance-free really mean on a deodorant, which ingredient names to look for, and which ones are fine.",
    'What "aluminium-free" really means',
    'So when an alum-based deodorant says "aluminium free", what it really means is no sweat-blocking aluminium salts.',
    "That is why we do not call ours aluminium-free.",
    "Is aluminium-free deodorant better?",
    "Is potassium alum aluminium-free?",
    # mineral-salt-deodorant-spray (post 06) and potassium-alum-vs-aluminium-chlorohydrate
    "Is a mineral salt deodorant aluminium-free?",
    "Is potassium alum deodorant aluminium-free?",
    # rules that forbid the claim
    'Do not add "all day", "stops sweat" or "aluminium-free".',          # theme snippets/vura-gallery-note.liquid
    '"all day", "stops sweat" or "aluminium-free".',                       # same comment, wrapped onto its own line
    'Never claim it "lasts all day" or call it "aluminium-free".',        # vura-ig-studio playbook
]


def _norm(s):
    s = s.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", s).strip().lower()


def _key(s):
    """Comparison key: no quotes, no edge punctuation, single spaces, lower case."""
    return re.sub(r"\s+", " ", re.sub(r"[\"']", "", _norm(s))).strip(" .?!:")


def _pieces(s):
    return [p for p in re.findall(r"[^.?!]*[.?!]?", s) if len(p.strip()) > 3]


ALLOWED_KEYS = set()
for _a in ALLOWED:
    ALLOWED_KEYS.add(_key(_a))
    for _p in _pieces(_a):  # titles get split at '?' or '.', so allow each reviewed piece too
        ALLOWED_KEYS.add(_key(_p))

FRONT_MATTER_COPY = ("title", "seo_title", "meta_description", "summary")


def _copy_only(text):
    """For markdown posts keep only the front-matter fields that become page copy
    (title, SEO title, meta description, summary) plus the body. Tags, handles
    and target-search lists are not claims."""
    if not text.startswith("---"):
        return text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return text
    keep = []
    for line in parts[1].splitlines():
        m = re.match(r"(\w+):\s*(.*)", line)
        if m and m.group(1) in FRONT_MATTER_COPY:
            keep.append(m.group(2).strip().strip('"') + ".")
    return "\n".join(keep) + "\n" + parts[2]


def _plain(text):
    """Strip HTML, Liquid, JSON escapes and markdown down to readable lines."""
    t = re.sub(r"<script(?![^>]*ld\+json).*?</script>|<style.*?</style>", " ", text, flags=re.S | re.I)
    t = t.replace("\\n", "\n").replace('\\"', '"')
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</(p|li|h[1-6]|td|th|div|summary|title)>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"\*\*|__", "", t)
    t = re.sub(r"^\s*(#+|[-*]|\d+\.)\s+", "", t, flags=re.M)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    return t


def sentences(text):
    out = []
    for line in _plain(text).split("\n"):
        for s in _pieces(line):
            s = s.strip(" \t|·•")
            if len(s) > 3:
                out.append(s)
    return out


def problems(text):
    bad = []
    for s in sentences(text):
        n = _norm(s)
        if (FREE.search(n) or any(re.search(p, n) for p in ALWAYS_BAD)) and _key(s) not in ALLOWED_KEYS:
            bad.append(s)
    return bad


def check_files(paths):
    failed = 0
    for p in paths:
        try:
            text = _copy_only(open(p, encoding="utf-8", errors="ignore").read())
        except OSError as e:
            print(f"cannot read {p}: {e}")
            failed += 1
            continue
        for s in problems(text):
            failed += 1
            print(f"{p}: {s}")
    return failed


def _get(url):
    ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    code, body = "000", ""
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "-A", ua, "-w", "\n%{http_code}", url], capture_output=True, text=True).stdout
        body, code = r.rsplit("\n", 1)
        if code != "429":
            break
        time.sleep(8)
    return code, body


def check_live(base="https://vuraskincare.in"):
    _, idx = _get(base + "/sitemap.xml")
    urls = []
    for sm in re.findall(r"<loc>([^<]+)", idx):
        if "agentic" in sm:
            continue
        _, x = _get(html.unescape(sm))
        urls += [html.unescape(u) for u in re.findall(r"<loc>([^<]+)", x)]
        time.sleep(1)
    urls.append(base + "/pages/fitkari")
    failed = 0
    for u in urls:
        code, body = _get(u + ("&" if "?" in u else "?") + f"cb={int(time.time())}")
        time.sleep(1.2)
        if code != "200":
            print(f"{u}: HTTP {code}")
            failed += 1
            continue
        for s in problems(body):
            failed += 1
            print(f"{u}: {s}")
    print(f"checked {len(urls)} live pages")
    return failed


if __name__ == "__main__":
    args = sys.argv[1:]
    n = check_live() if args == ["--live"] else check_files(args)
    if n:
        print(f"\n{n} aluminium claim(s) found. Fitkari contains aluminium: say 'no aluminium chlorohydrate', never 'aluminium-free'.")
        sys.exit(1)
    print("No false aluminium claims.")
