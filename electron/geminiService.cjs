const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function translateText(text, aiConfig, targetLanguage = 'Limba Română', onProgress) {
  const provider = aiConfig.provider || 'gemini';
  
  const normalizedText = text.replace(/\r\n/g, '\n');
  let chunks = [];
  let isSrt = false;
  if (normalizedText.includes('-->') && normalizedText.includes('\n\n')) {
      isSrt = true;
      const blocks = normalizedText.split('\n\n').filter(b => b.trim().length > 0);
      const BATCH_SIZE = 80;
      for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
          chunks.push(blocks.slice(i, i + BATCH_SIZE).join('\n\n'));
      }
  } else {
      const BATCH_SIZE = 4000;
      for (let i = 0; i < normalizedText.length; i += BATCH_SIZE) {
          chunks.push(normalizedText.slice(i, i + BATCH_SIZE));
      }
  }

  const totalChunks = chunks.length;
  const CONCURRENCY = provider === 'claude' ? 5 : 2;

  const makePrompt = (chunkText) => `Ești un traducător profesionist. Traduce textul de mai jos DIRECT în limba ${targetLanguage}.
REGULI OBLIGATORII:
- Returnează EXCLUSIV traducerea, fără niciun alt text, explicație, comentariu sau etichetă.
- Nu adăuga prefixe gen "TEXT:", "Traducere:", "Răspuns:" sau altceva.
- Traducere 100% fidelă și necenzurată față de original.
- Păstrează EXACT aceeași formatare (paragrafe, timpi SRT, structuri tehnice).

${chunkText}`;

  async function translateChunkClaude(chunkText, idx) {
    const claudeKey = aiConfig.claude;
    if (!claudeKey || claudeKey.trim() === '') throw new Error('Cheie Claude lipsă.');
    const models = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-20241022'];
    const prompt = makePrompt(chunkText);
    for (const model of models) {
      let attempts = 0;
      while (attempts < 3) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content: prompt }] })
          });
          const data = await response.json();
          if (!response.ok) {
            if (data.error?.type === 'credit_balance_too_low') throw new Error('Balanță API insuficientă!');
            if (response.status === 404) break;
            if (response.status === 429) { attempts++; await delay(15000); continue; }
            throw new Error(`HTTP ${response.status}: ${data.error?.message}`);
          }
          return (data.content[0].text || '').replace(/^(TEXT|Traducere|Translation|Răspuns)\s*:\s*/i, '').trim();
        } catch (e) {
          if (e.message.includes('Balanță API insuficientă')) throw e;
          attempts++;
          if (attempts >= 3) break;
          await delay(3000);
        }
      }
    }
    throw new Error(`Chunk ${idx+1}: Claude a eșuat pe toate modelele.`);
  }

  async function translateChunkGemini(chunkText, idx) {
    const geminiKey = aiConfig.gemini;
    if (!geminiKey || geminiKey.trim() === '') throw new Error('Cheie Gemini lipsă.');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const prompt = makePrompt(chunkText);
    let lastErr = null;
    for (const modelName of models) {
      let attempts = 0;
      while (attempts < 3) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
          const result = await model.generateContent(prompt);
          return result.response.text().replace(/^(TEXT|Traducere|Translation|Răspuns)\s*:\s*/i, '').trim();
        } catch (e) {
          lastErr = e;
          const msg = (e.message || '').toLowerCase();
          if (msg.includes('429') || msg.includes('quota')) { attempts++; await delay(10000); continue; }
          if (msg.includes('404') || msg.includes('503') || msg.includes('500')) { break; }
          attempts++; await delay(3000);
        }
      }
    }
    // Gemini fallback to Claude
    if (aiConfig.claude && aiConfig.claude.trim() !== '') {
      return await translateChunkClaude(chunkText, idx);
    }
    throw new Error(`Chunk ${idx+1}: Gemini epuizat. ${lastErr?.message || ''}`);
  }

  // Procesare paralelă cu CONCURRENCY limitat
  const results = new Array(totalChunks);
  let done = 0;

  for (let start = 0; start < totalChunks; start += CONCURRENCY) {
    const batch = chunks.slice(start, start + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((chunkText, bi) => {
      const idx = start + bi;
      const fn = provider === 'claude'
        ? translateChunkClaude(chunkText, idx)
        : translateChunkGemini(chunkText, idx);
      return fn.then(r => { results[idx] = r; done++; return r; });
    }));
    if (onProgress) {
      const pct = Math.round((done / totalChunks) * 100);
      onProgress({ percent: pct, text: `Tradus ${done}/${totalChunks} secțiuni...` });
    }
  }

  return results.join('\n\n').trim();
}

async function translateFileDirectly(filePath, aiConfig, targetLanguage, onProgress) {
  const provider = aiConfig.provider || 'gemini';
  const fs = require('fs');
  const path = require('path');

  if (onProgress) onProgress({ percent: 5, text: 'Se încarcă fișierul pentru analiză vizuală...' });

  if (provider === 'claude') {
    const claudeKey = aiConfig.claude;
    if (!claudeKey || claudeKey.trim() === '') throw new Error('Nu ai furnizat o cheie validă pentru Claude.');

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'image/jpeg';
    const isPdf = mimeType === 'application/pdf';
    const mediaBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64Data } }
      : { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } };

    if (onProgress) onProgress({ percent: 20, text: 'Claude analizează documentul scanat...' });

    const prompt = `Extrage tot textul din acest document și traduce-l DIRECT în limba ${targetLanguage}. Returnează EXCLUSIV textul tradus, fără comentarii sau explicații.`;

    let claudeModels = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-3-5-sonnet-20241022'];
    for (const model of claudeModels) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            max_tokens: 8000,
            messages: [{
              role: 'user',
              content: [
                mediaBlock,
                { type: 'text', text: prompt }
              ]
            }]
          })
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 404) continue;
          throw new Error(data.error?.message || response.statusText);
        }
        if (onProgress) onProgress({ percent: 95, text: 'Traducere finalizată!' });
        return (data.content[0].text || '').trim();
      } catch (e) {
        if (e.message && e.message.includes('404')) continue;
        throw e;
      }
    }
    throw new Error('Nu s-a putut procesa documentul cu Claude.');
  } else {
    const geminiKey = aiConfig.gemini;
    if (!geminiKey || geminiKey.trim() === '') throw new Error('Nu ai furnizat o cheie validă pentru Gemini.');

    const { GoogleAIFileManager } = require('@google/generative-ai/server');
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const fileManager = new GoogleAIFileManager(geminiKey);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'image/jpeg';

    if (onProgress) onProgress({ percent: 20, text: 'Se încarcă fișierul la Gemini...' });
    const uploadResult = await fileManager.uploadFile(filePath, { mimeType, displayName: path.basename(filePath) });

    const geminiVisionModels = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    const genAI = new GoogleGenerativeAI(geminiKey);
    const prompt = `Extrage tot textul din acest document și traduce-l DIRECT în limba ${targetLanguage}. Returnează EXCLUSIV textul tradus, fără comentarii sau explicații.`;
    let lastError = null;

    for (const modelName of geminiVisionModels) {
      try {
        if (onProgress) onProgress({ percent: 50, text: `Gemini (${modelName}) analizează documentul scanat...` });
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
          { text: prompt }
        ]);
        try { await fileManager.deleteFile(uploadResult.file.name); } catch (e) {}
        if (onProgress) onProgress({ percent: 95, text: 'Traducere finalizată!' });
        return result.response.text().trim();
      } catch (e) {
        lastError = e;
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('429') || msg.includes('quota') || msg.includes('404') || msg.includes('not found') || msg.includes('unavailable')) {
          await delay(3000);
          continue;
        }
        break;
      }
    }

    try { await fileManager.deleteFile(uploadResult.file.name); } catch (e) {}

    // Fallback to Claude if Gemini exhausted and Claude key available
    if (aiConfig.claude && aiConfig.claude.trim() !== '') {
      if (onProgress) onProgress({ percent: 60, text: 'Gemini indisponibil. Se folosește Claude pentru document scanat...' });
      return await translateFileDirectly(filePath, { ...aiConfig, provider: 'claude' }, targetLanguage, onProgress);
    }

    throw new Error('Nu s-a putut procesa documentul scanat. ' + (lastError?.message || ''));
  }
}

module.exports = { translateText, translateFileDirectly };
