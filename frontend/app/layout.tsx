import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';

const mono = JetBrains_Mono({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StegoText - Hide and reveal messages in PNGs',
  description: 'Client-side steganography and encryption in the browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.className}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (!theme) theme = 'light';
                  document.documentElement.dataset.theme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}



