"""Collect verified reports and bind the handoff evidence to the current source."""
import datetime, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda name:json.loads((ROOT/name).read_text())
reports={
 'game':read('artifacts/verification/report.json'),
 'browsers':read('artifacts/browsers/report.json'),
 'capacityTouchKeyboard':read('artifacts/final/report.json'),
 'captureGuard':read('docs/evidence/capture-guard.json'),
 'assets':read('docs/ASSET_AUDIT.json')
}
assert not reports['game']['errors'] and len(reports['game']['cases'])==5
assert all(not b['errors'] and b['completed'] for b in reports['browsers'].values())
assert reports['capacityTouchKeyboard']['capacity']['portions']==40
assert reports['captureGuard']['completionSaved']
assert len(reports['assets']['foods'])==15
assert 'Ran 14 tests' in (ROOT/'artifacts/server-tests.txt').read_text()
assert '\nOK' in (ROOT/'artifacts/server-tests.txt').read_text()
assert 'PASS:' in (ROOT/'artifacts/qualtrics-bridge-tests.txt').read_text()
files=list((ROOT/'web/src').glob('*'))+[ROOT/'server/buffet_server.py',ROOT/'web/index.html']
result={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'engine':'Babylon.js 9.11.0','reports':reports,
        'sourceSHA256':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files}}
(ROOT/'docs/VERIFICATION.json').write_text(json.dumps(result,indent=2))
print('PASS evidence collected; current source hashes recorded.')
