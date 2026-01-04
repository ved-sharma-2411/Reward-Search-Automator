import { build } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildExtension() {
  console.log('Building extension...');

  await build({
    configFile: resolve(__dirname, 'vite.config.extension.ts'),
  });

  console.log('Copying static files...');

  const filesToCopy = [
    { src: 'manifest.json', dest: 'dist/manifest.json' },
    { src: 'public/background.js', dest: 'dist/background.js' },
    { src: 'public/content.js', dest: 'dist/content.js' },
  ];

  filesToCopy.forEach(({ src, dest }) => {
    const srcPath = resolve(__dirname, src);
    const destPath = resolve(__dirname, dest);
    const destDir = dirname(destPath);

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} to ${dest}`);
  });

  console.log('\nCopying icon files...');
  const iconSizes = [16, 48, 128];
  iconSizes.forEach(size => {
    const srcIcon = resolve(__dirname, 'public/icon.svg');
    const destIcon = resolve(__dirname, `dist/icon${size}.png`);
    if (existsSync(srcIcon)) {
      copyFileSync(srcIcon, destIcon);
      console.log(`Created icon${size}.png`);
    }
  });

  console.log('\n✅ Extension built successfully!');
  console.log('\nTo load the extension in Chrome:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode" in the top right');
  console.log('3. Click "Load unpacked"');
  console.log('4. Select the "dist" folder from this project');
}

buildExtension().catch(console.error);
