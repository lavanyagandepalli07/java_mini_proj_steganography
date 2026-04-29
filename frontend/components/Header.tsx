'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase, authEnabled } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

type ThemeMode = 'light' | 'dark';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : prefersDark
      ? 'dark'
      : 'light';

    setTheme(initialTheme as ThemeMode);
    document.documentElement.dataset.theme = initialTheme as string;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }

  useEffect(() => {
    if (!authEnabled || !supabase) {
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      active = false;
      if (listener?.subscription?.unsubscribe) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  async function handleSignOut() {
    if (!authEnabled || !supabase) {
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <header className="site-header">
      <div className="site-brand">
        <Link href="/" className="brand-link">
          <span className="brand-mark">ST</span>
          <span className="brand-text">StegoText</span>
        </Link>
      </div>

      <div className="auth-status">
        {user ? (
          <>
            <span>Signed in as {user.email ?? user.id}</span>
            <button type="button" className="button small" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : null}
      </div>

      <nav className="site-nav">
        <Link href="/" className="nav-link">
          {'\u{1F310}'} ROOT
        </Link>
        <Link href="/login" className="nav-link">
          {authEnabled ? '\u{1F510} VAULT' : '\u{2139}\u{FE0F} INFO'}
        </Link>
        <span className="nav-link" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          {theme === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'} {theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'}
        </span>
      </nav>

    </header>
  );
}
