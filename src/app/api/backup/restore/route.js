import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  parseDatabaseUrl,
  getBackupsDir,
  findExecutable,
  runRestore,
} from '../../../../lib/backupUtils';

export async function POST(request) {
  let tempFilePath = null;
  try {
    const contentType = request.headers.get('content-type') || '';
    const dbConfig = parseDatabaseUrl();
    const mysqlBin = findExecutable('mysql');
    const backupsDir = getBackupsDir();
    let targetFilePath = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json(
          { error: 'Nenhum arquivo de backup enviado.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeUploadName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '');
      const tempFilename = `uploaded_${Date.now()}_${safeUploadName}`;
      targetFilePath = path.join(backupsDir, tempFilename);
      tempFilePath = targetFilePath;

      fs.writeFileSync(targetFilePath, buffer);
    } else {
      const body = await request.json();
      const filename = body.filename;

      if (!filename) {
        return NextResponse.json(
          { error: 'Nome do arquivo de backup não informado.' },
          { status: 400 }
        );
      }

      const safeFilename = path.basename(filename);
      targetFilePath = path.join(backupsDir, safeFilename);

      if (!fs.existsSync(targetFilePath)) {
        return NextResponse.json(
          { error: 'Arquivo de backup não encontrado no servidor.' },
          { status: 404 }
        );
      }
    }

    await runRestore(mysqlBin, dbConfig, targetFilePath);

    return NextResponse.json({
      message: 'Banco de dados restaurado com sucesso!',
    });
  } catch (error) {
    console.error('Erro na restauração do backup:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao restaurar o banco de dados.' },
      { status: 500 }
    );
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Erro ao limpar arquivo temporário:', err);
      }
    }
  }
}
