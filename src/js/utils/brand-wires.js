// Faixa animada de fios (svg.brand-wires, telas internas dos 3 totens).
// Os fios nascem no canto inferior esquerdo, ondulam pela base da tela (a
// "historia") e, perto da borda direita, viram trilhas retas de circuito (a
// "inteligencia") que sobem ate o canto superior direito, logo abaixo do
// cabecalho. O traçado e calculado em pixels a partir do tamanho real da
// janela (viewBox = tamanho da tela), para ficar certo em qualquer proporcao
// sem distorcer; e refeito quando a janela muda de tamanho.
//
// Todo o trecho da base fica DENTRO da faixa reservada --wires-h (base.css):
// as telas deixam essa altura livre embaixo, entao nenhum conteudo fica por
// cima dos fios.

(function () {
  const svg = document.querySelector('.brand-wires');
  if (!svg) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['orange', 'mustard', 'olive', 'navy', 'blue'];

  // Trecho ondulado de cada fio, em rem acima da base da tela: altura de
  // saida, linha media das ondas e amplitude (sinal = sentido da onda).
  const WAVES = [
    { start: 10, mid: 6, amp: 3.5 },
    { start: 4, mid: 9, amp: -3.5 },
    { start: 8, mid: 5.5, amp: 3 },
    { start: 2.5, mid: 10, amp: -3.5 },
    { start: 6.5, mid: 7.5, amp: 4 }
  ];
  // Onde cada fio termina, contado a partir do cabecalho (em rem): pontas
  // desencontradas, como terminais de uma placa.
  const END_OFFSETS = [2, 9, 5, 13, 7];

  function build() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Mesma regra de escala do CSS (base.css): 1rem = 1/108 da menor dimensao.
    const rem = Math.max(5, Math.min(w, h) / 108);
    const headerH = 8.4 * rem;

    // Altura reservada para a faixa (mesmo valor usado pelas telas).
    const bandRem = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wires-h')) || 15;
    // Margem para a espessura do fio dentro da faixa.
    const topV = bandRem - 1.4;
    const bottomV = 1.4;
    // "v" = altura em rem acima da base -> coordenada y em px, sempre dentro
    // da faixa.
    const y = (v) => h - Math.min(topV, Math.max(bottomV, v)) * rem;

    const gap = 2.6 * rem;       // distancia entre fios paralelos
    const edge = 1.6 * rem;      // distancia do fio mais externo ate a borda
    const chamfer = 4 * rem;     // canto em 45 graus (estilo circuito)

    const paths = COLORS.map((_, i) => {
      const { start, mid, amp } = WAVES[i];
      // Fio mais baixo = trilha mais externa, para os cantos nao se cruzarem.
      const flatV = 2.4 + i * 2.6;
      const yFlat = y(flatV);
      const xLane = w - edge - i * gap;
      const yEnd = headerH + 2 * rem + END_OFFSETS[i] * rem;

      const x1 = w * 0.18;
      const x2 = w * 0.36;
      const x3 = w * 0.52;

      return [
        `M ${-30} ${y(start)}`,
        // Trecho organico: duas ondas em torno da linha media e depois a
        // descida suave ate a altura da trilha.
        `C ${x1 * 0.5} ${y(start + amp)}, ${x1 * 0.8} ${y(mid - amp)}, ${x1} ${y(mid)}`,
        `S ${x2 - (x2 - x1) * 0.3} ${y(mid + amp)}, ${x2} ${y(mid)}`,
        `S ${x3 - (x3 - x2) * 0.4} ${yFlat}, ${x3} ${yFlat}`,
        // Trilha de circuito: reta ate a borda, canto em 45 graus e subida.
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
