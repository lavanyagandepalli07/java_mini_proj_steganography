import Link from 'next/link';

export default function Home() {
  return (
    <main className="content-shell">
      <section className="hero-luxury" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="hero-content">
          <span className="eyebrow animate-in">{'\u{1F575}\u{FE0F}'} :: PROTOCOL_OMEGA | INVISIBLE COMMUNICATION</span>
          <h1 className="animate-in" style={{ animationDelay: '0.1s' }}>
            <span className="gradient-text">Securely Hide Messages</span> Inside Images.
          </h1>
          <p className="animate-in" style={{ animationDelay: '0.2s', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
            StegoText leverages advanced spatial and frequency-domain steganography to embed your messages into PNG and WAV files - entirely in your browser.
          </p>
          <div className="hero-actions animate-in" style={{ animationDelay: '0.3s', justifyContent: 'center' }}>
            <Link href="/tool?tab=hide" className="button primary">
              {'\u{1F47E}'} START HIDING
            </Link>
            <Link href="/login" className="button secondary">
              {'\u{1F510}'} SIGN IN
            </Link>
          </div>
        </div>
      </section>

      <section className="features-grid">
        <Link href="/tool?tab=hide" className="feature-card-link">
          <article>
            <h2>{'\u{1F512}'} SECURE ENCRYPTION</h2>
            <p>Your data is encrypted using PBKDF2 and AES-GCM before it ever touches a pixel. True privacy starts here.</p>
            <span className="feature-cta">Explore Crypto {'\u{2192}'}</span>
          </article>
        </Link>
        <Link href="/tool?tab=hide" className="feature-card-link">
          <article>
            <h2>{'\u{1F4C1}'} IMAGE & AUDIO</h2>
            <p>Seamlessly embed secrets into lossless PNG images or high-fidelity WAV audio files without a trace.</p>
            <span className="feature-cta">Try Formats {'\u{2192}'}</span>
          </article>
        </Link>
        <Link href="/tool?tab=analyze" className="feature-card-link">
          <article>
            <h2>{'\u{1F4E1}'} IMAGE ANALYSIS</h2>
            <p>Use our LSB noise plane visualizer to detect steganographic anomalies and verify the stealth of your files.</p>
            <span className="feature-cta">Analyze Noise {'\u{2192}'}</span>
          </article>
        </Link>
        <Link href="/tool?tab=hide" className="feature-card-link">
          <article>
            <h2>{'\u{1F3AD}'} DECOY MESSAGES</h2>
            <p>Create a second "decoy" layer. If forced to reveal your password, provide the decoy and keep the real secret safe.</p>
            <span className="feature-cta">Learn More {'\u{2192}'}</span>
          </article>
        </Link>
        <Link href="/tool?tab=hide" className="feature-card-link">
          <article>
            <h2>{'\u{2622}\u{FE0F}'} SECURE SHARING</h2>
            <p>Generate secure share links with "Burn-After-Reading" technology. Files are permanently deleted after the first access.</p>
            <span className="feature-cta">Share Securely {'\u{2192}'}</span>
          </article>
        </Link>
        <Link href="/tool?tab=reveal" className="feature-card-link">
          <article>
            <h2>{'\u{1F575}\u{FE0F}'} ADVANCED STEALTH</h2>
            <p>Use frequency-domain steganography for maximum resistance against statistical analysis and visual inspection.</p>
            <span className="feature-cta">Reveal Secret {'\u{2192}'}</span>
          </article>
        </Link>
      </section>
    </main>
  );
}
