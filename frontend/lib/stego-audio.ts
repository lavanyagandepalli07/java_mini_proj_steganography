import { StegoResult } from './stego';

const MAGIC = new Uint8Array([0x53, 0x54, 0x45, 0x47]); // 'STEG'

export async function calculateAudioCapacity(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    
    if (view.getUint32(0, false) !== 0x52494646) return 0; // "RIFF"
    if (view.getUint32(8, false) !== 0x57415645) return 0; // "WAVE"
    
    let offset = 12;
    let dataSize = 0;
    let bitsPerSample = 16;
    
    while (offset < buffer.byteLength - 8) {
      const chunkId = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      
      if (chunkId === 0x666d7420) { // "fmt "
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 0x64617461) { // "data"
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }
    
    if (dataSize === 0) return 0;
    
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / bytesPerSample);
    
    // We embed 1 bit per sample
    const totalBits = totalSamples;
    const headerBits = 8 * (4 + 1 + 4 + 1 + 1 + 16 + 12);
    
    return Math.floor((totalBits - headerBits) / 8);
  } catch {
    return 0;
  }
}

export async function embedAudio(audioFile: File, payload: Uint8Array): Promise<StegoResult> {
  try {
    const buffer = await audioFile.arrayBuffer();
    const view = new DataView(buffer);
    
    if (view.getUint32(0, false) !== 0x52494646 || view.getUint32(8, false) !== 0x57415645) {
      return { success: false, error: 'Invalid WAV file format' };
    }
    
    let offset = 12;
    let dataOffset = -1;
    let dataSize = 0;
    let bitsPerSample = 16;
    
    while (offset < buffer.byteLength - 8) {
      const chunkId = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      if (chunkId === 0x666d7420) {
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 0x64617461) {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }
    
    if (dataOffset === -1) return { success: false, error: 'No audio data found' };
    
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / bytesPerSample);
    const bitsNeeded = payload.length * 8;
    
    if (bitsNeeded > totalSamples) {
      return { success: false, error: 'Audio file too short to hold the payload' };
    }
    
    // Create a copy of the buffer to modify
    const newBuffer = new Uint8Array(buffer.slice(0));
    
    let bitIndex = 0;
    for (let i = 0; i < totalSamples && bitIndex < bitsNeeded; i++) {
      const sampleByteOffset = dataOffset + i * bytesPerSample;
      // Modify the LSB of the lowest byte of the sample (assuming little-endian)
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      const bit = (payload[byteIndex] >> (7 - bitOffset)) & 1;
      
      newBuffer[sampleByteOffset] = (newBuffer[sampleByteOffset] & 0xFE) | bit;
      bitIndex++;
    }
    
    const blob = new Blob([newBuffer], { type: 'audio/wav' });
    return { success: true, data: blob };
  } catch (error) {
    return { success: false, error: `Audio embedding failed: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

export async function extractAudio(audioFile: File): Promise<StegoResult> {
  try {
    const buffer = await audioFile.arrayBuffer();
    const view = new DataView(buffer);
    
    if (view.getUint32(0, false) !== 0x52494646 || view.getUint32(8, false) !== 0x57415645) {
      return { success: false, error: 'Invalid WAV file format' };
    }
    
    let offset = 12;
    let dataOffset = -1;
    let bitsPerSample = 16;
    
    while (offset < buffer.byteLength - 8) {
      const chunkId = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      if (chunkId === 0x666d7420) {
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 0x64617461) {
        dataOffset = offset + 8;
        break;
      }
      offset += 8 + chunkSize;
    }
    
    if (dataOffset === -1) return { success: false, error: 'No audio data found' };
    
    const bytesPerSample = bitsPerSample / 8;
    const dataBytes = new Uint8Array(buffer);
    
    // Extract function
    const extractBits = (startBit: number, numBits: number) => {
      const payload = new Uint8Array(Math.ceil(numBits / 8));
      for (let i = 0; i < numBits; i++) {
        const sampleIdx = startBit + i;
        const bit = dataBytes[dataOffset + sampleIdx * bytesPerSample] & 1;
        const byteIndex = Math.floor(i / 8);
        const bitOffset = 7 - (i % 8);
        payload[byteIndex] = (payload[byteIndex] & ~(1 << bitOffset)) | (bit << bitOffset);
      }
      return payload;
    };
    
    // Extract Header
    const headerBits = 8 * (4 + 1 + 4 + 1 + 1);
    const headerData = extractBits(0, headerBits);
    
    const headerView = new DataView(headerData.buffer);
    if (headerData[0] !== MAGIC[0] || headerData[1] !== MAGIC[1] ||
        headerData[2] !== MAGIC[2] || headerData[3] !== MAGIC[3]) {
      return { success: false, error: 'NO_PAYLOAD' };
    }
    
    if (headerView.getUint8(4) !== 0x01) {
      return { success: false, error: 'DECODE_FAILED' };
    }
    
    const ciphertextLength = headerView.getUint32(5, false);
    const saltLen = headerView.getUint8(9);
    const ivLen = headerView.getUint8(10);
    
    const totalPayloadBits = 8 * (11 + saltLen + ivLen + ciphertextLength);
    const payload = extractBits(0, totalPayloadBits);
    
    return { success: true, data: payload };
  } catch (error) {
    return { success: false, error: `Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}
