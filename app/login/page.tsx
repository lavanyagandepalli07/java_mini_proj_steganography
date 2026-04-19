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
      ? 'Sign in or sign up to enable optional auth. Guest mode still works.'
      : 'Supabase auth is not configured. Continue as guest.'
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authEnabled || !supabase) {
      setStatus('Authentication is disabled. Continue as guest.');
      return;
    }
    if (!email || !password) {
      setStatus('Enter both email and password.');
      return;
    }

    setLoading(true);
    setStatus('Processing authentication...');

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
          <h1>Optional Supabase login</h1>
          <p>{status}</p>

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
                placeholder="Choose a strong password"
                required
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="button primary" disabled={!authEnabled || loading}>
                {loading ? 'Working...' : mode === 'signUp' ? 'Create account' : 'Sign in'}
              </button>
              <Link href="/tool" className="button secondary">
                Continue as guest
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
