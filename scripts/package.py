"""Package the current canvas sequence component and its reproducible media sources."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
exclude_top = {'vendor', 'node_modules', 'work-media', 'work', 'output', '.git', '.playwright-cli', '.playwright'}
exclude_names = {'.env', '.phpunit.result.cache', 'hot', 'auth.json', '.DS_Store'}
files = []
for file in sorted(root.rglob('*')):
    if not file.is_file():
        continue
    relative = file.relative_to(root)
    if relative.parts[0] in exclude_top or '__pycache__' in relative.parts or file.name in exclude_names:
        continue
    if relative.parts[:2] == ('bootstrap', 'cache') and file.name != '.gitignore':
        continue
    if relative.parts[:1] == ('storage',) and file.name != '.gitignore':
        continue
    if relative.as_posix() == 'docs/PACKAGE-CONTENTS.json':
        continue
    files.append((file, relative.as_posix()))

required = [
    'config/algyr-scroll.php',
    'resources/views/components/algyr-scroll.blade.php',
    'resources/views/components/algyr-scroll-screens.blade.php',
    'public/vendor/algyr-scroll/algyr-scroll.js',
    'public/vendor/algyr-scroll/algyr-scroll.css',
    *[f'lang/{locale}/algyr-platform.php' for locale in ['kk', 'ru', 'en']],
    *[f'public/media/algyr/platform/{name}.webp' for name in ['poster', 'poster-mobile', *[f'shot-{i}' for i in range(1, 7)]]],
    *[f'public/media/algyr/platform/frames/f_{i:03d}.webp' for i in range(120)],
]

def manifest(items):
    return {name: {'bytes': file.stat().st_size, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
            for file, name in items}

(root / 'docs/PACKAGE-CONTENTS.json').write_text(json.dumps(manifest(files), indent=2, ensure_ascii=False), encoding='utf-8')

def archive(name, items, prefix=''):
    destination = root.parent / name
    payload = json.dumps(manifest(items), indent=2, ensure_ascii=False)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipped:
        for file, relative in items:
            zipped.write(file, arcname=prefix+relative)
        zipped.writestr(prefix+'docs/PACKAGE-CONTENTS.json', payload)
    with zipfile.ZipFile(destination) as zipped:
        assert zipped.testzip() is None
        names = [name.removeprefix(prefix) for name in zipped.namelist()]
        assert all(item in names for item in required)
        assert 'README.md' in names
        assert not any(name.startswith(('vendor/', 'node_modules/', 'work-media/', 'output/')) or name == '.env' for name in names)
        assert not any(name.startswith('public/media/algyr/frames/') or name.endswith(('journey-desktop.mp4', 'journey-mobile.mp4')) for name in names)
        assert len([name for name in names if name.startswith('public/media/algyr/platform/') and name.endswith('.webp')]) == 128
        assert not any(name.endswith(('platform/scene.webp', 'platform/background.webp')) for name in names)
        assert len([name for name in names if name.startswith('public/vendor/algyr-scroll/assets/') and name.endswith('.woff2')]) == 4
        for path, data in json.loads(payload).items():
            assert hashlib.sha256(zipped.read(prefix+path)).hexdigest() == data['sha256']
    checksum = hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix('.zip.sha256').write_text(f'{checksum}  {destination.name}\n', encoding='utf-8')
    return {'zip': str(destination), 'files': len(items)+1, 'bytes': destination.stat().st_size, 'sha256': checksum, 'integrity': 'passed'}

minimal = [(file, name) for file, name in files if name in required or name.startswith(('public/vendor/algyr-scroll/', 'public/media/algyr/platform/', 'public/media/algyr/brand/', 'docs/licenses/')) or name in ['docs/ASSETS.md', 'docs/STORYBOARD.md', 'docs/VALIDATION.md', 'docs/browser-results.json', 'docs/scroll-regressions.json', 'docs/video-aspect-check.json', 'docs/MEDIA-REPORT.json', 'docs/THIRD-PARTY-NOTICES.md']]
minimal += [(root/'docs/INTEGRATION.md', 'README.md')]
minimal += [(root/name, name) for name in ['docs/media-browser-results.json', 'docs/screen-composite-check.json', 'docs/screen-tracking-check.json']]
print(json.dumps({
    'full': archive('ALGYR-Cinematic-Laravel.zip', files, 'algyr-cinematic/'),
    'integration': archive('ALGYR-Block-Integration.zip', minimal)
}, indent=2))
