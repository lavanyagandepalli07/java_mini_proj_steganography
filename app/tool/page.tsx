'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import StatusAlert from '../../components/StatusAlert';

const tabs = ['Hide', 'Reveal'] as const;

type Tab = (typeof tabs)[number];

export default function ToolPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Hide');
  const [status, setStatus] = useState('Ready to hide or reveal a message.');
  const [loading, setLoading] = useState(false);

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
            <form className="panel-form" onSubmit={(event) => event.preventDefault()}>
              <label>
                Secret text
                <textarea rows={6} placeholder="Enter the message to hide" aria-label="Secret text" />
              </label>
              <label>
                Password
                <input type="password" placeholder="Optional password" aria-label="Password" />
              </label>
              <label>
                Cover image
                <input type="file" accept="image/*" aria-label="Cover image" />
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary" disabled>
                  Encrypt and download PNG
                </button>
              </div>
            </form>
          ) : (
            <form className="panel-form" onSubmit={(event) => event.preventDefault()}>
              <label>
                Stego image
                <input type="file" accept="image/*" aria-label="Stego image" />
              </label>
              <label>
                Password
                <input type="password" placeholder="Password used during hiding" aria-label="Password" />
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary" disabled>
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
