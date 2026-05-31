import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Plaintiff Filing Readiness Analyzer',
  description: 'AI-assisted plaintiff litigation intake and filing-readiness platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-gray-900 tracking-tight">
              Filing Readiness
            </Link>
            <nav>
              <Link href="/matters" className="text-sm text-gray-600 hover:text-gray-900">
                Matters
              </Link>
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
