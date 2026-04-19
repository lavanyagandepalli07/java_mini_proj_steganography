# StegoText

A simple client-side steganography web app built in Next.js.

## Project Structure

- `frontend/`: Next.js React app for the web interface
- `backend/`: Java reference implementation for crypto (not deployed as server)

## Phase 0 — Specification and plan


### Algorithms
- Encryption: browser Web Crypto API
  - PBKDF2 with HMAC-SHA256 for key derivation
  - AES-GCM for authenticated encryption
  - Random salt and random 12-byte IV for each encryption operation
- Steganography: Canvas LSB embedding
  - Use image pixel data from uploaded images
  - Embed binary payload bits into the least significant bits of RGB channels only
  - Avoid alpha channel to preserve visuals and compatibility

### Payload format
Binary payload layout for reliable extraction:
- MAGIC: 4 bytes `0x53 0x54 0x45 0x47` (`STEG`)
- VERSION: 1 byte (currently `0x01`)
- LENGTH: 4 bytes unsigned big-endian ciphertext length
- SALT_LEN: 1 byte salt length (fixed 16 bytes)
- IV_LEN: 1 byte IV length (fixed 12 bytes)
- SALT: variable bytes for PBKDF2 salt
- IV: variable bytes for AES-GCM IV
- CIPHERTEXT: variable bytes of encrypted UTF-8 text

### Capacity math
- Each pixel provides 3 bits of embedding capacity (R, G, B channels)
- Total capacity bits = pixelCount * 3
- Total capacity bytes = floor(totalBits / 8)
- Required payload size = header + salt + iv + ciphertext
- If the selected image is too small, the app fails gracefully with `IMAGE_TOO_SMALL`

### Supported formats
- Input: PNG, BMP, GIF, WEBP, JPEG for image loading
- Output: PNG only
- Warning: JPEG recompression or editing can destroy hidden data; output must be downloaded as PNG

### Error codes and friendly UI messages
- `NO_PAYLOAD`: no hidden payload found in image
- `WRONG_PASSWORD`: decryption failed due to invalid password or tampered payload
- `IMAGE_TOO_SMALL`: image capacity insufficient for payload
- `DECODE_FAILED`: extraction failed due to invalid or corrupted payload
- `UNSUPPORTED_FORMAT`: unsupported image format or invalid file type
- `UNKNOWN`: any unexpected error

### UX expectations
- Clean responsive layout with a landing page and tool tabs for Hide / Reveal
- Optional Supabase email/password authentication, but core Hide/Reveal works in guest mode
- Clear status/alerts, loading states, accessible labels, keyboard-friendly controls
- PNG-only guidance and capacity feedback

## Deployment

- **Frontend**: Deploy `frontend/` to Vercel or similar.
- **Build locally**:
  - `cd frontend`
  - `npm install`
  - `npm run build`
  - `npm run dev` to preview locally
- **Backend**: Java code is for reference only; no server deployment needed.
  - Optional compile check: `javac backend/java/com/stegotext/CryptoEngine.java`

## Phase plan
- Phase 1: scaffold UI with skeleton pages and tabs ✅
- Phase 2: optional Supabase auth with guest mode ✅
- Phase 3: browser crypto encrypt/decrypt module ✅
- Phase 4: stego embed/extract module ✅
- Phase 5: end-to-end wiring of Hide and Reveal flows ✅
- Phase 6: UX polish, accessibility, and error handling ✅
- Phase 7: build readiness, README, and deployment notes ✅

## Supabase optional authentication

To enable optional auth, configure the following environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Guest mode works even when these variables are not set, so the hide/reveal tool remains fully usable without login.

## Java crypto module

The repository includes a Java crypto engine at `backend/java/com/stegotext/CryptoEngine.java`.
- Implements PBKDF2-HMAC-SHA256 key derivation
- Uses AES-GCM with a random 12-byte IV
- Encodes payloads with a versioned header for reliable extraction

This provides a Java source reference for the encryption/decryption layer while the UI remains React/Next.js.

## Build readiness
- Verified frontend production build with `cd frontend && npm run build`.
- Verified backend Java reference compiles with `javac backend/java/com/stegotext/CryptoEngine.java`.

## Browser crypto module

The client-side crypto is implemented in `frontend/lib/crypto.ts` using Web Crypto API.
- PBKDF2 with HMAC-SHA256 for key derivation
- AES-GCM for authenticated encryption
- Random salt and IV per operation
- Versioned binary payload format matching the spec
