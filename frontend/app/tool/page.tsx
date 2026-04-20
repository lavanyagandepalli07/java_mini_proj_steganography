'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import StatusAlert from '../../components/StatusAlert';
import { encrypt, decrypt } from '../../lib/crypto';
import { embed, extract, calculateCapacity, Algorithm, embedDeniable } from '../../lib/stego';
import { embedAudio, extractAudio, calculateAudioCapacity } from '../../lib/stego-audio';
import { generateLsbMask } from '../../lib/analysis';
import { uploadStego, downloadStego, authEnabled, deleteStego } from '../../lib/supabaseClient';

const tabs = ['Hide', 'Reveal', 'Analyze'] as const;
type Tab = (typeof tabs)[number];

type FileInfo = {
  name: string;
  isAudio: boolean;
  width?: number;
  height?: number;
  capacity?: number;
};

export default function ToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Hide');
  const [algorithm, setAlgorithm] = useState<Algorithm>('lsb');
  const [status, setStatus] = useState('Ready.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  
  // Hide State
  const [hideText, setHideText] = useState('');
  const [hidePassword, setHidePassword] = useState('');
  const [hideFile, setHideFile] = useState<File | null>(null);
  const [hideFileInfo, setHideFileInfo] = useState<FileInfo | null>(null);
  const [lastStegoBlob, setLastStegoBlob] = useState<{blob: Blob, ext: string} | null>(null);
  const [shareLink, setShareLink] = useState('');
  
  // Deniable State
  const [isDeniable, setIsDeniable] = useState(false);
  const [decoyText, setDecoyText] = useState('');
  const [decoyPassword, setDecoyPassword] = useState('');
  const [burnAfterReading, setBurnAfterReading] = useState(false);

  // Reveal State
  const [revealFile, setRevealFile] = useState<File | null>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [revealedText, setRevealedText] = useState('');

  // Analyze State
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analyzeMaskUrl, setAnalyzeMaskUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check for share link on mount
    const searchParams = new URLSearchParams(window.location.search);
    const shareId = searchParams.get('share');
    const ext = searchParams.get('ext') || 'png';
    const burn = searchParams.get('burn') === 'true';
    
    if (shareId) {
      setActiveTab('Reveal');
      loadSharedFile(shareId, ext, burn);
    }
  }, []);

  const loadSharedFile = async (uuid: string, ext: string, burn: boolean) => {
    setLoading(true);
    setStatus('Downloading shared file...');
    try {
      const blob = await downloadStego(uuid, ext);
      if (blob) {
        if (burn) {
            await deleteStego(uuid, ext);
            setStatus('Shared file downloaded and BURNED from server. This is your only chance to extract.');
        } else {
            setStatus('Shared file loaded. Please enter password if required and extract.');
        }
        const file = new File([blob], `shared.${ext}`, { type: ext === 'wav' ? 'audio/wav' : 'image/png' });
        setRevealFile(file);
        setStatusType('success');
      } else {
        throw new Error('Could not download file');
      }
    } catch (e) {
      setStatus('Failed to load shared file.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const getFileInfo = async (file: File): Promise<FileInfo> => {
    const isAudio = file.type === 'audio/wav';
    if (isAudio) {
      const capacity = await calculateAudioCapacity(file);
      return { name: file.name, isAudio: true, capacity };
    } else {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve({ name: file.name, isAudio: false, width: img.width, height: img.height });
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not read image.'));
        };
        img.src = objectUrl;
      });
    }
  };

  const handleHideFileChange = async (file: File | null) => {
    setHideFile(file);
    setHideFileInfo(null);
    setLastStegoBlob(null);
    setShareLink('');
    if (!file) return;

    setLoading(true);
    setStatus('Reading file details...');
    try {
      const info = await getFileInfo(file);
      setHideFileInfo(info);
      setStatus(`File loaded: ${info.name}`);
      setStatusType('info');
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unable to load file.'}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    if (!hideFile || !hideText.trim()) {
      setStatus('Please provide both a file and text to hide.');
      setStatusType('error');
      return;
    }

    const isAudio = hideFile.type === 'audio/wav';
    if (!isAudio && algorithm === 'dct' && !hidePassword) {
      setStatus('Password is required for Advanced (DCT) mode.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatus('Encrypting and embedding...');
    setStatusType('info');

    try {
      if (isDeniable) {
          if (!decoyText.trim()) throw new Error('Decoy text is required for Plausible Deniability');
          const decoyEncrypted = await encrypt(decoyText, decoyPassword || '');
          const secretEncrypted = await encrypt(hideText, hidePassword || '');
          
          if (!decoyEncrypted.success) throw new Error(decoyEncrypted.error);
          if (!secretEncrypted.success) throw new Error(secretEncrypted.error);

          const result = await embedDeniable(hideFile, decoyEncrypted.payload, secretEncrypted.payload);
          if (!result.success) throw new Error(result.error);

          finishHide(result.data as Blob, 'png');
      } else {
          const encrypted = await encrypt(hideText, hidePassword || '');
          if (!encrypted.success) throw new Error(encrypted.error);

          let result;
          let ext = 'png';
          if (isAudio) {
            result = await embedAudio(hideFile, encrypted.payload);
            ext = 'wav';
          } else {
            result = await embed(hideFile, encrypted.payload, algorithm, hidePassword);
          }
          
          if (!result.success) throw new Error(result.error);
          finishHide(result.data as Blob, ext);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const finishHide = (blob: Blob, ext: string) => {
    setLastStegoBlob({ blob, ext });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stego.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Success! File downloaded. Keep the password safe if used.');
    setStatusType('success');
  };

  const handleCreateShareLink = async () => {
    if (!lastStegoBlob || !authEnabled) return;
    setLoading(true);
    setStatus('Uploading to secure storage...');
    try {
      const uuid = await uploadStego(lastStegoBlob.blob, lastStegoBlob.ext);
      if (uuid) {
        let link = `${window.location.origin}${window.location.pathname}?share=${uuid}&ext=${lastStegoBlob.ext}`;
        if (burnAfterReading) link += '&burn=true';
        setShareLink(link);
        setStatus('Share link created successfully!');
        setStatusType('success');
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
      setStatus('Error creating share link');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async () => {
    if (!revealFile) {
      setStatus('Please select a stego file.');
      setStatusType('error');
      return;
    }

    const isAudio = revealFile.type === 'audio/wav' || revealFile.name.endsWith('.wav');

    setLoading(true);
    setStatus('Extracting and decrypting...');
    setStatusType('info');

    try {
      let result;
      if (isAudio) {
        result = await extractAudio(revealFile);
      } else {
        result = await extract(revealFile, 'lsb', revealPassword);
        if (!result.success && result.error === 'NO_PAYLOAD') {
          const dctResult = await extract(revealFile, 'dct', revealPassword);
          if (dctResult.success || dctResult.error !== 'NO_PAYLOAD') {
            result = dctResult;
          }
        }
      }
      
      if (!result.success) {
        const message = result.error === 'NO_PAYLOAD' ? 'No hidden data found.' : 'Failed to extract hidden data.';
        throw new Error(message);
      }

      const decrypted = await decrypt(result.data as Uint8Array, revealPassword || '');
      if (!decrypted.success) throw new Error(decrypted.error);

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

  const handleAnalyze = async (file: File | null) => {
    setAnalyzeFile(file);
    if (analyzeMaskUrl) URL.revokeObjectURL(analyzeMaskUrl);
    setAnalyzeMaskUrl(null);
    if (!file) return;

    if (file.type === 'audio/wav') {
       setStatus('Steganalysis is only supported for images.');
       setStatusType('error');
       return;
    }

    setLoading(true);
    setStatus('Analyzing image LSB plane...');
    try {
      const maskBlob = await generateLsbMask(file);
      setAnalyzeMaskUrl(URL.createObjectURL(maskBlob));
      setStatus('Analysis complete. If you see static noise, it likely contains hidden data.');
      setStatusType('success');
    } catch (error) {
      setStatus('Failed to analyze image.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const renderCapacity = () => {
    if (!hideFileInfo) return null;
    if (hideFileInfo.isAudio) return `Estimated payload capacity: ${hideFileInfo.capacity} bytes`;
    if (hideFileInfo.width && hideFileInfo.height) {
        return `Estimated payload capacity: ${calculateCapacity(hideFileInfo.width, hideFileInfo.height, algorithm)} bytes`;
    }
    return '';
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="content-shell">
        <div className="tool-panel">
          <section className="tool-headline" style={{ marginBottom: '2rem' }}>
            <span className="eyebrow">Advanced Steganography</span>
            <h1>Hide & reveal secret text</h1>
            <p>Choose a mode, follow the instructions, and work with PNG/WAV files entirely in the browser.</p>
          </section>

          <StatusAlert message={status} loading={loading} variant={statusType} />
          
          <div className="tab-list" role="tablist" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'tab active' : 'tab'}
                onClick={() => { setActiveTab(tab); setStatus('Ready.'); setStatusType('info'); }}
              >
                {tab}
              </button>
            ))}
          </div>

          
          {activeTab !== 'Analyze' && (
            <div className="algorithm-selector" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-muted)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
              <label style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 0 }}>
                <strong>Algorithm (Images only):</strong>
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)} disabled={loading || isDeniable}>
                  <option value="lsb">Standard (Spatial LSB) - High Capacity</option>
                  <option value="dct">Advanced (Randomized DCT) - High Security</option>
                </select>
              </label>
            </div>
          )}

          {activeTab === 'Hide' && (
            <form className="panel-form" onSubmit={(e) => { e.preventDefault(); handleHide(); }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={isDeniable} onChange={e => setIsDeniable(e.target.checked)} disabled={loading || (hideFileInfo?.isAudio ?? false) || algorithm === 'dct'} />
                    Plausible Deniability (Decoy mode)
                </label>
                {isDeniable && <small>Hides a second message. If an attacker forces you to reveal your password, you give them the decoy password.</small>}
              </div>

              {isDeniable && (
                  <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '1rem', marginBottom: '1.5rem', background: 'var(--surface-muted)' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>Decoy Message (Visible with Decoy Password)</h4>
                      <label>
                        Decoy Text
                        <textarea rows={3} value={decoyText} onChange={(e) => setDecoyText(e.target.value)} disabled={loading} required/>
                      </label>
                      <label>
                        Decoy Password
                        <input type="password" value={decoyPassword} onChange={(e) => setDecoyPassword(e.target.value)} disabled={loading} />
                      </label>
                  </div>
              )}

              <h4 style={{ marginBottom: '0.5rem' }}>{isDeniable ? 'Secret Message (Hidden)' : 'Secret Message'}</h4>
              <label>
                Secret text
                <textarea rows={6} value={hideText} onChange={(e) => setHideText(e.target.value)} disabled={loading} required/>
              </label>
              <label>
                Password
                <input type="password" value={hidePassword} onChange={(e) => setHidePassword(e.target.value)} disabled={loading} />
              </label>
              <label>
                Cover file (Image or WAV)
                <input type="file" accept="image/*,audio/wav" onChange={(e) => handleHideFileChange(e.target.files?.[0] || null)} disabled={loading} required/>
              </label>
              {hideFileInfo && (
                <div className="image-summary">
                  <p><strong>{hideFileInfo.name}</strong></p>
                  <p>{renderCapacity()}</p>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading}>Encrypt and Download</button>
              </div>
              
              {lastStegoBlob && authEnabled && (
                <div style={{marginTop: '2rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem'}}>
                  <h4>Share Securely</h4>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" checked={burnAfterReading} onChange={e => setBurnAfterReading(e.target.checked)} disabled={loading} />
                        Burn after reading (Self-destruct)
                    </label>
                  </div>
                  {shareLink ? (
                    <input type="text" readOnly value={shareLink} onClick={e => (e.target as HTMLInputElement).select()} style={{marginTop: '0.5rem', width: '100%'}}/>
                  ) : (
                    <button type="button" className="button secondary small" onClick={handleCreateShareLink} disabled={loading} style={{marginTop: '0.5rem'}}>Create Link</button>
                  )}
                </div>
              )}
            </form>
          )}

          {activeTab === 'Reveal' && (
            <form className="panel-form" onSubmit={(e) => { e.preventDefault(); handleReveal(); }}>
              <label>
                Stego file (Image or WAV)
                <input type="file" accept="image/*,audio/wav" onChange={(e) => { setRevealFile(e.target.files?.[0] || null); setRevealedText(''); }} disabled={loading} required={!revealFile} />
                {revealFile && <small>Current file: {revealFile.name}</small>}
              </label>
              <label>
                Password
                <input type="password" placeholder="Required if hidden with a password or DCT" value={revealPassword} onChange={(e) => setRevealPassword(e.target.value)} disabled={loading} />
              </label>
              {revealedText && (
                <label>
                  Extracted text
                  <textarea rows={6} value={revealedText} readOnly />
                </label>
              )}
              <div className="form-actions">
                <button type="submit" className="button primary" disabled={loading || !revealFile}>Extract and Decrypt</button>
              </div>
            </form>
          )}

          {activeTab === 'Analyze' && (
            <div className="panel-form">
              <p>Upload an image to view its Least Significant Bit (LSB) plane. If it looks like static noise, it likely contains hidden encrypted data.</p>
              <label>
                Image to Analyze
                <input type="file" accept="image/*" onChange={(e) => handleAnalyze(e.target.files?.[0] || null)} disabled={loading} />
              </label>
              {analyzeMaskUrl && (
                <div style={{marginTop: '1rem'}}>
                  <h4>LSB Plane:</h4>
                  <img src={analyzeMaskUrl} alt="LSB Mask" style={{maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '0.5rem', marginTop: '0.5rem'}} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
