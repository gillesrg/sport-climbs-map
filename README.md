# Sport Climbs Map

A mobile web app that shows every crag on [sportclimbs.uk](https://www.sportclimbs.uk/) on an interactive map.
Tap a crag for a summary (route count, grade spread, sectors) with links to the full topo pages on sportclimbs.uk
and directions to the parking.

## Using it on an iPhone

Open the site in Safari, tap **Share → Add to Home Screen**. It then opens full screen like an app.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The app (Leaflet map, no build step) |
| `data/crags.json` | Crag list with coordinates, loaded by the app |
| `data/coords.json` | Hand-checkable crag coordinates (`lat`, `lng`, `parking`, `confidence`, `ukc` link, `source`) |
| `data/pages.json` | Every sportclimbs.uk page parsed into title / routes / grades |
| `scripts/parse_site.py` | Parses downloaded sportclimbs.uk pages into `pages.json` |
| `scripts/build_crags.py` | Groups pages into crags and merges `coords.json` → `crags.json` |
| `scripts/make_icons.py` | Draws the home-screen icons |

## Fixing a crag's position

Edit its entry in `data/coords.json`, then rebuild:

```bash
cd scripts && python3 build_crags.py ../data/pages.json ../data/coords.json ../data/crags.json
```

## Refreshing the crag data

When sportclimbs.uk adds crags, download the pages listed in its `sitemap.xml` into a folder, then:

```bash
cd scripts && python3 parse_site.py <pages folder> ../data/pages.json
python3 build_crags.py ../data/pages.json ../data/coords.json ../data/crags.json
```

New crags without coordinates are listed by `build_crags.py` and won't appear on the map until added to `coords.json`.

Crag locations come from UKClimbing's public crag pages. Route content stays on sportclimbs.uk; the app only links to it.
