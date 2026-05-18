import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';

// PORTABILITATE — userData lângă exe, nu în AppData
if (app.isPackaged) {
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
  const dataDir = path.join(exeDir, 'data');
  app.setPath('userData', dataDir);
  app.setPath('logs', path.join(dataDir, 'logs'));
  app.setPath('crashDumps', path.join(dataDir, 'crashes'));
}

app.disableHardwareAcceleration();

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import fsRaw from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Lazy-loaded modules ---
let _ffmpegStatic = null;
let _audioExtractor = null;
let _whisperService = null;
let _geminiService = null;
let _geminiTranscribeService = null;
let _edgeTtsNodeService = null;
let _pdfParse = null;
let _mammoth = null;

function getAudioExtractor() {
  if (!_audioExtractor) {
    _ffmpegStatic = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(_ffmpegStatic);
    _audioExtractor = require('./audioExtractor.cjs');
  }
  return _audioExtractor;
}
function getWhisperService() {
  if (!_whisperService) _whisperService = require('./whisperService.cjs');
  return _whisperService;
}
function getGeminiService() {
  if (!_geminiService) _geminiService = require('./geminiService.cjs');
  return _geminiService;
}
function getEdgeTtsService() {
  if (!_edgeTtsNodeService) _edgeTtsNodeService = require('./edgeTtsNodeService.cjs');
  return _edgeTtsNodeService;
}
function getGeminiTranscribeService() {
  if (!_geminiTranscribeService) _geminiTranscribeService = require('./geminiTranscribeService.cjs');
  return _geminiTranscribeService;
}
function getPdfParse() {
  if (!_pdfParse) {
    const mod = require('pdf-parse');
    _pdfParse = typeof mod === 'function' ? mod : (mod.default || mod.PDFParse || mod);
  }
  return _pdfParse;
}
function getMammoth() {
  if (!_mammoth) _mammoth = require('mammoth');
  return _mammoth;
}

let mainWindow;

function createWindow() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../build/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0a0a0a',
    icon: fsRaw.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Găsește directorul executabilului portabil — PORTABLE_EXECUTABLE_DIR e setat de NSIS
function getExeDir() {
  if (!app.isPackaged) return path.join(__dirname, '..');
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
}

// Config loader — citește config.json din același folder cu exe-ul portabil
ipcMain.handle('config:load', async () => {
  try {
    const configPath = path.join(getExeDir(), 'config.json');
    if (!fsRaw.existsSync(configPath)) return { success: false };
    const raw = await fs.readFile(configPath, 'utf-8');
    const cfg = JSON.parse(raw);
    return { success: true, config: cfg };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Config saver — scrie config.json în același folder cu exe-ul portabil
ipcMain.handle('config:save', async (event, cfg) => {
  try {
    const configPath = path.join(getExeDir(), 'config.json');
    await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// IPC BINDINGS
ipcMain.handle('dialog:openFile', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, options);
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('dialog:openDirectory', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('dialog:saveFile', async (event, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, options);
  if (canceled) return null;
  return filePath;
});

// Extragere Audio
ipcMain.handle('media:extractAudio', async (event, videoPath, outputDir) => {
  try {
    const { extractAudio } = getAudioExtractor();
    const audioPath = await extractAudio(videoPath, outputDir, (prog) => {
       event.sender.send('progress-update', prog);
    });
    return { success: true, audioPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Extragere MP3 direct
ipcMain.handle('media:extractMp3', async (event, videoPath, outputDir) => {
  try {
    const { extractMp3 } = getAudioExtractor();
    const audioPath = await extractMp3(videoPath, outputDir, (prog) => {
       event.sender.send('progress-update', prog);
    });
    return { success: true, audioPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('media:transcribeAudio', async (event, audioPath, outputDir, apiConfig, language) => {
  let whisperError = null;
  try {
    const { transcribeAudio } = getWhisperService();
    const whisperTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Whisper timeout după 2 minute — se folosește Gemini Cloud.')), 120000)
    );
    const result = await Promise.race([
      transcribeAudio(audioPath, outputDir, (prog) => {
        event.sender.send('progress-update', prog);
      }, language),
      whisperTimeout
    ]);
    return result;
  } catch (err) {
    whisperError = err;
    console.log('[Whisper] A eșuat:', err.message, '- Se încearcă fallback Gemini...');
  }

  if (apiConfig && apiConfig.gemini && apiConfig.gemini.trim() !== '') {
    try {
      event.sender.send('progress-update', { percent: 2, text: 'Whisper indisponibil → Se folosește Gemini Cloud (max 3 min)...' });
      const { transcribeWithGemini } = getGeminiTranscribeService();
      const result = await transcribeWithGemini(audioPath, outputDir, apiConfig.gemini, (prog) => {
        event.sender.send('progress-update', prog);
      }, language);
      return result;
    } catch (geminiErr) {
      return {
        success: false,
        error: `Transcrierea a eșuat.\n\nWhisper: ${whisperError.message}\n\nGemini: ${geminiErr.message}`
      };
    }
  }

  const hint = (apiConfig && !apiConfig.gemini)
    ? '\n\nSfat: Adaugă o cheie Gemini API în Setări pentru a activa transcrierea cloud ca alternativă.'
    : '';
  return { success: false, error: whisperError.message + hint };
});

// AI Translation
ipcMain.handle('ai:translate', async (event, text, apiKey, targetLanguage) => {
  console.log('[ai:translate] provider:', apiKey?.provider, '| text length:', text?.length, '| first 100:', JSON.stringify((text||'').substring(0,100)));
  try {
    const { translateText } = getGeminiService();
    const translated = await translateText(text, apiKey, targetLanguage, (prog) => {
        event.sender.send('progress-update', prog);
    });
    return { success: true, text: translated };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// AI Translate file directly (for scanned PDFs)
ipcMain.handle('ai:translateFileDirect', async (event, filePath, apiKey, targetLanguage) => {
  try {
    const { translateFileDirectly } = getGeminiService();
    const translated = await translateFileDirectly(filePath, apiKey, targetLanguage, (prog) => {
      event.sender.send('progress-update', prog);
    });
    return { success: true, text: translated };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Edge TTS
ipcMain.handle('media:generateAudio', async (event, text, voice, outputDir, fileName) => {
  try {
    const { generateAudio } = getEdgeTtsService();
    const audioPath = await generateAudio(text, voice, outputDir, fileName);
    return { success: true, audioPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// File System helpers
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let content = "";

    if (ext === '.pdf') {
      const pdfParse = getPdfParse();
      const buffer = await fs.readFile(filePath);
      try {
        const data = await pdfParse(buffer);
        content = data.text;
        console.log('[fs:readFile] PDF text length:', content.length);
        const isImagePdf = content.trim().length < 50;
        return { success: true, content, isImagePdf };
      } catch (pdfErr) {
        console.log('[fs:readFile] PDF parse eșuat, se tratează ca scanat:', pdfErr.message);
        return { success: true, content: '', isImagePdf: true };
      }

    } else if (ext === '.docx') {
      const mammoth = getMammoth();
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;

    } else if (ext === '.doc') {
      throw new Error('Fișierele .doc (format vechi Word binar) nu pot fi citite direct. Salvați-l ca .docx sau .txt și reîncercați.');

    } else if (ext === '.odt' || ext === '.epub') {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(filePath);
      const xmlFiles = ext === '.odt'
        ? ['content.xml']
        : zip.getEntries().filter(e => e.entryName.endsWith('.html') || e.entryName.endsWith('.xhtml') || e.entryName.endsWith('.htm')).map(e => e.entryName);
      let combined = '';
      for (const fname of xmlFiles) {
        try { combined += zip.readAsText(fname) + '\n'; } catch (_) {}
      }
      content = combined.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s{2,}/g, ' ').trim();

    } else if (ext === '.rtf') {
      const raw = await fs.readFile(filePath, 'latin1');
      content = raw
        .replace(/\{\\[^{}]*\}/g, '')
        .replace(/\\par\b/g, '\n')
        .replace(/\\line\b/g, '\n')
        .replace(/\\tab\b/g, '\t')
        .replace(/\\'[0-9a-fA-F]{2}/g, m => {
          try { return Buffer.from(m.slice(2), 'hex').toString('latin1'); } catch(_) { return ''; }
        })
        .replace(/\\[a-zA-Z]+\-?\d*\s?/g, '')
        .replace(/[\\{}]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    } else if (ext === '.html' || ext === '.htm') {
      const raw = await fs.readFile(filePath, 'utf-8');
      content = raw
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    } else if (ext === '.smi') {
      const raw = await fs.readFile(filePath, 'utf-8');
      content = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g,' ').replace(/\s{2,}/g,' ').trim();

    } else if (ext === '.ttml' || ext === '.dfxp') {
      const raw = await fs.readFile(filePath, 'utf-8');
      content = raw.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g,' ').trim();

    } else {
      content = await fs.readFile(filePath, 'utf-8');
    }

    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:writeTranslated', async (event, srcPath, outputDir, translatedText, targetLanguage, forcedFormat) => {
  try {
    const srcExt = path.extname(srcPath).toLowerCase().replace('.', '');
    const baseName = path.basename(srcPath, path.extname(srcPath));
    const outFolder = outputDir && outputDir.trim() !== '' ? outputDir : path.dirname(srcPath);
    const outName = `(${targetLanguage})_${baseName}`;
    const fmt = forcedFormat || (srcExt === 'pdf' ? 'pdf' : srcExt === 'docx' || srcExt === 'doc' ? 'docx' : srcExt === 'vtt' ? 'vtt' : 'txt');

    if (fmt === 'pdf') {
      const PDFDocument = require('pdfkit');
      const outPath = path.join(outFolder, outName + '.pdf');
      await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 60, size: 'A4' });
        const stream = fsRaw.createWriteStream(outPath);
        doc.pipe(stream);
        const fontCandidates = [
          'C:/Windows/Fonts/arial.ttf',
          'C:/Windows/Fonts/calibri.ttf',
          'C:/Windows/Fonts/times.ttf',
          'C:/Windows/Fonts/verdana.ttf',
        ];
        let fontSet = false;
        for (const fp of fontCandidates) {
          if (fsRaw.existsSync(fp)) {
            doc.registerFont('UniFont', fp);
            doc.font('UniFont').fontSize(11);
            fontSet = true;
            break;
          }
        }
        if (!fontSet) doc.fontSize(11);
        const paragraphs = translatedText.split('\n');
        paragraphs.forEach(para => {
          if (para.trim() === '') {
            doc.moveDown(0.4);
          } else {
            doc.text(para, { align: 'left', lineGap: 3 });
          }
        });
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      return { success: true, outPath };
    } else if (fmt === 'docx') {
      const { Document, Packer, Paragraph, TextRun } = require('docx');
      const lines = translatedText.split('\n');
      const paragraphs = lines.map(line => new Paragraph({
        children: [new TextRun({ text: line, size: 24, font: 'Arial' })]
      }));
      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const buffer = await Packer.toBuffer(doc);
      const outPath = path.join(outFolder, outName + '.docx');
      await fs.writeFile(outPath, buffer);
      return { success: true, outPath };
    } else if (fmt === 'vtt') {
      const vttContent = 'WEBVTT\n\n' + translatedText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      const outPath = path.join(outFolder, outName + '.vtt');
      await fs.writeFile(outPath, vttContent, 'utf-8');
      return { success: true, outPath };
    } else {
      const outExt = fmt === 'srt' ? '.srt' : fmt === 'txt' ? '.txt' : '.txt';
      const outPath = path.join(outFolder, outName + outExt);
      await fs.writeFile(outPath, translatedText, 'utf-8');
      return { success: true, outPath };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:copyFile', async (event, srcPath, destPath) => {
  try {
    await fs.copyFile(srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:deleteFile', async (event, filePath) => {
  try {
    if (fsRaw.existsSync(filePath)) {
       await fs.unlink(filePath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
