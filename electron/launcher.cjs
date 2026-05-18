const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  env,
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..')
});

child.on('close', (code) => process.exit(code || 0));
child.on('error', (err) => { console.error(err); process.exit(1); });
