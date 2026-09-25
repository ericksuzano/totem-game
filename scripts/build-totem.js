// Gera o executavel portatil (um .exe unico, sem instalar) de cada totem
// separadamente, ja com a experiencia definida:
//
//   npm run build:win:totens            -> Transformacoes + Votacao (os dois)
//   npm run build:win:transformations   -> so o Jogo das Transformacoes
//   npm run build:win:voting            -> so a Votacao
//   npm run build:win:contest           -> so o Concurso Cultural
//
// Tambem aceita varios modos de uma vez:
//   node scripts/build-totem.js transformations voting
//
// Mesmo codigo-base para todos; muda apenas:
//   - "totemMode" no app-config.json embutido (copia de config/app-config.json)
//   - nome do produto/executavel e appId (instalacoes independentes: os dois
//     podem ficar instalados na mesma maquina sem um substituir o outro)
//   - pasta de saida: dist/<modo>/
//   - arquivos que so o outro jogo usa ficam de fora (ver MODES)
//
// Nada versionado e alterado: os arquivos gerados ficam em build/generated/.
// Alternativa sem gerar um instalador por totem: usar "npm run build:win"
// (generico) e ajustar resources/app-config.json em cada maquina (ver README).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// label: nome no produto/executavel.
// withContent: embute content/ (cadastro e fotos dos trabalhos). O Jogo das
//   Transformacoes nunca le essa pasta.
// exclude: arquivos do app que esta experiencia nao usa.
const TRANSFORMATIONS_IMAGES = ['!src/assets/images/antigos/**', '!src/assets/images/modernos/**'];
const MODES = {
  transformations: { label: 'Jogo das Transformacoes', withContent: false, exclude: [] },
  contest: { label: 'Concurso Cultural', withContent: true, exclude: TRANSFORMATIONS_IMAGES },
  voting: { label: 'Votacao', withContent: true, exclude: TRANSFORMATIONS_IMAGES }
};

const modes = process.argv.slice(2);
const invalid = modes.filter((m) => !MODES[m]);
if (modes.length === 0 || invalid.length > 0) {
  console.error(`Modo invalido: "${invalid.join(', ')}". Use um ou mais de: ${Object.keys(MODES).join(', ')}`);
  process.exit(1);
}

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const baseConfig = JSON.parse(fs.readFileSync(path.join(root, 'config', 'app-config.json'), 'utf-8'));

const toPosix = (p) => path.relative(root, p).split(path.sep).join('/');

function build(mode) {
  const { label, withContent, exclude } = MODES[mode];

  const outDir = path.join(root, 'build', 'generated', mode);
  fs.mkdirSync(outDir, { recursive: true });

  const appConfigPath = path.join(outDir, 'app-config.json');
  fs.writeFileSync(appConfigPath, JSON.stringify({ ...baseConfig, totemMode: mode }, null, 2));

  const extraResources = pkg.build.extraResources
    .filter((r) => withContent || r.to !== 'content')
    .map((r) => (r.to === 'app-config.json' ? { ...r, from: toPosix(appConfigPath) } : r));

  const builderConfig = {
    ...pkg.build,
    appId: `${pkg.build.appId}.${mode}`,
    productName: `${pkg.build.productName} - ${label}`,
    directories: { ...pkg.build.directories, output: `dist/${mode}` },
    files: [...pkg.build.files, ...exclude],
    extraResources,
    // Executavel portatil: um .exe unico que abre direto, sem instalar.
    win: { ...pkg.build.win, target: ['portable'] },
    portable: { artifactName: `APROXIMA 2026 - ${label}.exe` }
  };

  const builderConfigPath = path.join(outDir, 'electron-builder.json');
  fs.writeFileSync(builderConfigPath, JSON.stringify(builderConfig, null, 2));

  console.log(`\n=== Gerando executavel do totem "${label}" (totemMode=${mode}) -> dist/${mode}/ ===\n`);
  execFileSync(
    process.execPath,
    [require.resolve('electron-builder/cli.js'), '--win', '--config', toPosix(builderConfigPath)],
    { cwd: root, stdio: 'inherit' }
  );
}

modes.forEach(build);

console.log('\nPronto:');
modes.forEach((m) => console.log(`  ${MODES[m].label.padEnd(24)} -> dist/${m}/`));
