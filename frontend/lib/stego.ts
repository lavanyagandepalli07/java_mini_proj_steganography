export type StegoResult = {
  success: true;
  data: Blob | Uint8Array;
} | {
  success: false;
  error: string;
};

const MAGIC = new Uint8Array([0x53, 0x54, 0x45, 0x47]); // 'STEG'

export function calculateCapacity(width: number, height: number): number {
  // 3 bits per pixel (R, G, B channels)
  const bitsPerPixel = 3;
  const totalBits = width * height * bitsPerPixel;
  // Convert to bytes, subtract header overhead for rough estimate
  const headerBits = 8 * (4 + 1 + 4 + 1 + 1 + 16 + 12); // MAGIC + VERSION + LENGTH + LEN_SALT + LEN_IV + SALT + IV
  return Math.floor((totalBits - headerBits) / 8);
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

function embedBits(imageData: ImageData, payload: Uint8Array): boolean {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const bitsNeeded = payload.length * 8;

  if (bitsNeeded > totalPixels * 3) {
    return false; // Not enough capacity
  }

  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < bitsNeeded; i += 4) {
    // Skip alpha channel (i+3), use R, G, B (i, i+1, i+2)
    for (let channel = 0; channel < 3 && bitIndex < bitsNeeded; channel++) {
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      const bit = (payload[byteIndex] >> (7 - bitOffset)) & 1;
      data[i + channel] = (data[i + channel] & 0xFE) | bit; // Clear LSB and set
      bitIndex++;
    }
  }
  return true;
}

function extractBits(imageData: ImageData, bitLength: number): Uint8Array | null {
  const { data } = imageData;
  const payload = new Uint8Array(Math.ceil(bitLength / 8));
  let bitIndex = 0;

  for (let i = 0; i < data.length && bitIndex < bitLength; i += 4) {
    for (let channel = 0; channel < 3 && bitIndex < bitLength; channel++) {
      const bit = data[i + channel] & 1;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = 7 - (bitIndex % 8);
      payload[byteIndex] = (payload[byteIndex] & ~(1 << bitOffset)) | (bit << bitOffset);
      bitIndex++;
    }
  }

  return payload;
}

export async function embed(imageFile: File, payload: Uint8Array): Promise<StegoResult> {
  try {
    const imageData = await loadImage(imageFile);
    const capacity = calculateCapacity(imageData.width, imageData.height);

    if (payload.length > capacity) {
      return { success: false, error: `Payload too large. Image capacity: ${capacity} bytes, payload: ${payload.length} bytes` };
    }

    if (!embedBits(imageData, payload)) {
      return { success: false, error: 'Embedding failed: insufficient capacity' };
    }

    // Create canvas and put modified image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Canvas context not available' };
    }
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Convert to PNG blob
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

export async function extract(imageFile: File): Promise<StegoResult> {
  try {
    const imageData = await loadImage(imageFile);

    // Extract header first to determine payload length
    const headerBits = 8 * (4 + 1 + 4 + 1 + 1); // MAGIC + VERSION + LENGTH + LEN_SALT + LEN_IV
    const headerData = extractBits(imageData, headerBits);
    if (!headerData) {
      return { success: false, error: 'NO_PAYLOAD' };
    }

    const view = new DataView(headerData.buffer);

    // Check MAGIC
    if (headerData[0] !== MAGIC[0] || headerData[1] !== MAGIC[1] ||
        headerData[2] !== MAGIC[2] || headerData[3] !== MAGIC[3]) {
      return { success: false, error: 'NO_PAYLOAD' };
    }

    // Check VERSION
    if (view.getUint8(4) !== 0x01) {
      return { success: false, error: 'DECODE_FAILED' };
    }

    const ciphertextLength = view.getUint32(5, false); // big-endian
    const saltLen = view.getUint8(9);
    const ivLen = view.getUint8(10);

    const totalPayloadBits = 8 * (11 + saltLen + ivLen + ciphertextLength);
    const payload = extractBits(imageData, totalPayloadBits);
    if (!payload) {
      return { success: false, error: 'DECODE_FAILED' };
    }

    return { success: true, data: payload };
  } catch (error) {
    return { success: false, error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}