'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import StatusAlert from '../../components/StatusAlert';
import { encrypt, decrypt } from '../../lib/crypto';
import { embed, extract, calculateCapacity, Algorithm } from '../../lib/stego';

const tabs = ['Hide', 'Reveal'] as const;

type Tab = (typeof tabs)[number];

type ImageInfo = {
  name: string;
  width: number;
  height: number;
};

export default function ToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Hide');
  const [algorithm, setAlgorithm] = useState<Algorithm>('lsb');
  const [status, setStatus] = useState('Ready to hide or reveal a message.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  
  const [hideText, setHideText] = useState('');
  const [hidePassword, setHidePassword] = useState('');
  const [hideImage, setHideImage] = useState<File | null>(null);
  const [hideImageInfo, setHideImageInfo] = useState<ImageInfo | null>(null);
  
  const [revealImage, setRevealImage] = useState<File | null>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealedText, setRevealedText] = useState('');

  const loadImageInfo = (file: File): Promise<ImageInfo> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ name: file.name, width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read the selected image.'));
      };

      img.src = objectUrl;
    });
  };

  const handleHideImageChange = async (file: File | null) => {
    setHideImage(file);
    setHideImageInfo(null);
    setStatusType('info');

    if (!file) {
      setStatus('Ready to hide or reveal a message.');
      return;
    }

    setLoading(true);
    setStatus('Reading cover image details...');

    try {
      const info = await loadImageInfo(file);
      setHideImageInfo(info);
      setStatus(`Cover image loaded: ${info.width}×${info.height}px.`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to load image.'}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevealImageChange = (file: File | null) => {
    setRevealImage(file);
    setRevealedText('');
    setStatus('Ready to reveal a message.');
    setStatusType('info');
  };

  const handleHide = async () => {
    if (!hideImage || !hideText.trim()) {
      setStatus('Please provide both an image and text to hide.');
      setStatusType('error');
      return;
    }

    if (algorithm === 'dct' && !hidePassword) {
      setStatus('Password is required for Advanced (DCT) mode.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatus('Encrypting and embedding...');
    setStatusType('info');

    try {
      const encrypted = await encrypt(hideText, hidePassword || '');
      if (!encrypted.success) {
        throw new Error(encrypted.error);
      }

      const result = await embed(hideImage, encrypted.payload, algorithm, hidePassword);
      if (!result.success) {
        throw new Error(result.error);
      }

      const url = URL.createObjectURL(result.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stego.png';
      a.click();
      URL.revokeObjectURL(url);

      setStatus('Success! Stego image downloaded as stego.png. Keep the password safe if used.');
      setStatusType('success');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!revealImage) {
      setStatus('Please select a stego image.');
      setStatusType('error');
      return;
    }

    if (algorithm === 'dct' && !revealPassword) {
      setStatus('Password is required for Advanced (DCT) mode.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatus('Extracting and decrypting...');
    setStatusType('info');

    try {
      const result = await extract(revealImage, algorithm, revealPassword);
      if (!result.success) {
        const message = result.error === 'NO_PAYLOAD' ? 'No hidden data found in image.' : 'Failed to extract hidden data.';
        throw new Error(message);
      }

      const decrypted = await decrypt(result.data as Uint8Array, revealPassword || '');
      if (!decrypted.success) {
        throw new Error(decrypted.error);
      }

      const decoder = new TextDecoder();
      setRevealedText(decoder.decode(decrypted.payload));
      setStatus('Success! Message extracted and decrypted.');
      setStatusType('success');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatusType('error');
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
          <StatusAlert message={status} loading={loading} variant={statusType} />
          
          <div className="algorithm-selector" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--gray-900)', borderRadius: 'var(--radius)' }}>
            <label style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0 }}>
              <strong>Algorithm:</strong>
              <select 
                value={algorithm} 
                onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                disabled={loading}
                style={{ flex: 1 }}
              >
                <option value="lsb">Standard (Spatial LSB) - High Capacity</option>
                <option value="dct">Advanced (Randomized DCT) - High Security</option>
              </select>
            </label>
            {algorithm === 'dct' && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                Advanced mode scatters data in the frequency domain. It is highly secure but has much lower capacity. <strong style={{color: 'var(--red-500)'}}>A password is required.</strong>
              </p>
            )}
          </div>

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
                  disabled={loading}
                />
              </label>
              <label>
                Password {algorithm === 'dct' && <span style={{ color: 'var(--red-500)' }}>*</span>}
                <input
                  type="password"
                  placeholder={algorithm === 'dct' ? "Required for DCT mode" : "Optional password"}
                  aria-label="Password"
                  value={hidePassword}
                  onChange={(e) => setHidePassword(e.target.value)}
                  disabled={loading}
                  required={algorithm === 'dct'}
                />
                <small>{algorithm === 'dct' ? 'Required to securely scatter the payload.' : 'Leave blank to embed without a password.'}</small>
              </label>
              <label>
                Cover image
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Cover image"
                  onChange={(e) => handleHideImageChange(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
              {hideImageInfo && (
                <div className="image-summary">
                  <p><strong>{hideImageInfo.name}</strong></p>
                  <p>{hideImageInfo.width} × {hideImageInfo.height} px</p>
                  <p>Estimated payload capacity: {calculateCapacity(hideImageInfo.width, hideImageInfo.height, algorithm)} bytes</p>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading || !hideImage || !hideText.trim() || (algorithm === 'dct' && !hidePassword)}>
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
                  onChange={(e) => handleRevealImageChange(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
              <label>
                Password {algorithm === 'dct' && <span style={{ color: 'var(--red-500)' }}>*</span>}
                <input
                  type="password"
                  placeholder={algorithm === 'dct' ? "Required for DCT mode" : "Password used during hiding"}
                  aria-label="Password"
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                  disabled={loading}
                  required={algorithm === 'dct'}
                />
                <small>{algorithm === 'dct' ? 'Required to locate the scattered payload.' : 'Leave blank if the message was hidden without a password.'}</small>
              </label>
              {revealedText && (
                <label>
                  Extracted text
                  <textarea rows={6} value={revealedText} readOnly aria-label="Extracted text" />
                </label>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading || !revealImage || (algorithm === 'dct' && !revealPassword)}>
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
