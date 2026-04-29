'use client';

import { useState, useEffect } from 'react';
import StatusAlert from '../../components/StatusAlert';
import { encrypt, decrypt } from '../../lib/crypto';
import { embed, extract, calculateCapacity, Algorithm, embedDeniable } from '../../lib/stego';
import { embedAudio, extractAudio, calculateAudioCapacity } from '../../lib/stego-audio';
import { generateLsbMask } from '../../lib/analysis';
import { uploadStego, downloadStego, authEnabled, deleteStego } from '../../lib/supabaseClient';
import PasswordStrength from '../../components/PasswordStrength';

const tabs = ['\u{1F47E} HIDE', '\u{1F50E} REVEAL', '\u{1F4E1} ANALYZE'] as const;
type Tab = (typeof tabs)[number];

type FileInfo = {
  name: string;
  isAudio: boolean;
  width?: number;
  height?: number;
  capacity?: number;
};

function TypewriterEffect({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [text]);

  return <>{displayedText}</>;
}

export default function ToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('\u{1F47E} HIDE');

  const getTabMetadata = (tab: Tab) => {
    switch (tab) {
      case '\u{1F47E} HIDE':
        return { title: 'ENCRYPT & HIDE', desc: 'Hide secret messages inside image or audio files.', eyebrow: 'ENCRYPTION_MODE', theme: 'hide' };
      case '\u{1F50E} REVEAL':
        return { title: 'EXTRACT & DECRYPT', desc: 'Recover hidden messages from your files.', eyebrow: 'DECRYPTION_MODE', theme: 'reveal' };
      case '\u{1F4E1} ANALYZE':
        return { title: 'IMAGE ANALYSIS', desc: 'Scan files for hidden data patterns.', eyebrow: 'FORENSIC_MODE', theme: 'analyze' };
    }
  };

  const metadata = getTabMetadata(activeTab);

  const [algorithm, setAlgorithm] = useState<Algorithm>('lsb');
  const [status, setStatus] = useState('');
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

  const [showHidePassword, setShowHidePassword] = useState(false);
  const [showDecoyPassword, setShowDecoyPassword] = useState(false);
  const [showRevealPassword, setShowRevealPassword] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shareId = searchParams.get('share');
    const ext = searchParams.get('ext') || 'png';
    const burn = searchParams.get('burn') === 'true';
    const tabParam = searchParams.get('tab');

    if (shareId) {
      setActiveTab('\u{1F50E} REVEAL');
      loadSharedFile(shareId, ext, burn);
    } else if (tabParam) {
      const tabMap: Record<string, Tab> = {
        hide: '\u{1F47E} HIDE',
        reveal: '\u{1F50E} REVEAL',
        analyze: '\u{1F4E1} ANALYZE',
      };
      if (tabMap[tabParam]) setActiveTab(tabMap[tabParam]);
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
    <main className="content-shell">
      <div className={`tool-panel mode-${metadata?.theme}`}>
        <section className="tool-headline" style={{ marginBottom: '2rem' }} key={activeTab}>
          <span className="eyebrow animate-in">{metadata?.eyebrow}</span>
          <h1 className="animate-in" style={{ animationDelay: '0.05s' }}>{metadata?.title}</h1>
          <p className="animate-in" style={{ animationDelay: '0.1s' }}>{metadata?.desc}</p>
        </section>

        <StatusAlert message={status} loading={loading} variant={statusType} />
        
        <div className="tab-list" role="tablist" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'tab active' : 'tab'}
              onClick={() => { setActiveTab(tab); setStatus(''); setStatusType('info'); }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === '\u{1F47E} HIDE' && (
          <form className="panel-form" onSubmit={(e) => { e.preventDefault(); handleHide(); }}>
            <div className="form-grid">
              {/* Left Column: Data Input */}
              <div className="form-section">
                <h3>{'\u{1F4E5}'} 1. Data Input</h3>
                <label>
                  Secret Message
                  <textarea value={hideText} onChange={(e) => setHideText(e.target.value)} disabled={loading} required placeholder="Enter the text you want to hide..." />
                </label>
                <label>
                  {'\u{1F5DD}\u{FE0F}'} Master Password
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showHidePassword ? "text" : "password"} value={hidePassword} onChange={(e) => setHidePassword(e.target.value)} disabled={loading} placeholder="Optional, but recommended" style={{ width: '100%', paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setShowHidePassword(!showHidePassword)} style={{ position: 'absolute', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--accent-strong)', cursor: 'pointer', padding: '0.2rem', fontSize: '1.2rem' }}>
                      {showHidePassword ? '\u{1F576}\u{FE0F}' : '\u{1F648}'}
                    </button>
                  </div>
                  <PasswordStrength password={hidePassword} />
                </label>

                <div className="deniable-toggle-card-wrapper" style={{ marginTop: '1rem' }}>
                  <div className={`deniable-toggle-card ${isDeniable ? 'active' : ''}`} onClick={() => !loading && setIsDeniable(!isDeniable)}>
                    <div className="deniable-toggle-header">
                      <div className="deniable-toggle-icon">{isDeniable ? '\u{1F318}' : '\u{1F311}'}</div>
                      <div className="deniable-toggle-info">
                        <span className="deniable-toggle-title">PLAUSIBLE DENIABILITY</span>
                        <span className="deniable-toggle-desc">Embed a decoy message for extra safety.</span>
                      </div>
                      <div className={`deniable-pill ${isDeniable ? 'on' : ''}`}>
                        <div className="deniable-pill-knob" />
                      </div>
                    </div>
                    {isDeniable && (
                      <div className="deniable-fields animate-in">
                        <label>
                          Decoy Message
                          <textarea rows={3} value={decoyText} onChange={(e) => setDecoyText(e.target.value)} disabled={loading} required placeholder="Enter a harmless message someone can see..."/>
                        </label>
                        <label>
                          Decoy Password
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input type={showDecoyPassword ? "text" : "password"} value={decoyPassword} onChange={(e) => setDecoyPassword(e.target.value)} disabled={loading} placeholder="e.g. 1234" style={{ width: '100%', paddingRight: '2.5rem' }} />
                            <button type="button" onClick={() => setShowDecoyPassword(!showDecoyPassword)} style={{ position: 'absolute', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--accent-strong)', cursor: 'pointer', padding: '0.2rem', fontSize: '1.2rem' }}>
                              {showDecoyPassword ? '\u{1F576}\u{FE0F}' : '\u{1F648}'}
                            </button>
                          </div>
                          <PasswordStrength password={decoyPassword} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Carrier & Actions */}
              <div className="form-section">
                <h3>{'\u{1F4E4}'} 2. Carrier & Output</h3>

                <div className="algorithm-selector" style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '0', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 0 }}>
                    <strong>{'\u{1F570}\u{FE0F}'} Hiding Algorithm</strong>
                    <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)} disabled={loading || isDeniable}>
                      <option value="lsb">L0: STANDARD (SPATIAL LSB)</option>
                      <option value="dct">F1: ADVANCED (RANDOMIZED DCT)</option>
                    </select>
                  </label>
                </div>

                <label>
                  {'\u{1F4E5}'} Carrier Upload (Image or WAV)
                  <input type="file" accept="image/*,audio/wav" onChange={(e) => handleHideFileChange(e.target.files?.[0] || null)} disabled={loading} required/>
                </label>

                {hideFileInfo && (
                  <div className="image-summary" style={{ padding: '1rem', background: 'var(--accent-soft)', borderRadius: '0', color: 'var(--accent-strong)' }}>
                    <p style={{ margin: 0 }}><strong>FILE:</strong> {hideFileInfo.name}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{renderCapacity()}</p>
                  </div>
                )}

                <div className="form-actions">
                  <button type="submit" className="button primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? '\u{23F3} PROCESSING' : '\u{1F680} ENCRYPT & DOWNLOAD'}
                  </button>
                </div>
                
                {lastStegoBlob && authEnabled && (
                  <div style={{marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0', background: 'var(--surface)'}}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{'\u{1F4E1}'} Secure Sharing</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={burnAfterReading} onChange={e => setBurnAfterReading(e.target.checked)} disabled={loading} />
                        {'\u{2622}\u{FE0F}'} Burn after reading (Self-destruct)
                    </label>
                    {shareLink ? (
                      <input type="text" readOnly value={shareLink} onClick={e => (e.target as HTMLInputElement).select()} style={{marginTop: '0.5rem', fontSize: '0.8rem'}}/>
                    ) : (
                      <button type="button" className="button secondary small" onClick={handleCreateShareLink} disabled={loading} style={{marginTop: '0.5rem', width: '100%'}}>{'\u{1F4E1} GENERATE SHARE LINK'}</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {activeTab === '\u{1F50E} REVEAL' && (
          <form className="panel-form" onSubmit={(e) => { e.preventDefault(); handleReveal(); }}>
            <div className="form-grid">
              <div className="form-section">
                <h3>{'\u{1F4E5}'} 1. Carrier Input</h3>
                <label>
                  {'\u{1F4E4}'} Select Stego File (Image or WAV)
                  <input type="file" accept="image/*,audio/wav" onChange={(e) => { setRevealFile(e.target.files?.[0] || null); setRevealedText(''); }} disabled={loading} required={!revealFile} />
                  {revealFile && <small>Ready to extract from: {revealFile.name}</small>}
                </label>
                <label>
                  {'\u{1F5DD}\u{FE0F}'} Password
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type={showRevealPassword ? "text" : "password"} placeholder="Required if hidden with a password or DCT" value={revealPassword} onChange={(e) => setRevealPassword(e.target.value)} disabled={loading} style={{ width: '100%', paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setShowRevealPassword(!showRevealPassword)} style={{ position: 'absolute', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--accent-strong)', cursor: 'pointer', padding: '0.2rem', fontSize: '1.2rem' }}>
                      {showRevealPassword ? '\u{1F576}\u{FE0F}' : '\u{1F648}'}
                    </button>
                  </div>
                </label>
                <div className="form-actions">
                  <button type="submit" className="button primary" style={{ width: '100%' }} disabled={loading || !revealFile}>
                    {loading ? '\u{23F3} EXTRACTING' : '\u{1F50E} EXTRACT & DECRYPT'}
                  </button>
                </div>
              </div>

              <div className="form-section">
                <h3>{'\u{1F4E4}'} 2. Extracted Content</h3>
                <label>
                  {revealedText ? '\u{2705} DECRYPTED PAYLOAD:' : '\u{23F3} STANDBY for extraction...'}
                  <div style={{ 
                    minHeight: '200px', 
                    padding: '1rem', 
                    background: 'var(--surface-muted)', 
                    border: '1px solid var(--border)',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    color: 'var(--accent-strong)',
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto'
                  }}>
                    {revealedText ? <TypewriterEffect text={revealedText} /> : '...'}
                  </div>
                </label>
                {revealedText && (
                  <button type="button" className="button secondary small" onClick={() => { navigator.clipboard.writeText(revealedText); setStatus('Copied to clipboard!'); setStatusType('success'); }}>
                    {'\u{1F4CB}'} COPY TO CLIPBOARD
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {activeTab === '\u{1F4E1} ANALYZE' && (
          <div className="form-section">
            <h3>{'\u{1F50D}'} Analyze Image</h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
              Upload an image to view its Least Significant Bit (LSB) plane. If you see random "static" noise instead of a faint version of the image, it likely contains hidden data.
            </p>
            
            <label>
              Image to Analyze
              <input type="file" accept="image/*" onChange={(e) => handleAnalyze(e.target.files?.[0] || null)} disabled={loading} />
            </label>

            {analyzeMaskUrl && (
              <div className="analysis-result-container scanlines" style={{marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: '0', textAlign: 'center', border: '1px solid var(--border)'}}>
                <h4 style={{ color: 'var(--accent-strong)', marginBottom: '1rem', fontFamily: 'monospace' }}>{'\u{1F4E1}'} Visual Noise Map:</h4>
                <img src={analyzeMaskUrl} alt="LSB Mask" style={{ maxWidth: '100%', border: '1px solid var(--border)', borderRadius: '0' }} />
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '1rem', fontFamily: 'monospace' }}>SIGNAL DETECTED: Static noise pattern confirms LSB steganography.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
