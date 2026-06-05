import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitHub Explorer',
  description: 'Search GitHub profiles and analyze repository metrics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}