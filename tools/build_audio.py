"""Rebuild the cafeteria beds in web/assets/audio from their upstream sources.

Downloads the two openly licensed recordings, trims each to a loop length, crossfades
the loop seam so the wrap is inaudible, levels it to a fixed RMS so every participant
hears the same stimulus, and encodes AAC with macOS afconvert. Run from the repo root.
"""
import array, hashlib, json, math, subprocess, sys, tempfile, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web/assets/audio'
AGENT = 'asta-babylon-research/1.0'

SOURCES = [
    dict(id='cafeteria-music', role='music', title='Airport Lounge',
         creator='Kevin MacLeod (incompetech.com)',
         license='CC BY 3.0', licenseUrl='https://creativecommons.org/licenses/by/3.0/',
         attribution='“Airport Lounge” by Kevin MacLeod (incompetech.com), '
                     'licensed under Creative Commons: By Attribution 3.0.',
         source='https://archive.org/download/Incompetech/mp3-royaltyfree/Airport%20Lounge.mp3',
         seconds=0, seamCrossfadeSeconds=2.0, targetRmsDbfs=-20.0, bitrate=96000),
    dict(id='cafeteria-ambience', role='ambience',
         title='Busy cafeteria environment in university - Ambient',
         creator='lastraindrop (freesound.org)',
         license='CC0 1.0', licenseUrl='https://creativecommons.org/publicdomain/zero/1.0/',
         attribution='Public domain (CC0); no attribution required.',
         source='https://freesound.org/people/lastraindrop/sounds/717748',
         download='https://cdn.freesound.org/previews/717/717748_12768873-hq.mp3',
         seconds=300, seamCrossfadeSeconds=4.0, targetRmsDbfs=-26.0, bitrate=64000),
]


def rms(samples):
    return math.sqrt(sum(float(v) * v for v in samples) / len(samples)) / 32768


def loopify(src, dst, seconds, fade, target_db):
    with wave.open(str(src), 'rb') as w:
        assert w.getsampwidth() == 2
        channels, rate, frames = w.getnchannels(), w.getframerate(), w.getnframes()
        a = array.array('h'); a.frombytes(w.readframes(frames))

    n = int(fade * rate)
    loop = min(int(seconds * rate), frames - n) if seconds else frames - n
    out = a[:loop * channels]

    # Equal-power crossfade: the frames just past the loop point fade into the loop's
    # head, so playback wrapping from the last frame to the first has no discontinuity.
    for i in range(n):
        t = (i + 0.5) / n
        head, tail = math.sin(t * math.pi / 2), math.cos(t * math.pi / 2)
        for c in range(channels):
            j = i * channels + c
            out[j] = max(-32768, min(32767, int(out[j] * head + a[(loop + i) * channels + c] * tail)))

    gain = min(10 ** (target_db / 20) / max(rms(out), 1e-9),
               0.97 / max(max(abs(v) for v in out) / 32768, 1e-9))
    for i in range(len(out)):
        out[i] = max(-32768, min(32767, int(out[i] * gain)))

    with wave.open(str(dst), 'wb') as w:
        w.setnchannels(channels); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(out.tobytes())
    return loop / rate, channels, rate


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for item in SOURCES:
            url = item.get('download', item['source'])
            raw, decoded, looped = tmp / (item['id'] + '.mp3'), tmp / (item['id'] + '.wav'), tmp / (item['id'] + '.loop.wav')
            print('fetching', url)
            request = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(request, timeout=300) as response:
                raw.write_bytes(response.read())
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', '-c', '2', raw, decoded], check=True)
            seconds, channels, rate = loopify(decoded, looped, item['seconds'], item['seamCrossfadeSeconds'], item['targetRmsDbfs'])
            target = OUT / (item['id'] + '.m4a')
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-s', '0', '-b', str(item['bitrate']), looped, target], check=True)

            data = target.read_bytes()
            entry = {k: v for k, v in item.items() if k not in ('bitrate', 'download')}
            entry.update(seconds=round(seconds, 2), file=target.name,
                         codec=f'AAC-LC {rate // 1000}.{rate % 1000 // 100} kHz ' + ('stereo' if channels == 2 else 'mono'),
                         bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            manifest.append(entry)
            print(f'  {target.name}: {seconds:.1f}s, {len(data) // 1024} KiB, {len(data) * 8 / seconds / 1000:.0f} kbps')

    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('wrote', OUT / 'manifest.json')


if __name__ == '__main__':
    sys.exit(main())
