// Embaralhamento Fisher-Yates. Nao muta o array original.
// Usa crypto.getRandomValues (fonte aleatoria do sistema) em vez de
// Math.random, com rejeicao de amostras para nao favorecer nenhuma posicao.
function randomInt(maxExclusive) {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let value;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % maxExclusive;
}

function shuffleArray(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
