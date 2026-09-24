// Registro das 3 experiencias. Cada totem fisico roda UMA delas, escolhida
// por "totemMode" em config/app-config.json (ou --totem-mode= no atalho).
//
// Para cada modo:
//   label   - nome exibido na barra superior das telas internas.
//   attract - textos da tela de espera (chamamento), exibida ao ligar o totem
//             e sempre que o totem fica sem uso.
//   module  - objeto JS da experiencia. Contrato esperado:
//               init()          -> (opcional, pode ser async) preparacao unica
//               start()         -> abre a tela inicial da experiencia
//               getHomeScreen() -> (opcional, pode ser async) tela de espera
//                                  alternativa; padrao "attract"
//
// Os textos abaixo vieram do briefing do cliente. Nao incluir textos que nao
// tenham sido aprovados.

const TOTEM_EXPERIENCES = {
  transformations: {
    label: 'Jogo das Transformações',
    attract: {
      cta: 'Participe!',
      title: 'Jogo das Transformações',
      subtitle: 'O que mudou? O que ficou?',
      hint: 'Toque na tela para jogar'
    },
    module: () => window.TransformationsGame
  },

  contest: {
    label: 'Concurso Cultural',
    attract: {
      cta: 'Venha!',
      title: 'Concurso Cultural',
      subtitle: 'O que a FIPECq representa na sua trajetória de vida',
      hint: 'Toque na tela para conhecer os trabalhos'
    },
    // TODO (cliente): texto de apresentacao do concurso, se houver. Vazio =
    // nao exibido. Ex.: regras, premiacao, como participar.
    introText: '',
    module: () => window.ContestApp
  },

  voting: {
    label: 'Votação',
    attract: {
      cta: 'Participe!',
      title: 'Vote no seu trabalho favorito',
      subtitle: 'Sua voz faz história',
      hint: 'Toque na tela para votar'
    },
    module: () => window.VotingApp
  }
};
