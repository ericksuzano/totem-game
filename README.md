# Aproxima 2026 - Totem (FIPECq Previdencia)

Aplicativo Electron para o totem interativo do evento APROXIMA 2026
(30/09/2026, Prodigy Santos Dumont by Wish, Rio de Janeiro). Um unico totem
com duas experiencias — o visitante escolhe no menu inicial o que quer
fazer:

1. **Jogo das Transformacoes** — associacao entre tecnologias antigas e modernas.
2. **Totem de Votacao** — "Sua voz faz historia", votacao dos trabalhos do
   Espaco Cultural.

Funciona 100% offline (sem camera, sem login, sem backend externo neste MVP).

## Status do projeto

**Projeto completo (Etapas 1 a 10) e pronto para instalacao de teste no
totem.** Faltam apenas os itens listados em "Pendencias conhecidas" abaixo,
que dependem de definicoes da producao (nao de codigo).

Resumo do que existe:

- Menu inicial unico: o visitante escolhe entre as duas experiencias; volta
  para esse menu (nao para uma tela fixa) apos terminar qualquer uma delas
  ou apos um periodo de inatividade.
- Jogo das Transformacoes completo: instrucao, os 10 pares oficiais em 2
  rodadas de 5 (embaralhados a cada partida), animacao de conexao, feedback
  de acerto/erro, tela de conclusao.
- Totem de Votacao completo: trabalhos (cadastro documentado em
  `voting-data.js`), confirmacao, voto registrado, retorno automatico.
- Armazenamento local dos votos em SQLite (`sql.js`), sem qualquer dado que
  identifique o eleitor.
- Design pensado para publico 60+: fontes e botoes grandes, alto contraste,
  poucas informacoes por tela, sem depender de teclado ou mouse.
- Endurecido para touchscreen (sem pinch-zoom, sem bounce de scroll) e
  testado em resolucoes diferentes (a medida real do totem ainda e um TODO).
- **Modo kiosk**: o executavel final abre automaticamente em tela cheia, sem
  moldura, sem menu, sempre à frente de outras janelas. Saida para
  manutencao por um gesto oculto (toques num canto invisivel da tela) + PIN
  numerico — nada disso e visivel ou descobrivel pelo publico. O PIN e as
  demais configuracoes do kiosk sao editaveis no arquivo
  `resources/app-config.json` ao lado do `.exe` instalado, sem precisar
  gerar um novo instalador.

## Pendencias conhecidas (vindas dos documentos oficiais)

- Medidas fisicas dos totens (aguardando producao) — impacta a arte final.
  O layout ja tem rolagem interna como rede de seguranca para qualquer
  tamanho de tela.
- Confirmacao se havera Totem de Votacao no evento.
- Confirmacao de internet disponivel no local (nao bloqueante — o app
  funciona offline).
- Trabalhos do Totem de Votacao ainda nao definidos pela Comissao
  Organizadora — ver instrucoes de cadastro em `src/js/data/voting-data.js`.
- Identidade visual (logos, imagens oficiais) ainda nao fornecida — ver
  pastas `src/assets/*` e os arquivos `PLACEHOLDER.md`. O icone do
  instalador tambem esta pendente (usa o padrao do Electron por enquanto —
  ver `build/PLACEHOLDER.md`).
- **PIN de saida do kiosk**: o padrao `0000` em `config/app-config.json`
  precisa ser trocado por um PIN real antes do evento (`_exitPin_todo` no
  proprio arquivo).

## Antes de instalar no totem definitivo

1. Trocar `kiosk.exitPin` para um PIN que so a equipe tecnica conheca.
2. Cadastrar os trabalhos reais em `src/js/data/voting-data.js` (se o totem
   de votacao for confirmado) e colocar as fotos em
   `src/assets/images/trabalhos/`.
3. Gerar o instalador (`npm run build:win`) e testar no proprio touchscreen
   antes do evento.

## Desenvolvimento

```
npm install
npm start          # janela normal, para desenvolvimento
npm run dev        # janela normal + DevTools abertas
npm run start:kiosk  # forca o modo kiosk a partir do codigo-fonte, para testar
```

O executavel gerado pelo build (`npm run build:win`) sempre abre em modo
kiosk automaticamente — não é preciso nenhuma flag nesse caso.

## Build (Windows)

```
npm run build:win
```

Gera o instalador NSIS em `dist/` (nao versionado, gerado sob demanda).

## Saida do modo kiosk (manutencao)

Tocar 5 vezes, em menos de 3 segundos, no logo **"FIPECq Previdência"** da
barra superior (canto superior esquerdo) abre um teclado numerico. Nao ha
nenhuma indicacao visual disso — parece so o logo institucional. Digitar o
PIN configurado em `kiosk.exitPin` fecha o aplicativo por completo — a
equipe tecnica volta ao Windows e pode reabrir o totem quando quiser. Um PIN
errado mostra um aviso e permite tentar de novo; tocar em "Cancelar" ou
esperar alguns segundos sem digitar fecha o teclado sem sair do kiosk.
Numero de toques, janela de tempo e PIN sao configuraveis em
`config/app-config.json` sem alterar codigo.

## Notas tecnicas

- Banco de dados local em **sql.js** (SQLite compilado em WASM), e nao
  `better-sqlite3`: esta maquina de desenvolvimento nao tem o Visual Studio
  Build Tools necessario para compilar modulos nativos, e depender disso
  tornaria o build fragil em qualquer outra maquina que nao tenha o mesmo
  ambiente. sql.js atende ao mesmo requisito (SQLite local) sem compilacao
  nativa.
- O totem real deve rodar so este aplicativo (sem outros programas em
  segundo plano). Isso evita qualquer disputa por foco de tela — o kiosk ja
  fica sempre à frente e recupera o foco automaticamente se algo tentar
  aparecer por cima, mas um PC dedicado, sem outros softwares, e o cenario
  para o qual o modo kiosk foi desenhado.
