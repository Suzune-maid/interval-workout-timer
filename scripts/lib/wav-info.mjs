import { readFile } from 'node:fs/promises';

export class WavInfoError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'WavInfoError';
    this.details = details;
  }
}

function readAscii(buffer, offset, length) {
  return buffer.toString('ascii', offset, offset + length);
}

function findChunks(buffer) {
  const chunks = new Map();
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const id = readAscii(buffer, offset, 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + size + (size % 2);

    if (dataOffset + size > buffer.length) {
      throw new WavInfoError(`Invalid WAV chunk size for ${id}`, { chunkId: id, size });
    }

    chunks.set(id, { id, size, dataOffset });
    offset = nextOffset;
  }

  return chunks;
}

function assertPcm16({ audioFormat, bitsPerSample }) {
  if (audioFormat !== 1) {
    throw new WavInfoError(`Unsupported WAV format: ${audioFormat}; only PCM is supported`, { audioFormat });
  }

  if (bitsPerSample !== 16) {
    throw new WavInfoError(`Unsupported WAV bit depth: ${bitsPerSample}; only PCM16 is supported`, { bitsPerSample });
  }
}

function analyzePcm16(buffer, { dataOffset, dataSize, channels, sampleRate, blockAlign }) {
  const frameCount = Math.floor(dataSize / blockAlign);
  if (frameCount <= 0) {
    throw new WavInfoError('Invalid WAV: zero audio frames', { frameCount, dataSize });
  }

  const silenceThreshold = 0.01;
  const clippingThreshold = 0.98;
  let peakAmplitude = 0;
  let sumSquares = 0;
  let sampleCount = 0;
  let signalFrameCount = 0;
  let clippedSampleCount = 0;
  let leadingSilentFrames = 0;
  let trailingSilentFrames = 0;
  let seenSignal = false;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let framePeak = 0;

    for (let channel = 0; channel < channels; channel += 1) {
      const sampleOffset = dataOffset + frameIndex * blockAlign + channel * 2;
      const sample = buffer.readInt16LE(sampleOffset) / 32768;
      const absolute = Math.abs(sample);
      peakAmplitude = Math.max(peakAmplitude, absolute);
      framePeak = Math.max(framePeak, absolute);
      sumSquares += sample * sample;
      sampleCount += 1;
      if (absolute >= clippingThreshold) clippedSampleCount += 1;
    }

    if (framePeak >= silenceThreshold) {
      signalFrameCount += 1;
      seenSignal = true;
      trailingSilentFrames = 0;
    } else {
      if (!seenSignal) leadingSilentFrames += 1;
      trailingSilentFrames += 1;
    }
  }

  const durationSeconds = frameCount / sampleRate;
  const rmsAmplitude = Math.sqrt(sumSquares / sampleCount);
  const signalRatio = signalFrameCount / frameCount;
  const clippedSampleRatio = clippedSampleCount / sampleCount;

  return {
    frameCount,
    durationSeconds,
    peakAmplitude,
    rmsAmplitude,
    signalFrameCount,
    signalRatio,
    mostlySilent: signalRatio < 0.2 || rmsAmplitude < 0.005,
    clippedSampleCount,
    clippedSampleRatio,
    leadingSilenceSeconds: leadingSilentFrames / sampleRate,
    trailingSilenceSeconds: trailingSilentFrames / sampleRate,
  };
}

export async function readWavInfo(filePath) {
  const buffer = await readFile(filePath);

  if (buffer.length < 44) {
    throw new WavInfoError('Invalid WAV: file is too small to contain a WAV header', { sizeBytes: buffer.length });
  }

  if (readAscii(buffer, 0, 4) !== 'RIFF' || readAscii(buffer, 8, 4) !== 'WAVE') {
    throw new WavInfoError('Invalid WAV: missing RIFF/WAVE header');
  }

  const chunks = findChunks(buffer);
  const fmt = chunks.get('fmt ');
  const data = chunks.get('data');

  if (!fmt) throw new WavInfoError('Invalid WAV: missing fmt chunk');
  if (!data) throw new WavInfoError('Invalid WAV: missing data chunk');
  if (fmt.size < 16) throw new WavInfoError('Invalid WAV: fmt chunk is too small', { fmtSize: fmt.size });

  const audioFormat = buffer.readUInt16LE(fmt.dataOffset);
  const channels = buffer.readUInt16LE(fmt.dataOffset + 2);
  const sampleRate = buffer.readUInt32LE(fmt.dataOffset + 4);
  const byteRate = buffer.readUInt32LE(fmt.dataOffset + 8);
  const blockAlign = buffer.readUInt16LE(fmt.dataOffset + 12);
  const bitsPerSample = buffer.readUInt16LE(fmt.dataOffset + 14);

  assertPcm16({ audioFormat, bitsPerSample });

  if (channels <= 0) throw new WavInfoError('Invalid WAV: channel count must be positive', { channels });
  if (sampleRate <= 0) throw new WavInfoError('Invalid WAV: sample rate must be positive', { sampleRate });
  if (blockAlign !== channels * 2) {
    throw new WavInfoError('Invalid WAV: blockAlign does not match channels and bit depth', {
      channels,
      bitsPerSample,
      blockAlign,
    });
  }

  const signal = analyzePcm16(buffer, {
    dataOffset: data.dataOffset,
    dataSize: data.size,
    channels,
    sampleRate,
    blockAlign,
  });

  return {
    filePath,
    sizeBytes: buffer.length,
    audioFormat,
    channels,
    sampleRate,
    byteRate,
    blockAlign,
    bitsPerSample,
    dataSizeBytes: data.size,
    ...signal,
  };
}
