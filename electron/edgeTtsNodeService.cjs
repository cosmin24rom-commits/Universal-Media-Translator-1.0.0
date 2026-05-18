const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_CHUNK_CHARS = 3000;

function splitIntoChunks(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) { chunks.push(remaining); break; }
    let breakAt = maxChars;
    const lastPeriod = remaining.lastIndexOf('.', maxChars);
    const lastNewline = remaining.lastIndexOf('\n', maxChars);
    const lastSpace = remaining.lastIndexOf(' ', maxChars);
    if (lastPeriod > maxChars * 0.5) breakAt = lastPeriod + 1;
    else if (lastNewline > maxChars * 0.5) breakAt = lastNewline + 1;
    else if (lastSpace > maxChars * 0.5) breakAt = lastSpace + 1;
    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return chunks.filter(c => c.length > 0);
}

async function generateAudio(text, voice = 'ro-RO-AlinaNeural', outputDir, customFileName) {
  const finalDir = outputDir || os.tmpdir();
  const fName = customFileName || `tts_${uuidv4()}.mp3`;
  const outputPath = path.join(finalDir, fName);

  const cleanText = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanText) throw new Error('Textul pentru sinteză vocală este gol.');

  const chunks = splitIntoChunks(cleanText, MAX_CHUNK_CHARS);
  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    // Temp dir unic per chunk pentru a evita conflicte de nume
    const tmpDir = path.join(os.tmpdir(), `tts_chunk_${uuidv4()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const result = await tts.toFile(tmpDir, chunks[i]);
      const buf = fs.readFileSync(result.audioFilePath);
      audioBuffers.push(buf);
    } finally {
      // Curăță temp dir
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }

    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(outputPath, Buffer.concat(audioBuffers));
  return outputPath;
}

module.exports = { generateAudio };
