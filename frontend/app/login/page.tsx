'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { authEnabled, supabase } from '../../lib/supabaseClient';

type AuthMode = 'choose' | 'signIn' | 'signUp';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>(authEnabled ? 'choose' : 'signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEnabled || !supabase) {
      setStatus('Login is unavailable. Continue as guest to use the tool.');
      setStatusType('error');
      return;
    }
    if (!email || !password) {
      setStatus('Enter both email and password.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      if (mode === 'signUp') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus('Account created! Please check your email to confirm, then sign in.');
        setStatusType('success');
        // Auto-redirect to sign in after 2 seconds
        setTimeout(() => {
          setMode('signIn');
          setEmail('');
          setPassword('');
          setStatus('Account created! You can now sign in.');
          setStatusType('success');
        }, 2000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus('Signed in successfully! Redirecting...');
        setStatusType('success');
        setTimeout(() => { window.location.href = '/tool'; }, 1000);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="auth-card">
          <div className="auth-intro">
            <span className="eyebrow">👋 Welcome to StegoText</span>
            <h1>Secure messages inside images</h1>
            <p>
              Hide and reveal secret text using advanced steganography — entirely in your browser.
            </p>
          </div>

          {/* Status alert */}
          {status && (
            <div className={`status-alert status-alert--${statusType}`} role="status" style={{ marginTop: '1rem' }}>
              <p>{status}</p>
            </div>
          )}

          {/* Mode: Choose Sign In or Sign Up */}
          {mode === 'choose' && (
            <div className="auth-actions" style={{ flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="button primary"
                style={{ width: '100%' }}
                onClick={() => { setMode('signIn'); setStatus(''); }}
              >
                🔓 Sign In
              </button>
              <button
                type="button"
                className="button secondary"
                style={{ width: '100%' }}
                onClick={() => { setMode('signUp'); setStatus(''); }}
              >
                ✨ Create Account
              </button>
              <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <Link href="/tool" className="nav-link" style={{ fontSize: '0.9rem' }}>
                  👤 Continue as Guest →
                </Link>
              </div>
            </div>
          )}

          {/* Mode: Sign In */}
          {mode === 'signIn' && (
            <form className="panel-form" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', color: 'var(--accent-strong)' }}>🔓 Sign In</h3>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={loading}
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Signing in...' : '🔓 Sign In'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setMode('choose'); setStatus(''); setEmail(''); setPassword(''); }}>
                  ← Back
                </button>
                <button type="button" className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => { setMode('signUp'); setStatus(''); setEmail(''); setPassword(''); }}>
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* Mode: Sign Up */}
          {mode === 'signUp' && (
            <form className="panel-form" onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', color: 'var(--accent-strong)' }}>✨ Create Account</h3>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  required
                  disabled={loading}
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? '⏳ Creating account...' : '✨ Create Account'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setMode('choose'); setStatus(''); setEmail(''); setPassword(''); }}>
                  ← Back
                </button>
                <button type="button" className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => { setMode('signIn'); setStatus(''); setEmail(''); setPassword(''); }}>
                  Already have an account?
                </button>
              </div>
            </form>
          )}

          {/* Fallback: auth not enabled */}
          {!authEnabled && (
            <div className="panel-form" style={{ marginTop: '1.5rem' }}>
              <p>Login is currently unavailable. You can proceed to the StegoText tool immediately.</p>
              <div className="form-actions">
                <Link href="/tool" className="button primary">Start using StegoText</Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
