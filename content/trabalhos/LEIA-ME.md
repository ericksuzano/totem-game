# Fotos e cadastro dos trabalhos (Votação e Concurso Cultural)

Esta pasta é lida pelo aplicativo a cada abertura. No totem instalado ela
fica em:

```
<pasta de instalação>\resources\content\trabalhos\
```

(no código-fonte: `content/trabalhos/`). Dá para trocar fotos e textos
direto no totem, **sem gerar um novo instalador**. Depois de trocar,
feche e reabra o aplicativo.

## Colocar as fotos (dia 29)

Salve cada foto aqui com o nome igual ao `id` do trabalho:

| Trabalho | Arquivo da foto |
|---|---|
| Ela e Eu (Quadro, Rejane Lins) | `trabalho-1.jpg` |
| Aconchego Seguro em tempo futuro (Fotografia, Palmira Mariconi) | `trabalho-2.jpg` |
| 3º trabalho (se houver) | `trabalho-3.jpg` |
| 4º trabalho (se houver) | `trabalho-4.jpg` |

Também são aceitos `.jpeg`, `.png` e `.webp`. A foto aparece inteira (sem
corte) dentro de uma moldura. Qualquer proporção funciona, mas fotos em boa
resolução (lado maior com pelo menos 1600 px) ficam melhores nas telas 4K.

Sem foto, o totem mostra um quadro neutro "Foto do trabalho" e continua
funcionando.

## Adicionar o 3º e o 4º trabalho

1. Abra `trabalhos.json`.
2. Copie o bloco de `_modelo_novo_trabalho` para dentro da lista `works`,
   depois do último trabalho (não esqueça a vírgula entre os blocos).
3. Troque o `id` para `trabalho-3` (ou `trabalho-4`) e preencha `category`,
   `title` e `author`.
4. Salve a foto como `trabalho-3.jpg` (ou `trabalho-4.jpg`).

A grade da tela se ajusta sozinha para 2, 3 ou 4 trabalhos. Acima de 4,
apenas os 4 primeiros aparecem.

**Importante:** não altere o `id` de um trabalho depois que a votação
começar, porque os votos são contados pelo `id`.
