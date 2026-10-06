# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A static site published via **GitHub Pages** for the Diócesis de Getafe (a Spanish Catholic diocese). There is no build system, package manager, or server — every page is a self-contained `.html` file with inline `<style>`/`<script>`. There are no automated tests.

Root `index.html` is a placeholder landing page. All real content lives under `poblaciondiocesana/`, a mini-site presenting INE (Instituto Nacional de Estadística) demographic data for the diocese's municipalities and parishes.

## Development workflow

There is no build/lint/test tooling. The only command in the repo is:

```bash
cd poblaciondiocesana && node generar_html.js
```

This regenerates most of the `poblaciondiocesana/` pages from source data (see below). Changes to the generated pages must go through editing `generar_html.js` and re-running it — do not hand-edit the generated HTML files directly, as the next regeneration will overwrite hand edits.

To preview, just open the `.html` files in a browser (or serve the folder statically); there's no dev server.

## `generar_html.js`: the site generator

`poblaciondiocesana/generar_html.js` is a Node script (no dependencies beyond `fs`/`path`) that generates:

- `poblacion-2025.html` — population totals per municipality, grouped by arciprestazgo (deanery), with a client-side filter dropdown.
- `grupos-edad.html` — five-year age-group breakdown, with tabbed panels (totals vs. male/female split).
- `indicadores.html` — derived demographic indicators (aging index, dependency ratio, % under-15/over-65) with color-coded badges.
- `piramide-{slug}.html` — one population-pyramid page per municipality that has full male/female age data (`slugMunicipio()` produces the filename slug, e.g. `piramide-alcorcon.html`).
- It also patches `index.html` in place to insert/keep the shared nav bar (via string search/replace on markers like `nav-pages` and `</header>`), rather than regenerating it fully.

**Important — data source lives outside the repo.** The script reads its source JSON from:

```js
const JSON_PATH = path.join(__dirname, '../../.claude/projects/OrgTer/datos_ine_municipios.json');
```

i.e. `~/.claude/projects/OrgTer/datos_ine_municipios.json` relative to a checkout at `~/<repo>/poblaciondiocesana/`. This file is **not part of the repository**. To run the generator you need that JSON present at that path (containing per-municipality population data: `arciprestazgo`, `poblacion.total_2025`, `poblacion.total`/`hombres`/`mujeres` keyed by five-year age group, and `poblacion.anio_quinquenales`). Without it, `generar_html.js` will fail to read the file.

Other structures to know before editing the script:
- `PARROQUIAS` — hardcoded map of municipality name → number of parishes, used to compute "habitantes/parroquia".
- `ORDEN_ARC` — the fixed display order of the 13 arciprestazgos (deaneries); pages iterate this array to group municipalities.
- `GRUPOS` — the fixed list of five-year age-group labels (`'0-4'` … `'100+'`) used as table columns and pyramid rows.
- Torrejón de Velasco is deliberately deduplicated (it's listed under two arciprestazgos in the source data but counted once).
- `CSS_COMUN` and `pagina({...})` are the shared stylesheet and HTML shell used by every generated page (nav bar, header, footer, "resumen" stat strip). Change these to affect all generated pages at once, not per-page.

## Pages generar_html.js does NOT manage

These exist in `poblaciondiocesana/` but are maintained by hand, each with its own duplicated copy of the same burgundy/gold ("borgoña"/"dorado") design system inlined in `<style>`:

- `index.html` — landing page for the mini-site; only its nav bar is touched by the script.
- `prevision.html` — demographic projections page.
- `contadordepoblaciondiocesana.html` — a standalone visit-counter widget (not linked from the site nav; meant to be embedded elsewhere, e.g. via `<iframe>`). It fetches a count via JSONP from a Google Apps Script endpoint (`SCRIPT_URL`) and renders it as a digital-counter display.

When editing shared visual style, remember it's duplicated by hand across `index.html`, `prevision.html`, and inside `CSS_COMUN` in `generar_html.js` — there's no shared stylesheet file, so a palette or layout change needs to be applied in each place separately.

## Conventions

- All content and UI copy is in **Spanish**.
- Numbers are formatted Spanish-locale style: `toLocaleString('es-ES')` for integers, comma as decimal separator for percentages/decimals (see `fmt`/`fmtD` helpers in `generar_html.js`).
- Commit messages in this repo's history are predominantly the auto-generated `"Actualización automática"` — follow that convention for routine data/content refreshes; use a descriptive message for structural changes.
