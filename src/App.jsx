import React, { useState, useEffect } from 'react';
import { Upload, Play, Headphones, Mic, FileText, CheckCircle2, Languages, Settings, Loader2, Video, UploadCloud, Download } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [activeTab, setActiveTab] = useState('video');
  const [activeAi, setActiveAi] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('ro-RO-AlinaNeural');
  const [outputDir, setOutputDir] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Română');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('auto');
  const [progressData, setProgressData] = useState({ percent: 0, text: '' });

  const supportedLanguages = [
    "Afrikaans", "Albaneză", "Arabă", "Armeană", "Azeră", "Bosniacă", "Bulgară", "Cehă",
    "Chineză (Mandarină)", "Chineză (Cantoneză)", "Coreeană", "Croată", "Daneză", "Ebraică",
    "Engleză", "Estonă", "Filipineză", "Finlandeză", "Franceză", "Georgiană", "Germană",
    "Greacă", "Hindi", "Indoneziană", "Irlandeză", "Islandeză", "Italiană", "Japoneză",
    "Letonă", "Lituaniană", "Macedoneană", "Maghiară", "Malaeză", "Norvegiană", "Olandeză",
    "Persană", "Poloneză", "Portugheză (Brazilia)", "Portugheză (Portugalia)", "Română",
    "Rusă", "Sârbă", "Slovacă", "Slovenă", "Spaniolă", "Spaniolă (America Latină)", "Suedeză",
    "Swahili", "Thailandeză", "Turcă", "Ucraineană", "Urdu", "Vietnameză", "Galeză", "Latină"
  ].sort((a, b) => a.localeCompare(b));

  const ttsVoices = {
    "Arabă": [{ id: "ar-SA-ZariyahNeural", name: "Zariyah (Feminin)" }, { id: "ar-SA-HamedNeural", name: "Hamed (Masculin)" }],
    "Chineză": [{ id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao (Feminin)" }, { id: "zh-CN-YunxiNeural", name: "Yunxi (Masculin)" }],
    "Coreeană": [{ id: "ko-KR-SunHiNeural", name: "SunHi (Feminin)" }, { id: "ko-KR-InJoonNeural", name: "InJoon (Masculin)" }],
    "Engleză": [
      { id: "en-US-JennyNeural", name: "Jenny (US, Feminin)" },
      { id: "en-US-ChristopherNeural", name: "Christopher (US, Masculin)" },
      { id: "en-GB-SoniaNeural", name: "Sonia (UK, Feminin)" },
      { id: "en-GB-RyanNeural", name: "Ryan (UK, Masculin)" }
    ],
    "Franceză": [{ id: "fr-FR-DeniseNeural", name: "Denise (Feminin)" }, { id: "fr-FR-HenriNeural", name: "Henri (Masculin)" }],
    "Germană": [{ id: "de-DE-KatjaNeural", name: "Katja (Feminin)" }, { id: "de-DE-ConradNeural", name: "Conrad (Masculin)" }],
    "Italiană": [{ id: "it-IT-IsabellaNeural", name: "Isabella (Feminin)" }, { id: "it-IT-DiegoNeural", name: "Diego (Masculin)" }],
    "Japoneză": [{ id: "ja-JP-NanamiNeural", name: "Nanami (Feminin)" }, { id: "ja-JP-KeitaNeural", name: "Keita (Masculin)" }],
    "Portugheză": [{ id: "pt-BR-FranciscaNeural", name: "Francisca (BR, Feminin)" }, { id: "pt-BR-AntonioNeural", name: "Antonio (BR, Masculin)" }],
    "Română": [{ id: "ro-RO-AlinaNeural", name: "Alina (Feminin, Natural)" }, { id: "ro-RO-EmilNeural", name: "Emil (Masculin, Cald)" }],
    "Rusă": [{ id: "ru-RU-SvetlanaNeural", name: "Svetlana (Feminin)" }, { id: "ru-RU-DmitryNeural", name: "Dmitry (Masculin)" }],
    "Spaniolă": [{ id: "es-ES-ElviraNeural", name: "Elvira (ES, Feminin)" }, { id: "es-ES-AlvaroNeural", name: "Alvaro (ES, Masculin)" }],
    "Turcă": [{ id: "tr-TR-EmelNeural", name: "Emel (Feminin)" }, { id: "tr-TR-AhmetNeural", name: "Ahmet (Masculin)" }],
    "Olandeză": [{ id: "nl-NL-ColetteNeural", name: "Colette (Feminin)" }, { id: "nl-NL-MaartenNeural", name: "Maarten (Masculin)" }],
  };

  useEffect(() => {
    const savedAi = localStorage.getItem('active_ai_provider');
    if (savedAi) setActiveAi(savedAi);
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiKey(savedKey);
    const savedCKey = localStorage.getItem('claude_api_key');
    if (savedCKey) setClaudeKey(savedCKey);
    const savedVoice = localStorage.getItem('selected_tts_voice');
    if (savedVoice) setSelectedVoice(savedVoice);
    const savedOut = localStorage.getItem('output_directory');
    if (savedOut) setOutputDir(savedOut);
    const savedLang = localStorage.getItem('target_language');
    if (savedLang) setTargetLanguage(savedLang);
    const savedTranscLang = localStorage.getItem('transcription_language');
    if (savedTranscLang) setTranscriptionLanguage(savedTranscLang);

    // Încarcă TOATE setările din config.json (portabil — lângă exe)
    if (window.electronAPI && window.electronAPI.loadConfig) {
      window.electronAPI.loadConfig().then(res => {
        if (res && res.success && res.config) {
          const cfg = res.config;
          if (cfg.gemini)               setGeminiKey(cfg.gemini);
          if (cfg.claude)               setClaudeKey(cfg.claude);
          if (cfg.provider)             setActiveAi(cfg.provider);
          if (cfg.voice)                setSelectedVoice(cfg.voice);
          if (cfg.outputDir)            setOutputDir(cfg.outputDir);
          if (cfg.targetLanguage)       setTargetLanguage(cfg.targetLanguage);
          if (cfg.transcriptionLanguage) setTranscriptionLanguage(cfg.transcriptionLanguage);
        }
      }).catch(() => {});
    }

    if (window.electronAPI && window.electronAPI.onProgressUpdate) {
      window.electronAPI.onProgressUpdate((data) => {
        setProgressData({ percent: data.percent || 0, text: data.text || '' });
      });
    }
    return () => {
      if (window.electronAPI?.removeProgressListeners) {
        window.electronAPI.removeProgressListeners();
      }
    };
  }, []);

  useEffect(() => {
    setProgressData({ percent: 0, text: '' });
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('active_ai_provider', activeAi);
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('claude_api_key', claudeKey);
    localStorage.setItem('selected_tts_voice', selectedVoice);
    localStorage.setItem('output_directory', outputDir);
    localStorage.setItem('target_language', targetLanguage);
    localStorage.setItem('transcription_language', transcriptionLanguage);
    // Salvează TOATE setările în config.json (portabil — lângă exe)
    if (window.electronAPI && window.electronAPI.saveConfig) {
      window.electronAPI.saveConfig({
        provider: activeAi,
        gemini: geminiKey,
        claude: claudeKey,
        voice: selectedVoice,
        outputDir,
        targetLanguage,
        transcriptionLanguage
      }).catch(() => {});
    }
  }, [activeAi, geminiKey, claudeKey, selectedVoice, outputDir, targetLanguage, transcriptionLanguage]);

  const [settingsSaved, setSettingsSaved] = useState(false);
  const saveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const apiConfig = { provider: activeAi, gemini: geminiKey, claude: claudeKey };

  const handleSelectOutputDir = async () => {
    if (!window.electronAPI) return;
    const fPath = await window.electronAPI.openDirectory();
    if (fPath) setOutputDir(fPath);
  };

  // --- Salvare fișier cu dialog ---
  const saveFileAs = async (sourcePath, suggestedName, filterName, extensions) => {
    if (!sourcePath) return;
    try {
      const savePath = await window.electronAPI.saveFile({
        defaultPath: suggestedName,
        filters: [
          { name: filterName, extensions },
          { name: 'Toate fișierele', extensions: ['*'] }
        ]
      });
      if (!savePath) return;
      const isBinary = /\.(mp3|wav|ogg|flac|aac|mp4|mkv)$/i.test(sourcePath);
      if (isBinary) {
        const res = await window.electronAPI.copyFile(sourcePath, savePath);
        if (!res.success) throw new Error(res.error);
      } else {
        const readRes = await window.electronAPI.readFile(sourcePath);
        if (!readRes.success) throw new Error(readRes.error);
        const writeRes = await window.electronAPI.writeFile(savePath, readRes.content);
        if (!writeRes.success) throw new Error(writeRes.error);
      }
      alert(`Fișier salvat la:\n${savePath}`);
    } catch (err) {
      alert('Eroare salvare: ' + err.message);
    }
  };

  const [docOutputFormat, setDocOutputFormat] = useState('pdf');
  const [srtOutputFormat, setSrtOutputFormat] = useState('srt');
  const [audioTranslateBeforeTts, setAudioTranslateBeforeTts] = useState(false);

  // ===== VIDEO TAB =====
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoStatus, setVideoStatus] = useState('idle');
  const [videoFiles, setVideoFiles] = useState({});

  const handleSelectVideo = async () => {
    if (!window.electronAPI) return;
    const filePath = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [
        { name: 'Video (toate formatele)', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'ts', 'mts', 'm2ts', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv', 'rm', 'rmvb', 'divx', 'f4v', 'asf', 'vob', 'mxf', 'dv'] },
        { name: 'Toate fișierele', extensions: ['*'] }
      ]
    });
    if (filePath) { setSelectedVideo(filePath); setVideoStatus('idle'); setVideoFiles({}); setProgressData({ percent: 0, text: '' }); }
  };

  const extractMp3Only = async () => {
    if (!selectedVideo) return;
    try {
      setProgressData({ percent: 0, text: '' });
      setVideoStatus('extracting');
      const extRes = await window.electronAPI.extractMp3(selectedVideo, outputDir);
      if (!extRes.success) throw new Error(extRes.error);
      setVideoStatus('idle');
      setVideoFiles({ ...videoFiles, mp3: extRes.audioPath });
      alert(`Audio MP3 extras la:\n${extRes.audioPath}`);
    } catch (err) {
      alert('Eroare MP3: ' + err.message);
      setVideoStatus('idle');
    }
  };

  const processVideoAllInOne = async () => {
    if (!selectedVideo) return;
    try {
      setProgressData({ percent: 0, text: '' });
      setVideoStatus('extracting');
      const extRes = await window.electronAPI.extractAudio(selectedVideo, outputDir);
      if (!extRes.success) throw new Error(extRes.error);

      setVideoStatus('transcribing');
      const trRes = await window.electronAPI.transcribeAudio(extRes.audioPath, outputDir, apiConfig, transcriptionLanguage === 'auto' ? null : transcriptionLanguage);
      await window.electronAPI.deleteFile(extRes.audioPath);
      if (!trRes.success) throw new Error(trRes.error);

      setVideoFiles({ srt: trRes.srtPath });
      setVideoStatus('done');
      alert(`Subtitrare originală (SRT) generată la:\n${trRes.srtPath}`);
    } catch (err) {
      alert('Eroare Procesare Video: ' + err.message);
      setVideoStatus('idle');
    }
  };

  const translateVideoSrt = async () => {
    if (!videoFiles.srt) return;
    setProgressData({ percent: 1, text: 'Conectare la AI...' });
    setVideoStatus('translating');
    try {
      const readRes = await window.electronAPI.readFile(videoFiles.srt);
      if (!readRes.success) throw new Error(readRes.error);

      const translateRes = await window.electronAPI.translateText(readRes.content, apiConfig, targetLanguage);
      if (!translateRes.success) throw new Error(translateRes.error);

      const writeRes = await window.electronAPI.writeTranslated(videoFiles.srt, outputDir, translateRes.text, targetLanguage, srtOutputFormat);
      if (!writeRes.success) throw new Error(writeRes.error);

      setVideoFiles({ ...videoFiles, translatedSrt: writeRes.outPath });
      setVideoStatus('done');
      alert(`Subtitrare tradusă în ${targetLanguage} salvată la:\n${writeRes.outPath}`);
    } catch (err) {
      alert('Eroare Traducere: ' + err.message);
      setVideoStatus('done');
    }
  };

  const generateVideoDub = async () => {
    if (!videoFiles.translatedSrt) { alert('Traduce subtitrarea mai întâi!'); return; }
    setVideoStatus('dubbing');
    try {
      const readRes = await window.electronAPI.readFile(videoFiles.translatedSrt);
      if (!readRes.success) throw new Error(readRes.error);
      const textToRead = readRes.content.replace(/\d+\r?\n[\d:,]+ --> [\d:,]+\r?\n/g, '').replace(/\r?\n/g, ' ').trim();
      const dubRes = await window.electronAPI.generateAudio(textToRead, selectedVoice, outputDir, `dublaj_video_${Date.now()}.mp3`);
      if (!dubRes.success) throw new Error(dubRes.error);
      setVideoFiles({ ...videoFiles, dubMp3: dubRes.audioPath });
      setVideoStatus('done');
      alert(`Dublaj audio salvat la:\n${dubRes.audioPath}`);
    } catch (err) {
      alert('Eroare dublaj: ' + err.message);
      setVideoStatus('done');
    }
  };

  // ===== AUDIO TAB =====
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioStatus, setAudioStatus] = useState('idle');
  const [audioFiles, setAudioFiles] = useState({});

  const handleSelectAudio = async () => {
    if (!window.electronAPI) return;
    const filePath = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [
        { name: 'Audio (toate formatele)', extensions: ['mp3', 'wav', 'm4a', 'm4b', 'ogg', 'flac', 'aac', 'wma', 'opus', 'aiff', 'aif', 'amr', 'ac3', 'mp2', 'mka', 'oga', 'ra', 'ape', 'alac', 'dts', 'caf', 'au', 'snd'] },
        { name: 'Toate fișierele', extensions: ['*'] }
      ]
    });
    if (filePath) { setSelectedAudio(filePath); setAudioStatus('idle'); setAudioFiles({}); setProgressData({ percent: 0, text: '' }); }
  };

  const processAudioTranscribe = async () => {
    if (!selectedAudio) return;
    setProgressData({ percent: 0, text: '' });
    setAudioStatus('transcribing');
    try {
      const trRes = await window.electronAPI.transcribeAudio(selectedAudio, outputDir, apiConfig, transcriptionLanguage === 'auto' ? null : transcriptionLanguage);
      if (!trRes.success) throw new Error(trRes.error);
      setAudioFiles({ srt: trRes.srtPath });
      setAudioStatus('done');
      alert(`Text extras la:\n${trRes.srtPath}`);
    } catch (err) {
      alert('Eroare Transcriere Audio: ' + err.message);
      setAudioStatus('idle');
    }
  };

  const processAudioDub = async () => {
    if (!audioFiles.srt) return;
    setProgressData({ percent: 0, text: '' });
    try {
      const readRes = await window.electronAPI.readFile(audioFiles.srt);
      if (!readRes.success) throw new Error(readRes.error);

      let textContent = readRes.content;

      // Traduce doar dacă utilizatorul a activat explicit traducerea
      const hasKey = activeAi === 'gemini' ? geminiKey.trim() !== '' : claudeKey.trim() !== '';
      if (audioTranslateBeforeTts && hasKey) {
        setAudioStatus('translating');
        setProgressData({ percent: 1, text: 'Se traduce textul...' });
        const translateRes = await window.electronAPI.translateText(textContent, apiConfig, targetLanguage);
        if (translateRes.success) {
          textContent = translateRes.text;
        } else {
          alert('Traducerea a eșuat, se va citi textul original.\n' + translateRes.error);
        }
      }

      setAudioStatus('dubbing');
      const textToRead = textContent.replace(/\d+\r?\n[\d:,]+ --> [\d:,]+\r?\n/g, '').replace(/\r?\n/g, ' ').trim();
      const dubRes = await window.electronAPI.generateAudio(textToRead, selectedVoice, outputDir, `audiobook_${Date.now()}.mp3`);
      if (!dubRes.success) throw new Error(dubRes.error);

      setAudioFiles({ ...audioFiles, dubMp3: dubRes.audioPath });
      setAudioStatus('done');
      alert(`Audiobook MP3 salvat la:\n${dubRes.audioPath}`);
    } catch (err) {
      alert('Eroare generare voce: ' + err.message);
      setAudioStatus('idle');
    }
  };

  // ===== DOCS TAB =====
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docStatus, setDocStatus] = useState('idle');
  const [docFiles, setDocFiles] = useState({});

  const handleSelectDoc = async () => {
    if (!window.electronAPI) return;
    const filePath = await window.electronAPI.openFile({
      properties: ['openFile'],
      filters: [
        { name: 'Documente (toate formatele)', extensions: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt', 'epub', 'html', 'htm', 'md', 'csv', 'xml', 'json', 'srt', 'vtt', 'ass', 'ssa', 'sub', 'sbv', 'smi', 'ttml', 'dfxp', 'stl', 'lrc'] },
        { name: 'Toate fișierele', extensions: ['*'] }
      ]
    });
    if (filePath) { setSelectedDoc(filePath); setDocStatus('idle'); setDocFiles({}); setProgressData({ percent: 0, text: '' }); }
  };

  const processDocTranslate = async () => {
    if (!selectedDoc) return;
    setDocStatus('translating');
    setProgressData({ percent: 1, text: 'Se citește și traduce documentul...' });
    try {
      const readRes = await window.electronAPI.readFile(selectedDoc);
      if (!readRes.success) throw new Error(readRes.error);

      const isScannedPdf = readRes.isImagePdf || readRes.content.trim().length === 0;
      const translateRes = isScannedPdf
        ? await window.electronAPI.translateFileDirect(selectedDoc, apiConfig, targetLanguage)
        : await window.electronAPI.translateText(readRes.content, apiConfig, targetLanguage);
      if (!translateRes.success) throw new Error(translateRes.error);

      const writeRes = await window.electronAPI.writeTranslated(selectedDoc, outputDir, translateRes.text, targetLanguage, docOutputFormat);
      if (!writeRes.success) throw new Error(writeRes.error);

      setDocFiles({ translatedText: writeRes.outPath });
      setDocStatus('done');
      alert(`Document tradus în ${targetLanguage}:\n${writeRes.outPath}`);
    } catch (err) {
      alert('Eroare Traducere Document: ' + err.message);
      setDocStatus('idle');
    }
  };

  const processDocAudiobook = async () => {
    if (!selectedDoc) return;
    setDocStatus('dubbing');
    setProgressData({ percent: 0, text: '' });
    try {
      const pathToRead = docFiles.translatedText || selectedDoc;
      const readRes = await window.electronAPI.readFile(pathToRead);
      if (!readRes.success) throw new Error(readRes.error);

      const textToRead = readRes.content
        .replace(/\d+\r?\n[\d:,]+ --> [\d:,]+\r?\n/g, '')
        .replace(/\r?\n/g, ' ')
        .trim();

      const dubRes = await window.electronAPI.generateAudio(textToRead, selectedVoice, outputDir, `audiobook_${Date.now()}.mp3`);
      if (!dubRes.success) throw new Error(dubRes.error);

      setDocFiles({ ...docFiles, dubMp3: dubRes.audioPath });
      setDocStatus('done');
      alert(`Audiobook MP3 salvat la:\n${dubRes.audioPath}`);
    } catch (err) {
      alert('Eroare Audiobook: ' + err.message);
      setDocStatus('idle');
    }
  };

  // ===== UI COMPONENTS =====
  const tabs = [
    { id: 'video', label: 'Video & Subtitrări', icon: Video, colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20' },
    { id: 'audio', label: 'Audio & Transcriere', icon: Mic, colorClass: 'text-sky-500', bgClass: 'bg-sky-500/10', borderClass: 'border-sky-500/20' },
    { id: 'docs', label: 'Documente & Cărți', icon: FileText, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' },
    { id: 'settings', label: 'Setări AI', icon: Settings, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/20' },
  ];
  const activeTabConfig = tabs.find(t => t.id === activeTab);

  const TargetLanguageSelect = () => (
    <div className="flex bg-dark-900 border border-dark-600 rounded-xl overflow-hidden mb-3">
      <div className="bg-dark-700 px-4 py-2.5 flex items-center border-r border-dark-600">
        <Languages size={18} className="text-gray-300" />
      </div>
      <select
        value={targetLanguage}
        onChange={(e) => setTargetLanguage(e.target.value)}
        className="w-full bg-transparent px-3 py-2 text-white font-bold text-sm outline-none cursor-pointer"
      >
        {supportedLanguages.map(lang => (
          <option key={lang} value={lang} className="text-white bg-dark-900">{lang}</option>
        ))}
      </select>
    </div>
  );

  const ProgressDisplay = ({ colorFrom, colorTo }) => (
    (progressData.percent > 0 || progressData.text !== '') && (
      <div className="w-full bg-dark-900 rounded-xl h-9 overflow-hidden border border-white/5 relative flex items-center shadow-inner mt-4">
        <div className={`bg-gradient-to-r ${colorFrom} ${colorTo} h-full transition-all duration-700 ease-out`} style={{ width: `${Math.max(progressData.percent, 5)}%` }} />
        <span className="absolute w-full text-center text-xs font-bold text-white z-10 drop-shadow-md tracking-wider">
          {progressData.percent > 0 ? `${progressData.percent}% — ` : ''}{progressData.text}
        </span>
      </div>
    )
  );

  const SaveButton = ({ filePath, label, filterName, extensions, color = 'emerald' }) => (
    filePath ? (
      <button
        onClick={() => saveFileAs(filePath, filePath.split('\\').pop(), filterName, extensions)}
        className={`mt-2 w-full px-4 py-2 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-400 rounded-xl text-sm font-bold border border-${color}-500/20 flex items-center justify-center gap-2 transition-colors`}
      >
        <Download size={15} /> Salvează {label}
      </button>
    ) : null
  );

  return (
    <div className="flex h-screen bg-dark-900 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-[280px] glass-panel border-r border-white/5 flex flex-col p-6 z-10 space-y-8 bg-dark-800">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-white font-bold text-xl">U</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Universal</h1>
            <h2 className="text-xs font-medium text-gray-400">Media Translator</h2>
          </div>
        </div>

        <nav className="flex flex-col space-y-2 flex-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium border",
                  isActive
                    ? `bg-dark-900 border-white/10 shadow-lg shadow-black/50 ${tab.colorClass}`
                    : "border-transparent text-gray-400 hover:bg-dark-700/50 hover:text-gray-200"
                )}
              >
                <div className={clsx("p-2 rounded-lg transition-colors", isActive ? tab.bgClass : "bg-dark-700/50")}>
                  <Icon size={18} />
                </div>
                <span className={clsx("text-base tracking-wide", isActive ? "text-white" : "")}>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-4 text-xs text-gray-500 text-center border-t border-white/5">
          <span className="inline-block px-3 py-1 bg-green-500/10 text-green-400 rounded-full font-medium">100% Portabil</span>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-y-auto w-full">
        <header className="h-24 flex flex-col justify-center px-10 flex-shrink-0 border-b border-white/5 bg-dark-900/50 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <activeTabConfig.icon className={activeTabConfig.colorClass} size={28} />
            <h2 className="text-3xl font-extrabold text-white tracking-tight">{activeTabConfig.label}</h2>
          </div>
        </header>

        <main className="p-10 flex-1 max-w-6xl mx-auto w-full">

          {/* ===== TAB VIDEO ===== */}
          {activeTab === 'video' && (
            <div className="space-y-8 w-full">
              {!selectedVideo ? (
                <div
                  onClick={handleSelectVideo}
                  className="w-full p-12 rounded-3xl border-2 border-dashed border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/40 transition-all h-72 shadow-2xl group"
                >
                  <div className="w-20 h-20 rounded-2xl bg-dark-800/80 group-hover:bg-rose-500 text-rose-500 group-hover:text-white flex items-center justify-center mb-6 transition-all duration-300">
                    <UploadCloud size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Selectează un fișier Video</h3>
                  <p className="text-gray-400">MP4, MKV, AVI, MOV, WebM, TS, MTS, WMV, FLV, M4V, MPG, 3GP, VOB, RM, DIVX și altele</p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-dark-800/80 border border-rose-500/30 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs text-rose-400/80 font-semibold mb-1">Fișier Video Încărcat</p>
                    <p className="text-white font-semibold text-lg">{selectedVideo.split('\\').pop()}</p>
                  </div>
                  <button onClick={() => { setSelectedVideo(null); setVideoFiles({}); setVideoStatus('idle'); }} className="px-5 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors">Schimbă</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Panou 1: Extragere + Transcriere */}
                <div className={clsx("p-8 rounded-3xl bg-dark-800 flex flex-col shadow-xl", selectedVideo ? "opacity-100" : "opacity-40 pointer-events-none")}>
                  <h4 className="text-xl font-bold text-white mb-2">1. Subtitrare Nativă (STT)</h4>
                  <p className="text-gray-400 mb-6 text-sm flex-1">Extrage audio și transcrie cu Whisper (local) sau Gemini Cloud (API key).</p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Limbă audio:</span>
                    <select value={transcriptionLanguage} onChange={e => setTranscriptionLanguage(e.target.value)}
                      className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white outline-none">
                      <option value="auto">Auto-detectare</option>
                      {supportedLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {['extracting', 'transcribing'].includes(videoStatus) ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3 text-orange-400 bg-orange-500/10 px-5 py-4 rounded-xl justify-center border border-orange-500/20">
                        <Loader2 className="animate-spin" size={20} />
                        <span>{videoStatus === 'extracting' ? 'Se extrage audio...' : 'Se transcrie audio...'}</span>
                      </div>
                      <ProgressDisplay colorFrom="from-orange-600" colorTo="to-amber-500" />
                    </div>
                  ) : videoFiles.srt ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl items-center space-x-2">
                        <CheckCircle2 size={16} /><span className="text-sm">Subtitrare originală gata</span>
                      </div>
                      <SaveButton filePath={videoFiles.srt} label="SRT original" filterName="Subtitrări" extensions={['srt', 'txt']} color="orange" />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <button onClick={extractMp3Only} className="w-full px-5 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-xl font-bold flex items-center justify-center transition-colors text-sm">
                        <Headphones size={18} className="mr-2" /> Extrage doar MP3
                      </button>
                      <button onClick={processVideoAllInOne} className="w-full px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold flex items-center justify-center transition-colors">
                        <Play size={20} className="mr-2" /> Extrage Audio + Transcrie
                      </button>
                      <button onClick={async () => {
                        const fp = await window.electronAPI.openFile({ filters: [{ name: 'Subtitrări & Text', extensions: ['srt', 'vtt', 'txt', 'ass', 'ssa', 'sub', 'md'] }] });
                        if (fp) { setVideoFiles({ ...videoFiles, srt: fp }); setVideoStatus('done'); }
                      }} className="text-sm text-gray-500 hover:text-orange-400 transition-colors text-center underline underline-offset-4">
                        Sau încarcă un .SRT existent
                      </button>
                    </div>
                  )}
                  {videoFiles.mp3 && <SaveButton filePath={videoFiles.mp3} label="MP3 extras" filterName="Audio MP3" extensions={['mp3']} color="orange" />}
                </div>

                {/* Panou 2: Traducere + Dublaj */}
                <div className="p-8 rounded-3xl bg-dark-800 flex flex-col shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h4 className="text-xl font-bold text-white mb-1">2. Tradu & Dublează</h4>
                      <p className="text-gray-400 text-sm">Traduce subtitrarea cu AI și generează voce sintetică.</p>
                    </div>
                    <button onClick={async () => {
                      const fp = await window.electronAPI.openFile({ filters: [{ name: 'Subtitrări & Text', extensions: ['srt', 'vtt', 'txt', 'ass', 'ssa', 'sub', 'md', 'pdf', 'docx', 'doc', 'rtf', 'html', 'htm'] }] });
                      if (fp) { setVideoFiles({ ...videoFiles, srt: fp }); setVideoStatus('done'); }
                    }} className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20 flex items-center flex-shrink-0">
                      <Upload size={14} className="mr-1" /> Încarcă fișier
                    </button>
                  </div>

                  <div className={clsx("flex flex-col flex-1 transition-opacity", !videoFiles.srt && "opacity-40 pointer-events-none")}>
                    <TargetLanguageSelect />

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">Format subtitrare:</span>
                      {[{v:'srt',l:'SRT'},{v:'vtt',l:'VTT'},{v:'txt',l:'TXT'}].map(f => (
                        <button key={f.v} onClick={() => setSrtOutputFormat(f.v)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${srtOutputFormat===f.v ? 'bg-sky-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-600'}`}>
                          {f.l}
                        </button>
                      ))}
                    </div>

                    {videoStatus === 'translating' && <ProgressDisplay colorFrom="from-sky-500" colorTo="to-blue-600" />}

                    <div className="flex flex-col space-y-3 mt-2">
                      <button onClick={translateVideoSrt} disabled={videoStatus === 'translating'} className="px-5 py-3 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded-xl font-bold flex justify-center items-center transition-colors">
                        {videoStatus === 'translating' ? <Loader2 className="animate-spin" /> : videoFiles.translatedSrt ? <><CheckCircle2 className="mr-2" size={16} />Tradus în {targetLanguage}</> : <><Languages className="mr-2" size={16} />Traduce Subtitrarea</>}
                      </button>
                      {videoFiles.translatedSrt && <SaveButton filePath={videoFiles.translatedSrt} label="SRT tradus" filterName="Subtitrări" extensions={['srt', 'txt']} color="sky" />}

                      <button onClick={generateVideoDub} disabled={videoStatus === 'dubbing'} className="px-5 py-3 bg-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white rounded-xl font-bold flex justify-center items-center transition-colors">
                        {videoStatus === 'dubbing' ? <Loader2 className="animate-spin" /> : videoFiles.dubMp3 ? <><CheckCircle2 className="mr-2" size={16} />Dublaj gata</> : <><Mic className="mr-2" size={16} />Generează Voce (Dublaj)</>}
                      </button>
                      {videoFiles.dubMp3 && <SaveButton filePath={videoFiles.dubMp3} label="dublaj MP3" filterName="Audio MP3" extensions={['mp3']} color="violet" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB AUDIO ===== */}
          {activeTab === 'audio' && (
            <div className="space-y-8 w-full">
              {!selectedAudio ? (
                <div
                  onClick={handleSelectAudio}
                  className="w-full p-12 rounded-3xl border-2 border-dashed border-sky-500/20 bg-sky-500/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-sky-500/10 hover:border-sky-500/40 transition-all h-72 shadow-2xl group"
                >
                  <div className="w-20 h-20 rounded-2xl bg-dark-800/80 group-hover:bg-sky-500 text-sky-500 group-hover:text-white flex items-center justify-center mb-6 transition-all duration-300">
                    <Mic size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Încarcă un fișier Audio</h3>
                  <p className="text-gray-400">MP3, FLAC, WAV, M4A, M4B, AAC, OGG, OPUS, WMA, AIFF, APE, DTS și altele</p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-dark-800/80 border border-sky-500/30 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs text-sky-400/80 font-semibold mb-1">Pistă Audio Încărcată</p>
                    <p className="text-white font-semibold text-lg">{selectedAudio.split('\\').pop()}</p>
                  </div>
                  <button onClick={() => { setSelectedAudio(null); setAudioFiles({}); setAudioStatus('idle'); }} className="px-5 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors">Schimbă</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Panou 1: Transcriere */}
                <div className={clsx("p-8 rounded-3xl bg-dark-800 flex flex-col shadow-xl", selectedAudio ? "opacity-100" : "opacity-40 pointer-events-none")}>
                  <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-sky-500 rounded-full" />1. Extrage Text din Audio
                  </h4>
                  <p className="text-gray-400 mb-3 text-sm flex-1">Transcrie vorbirea în text (Whisper local sau Gemini Cloud).</p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500 whitespace-nowrap">Limbă audio:</span>
                    <select value={transcriptionLanguage} onChange={e => setTranscriptionLanguage(e.target.value)}
                      className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white outline-none">
                      <option value="auto">Auto-detectare</option>
                      {supportedLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {audioStatus === 'transcribing' ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3 text-sky-400 bg-sky-500/10 px-5 py-4 rounded-xl justify-center border border-sky-500/20">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Se transcrie audio...</span>
                      </div>
                      <ProgressDisplay colorFrom="from-sky-600" colorTo="to-cyan-500" />
                    </div>
                  ) : audioFiles.srt ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl items-center space-x-2">
                        <CheckCircle2 size={16} /><span className="text-sm">Text extras cu succes!</span>
                      </div>
                      <SaveButton filePath={audioFiles.srt} label="text/SRT extras" filterName="Text/Subtitrări" extensions={['srt', 'txt']} color="sky" />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <button onClick={processAudioTranscribe} className="w-full px-5 py-4 bg-sky-500/20 text-sky-500 hover:bg-sky-500 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors border border-sky-500/30">
                        <FileText size={20} /><span>Transcrie în Text</span>
                      </button>
                      <button onClick={async () => {
                        const fp = await window.electronAPI.openFile({ filters: [{ name: 'Text & Subtitrări', extensions: ['srt', 'vtt', 'txt', 'ass', 'ssa', 'sub', 'md', 'pdf', 'docx', 'doc', 'rtf'] }] });
                        if (fp) setAudioFiles({ ...audioFiles, srt: fp });
                      }} className="text-sm text-gray-500 hover:text-sky-400 transition-colors text-center underline underline-offset-4">
                        Sau încarcă text/SRT existent
                      </button>
                    </div>
                  )}
                </div>

                {/* Panou 2: Traducere + TTS */}
                <div className="p-8 rounded-3xl bg-dark-800 flex flex-col shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h4 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-violet-500 rounded-full" />2. Traduce + Generează MP3
                      </h4>
                      <p className="text-gray-400 text-sm">Traduce textul și creează audiobook în limba selectată.</p>
                    </div>
                    <button onClick={async () => {
                      const fp = await window.electronAPI.openFile({ filters: [{ name: 'Text & Subtitrări', extensions: ['srt', 'vtt', 'txt', 'ass', 'ssa', 'sub', 'md', 'pdf', 'docx', 'doc', 'rtf'] }] });
                      if (fp) setAudioFiles({ ...audioFiles, srt: fp });
                    }} className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-colors border border-emerald-500/20 flex items-center flex-shrink-0">
                      <Upload size={14} className="mr-1" /> Încarcă fișier
                    </button>
                  </div>

                  <div className={clsx("flex flex-col flex-1 transition-opacity", !audioFiles.srt && "opacity-40 pointer-events-none")}>

                    <label className="flex items-center gap-3 mb-3 cursor-pointer select-none group">
                      <div onClick={() => setAudioTranslateBeforeTts(v => !v)}
                        className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${audioTranslateBeforeTts ? 'bg-violet-500' : 'bg-dark-600 border border-dark-500'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${audioTranslateBeforeTts ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Traduce înainte de generare</span>
                    </label>

                    {audioTranslateBeforeTts && <TargetLanguageSelect />}

                    {['translating', 'dubbing'].includes(audioStatus) ? (
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-3 text-violet-400 bg-violet-500/10 px-5 py-4 rounded-xl justify-center border border-violet-500/20">
                          <Loader2 className="animate-spin" size={20} />
                          <span>{audioStatus === 'translating' ? 'Se traduce...' : 'Se generează vocea...'}</span>
                        </div>
                        <ProgressDisplay colorFrom="from-violet-600" colorTo="to-fuchsia-500" />
                      </div>
                    ) : audioFiles.dubMp3 ? (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl items-center space-x-2">
                          <CheckCircle2 size={16} /><span className="text-sm">Audiobook generat!</span>
                        </div>
                        <SaveButton filePath={audioFiles.dubMp3} label="Audiobook MP3" filterName="Audio MP3" extensions={['mp3']} color="violet" />
                      </div>
                    ) : (
                      <button onClick={processAudioDub} className="w-full mt-2 px-5 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl font-bold flex items-center justify-center transition-colors">
                        <Headphones size={20} className="mr-2" /> Generează Audiobook MP3
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB DOCS ===== */}
          {activeTab === 'docs' && (
            <div className="space-y-8 w-full">
              {!selectedDoc ? (
                <div
                  onClick={handleSelectDoc}
                  className="w-full p-12 rounded-3xl border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all h-72 shadow-2xl group"
                >
                  <div className="w-20 h-20 rounded-2xl bg-dark-800/80 group-hover:bg-emerald-500 text-emerald-500 group-hover:text-white flex items-center justify-center mb-6 transition-all duration-300">
                    <FileText size={36} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Încarcă un Document sau Carte</h3>
                  <p className="text-gray-400">PDF, DOCX, TXT, RTF, ODT, EPUB, HTML, MD, CSV, XML, JSON</p>
                  <p className="text-gray-400 text-xs mt-1">Subtitrări: SRT, VTT, ASS, SSA, SUB, SBV, SMI, TTML, LRC și altele</p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-dark-800/80 border border-emerald-500/30 flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-xs text-emerald-400/80 font-semibold mb-1">Fișier Încărcat</p>
                    <p className="text-white font-semibold text-lg">{selectedDoc.split('\\').pop()}</p>
                  </div>
                  <button onClick={() => { setSelectedDoc(null); setDocFiles({}); setDocStatus('idle'); }} className="px-5 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-white transition-colors">Schimbă</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Panou 1: Traducere */}
                <div className={clsx("p-8 flex flex-col rounded-3xl bg-dark-800 border border-white/5 shadow-xl", selectedDoc ? "opacity-100" : "opacity-40 pointer-events-none")}>
                  <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />Traducere Document
                  </h4>
                  <p className="text-gray-400 mb-3 text-sm flex-1">Traduce întregul document în limba selectată.</p>

                  <div className="mb-3"><TargetLanguageSelect /></div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500">Format output:</span>
                    {[{v:'pdf',l:'PDF'},{v:'docx',l:'Word'},{v:'txt',l:'TXT'}].map(f => (
                      <button key={f.v} onClick={() => setDocOutputFormat(f.v)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${docOutputFormat===f.v ? 'bg-emerald-500 text-white' : 'bg-dark-700 text-gray-400 hover:text-white border border-dark-600'}`}>
                        {f.l}
                      </button>
                    ))}
                  </div>

                  {docStatus === 'translating' ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3 text-emerald-400 bg-emerald-500/10 px-5 py-4 rounded-xl justify-center border border-emerald-500/20">
                        <Loader2 className="animate-spin" size={20} />
                        <span>AI citește și traduce...</span>
                      </div>
                      <ProgressDisplay colorFrom="from-emerald-500" colorTo="to-teal-500" />
                    </div>
                  ) : docFiles.translatedText ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl items-center space-x-2">
                        <CheckCircle2 size={16} /><span className="text-sm">Traducere finalizată</span>
                      </div>
                      <SaveButton filePath={docFiles.translatedText} label="document tradus" filterName="Text" extensions={['txt', 'srt']} color="emerald" />
                    </div>
                  ) : (
                    <button onClick={processDocTranslate} className="w-full px-5 py-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors border border-emerald-500/30">
                      <Languages size={20} /><span>Obține Document Tradus</span>
                    </button>
                  )}
                </div>

                {/* Panou 2: Audiobook */}
                <div className={clsx("p-8 flex flex-col rounded-3xl bg-dark-800 border border-white/5 shadow-xl", selectedDoc ? "opacity-100" : "opacity-40 pointer-events-none")}>
                  <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-violet-500 rounded-full" />Creare Audiobook
                  </h4>
                  <p className="text-gray-400 mb-6 text-sm flex-1">Citește documentul original sau tradus cu vocea selectată din Setări.</p>

                  {docStatus === 'dubbing' ? (
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-3 text-violet-400 bg-violet-500/10 px-5 py-4 rounded-xl justify-center border border-violet-500/20">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Generează audiobook-ul...</span>
                      </div>
                      <ProgressDisplay colorFrom="from-violet-600" colorTo="to-fuchsia-500" />
                    </div>
                  ) : docFiles.dubMp3 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl items-center space-x-2">
                        <CheckCircle2 size={16} /><span className="text-sm">Audiobook finalizat!</span>
                      </div>
                      <SaveButton filePath={docFiles.dubMp3} label="Audiobook MP3" filterName="Audio MP3" extensions={['mp3']} color="violet" />
                    </div>
                  ) : (
                    <button onClick={processDocAudiobook} className="w-full px-5 py-4 bg-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors border border-violet-500/30">
                      <Headphones size={20} /><span>Generează Audiobook MP3</span>
                    </button>
                  )}

                  {docFiles.translatedText && (
                    <p className="text-xs text-gray-500 mt-3 text-center">Va citi documentul tradus dacă există</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB SETĂRI ===== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-dark-800 p-10 rounded-3xl border border-white/5 space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Platformă AI pentru Traducere & Transcriere</h3>
                <p className="text-sm text-gray-400 mb-6">Alege și configurează AI-ul folosit pentru traducere și transcriere cloud.</p>

                <div className="flex space-x-4 mb-6">
                  <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all ${activeAi === 'gemini' ? 'border-sky-500 bg-sky-500/10' : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'}`}>
                    <input type="radio" value="gemini" checked={activeAi === 'gemini'} onChange={() => setActiveAi('gemini')} className="hidden" />
                    <div className="font-bold text-white mb-1">Google Gemini</div>
                    <div className="text-xs text-gray-400">Gratuit cu limita de 15 req/min · Cel mai popular</div>
                  </label>
                  <label className={`flex-1 cursor-pointer p-4 rounded-xl border-2 transition-all ${activeAi === 'claude' ? 'border-orange-500 bg-orange-500/10' : 'border-dark-600 bg-dark-700/50 hover:bg-dark-700'}`}>
                    <input type="radio" value="claude" checked={activeAi === 'claude'} onChange={() => setActiveAi('claude')} className="hidden" />
                    <div className="font-bold text-white mb-1">Anthropic Claude</div>
                    <div className="text-xs text-gray-400">Foarte rapid · Necesită balanță API (min. $5)</div>
                  </label>
                </div>

                <div className={activeAi !== 'gemini' ? 'hidden' : ''}>
                  <label className="block font-medium text-white mb-2">Google Gemini API Key</label>
                  <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500" />
                  <p className="text-xs text-gray-500 mt-2">Obțineți gratuit de la aistudio.google.com</p>
                </div>

                <div className={activeAi !== 'claude' ? 'hidden' : ''}>
                  <label className="block font-medium text-white mb-2">Claude API Key (Anthropic)</label>
                  <input type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} placeholder="sk-ant-api03-..." className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500" />
                  <p className="text-xs text-gray-500 mt-2">Obțineți de la console.anthropic.com</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h3 className="text-xl font-bold text-white mb-2">Folder Salvare</h3>
                <p className="text-sm text-gray-400 mb-4">Toate fișierele generate vor fi salvate în acest folder.</p>
                <div className="flex space-x-3 items-center">
                  <button onClick={handleSelectOutputDir} className="px-5 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl text-sm font-bold border border-dark-600 transition-colors whitespace-nowrap">Selectează Folder</button>
                  <input type="text" readOnly value={outputDir} placeholder="Implicit: lângă fișierul sursă..." className="flex-1 bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h3 className="text-xl font-bold text-white mb-2">Voce TTS (Sinteză Vocală)</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Selectați vocea corespunzătoare limbii textului. TTS funcționează gratuit prin Microsoft Edge, fără cheie API, necesită doar internet.
                </p>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 font-medium"
                >
                  {Object.entries(ttsVoices).sort(([a], [b]) => a.localeCompare(b)).map(([lang, voices]) => (
                    <optgroup label={`— ${lang} —`} key={lang} className="text-gray-400 font-bold bg-dark-800">
                      {voices.map(v => (
                        <option key={v.id} value={v.id} className="text-white bg-dark-900">{v.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="pt-6 border-t border-white/5 bg-dark-900/50 rounded-2xl p-5">
                <h3 className="text-base font-bold text-white mb-3">Cerințe pentru funcționalitate completă</h3>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li><span className="text-green-400 font-bold">✓</span> <b>Extragere audio/video</b> — FFmpeg bundled, funcționează offline</li>
                  <li><span className="text-green-400 font-bold">✓</span> <b>Sinteză vocală (TTS)</b> — Microsoft Edge TTS, gratuit, necesită internet</li>
                  <li><span className="text-blue-400 font-bold">○</span> <b>Transcriere audio → text</b> — Necesită cheie Gemini API sau Python 3.8+ cu openai-whisper</li>
                  <li><span className="text-blue-400 font-bold">○</span> <b>Traducere text</b> — Necesită cheie Gemini sau Claude API</li>
                  <li><span className="text-green-400 font-bold">✓</span> <b>Citire PDF/DOCX/TXT</b> — Funcționează offline</li>
                </ul>
              </div>

              <button onClick={saveSettings} className={`px-8 py-3 rounded-xl font-bold transition-all ${settingsSaved ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                {settingsSaved ? '✓ Salvat cu succes!' : 'Salvează Setările'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
