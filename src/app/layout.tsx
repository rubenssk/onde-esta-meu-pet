import './globals.css';
import type { Metadata, Viewport } from 'next';
import LocationSync from '@/components/LocationSync';

export const metadata: Metadata = {
  title: 'Onde Está Meu Pet?',
  description: 'Vizinhos ajudando pets perdidos a voltarem para casa.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Meu Pet', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#ff6b35', width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><main className="app">{children}</main><LocationSync /></body>
    </html>
  );
}
