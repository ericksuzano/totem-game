(function () {
  const svg = document.querySelector('.brand-wires');
  if (!svg) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['orange', 'mustard', 'olive', 'navy', 'blue'];

  const WAVES = [
    { start: 10, mid: 6, amp: 3.5 },
    { start: 4, mid: 9, amp: -3.5 },
    { start: 8, mid: 5.5, amp: 3 },
    { start: 2.5, mid: 10, amp: -3.5 },
    { start: 6.5, mid: 7.5, amp: 4 }
  ];
  const END_OFFSETS = [2, 9, 5, 13, 7];

  function build() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const rem = Math.max(5, Math.min(w, h) / 108);
    const headerH = 8.4 * rem;

    const bandRem = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wires-h')) || 15;
    const topV = bandRem - 1.4;
    const bottomV = 1.4;
    const y = (v) => h - Math.min(topV, Math.max(bottomV, v)) * rem;

    const gap = 2.6 * rem;
    const edge = 1.6 * rem;
    const chamfer = 4 * rem;

    const paths = COLORS.map((_, i) => {
      const { start, mid, amp } = WAVES[i];
      const flatV = 2.4 + i * 2.6;
      const yFlat = y(flatV);
      const xLane = w - edge - i * gap;
      const yEnd = headerH + 2 * rem + END_OFFSETS[i] * rem;

      const x1 = w * 0.18;
      const x2 = w * 0.36;
      const x3 = w * 0.52;

      return [
        `M ${-30} ${y(start)}`,
        `C ${x1 * 0.5} ${y(start + amp)}, ${x1 * 0.8} ${y(mid - amp)}, ${x1} ${y(mid)}`,
        `S ${x2 - (x2 - x1) * 0.3} ${y(mid + amp)}, ${x2} ${y(mid)}`,
        `S ${x3 - (x3 - x2) * 0.4} ${yFlat}, ${x3} ${yFlat}`,
        `L ${xLane - chamfer} ${yFlat}`,
        `L ${xLane} ${yFlat - chamfer}`,
        `L ${xLane} ${yEnd}`
      ].join(' ');
    });

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = '';

    const wires = document.createElementNS(SVG_NS, 'g');
    const pulses = document.createElementNS(SVG_NS, 'g');
    const nodes = document.createElementNS(SVG_NS, 'g');

    paths.forEach((d, i) => {
      const wire = document.createElementNS(SVG_NS, 'path');
      wire.setAttribute('class', `wire wire--${COLORS[i]}`);
      wire.setAttribute('d', d);
      wires.appendChild(wire);

      const pulse = document.createElementNS(SVG_NS, 'path');
      pulse.setAttribute('class', 'pulse');
      pulse.setAttribute('pathLength', '100');
      pulse.setAttribute('d', d);
      pulses.appendChild(pulse);

      const node = document.createElementNS(SVG_NS, 'circle');
      node.setAttribute('class', `node node--${COLORS[i]}`);
      node.setAttribute('cx', String(w - edge - i * gap));
      node.setAttribute('cy', String(headerH + 2 * rem + END_OFFSETS[i] * rem));
      node.setAttribute('r', String(1 * rem));
      nodes.appendChild(node);
    });

    svg.append(wires, pulses, nodes);
  }

  let resizeFrame = null;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(build);
  });

  build();
})();
