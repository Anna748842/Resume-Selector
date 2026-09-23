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

async function start() {
  try {
    ensureMongoDataDir();

    const mongoExecutable = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
    const mongoExists = fs.existsSync(mongoExecutable);

    if (mongoExists) {
      const mongo = spawn(mongoExecutable, [
        '--dbpath', 'C:/data/db',
        '--logpath', 'C:/data/mongodb.log',
        '--bind_ip', '127.0.0.1'
      ], { stdio: 'ignore', detached: true });

      mongo.unref();
      console.log('MongoDB started on localhost');
    } else {
      console.log('MongoDB executable not found at default install path. Please ensure MongoDB is installed.');
    }

    console.log('Starting backend...');
    const backend = spawn('npm.cmd', ['run', 'start'], {
      cwd: serverDir,
      stdio: 'inherit',
      shell: true,
    });

    console.log('Starting frontend...');
    const frontend = spawn('npm.cmd', ['run', 'dev', '--', '--host', '0.0.0.0'], {
      cwd: clientDir,
      stdio: 'inherit',
      shell: true,
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
