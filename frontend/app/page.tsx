import Link from 'next/link';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="hero-card">
          <span className="eyebrow">🕵️ Steganography made simple</span>
          <h1>Hide secret text inside a PNG image — entirely client-side.</h1>
          <p>
            Encrypt messages, embed them in a user-selected image, and download a stego PNG. Reveal mode extracts and decrypts hidden text without any server-side storage.
          </p>
          <div className="hero-actions">
            <Link href="/tool" className="button primary">
              🚀 Try Hide / Reveal
            </Link>
            <Link href="/login" className="button secondary">
              🔓 Sign in
            </Link>
          </div>
        </section>

        <section className="features-grid">
          <article>
            <h2>🔐 Secure browser crypto</h2>
            <p>PBKDF2 and AES-GCM run in the browser using Web Crypto API. Text is encrypted before embedding.</p>
          </article>
          <article>
            <h2>🖼️ PNG & WAV support</h2>
            <p>Embed secrets into PNG images or WAV audio files. Output is losslessly encoded to preserve hidden data.</p>
          </article>
          <article>
            <h2>🔬 Steganalysis built-in</h2>
            <p>Visualize the LSB noise plane of any image to detect whether hidden data is present.</p>
          </article>
          <article>
            <h2>🛡️ Plausible Deniability</h2>
            <p>Embed two messages with two passwords. If forced to reveal, give the decoy — the real secret stays hidden.</p>
          </article>
          <article>
            <h2>🔥 Burn After Reading</h2>
            <p>Generate self-destructing share links. The file deletes itself from the server on first download.</p>
          </article>
          <article>
            <h2>🎯 Auto Algorithm Detection</h2>
            <p>The Reveal tab automatically detects whether LSB or DCT was used — no manual selection needed.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
