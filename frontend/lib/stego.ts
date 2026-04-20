export type Algorithm = 'lsb' | 'dct';

export type StegoResult = {
  success: true;
  data: Blob | Uint8Array;
} | {
  success: false;
  error: string;
};

const MAGIC = new Uint8Array([0x53, 0x54, 0x45, 0x47]); // 'STEG'

export function calculateCapacity(width: number, height: number, algorithm: Algorithm = 'lsb'): number {
  const headerBits = 8 * (4 + 1 + 4 + 1 + 1 + 16 + 12); // 312 bits (39 bytes)
  
  if (algorithm === 'lsb') {
    const bitsPerPixel = 3;
    const totalBits = width * height * bitsPerPixel;
    return Math.floor((totalBits - headerBits) / 8);
  } else {
    // DCT: 8x8 blocks, 2 bits per block
    const blocksW = Math.floor(width / 8);
    const blocksH = Math.floor(height / 8);
    const totalBits = blocksW * blocksH * 2;
    return Math.floor((totalBits - headerBits) / 8);
  }
}

async function loadImage(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function embedBitsLSB(imageData: ImageData, payload: Uint8Array, bitPlane: number = 0): boolean {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const bitsNeeded = payload.length * 8;

  if (bitsNeeded > totalPixels * 3) {
    return false;
  }

  const mask = ~(1 << bitPlane);
  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < bitsNeeded; i += 4) {
    for (let channel = 0; channel < 3 && bitIndex < bitsNeeded; channel++) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      const bit = (payload[byteIndex] >> (7 - bitOffset)) & 1;
      data[i + channel] = (data[i + channel] & mask) | (bit << bitPlane);
      bitIndex++;
    }
  }
  return true;
}

function extractBitsLSB(imageData: ImageData, bitLength: number, bitPlane: number = 0): Uint8Array | null {
  const { data } = imageData;
  const payload = new Uint8Array(Math.ceil(bitLength / 8));
  let bitIndex = 0;

  for (let i = 0; i < data.length && bitIndex < bitLength; i += 4) {
    for (let channel = 0; channel < 3 && bitIndex < bitLength; channel++) {
      const bit = (data[i + channel] >> bitPlane) & 1;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = 7 - (bitIndex % 8);
      payload[byteIndex] = (payload[byteIndex] & ~(1 << bitOffset)) | (bit << bitOffset);
      bitIndex++;
    }
  }

  return payload;
}

// --- DCT Utilities ---

const PI = Math.PI;
const SQRT_1_8 = 1 / Math.sqrt(8);
const SQRT_2_8 = Math.sqrt(2 / 8);

function buildDctMatrix() {
  const matrix = new Float32Array(64);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      matrix[i * 8 + j] = i === 0 ? SQRT_1_8 : SQRT_2_8 * Math.cos(((2 * j + 1) * i * PI) / 16);
    }
  }
  return matrix;
}
const dctMatrix = buildDctMatrix();

function forwardDCT(block: Float32Array, output: Float32Array) {
  const temp = new Float32Array(64);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < 8; k++) sum += dctMatrix[i * 8 + k] * block[k * 8 + j];
      temp[i * 8 + j] = sum;
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < 8; k++) sum += temp[i * 8 + k] * dctMatrix[j * 8 + k];
      output[i * 8 + j] = sum;
    }
  }
}

function inverseDCT(block: Float32Array, output: Float32Array) {
  const temp = new Float32Array(64);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < 8; k++) sum += dctMatrix[k * 8 + i] * block[k * 8 + j];
      temp[i * 8 + j] = sum;
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < 8; k++) sum += temp[i * 8 + k] * dctMatrix[k * 8 + j];
      output[i * 8 + j] = sum;
    }
  }
}

function cyrb128(str: string) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1^h2^h3^h4) >>> 0;
}

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getShuffledIndices(size: number, seed: number) {
  const prng = mulberry32(seed);
  const arr = new Int32Array(size);
  for (let i = 0; i < size; i++) arr[i] = i;
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

const DCT_Q = 32;

function quantizeAndEmbed(val: number, bit: number, q: number): number {
  let cq = Math.round(val / q);
  if ((Math.abs(cq) % 2) !== bit) {
    cq += 1;
  }
  return cq * q;
}

function extractBitQuantized(val: number, q: number): number {
  let cq = Math.round(val / q);
  return Math.abs(cq) % 2;
}

function embedBitsDCT(imageData: ImageData, payload: Uint8Array, password?: string): boolean {
  const { data, width, height } = imageData;
  const blocksW = Math.floor(width / 8);
  const blocksH = Math.floor(height / 8);
  const totalBlocks = blocksW * blocksH;
  const bitsNeeded = payload.length * 8;

  if (bitsNeeded > totalBlocks * 2) {
    return false; // Not enough capacity
  }

  const seed = cyrb128(password || 'default_dct_seed');
  const blockIndices = getShuffledIndices(totalBlocks, seed);

  let bitIndex = 0;
  const blockData = new Float32Array(64);
  const dctData = new Float32Array(64);
  const idctData = new Float32Array(64);

  for (let i = 0; i < totalBlocks && bitIndex < bitsNeeded; i++) {
    const bIndex = blockIndices[i];
    const bx = bIndex % blocksW;
    const by = Math.floor(bIndex / blocksW);
    const startX = bx * 8;
    const startY = by * 8;

    // Extract blue channel into blockData
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelIdx = ((startY + y) * width + (startX + x)) * 4;
        blockData[y * 8 + x] = data[pixelIdx + 2] - 128; // shift to -128..127 for DCT
      }
    }

    forwardDCT(blockData, dctData);

    // Embed 2 bits per block at indices (2,3) = 19 and (3,2) = 26
    for (const coefIdx of [19, 26]) {
      if (bitIndex < bitsNeeded) {
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        const bit = (payload[byteIndex] >> (7 - bitOffset)) & 1;
        
        dctData[coefIdx] = quantizeAndEmbed(dctData[coefIdx], bit, DCT_Q);
        bitIndex++;
      }
    }

    inverseDCT(dctData, idctData);

    // Write back to blue channel
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelIdx = ((startY + y) * width + (startX + x)) * 4;
        let val = Math.round(idctData[y * 8 + x] + 128);
        val = Math.max(0, Math.min(255, val));
        data[pixelIdx + 2] = val;
      }
    }
  }

  return true;
}

function extractBitsDCT(imageData: ImageData, bitLength: number, password?: string): Uint8Array | null {
  const { data, width, height } = imageData;
  const blocksW = Math.floor(width / 8);
  const blocksH = Math.floor(height / 8);
  const totalBlocks = blocksW * blocksH;

  if (bitLength > totalBlocks * 2) {
    return null;
  }

  const seed = cyrb128(password || 'default_dct_seed');
  const blockIndices = getShuffledIndices(totalBlocks, seed);

  const payload = new Uint8Array(Math.ceil(bitLength / 8));
  let bitIndex = 0;
  
  const blockData = new Float32Array(64);
  const dctData = new Float32Array(64);

  for (let i = 0; i < totalBlocks && bitIndex < bitLength; i++) {
    const bIndex = blockIndices[i];
    const bx = bIndex % blocksW;
    const by = Math.floor(bIndex / blocksW);
    const startX = bx * 8;
    const startY = by * 8;

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelIdx = ((startY + y) * width + (startX + x)) * 4;
        blockData[y * 8 + x] = data[pixelIdx + 2] - 128;
      }
    }

    forwardDCT(blockData, dctData);

    for (const coefIdx of [19, 26]) {
      if (bitIndex < bitLength) {
        const bit = extractBitQuantized(dctData[coefIdx], DCT_Q);
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = 7 - (bitIndex % 8);
        payload[byteIndex] = (payload[byteIndex] & ~(1 << bitOffset)) | (bit << bitOffset);
        bitIndex++;
      }
    }
  }

  return payload;
}

// --- Deniable Embedding ---

export async function embedDeniable(imageFile: File, decoyPayload: Uint8Array, secretPayload: Uint8Array): Promise<StegoResult> {
  try {
    const imageData = await loadImage(imageFile);
    const capacity = calculateCapacity(imageData.width, imageData.height, 'lsb');

    if (decoyPayload.length > capacity || secretPayload.length > capacity) {
      return { success: false, error: `Payload too large for deniable mode.` };
    }

    // Embed decoy in plane 0 and secret in plane 1
    if (!embedBitsLSB(imageData, decoyPayload, 0) || !embedBitsLSB(imageData, secretPayload, 1)) {
      return { success: false, error: 'Embedding failed.' };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { success: false, error: 'Canvas context not available' };
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ success: true, data: blob });
        else resolve({ success: false, error: 'Failed to create PNG blob' });
      }, 'image/png');
    });
  } catch (error) {
    return { success: false, error: `Deniable embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// --- Main Entrypoints ---

export async function embed(imageFile: File, payload: Uint8Array, algorithm: Algorithm = 'lsb', password?: string): Promise<StegoResult> {
  try {
    const imageData = await loadImage(imageFile);
    const capacity = calculateCapacity(imageData.width, imageData.height, algorithm);

    if (payload.length > capacity) {
      return { success: false, error: `Payload too large. Image capacity: ${capacity} bytes, payload: ${payload.length} bytes` };
    }

    let success = false;
    if (algorithm === 'lsb') {
      success = embedBitsLSB(imageData, payload);
    } else {
      success = embedBitsDCT(imageData, payload, password);
    }

    if (!success) {
      return { success: false, error: 'Embedding failed: insufficient capacity' };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Canvas context not available' };
    }
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ success: true, data: blob });
        } else {
          resolve({ success: false, error: 'Failed to create PNG blob' });
        }
      }, 'image/png');
    });
  } catch (error) {
    return { success: false, error: `Embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function extract(imageFile: File, algorithm: Algorithm = 'lsb', password?: string): Promise<StegoResult> {
  try {
    const imageData = await loadImage(imageFile);

    const headerBits = 8 * (4 + 1 + 4 + 1 + 1); // MAGIC + VERSION + LENGTH + LEN_SALT + LEN_IV
    
    let headerData: Uint8Array | null = null;
    if (algorithm === 'lsb') {
      // Try bit plane 0 first, then 1 (for plausible deniability)
      headerData = extractBitsLSB(imageData, headerBits, 0);
      if (headerData && (headerData[0] !== MAGIC[0] || headerData[1] !== MAGIC[1])) {
          const plane1Header = extractBitsLSB(imageData, headerBits, 1);
          if (plane1Header && plane1Header[0] === MAGIC[0] && plane1Header[1] === MAGIC[1]) {
              headerData = plane1Header;
              // We'll need to remember we switched planes if we want to extract the full payload.
              // But currently extractBitsLSB is called again below.
          }
      }
    } else {
      headerData = extractBitsDCT(imageData, headerBits, password);
    }
    
    if (!headerData) {
      return { success: false, error: 'NO_PAYLOAD' };
    }

    const view = new DataView(headerData.buffer);

    if (headerData[0] !== MAGIC[0] || headerData[1] !== MAGIC[1] ||
        headerData[2] !== MAGIC[2] || headerData[3] !== MAGIC[3]) {
      return { success: false, error: 'NO_PAYLOAD' };
    }

    if (view.getUint8(4) !== 0x01) {
      return { success: false, error: 'DECODE_FAILED' };
    }

    const ciphertextLength = view.getUint32(5, false);
    const saltLen = view.getUint8(9);
    const ivLen = view.getUint8(10);

    const totalPayloadBits = 8 * (11 + saltLen + ivLen + ciphertextLength);
    
    let payload: Uint8Array | null = null;
    if (algorithm === 'lsb') {
      // Re-check which plane has the magic header
      const h0 = extractBitsLSB(imageData, headerBits, 0);
      const plane = (h0 && h0[0] === MAGIC[0] && h0[1] === MAGIC[1]) ? 0 : 1;
      payload = extractBitsLSB(imageData, totalPayloadBits, plane);
    } else {
      payload = extractBitsDCT(imageData, totalPayloadBits, password);
    }

    if (!payload) {
      return { success: false, error: 'DECODE_FAILED' };
    }

    return { success: true, data: payload };
  } catch (error) {
    return { success: false, error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}