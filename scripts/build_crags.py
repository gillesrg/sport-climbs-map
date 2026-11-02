"""Group parsed pages into crags (crags.json) and merge coordinates from coords.json.

Usage: python3 build_crags.py <pages.json> <coords.json> <out crags.json>
"""
import json, sys
from parse_site import GRADE_ORDER

REGIONS = {"north-wales": "North Wales", "peak": "Peak District",
           "south-wales": "South Wales", "yorkshire": "Yorkshire"}
# Pages that group crags rather than being a crag themselves.
AREAS = {
    "/north-wales/border-region/", "/north-wales/border-region/clwyd-limestone/",
    "/north-wales/north-coast/", "/peak/buxton/", "/peak/cheedale/", "/peak/dovedale/",
    "/peak/matlock/", "/peak/millers-dale/", "/peak/stoney/", "/peak/water-cum-jolly/",
    "/south-wales/south-east-limestone/", "/south-wales/south-east-sandstone/",
    "/south-wales/the-gower/", "/yorkshire/",
}
EXTRA_CRAGS = {"/south-wales/ban-y-gor/", "/yorkshire/kilnsey/"}
SKIP = {"/peak/cheedale/cheedale-approaches/"}


def grade_key(g):
    return GRADE_ORDER.index(g) if g in GRADE_ORDER else -1


def parent(p):
    return p.rstrip("/").rsplit("/", 1)[0] + "/"


def main(pages_path, coords_path, out):
    pages = json.load(open(pages_path))
    try:
        coords = json.load(open(coords_path))
    except FileNotFoundError:
        coords = {}
    crag_paths = sorted(p for p in pages if p not in SKIP and p not in AREAS and
                        (parent(p) in AREAS or p in EXTRA_CRAGS))
    crags = []
    for cp in crag_paths:
        pg = pages[cp]
        subs = sorted(p for p in pages if p.startswith(cp) and p != cp)
        routes = pg["routes"] + [r for s in subs for r in pages[s]["routes"]]
        graded = sorted((r["grade"] for r in routes if grade_key(r["grade"]) >= 0), key=grade_key)
        area_path = parent(cp)
        area = pages.get(area_path, {}).get("title") if area_path in AREAS else None
        sectors = [{"name": pages[s]["title"], "url": s, "routes": len(pages[s]["routes"])}
                   for s in subs]
        c = coords.get(cp, {})
        crags.append({
            "id": cp, "name": pg["title"], "aka": pg.get("subtitle", ""), "region": REGIONS[cp.split("/")[1]],
            "area": area or REGIONS[cp.split("/")[1]], "url": cp,
            "routes": len(graded), "minGrade": graded[0] if graded else None,
            "maxGrade": graded[-1] if graded else None,
            "stars": sum(1 for r in routes if r["stars"]),
            "grades": graded, "sectors": sectors,
            "lat": c.get("lat"), "lng": c.get("lng"), "confidence": c.get("confidence"),
            "parking": c.get("parking"), "ukc": c.get("ukc"),
        })
    json.dump(crags, open(out, "w"), separators=(",", ":"), ensure_ascii=False)
    missing = [c["id"] for c in crags if c["lat"] is None]
    print(len(crags), "crags,", sum(c["routes"] for c in crags), "sport routes,",
          len(missing), "without coords")


if __name__ == "__main__":
    main(*sys.argv[1:4])
