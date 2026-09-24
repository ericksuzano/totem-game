# Aproxima 2026 - Totens (FIPECq Previdencia)

Aplicativo Electron para os totens interativos do evento APROXIMA 2026
(30/09/2026, Prodigy Santos Dumont by Wish, Rio de Janeiro).

Sao **3 totens fisicos separados**, todos com o mesmo codigo-base. Cada um
abre **direto a sua experiencia** (nao existe mais menu de escolha):

| Totem | `totemMode` | Experiencia |
|---|---|---|
| 1 | `transformations` | Jogo das Transformacoes (objetos antigos x modernos) |
| 2 | `contest` | Concurso Cultural - "O que a FIPECq representa na sua trajetoria de vida" |
| 3 | `voting` | Votacao - "Vote no seu trabalho favorito" |

Funciona 100% offline (sem camera, sem login, sem backend externo).

## Fluxo de cada totem

- **Tela de espera** (comum aos 3): logo APROXIMA grande, chamada
  "Participe!"/"Venha!", nome da experiencia e fios animados nas cores da
  identidade. Qualquer toque inicia a experiencia. O totem volta sozinho para
  ela apos inatividade (`idleTimeoutMs`; nas telas finais, `idleAfterFinishMs`).
- **Jogo das Transformacoes**: tela inicial -> jogo (10 pares, 2 rodadas de 5,
  imagem + nome em cada cartao, fios coloridos ligando os pares) -> conclusao
  com **FINALIZAR** (volta a tela de espera) e **VOLTAR AO INICIO** (volta a
  tela inicial do jogo). Nao ha "jogar novamente".
- **Concurso Cultural**: galeria dos trabalhos -> detalhe do trabalho. Sem
  votacao.
- **Votacao**: trabalhos -> confirmacao -> voto registrado -> volta a tela de
  espera.

## Como definir a experiencia de cada totem

Tres formas (use a que for mais pratica na instalacao):

1. **Arquivo de configuracao** (recomendado com o instalador generico):
   editar `resources/app-config.json` ao lado do `.exe` instalado (no codigo:
   `config/app-config.json`) e trocar `"totemMode"`. Reabrir o app.
2. **Instalador especifico por totem** (o `.exe` ja sai com o modo definido):
   ```
   npm run build:win:transformations   -> dist/transformations/
   npm run build:win:contest           -> dist/contest/
   npm run build:win:voting            -> dist/voting/
   ```
   Cada um tem nome proprio ("Aproxima 2026 Totens - Votacao" etc.) e
   instala separado dos outros.
3. **Argumento no atalho do Windows**: `--totem-mode=voting` no campo
   "Destino" do atalho. Tem prioridade sobre o arquivo (util para testar os
   3 modos na mesma maquina). No desenvolvimento: `npm run start:voting`,
   `npm run start:contest`, `npm run start:transformations`.

Se o valor for invalido, o totem mostra uma tela "Experiencia nao definida"
com os valores aceitos (o gesto de manutencao continua funcionando).

## Trabalhos e fotos (Votacao e Concurso Cultural)

O cadastro fica **fora do codigo**, em `content/trabalhos/` (no totem
instalado: `resources/content/trabalhos/`), editavel sem gerar novo
instalador. Instrucoes completas em `content/trabalhos/LEIA-ME.md`.

- **Fotos**: salvar como `trabalho-1.jpg`, `trabalho-2.jpg`... (tambem
  `.jpeg`, `.png`, `.webp`) nessa pasta. Sem foto, aparece um quadro neutro.
- **3o e 4o trabalho**: copiar o bloco `_modelo_novo_trabalho` para a lista
  `works` de `trabalhos.json`, com `id` `trabalho-3` / `trabalho-4`. A grade
  se ajusta sozinha a 2, 3 ou 4 trabalhos (maximo 4).

## Zeresima e resultado da votacao

O sistema suporta 4 fases, guardadas no banco local e trocadas pelo **menu de
manutencao** (so no totem de votacao):

| Fase | O que o publico ve | Aceita votos? |
|---|---|---|
| Zeresima (`pre`) | Relatorio com a contagem real do banco (tudo 0) e data/hora | Nao |
| Votacao aberta (`open`, padrao) | Fluxo normal de votacao | Sim |
| Encerrada (`closed`) | "Votacao encerrada" | Nao |
| Resultado (`results`) | Votos por trabalho, em ordem, com percentuais | Nao |

O menu tambem mostra o relatorio atual **so para o operador** e tem
**Zerar votos** (com confirmacao; antes de apagar, salva uma copia do banco
como `votes-backup-AAAAMMDD-HHMMSS.sqlite` na mesma pasta). Toda troca de
fase, emissao de relatorio e zeramento fica registrada na tabela
`voting_log`. O processo principal recusa votos fora da fase "aberta".

**QUANDO** mostrar a zeresima e o resultado (e se o resultado sera publico)
e decisao do cliente - ver "Pendencias".

## Manutencao / saida do kiosk

Tocar 5 vezes, em menos de 3 segundos, no **logo FIPECq Previdencia** (canto
superior esquerdo, presente em todas as telas) abre o teclado do PIN
(`kiosk.exitPin`). Nao ha nenhuma indicacao visual disso para o publico.

- Totens do Jogo e do Concurso: o PIN correto fecha o aplicativo (como antes).
- Totem de Votacao: o PIN correto abre o menu de manutencao (fases,
  relatorio, zerar votos, **Sair do app**, Fechar).

"Cancelar" ou alguns segundos sem digitar fecham o teclado sem sair do kiosk.
Numero de toques, janela de tempo e PIN sao configuraveis em
`config/app-config.json`.

## Identidade visual

- Logos em `src/assets/logos/` (SVG vetorial), extraidos dos vetores do PDF
  oficial do evento, com as cores originais. Se a agencia enviar os arquivos
  oficiais, basta substituir mantendo os nomes.
- Paleta em `src/css/base.css` (`:root`): laranja, mostarda, oliva e azul
  petroleo do APROXIMA + azul FIPECq, em versao mais viva.
- **Escala responsiva unica**: `1rem = 1/108 da menor dimensao da tela` (10px
  em Full HD, 20px em 4K, ~7px em notebook 1366x768). Nao existem media
  queries de tamanho - so de orientacao (retrato/paisagem), que mudam a
  disposicao, nunca fontes ou logos.

## Pendencias conhecidas

- Decisoes do cliente listadas em "Zeresima e resultado" e no final da
  entrega (conteudo do Concurso Cultural, quando exibir zeresima/resultado).
- Fotos dos trabalhos (previstas para o dia 29) e imagens dos objetos do jogo
  (`src/assets/images/antigos` e `modernos`, nomes em
  `src/js/data/transformations-data.js`).
- Medidas/orientacao fisica das telas dos totens (o layout ja se adapta a
  paisagem e retrato).
- Icone do instalador (`build/PLACEHOLDER.md`).
- **PIN de saida do kiosk**: trocar o padrao `0000` antes do evento.

## Antes de instalar nos totens definitivos

1. Trocar `kiosk.exitPin` para um PIN que so a equipe tecnica conheca.
2. Gerar os instaladores (`npm run build:win:<modo>`) ou o generico e ajustar
   `totemMode` em cada maquina.
3. Colocar as fotos em `resources/content/trabalhos/`.
4. No totem de votacao: apos os testes de montagem, usar **Zerar votos** no
   menu de manutencao, para comecar o evento com o banco zerado.
5. Testar no proprio touchscreen antes do evento.

## Desenvolvimento

```
npm install
npm start                 # janela normal, modo do app-config.json
npm run start:voting      # idem, forcando um modo
npm run dev               # janela normal + DevTools abertas
npm run start:kiosk       # forca o modo kiosk a partir do codigo-fonte
```

O executavel gerado pelo build sempre abre em modo kiosk automaticamente.

## Notas tecnicas

- Banco de dados local em **sql.js** (SQLite compilado em WASM), e nao
  `better-sqlite3`, para nao depender de compilacao nativa. Tabelas:
  `votes` (inalterada), `settings` (fase da votacao) e `voting_log`
  (auditoria). O esquema usa `IF NOT EXISTS`, entao bancos antigos sao
  atualizados sem perder votos.
- O totem real deve rodar so este aplicativo. O kiosk fica sempre a frente e
  recupera o foco se algo tentar aparecer por cima.
