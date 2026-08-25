import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getBackupsDir } from '../../../../../lib/backupUtils';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;

    // Prevenção contra Directory Traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename.endsWith('.sql')) {
      return NextResponse.json(
        { error: 'Nome de arquivo inválido.' },
        { status: 400 }
      );
    }

    const backupsDir = getBackupsDir();
    const filePath = path.join(backupsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Arquivo de backup não encontrado.' },
        { status: 404 }
      );
    }

    const fileStream = fs.readFileSync(filePath);

    return new NextResponse(fileStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao realizar download do backup:', error);
    return NextResponse.json(
      { error: 'Erro ao baixar arquivo de backup.' },
      { status: 500 }
    );
  }
}
