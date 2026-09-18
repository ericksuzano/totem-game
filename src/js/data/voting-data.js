// Cadastro dos trabalhos do Totem de Votacao ("Sua voz faz historia").
//
// IMPORTANTE: os trabalhos ainda NAO foram definidos pela producao/Comissao
// Organizadora (ver "Aproxima 2026 - Regulamento da Exposicao" - inscricoes
// encerradas em 14/09/2026, sujeitas a selecao). Os itens abaixo sao
// PLACEHOLDERS de estrutura, nao trabalhos reais.
//
// ---------------------------------------------------------------------------
// COMO CADASTRAR OS TRABALHOS DEFINITIVOS (sem tocar em nenhuma outra logica):
//
// 1. Para cada trabalho selecionado, edite um dos objetos abaixo substituindo
//    os campos marcados "TODO".
// 2. O totem aceita 4 OU 5 trabalhos (conforme o briefing) - para usar 5, basta
//    copiar um bloco { ... } inteiro, colar antes do "]" final e preencher os
//    campos, com um "id" novo e unico (ex.: 'trabalho-5'). Para usar so 4,
//    mantenha apenas 4 blocos. Nao e necessario editar nenhuma tela ou script.
// 3. "category" deve ser uma das categorias oficiais do Regulamento de
//    Exposicao (lista abaixo) - e so um texto exibido, nao afeta a logica.
// 4. "image" e o caminho do arquivo dentro de src/assets/images/trabalhos/
//    (ver PLACEHOLDER.md nessa pasta). Se o arquivo nao existir ou nao for
//    encontrado, a tela mostra automaticamente um quadro "Imagem do trabalho"
//    no lugar - o app nao quebra por falta de foto, mas o ideal e ter a foto.
// 5. "description" deve ser curta (1-2 frases): o card mostra no maximo 3
//    linhas de descricao e 2 linhas de titulo, cortando o resto com "..." se
//    for maior - por isso, quanto mais curto e direto, melhor o resultado.
//
// Categorias oficiais (Regulamento de Exposicao, secao 2):
//   'Artesanato' | 'Obras de arte' | 'Livros e publicações autorais' |
//   'Apresentações musicais' | 'Outras atividades culturais'
// ---------------------------------------------------------------------------

const VOTING_DATA = [
  {
    id: 'trabalho-1',
    title: 'TODO: nome do trabalho',
    author: 'TODO: nome do autor',
    category: 'TODO: categoria',
    description: 'TODO: descricao curta do trabalho.',
    image: 'assets/images/trabalhos/placeholder-1.png'
  },
  {
    id: 'trabalho-2',
    title: 'TODO: nome do trabalho',
    author: 'TODO: nome do autor',
    category: 'TODO: categoria',
    description: 'TODO: descricao curta do trabalho.',
    image: 'assets/images/trabalhos/placeholder-2.png'
  },
  {
    id: 'trabalho-3',
    title: 'TODO: nome do trabalho',
    author: 'TODO: nome do autor',
    category: 'TODO: categoria',
    description: 'TODO: descricao curta do trabalho.',
    image: 'assets/images/trabalhos/placeholder-3.png'
  },
  {
    id: 'trabalho-4',
    title: 'TODO: nome do trabalho',
    author: 'TODO: nome do autor',
    category: 'TODO: categoria',
    description: 'TODO: descricao curta do trabalho.',
    image: 'assets/images/trabalhos/placeholder-4.png'
  }

  // Para o 5o trabalho (opcional), descomente e preencha o bloco abaixo:
  // ,{
  //   id: 'trabalho-5',
  //   title: 'TODO: nome do trabalho',
  //   author: 'TODO: nome do autor',
  //   category: 'TODO: categoria',
  //   description: 'TODO: descricao curta do trabalho.',
  //   image: 'assets/images/trabalhos/placeholder-5.png'
  // }
];
