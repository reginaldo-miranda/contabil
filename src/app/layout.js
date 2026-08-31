import { Inter } from 'next/font/google';
import './globals.css';
import { ContabilProvider } from '../context/ContabilContext';

const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700'] });

export const metadata = {
  title: 'ContábilPro | Sistema de Contabilidade',
  description: 'Sistema de contabilidade com partida dobrada - Plano de Contas, Lançamentos, Livros e Demonstrações',
  lang: 'pt-BR',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ContabilProvider>
          {children}
        </ContabilProvider>
      </body>
    </html>
  );
}
