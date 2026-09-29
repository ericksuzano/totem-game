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
    introText: '',
    module: () => window.ContestApp
  },

  voting: {
    label: '',
    attract: {
      cta: '',
      title: 'Participe do concurso cultural',
      subtitle: 'Entre tantas expressões de talento e criatividade, escolha a arte que mais encantou você.',
      hint: 'Toque na tela'
    },
    module: () => window.VotingApp
  }
};
