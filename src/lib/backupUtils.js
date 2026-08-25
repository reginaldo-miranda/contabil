import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function parseDatabaseUrl() {
  const url = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/contabil';
  try {
    let clean = url.replace(/^(mysql|mariadb):\/\//, '');
    const slashIdx = clean.lastIndexOf('/');
    let database = 'contabil';
    let hostPortUserPass = clean;
    if (slashIdx !== -1) {
      database = clean.substring(slashIdx + 1).split('?')[0];
      hostPortUserPass = clean.substring(0, slashIdx);
    }

    const atIdx = hostPortUserPass.lastIndexOf('@');
    let userPass = 'root:root';
    let hostPort = 'localhost:3306';
    if (atIdx !== -1) {
      userPass = hostPortUserPass.substring(0, atIdx);
      hostPort = hostPortUserPass.substring(atIdx + 1);
    }

    let user = 'root';
    let password = '';
    const colonIdx = userPass.indexOf(':');
    if (colonIdx !== -1) {
      user = userPass.substring(0, colonIdx);
      password = userPass.substring(colonIdx + 1);
    } else {
      user = userPass;
    }

    let host = 'localhost';
    let port = '3306';
    if (hostPort.includes(':')) {
      const [h, p] = hostPort.split(':');
      host = h || 'localhost';
      port = p || '3306';
    } else {
      host = hostPort || 'localhost';
    }

    return {
      host: decodeURIComponent(host),
      port: decodeURIComponent(port),
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      database: decodeURIComponent(database),
    };
  } catch (err) {
    console.error('Erro ao analisar DATABASE_URL:', err);
    return { host: 'localhost', port: '3306', user: 'root', password: '', database: 'contabil' };
  }
}

export function getBackupsDir() {
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

export function findExecutable(execName) {
  const isWindows = process.platform === 'win32';
  const targetExec = isWindows ? `${execName}.exe` : execName;

  const candidatePaths = [
    // MySQL Workbench
    `C:\\Program Files\\MySQL\\MySQL Workbench 8.0 CE\\${targetExec}`,
    `C:\\Program Files\\MySQL\\MySQL Workbench 8.4 CE\\${targetExec}`,
    // MariaDB
    `C:\\Program Files\\MariaDB 11.4\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 11.3\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 11.2\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 11.1\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 11.0\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 10.11\\bin\\${targetExec}`,
    `C:\\Program Files\\MariaDB 10.5\\bin\\${targetExec}`,
    // MySQL Server
    `C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\${targetExec}`,
    `C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\${targetExec}`,
    `C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\${targetExec}`,
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return targetExec;
}

export function formatBackupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `backup_${day}-${month}-${year}_${hours}-${minutes}-${seconds}.sql`;
}

export function runBackup(binPath, dbConfig, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', dbConfig.host,
      '-P', String(dbConfig.port),
      '-u', dbConfig.user,
      `--password=${dbConfig.password}`,
      '--default-character-set=utf8mb4',
      '--routines',
      '--triggers',
      dbConfig.database
    ];

    const child = spawn(binPath, args);
    const writeStream = fs.createWriteStream(outputPath);

    child.stdout.pipe(writeStream);

    let stderrData = '';
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`mysqldump falhou com código ${code}: ${stderrData}`));
      }
    });
  });
}

export function runRestore(binPath, dbConfig, inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', dbConfig.host,
      '-P', String(dbConfig.port),
      '-u', dbConfig.user,
      `--password=${dbConfig.password}`,
      '--default-character-set=utf8mb4',
      dbConfig.database
    ];

    const child = spawn(binPath, args);
    const readStream = fs.createReadStream(inputPath);

    readStream.pipe(child.stdin);

    let stderrData = '';
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`mysql restore falhou com código ${code}: ${stderrData}`));
      }
    });
  });
}
