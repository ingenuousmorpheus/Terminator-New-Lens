import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzePerson } from '../services/geminiService';
import { analyzePersonLocal, fetchLocalModels } from '../services/lmStudioService';
import { TERMINATOR_RESPONSES, BOOT_SEQUENCE, ASM_FRAGMENTS } from '../constants';
import type { AnalysisData, DetectedObject, VisionProvider } from '../types';

declare global {
  interface Window {
    cocoSsd: any;
  }
}

const DEFAULT_LMS_ENDPOINT = 'http://localhost:1234';

const randomHexLine = () =>
  `${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase()}  ${
    ASM_FRAGMENTS[Math.floor(Math.random() * ASM_FRAGMENTS.length)]}`;

const assessThreat = (analysis: AnalysisData | null): { label: string; pips: number } => {
  if (!analysis) return { label: 'MINIMAL', pips: 1 };
  const mood = analysis.MOOD.toLowerCase();
  if (/(angry|mad|hostile|aggress|rage|furious)/.test(mood)) return { label: 'ELEVATED', pips: 4 };
  if (/(serious|neutral|stern|focused|suspicious)/.test(mood)) return { label: 'LOW', pips: 2 };
  return { label: 'MINIMAL', pips: 1 };
};

const TerminatorVision: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [model, setModel] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('INITIALIZING...');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Provider settings (persisted)
  const [provider, setProvider] = useState<VisionProvider>(
    () => (localStorage.getItem('tv_provider') as VisionProvider) || 'gemini'
  );
  const [lmsEndpoint, setLmsEndpoint] = useState(
    () => localStorage.getItem('tv_lms_endpoint') || DEFAULT_LMS_ENDPOINT
  );
  const [lmsModel, setLmsModel] = useState(() => localStorage.getItem('tv_lms_model') || '');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelScanStatus, setModelScanStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Movie-mode state
  const [bootLine, setBootLine] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const [recTime, setRecTime] = useState('00:00:00:00');
  const [glitch, setGlitch] = useState(false);
  const [hexLines, setHexLines] = useState<string[]>(() =>
    Array.from({ length: 14 }, randomHexLine)
  );
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('tv_provider', provider);
    localStorage.setItem('tv_lms_endpoint', lmsEndpoint);
    localStorage.setItem('tv_lms_model', lmsModel);
  }, [provider, lmsEndpoint, lmsModel]);

  // Boot sequence typing effect
  useEffect(() => {
    if (bootLine >= BOOT_SEQUENCE.length) {
      const t = setTimeout(() => setBootDone(true), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBootLine((l) => l + 1), 320);
    return () => clearTimeout(t);
  }, [bootLine]);

  // Live REC timecode (24 fps frame counter like film)
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const totalSec = Math.floor(elapsed / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      const f = String(Math.floor((elapsed % 1000) / 1000 * 24)).padStart(2, '0');
      setRecTime(`${h}:${m}:${s}:${f}`);
    }, 42);
    return () => clearInterval(id);
  }, []);

  // Scrolling assembly dump column
  useEffect(() => {
    const id = setInterval(() => {
      setHexLines((lines) => [...lines.slice(1), randomHexLine()]);
    }, 180);
    return () => clearInterval(id);
  }, []);

  // Random signal glitches
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleGlitch = () => {
      timeout = setTimeout(() => {
        setGlitch(true);
        setTimeout(() => {
          setGlitch(false);
          scheduleGlitch();
        }, 90 + Math.random() * 120);
      }, 3000 + Math.random() * 6000);
    };
    scheduleGlitch();
    return () => clearTimeout(timeout);
  }, []);

  // Initialize camera and model
  useEffect(() => {
    const init = async () => {
      try {
        setStatus('LOADING TACTICAL DATABASE...');
        const loadedModel = await window.cocoSsd.load();
        setModel(loadedModel);
        setStatus('ACQUIRING CAMERA FEED...');

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch (e) {
          // Fallback to any camera if 'environment' fails
          console.warn('Environment camera failed, falling back to default:', e);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('SYSTEM ONLINE');
      } catch (err) {
        console.error('Initialization error:', err);
        setCameraError('Please grant camera access in your browser settings and try again.');
        setStatus('SYSTEM FAILURE');
      }
    };

    init();
  }, []);

  // Detection loop
  useEffect(() => {
    if (!model || !videoRef.current) return;

    let animationFrameId: number;

    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const predictions = await model.detect(videoRef.current);
        setDetectedObjects(predictions);

        // If a person is detected and we're not already analyzing, trigger analysis
        const person = predictions.find((p: any) => p.class === 'person' && p.score > 0.6);
        if (person && !isLoading && !analysis) {
          handleAnalysis();
        }
      }
      animationFrameId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [model, isLoading, analysis]);

  const handleAnalysis = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsLoading(true);
    setStatus('ANALYZING TARGET...');

    // Capture frame
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const base64Image = canvas.toDataURL('image/png').split(',')[1];
      const data = provider === 'lmstudio'
        ? await analyzePersonLocal(base64Image, { endpoint: lmsEndpoint, model: lmsModel })
        : await analyzePerson(base64Image);

      if (data.AGE === "OFFLINE") {
        setStatus('UPLINK OFFLINE');
      } else {
        setStatus('TARGET IDENTIFIED');
      }

      setAnalysis(data);
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setSelectedResponse(null);
    setStatus('SCANNING...');
  };

  const scanModels = async () => {
    setModelScanStatus('SCANNING...');
    try {
      const models = await fetchLocalModels(lmsEndpoint);
      setAvailableModels(models);
      setModelScanStatus(models.length ? `${models.length} MODEL(S) FOUND` : 'NO MODELS LOADED');
      if (models.length && !lmsModel) setLmsModel(models[0]);
    } catch (e) {
      console.error('Model scan failed:', e);
      setAvailableModels([]);
      setModelScanStatus('UNREACHABLE — IS LM STUDIO SERVER ON?');
    }
  };

  const threat = assessThreat(analysis);
  const uplinkLabel = provider === 'lmstudio'
    ? `LOCAL NEURAL NET [${lmsEndpoint.replace(/^https?:\/\//, '')}]`
    : 'SKYNET UPLINK [GEMINI]';

  if (cameraError) {
    return (
      <div className="text-red-600 p-8 text-center border-2 border-red-600 bg-red-950/20">
        <h2 className="text-2xl font-bold mb-4">CRITICAL ERROR</h2>
        <p className="mb-4">{cameraError}</p>
        <div className="text-sm border border-red-500/50 p-4 bg-black/40 inline-block">
          <p className="font-bold mb-2">TROUBLESHOOTING:</p>
          <ul className="list-disc list-inside text-left space-y-2 mb-4">
            <li>Ensure you clicked "Allow" on the camera prompt.</li>
            <li>If no prompt appeared, try <strong>opening the app in a new tab</strong>.</li>
            <li>Check your system/browser privacy settings.</li>
          </ul>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full border border-red-500 py-2 hover:bg-red-500/20 text-center font-bold"
          >
            OPEN IN NEW TAB
          </a>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 block mx-auto border-2 border-red-600 px-6 py-2 hover:bg-red-600 hover:text-black font-bold transition-colors"
        >
          SYSTEM REBOOT (RELOAD)
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl h-[75vh] md:h-auto md:aspect-video bg-zinc-900 border-4 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)] overflow-hidden">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover grayscale brightness-50 contrast-150"
      />

      {/* Red Overlay */}
      <div className="absolute inset-0 bg-red-600/20 pointer-events-none" />

      {/* Signal glitch flash */}
      {glitch && (
        <div
          className="absolute inset-0 z-40 pointer-events-none mix-blend-screen"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0px, transparent 2px, rgba(239,68,68,0.25) 3px, transparent 6px)',
            transform: `translateY(${Math.random() > 0.5 ? 2 : -2}px)`,
          }}
        />
      )}

      {/* Scanning Line */}
      <motion.div
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-1 bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.8)] z-10 pointer-events-none"
      />

      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle, #ef4444 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Scrolling 6502 assembly dump (film-accurate Apple II code) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:block pointer-events-none text-red-500/40 text-[9px] leading-4 font-mono whitespace-pre z-10">
        {hexLines.map((line, i) => (
          <div key={`${i}-${line}`}>{line}</div>
        ))}
      </div>

      {/* Bounding Boxes */}
      {detectedObjects.map((obj, i) => (
        <div
          key={i}
          className="absolute border-2 border-red-500 pointer-events-none"
          style={{
            left: `${(obj.bbox[0] / (videoRef.current?.videoWidth || 1)) * 100}%`,
            top: `${(obj.bbox[1] / (videoRef.current?.videoHeight || 1)) * 100}%`,
            width: `${(obj.bbox[2] / (videoRef.current?.videoWidth || 1)) * 100}%`,
            height: `${(obj.bbox[3] / (videoRef.current?.videoHeight || 1)) * 100}%`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] px-1 uppercase font-bold">
            {obj.class} {(obj.score * 100).toFixed(0)}%
          </div>
        </div>
      ))}

      {/* Tactical HUD */}
      <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-between pointer-events-none text-red-500 font-mono text-[10px] md:text-sm uppercase tracking-widest">
        {/* Top Section */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 animate-pulse" />
              <span>REC {recTime}</span>
            </div>
            <div>MODEL: T-800 CSM-101</div>
            <div>CPU: NEURAL NET PROCESSOR</div>
            <div className="text-[8px] md:text-xs opacity-70">{uplinkLabel}</div>
          </div>
          <div className="text-right space-y-1">
            <div>{status}</div>
            <div className="text-[8px] md:text-xs opacity-60">ACQUIRING TARGET...</div>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="pointer-events-auto border border-red-600 px-2 py-0.5 text-[9px] md:text-xs hover:bg-red-600 hover:text-black transition-colors font-bold"
            >
              UPLINK CONFIG
            </button>
          </div>
        </div>

        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 flex items-center justify-center opacity-40">
          <div className="absolute w-full h-[1px] bg-red-500" />
          <div className="absolute h-full w-[1px] bg-red-500" />
          <div className="w-6 h-6 md:w-8 md:h-8 border border-red-500 rounded-full" />
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-3 h-1 md:w-4 md:h-1 bg-red-500/30" style={{ opacity: Math.random() }} />
              ))}
            </div>
            <div>POWER: 100%</div>
            <div>{'>'} HUMAN HEART</div>
            {analysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[9px] md:text-xs text-red-400 font-bold"
              >
                {'>'} MOOD: {analysis.MOOD}
              </motion.div>
            )}
            {selectedResponse && (
              <div className="text-[9px] md:text-xs text-red-300 font-bold">
                {'>'} RESPONSE: "{selectedResponse}"
              </div>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className={threat.pips >= 4 ? 'animate-pulse font-bold' : ''}>
              THREAT LEVEL: {threat.label}
            </div>
            <div className="flex gap-1 justify-end">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 md:w-2 md:h-2 border border-red-500" style={{ background: i < threat.pips ? '#ef4444' : 'transparent' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Uplink Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-4 md:top-16 md:right-6 w-[85%] md:w-80 bg-black/95 border-2 border-red-600 p-4 text-red-500 font-mono text-xs z-30 space-y-3"
          >
            <div className="font-bold border-b border-red-600 pb-2 flex justify-between items-center">
              <span>TACTICAL UPLINK CONFIG</span>
              <button onClick={() => setShowSettings(false)} className="border border-red-600 px-1 hover:bg-red-600 hover:text-black">X</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setProvider('gemini')}
                className={`flex-1 border-2 border-red-600 py-1.5 font-bold transition-colors ${provider === 'gemini' ? 'bg-red-600 text-black' : 'hover:bg-red-600/20'}`}
              >
                SKYNET (GEMINI)
              </button>
              <button
                onClick={() => setProvider('lmstudio')}
                className={`flex-1 border-2 border-red-600 py-1.5 font-bold transition-colors ${provider === 'lmstudio' ? 'bg-red-600 text-black' : 'hover:bg-red-600/20'}`}
              >
                LOCAL (LM STUDIO)
              </button>
            </div>

            {provider === 'lmstudio' && (
              <div className="space-y-2">
                <div>
                  <div className="opacity-60 mb-1">SERVER ENDPOINT</div>
                  <input
                    value={lmsEndpoint}
                    onChange={(e) => setLmsEndpoint(e.target.value)}
                    placeholder={DEFAULT_LMS_ENDPOINT}
                    className="w-full bg-red-950/30 border border-red-600 px-2 py-1 text-red-400 outline-none focus:bg-red-950/60"
                  />
                </div>
                <div>
                  <div className="opacity-60 mb-1 flex justify-between">
                    <span>MODEL</span>
                    <button onClick={scanModels} className="border border-red-600 px-1.5 hover:bg-red-600 hover:text-black font-bold">SCAN</button>
                  </div>
                  {availableModels.length > 0 ? (
                    <select
                      value={lmsModel}
                      onChange={(e) => setLmsModel(e.target.value)}
                      className="w-full bg-red-950/30 border border-red-600 px-2 py-1 text-red-400 outline-none"
                    >
                      {availableModels.map((m) => (
                        <option key={m} value={m} className="bg-black">{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={lmsModel}
                      onChange={(e) => setLmsModel(e.target.value)}
                      placeholder="(loaded model used if blank)"
                      className="w-full bg-red-950/30 border border-red-600 px-2 py-1 text-red-400 outline-none focus:bg-red-950/60"
                    />
                  )}
                  {modelScanStatus && <div className="mt-1 text-[10px] opacity-70">{modelScanStatus}</div>}
                </div>
                <div className="text-[9px] opacity-50 leading-relaxed">
                  REQUIRES A VISION MODEL LOADED IN LM STUDIO WITH THE SERVER + CORS ENABLED. NO DATA LEAVES THIS MACHINE.
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Panel */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute top-0 right-0 bottom-0 w-[75%] md:w-64 bg-black/90 border-l-2 border-red-600 p-4 text-red-500 font-mono text-xs overflow-y-auto z-20 pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-4 border-b border-red-600 pb-2">
              <span className="font-bold text-sm">ANALYSIS: MATCH:</span>
              <button onClick={resetAnalysis} className="hover:bg-red-600 hover:text-black px-1 border border-red-600">X</button>
            </div>

            {analysis.AGE === "OFFLINE" && (
              <div className="mb-4 bg-red-950 border border-red-600 p-2 text-[10px] animate-pulse">
                {provider === 'lmstudio' ? (
                  <p>CRITICAL: LOCAL NEURAL NET UNREACHABLE. VERIFY LM STUDIO SERVER IS RUNNING WITH CORS ENABLED AND A VISION MODEL LOADED.</p>
                ) : (
                  <>
                    <p className="mb-2">CRITICAL: TACTICAL UPLINK EXHAUSTED (QUOTA REACHED). SYSTEM OPERATING ON CACHED DATA.</p>
                    <a
                      href="https://ai.studio/spend"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold hover:text-white"
                    >
                      MANAGE SPEND CAP
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(analysis).map(([key, value]) => (
                <div key={key}>
                  <div className="opacity-60 mb-1">{key}</div>
                  <div className="font-bold text-sm">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-red-600/30">
              <div className="mb-2">PROBABILITY: 99.9%</div>
              <div className="w-full h-2 bg-red-950 border border-red-600">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-red-600"
                />
              </div>
            </div>

            {/* Classic T1 dialogue selection */}
            <div className="mt-6 pt-4 border-t border-red-600/30">
              <div className="opacity-60 mb-2">POSSIBLE RESPONSE:</div>
              <div className="space-y-1">
                {TERMINATOR_RESPONSES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedResponse(r)}
                    className={`block w-full text-left px-2 py-1 border transition-colors ${
                      selectedResponse === r
                        ? 'border-red-500 bg-red-600 text-black font-bold'
                        : 'border-red-600/30 hover:border-red-500 hover:bg-red-600/20'
                    }`}
                  >
                    {selectedResponse === r ? '> ' : ''}{r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={resetAnalysis}
              className="mt-6 w-full border-2 border-red-600 py-2 hover:bg-red-600 hover:text-black transition-colors font-bold"
            >
              RESUME SCAN
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div className="text-red-500 font-bold text-xl animate-pulse">
            SCANNING...
          </div>
        </div>
      )}

      {/* Boot Sequence Overlay */}
      <AnimatePresence>
        {!bootDone && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-black z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="font-mono text-red-500 text-xs md:text-sm space-y-1.5 tracking-widest">
              {BOOT_SEQUENCE.slice(0, bootLine).map((line, i) => (
                <div key={i}>
                  {'>'} {line}
                  {i === bootLine - 1 && <span className="animate-pulse"> _</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Canvas for Capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default TerminatorVision;
