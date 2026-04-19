'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase, authEnabled } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

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
      listener.subscription.unsubscribe();
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

      <nav className="site-nav">
        <Link href="/tool" className="nav-link">
          Tool
        </Link>
        <Link href="/login" className="nav-link">
          {authEnabled ? 'Sign in' : 'Login info'}
        </Link>
      </nav>

      <div className="auth-status">
        {user ? (
          <>
            <span>Signed in as {user.email ?? user.id}</span>
            <button type="button" className="button small" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <span>Guest mode enabled</span>
        )}
      </div>
    </header>
  );
}
