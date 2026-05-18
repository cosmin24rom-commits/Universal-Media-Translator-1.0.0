const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

ffmpeg.setFfmpegPath(ffmpegStatic);

function getAudioDuration(audioPath) {
    return new Promise((resolve) => {
        const ff = spawn(ffmpegStatic, ['-i', audioPath]);
        let errOut = '';
        ff.stderr.on('data', d => { errOut += d.toString(); });
        ff.on('close', () => {
            const match = errOut.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (match) {
                const h = parseInt(match[1]);
                const m = parseInt(match[2]);
                const s = parseFloat(match[3]);
                resolve(h * 3600 + m * 60 + s);
            } else {
                resolve(0);
            }
        });
        ff.on('error', () => resolve(0));
    });
}

function extractAudio(videoPath, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    let finalDir = os.tmpdir();
    const tempAudioPath = path.join(finalDir, `audio_extras_${uuidv4()}.wav`);
    
    let startTime = Date.now();
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('start', () => console.log('Extragere audio... din ', videoPath))
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
           let pct = Math.round(progress.percent);
           let timeStr = `Pregătire Whisper...`;
           if (pct > 0) {
              let elapsed = (Date.now() - startTime) / 1000;
              let totalSec = (elapsed / pct) * 100;
              let rem = Math.max(0, totalSec - elapsed);
              if (elapsed > 5) {
                 timeStr = `Extragere: Mai durează aprox. ${Math.floor(rem/60)}m ${Math.floor(rem%60)}s`;
              }
           }
           onProgress({ percent: pct, text: timeStr });
        }
      })
      .on('end', () => resolve(tempAudioPath))
      .on('error', (err) => reject(err))
      .save(tempAudioPath);
  });
}

function extractMp3(videoPath, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    let finalDir = outputDir || path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(finalDir, baseName + '_audio.mp3');
    
    let startTime = Date.now();
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('start', () => console.log('Salvare MP3 in', audioPath))
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
           let pct = Math.round(progress.percent);
           let timeStr = `Generare MP3...`;
           if (pct > 0) {
              let elapsed = (Date.now() - startTime) / 1000;
              let totalSec = (elapsed / pct) * 100;
              let rem = Math.max(0, totalSec - elapsed);
              if (elapsed > 5) {
                 timeStr = `Audio: Mai durează aprox. ${Math.floor(rem/60)}m ${Math.floor(rem%60)}s`;
              }
           }
           onProgress({ percent: pct, text: timeStr });
        }
      })
      .on('end', () => resolve(audioPath))
      .on('error', (err) => reject(err))
      .save(audioPath);
  });
}

module.exports = { extractAudio, extractMp3, getAudioDuration };
