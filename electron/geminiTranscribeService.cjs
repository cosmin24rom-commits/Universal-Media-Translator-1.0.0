const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');

const MAX_INLINE_BYTES = 19 * 1024 * 1024; // 19MB inline limit
const GEMINI_TIMEOUT_MS = 180000; // 3 minute timeout per model attempt

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${ms/1000}s): ${label} nu a răspuns`)), ms)
    )
  ]);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function transcribeWithGemini(audioPath, outputDir, apiKey, onProgress, language) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Cheia API Gemini lipsește. Adaugă-o din Setări AI.');
  }

  const fileSize = fs.statSync(audioPath).size;
  const fileSizeMB = Math.round(fileSize / 1024 / 1024);
  const ext = path.extname(audioPath).toLowerCase().slice(1);

  const mimeMap = {
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    m4b: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac',
    aac: 'audio/aac', webm: 'audio/webm', opus: 'audio/ogg',
    wma: 'audio/x-ms-wma', amr: 'audio/amr', ac3: 'audio/ac3',
  };
  const mimeType = mimeMap[ext] || 'audio/mpeg';

  const langInstruction = (language && language !== 'auto') ? `Limba audio este ${language}. ` : '';
  const prompt = `${langInstruction}Transcrie EXACT tot ce se vorbește în acest fișier audio în format SRT standard.
Returnează NUMAI fișierul SRT, fără alt text, explicații sau cod markdown.
Format obligatoriu:

1
00:00:01,000 --> 00:00:05,000
Textul vorbit

2
00:00:06,000 --> 00:00:10,000
Continuarea textului

Dacă nu se aude nimic, returnează:
1
00:00:00,000 --> 00:00:01,000
[Fără vorbire detectată]`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  // --- PATH A: Inline (fișiere mici < 19MB) ---
  if (fileSize <= MAX_INLINE_BYTES) {
    if (onProgress) onProgress({ percent: 5, text: `Pregătire audio (${fileSizeMB}MB) pentru Gemini...` });

    const audioBuffer = fs.readFileSync(audioPath);
    const base64Audio = audioBuffer.toString('base64');

    for (const modelName of modelsToTry) {
      try {
        if (onProgress) onProgress({ percent: 20, text: `Gemini (${modelName}) transcrie audio...` });
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await withTimeout(
          model.generateContent([
            { inlineData: { mimeType, data: base64Audio } },
            { text: prompt }
          ]),
          GEMINI_TIMEOUT_MS,
          modelName
        );
        return saveSrt(result.response.text(), audioPath, outputDir, onProgress);
      } catch (err) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        console.log(`[GeminiTranscribe inline] ${modelName} eșuat: ${err.message.substring(0, 80)}`);
        if (msg.includes('429') || msg.includes('quota')) { await delay(5000); }
        continue;
      }
    }
  }

  // --- PATH B: File API (fișiere mari > 19MB sau inline a eșuat) ---
  if (onProgress) onProgress({ percent: 10, text: `Fișier mare (${fileSizeMB}MB) - se încarcă la Gemini Files API...` });
  try {
    const fileManager = new GoogleAIFileManager(apiKey);
    const uploadResult = await withTimeout(
      fileManager.uploadFile(audioPath, { mimeType, displayName: path.basename(audioPath) }),
      60000,
      'Upload Gemini Files API'
    );

    // Aștept starea ACTIVE (max 60s)
    let fileInfo = uploadResult.file;
    let waited = 0;
    while (fileInfo.state === 'PROCESSING' && waited < 60000) {
      await delay(2000);
      waited += 2000;
      try { fileInfo = await fileManager.getFile(fileInfo.name); } catch (_) {}
    }
    if (onProgress) onProgress({ percent: 30, text: 'Fișier activ. Gemini transcrie...' });

    for (const modelName of modelsToTry) {
      try {
        if (onProgress) onProgress({ percent: 40, text: `Gemini (${modelName}) procesează audio...` });
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await withTimeout(
          model.generateContent([
            { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
            { text: prompt }
          ]),
          GEMINI_TIMEOUT_MS,
          modelName
        );
        try { await fileManager.deleteFile(uploadResult.file.name); } catch (_) {}
        return saveSrt(result.response.text(), audioPath, outputDir, onProgress);
      } catch (err) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        console.log(`[GeminiTranscribe fileapi] ${modelName} eșuat: ${err.message.substring(0, 80)}`);
        if (msg.includes('429') || msg.includes('quota')) { await delay(5000); }
        continue;
      }
    }
    try { await fileManager.deleteFile(uploadResult.file.name); } catch (_) {}
  } catch (uploadErr) {
    lastError = uploadErr;
    console.log('[GeminiTranscribe] Upload Files API eșuat:', uploadErr.message);
  }

  throw new Error('Transcriere Gemini eșuată (toate modelele). ' + (lastError ? lastError.message.substring(0, 120) : ''));
}

function saveSrt(rawText, audioPath, outputDir, onProgress) {
  if (onProgress) onProgress({ percent: 90, text: 'Salvare transcriere SRT...' });
  let srtContent = rawText
    .replace(/```(srt|txt|)?\n?/g, '')
    .replace(/```\s*$/g, '')
    .trim();

  const baseName = path.basename(audioPath, path.extname(audioPath));
  const finalDir = outputDir || path.dirname(audioPath);
  const srtPath = path.join(finalDir, baseName + '.srt');
  fs.writeFileSync(srtPath, srtContent, 'utf-8');

  if (onProgress) onProgress({ percent: 100, text: 'Transcriere finalizată!' });
  return { success: true, srtPath };
}

module.exports = { transcribeWithGemini };
