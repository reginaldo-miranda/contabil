import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700'] });

export const metadata = {
  title: 'Sistema Contábil | Plano de Contas',
  description: 'Sistema de contabilidade para escritórios - Gestão do Plano de Contas',
  lang: 'pt-BR',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
