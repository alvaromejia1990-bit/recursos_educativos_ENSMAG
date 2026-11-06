/* Gráficos SVG livianos para el dashboard (sin dependencias). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const tt = () => document.getElementById('tooltip');
  const fmt = n => Number(n).toLocaleString('es-CO');

  function el(tag, attrs, padre) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (padre) padre.appendChild(n);
    return n;
  }
  function texto(padre, x, y, t, attrs) { const n = el('text', Object.assign({ x, y }, attrs || {}), padre); n.textContent = t; return n; }
  function maxBonito(v) {
    if (v <= 4) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }
  /* Rectángulo con esquinas superiores (o derechas) redondeadas, anclado a la base. */
  function barraV(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  function barraH(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }

  function mostrarTooltip(ev, titulo, filas) {
    const t = tt(); t.innerHTML = '';
    const h = document.createElement('div'); h.className = 'tt-tit'; h.textContent = titulo; t.appendChild(h);
    filas.forEach(f => {
      const d = document.createElement('div'); d.className = 'tt-fila';
      const i = document.createElement('i'); i.style.background = f.color; d.appendChild(i);
      const b = document.createElement('b'); b.textContent = fmt(f.valor); d.appendChild(b);
      const s = document.createElement('span'); s.textContent = f.nombre; d.appendChild(s);
      t.appendChild(d);
    });
    t.hidden = false;
    let x, y;
    if (ev.clientX !== undefined && ev.type !== 'focus') { x = ev.clientX; y = ev.clientY; }
    else { const r = ev.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
    const w = t.offsetWidth, hh = t.offsetHeight;
    t.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14)) + 'px';
    t.style.top = Math.max(8, y - hh - 12) + 'px';
  }
  function ocultarTooltip() { tt().hidden = true; }
  function enlazar(nodo, titulo, filas) {
    nodo.setAttribute('tabindex', '0');
    nodo.setAttribute('role', 'img');
    nodo.setAttribute('aria-label', titulo + ': ' + filas.map(f => f.nombre + ' ' + f.valor).join(', '));
    nodo.addEventListener('pointermove', e => mostrarTooltip(e, titulo, filas));
    nodo.addEventListener('focus', e => mostrarTooltip(e, titulo, filas));
    nodo.addEventListener('pointerleave', ocultarTooltip);
    nodo.addEventListener('blur', ocultarTooltip);
  }
  function leyenda(contenedor, series) {
    if (series.length < 2) return;
    const l = document.createElement('div'); l.className = 'leyenda';
    series.forEach(s => {
      const sp = document.createElement('span'); const i = document.createElement('i'); i.style.background = s.color;
      sp.appendChild(i); sp.appendChild(document.createTextNode(s.nombre)); l.appendChild(sp);
    });
    contenedor.appendChild(l);
  }
  function sinDatos(contenedor, msg) {
    contenedor.innerHTML = '';
    const d = document.createElement('div'); d.className = 'sin-datos'; d.textContent = msg || 'Sin consultas en el periodo seleccionado.';
    contenedor.appendChild(d);
  }

  /** Columnas apiladas (p. ej. consultas por día por tipo de usuario). */
  function columnasApiladas(contenedor, { categorias, etiquetas, series }) {
    const total = categorias.map((_, i) => series.reduce((s, se) => s + se.valores[i], 0));
    if (!total.some(v => v > 0)) return sinDatos(contenedor);
    contenedor.innerHTML = '';
    leyenda(contenedor, series);
    const W = 900, H = 250, m = { l: 38, r: 8, t: 12, b: 30 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group' });
    const max = maxBonito(Math.max(...total));
    const ph = H - m.t - m.b, pw = W - m.l - m.r;
    const y = v => m.t + ph - (v / max) * ph;
    const g = el('g', { class: 'eje' }, svg);
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k;
      el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, g);
      texto(g, m.l - 6, y(v) + 4, fmt(Math.round(v)), { 'text-anchor': 'end' });
    }
    el('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'base' }, svg);
    const banda = pw / categorias.length;
    const bw = Math.max(2, Math.min(28, banda * 0.72));
    const paso = Math.ceil(categorias.length / 12);
    categorias.forEach((cat, i) => {
      const x = m.l + banda * i + (banda - bw) / 2;
      let acum = 0;
      const visibles = series.map((s, si) => ({ s, si, v: s.valores[i] })).filter(o => o.v > 0);
      visibles.forEach((o, idx) => {
        const y0 = y(acum), y1 = y(acum + o.v);
        const alto = Math.max(1, y0 - y1 - (idx > 0 ? 2 : 0));
        const top = y0 - (idx > 0 ? 2 : 0) - alto;
        const d = idx === visibles.length - 1 ? barraV(x, top, bw, alto, 4) : `M${x},${top}h${bw}v${alto}h${-bw}Z`;
        el('path', { d, fill: o.s.color, class: 'marca' }, svg);
        acum += o.v;
      });
      if (i % paso === 0) texto(g, x + bw / 2, H - m.b + 18, etiquetas[i], { 'text-anchor': 'middle' });
      const hit = el('rect', { x: m.l + banda * i, y: m.t, width: banda, height: ph, fill: 'transparent' }, svg);
      enlazar(hit, etiquetas[i] + ' · Total ' + fmt(total[i]), series.map(s => ({ nombre: s.nombre, color: s.color, valor: s.valores[i] })));
    });
    contenedor.appendChild(svg);
  }

  /** Barras horizontales (una o varias series agrupadas). */
  function barrasHorizontales(contenedor, { items, series, ancho = 600, etiquetaAncho = 170 }) {
    if (!items.length || !items.some(it => it.valores.some(v => v > 0))) return sinDatos(contenedor);
    contenedor.innerHTML = '';
    leyenda(contenedor, series);
    const n = series.length, bh = n > 1 ? 11 : 16, gap = 2, sepFila = 12;
    const filaH = n * bh + (n - 1) * gap + sepFila;
    const H = items.length * filaH + 6;
    const m = { l: etiquetaAncho, r: 46 };
    const svg = el('svg', { viewBox: `0 0 ${ancho} ${H}`, role: 'group' });
    const max = Math.max(...items.flatMap(it => it.valores));
    const pw = ancho - m.l - m.r;
    el('line', { x1: m.l, x2: m.l, y1: 0, y2: H - 6, class: 'base' }, svg);
    items.forEach((it, i) => {
      const y0 = i * filaH + sepFila / 2;
      const etq = it.etiqueta.length > 26 ? it.etiqueta.slice(0, 25) + '…' : it.etiqueta;
      const t = texto(svg, m.l - 10, y0 + (filaH - sepFila) / 2 + 4, etq, { 'text-anchor': 'end', class: 'etq' });
      if (etq !== it.etiqueta) { const ti = el('title', {}, t); ti.textContent = it.etiqueta; }
      series.forEach((s, si) => {
        const v = it.valores[si];
        const yb = y0 + si * (bh + gap);
        const w = max ? (v / max) * pw : 0;
        if (v > 0) el('path', { d: barraH(m.l + 1, yb, Math.max(2, w), bh, 4), fill: s.color, class: 'marca' }, svg);
        if (n === 1 || v > 0) texto(svg, m.l + w + 6, yb + bh / 2 + 4, fmt(v), { class: 'val' });
      });
      const hit = el('rect', { x: 0, y: i * filaH, width: ancho, height: filaH, fill: 'transparent' }, svg);
      enlazar(hit, it.etiqueta, series.map((s, si) => ({ nombre: s.nombre, color: s.color, valor: it.valores[si] })));
    });
    contenedor.appendChild(svg);
  }

  window.Graficos = { columnasApiladas, barrasHorizontales, ocultarTooltip };
})();
