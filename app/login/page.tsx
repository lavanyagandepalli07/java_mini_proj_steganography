import Link from 'next/link';
import Header from '../../components/Header';

export default function LoginPage() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="auth-card">
          <h1>Sign in or continue as guest</h1>
          <p>Authentication is optional. Core steganography functions work without login.</p>
          <div className="auth-actions">
            <Link href="/tool" className="button primary">
              Continue as guest
            </Link>
            <button type="button" className="button secondary" disabled>
              Sign in (coming soon)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
