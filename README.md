# StegoText

A comprehensive client-side steganography and secure communication web suite built in Next.js.

## Key Features

- **Multi-Format Steganography**: Hide secret text inside PNG images or WAV audio files without affecting their apparent quality.
- **Client-Side Cryptography**: True zero-knowledge architecture. All encryption/decryption happens in the browser using the Web Crypto API.
  - PBKDF2 with HMAC-SHA256 for key derivation.
  - **AES-GCM** (Default) or **AES-CBC** (Legacy) for encryption with a random salt and IV per operation.
- **Advanced Steganography Algorithms**:
  - **Standard (Spatial LSB)**: High capacity embedding for both images and audio.
  - **Advanced (Randomized DCT)**: Highest stealth for images, resistant to basic statistical analysis.
- **Plausible Deniability**: Embed two separate messages using two different passwords. If forced to reveal a password, you can provide the decoy password, keeping the true secret hidden.
- **Steganalysis Tool**: Built-in LSB plane visualizer. Upload any image to see its noise profile and detect if it might contain hidden data.
- **Burn-After-Reading Secure Sharing**: Generate shareable links for your stego files. When the recipient downloads the file, it is automatically and permanently deleted from the secure cloud storage.
- **Dark & Light Mode**: Built-in theming that respects system preferences with manual overrides.
- **Seamless User Experience**: Clean, responsive UI with informative error handling, capacity estimations, and seamless guest functionality alongside optional account features.

## Project Structure

- `frontend/`: Next.js React application for the web interface, crypto, and stego logic.
- `backend/`: Java implementation of the cryptographic and steganographic engine. Now includes a Maven build system and a CLI utility.

## Technical Architecture

### Cryptography & Payload Format
The payload is structured to ensure reliable extraction and decryption (fully compatible between Frontend and Java Backend):
- `MAGIC`: 4 bytes `0x53 0x54 0x45 0x47` (`STEG`)
- `VERSION`: 1 byte (`0x01` for AES-GCM, `0x02` for AES-CBC)
- `LENGTH`: 4 bytes unsigned big-endian ciphertext length
- `SALT_LEN`: 1 byte salt length (fixed 16 bytes)
- `IV_LEN`: 1 byte IV length (12 bytes for GCM, 16 bytes for CBC)
- `SALT`: 16 bytes for PBKDF2
- `IV`: 12/16 bytes for AES
- `CIPHERTEXT`: Encrypted UTF-8 text


### Steganography Engines
- **Image LSB (Shared)**: Both Frontend and Java Backend implement Spatial LSB. It embeds payload bits into the least significant bits of the Red, Green, and Blue channels.
- **Image DCT (Frontend)**: Translates the image into the frequency domain using Discrete Cosine Transform for higher stealth.
- **Audio LSB (Frontend)**: Parses WAV file headers and embeds bits into the LSB of the audio sample data.
- **Plausible Deniability Engine (Frontend)**: Embeds the decoy payload in the 0th bit plane and the secret payload in the 1st bit plane of the image.

## Java Backend Usage

The Java backend has been upgraded to a full-featured CLI suite.

### Build
Requires Java 21+.
```bash
cd backend
gradle build
```

### Run CLI
```bash
gradle run --console=plain
```
The CLI allows you to:
1. Encrypt and Decrypt text (Base64 output).
2. Hide encrypted text directly into PNG images.
3. Extract and decrypt text from stego PNG images.


## Development Roadmap

The project evolved through several key engineering phases, each adding layers of security, stealth, and user experience.

### Phase 1 — UI Scaffold
- Created the `frontend/` app shell with basic page routes.
- Implemented the Hide / Reveal tool page and responsive layout.
- Established the visual structure and baseline navigation.

### Phase 2 — Authentication & Cloud
- Integrated Supabase for optional user authentication.
- Built login forms, auth state handling, and guest-path behavior.
- Configured secure storage buckets for cloud-based stego sharing.

### Phase 3 — Cryptography Suite
- Implemented browser-side encryption in `frontend/lib/crypto.ts`.
- Developed support for multiple algorithms: **AES-256 GCM** (Authenticated) and **AES-256 CBC**.
- Standardized the binary payload format with versioning, salt, and IV for cross-platform compatibility.

### Phase 4 — Core Steganography (LSB)
- Developed the Spatial LSB engine for pixel-perfect data embedding in PNG images.
- Implemented the **Audio Stego Engine** for lossless WAV files, parsing headers and sample data directly in the browser.

### Phase 5 — Advanced Algorithms (DCT)
- Built the **Frequency-Domain Engine** using Discrete Cosine Transform (DCT).
- Implemented randomized coefficient selection to resist advanced steganalysis and statistical inspection.

### Phase 6 — Plausible Deniability
- Engineered a multi-layered embedding engine.
- Allows users to hide a "Decoy Message" and a "Secret Message" in the same carrier, each protected by a unique password.

### Phase 7 — Forensic Analysis Tools
- Developed the **LSB Noise Map Visualizer**.
- Allows users to analyze the "noise" in an image to detect anomalies or verify the stealth of their own stego-files.

### Phase 8 — Secure Sharing & Self-Destruction
- Implemented the **Burn-After-Reading** protocol.
- Integrated cloud upload with automatic database triggers to delete files immediately after their first retrieval.

### Phase 9 — Java Backend Integration
- Upgraded the legacy Java code into a full-featured CLI suite.
- Ensured 100% feature parity for encryption and LSB steganography between the browser and the Java runtime.

### Phase 10 — UI/UX HUD & Polish
- Implemented the **Spy-Themed HUD Aesthetic** with premium toggle cards and interactive UI elements.
- Standardized cross-platform iconography using specialized Unicode-escaped emojis.
- Refined the "Zero-Knowledge" user flow, making passwords mandatory for maximum security.

## Getting Started

### Local Development
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

### Supabase Optional Authentication & Storage
To enable login features and secure sharing, create a `.env.local` file in the `frontend/` directory (use `.env.local.example` as a template):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
*Note: Guest mode and all local steganography features work perfectly without these variables.*

## Deployment
- **Frontend**: Designed to be deployed on Vercel, Netlify, or any standard Next.js hosting environment. Just deploy the `frontend/` directory. `npm run build` generates the production bundle.
- **Backend**: The Java CLI suite can be compiled into a JAR using `gradle jar` and run on any environment with a JVM.
