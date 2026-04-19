'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import StatusAlert from '../../components/StatusAlert';
import { encrypt, decrypt } from '../../lib/crypto';
import { embed, extract } from '../../lib/stego';

const tabs = ['Hide', 'Reveal'] as const;

type Tab = (typeof tabs)[number];

export default function ToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Hide');
  const [status, setStatus] = useState('Ready to hide or reveal a message.');
  const [loading, setLoading] = useState(false);
  const [hideText, setHideText] = useState('');
  const [hidePassword, setHidePassword] = useState('');
  const [hideImage, setHideImage] = useState<File | null>(null);
  const [revealImage, setRevealImage] = useState<File | null>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealedText, setRevealedText] = useState('');

  const handleHide = async () => {
    if (!hideImage || !hideText.trim()) {
      setStatus('Please provide both an image and text to hide.');
      return;
    }

    setLoading(true);
    setStatus('Encrypting and embedding...');

    try {
      // Encrypt the text
      const encrypted = await encrypt(hideText, hidePassword || '');
      if (!encrypted.success) {
        throw new Error(encrypted.error);
      }

      // Embed encrypted data into image
      const result = await embed(hideImage, encrypted.payload);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Download the modified image
      const url = URL.createObjectURL(result.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stego.png';
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Success! Stego image downloaded as stego.png');

    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!revealImage) {
      setStatus('Please select a stego image.');
      return;
    }

    setLoading(true);
    setStatus('Extracting and decrypting...');

    try {
      // Extract data from image
      const result = await extract(revealImage);
      if (!result.success) {
        throw new Error(result.error === 'NO_PAYLOAD' ? 'No hidden data found in image.' : 'Failed to extract data from image.');
      }

      // Decrypt
      const decrypted = await decrypt(result.data as Uint8Array, revealPassword || '');
      if (!decrypted.success) {
        throw new Error(decrypted.error);
      }
      const decoder = new TextDecoder();
      setRevealedText(decoder.decode(decrypted.payload));
      setStatus('Success! Message extracted and decrypted.');

    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRevealedText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <section className="tool-headline">
          <h1>Hide & reveal secret text</h1>
          <p>Choose a mode, follow the instructions, and work with PNG stego images entirely in the browser.</p>
        </section>

        <div className="tab-list" role="tablist" aria-label="Tool modes">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={activeTab === tab ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="tool-panel">
          <StatusAlert message={status} loading={loading} />

          {activeTab === 'Hide' ? (
            <form className="panel-form" onSubmit={(event) => { event.preventDefault(); handleHide(); }}>
              <label>
                Secret text
                <textarea
                  rows={6}
                  placeholder="Enter the message to hide"
                  aria-label="Secret text"
                  value={hideText}
                  onChange={(e) => setHideText(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  placeholder="Optional password"
                  aria-label="Password"
                  value={hidePassword}
                  onChange={(e) => setHidePassword(e.target.value)}
                />
              </label>
              <label>
                Cover image
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Cover image"
                  onChange={(e) => setHideImage(e.target.files?.[0] || null)}
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading}>
                  Encrypt and download PNG
                </button>
              </div>
            </form>
          ) : (
            <form className="panel-form" onSubmit={(event) => { event.preventDefault(); handleReveal(); }}>
              <label>
                Stego image
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Stego image"
                  onChange={(e) => setRevealImage(e.target.files?.[0] || null)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  placeholder="Password used during hiding"
                  aria-label="Password"
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                />
              </label>
              {revealedText && (
                <label>
                  Extracted text
                  <textarea rows={6} value={revealedText} readOnly aria-label="Extracted text" />
                </label>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading}>
                  Extract and decrypt text
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
