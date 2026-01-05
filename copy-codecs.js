import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packages = [
    '@cornerstonejs/codec-openjpeg',
    '@cornerstonejs/codec-openjph',
    '@cornerstonejs/codec-libjpeg-turbo-8bit',
    '@cornerstonejs/codec-charls'
];

const destDir = path.join(__dirname, 'public', 'dicom-image-loader');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

packages.forEach(pkg => {
    const pkgPath = path.join(__dirname, 'node_modules', pkg, 'dist');
    if (fs.existsSync(pkgPath)) {
        const files = fs.readdirSync(pkgPath);
        files.forEach(file => {
            const src = path.join(pkgPath, file);
            const dest = path.join(destDir, file);
            // Copy only wasm and js files
            if (file.endsWith('.wasm') || file.endsWith('.js')) {
                fs.copyFileSync(src, dest);
                console.log(`Copied ${file} to ${destDir}`);
            }
        });
    } else {
        console.warn(`Package path not found: ${pkgPath}`);
    }
});
