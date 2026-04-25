import Link from 'next/link';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="hero-luxury" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="hero-content">
            <span className="eyebrow animate-in">🕵️ The Art of Invisible Communication</span>
            <h1 className="animate-in" style={{ animationDelay: '0.1s' }}>
              <span className="gradient-text">Hide Secret Data</span> Inside Ordinary Images.
            </h1>
            <p className="animate-in" style={{ animationDelay: '0.2s', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
              StegoText leverages advanced spatial and frequency-domain steganography to embed your messages into PNG and WAV files—entirely in your browser.
            </p>
            <div className="hero-actions animate-in" style={{ animationDelay: '0.3s', justifyContent: 'center' }}>
              <Link href="/tool?tab=hide" className="button primary">
                🚀 Start Protecting
              </Link>
              <Link href="/login" className="button secondary">
                🔓 Access Account
              </Link>
            </div>
          </div>
        </section>


        <section className="features-grid">
          <Link href="/tool?tab=hide" className="feature-card-link">
            <article>
              <h2>🔐 Zero-Knowledge Crypto</h2>
              <p>Your data is encrypted using PBKDF2 and AES-GCM before it ever touches a pixel. True privacy starts here.</p>
              <span className="feature-cta">Explore Crypto →</span>
            </article>
          </Link>
          <Link href="/tool?tab=hide" className="feature-card-link">
            <article>
              <h2>🖼️ Dual-Format Engine</h2>
              <p>Seamlessly embed secrets into lossless PNG images or high-fidelity WAV audio files without a trace.</p>
              <span className="feature-cta">Try Formats →</span>
            </article>
          </Link>
          <Link href="/tool?tab=analyze" className="feature-card-link">
            <article>
              <h2>🔬 Forensic Analysis</h2>
              <p>Use our LSB noise plane visualizer to detect steganographic anomalies and verify the stealth of your files.</p>
              <span className="feature-cta">Analyze Noise →</span>
            </article>
          </Link>
          <Link href="/tool?tab=hide" className="feature-card-link">
            <article>
              <h2>🛡️ Plausible Deniability</h2>
              <p>Create a second "decoy" layer. If forced to reveal your password, provide the decoy and keep the real secret safe.</p>
              <span className="feature-cta">Learn More →</span>
            </article>
          </Link>
          <Link href="/tool?tab=hide" className="feature-card-link">
            <article>
              <h2>🔥 Self-Destruct Sharing</h2>
              <p>Generate secure share links with "Burn-After-Reading" technology. Files are permanently deleted after the first access.</p>
              <span className="feature-cta">Share Securely →</span>
            </article>
          </Link>
          <Link href="/tool?tab=reveal" className="feature-card-link">
            <article>
              <h2>🎯 Advanced DCT Stealth</h2>
              <p>Use frequency-domain steganography for maximum resistance against statistical analysis and visual inspection.</p>
              <span className="feature-cta">Reveal Secret →</span>
            </article>
          </Link>
        </section>
      </main>
    </div>
  );
}

