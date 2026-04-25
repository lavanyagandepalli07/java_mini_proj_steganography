'use client';

import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'transparent', width: '0%' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Very Weak', color: '#ff4d4f', width: '20%' };
    if (score === 2) return { score, label: 'Weak', color: '#ff7a45', width: '40%' };
    if (score === 3) return { score, label: 'Fair', color: '#ffc53d', width: '60%' };
    if (score === 4) return { score, label: 'Strong', color: '#73d13d', width: '80%' };
    return { score, label: 'Very Strong', color: '#52c41a', width: '100%' };
  }, [password]);

  if (!password) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>Strength: {strength.label}</span>
      </div>
      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: strength.width,
            backgroundColor: strength.color,
            transition: 'width 0.3s ease, background-color 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}
