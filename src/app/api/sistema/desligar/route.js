import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    const isWindows = process.platform === 'win32';
    const scriptPath = path.resolve(process.cwd(), isWindows ? 'parar_sistema.bat' : 'parar_sistema.sh');

    // Disparar o desligamento apos 1.5s para garantir que o navegador receba a resposta HTTP de sucesso
    setTimeout(() => {
      try {
        if (isWindows) {
          const proc = spawn('cmd.exe', ['/c', scriptPath, '--no-pause'], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd(),
          });
          proc.unref();
        } else {
          const proc = spawn('bash', [scriptPath], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd(),
          });
          proc.unref();
        }
      } catch (err) {
        console.error('Erro ao executar encerramento do sistema:', err);
      }
    }, 1500);

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Comando de encerramento recebido. O sistema e os serviços locais estão sendo finalizados.',
    });
  } catch (error) {
    console.error('Erro na API de encerramento do sistema:', error);
    return NextResponse.json(
      { erro: 'Falha ao processar o desligamento do sistema.' },
      { status: 500 }
    );
  }
}
