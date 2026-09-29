const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
