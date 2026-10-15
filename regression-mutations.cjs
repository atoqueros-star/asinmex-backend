const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const cases = [
 ['server.js', 'if (time < providerBlockedUntil)', 'if (false)', 'server.test.js', 'provider backoff'],
 ['replyPolicy.js', "response?.candidates?.[0]?.finishReason !== 'STOP'", 'false', 'replyPolicy.test.js', 'truncated output'],
 ['server.js', 'history.length > 12', 'false', 'server.test.js', 'history size'],
 ['server.js', 'if (!configured()) return', 'if (false) return', 'server.test.js', 'missing configuration'],
];
let failed = false;
for (const [file, original, mutation, test, label] of cases) {
 const saved = fs.readFileSync(file, 'utf8');
 if (!saved.includes(original)) throw new Error('Mutation target missing: ' + label);
 try {
  fs.writeFileSync(file, saved.replace(original, mutation));
  const result = spawnSync(process.execPath, ['--test', test], { encoding: 'utf8' });
  console.log(label + ': exit=' + result.status);
  console.log(result.stdout.split('\n').filter(line => /fail |✖/.test(line)).join('\n'));
  if (result.status === 0 || result.status === null) failed = true;
 } finally { fs.writeFileSync(file, saved); }
}
process.exitCode = failed ? 1 : 0;
