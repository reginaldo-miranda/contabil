import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  parseDatabaseUrl,
  getBackupsDir,
  findExecutable,
  formatBackupFileName,
  runBackup,
} from '../../../lib/backupUtils';

export async function GET() {
  try {
    const backupsDir = getBackupsDir();
    const files = fs.readdirSync(backupsDir);

    const backups = files
      .filter((file) => file.endsWith('.sql'))
      .map((filename) => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime || stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    return NextResponse.json(
      { error: 'Erro ao obter a lista de backups.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const dbConfig = parseDatabaseUrl();
    const dumpBin = findExecutable('mysqldump');
    const backupsDir = getBackupsDir();
    const filename = formatBackupFileName();
    const outputPath = path.join(backupsDir, filename);

    await runBackup(dumpBin, dbConfig, outputPath);

    const stats = fs.statSync(outputPath);

    return NextResponse.json({
      message: 'Backup criado com sucesso!',
      backup: {
        filename,
        size: stats.size,
        createdAt: stats.birthtime || stats.mtime,
      },
    });
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar o backup do banco de dados.' },
      { status: 500 }
    );
  }
}
