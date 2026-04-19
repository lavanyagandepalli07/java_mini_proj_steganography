'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { authEnabled, supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(
    authEnabled
      ? 'Welcome! Sign in or sign up to access optional account features.'
      : 'Login is unavailable. Continue as guest to start hiding and revealing messages.'
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEnabled || !supabase) {
      setStatus('Login is unavailable. Continue as guest to use the tool.');
      return;
    }
    if (!email || !password) {
      setStatus('Enter both email and password.');
      return;
    }

    setLoading(true);
    setStatus(mode === 'signUp' ? 'Creating your account...' : 'Signing you in...');

    try {
      if (mode === 'signUp') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus('Sign-up requested. Check your email for confirmation.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus('Signed in successfully.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
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
            <p className="eyebrow">Welcome</p>
            <h1>Secure messages inside images</h1>
            <p>
              StegoText lets you hide and reveal secret text using image steganography. Login is optional — guest mode keeps the core tool available instantly.
            </p>
          </div>

          <p>{status}</p>

          {authEnabled ? (
            <form className="panel-form" onSubmit={handleSubmit}>
              <div className="toggle-row">
                <button
                  type="button"
                  className={mode === 'signIn' ? 'tab active' : 'tab'}
                  onClick={() => setMode('signIn')}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === 'signUp' ? 'tab active' : 'tab'}
                  onClick={() => setMode('signUp')}
                >
                  Sign up
                </button>
              </div>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a secure password"
                  required
                />
              </label>

              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading}>
                  {loading ? 'Working...' : mode === 'signUp' ? 'Create account' : 'Sign in'}
                </button>
                <Link href="/tool" className="button secondary">
                  Continue as guest
                </Link>
              </div>
            </form>
          ) : (
            <div className="panel-form">
              <p>
                Login is currently unavailable. You can proceed to the StegoText tool immediately in guest mode.
              </p>
              <div className="form-actions">
                <Link href="/tool" className="button primary">
                  Continue as guest
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
