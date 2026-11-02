"""Parse downloaded sportclimbs.uk pages into a page tree (pages.json).

Usage: python3 parse_site.py <pages_dir> <out.json>
Pages are named by URL path with '/' replaced by '__'.
"""
import html, json, os, re, sys

BASE = "https://www.sportclimbs.uk"
ROUTE_RE = re.compile(r"<strong>\s*(\d+[a-z]?)\.\s*(.*?)\((\d[abc]?\+?|[3-5][+-]?|E\d[^)]*|HVS|VS|S)\)(.*?)</strong>", re.S)
GRADE_ORDER = ["3", "4", "4+", "5", "5+", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+",
               "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b"]


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def parse(path):
    h = open(path, encoding="utf-8").read()
    h1 = re.search(r"<h1>(.*?)</h1>", h, re.S)
    title, _, sub = (h1.group(1) if h1 else "").partition("<br>")
    title, sub = text(title), text(sub)
    crumbs = re.findall(r'<ul class=breadcrumbs>(.*?)</ul>', h, re.S)
    crumbs = [(u.replace(BASE, ""), text(t)) for u, t in
              re.findall(r'<a href=([^ >]+)>(.*?)</a>', crumbs[0])] if crumbs else []
    body = h.split('<section class="content', 1)[-1]
    routes = []
    for num, name, grade, rest in ROUTE_RE.findall(body):
        routes.append({"name": text(name), "grade": grade, "stars": rest.count("★")})
    img = re.search(r'<p class=topo><img src=([^ >]+)', body)
    para = re.search(r"<p>(.*?)</p>", body, re.S)
    return {"title": title, "subtitle": sub, "crumbs": crumbs, "routes": routes,
            "topo": img.group(1) if img else None,
            "intro": text(para.group(1))[:400] if para else ""}


def main(src, out):
    pages = {}
    for f in sorted(os.listdir(src)):
        if not f.endswith(".html"):
            continue
        p = "/" if f == "_home.html" else "/" + f[:-5].replace("__", "/") + "/"
        pages[p] = parse(os.path.join(src, f))
    json.dump(pages, open(out, "w"), indent=1, ensure_ascii=False)
    print(len(pages), "pages,", sum(len(v["routes"]) for v in pages.values()), "routes")


if __name__ == "__main__":
    main(*sys.argv[1:3])
