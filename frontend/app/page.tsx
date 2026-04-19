import Link from 'next/link';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="hero-card">
          <span className="eyebrow">Steganography made simple</span>
          <h1>Hide secret text inside a PNG image — entirely client-side.</h1>
          <p>
            Encrypt messages, embed them in a user-selected image, and download a stego PNG. Reveal mode extracts and decrypts hidden text without any server-side storage.
          </p>
          <div className="hero-actions">
            <Link href="/tool" className="button primary">
              Try Hide / Reveal
            </Link>
            <Link href="/login" className="button secondary">
              Sign in
            </Link>
          </div>
        </section>

        <section className="features-grid">
          <article>
            <h2>Secure browser crypto</h2>
            <p>PBKDF2 and AES-GCM run in the browser using Web Crypto API. Text is encrypted before embedding.</p>
          </article>
          <article>
            <h2>PNG output only</h2>
            <p>PNG is used for reliability. JPEG or recompression may break hidden data.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
