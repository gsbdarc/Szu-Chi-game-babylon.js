"""Package source, runtime assets and instructions; never participant data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
output=ROOT/'dist/Asta-Babylon.zip';output.parent.mkdir(exist_ok=True)
files=[]
for directory in ('web','study','docs','tools'):
    files += [p for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc','.meta')]
files += list((ROOT/'server').glob('*.py'))
files += [ROOT/name for name in ('README.md','THIRD_PARTY.md','package.json','.gitignore','.github/workflows/pages.yml')]
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=6) as archive:
    for file in sorted(files):archive.write(file,'Asta_Babylon/'+str(file.relative_to(ROOT)))
print(f'{output} ({output.stat().st_size/1024/1024:.1f} MiB, {len(files)} files)')
