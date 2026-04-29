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


## Development Phases

### Phase 1 — UI Scaffold
- Created the `frontend/` app shell with basic page routes.
- Implemented the Hide / Reveal tool page and responsive layout.
- Established the visual structure, dark mode, and baseline navigation.

### Phase 2 — Authentication
- Added optional Supabase auth integration in the frontend.
- Built login form, auth state handling, and guest path behavior.
- Ensured the core tool still works perfectly without auth configuration.

### Phase 3 — Crypto Module
- Implemented browser-side encryption in `frontend/lib/crypto.ts`.
- Standardized the binary payload format with versioning, salt, IV, and ciphertext.

### Phase 4 — Core Stego Module
- Implemented `frontend/lib/stego.ts` for spatial LSB embed and extract workflows.
- Used the Canvas API to read and modify image pixels securely.
- Handled payload capacity calculations and image size limits.

### Phase 5 — End-to-End Flow
- Wired the Hide form to encrypt text and generate a downloadable PNG.
- Wired the Reveal form to decode, decrypt, and display hidden text.
- Managed file inputs, status updates, and browser download behavior.

### Phase 6 — UX and Polish
- Added loading/feedback states, success/error alerts, and form validation.
- Provided image metadata so users understand capacity limits.
- Implemented global navigation, including Home buttons across the interface.

### Phase 7 — Advanced Stego Algorithms (DCT & Audio)
- Engineered a robust Randomized DCT embedding algorithm for images, enhancing resistance to steganalysis.
- Extended the platform to support `.wav` audio files (`stego-audio.ts`), enabling audio steganography.

### Phase 8 — Security Extensions (Plausible Deniability)
- Developed the dual-plane embedding system to support Plausible Deniability.
- Updated the UI to allow for decoy messages and decoy passwords seamlessly alongside the primary secret.

### Phase 9 — Steganalysis Toolkit
- Built a client-side LSB mask visualization tool.
- Allowed users to analyze suspicious images for characteristic steganographic noise directly in the browser.

### Phase 10 — Cloud Integration (Secure Sharing & Self-Destruction)
- Integrated Supabase storage for generating shareable links.
- Implemented a "Burn-After-Reading" feature where the file deletes itself from the server upon the first extraction request.

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
