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
  const port = Number(process.env.PORT || 3108);

  if (await isPortInUse(port)) {
    console.log(`Port ${port} already in use; skipping experiences-itinerary server restart.`);
    return null;
  }

  const server = spawn(process.execPath, ['src/server.js'], {
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
  buildClientBundle().catch((error) => {
    console.error('Failed to build experiences-itinerary client bundle.', error);
    process.exit(1);
  });

  const appDir = path.resolve(__dirname, '..');
  let timer;

  const scheduleBundle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildClientBundle().catch((error) => {
        console.error('Failed to rebuild experiences-itinerary client bundle.', error);
      });
    }, 150);
  };

  fs.watch(appDir, { recursive: true }, (eventType, filename) => {
    if (!filename || !/\.(js|json|riot|css)$/.test(filename)) {
      return;
    }
    scheduleBundle();
  });

  console.log(`Watching ${appDir} for Riot client updates...`);
}

startServer();
watchAndSync();
