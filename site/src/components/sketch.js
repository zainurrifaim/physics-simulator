// Freehand sketch pad (SVG + pointer events). Strokes are stored in the draft.
const VW = 900;
const VH = 280;
const MAX_STROKES = 150;
const MAX_POINTS = 1500;

const pathData = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

export function mountSketch(root, draft, save) {
  root.innerHTML = `
    <div class="sketch-tools" role="toolbar" aria-label="Alat sketsa">
      <span class="sketch-colors">
        <label><input type="radio" name="pen" value="ink" checked><i class="pen pen-ink"></i><span class="sr-only">Tinta</span></label>
        <label><input type="radio" name="pen" value="force"><i class="pen pen-force"></i><span class="sr-only">Jingga (gaya)</span></label>
        <label><input type="radio" name="pen" value="velocity"><i class="pen pen-velocity"></i><span class="sr-only">Biru (kecepatan)</span></label>
        <label><input type="radio" name="pen" value="disp"><i class="pen pen-disp"></i><span class="sr-only">Ungu (perpindahan)</span></label>
      </span>
      <button class="text-button" data-sketch="undo">Urungkan</button>
      <button class="text-button" data-sketch="clear">Hapus semua</button>
    </div>
    <svg class="sketch" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Area menggambar sketsa"></svg>`;
  const svg = root.querySelector('svg');
  const strokes = Array.isArray(draft.strokes) ? draft.strokes.filter((s) => Array.isArray(s?.pts)) : [];
  let pen = 'ink';
  let current = null;
  let node = null;

  const redraw = () => {
    svg.innerHTML =
      '<path class="sketch-ground" d="M0 250H900"/>' +
      strokes.map((s) => `<path class="stroke pen-${s.pen}" d="${pathData(s.pts)}"/>`).join('');
  };

  const point = (e) => {
    const b = svg.getBoundingClientRect();
    return [Math.max(0, Math.min(VW, ((e.clientX - b.left) / b.width) * VW)), Math.max(0, Math.min(VH, ((e.clientY - b.top) / b.height) * VH))];
  };

  svg.addEventListener('pointerdown', (e) => {
    if (strokes.length >= MAX_STROKES) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    current = { pen, pts: [point(e)] };
    node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    node.setAttribute('class', `stroke pen-${pen}`);
    svg.append(node);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!current) return;
    if (current.pts.length < MAX_POINTS) current.pts.push(point(e));
    node.setAttribute('d', pathData(current.pts));
  });
  const finish = () => {
    if (!current) return;
    if (current.pts.length === 1) current.pts.push([current.pts[0][0] + 0.5, current.pts[0][1] + 0.5]);
    strokes.push(current);
    current = null;
    draft.strokes = strokes;
    save();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);

  root.addEventListener('change', (e) => {
    if (e.target.name === 'pen') pen = e.target.value;
  });
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sketch]')?.dataset.sketch;
    if (a === 'undo') strokes.pop();
    else if (a === 'clear') strokes.length = 0;
    else return;
    draft.strokes = strokes;
    save();
    redraw();
  });

  redraw();
}
