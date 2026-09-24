// Gera o instalador de UM totem especifico, ja com a experiencia definida.
//
//   npm run build:win:transformations   -> Jogo das Transformacoes
//   npm run build:win:contest           -> Concurso Cultural
//   npm run build:win:voting            -> Votacao
//
// Mesmo codigo-base para os 3; muda apenas:
//   - "totemMode" no app-config.json embutido (copia de config/app-config.json)
//   - nome do produto/executavel e appId (instalacoes independentes)
//   - pasta de saida: dist/<modo>/
//
// Nada versionado e alterado: os arquivos gerados ficam em build/generated/.
// Alternativa sem gerar 3 instaladores: usar "npm run build:win" (generico) e
// ajustar resources/app-config.json em cada maquina (ver README).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MODES = {
  transformations: 'Jogo das Transformacoes',
  contest: 'Concurso Cultural',
  voting: 'Votacao'
};

const mode = process.argv[2];
if (!MODES[mode]) {
  console.error(`Modo invalido: "${mode || ''}". Use: ${Object.keys(MODES).join(', ')}`);
  process.exit(1);
}

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const baseConfig = JSON.parse(fs.readFileSync(path.join(root, 'config', 'app-config.json'), 'utf-8'));

const outDir = path.join(root, 'build', 'generated', mode);
fs.mkdirSync(outDir, { recursive: true });

const appConfigPath = path.join(outDir, 'app-config.json');
fs.writeFileSync(appConfigPath, JSON.stringify({ ...baseConfig, totemMode: mode }, null, 2));

const toPosix = (p) => path.relative(root, p).split(path.sep).join('/');

const builderConfig = {
  ...pkg.build,
  appId: `${pkg.build.appId}.${mode}`,
  productName: `${pkg.build.productName} - ${MODES[mode]}`,
  directories: { ...pkg.build.directories, output: `dist/${mode}` },
  extraResources: pkg.build.extraResources.map((r) =>
    r.to === 'app-config.json' ? { ...r, from: toPosix(appConfigPath) } : r
  )
};

const builderConfigPath = path.join(outDir, 'electron-builder.json');
fs.writeFileSync(builderConfigPath, JSON.stringify(builderConfig, null, 2));

console.log(`Gerando instalador do totem "${MODES[mode]}" (totemMode=${mode})...`);
execFileSync(
  process.execPath,
  [require.resolve('electron-builder/cli.js'), '--win', '--config', toPosix(builderConfigPath)],
  { cwd: root, stdio: 'inherit' }
);
