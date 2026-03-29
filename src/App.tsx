import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Upload, Activity, Clock, Plus, Trash2, TrendingUp, Zap, RotateCcw, FolderOpen, Save, X, Sparkles, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import booster assets
import booster1 from './assets/booster_1.png';
import booster2 from './assets/booster_2.png';
import booster3 from './assets/booster_3.png';
import emission1 from './assets/emission_1.png';
import emission2 from './assets/emission_2.png';
import emission3 from './assets/emission_3.png';
import emission4 from './assets/emission_4.png';
import emission5 from './assets/emission_5.png';
import emission6 from './assets/emission_6.png';

interface RadionicItem {
  id: string;
  image: string | null;
  text: string;
}

interface SavedSession {
  id: string;
  name: string;
  timestamp: number;
  witnesses: RadionicItem[];
  trends: RadionicItem[];
  frequency: number;
  duration: number;
  isOverdrive: boolean;
  isQuantumAudio: boolean;
  realization: number;
}

interface SubSession {
  id: string;
  title: string;
  witness: string;
  trend: string;
  image: string;
  realization: number;
  isActive: boolean;
  x: number;
  y: number;
}

const compressImage = (file: File, maxWidth: number = 600, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(e.target?.result as string); return; }
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [witnesses, setWitnesses] = useState<RadionicItem[]>([{ id: 'w1', image: null, text: '' }]);
  const [trends, setTrends] = useState<RadionicItem[]>([{ id: 't1', image: null, text: '' }]);
  
  const [frequency, setFrequency] = useState<number>(528);
  const [duration, setDuration] = useState<number>(15);
  
  const [isActive, setIsActive] = useState(false);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [isQuantumAudio, setIsQuantumAudio] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [realization, setRealization] = useState<number>(0);
  const [subSessions, setSubSessions] = useState<SubSession[]>([]);

  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const gainNode2Ref = useRef<GainNode | null>(null);
  const pan1Ref = useRef<StereoPannerNode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);

  const witnessImgRefs = useRef<Record<string, HTMLImageElement>>({});
  const trendImgRefs = useRef<Record<string, HTMLImageElement>>({});

  const tickCounter = useRef<number>(0);

  useEffect(() => {
    try {
      const currentRaw = localStorage.getItem('cyber_shaman_current');
      if (currentRaw) {
        const data = JSON.parse(currentRaw) as Partial<SavedSession>;
        if (data.witnesses) setWitnesses(data.witnesses);
        if (data.trends) setTrends(data.trends);
        if (data.frequency !== undefined) setFrequency(data.frequency);
        if (data.duration !== undefined) setDuration(data.duration);
        if (data.isOverdrive !== undefined) setIsOverdrive(data.isOverdrive);
        if (data.isQuantumAudio !== undefined) setIsQuantumAudio(data.isQuantumAudio);
        if (data.realization !== undefined) setRealization(data.realization);
      }
      
      const savedRaw = localStorage.getItem('cyber_shaman_saved_sessions');
      if (savedRaw) {
        setSavedSessions(JSON.parse(savedRaw));
      }
    } catch(e) { console.error('Error loading session state', e); }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const sessionData = { witnesses, trends, frequency, duration, isOverdrive, isQuantumAudio, realization };
    localStorage.setItem('cyber_shaman_current', JSON.stringify(sessionData));
  }, [witnesses, trends, frequency, duration, isOverdrive, isQuantumAudio, realization, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('cyber_shaman_saved_sessions', JSON.stringify(savedSessions));
  }, [savedSessions, isInitialized]);

  const saveCurrentSession = () => {
    if (!sessionNameInput.trim()) return;
    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: sessionNameInput.trim(),
      timestamp: Date.now(),
      witnesses,
      trends,
      frequency,
      duration,
      isOverdrive,
      isQuantumAudio,
      realization
    };
    setSavedSessions(prev => [newSession, ...prev]);
    setSessionNameInput('');
    setShowSessionModal(false);
  };

  const loadSession = (session: SavedSession) => {
    if (isActive) {
      setIsActive(false);
      stopAudio();
      tickCounter.current = 0;
    }
    setWitnesses(session.witnesses);
    setTrends(session.trends);
    setFrequency(session.frequency);
    setDuration(session.duration);
    setIsOverdrive(session.isOverdrive);
    setIsQuantumAudio(session.isQuantumAudio);
    setRealization(session.realization);
    setShowSessionModal(false);
  };

  const deleteSession = (id: string) => {
    setSavedSessions(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    const validIds = new Set(witnesses.map(w => w.id));
    Object.keys(witnessImgRefs.current).forEach(id => {
      if (!validIds.has(id)) {
        delete witnessImgRefs.current[id];
      }
    });

    witnesses.forEach(witness => {
      if (witness.image) {
        if (!witnessImgRefs.current[witness.id] || witnessImgRefs.current[witness.id].src !== witness.image) {
          const img = new Image();
          img.src = witness.image;
          img.onload = () => { witnessImgRefs.current[witness.id] = img; };
        }
      } else {
        delete witnessImgRefs.current[witness.id];
      }
    });
  }, [witnesses]);

  useEffect(() => {
    const validIds = new Set(trends.map(t => t.id));
    Object.keys(trendImgRefs.current).forEach(id => {
      if (!validIds.has(id)) {
        delete trendImgRefs.current[id];
      }
    });

    trends.forEach(trend => {
      if (trend.image) {
        if (!trendImgRefs.current[trend.id] || trendImgRefs.current[trend.id].src !== trend.image) {
          const img = new Image();
          img.src = trend.image;
          img.onload = () => { trendImgRefs.current[trend.id] = img; };
        }
      } else {
        delete trendImgRefs.current[trend.id];
      }
    });
  }, [trends]);

  const startAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const gain2 = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'sine';

    let baseFreq = frequency;
    if (isQuantumAudio) {
      const seedStr = witnesses.map(w => w.text).join('') + trends.map(t => t.text).join('');
      let seed = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
        seed |= 0;
      }
      const mappedSeed = Math.abs(seed) % 256;
      baseFreq = (mappedSeed * 1.5) + 100;
      
      const array = new Uint8Array(1);
      window.crypto.getRandomValues(array);
      baseFreq += (Math.abs(array[0] - mappedSeed) * 0.5); 
    }

    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc2.frequency.setValueAtTime(baseFreq + 7.83, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);

    gain2.gain.setValueAtTime(0, ctx.currentTime);
    if (isOverdrive) {
      gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
    }

    const pan1 = ctx.createStereoPanner();
    const pan2 = ctx.createStereoPanner();
    pan1.pan.value = isOverdrive ? -1 : 0; 
    pan2.pan.value = 1;

    osc.connect(gain).connect(pan1).connect(ctx.destination);
    osc2.connect(gain2).connect(pan2).connect(ctx.destination);
    
    osc.start();
    osc2.start();
    
    oscillatorRef.current = osc;
    oscillator2Ref.current = osc2;
    gainNodeRef.current = gain;
    gainNode2Ref.current = gain2;
    pan1Ref.current = pan1;
  };

  const stopAudio = () => {
    if (gainNodeRef.current && gainNode2Ref.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      gainNode2Ref.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      setTimeout(() => {
        oscillatorRef.current?.stop();
        oscillator2Ref.current?.stop();
        oscillatorRef.current?.disconnect();
        oscillator2Ref.current?.disconnect();
        gainNodeRef.current?.disconnect();
        gainNode2Ref.current?.disconnect();
        pan1Ref.current?.disconnect();
      }, 2000);
    }
  };

  useEffect(() => {
    if (isActive && audioCtxRef.current && gainNode2Ref.current && pan1Ref.current) {
      const ctx = audioCtxRef.current;
      if (isOverdrive) {
        gainNode2Ref.current.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1);
        pan1Ref.current.pan.linearRampToValueAtTime(-1, ctx.currentTime + 1);
      } else {
        gainNode2Ref.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        pan1Ref.current.pan.linearRampToValueAtTime(0, ctx.currentTime + 1);
      }
    }
  }, [isOverdrive, isActive]);

  useEffect(() => {
    let interval: number;
    if (isActive && timeRemaining > 0 && realization < 100) {
      const tickRate = isOverdrive ? 100 : 1000;
      
      interval = window.setInterval(() => {
        tickCounter.current += tickRate;
        if (tickCounter.current >= 1000) {
          setTimeRemaining(prev => prev - 1);
          tickCounter.current = 0;
        }

        const seedStr = witnesses.map(w => w.text).join('') + trends.map(t => t.text).join('');
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) {
          seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
          seed |= 0;
        }
        const mappedSeed = Math.abs(seed) % 256;
        
        const array = new Uint8Array(1);
        window.crypto.getRandomValues(array);
        const distance = Math.abs(array[0] - mappedSeed);
        
        let delta = 0;
        if (distance < 20) delta = 0.05;
        else if (distance < 60) delta = 0.02;
        else if (distance < 110) delta = 0.005;
        else if (distance < 170) delta = -0.005; 
        else delta = -0.02; 

        // Quantum Connection: Sub-sessions boost main realization with Entanglement Synergy
        const activeSubSessions = subSessions.filter(s => s.isActive);
        const activeCount = activeSubSessions.length;
        // Synergy: More boosters = each booster is significantly more efficient
        const synergyFactor = activeCount > 0 ? (1 + (activeCount * 0.3)) : 1;
        const subBoostRaw = activeSubSessions.reduce((acc, s) => acc + (s.realization / 800), 0);
        const subBoost = subBoostRaw * synergyFactor;
        delta += subBoost;

        setRealization(prev => {
          let next = prev + delta;
          if (next < 0) next = 0;
          if (next > 100) next = 100;
          return next;
        });

        // Update sub-sessions realization
        setSubSessions(prev => prev.map(s => {
          if (!s.isActive) return s;
          let sDelta = 0.01 + (Math.random() * 0.02); // Sub-sessions grow independently
          let nextR = s.realization + sDelta;
          if (nextR > 100) nextR = 100;
          return { ...s, realization: nextR };
        }));

        if (audioCtxRef.current && oscillatorRef.current && oscillator2Ref.current) {
          if (isQuantumAudio) {
            const basePitch = (mappedSeed * 1.5) + 100;
            const targetFreq = basePitch + (distance * 0.5);
            const rampTime = audioCtxRef.current.currentTime + (tickRate / 1000);
            
            oscillatorRef.current.frequency.linearRampToValueAtTime(targetFreq, rampTime);
            oscillator2Ref.current.frequency.linearRampToValueAtTime(targetFreq + 7.83, rampTime);
          } else {
            oscillatorRef.current.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime);
            oscillator2Ref.current.frequency.setValueAtTime(frequency + 7.83, audioCtxRef.current.currentTime);
          }
        }
        
      }, tickRate);
    } else if (isActive && (timeRemaining <= 0 || realization >= 100)) {
      setIsActive(false);
      stopAudio();
    }
    return () => clearInterval(interval);
  }, [isActive, timeRemaining, realization, isOverdrive, isQuantumAudio, frequency, witnesses, trends]);

  const handleStart = () => {
    if (!isActive) {
      if (realization >= 100) setRealization(0);
      tickCounter.current = 0;
      setTimeRemaining(duration * 60);
      setIsActive(true);
      startAudio();
    } else {
      setIsActive(false);
      stopAudio();
      tickCounter.current = 0;
    }
  };

  const handleResetRealization = () => {
    setRealization(0);
  };

  const summonAIAssistant = () => {
    const templates = [
      { title: 'Source Emission', witness: 'Torus Field', trend: 'Geometric Stabilization', image: emission1 },
      { title: 'Spectral Relay', witness: 'Scalar Waves', trend: 'Frequency Coherence', image: emission2 },
      { title: 'Manifestation Core', witness: 'Light Lattice', trend: 'Deep Realization', image: emission3 },
      { title: 'Cosmic Entangler', witness: 'Golden Spiral', trend: 'Universal Link', image: emission4 },
      { title: 'Bio-Resonator', witness: 'Photonic DNA', trend: 'Vitality Boost', image: emission5 },
      { title: 'Plasma Uplink', witness: 'Charged Atmosphere', trend: 'Rapid Discharge', image: emission6 },
      { title: 'Core Power Booster', witness: 'Quantum Singularity', trend: 'Hyper-Acceleration', image: booster1 },
      { title: 'Aetheric Uplink', witness: 'Zero-Point Field', trend: 'Deep Resonance', image: booster2 },
      { title: 'Reality Engine', witness: 'Causal Nexus', trend: 'Stabilized Manifestation', image: booster3 }
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const id = `sub-${Date.now()}`;
    
    const newSub: SubSession = {
      id,
      ...template,
      realization: 0,
      isActive: true,
      x: 100 + (Math.random() * 200),
      y: 100 + (Math.random() * 200)
    };
    
    setSubSessions(prev => [...prev, newSub]);
  };

  const removeSubSession = (id: string) => {
    setSubSessions(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.globalCompositeOperation = 'screen';
      
      const wImages = Object.values(witnessImgRefs.current);
      if (wImages.length > 0) {
        ctx.globalAlpha = 0.5 / Math.sqrt(wImages.length);
        wImages.forEach((img: HTMLImageElement) => {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, centerX - w/2, centerY - h/2, w, h);
        });
      }
      
      const tImages = Object.values(trendImgRefs.current);
      if (tImages.length > 0) {
        ctx.globalAlpha = 0.5 / Math.sqrt(tImages.length);
        tImages.forEach((img: HTMLImageElement) => {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, centerX - w/2, centerY - h/2, w, h);
        });
      }

      ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = isActive ? 0.8 : 0.3;
      ctx.strokeStyle = isActive 
        ? (isOverdrive ? '#ff5500' : '#00ffcc') 
        : '#004433';
      ctx.lineWidth = isOverdrive && isActive ? 2.5 : 1.5;

      rotationRef.current += isActive ? (isOverdrive ? 0.02 : 0.005) : 0.001;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      ctx.save();
      ctx.rotate(-rotationRef.current * 0.5);
      ctx.beginPath();
      ctx.setLineDash([5, 15]);
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.rotate(rotationRef.current);

      const radius = 45;
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, isOverdrive]);

  const handleItemImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedDataUrl = await compressImage(file, 600, 0.7);
      setItems(prev => prev.map(item => item.id === id ? { ...item, image: compressedDataUrl } : item));
    }
  };

  const handleItemTextChange = (
    val: string,
    id: string,
    setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>
  ) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, text: val } : item));
  };

  const addItem = (setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>, prefix: string) => {
    setItems(prev => [...prev, { id: `${prefix}-${Date.now()}`, image: null, text: '' }]);
  };

  const removeItem = (id: string, setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffcc] font-mono p-4 md:p-8 flex flex-col items-center">
      
      {showSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-[#00ffcc]/30 rounded-lg shadow-[0_0_30px_rgba(0,255,204,0.1)] w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#00ffcc]/20 flex items-center justify-between">
              <h3 className="text-xl tracking-widest uppercase text-[#00ffcc]">Session Manager</h3>
              <button onClick={() => setShowSessionModal(false)} className="text-[#00ffcc]/50 hover:text-[#00ffcc] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 border-b border-[#00ffcc]/10 bg-[#00ffcc]/5 flex flex-col gap-2">
              <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider">Save Current Session</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sessionNameInput}
                  onChange={e => setSessionNameInput(e.target.value)}
                  placeholder="E.g., Wealth Protocol Alpha"
                  className="flex-1 bg-black/50 border border-[#00ffcc]/30 rounded px-3 text-[#00ffcc] focus:outline-none focus:border-[#00ffcc]/70 text-sm"
                  onKeyDown={e => e.key === 'Enter' && saveCurrentSession()}
                />
                <button 
                  onClick={saveCurrentSession}
                  disabled={!sessionNameInput.trim()}
                  className="px-4 py-2 bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50 rounded hover:bg-[#00ffcc]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[50vh] p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-[#00ffcc]/20">
              {savedSessions.length === 0 ? (
                <div className="text-center text-[#00ffcc]/40 py-8 text-sm uppercase tracking-widest">No saved sessions</div>
              ) : (
                savedSessions.map(session => (
                  <div key={session.id} className="border border-[#00ffcc]/20 rounded p-3 flex flex-col gap-2 hover:border-[#00ffcc]/40 transition-colors bg-black/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#00ffcc]">{session.name}</span>
                      <span className="text-xs text-[#00ffcc]/50">{new Date(session.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px] text-[#00ffcc]/70 flex items-center gap-4 uppercase tracking-wider">
                      <span>Targets: {session.witnesses.length}</span>
                      <span>Intentions: {session.trends.length}</span>
                      <span>Realization: {session.realization.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => loadSession(session)} className="flex-1 py-1.5 bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded hover:bg-[#00ffcc]/20 text-[#00ffcc] text-xs uppercase tracking-wider transition-colors">
                        Load
                      </button>
                      <button onClick={() => deleteSession(session.id)} className="px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded hover:bg-red-900/40 text-red-400 text-xs uppercase tracking-wider transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      )}

      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row items-center justify-between border-b border-[#00ffcc]/20 pb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)] flex items-center gap-4">
            Cyber Shaman
            {isOverdrive && <span className="text-xs bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/50 px-2 py-1 rounded shadow-[0_0_15px_#ff5500]">OVERDRIVE ACTIVE</span>}
          </h1>
          <p className="text-[#00ffcc]/60 text-sm mt-2 tracking-widest uppercase">Digital Psychotronic Board</p>
        </div>
        <button 
          onClick={() => setShowSessionModal(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00ffcc]/10 border border-[#00ffcc]/30 hover:border-[#00ffcc]/60 hover:bg-[#00ffcc]/20 rounded text-[#00ffcc] text-sm uppercase tracking-wider transition-colors"
        >
          <FolderOpen className="w-4 h-4" /> Manage Sessions
        </button>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="flex flex-col gap-4 border border-[#00ffcc]/20 bg-black/50 p-6 rounded-lg shadow-[0_0_15px_rgba(0,255,204,0.05)] h-[600px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#00ffcc]/20 pb-2">
            <h2 className="text-xl tracking-widest uppercase">Targets (Witness)</h2>
            <button 
              onClick={() => addItem(setWitnesses, 'w')}
              className="p-1 text-[#00ffcc]/70 hover:text-[#00ffcc] hover:bg-[#00ffcc]/10 rounded transition-colors"
              title="Add Target"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#00ffcc]/20 scrollbar-track-transparent">
            {witnesses.map((witness, index) => (
              <div key={witness.id} className="flex flex-col gap-3 relative pb-6 border-b border-[#00ffcc]/10 last:border-0">
                {witnesses.length > 1 && (
                  <button 
                    onClick={() => removeItem(witness.id, setWitnesses)}
                    className="absolute top-0 right-0 p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors z-10"
                    title="Remove Target"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="text-xs text-[#00ffcc]/50 uppercase tracking-wider font-bold">Target {index + 1}</div>
                <div className="relative border-2 border-dashed border-[#00ffcc]/30 hover:border-[#00ffcc]/60 transition-colors rounded-lg h-40 flex items-center justify-center overflow-hidden group">
                  {witness.image ? (
                    <img src={witness.image} alt={`Witness ${index + 1}`} className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <div className="text-center text-[#00ffcc]/50 group-hover:text-[#00ffcc]/80 flex flex-col items-center">
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-[10px] uppercase tracking-wider">Upload Image</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleItemImageUpload(e, witness.id, setWitnesses)}
                  />
                </div>
                
                <textarea 
                  className="w-full h-24 bg-[#00ffcc]/5 border border-[#00ffcc]/30 rounded p-2 text-sm text-[#00ffcc] placeholder-[#00ffcc]/40 focus:outline-none focus:border-[#00ffcc]/70 resize-none"
                  placeholder="Enter target details, name, or coordinates..."
                  value={witness.text}
                  onChange={(e) => handleItemTextChange(e.target.value, witness.id, setWitnesses)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={`flex flex-col items-center justify-center border transition-colors duration-1000 ${isOverdrive && isActive ? 'border-[#ff5500]/50 shadow-[0_0_50px_rgba(255,85,0,0.15)] bg-black/80' : 'border-[#00ffcc]/20 shadow-[0_0_30px_rgba(0,255,204,0.1)] bg-black/50'} p-6 rounded-lg relative overflow-hidden h-[600px]`}>
          <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isOverdrive && isActive ? 'bg-[radial-gradient(circle_at_center,rgba(255,85,0,0.08)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(0,255,204,0.05)_0%,transparent_70%)]'}`} />
          <h2 className={`text-xl text-center border-b pb-2 tracking-widest uppercase w-full mb-6 relative z-10 transition-colors ${isOverdrive && isActive ? 'border-[#ff5500]/50 text-[#ff5500]' : 'border-[#00ffcc]/20'}`}>Fusion Chamber</h2>
          
          <div className={`relative w-full aspect-square max-w-[300px] rounded-full border transition-colors duration-1000 ${isOverdrive && isActive ? 'border-[#ff5500]/50 shadow-[inset_0_0_80px_rgba(255,85,0,0.1)]' : 'border-[#00ffcc]/30 shadow-[inset_0_0_50px_rgba(0,255,204,0.05)]'} flex items-center justify-center bg-black z-10`}>
            <canvas 
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 border border-[#00ffcc]/20 bg-black/50 p-6 rounded-lg shadow-[0_0_15px_rgba(0,255,204,0.05)] h-[600px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#00ffcc]/20 pb-2">
            <h2 className="text-xl tracking-widest uppercase">Intentions (Trend)</h2>
            <button 
              onClick={() => addItem(setTrends, 't')}
              className="p-1 text-[#00ffcc]/70 hover:text-[#00ffcc] hover:bg-[#00ffcc]/10 rounded transition-colors"
              title="Add Intention"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#00ffcc]/20 scrollbar-track-transparent">
            {trends.map((trend, index) => (
              <div key={trend.id} className="flex flex-col gap-3 relative pb-6 border-b border-[#00ffcc]/10 last:border-0">
                {trends.length > 1 && (
                  <button 
                    onClick={() => removeItem(trend.id, setTrends)}
                    className="absolute top-0 right-0 p-1 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors z-10"
                    title="Remove Intention"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="text-xs text-[#00ffcc]/50 uppercase tracking-wider font-bold">Intention {index + 1}</div>
                <div className="relative border-2 border-dashed border-[#00ffcc]/30 hover:border-[#00ffcc]/60 transition-colors rounded-lg h-40 flex items-center justify-center overflow-hidden group">
                  {trend.image ? (
                    <img src={trend.image} alt={`Trend ${index + 1}`} className="w-full h-full object-cover opacity-70" />
                  ) : (
                    <div className="text-center text-[#00ffcc]/50 group-hover:text-[#00ffcc]/80 flex flex-col items-center">
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-[10px] uppercase tracking-wider">Upload Image</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleItemImageUpload(e, trend.id, setTrends)}
                  />
                </div>
                
                <textarea 
                  className="w-full h-24 bg-[#00ffcc]/5 border border-[#00ffcc]/30 rounded p-2 text-sm text-[#00ffcc] placeholder-[#00ffcc]/40 focus:outline-none focus:border-[#00ffcc]/70 resize-none"
                  placeholder="Enter intention, affirmation, or desired outcome..."
                  value={trend.text}
                  onChange={(e) => handleItemTextChange(e.target.value, trend.id, setTrends)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sub-sessions Floating Windows */}
      <AnimatePresence>
        {subSessions.map(sub => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            drag
            dragMomentum={false}
            className="fixed z-40 w-64 bg-black/95 border border-[#00ffcc]/40 rounded-lg shadow-[0_0_30px_rgba(0,255,204,0.3)] overflow-hidden cursor-move backdrop-blur-md"
            style={{ left: sub.x, top: sub.y }}
          >
            <div className="bg-[#00ffcc]/10 p-2 flex items-center justify-between border-b border-[#00ffcc]/20">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-[#00ffcc]" />
                <span className="text-[10px] uppercase tracking-tighter font-bold">{sub.title}</span>
              </div>
              <button onClick={() => removeSubSession(sub.id)} className="text-[#00ffcc]/50 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="h-28 bg-black/60 rounded overflow-hidden border border-[#00ffcc]/30 shadow-[inset_0_0_15px_rgba(0,255,204,0.3)]">
                <img src={sub.image} className="w-full h-full object-cover opacity-90 hover:scale-110 transition-transform duration-1000" alt="Emission" />
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[#00ffcc]/80 space-y-0.5">
                <div className="flex justify-between border-b border-[#00ffcc]/10 pb-0.5"><span>Source:</span> <span className="text-[#00ffcc] font-bold">{sub.witness}</span></div>
                <div className="flex justify-between border-b border-[#00ffcc]/10 pb-0.5"><span>Emission:</span> <span className="text-cyan-400 font-bold">{sub.trend}</span></div>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex justify-between text-[8px] text-[#00ffcc]/50 uppercase">
                  <span>Booster Resonance</span>
                  <span>{sub.realization.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#00ffcc]/20">
                  <div 
                    className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-300"
                    style={{ width: `${sub.realization}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <footer className="w-full max-w-6xl mt-8 border border-[#00ffcc]/20 bg-black/50 p-6 rounded-lg flex flex-col gap-6">
        
        {/* Realization Bar */}
        <div className="w-full flex flex-col gap-2 border-b border-[#00ffcc]/20 pb-6 relative">
          {subSessions.filter(s => s.isActive).length > 0 && (
            <div className="absolute -top-1 right-0 text-[10px] text-cyan-400 animate-pulse flex items-center gap-1 font-bold tracking-widest bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-400/30">
              <Cpu className="w-3 h-3" />
              ENTANGLEMENT SYNERGY: x{(1 + (subSessions.filter(s => s.isActive).length * 0.3)).toFixed(1)}
            </div>
          )}
          <div className="flex justify-between items-end">
            <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${isOverdrive ? 'text-[#ff5500]' : 'text-[#00ffcc]'}`} /> 
              Resonance & Realization
            </label>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-mono ${realization >= 100 ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : isOverdrive ? 'text-[#ff5500]' : 'text-[#00ffcc]'} tracking-widest`}>
                {realization.toFixed(2)}%
              </span>
              <button 
                onClick={handleResetRealization}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white"
                title="Reset Realization manually"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="w-full h-3 bg-black border border-[#00ffcc]/30 rounded-full overflow-hidden relative shadow-[inset_0_0_10px_rgba(0,255,204,0.1)]">
            <div 
              className={`h-full transition-all duration-300 ease-out ${realization >= 100 ? 'bg-white shadow-[0_0_10px_#fff]' : (isOverdrive ? 'bg-[#ff5500] shadow-[0_0_10px_#ff5500]' : 'bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]')}`}
              style={{ width: `${Math.min(100, Math.max(0, realization))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Activity className="text-[#00ffcc] w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col">
              <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider mb-1 flex items-center justify-between">
                Tone Source
                <button 
                  onClick={() => setIsQuantumAudio(!isQuantumAudio)}
                  className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isQuantumAudio ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]' : 'bg-transparent border-[#00ffcc]/30 text-[#00ffcc]/50 hover:border-[#00ffcc]/60 hover:text-[#00ffcc]'}`}
                >
                  {isQuantumAudio ? 'QUANTUM' : 'FIXED'}
                </button>
              </label>
              <input 
                type="number" 
                value={frequency}
                disabled={isQuantumAudio}
                title={isQuantumAudio ? "Disable Quantum Mode to enter fixed frequency" : ""}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className={`bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded px-3 py-2 text-[#00ffcc] w-32 focus:outline-none focus:border-[#00ffcc]/70 font-mono transition-opacity ${isQuantumAudio ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Clock className="text-[#00ffcc] w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col">
              <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider mb-1">Timer</label>
              <div className="flex gap-2">
                {[15, 30, 60].map(t => (
                  <button
                    key={t}
                    onClick={() => setDuration(t)}
                    className={`px-3 py-2 rounded border font-mono text-sm transition-colors ${
                      duration === t 
                        ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]' 
                        : 'bg-transparent border-[#00ffcc]/30 text-[#00ffcc]/70 hover:border-[#00ffcc]/60'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => setIsOverdrive(!isOverdrive)}
              className={`flex items-center gap-2 px-4 py-4 rounded font-bold uppercase transition-all duration-300 ${
                isOverdrive 
                  ? 'bg-[#ff5500]/20 border border-[#ff5500]/50 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]'
                  : 'bg-transparent border border-[#00ffcc]/30 text-[#00ffcc]/60 hover:border-[#00ffcc]/60 hover:text-[#00ffcc]'
              }`}
              title="Toggle Signal Overdrive (Binaural Beats & 10x Entropy Sampling)"
            >
              <Zap className="w-5 h-5 flex-shrink-0" />
            </button>

            <button
              onClick={summonAIAssistant}
              className="flex items-center gap-2 px-5 py-4 rounded font-bold uppercase transition-all duration-300 bg-[#00ffcc]/10 border border-[#00ffcc]/50 text-[#00ffcc] hover:bg-[#00ffcc]/20 hover:border-[#00ffcc] hover:shadow-[0_0_20px_rgba(0,255,204,0.3)]"
              title="Summon AI-POWER-BOOSTER Sub-session"
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span className="hidden xl:inline">AI-POWER-BOOSTER</span>
            </button>

            <button
              onClick={handleStart}
              className={`flex items-center gap-2 px-8 py-4 rounded font-bold tracking-widest uppercase transition-all duration-300 ${
                isActive 
                  ? 'bg-red-900/20 border border-red-500/50 text-red-400 hover:bg-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-[#00ffcc]/10 border border-[#00ffcc]/50 text-[#00ffcc] hover:bg-[#00ffcc]/20 shadow-[0_0_20px_rgba(0,255,204,0.2)]'
              }`}
            >
              {isActive ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Session
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Session
                </>
              )}
            </button>
            
            {isActive && (
              <div className="text-2xl font-mono text-[#00ffcc] drop-shadow-[0_0_5px_rgba(0,255,204,0.8)] w-24 text-right">
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
