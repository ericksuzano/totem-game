// Trabalhos (obras) compartilhados pelo Totem do Concurso Cultural e pelo
// Totem de Votacao. O cadastro NAO fica no codigo: vem de
// content/trabalhos/trabalhos.json (lido pelo processo principal, que tambem
// localiza a foto de cada trabalho - ver content/trabalhos/LEIA-ME.md).
//
// Todo texto vindo do cadastro entra via textContent (nunca innerHTML).

(function () {
  let works = [];

  async function load() {
    const result = await window.totemAPI.getWorks();
    works = result.works || [];
    (result.warnings || []).forEach((w) => console.warn('[trabalhos]', w));
    return works;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderPlaceholder(frame) {
    frame.classList.add('is-empty');
    frame.innerHTML = TOTEM_ICONS.image;
    frame.appendChild(el('span', 'work-frame__empty-label', 'Foto do trabalho'));
  }

  // Preenche uma moldura com a foto do trabalho (inteira, sem corte) ou com o
  // marcador neutro, se a foto ainda nao foi colocada na pasta.
  function renderFrame(frame, work) {
    frame.innerHTML = '';
    frame.classList.remove('is-empty');
    if (!work.imageUrl) {
      renderPlaceholder(frame);
      return;
    }
    const img = document.createElement('img');
    img.src = work.imageUrl;
    img.alt = work.title;
    img.addEventListener('error', () => renderPlaceholder(frame));
    frame.appendChild(img);
  }

  function createCard(work, actionLabel, onSelect) {
    const card = el('button', 'work-card');
    card.type = 'button';

    const frame = el('div', 'work-frame');
    renderFrame(frame, work);
    card.appendChild(frame);

    const body = el('div', 'work-card__body');
    if (work.category) body.appendChild(el('span', 'work-chip', work.category));
    body.appendChild(el('h2', 'work-card__title', work.title));
    if (work.author) body.appendChild(el('p', 'work-card__author', work.author));
    body.appendChild(el('span', 'btn btn-primary work-card__action', actionLabel));
    card.appendChild(body);

    // O cartao vai junto para quem quiser dar feedback visual nele (votacao).
    card.addEventListener('click', () => onSelect(work, card));
    return card;
  }

  // A grade usa data-count (2, 3 ou 4) para escolher o numero de colunas -
  // ver css/works.css. Nunca sobra "buraco" com 2 ou 3 trabalhos.
  function renderGrid(container, { actionLabel, onSelect }) {
    container.innerHTML = '';
    container.dataset.count = String(works.length);
    works.forEach((work) => container.appendChild(createCard(work, actionLabel, onSelect)));
  }

  window.Works = {
    load,
    list: () => works.slice(),
    renderGrid,
    renderFrame
  };
})();
