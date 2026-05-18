const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpegStatic = require('ffmpeg-static');
const { getAudioDuration } = require('./audioExtractor.cjs');

function getPythonPath() {
   try {
       const home = os.homedir();
       const pythonBase = path.join(home, 'AppData', 'Local', 'Programs', 'Python');
       if (fs.existsSync(pythonBase)) {
          let dirs = fs.readdirSync(pythonBase).filter(d => d.toLowerCase().startsWith('python'));
          dirs.sort((a, b) => {
              const numA = parseInt(a.replace(/-32|-64/g, '').replace(/\D/g, '')) || 0;
              const numB = parseInt(b.replace(/-32|-64/g, '').replace(/\D/g, '')) || 0;
              return numB - numA;
          });
          for(const dir of dirs) {
              const pyPath = path.join(pythonBase, dir, 'python.exe');
              if (fs.existsSync(pyPath)) {
                  return pyPath;
              }
          }
       }
   } catch(e) {}
   return 'python'; 
}

function checkWhisperAvailable(pyCmd) {
  return new Promise((resolve) => {
    const vChild = spawn(pyCmd, ['--version']);
    let vOut = '';
    vChild.stdout.on('data', d => { vOut += d.toString(); });
    vChild.stderr.on('data', d => { vOut += d.toString(); });
    vChild.on('close', () => {
      const match = vOut.match(/Python\s+(\d+)\.(\d+)/i);
      if (!match) {
        resolve({ ok: false, reason: 'Python nu a putut fi detectat pe acest sistem.' });
        return;
      }
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      if (major < 3 || (major === 3 && minor < 8)) {
        resolve({ ok: false, reason: `Python ${major}.${minor} detectat, dar Whisper necesită Python 3.8+. Instalați Python 3.10+ de pe python.org și rulați: pip install openai-whisper` });
        return;
      }
      const wCheck = spawn(pyCmd, ['-c', 'import whisper']);
      wCheck.on('close', (code) => {
        if (code !== 0) {
          resolve({ ok: false, reason: `Python ${major}.${minor} detectat, dar modulul whisper nu este instalat. Rulați în terminal: pip install openai-whisper` });
        } else {
          resolve({ ok: true });
        }
      });
      wCheck.on('error', () => resolve({ ok: false, reason: 'Eroare la verificarea modulului whisper.' }));
    });
    vChild.on('error', () => resolve({ ok: false, reason: 'Python nu este instalat sau nu este în PATH.' }));
  });
}

const whisperLangMap = {
  'Română': 'ro', 'Engleză': 'en', 'Franceză': 'fr', 'Germană': 'de',
  'Spaniolă': 'es', 'Spaniolă (America Latină)': 'es', 'Italiană': 'it',
  'Portugheză (Brazilia)': 'pt', 'Portugheză (Portugalia)': 'pt',
  'Rusă': 'ru', 'Japoneză': 'ja', 'Chineză (Mandarină)': 'zh',
  'Chineză (Cantoneză)': 'yue', 'Coreeană': 'ko', 'Arabă': 'ar',
  'Hindi': 'hi', 'Olandeză': 'nl', 'Poloneză': 'pl', 'Turcă': 'tr',
  'Suedeză': 'sv', 'Daneză': 'da', 'Norvegiană': 'no', 'Finlandeză': 'fi',
  'Greacă': 'el', 'Bulgară': 'bg', 'Croată': 'hr', 'Cehă': 'cs',
  'Maghiară': 'hu', 'Ucraineană': 'uk', 'Indoneziană': 'id',
  'Malaeză': 'ms', 'Vietnameză': 'vi', 'Thailandeză': 'th',
  'Ebraică': 'he', 'Persană': 'fa', 'Georgiană': 'ka', 'Armeană': 'hy',
  'Albaneză': 'sq', 'Bosniacă': 'bs', 'Sârbă': 'sr', 'Macedoneană': 'mk',
  'Slovenă': 'sl', 'Slovacă': 'sk', 'Letonă': 'lv', 'Lituaniană': 'lt',
  'Estonă': 'et', 'Afrikaans': 'af', 'Swahili': 'sw', 'Azeră': 'az',
  'Latină': 'la', 'Islandeză': 'is', 'Irlandeză': 'ga', 'Galeză': 'cy',
  'Filipineză': 'tl', 'Urdu': 'ur',
};

async function transcribeAudio(audioPath, outputDir, onProgress, language) {
  return new Promise(async (resolve, reject) => {
    const finalDir = outputDir || path.dirname(audioPath);
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const finalSrtPath = path.join(finalDir, baseName + '.srt');

    const pyCmd = getPythonPath();

    const check = await checkWhisperAvailable(pyCmd);
    if (!check.ok) {
      return reject(new Error(check.reason));
    }

    const args = ['-m', 'whisper', audioPath, '--model', 'medium', '--output_dir', finalDir, '--output_format', 'srt', '--condition_on_previous_text', 'False', '--fp16', 'False'];
    if (language && language !== 'auto') {
      const isoCode = whisperLangMap[language] || language.toLowerCase().substring(0, 2);
      args.push('--language', isoCode);
    }

    console.log("Se inițiază Inteligența de Auzire Whisper...", pyCmd, args);
    
    const childEnv = Object.assign({}, process.env);
    childEnv.PYTHONIOENCODING = 'utf-8';
    
    if (ffmpegStatic) {
       childEnv.PATH = path.dirname(ffmpegStatic) + path.delimiter + childEnv.PATH;
    }

    const totalSecs = await getAudioDuration(audioPath);
    let currentSeconds = 0;
    const startTime = Date.now() / 1000;

    if (onProgress) {
        onProgress({ percent: 1, text: 'Inițializare model AI...' });
    }

    const child = spawn(pyCmd, args, { env: childEnv });
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const handleData = (d) => {
        const text = d.toString();
        stdoutBuffer += text;
        
        // Find format [01:25:30.000 --> 01:25:35.000]
        const matchesHMMSS = [...text.matchAll(/-->\s+(\d{2}):(\d{2}):(\d{2})/g)];
        // Find format [25:30.000 --> 25:35.000]
        const matchesMMSS = [...text.matchAll(/-->\s+(\d{2}):(\d{2})\.\d{3}/g)];
        
        if (matchesHMMSS.length > 0) {
            const lastMatch = matchesHMMSS[matchesHMMSS.length - 1];
            currentSeconds = parseInt(lastMatch[1]) * 3600 + parseInt(lastMatch[2]) * 60 + parseInt(lastMatch[3]);
        } else if (matchesMMSS.length > 0) {
            const lastMatch = matchesMMSS[matchesMMSS.length - 1];
            currentSeconds = parseInt(lastMatch[1]) * 60 + parseInt(lastMatch[2]);
        }

        if (currentSeconds > 0 && totalSecs > 0 && onProgress) {
            let pct = Math.round((currentSeconds / totalSecs) * 100);
            if (pct > 99) pct = 99;
            
            const elapsedTime = (Date.now() / 1000) - startTime;
            const speed = currentSeconds / elapsedTime;
            
            let timeStr = 'Aproximare...';
            if (elapsedTime > 15) {
                const remainingSecs = totalSecs - currentSeconds;
                const calculatedSpeed = Math.max(speed, 0.001); // Prevent Division by Zero
                const realTimeRemaining = remainingSecs / calculatedSpeed;
                const rMins = Math.floor(realTimeRemaining / 60);
                const rSecs = Math.floor(realTimeRemaining % 60);
                timeStr = `Au mai rămas aprox. ${rMins}m ${rSecs}s`;
            } else if (pct < 5) {
               timeStr = 'Se calculează...';
            }
            
            onProgress({ percent: pct, text: timeStr });
        }
    };

    child.stdout.on('data', handleData);
    child.stderr.on('data', (d) => {
        stderrBuffer += d.toString();
        handleData(d);
    });

    child.on('close', (code) => {
      if (code !== 0) {
         console.error('Whisper a esuat:', code);
         try {
             fs.writeFileSync(path.join(__dirname, '..', 'whisper_debug.log'), `CMD: ${pyCmd} ${args.join(' ')}\nERR CODE: ${code}\nSTDERR: ${stderrBuffer}\nSTDOUT: ${stdoutBuffer}`);
         } catch(e) {}
         let errString = stderrBuffer.length > 0 ? stderrBuffer : stdoutBuffer;
         return reject(new Error(`Eroare de sistem la Whisper (Cod ${code})! Verifica fisierul 'whisper_debug.log'. Motiv: ` + errString.substring(0, 100)));
      }
       
      if (fs.existsSync(finalSrtPath)) {
        if (onProgress) onProgress({ percent: 100, text: 'Salvare finalizată' });
        resolve({
            success: true,
            srtPath: finalSrtPath
        });
      } else {
          const alternativeSrtPath = audioPath + ".srt";
          if (fs.existsSync(alternativeSrtPath)) {
             resolve({ success: true, srtPath: alternativeSrtPath });
          } else {
             reject(new Error("Subtitrarea generată (.srt) lipsește. Verifica logurile Python."));
          }
      }
    });

    child.on('error', (err) => {
        reject(err);
    });
  });
}

module.exports = { transcribeAudio };
