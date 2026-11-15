/**
 * Burns "AI-generated · created with AI tools" into the bottom-left corner
 * of the how-to-play video throughout its full duration.
 *
 * Input:  public/tutorial/how-to-play.webm  (VP9, ~9 MB, 2:22)
 * Output: public/tutorial/how-to-play.webm  (replaced in-place)
 *         (a .bak copy is kept alongside it)
 */
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE   = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(HERE, '../..');
const FFMPEG = 'C:/Users/charl/AppData/Local/Temp/ffmpeg-build/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe';
const SRC    = path.join(ROOT, 'public/tutorial/how-to-play.webm');
const TMP    = path.join(os.tmpdir(), 'how-to-play-watermarked.webm');
const BAK    = SRC + '.bak';

// Same ffPath helper that worked for the demo video.
const ffPath = s => s.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\\\:');

// Write watermark text to a file (avoids all quoting issues with colons).
const textFile = path.join(os.tmpdir(), 'wm_text.txt');
fs.writeFileSync(textFile, 'AI-generated \u00b7 created with AI tools');

const fontFile = ffPath('C:\\Windows\\Fonts\\arial.ttf');
const textPath = ffPath(textFile);

// Bottom-left corner, semi-transparent dark box, gold text, full duration.
const drawtext =
  `drawtext=fontfile=${fontFile}` +
  `:textfile=${textPath}` +
  `:fontsize=18:fontcolor=0xFFD700` +
  `:x=12:y=h-text_h-12` +
  `:box=1:boxcolor=0x00000085:boxborderw=8`;

console.log('Burning watermark into how-to-play.webm (this takes ~1 minute) …');
console.log('Filter:', drawtext);

execFileSync(FFMPEG, [
  '-y',
  '-i', SRC,
  '-vf', drawtext,
  // Re-encode as VP9 to keep the .webm container.
  '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0',
  '-c:a', 'copy',
  TMP,
], { stdio: 'inherit' });

// Back up the original then replace it.
fs.copyFileSync(SRC, BAK);
fs.copyFileSync(TMP, SRC);
fs.unlinkSync(TMP);
fs.unlinkSync(textFile);

const mb = (fs.statSync(SRC).size / 1024 / 1024).toFixed(1);
console.log(`\nDone. ${SRC}  (${mb} MB)`);
console.log(`Original backed up at ${BAK}`);
