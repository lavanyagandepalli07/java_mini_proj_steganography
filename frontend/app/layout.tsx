import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StegoText - Hide and reveal messages in PNGs',
  description: 'Client-side steganography and encryption in the browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
