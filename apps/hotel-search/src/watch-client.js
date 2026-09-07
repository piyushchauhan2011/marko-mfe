const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { buildClientBundle } = require('./build-client');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(true));
    tester.once('listening', () => {
      tester.close(() => resolve(false));
    });

    tester.listen(port, '127.0.0.1');
  });
}

async function startServer() {
  const port = Number(process.env.PORT || 3102);

  if (await isPortInUse(port)) {
    console.log(`Port ${port} already in use; skipping hotel-search server restart.`);
    return null;
  }

  const server = spawn(process.execPath, ['--watch', 'src/server.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });

  server.on('exit', (code) => {
    if (code !== 0) {
      process.exit(code ?? 1);
    }
  });

  return server;
}

function watchAndSync() {
  buildClientBundle();

  const appDir = path.resolve(__dirname, '..');
  let timer;

  const scheduleBundle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildClientBundle();
    }, 150);
  };

  fs.watch(appDir, { recursive: true }, (eventType, filename) => {
    if (
      !filename ||
      filename.startsWith('src/.generated/') ||
      filename.includes('/.generated/') ||
      !/\.(js|marko|json|css)$/.test(filename)
    ) {
      return;
    }
    scheduleBundle();
  });

  console.log(`Watching ${appDir} for Marko client updates...`);
}

startServer();
watchAndSync();
