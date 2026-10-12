// Export the real rendered Blade page after npm run build + php artisan serve.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = process.argv[2] || 'http://127.0.0.1:8000/';
const origin = new URL(source).origin;
const response = await fetch(source);
if (!response.ok) throw new Error(`Laravel responded ${response.status}`);
let html = await response.text();
html = html.replaceAll(origin + '/', '/public/');
html = html.replaceAll(origin.replaceAll('/', '\\/') + '\\/', '\\/public\\/');
const directory = fileURLToPath(new URL('../preview/', import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(directory + '/index.html', html);
console.log('preview/index.html exported from the Laravel/Blade demo.');
