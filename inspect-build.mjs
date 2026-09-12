import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const dir = path.resolve('dist/win-unpacked');
const exe = fs.readdirSync(dir).find((name) => name.toLowerCase().endsWith('.exe'));
const file = path.join(dir, exe);
const data = fs.readFileSync(file);
console.log(JSON.stringify({
  file,
  size: data.length,
  magic: data.subarray(0, 2).toString('ascii'),
  peOffset: data.readUInt32LE(0x3c),
  peMagic: data.subarray(data.readUInt32LE(0x3c), data.readUInt32LE(0x3c) + 4).toString('hex'),
  machine: data.readUInt16LE(data.readUInt32LE(0x3c) + 4).toString(16),
  sha256: crypto.createHash('sha256').update(data).digest('hex'),
}));
const run = spawnSync(file, ['--screenshot'], { cwd: dir, encoding: 'utf8', timeout: 20000 });
console.log(JSON.stringify({ status: run.status, signal: run.signal, error: run.error?.message, stdout: run.stdout, stderr: run.stderr }));
