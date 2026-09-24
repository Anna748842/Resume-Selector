const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const serverDir = path.join(rootDir, 'server');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

function ensureMongoDataDir() {
  const dataDir = 'C:/data/db';
  fs.mkdirSync(dataDir, { recursive: true });
}

function findMongoExecutable() {
  const candidates = [
    'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe',
    'C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe',
    'C:/Program Files/MongoDB/Server/7.0/bin/mongod.exe',
    'C:/Program Files/MongoDB/Server/6.0/bin/mongod.exe',
    'mongod'
  ];

  return candidates.find((candidate) => {
    if (candidate === 'mongod') {
      return true;
    }

    return fs.existsSync(candidate);
  });
}

async function start() {
  try {
    ensureMongoDataDir();

    const mongoExecutable = findMongoExecutable();

    if (mongoExecutable) {
      const mongoArgs = mongoExecutable === 'mongod'
        ? ['--dbpath', 'C:/data/db', '--logpath', 'C:/data/mongodb.log', '--bind_ip', '127.0.0.1']
        : [
            '--dbpath', 'C:/data/db',
            '--logpath', 'C:/data/mongodb.log',
            '--bind_ip', '127.0.0.1'
          ];

      const mongo = spawn(mongoExecutable, mongoArgs, {
        stdio: 'ignore',
        detached: true,
        shell: process.platform === 'win32' && mongoExecutable !== 'mongod'
      });

      mongo.unref();
      console.log('MongoDB started on localhost');
    } else {
      console.log('MongoDB executable not found. Please ensure MongoDB is installed and available on PATH.');
    }

    console.log('Starting backend...');
    const backend = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    console.log('Starting frontend...');
    const frontend = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', '--host', '0.0.0.0'], {
      cwd: clientDir,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    backend.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Backend exited with code ${code}`);
      }
    });

    frontend.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Frontend exited with code ${code}`);
      }
    });

    console.log('Application started. Open http://localhost:5173');
  } catch (error) {
    console.error('Failed to start app:', error.message);
    process.exit(1);
  }
}

start();
