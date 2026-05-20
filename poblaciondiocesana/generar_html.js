'use strict';
// Genera las páginas HTML del sitio web de población diocesana.
// Ejecutar desde la carpeta poblaciondiocesana/: node generar_html.js

const fs   = require('fs');
const path = require('path');

// ─── Datos fuente ─────────────────────────────────────────────────────────────
const JSON_PATH = path.join(
  __dirname,
  '../../.claude/projects/OrgTer/datos_ine_municipios.json'
);
const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const PARROQUIAS = {
  'Alcorcón':12,'Aranjuez':5,'Belmonte de Tajo':1,'Chinchón':1,
  'Colmenar de Oreja':1,'Valdelaguna':1,'Villaconejos':1,
  'Fuenlabrada':11,'Getafe':14,'Arroyomolinos':1,'Batres':1,
  'Casarrubuelos':1,'Cubas de la Sagra':1,'Griñón':1,
  'Humanes de Madrid':2,'Moraleja de Enmedio':1,'Serranillos del Valle':1,
  'Torrejón de Velasco':1,'Leganés':16,'Móstoles':11,
  'Aldea del Fresno':1,'El Álamo':1,'Navalcarnero':1,
  'Sevilla la Nueva':1,'Villa del Prado':1,'Villamanta':1,
  'Villamantilla':1,'Villanueva de Perales':1,'Parla':6,
  'Torrejón de la Calzada':1,'San Martín de Valdeiglesias':1,
  'Cadalso de los Vidrios':1,'Cenicientos':1,'Chapinería':1,
  'Colmenar del Arroyo':1,'Navas del Rey':1,'Pelayos de la Presa':1,
  'Rozas de Puerto Real':1,'Valdemoro':4,'Ciempozuelos':1,
  'Pinto':3,'San Martín de la Vega':1,'Titulcia':1,
  'Villaviciosa de Odón':2,'Boadilla del Monte':3,'Brunete':1,
  'Quijorna':1,'Villanueva de la Cañada':3,
};

const GRUPOS = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39',
                '40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79',
                '80-84','85-89','90-94','95-99','100+'];

const ORDEN_ARC = [
  'Alcorcón','Aranjuez','Chinchón','Fuenlabrada','Getafe','Griñón',
  'Leganés','Móstoles','Navalcarnero','Parla',
  'San Martín de Valdeiglesias','Valdemoro','Villaviciosa de Odón'
];

// Lista de municipios deduplicada (Torrejón de Velasco una sola vez, en Griñón)
const municipios = raw.municipios.filter(m =>
  !(m.nombre === 'Torrejón de Velasco' && m.arciprestazgo === 'Parla')
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = n => n == null ? '—' : Number(n).toLocaleString('es-ES');
const fmtD = (n, dec=1) => n == null ? '—' : Number(n).toFixed(dec).replace('.', ',');

function slugMunicipio(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function indicadores(m) {
  const t = m.poblacion.total;
  if (!t) return null;
  const tot  = t['todas_edades'];
  if (!tot)  return null;
  const m15  = (t['0-4']||0)+(t['5-9']||0)+(t['10-14']||0);
  const m65  = ['65-69','70-74','75-79','80-84','85-89','90-94','95-99','100+']
                 .reduce((s,k)=>s+(t[k]||0),0);
  const act  = tot-m15-m65;
  return {
    menores15: m15, mayores65: m65, activos: act,
    pct15:  m15/tot*100, pct65: m65/tot*100, pctAct: act/tot*100,
    iEnv:   m65/(m15||1)*100,
    tDep:   (m15+m65)/(act||1)*100,
  };
}

// ─── CSS compartido ───────────────────────────────────────────────────────────
const CSS_COMUN = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --borgoña:        #6B1A1A;
    --borgoña-oscuro: #4E1212;
    --dorado:         #C4A24B;
    --dorado-claro:   #EAD898;
    --fondo:          #F7F3EE;
    --blanco:         #FFFFFF;
    --gris-claro:     #F0EBE3;
    --gris-borde:     #D6CCBf;
    --texto:          #2C2118;
    --texto-suave:    #6B5B4E;
  }
  body { font-family: 'Inter', sans-serif; background: var(--fondo); color: var(--texto); font-size: 15px; line-height: 1.6; }

  header {
    background: linear-gradient(135deg, var(--borgoña-oscuro) 0%, var(--borgoña) 100%);
    color: var(--blanco); padding: 2rem 2rem 1.6rem; text-align: center;
    border-bottom: 4px solid var(--dorado);
  }
  header .escudo { font-size: 2rem; margin-bottom: 0.3rem; opacity: 0.9; }
  header h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; letter-spacing: 0.02em; margin-bottom: 0.25rem; }
  header p.subtitulo { font-size: 0.85rem; opacity: 0.8; letter-spacing: 0.08em; text-transform: uppercase; }

  /* ── NAV ENTRE PÁGINAS ── */
  .nav-pages {
    display: flex; justify-content: center; flex-wrap: wrap; gap: 0.25rem;
    padding: 0.7rem 2rem; background: var(--borgoña-oscuro);
  }
  .nav-link {
    color: var(--dorado-claro); text-decoration: none; font-size: 0.82rem;
    font-weight: 600; padding: 0.35rem 1.1rem; border-radius: 4px;
    transition: all 0.18s; letter-spacing: 0.04em; border: 1px solid transparent;
  }
  .nav-link:hover { background: rgba(196,162,75,0.2); border-color: var(--dorado); }
  .nav-link.activo { background: var(--dorado); color: var(--borgoña-oscuro); }

  /* ── RESUMEN ── */
  .resumen {
    display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap;
    padding: 1.5rem 2rem; background: var(--blanco); border-bottom: 1px solid var(--gris-borde);
  }
  .stat { text-align: center; min-width: 110px; }
  .stat .num { font-family: 'Playfair Display', serif; font-size: 1.9rem; color: var(--borgoña); line-height: 1; }
  .stat .etiq { font-size: 0.72rem; color: var(--texto-suave); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.2rem; }
  .sep { width: 1px; background: var(--gris-borde); align-self: stretch; }

  /* ── FILTRO ── */
  .filtro-bar {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 1.2rem 0; margin-bottom: 1rem;
  }
  .filtro-bar label { font-size: 0.85rem; font-weight: 600; color: var(--texto-suave); }
  .filtro-bar select {
    padding: 0.4rem 0.8rem; border: 1px solid var(--gris-borde); border-radius: 4px;
    font-family: 'Inter', sans-serif; font-size: 0.85rem; background: var(--blanco);
    color: var(--texto); cursor: pointer;
  }
  .filtro-bar select:focus { outline: 2px solid var(--dorado); }

  /* ── PESTAÑAS ── */
  .tabs { display: flex; padding: 1.5rem 0 0; }
  .tab-btn {
    padding: 0.6rem 1.6rem; border: 1px solid var(--gris-borde); background: var(--gris-claro);
    color: var(--texto-suave); font-family: 'Inter', sans-serif; font-size: 0.85rem;
    font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em;
  }
  .tab-btn:first-child { border-radius: 6px 0 0 0; }
  .tab-btn:last-child  { border-radius: 0 6px 0 0; border-left: none; }
  .tab-btn.activo { background: var(--blanco); color: var(--borgoña); border-bottom-color: var(--blanco); border-top: 2px solid var(--borgoña); }
  .tab-btn:hover:not(.activo) { background: var(--dorado-claro); }
  .panel { display: none; background: var(--blanco); border: 1px solid var(--gris-borde); border-top: none; border-radius: 0 0 8px 8px; padding: 1.5rem; }
  .panel.activo { display: block; }

  /* ── MAIN ── */
  main { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 3rem; }
  .seccion-titulo { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: var(--borgoña); margin: 1.5rem 0 0.3rem; }
  .seccion-desc { font-size: 0.83rem; color: var(--texto-suave); margin-bottom: 1.2rem; }

  /* ── TABLA ── */
  .tabla-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  thead th {
    background: var(--borgoña); color: var(--blanco); padding: 0.65rem 0.85rem;
    text-align: left; font-weight: 600; letter-spacing: 0.03em; white-space: nowrap; position: sticky; top: 0;
  }
  thead th.num { text-align: right; }
  thead th.cen { text-align: center; }
  tbody tr:nth-child(even) { background: var(--gris-claro); }
  tbody tr:hover { background: var(--dorado-claro); transition: background 0.15s; }
  tbody td { padding: 0.5rem 0.85rem; border-bottom: 1px solid var(--gris-borde); }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot tr { border-top: 2px solid var(--borgoña); }
  tfoot td { padding: 0.6rem 0.85rem; font-weight: 700; background: var(--gris-claro); }
  tfoot td.num { text-align: right; }

  /* Separador de arciprestazgo */
  tr.arc-sep td {
    background: var(--borgoña); color: var(--blanco); font-weight: 700;
    font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 0.35rem 0.85rem;
  }

  /* Ratio alto */
  tr.ratio-alto td.ratio { color: #9B1C1C; font-weight: 700; }

  /* Barra mini */
  .barra-wrap { display: flex; align-items: center; gap: 0.4rem; }
  .barra { height: 7px; background: var(--borgoña); border-radius: 3px; opacity: 0.65; min-width: 2px; }

  /* Indicadores */
  .ind-alto65 { background: #FDECEA !important; }
  .ind-bajo15 { background: #FDECEA !important; }
  .ind-ok65   { background: #EBF7E6 !important; }
  .ind-ok15   { background: #EBF7E6 !important; }
  .badge {
    display: inline-block; padding: 0.1rem 0.45rem; border-radius: 10px;
    font-size: 0.78rem; font-weight: 600;
  }
  .badge-rojo  { background: #FDECEA; color: #9B1C1C; }
  .badge-verde { background: #EBF7E6; color: #276221; }
  .badge-neutro{ background: var(--gris-claro); color: var(--texto-suave); }

  /* Año dato */
  .chip-anio {
    display: inline-block; font-size: 0.72rem; padding: 0.1rem 0.4rem;
    border-radius: 3px; font-weight: 600; margin-left: 4px; vertical-align: middle;
  }
  .chip-2022 { background: #E3F0FB; color: #1A5276; }
  .chip-2019 { background: #FEF9E7; color: #7D6608; }
  .chip-sd   { background: var(--gris-claro); color: var(--texto-suave); }

  /* ── NOTAS ── */
  .notas {
    margin-top: 1.4rem; padding: 0.9rem 1.1rem; background: var(--gris-claro);
    border-left: 3px solid var(--dorado); border-radius: 0 6px 6px 0;
    font-size: 0.8rem; color: var(--texto-suave);
  }
  .notas p { margin-bottom: 0.25rem; }
  .notas p:last-child { margin-bottom: 0; }

  /* ── PIE ── */
  footer {
    text-align: center; padding: 1.4rem 2rem; font-size: 0.76rem;
    color: var(--texto-suave); border-top: 1px solid var(--gris-borde); margin-top: 2rem;
  }
  footer a { color: var(--borgoña); text-decoration: none; }
  footer a:hover { text-decoration: underline; }

  @media (max-width: 600px) {
    header h1 { font-size: 1.35rem; }
    .stat .num { font-size: 1.5rem; }
    main { padding: 0 0.75rem 2rem; }
  }
`;

// ─── Plantilla de página ──────────────────────────────────────────────────────
function pagina({ title, navActivo, resumen, contenido, scripts = '' }) {
  const nav = [
    { href: 'index.html',          label: 'Inicio' },
    { href: 'poblacion-2025.html', label: 'Población 2025' },
    { href: 'grupos-edad.html',    label: 'Grupos de edad' },
    { href: 'indicadores.html',    label: 'Indicadores' },
  ].map(({ href, label }) =>
    `<a href="${href}" class="nav-link${navActivo === href ? ' activo' : ''}">${label}</a>`
  ).join('\n    ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} · Diócesis de Getafe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${CSS_COMUN}</style>
</head>
<body>

<header>
  <div class="escudo">✝</div>
  <h1>Población Diocesana</h1>
  <p class="subtitulo">Diócesis de Getafe &nbsp;·&nbsp; Plan de Organización Territorial</p>
</header>

<nav class="nav-pages">
  ${nav}
</nav>

${resumen}

<main>
${contenido}
</main>

<footer>
  <p>Diócesis de Getafe &nbsp;·&nbsp; Plan de Organización Territorial &nbsp;·&nbsp; Datos: Guía Diocesana enero 2026, INE</p>
  <p style="margin-top:0.3rem;"><a href="https://www.diocesisgetafe.es" target="_blank" rel="noopener">diocesisgetafe.es</a></p>
</footer>

${scripts}
</body>
</html>`;
}

const RESUMEN_COMUN = `
<div class="resumen">
  <div class="stat"><div class="num">13</div><div class="etiq">Arciprestazgos</div></div>
  <div class="sep"></div>
  <div class="stat"><div class="num">127</div><div class="etiq">Parroquias</div></div>
  <div class="sep"></div>
  <div class="stat"><div class="num">48</div><div class="etiq">Municipios</div></div>
  <div class="sep"></div>
  <div class="stat"><div class="num">1,71 M</div><div class="etiq">Habitantes (2025)</div></div>
  <div class="sep"></div>
  <div class="stat"><div class="num">13.473</div><div class="etiq">Hab. / parroquia</div></div>
</div>`;

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA 1: poblacion-2025.html
// ══════════════════════════════════════════════════════════════════════════════
function generarPoblacion2025() {
  const totPob = municipios.reduce((s,m)=>s+(m.poblacion.total_2025?.total||0),0);
  const totH   = municipios.reduce((s,m)=>s+(m.poblacion.total_2025?.hombres||0),0);
  const totM   = municipios.reduce((s,m)=>s+(m.poblacion.total_2025?.mujeres||0),0);
  const totPar = municipios.reduce((s,m)=>s+(PARROQUIAS[m.nombre]||0),0);

  let filas = '';
  let arcActual = '';
  for (const arc of ORDEN_ARC) {
    const lista = municipios.filter(m => m.arciprestazgo === arc);
    filas += `<tr class="arc-sep"><td colspan="8">${arc}</td></tr>\n`;
    for (const m of lista) {
      const p   = m.poblacion.total_2025;
      const par = PARROQUIAS[m.nombre] || 0;
      const hab = par > 0 && p ? Math.round(p.total/par) : null;
      const rat = p && p.total > 0 ? p.hombres/p.total*100 : null;
      const ratioAlto = hab && hab > 15000;
      const pct = totPob > 0 && p ? (p.total/totPob*100) : 0;
      const barW = Math.max(2, Math.round(pct * 3));
      filas += `<tr${ratioAlto ? ' class="ratio-alto"' : ''}>
        <td>${m.nombre}</td>
        <td class="num">${fmt(p?.total)}</td>
        <td class="num">${fmt(p?.hombres)}</td>
        <td class="num">${fmt(p?.mujeres)}</td>
        <td class="num">${rat != null ? fmtD(rat)+'%' : '—'}</td>
        <td class="num">${par || '—'}</td>
        <td class="num${ratioAlto?' ratio':''}">${fmt(hab)}</td>
        <td><div class="barra-wrap"><div class="barra" style="width:${barW}px"></div>${fmtD(pct)}%</div></td>
      </tr>\n`;
    }
  }

  const contenido = `
  <h2 class="seccion-titulo">Población por Municipio · 2025</h2>
  <p class="seccion-desc">Fuente: INE · Padrón Municipal / Censo Anual 2025 (datos definitivos, RD 1210/2024) · Parroquias: Guía Diocesana enero 2026</p>

  <div class="filtro-bar">
    <label for="sel-arc">Arciprestazgo:</label>
    <select id="sel-arc" onchange="filtrarArc(this.value)">
      <option value="">— Todos —</option>
      ${ORDEN_ARC.map(a=>`<option value="${a}">${a}</option>`).join('\n      ')}
    </select>
  </div>

  <div class="tabla-wrap">
    <table id="tabla-pob">
      <thead>
        <tr>
          <th>Municipio</th>
          <th class="num">Pob. total</th>
          <th class="num">Hombres</th>
          <th class="num">Mujeres</th>
          <th class="num">Ratio masc.</th>
          <th class="num">Parroquias</th>
          <th class="num">Hab./parroquia</th>
          <th>% diócesis</th>
        </tr>
      </thead>
      <tbody id="tbody-pob">
${filas}      </tbody>
      <tfoot>
        <tr>
          <td><strong>TOTAL DIÓCESIS</strong></td>
          <td class="num">${fmt(totPob)}</td>
          <td class="num">${fmt(totH)}</td>
          <td class="num">${fmt(totM)}</td>
          <td class="num">${fmtD(totH/totPob*100)}%</td>
          <td class="num">${totPar}</td>
          <td class="num">${fmt(Math.round(totPob/totPar))}</td>
          <td>100%</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="notas">
    <p>• <strong>Población:</strong> dato definitivo a 1 de enero de 2025 (INE, tabla 2881). Actualización: enero 2026.</p>
    <p>• <strong>Ratio de masculinidad:</strong> porcentaje de hombres sobre el total. Media diocesana: ${fmtD(totH/totPob*100)}%.</p>
    <p>• <strong style="color:#9B1C1C">Hab./parroquia en rojo</strong>: municipios con ratio superior a 15.000 hab./parroquia (posible infradotación pastoral).</p>
    <p>• Torrejón de Velasco aparece en los arciprestazgos de Griñón y Parla; se contabiliza una sola vez en los totales.</p>
  </div>`;

  const scripts = `<script>
function filtrarArc(arc) {
  const tbody = document.getElementById('tbody-pob');
  const filas = tbody.querySelectorAll('tr');
  filas.forEach(tr => {
    if (tr.classList.contains('arc-sep')) {
      tr.style.display = (!arc || tr.textContent.trim() === arc) ? '' : 'none';
    } else {
      if (!arc) { tr.style.display = ''; return; }
      // Busca el separador anterior
      let prev = tr.previousElementSibling;
      while (prev && !prev.classList.contains('arc-sep')) prev = prev.previousElementSibling;
      tr.style.display = (prev && prev.textContent.trim() === arc) ? '' : 'none';
    }
  });
}
</script>`;

  return pagina({
    title: 'Población 2025',
    navActivo: 'poblacion-2025.html',
    resumen: RESUMEN_COMUN,
    contenido,
    scripts,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA 2: grupos-edad.html
// ══════════════════════════════════════════════════════════════════════════════
function generarGruposEdad() {
  const munConQ  = municipios.filter(m => m.poblacion.total !== null);
  const munConHM = municipios.filter(m => m.poblacion.hombres !== null && m.poblacion.mujeres !== null);

  // ── Tab 1: Totales por grupos quinquenales ──
  let filasTotal = '';
  for (const arc of ORDEN_ARC) {
    const lista = munConQ.filter(m => m.arciprestazgo === arc);
    if (!lista.length) continue;
    filasTotal += `<tr class="arc-sep"><td colspan="${3 + GRUPOS.length}">Arciprestazgo de ${arc}</td></tr>\n`;
    for (const m of lista) {
      const t    = m.poblacion.total;
      const anio = m.poblacion.anio_quinquenales;
      const chipClass = anio === 2022 ? 'chip-2022' : anio === 2019 ? 'chip-2019' : 'chip-sd';
      const tot  = t['todas_edades'] || 0;
      let celdas = GRUPOS.map(g => {
        const v = t[g];
        return `<td class="num">${v != null ? fmt(v) : '—'}</td>`;
      }).join('');
      filasTotal += `<tr>
        <td><a href="piramide-${slugMunicipio(m.nombre)}.html" class="mun-link">${m.nombre}</a> <span class="chip-anio ${chipClass}">${anio || 's/d'}</span></td>
        <td class="num">${fmt(tot)}</td>
        ${celdas}
      </tr>\n`;
    }
  }

  const thsGrupos = GRUPOS.map(g=>`<th class="num">${g}</th>`).join('');

  // ── Tab 2: Desglose H/M ──
  let filasHM = '';
  for (const m of munConHM) {
    const h  = m.poblacion.hombres;
    const mj = m.poblacion.mujeres;
    const cH = GRUPOS.map(g=>`<td class="num hcol">${fmt(h[g])}</td>`).join('');
    const cM = GRUPOS.map(g=>`<td class="num mcol">${fmt(mj[g])}</td>`).join('');
    filasHM += `<tr>
      <td><a href="piramide-${slugMunicipio(m.nombre)}.html" class="mun-link">${m.nombre}</a></td>
      <td class="num hcol"><strong>${fmt(h['todas_edades'])}</strong></td>
      ${cH}
      <td class="num mcol"><strong>${fmt(mj['todas_edades'])}</strong></td>
      ${cM}
    </tr>\n`;
  }

  const contenido = `
  <h2 class="seccion-titulo">Distribución por Grupos de Edad</h2>
  <p class="seccion-desc">Fuente: INE · Estadística del Padrón Continuo (tabla 33842, 2022) y tabla PC-AXIS (2019)</p>
  <p class="aviso-piramide">&#9432; Pinche en el nombre de un municipio para ver su pirámide de población.</p>

  <div class="tabs">
    <button class="tab-btn activo" onclick="mostrarPanel('total',this)">Población total</button>
    <button class="tab-btn" onclick="mostrarPanel('hm',this)">Hombres / Mujeres</button>
  </div>

  <div id="panel-total" class="panel activo">
    <p class="seccion-desc" style="margin-bottom:0.8rem;">
      Grupos quinquenales (Total, ambos sexos).
      <span class="chip-anio chip-2022">2022</span> dato definitivo INE &nbsp;
      <span class="chip-anio chip-2019">2019</span> dato PC-AXIS (municipios pequeños)
    </p>
    <div class="tabla-wrap">
      <table>
        <thead>
          <tr>
            <th>Municipio</th>
            <th class="num">Total</th>
            ${thsGrupos}
          </tr>
        </thead>
        <tbody>
${filasTotal}        </tbody>
      </table>
    </div>
    <div class="notas">
      <p>• Grupos de edad quinquenales de 0-4 hasta 100+ años. Total = suma de todos los grupos.</p>
      <p>• Los totales por sexo de cada municipio (2025) están en la página <a href="poblacion-2025.html" style="color:var(--borgoña)">Población 2025</a>.</p>
    </div>
  </div>

  <div id="panel-hm" class="panel">
    <p class="seccion-desc" style="margin-bottom:0.8rem;">
      Desglose por sexo (dato 2022, INE tabla 33842).
    </p>
    <div class="tabla-wrap">
      <table>
        <thead>
          <tr>
            <th rowspan="2">Municipio</th>
            <th class="num hcol" colspan="${1+GRUPOS.length}" style="background:#1A3A6B">Hombres</th>
            <th class="num mcol" colspan="${1+GRUPOS.length}" style="background:#7B2512">Mujeres</th>
          </tr>
          <tr>
            <th class="num hcol" style="background:#2257A8">Total H</th>
            ${GRUPOS.map(g=>`<th class="num hcol" style="background:#2257A8;font-size:0.75rem">${g}</th>`).join('')}
            <th class="num mcol" style="background:#A0320A">Total M</th>
            ${GRUPOS.map(g=>`<th class="num mcol" style="background:#A0320A;font-size:0.75rem">${g}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
${filasHM}        </tbody>
      </table>
    </div>
    <div class="notas">
      <p>• Datos a 1 de enero de 2022 (último año disponible en INE tabla 33842). Fuente: INE / Anexos de Demografía Wikipedia ES.</p>
      <p>• Se muestran los municipios para los que se dispone del desglose completo por sexo y grupo de edad.</p>
    </div>
  </div>`;

  const scripts = `<style>
    .hcol { background: #EBF2FB; }
    .mcol { background: #FDECE8; }
    tr.arc-sep td { background: var(--borgoña); }
    .mun-link { color: var(--borgoña); text-decoration: none; }
    .mun-link:hover { text-decoration: underline; }
    .aviso-piramide {
      font-size: 0.85rem; color: var(--borgoña); font-style: italic;
      margin: 0.4rem 0 1rem; padding: 0.5rem 0.8rem;
      background: var(--gris-claro); border-left: 3px solid var(--dorado);
      border-radius: 0 4px 4px 0; display: inline-block;
    }
  </style>
  <script>
  function mostrarPanel(id, btn) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('panel-' + id).classList.add('activo');
    btn.classList.add('activo');
  }
  </script>`;

  return pagina({
    title: 'Grupos de edad',
    navActivo: 'grupos-edad.html',
    resumen: RESUMEN_COMUN,
    contenido,
    scripts,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA 3: indicadores.html
// ══════════════════════════════════════════════════════════════════════════════
function generarIndicadores() {
  const munConQ = municipios.filter(m => m.poblacion.total !== null);

  let filas = '';
  for (const arc of ORDEN_ARC) {
    const lista = munConQ.filter(m => m.arciprestazgo === arc);
    if (!lista.length) continue;
    filas += `<tr class="arc-sep"><td colspan="10">Arciprestazgo de ${arc}</td></tr>\n`;
    for (const m of lista) {
      const ind  = indicadores(m);
      if (!ind) continue;
      const anio = m.poblacion.anio_quinquenales;
      const chipClass = anio === 2022 ? 'chip-2022' : 'chip-2019';

      const badge15 = ind.pct15 < 10
        ? `<span class="badge badge-rojo">${fmtD(ind.pct15)}%</span>`
        : ind.pct15 > 15
        ? `<span class="badge badge-verde">${fmtD(ind.pct15)}%</span>`
        : `<span class="badge badge-neutro">${fmtD(ind.pct15)}%</span>`;

      const badge65 = ind.pct65 > 22
        ? `<span class="badge badge-rojo">${fmtD(ind.pct65)}%</span>`
        : ind.pct65 < 12
        ? `<span class="badge badge-verde">${fmtD(ind.pct65)}%</span>`
        : `<span class="badge badge-neutro">${fmtD(ind.pct65)}%</span>`;

      const iEnvBadge = ind.iEnv > 200
        ? `<span class="badge badge-rojo">${fmtD(ind.iEnv)}</span>`
        : ind.iEnv < 80
        ? `<span class="badge badge-verde">${fmtD(ind.iEnv)}</span>`
        : `<span class="badge badge-neutro">${fmtD(ind.iEnv)}</span>`;

      const barW15 = Math.round(ind.pct15 * 4);
      const barW65 = Math.round(ind.pct65 * 4);

      filas += `<tr>
        <td>${m.nombre} <span class="chip-anio ${chipClass}">${anio}</span></td>
        <td class="num">${fmt(ind.menores15)}</td>
        <td>${badge15} <div class="barra-wrap" style="margin-top:3px"><div class="barra" style="width:${barW15}px;background:#276221;opacity:0.5"></div></div></td>
        <td class="num">${fmt(ind.activos)}</td>
        <td class="num">${fmtD(ind.pctAct)}%</td>
        <td class="num">${fmt(ind.mayores65)}</td>
        <td>${badge65} <div class="barra-wrap" style="margin-top:3px"><div class="barra" style="width:${barW65}px;background:#9B1C1C;opacity:0.5"></div></div></td>
        <td class="num">${iEnvBadge}</td>
        <td class="num">${fmtD(ind.tDep)}</td>
      </tr>\n`;
    }
  }

  // Indicadores diocesanos agregados (solo municipios con dato quinquenal)
  const totM15 = munConQ.reduce((s,m)=>{ const i=indicadores(m); return s+(i?i.menores15:0); },0);
  const totM65 = munConQ.reduce((s,m)=>{ const i=indicadores(m); return s+(i?i.mayores65:0); },0);
  const totAct = munConQ.reduce((s,m)=>{ const i=indicadores(m); return s+(i?i.activos:0); },0);
  const totTot = totM15+totM65+totAct;

  const contenido = `
  <h2 class="seccion-titulo">Indicadores Demográficos</h2>
  <p class="seccion-desc">
    Calculados a partir de los grupos de edad del INE (tablas 33842 · 2022 y PC-AXIS · 2019).
    <span class="chip-anio chip-2022">2022</span> dato Padrón Continuo &nbsp;
    <span class="chip-anio chip-2019">2019</span> dato PC-AXIS
  </p>

  <div class="resumen" style="margin-bottom:1.5rem;border:1px solid var(--gris-borde);border-radius:8px;">
    <div class="stat">
      <div class="num">${fmtD(totM15/totTot*100)}%</div>
      <div class="etiq">Menores de 15 años</div>
    </div>
    <div class="sep"></div>
    <div class="stat">
      <div class="num">${fmtD(totAct/totTot*100)}%</div>
      <div class="etiq">Población 15-64 años</div>
    </div>
    <div class="sep"></div>
    <div class="stat">
      <div class="num">${fmtD(totM65/totTot*100)}%</div>
      <div class="etiq">Mayores de 65 años</div>
    </div>
    <div class="sep"></div>
    <div class="stat">
      <div class="num">${fmtD(totM65/(totM15||1)*100)}</div>
      <div class="etiq">Índice de envejecimiento</div>
    </div>
    <div class="sep"></div>
    <div class="stat">
      <div class="num">${fmtD((totM15+totM65)/(totAct||1)*100)}%</div>
      <div class="etiq">Tasa de dependencia</div>
    </div>
  </div>

  <div class="tabla-wrap">
    <table>
      <thead>
        <tr>
          <th>Municipio</th>
          <th class="num">Menores de 15</th>
          <th>% &lt; 15 años</th>
          <th class="num">Entre 15 y 64</th>
          <th class="num">% 15-64 años</th>
          <th class="num">Mayores de 65</th>
          <th>% ≥ 65 años</th>
          <th class="num">Índice envej.*</th>
          <th class="num">Tasa dep.**</th>
        </tr>
      </thead>
      <tbody>
${filas}      </tbody>
    </table>
  </div>

  <div class="notas">
    <p>• <strong>* Índice de envejecimiento</strong> = (población ≥ 65 / población &lt; 15) × 100. Valor > 100: más mayores que jóvenes. Valor > 200: muy envejecido.</p>
    <p>• <strong>** Tasa de dependencia</strong> = ((población &lt; 15 + población ≥ 65) / población 15-64) × 100.</p>
    <p>• <span class="badge badge-rojo">rojo</span> valor de atención pastoral &nbsp; <span class="badge badge-verde">verde</span> valor favorable &nbsp; <span class="badge badge-neutro">gris</span> valor intermedio.</p>
    <p>• Municipios sin dato quinquenal disponible no aparecen en esta tabla (consultar <a href="poblacion-2025.html" style="color:var(--borgoña)">Población 2025</a> para totales por sexo).</p>
    <p>• Dato de grupos de edad: 2022 (Padrón Continuo, tabla 33842) o 2019 (PC-AXIS) según disponibilidad. Los totales por sexo son siempre de 2025.</p>
  </div>`;

  return pagina({
    title: 'Indicadores',
    navActivo: 'indicadores.html',
    resumen: RESUMEN_COMUN,
    contenido,
    scripts: '',
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINAS DE PIRÁMIDE: piramide-{slug}.html
// ══════════════════════════════════════════════════════════════════════════════
function generarPiramide(m) {
  const h  = m.poblacion.hombres;
  const mj = m.poblacion.mujeres;
  const t  = m.poblacion.total;

  const totH = h['todas_edades'] || 0;
  const totM = mj['todas_edades'] || 0;

  let maxVal = 0;
  for (const g of GRUPOS) {
    maxVal = Math.max(maxVal, h[g] || 0, mj[g] || 0);
  }

  let filasGrafico = '';
  let filasDatos   = '';
  for (const g of [...GRUPOS].reverse()) {
    const vH  = h[g] || 0;
    const vM  = mj[g] || 0;
    const pctH = maxVal > 0 ? ((vH / maxVal) * 100).toFixed(1) : 0;
    const pctM = maxVal > 0 ? ((vM / maxVal) * 100).toFixed(1) : 0;
    const etH  = totH > 0 ? fmtD(vH / totH * 100) + '%' : '';
    const etM  = totM > 0 ? fmtD(vM / totM * 100) + '%' : '';

    filasGrafico += `
      <div class="pir-fila">
        <div class="pir-lado-h"><span class="pir-pct pir-pct-h">${etH}</span><div class="pir-bar pir-bar-h" style="width:${pctH}%" title="${fmt(vH)} hombres"></div></div>
        <div class="pir-label">${g}</div>
        <div class="pir-lado-m"><div class="pir-bar pir-bar-m" style="width:${pctM}%" title="${fmt(vM)} mujeres"></div><span class="pir-pct pir-pct-m">${etM}</span></div>
      </div>`;
  }
  for (const g of GRUPOS) {
    const vH = h[g] || 0;
    const vM = mj[g] || 0;
    const vT = t ? (t[g] || 0) : vH + vM;

    filasDatos += `      <tr>
        <td>${g}</td>
        <td class="num">${fmt(vH)}</td>
        <td class="num">${fmt(vM)}</td>
        <td class="num">${fmt(vT)}</td>
      </tr>\n`;
  }

  const anio      = m.poblacion.anio_quinquenales;
  const chipClass = anio === 2022 ? 'chip-2022' : anio === 2019 ? 'chip-2019' : 'chip-sd';
  const totT      = t ? (t['todas_edades'] || 0) : totH + totM;

  const cssExtra = `
  .btn-back {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.5rem 1.3rem; background: var(--borgoña); color: var(--blanco);
    border: none; border-radius: 6px; font-family: 'Inter', sans-serif;
    font-size: 0.9rem; font-weight: 600; cursor: pointer;
    text-decoration: none; transition: background 0.2s; margin: 1rem 0 0.5rem;
  }
  .btn-back:hover { background: var(--borgoña-oscuro); }
  .piramide-contenedor {
    background: var(--blanco); border: 1px solid var(--gris-borde);
    border-radius: 8px; padding: 1.5rem; margin: 1.2rem 0;
  }
  .pir-leyenda {
    display: grid; grid-template-columns: 1fr 52px 1fr;
    margin-bottom: 0.7rem; font-size: 0.85rem; font-weight: 600;
  }
  .pir-ley-h { color: #1A3A6B; text-align: right; padding-right: 6px; }
  .pir-ley-m { color: #7B2512; text-align: left;  padding-left:  6px; }
  .piramide { display: flex; flex-direction: column; gap: 3px; }
  .pir-fila { display: grid; grid-template-columns: 1fr 52px 1fr; align-items: center; min-height: 22px; }
  .pir-lado-h { display: flex; justify-content: flex-end; }
  .pir-lado-m { display: flex; justify-content: flex-start; }
  .pir-label  { text-align: center; font-size: 0.72rem; color: var(--texto-suave); padding: 0 3px; }
  .pir-bar    { height: 16px; min-width: 2px; }
  .pir-bar-h  { background: #2257A8; border-radius: 3px 0 0 3px; }
  .pir-bar-m  { background: #C0392B; border-radius: 0 3px 3px 0; }
  .pir-pct    { font-size: 0.67rem; color: var(--texto-suave); white-space: nowrap; min-width: 36px; }
  .pir-pct-h  { text-align: right; padding-right: 4px; }
  .pir-pct-m  { text-align: left;  padding-left:  4px; }`;

  const contenido = `
  <button class="btn-back" onclick="history.back()">&#8592; Volver</button>

  <h2 class="seccion-titulo">Pirámide de Población · ${m.nombre}</h2>
  <p class="seccion-desc">
    Grupos de edad quinquenales &nbsp;·&nbsp; Dato <span class="chip-anio ${chipClass}">${anio || 's/d'}</span>
    &nbsp;·&nbsp; Fuente: INE
  </p>

  <div class="piramide-contenedor">
    <div class="pir-leyenda">
      <span class="pir-ley-h">&#9664; Hombres</span>
      <span></span>
      <span class="pir-ley-m">Mujeres &#9654;</span>
    </div>
    <div class="piramide">${filasGrafico}
    </div>
  </div>

  <h3 class="seccion-titulo" style="margin-top:0.5rem">Datos por grupo de edad</h3>
  <div class="tabla-wrap">
    <table>
      <thead>
        <tr>
          <th>Grupo de edad</th>
          <th class="num" style="background:#2257A8">Hombres</th>
          <th class="num" style="background:#7B2512">Mujeres</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
${filasDatos}      </tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td class="num">${fmt(totH)}</td>
          <td class="num">${fmt(totM)}</td>
          <td class="num">${fmt(totT)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="notas" style="margin-top:1.5rem">
    <p>• Dato de grupos quinquenales: ${anio || 's/d'} · Fuente: INE (Padrón Continuo tabla 33842 / PC-AXIS).</p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pirámide · ${m.nombre} · Diócesis de Getafe</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${CSS_COMUN}${cssExtra}
  </style>
</head>
<body>
<header>
  <div class="escudo">✝</div>
  <h1>Población Diocesana</h1>
  <p class="subtitulo">Diócesis de Getafe &nbsp;·&nbsp; Plan de Organización Territorial</p>
</header>
<nav class="nav-pages">
  <a href="index.html" class="nav-link">Inicio</a>
  <a href="poblacion-2025.html" class="nav-link">Población 2025</a>
  <a href="grupos-edad.html" class="nav-link">Grupos de edad</a>
  <a href="indicadores.html" class="nav-link">Indicadores</a>
</nav>
${RESUMEN_COMUN}
<main>
${contenido}
</main>
<footer>
  <p>Diócesis de Getafe &nbsp;·&nbsp; Plan de Organización Territorial &nbsp;·&nbsp; Datos: Guía Diocesana enero 2026, INE</p>
  <p style="margin-top:0.3rem;"><a href="https://www.diocesisgetafe.es" target="_blank" rel="noopener">diocesisgetafe.es</a></p>
</footer>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODIFICAR index.html: añadir nav bar
// ══════════════════════════════════════════════════════════════════════════════
function actualizarIndex() {
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Añadir CSS de nav si no existe aún
  if (!html.includes('nav-pages')) {
    const cssNav = `
    /* ── NAV ENTRE PÁGINAS ── */
    .nav-pages {
      display: flex; justify-content: center; flex-wrap: wrap; gap: 0.25rem;
      padding: 0.7rem 2rem; background: var(--borgoña-oscuro);
    }
    .nav-link {
      color: var(--dorado-claro); text-decoration: none; font-size: 0.82rem;
      font-weight: 600; padding: 0.35rem 1.1rem; border-radius: 4px;
      transition: all 0.18s; letter-spacing: 0.04em; border: 1px solid transparent;
    }
    .nav-link:hover { background: rgba(196,162,75,0.2); border-color: var(--dorado); }
    .nav-link.activo { background: var(--dorado); color: var(--borgoña-oscuro); }`;
    html = html.replace('    @media (max-width: 600px)', cssNav + '\n\n    @media (max-width: 600px)');
  }

  // Insertar nav bar después de </header>
  if (!html.includes('<nav class="nav-pages">')) {
    const navBar = `
<nav class="nav-pages">
  <a href="index.html" class="nav-link activo">Inicio</a>
  <a href="poblacion-2025.html" class="nav-link">Población 2025</a>
  <a href="grupos-edad.html" class="nav-link">Grupos de edad</a>
  <a href="indicadores.html" class="nav-link">Indicadores</a>
</nav>
`;
    html = html.replace('</header>\n\n<div class="resumen">', `</header>\n${navBar}\n<div class="resumen">`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✓ index.html actualizado con barra de navegación');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const OUT = __dirname;

fs.writeFileSync(path.join(OUT, 'poblacion-2025.html'), generarPoblacion2025(), 'utf8');
console.log('✓ poblacion-2025.html generado');

fs.writeFileSync(path.join(OUT, 'grupos-edad.html'), generarGruposEdad(), 'utf8');
console.log('✓ grupos-edad.html generado');

fs.writeFileSync(path.join(OUT, 'indicadores.html'), generarIndicadores(), 'utf8');
console.log('✓ indicadores.html generado');

actualizarIndex();

const munConPiramide = municipios.filter(m => m.poblacion.hombres !== null && m.poblacion.mujeres !== null);
let piramideCount = 0;
for (const m of munConPiramide) {
  const fname = `piramide-${slugMunicipio(m.nombre)}.html`;
  fs.writeFileSync(path.join(OUT, fname), generarPiramide(m), 'utf8');
  piramideCount++;
}
console.log(`✓ ${piramideCount} páginas de pirámide generadas`);

console.log('\nArchivos en', OUT);
console.log(fs.readdirSync(OUT).filter(f=>f.endsWith('.html')).join('  |  '));
