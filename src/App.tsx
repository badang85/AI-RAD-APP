import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Clock,
  Cpu,
  FolderOpen,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Upload,
  X,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { QuantumSigilCanvas } from './QuantumSigil';
import { buildBoosterLabels, hashSessionText } from './sessionBoosterCopy';

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
  resonance?: number;
}

type BoosterRole =
  | 'amplifier'
  | 'stabilizer'
  | 'target-locker'
  | 'probability-bender'
  | 'entropy-cleaner'
  | 'outcome-attractor';

type EmissionPhase = 'lock' | 'charge' | 'broadcast' | 'stabilize' | 'seal' | 'dormant';

interface SubSession {
  id: string;
  title: string;
  witness: string;
  trend: string;
  role: BoosterRole;
  roleLabel: string;
  roleNote: string;
  sigilSeed: number;
  realization: number;
  isActive: boolean;
}

interface CoherenceProfile {
  anchorIntegrity: number;
  intentionFocus: number;
  semanticBridge: number;
  ritualStability: number;
  sessionCoherence: number;
}

interface DiagnosticReading {
  fieldPressure: number;
  targetLock: number;
  outcomeBias: number;
  entropyBalance: number;
  narrative: string;
  guidance: string;
}

const emissionPhaseOrder: EmissionPhase[] = ['lock', 'charge', 'broadcast', 'stabilize', 'seal'];

const phaseMeta: Record<EmissionPhase, { label: string; note: string; multiplier: number }> = {
  dormant: { label: 'Dormant', note: 'Field idle until lock sequence starts', multiplier: 0.55 },
  lock: { label: 'Lock', note: 'Anchoring witness signatures to the chamber', multiplier: 0.78 },
  charge: { label: 'Charge', note: 'Compressing intent into a coherent pressure wave', multiplier: 1.05 },
  broadcast: { label: 'Broadcast', note: 'Primary emission favors realization growth', multiplier: 1.28 },
  stabilize: { label: 'Stabilize', note: 'Reducing drift while preserving coherence', multiplier: 0.96 },
  seal: { label: 'Seal', note: 'Fixing the pattern into a closed target memory', multiplier: 1.12 }
};

const boosterCatalog: Array<{ role: BoosterRole; label: string; note: string }> = [
  { role: 'amplifier', label: 'Amplifier', note: 'Raises field pressure and accelerates manifestation gain.' },
  { role: 'stabilizer', label: 'Stabilizer', note: 'Reduces volatility and keeps the session coherent for longer.' },
  { role: 'target-locker', label: 'Target Locker', note: 'Improves witness anchoring and narrows the manifestation beam.' },
  { role: 'probability-bender', label: 'Probability Bender', note: 'Injects useful variance that can open faster outcome paths.' },
  { role: 'entropy-cleaner', label: 'Entropy Cleaner', note: 'Filters contradictory signal and lowers interference.' },
  { role: 'outcome-attractor', label: 'Outcome Attractor', note: 'Biases the chamber toward a single finalized result.' }
];

const metricCards: Array<{ key: keyof CoherenceProfile; label: string; note: string }> = [
  { key: 'anchorIntegrity', label: 'Anchor Integrity', note: 'How well witnesses define a stable target.' },
  { key: 'intentionFocus', label: 'Intention Focus', note: 'How consistent and explicit the desired outcome feels.' },
  { key: 'semanticBridge', label: 'Bridge Index', note: 'How much target and intention vocabularies reinforce each other.' },
  { key: 'ritualStability', label: 'Ritual Stability', note: 'How orderly and balanced the session architecture remains.' }
];

const diagnosticCards: Array<{ key: keyof DiagnosticReading; label: string; accent: string }> = [
  { key: 'fieldPressure', label: 'Field Pressure', accent: 'bg-cyan-400' },
  { key: 'targetLock', label: 'Target Lock', accent: 'bg-emerald-400' },
  { key: 'outcomeBias', label: 'Outcome Bias', accent: 'bg-fuchsia-400' },
  { key: 'entropyBalance', label: 'Entropy Balance', accent: 'bg-amber-300' }
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const compressImage = (file: File, maxWidth = 600, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
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
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);

const averageTextDensity = (items: RadionicItem[]) => {
  if (items.length === 0) return 0;
  return items.reduce((acc, item) => acc + tokenize(item.text).length, 0) / items.length;
};

const buildCoherenceProfile = (witnesses: RadionicItem[], trends: RadionicItem[]): CoherenceProfile => {
  const witnessTokens = witnesses.flatMap(item => tokenize(item.text));
  const trendTokens = trends.flatMap(item => tokenize(item.text));
  const witnessSet = new Set(witnessTokens);
  const trendSet = new Set(trendTokens);
  const overlap = [...witnessSet].filter(token => trendSet.has(token)).length;
  const union = new Set([...witnessSet, ...trendSet]).size || 1;
  const nonEmptyWitnesses = witnesses.filter(item => item.text.trim().length > 0 || item.image).length;
  const nonEmptyTrends = trends.filter(item => item.text.trim().length > 0 || item.image).length;
  const witnessDensity = averageTextDensity(witnesses);
  const trendDensity = averageTextDensity(trends);

  const anchorIntegrity = clamp(
    nonEmptyWitnesses / Math.max(1, witnesses.length) * 0.5 +
      clamp(witnessDensity / 18) * 0.25 +
      clamp(witnesses.filter(item => item.image).length / Math.max(1, witnesses.length)) * 0.25
  );
  const intentionFocus = clamp(
    nonEmptyTrends / Math.max(1, trends.length) * 0.45 +
      clamp(trendDensity / 18) * 0.35 +
      clamp(1 - Math.abs(trends.length - witnesses.length) / Math.max(3, trends.length + witnesses.length)) * 0.2
  );
  const semanticBridge = clamp((overlap / union) * 1.8 + clamp(Math.min(witnessDensity, trendDensity) / 16) * 0.25);
  const ritualStability = clamp(
    0.4 +
      clamp(1 - Math.abs(witnesses.length - trends.length) / Math.max(2, witnesses.length + trends.length)) * 0.35 +
      clamp((nonEmptyWitnesses + nonEmptyTrends) / Math.max(2, witnesses.length + trends.length)) * 0.25
  );
  const sessionCoherence = clamp(anchorIntegrity * 0.28 + intentionFocus * 0.28 + semanticBridge * 0.24 + ritualStability * 0.2);

  return { anchorIntegrity, intentionFocus, semanticBridge, ritualStability, sessionCoherence };
};

const buildDiagnosticReading = (
  coherence: CoherenceProfile,
  resonance: number,
  realization: number,
  boosters: SubSession[],
  phase: EmissionPhase,
  isOverdrive: boolean
): DiagnosticReading => {
  const activeBoosters = boosters.filter(booster => booster.isActive);
  const fieldPressure = clamp(resonance * 0.45 + coherence.sessionCoherence * 0.3 + activeBoosters.length * 0.05 + (isOverdrive ? 0.08 : 0));
  const targetLock = clamp(coherence.anchorIntegrity * 0.5 + coherence.semanticBridge * 0.2 + activeBoosters.filter(booster => booster.role === 'target-locker').length * 0.12);
  const outcomeBias = clamp(realization / 100 * 0.45 + activeBoosters.filter(booster => booster.role === 'outcome-attractor').length * 0.14 + phaseMeta[phase].multiplier * 0.12);
  const entropyBalance = clamp(
    coherence.ritualStability * 0.45 +
      activeBoosters.filter(booster => booster.role === 'entropy-cleaner').length * 0.12 +
      activeBoosters.filter(booster => booster.role === 'probability-bender').length * 0.05 -
      (isOverdrive ? 0.06 : 0)
  );

  let narrative = 'Signal weak and diffuse. The chamber needs clearer witness anchors.';
  let guidance = 'Add more specific witness details or tighten the intention language.';

  if (coherence.sessionCoherence > 0.72 && realization > 55) {
    narrative = 'High coherence field. The chamber is biasing reality toward a stable target line.';
    guidance = 'Maintain the current witness-trend pairing and let the seal phase complete.';
  } else if (fieldPressure > 0.66 && entropyBalance < 0.45) {
    narrative = 'Pressure is strong but noisy. The field may overshoot or scatter outcomes.';
    guidance = 'Favor stabilizer or entropy cleaner boosters before another heavy broadcast.';
  } else if (targetLock > 0.7 && outcomeBias < 0.5) {
    narrative = 'The target is acquired, but the desired future is not fully favored yet.';
    guidance = 'Strengthen the trend language or deploy an outcome attractor module.';
  } else if (entropyBalance > 0.7 && coherence.semanticBridge < 0.45) {
    narrative = 'The chamber is orderly, but target and intention are not speaking the same language.';
    guidance = 'Introduce shared keywords between witness and manifestation wording.';
  }

  return { fieldPressure, targetLock, outcomeBias, entropyBalance, narrative, guidance };
};

const getPhaseFromProgress = (progress: number): EmissionPhase => {
  if (progress <= 0) return 'lock';
  if (progress < 0.18) return 'lock';
  if (progress < 0.38) return 'charge';
  if (progress < 0.72) return 'broadcast';
  if (progress < 0.9) return 'stabilize';
  return 'seal';
};

const formatEta = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'imminent';
  if (minutes < 1) return `${Math.ceil(minutes * 60)} sec`;
  if (minutes < 60) return `${Math.ceil(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.ceil(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
};

export default function App() {
  const [isCurrentLoaded, setIsCurrentLoaded] = useState(false);
  const [isSavedSessionsLoaded, setIsSavedSessionsLoaded] = useState(false);
  const [witnesses, setWitnesses] = useState<RadionicItem[]>([{ id: 'w1', image: null, text: '' }]);
  const [trends, setTrends] = useState<RadionicItem[]>([{ id: 't1', image: null, text: '' }]);
  const [frequency, setFrequency] = useState(528);
  const [duration, setDuration] = useState(15);
  const [isActive, setIsActive] = useState(false);
  const [isQuantumLocked, setIsQuantumLocked] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [resonance, setResonance] = useState(0);
  const [isOverdrive, setIsOverdrive] = useState(false);
  const [isQuantumAudio, setIsQuantumAudio] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [realization, setRealization] = useState(0);
  const [subSessions, setSubSessions] = useState<SubSession[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionNameInput, setSessionNameInput] = useState('');
  const [linkedSavedSessionId, setLinkedSavedSessionId] = useState<string | null>(null);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<EmissionPhase>('dormant');
  const [lastReading, setLastReading] = useState<DiagnosticReading>({
    fieldPressure: 0.32,
    targetLock: 0.28,
    outcomeBias: 0.21,
    entropyBalance: 0.5,
    narrative: 'Field idle. Build witnesses and intentions to prepare the chamber.',
    guidance: 'Start by pairing a concrete target with a single concise intention.'
  });

  const chargeTimerRef = useRef<number | null>(null);
  const quickSaveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillator2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const gainNode2Ref = useRef<GainNode | null>(null);
  const pan1Ref = useRef<StereoPannerNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const witnessImgRefs = useRef<Record<string, HTMLImageElement>>({});
  const trendImgRefs = useRef<Record<string, HTMLImageElement>>({});
  const tickCounter = useRef(0);

  const sessionIntentHash = useMemo(() => hashSessionText(witnesses, trends), [witnesses, trends]);
  const coherenceProfile = useMemo(() => buildCoherenceProfile(witnesses, trends), [witnesses, trends]);
  const activeBoosters = useMemo(() => subSessions.filter(sub => sub.isActive), [subSessions]);

  const boosterEffects = useMemo(() => {
    const counts: Record<BoosterRole, number> = {
      amplifier: 0,
      stabilizer: 0,
      'target-locker': 0,
      'probability-bender': 0,
      'entropy-cleaner': 0,
      'outcome-attractor': 0
    };

    activeBoosters.forEach(booster => {
      counts[booster.role] += 1;
    });

    return {
      counts,
      realizationGain: counts.amplifier * 0.05 + counts['outcome-attractor'] * 0.04,
      coherenceGain: counts.stabilizer * 0.05 + counts['entropy-cleaner'] * 0.04 + counts['target-locker'] * 0.03,
      drift: counts['probability-bender'] * 0.03 + (isOverdrive ? 0.02 : 0),
      lockGain: counts['target-locker'] * 0.08,
      synergy: 1 + activeBoosters.length * 0.12
    };
  }, [activeBoosters, isOverdrive]);

  const totalProgress = useMemo(() => {
    if (!isActive) return 0;
    const totalSeconds = Math.max(1, duration * 60);
    return clamp((totalSeconds - timeRemaining) / totalSeconds);
  }, [duration, isActive, timeRemaining]);

  const liveDiagnostic = useMemo(
    () => buildDiagnosticReading(coherenceProfile, resonance, realization, subSessions, sessionPhase, isOverdrive),
    [coherenceProfile, resonance, realization, subSessions, sessionPhase, isOverdrive]
  );

  const protocolStatus = useMemo(() => {
    if (coherenceProfile.sessionCoherence > 0.72 && activeBoosters.length >= 2) return 'Convergent';
    if (coherenceProfile.sessionCoherence > 0.52) return 'Forming';
    return 'Diffuse';
  }, [activeBoosters.length, coherenceProfile.sessionCoherence]);

  const operationStrength = useMemo(() => {
    return clamp(
      coherenceProfile.sessionCoherence * 0.34 +
        resonance * 0.28 +
        totalProgress * 0.18 +
        activeBoosters.length * 0.05 +
        (isActive ? 0.12 : 0)
    );
  }, [activeBoosters.length, coherenceProfile.sessionCoherence, isActive, resonance, totalProgress]);

  const estimatedRatePerMinute = useMemo(() => {
    if (!isActive) return 0;
    return (
      coherenceProfile.sessionCoherence * 1.8 +
      resonance * 2.4 +
      activeBoosters.length * 0.7 +
      phaseMeta[sessionPhase].multiplier * 1.2 +
      (isOverdrive ? 0.8 : 0.2)
    );
  }, [activeBoosters.length, coherenceProfile.sessionCoherence, isActive, isOverdrive, resonance, sessionPhase]);

  const resultEtaLabel = useMemo(() => {
    if (realization >= 100) return 'result locked';
    if (!isActive) return 'waiting start';
    if (estimatedRatePerMinute <= 0.05) return 'undetected';
    return formatEta((100 - realization) / estimatedRatePerMinute);
  }, [estimatedRatePerMinute, isActive, realization]);

  const operationStateLabel = useMemo(() => {
    if (realization >= 100) return 'Result Locked';
    if (!isActive && operationStrength > 0.55) return 'Field Primed';
    if (!isActive) return 'Standby';
    if (operationStrength > 0.72) return 'Operation Running';
    if (operationStrength > 0.48) return 'Operation Forming';
    return 'Weak Detection';
  }, [isActive, operationStrength, realization]);

  useEffect(() => {
    try {
      const currentRaw = localStorage.getItem('cyber_shaman_current');
      if (currentRaw) {
        const data = JSON.parse(currentRaw);
        if (data.witnesses) setWitnesses(data.witnesses);
        if (data.trends) setTrends(data.trends);
        if (data.frequency !== undefined) setFrequency(data.frequency);
        if (data.duration !== undefined) setDuration(data.duration);
        if (data.isOverdrive !== undefined) setIsOverdrive(data.isOverdrive);
        if (data.isQuantumAudio !== undefined) setIsQuantumAudio(data.isQuantumAudio);
        if (data.realization !== undefined) setRealization(data.realization);
        if (data.resonance !== undefined) setResonance(data.resonance);
        if (data.isQuantumLocked !== undefined) setIsQuantumLocked(data.isQuantumLocked);
        if (data.linkedSavedSessionId !== undefined) setLinkedSavedSessionId(data.linkedSavedSessionId);
      }
    } catch (error) {
      console.error('Error loading current session', error);
    }
    setIsCurrentLoaded(true);

    try {
      const savedRaw = localStorage.getItem('cyber_shaman_saved_sessions');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) setSavedSessions(parsed);
      }
    } catch (error) {
      console.error('Error loading saved sessions', error);
    }
    setIsSavedSessionsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isSavedSessionsLoaded) return;
    setLinkedSavedSessionId(prev => (prev && savedSessions.some(session => session.id === prev) ? prev : null));
  }, [savedSessions, isSavedSessionsLoaded]);

  useEffect(() => {
    if (!isCurrentLoaded) return;
    localStorage.setItem(
      'cyber_shaman_current',
      JSON.stringify({ witnesses, trends, frequency, duration, isOverdrive, isQuantumAudio, realization, linkedSavedSessionId, resonance, isQuantumLocked })
    );
  }, [witnesses, trends, frequency, duration, isOverdrive, isQuantumAudio, realization, linkedSavedSessionId, resonance, isQuantumLocked, isCurrentLoaded]);

  useEffect(() => {
    if (!isSavedSessionsLoaded) return;
    localStorage.setItem('cyber_shaman_saved_sessions', JSON.stringify(savedSessions));
  }, [savedSessions, isSavedSessionsLoaded]);

  useEffect(() => {
    setLastReading(liveDiagnostic);
  }, [liveDiagnostic]);

  useEffect(() => {
    const validIds = new Set(witnesses.map(item => item.id));
    Object.keys(witnessImgRefs.current).forEach(id => {
      if (!validIds.has(id)) delete witnessImgRefs.current[id];
    });

    witnesses.forEach(witness => {
      if (witness.image) {
        if (!witnessImgRefs.current[witness.id] || witnessImgRefs.current[witness.id].src !== witness.image) {
          const img = new Image();
          img.src = witness.image;
          img.onload = () => {
            witnessImgRefs.current[witness.id] = img;
          };
        }
      } else {
        delete witnessImgRefs.current[witness.id];
      }
    });
  }, [witnesses]);

  useEffect(() => {
    const validIds = new Set(trends.map(item => item.id));
    Object.keys(trendImgRefs.current).forEach(id => {
      if (!validIds.has(id)) delete trendImgRefs.current[id];
    });

    trends.forEach(trend => {
      if (trend.image) {
        if (!trendImgRefs.current[trend.id] || trendImgRefs.current[trend.id].src !== trend.image) {
          const img = new Image();
          img.src = trend.image;
          img.onload = () => {
            trendImgRefs.current[trend.id] = img;
          };
        }
      } else {
        delete trendImgRefs.current[trend.id];
      }
    });
  }, [trends]);

  useEffect(() => {
    if (!isActive) {
      setSessionPhase('dormant');
      return;
    }
    setSessionPhase(getPhaseFromProgress(totalProgress));
  }, [isActive, totalProgress]);

  const flashQuickSaveSuccess = () => {
    if (quickSaveSuccessTimerRef.current) clearTimeout(quickSaveSuccessTimerRef.current);
    setQuickSaveSuccess(true);
    quickSaveSuccessTimerRef.current = setTimeout(() => {
      setQuickSaveSuccess(false);
      quickSaveSuccessTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => () => {
    if (quickSaveSuccessTimerRef.current) clearTimeout(quickSaveSuccessTimerRef.current);
  }, []);

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
      realization,
      resonance
    };
    setSavedSessions(prev => [newSession, ...prev]);
    setLinkedSavedSessionId(newSession.id);
    setSessionNameInput('');
    setShowSessionModal(false);
    flashQuickSaveSuccess();
  };

  const quickSaveSession = () => {
    if (linkedSavedSessionId && savedSessions.some(session => session.id === linkedSavedSessionId)) {
      setSavedSessions(prev =>
        prev.map(session =>
          session.id === linkedSavedSessionId
            ? { ...session, timestamp: Date.now(), witnesses, trends, frequency, duration, isOverdrive, isQuantumAudio, realization, resonance }
            : session
        )
      );
      flashQuickSaveSuccess();
      return;
    }
    setShowSessionModal(true);
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
    setResonance(session.resonance ?? 0);
    setLinkedSavedSessionId(session.id);
    setShowSessionModal(false);
  };

  const deleteSession = (id: string) => {
    setSavedSessions(prev => prev.filter(session => session.id !== id));
    if (id === linkedSavedSessionId) setLinkedSavedSessionId(null);
  };

  const startAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const gain2 = ctx.createGain();
    const pan1 = ctx.createStereoPanner();
    const pan2 = ctx.createStereoPanner();

    let baseFreq = frequency;
    if (isQuantumAudio) {
      const seedString = witnesses.map(item => item.text).join('') + trends.map(item => item.text).join('');
      let seed = 0;
      for (let index = 0; index < seedString.length; index += 1) {
        seed = ((seed << 5) - seed) + seedString.charCodeAt(index);
        seed |= 0;
      }
      const mappedSeed = Math.abs(seed) % 256;
      baseFreq = mappedSeed * 1.5 + 100;
      const entropy = new Uint8Array(1);
      window.crypto.getRandomValues(entropy);
      baseFreq += Math.abs(entropy[0] - mappedSeed) * 0.5;
    }

    osc.type = 'sine';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc2.frequency.setValueAtTime(baseFreq + 7.83, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 2);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(isOverdrive ? 0.3 : 0.16, ctx.currentTime + 2);
    pan1.pan.value = isOverdrive ? -1 : -0.2;
    pan2.pan.value = isOverdrive ? 1 : 0.2;

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
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.25);
      gainNode2Ref.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.25);
      setTimeout(() => {
        oscillatorRef.current?.stop();
        oscillator2Ref.current?.stop();
        oscillatorRef.current?.disconnect();
        oscillator2Ref.current?.disconnect();
        gainNodeRef.current?.disconnect();
        gainNode2Ref.current?.disconnect();
        pan1Ref.current?.disconnect();
      }, 1300);
    }
  };

  useEffect(() => {
    if (!isActive || !audioCtxRef.current || !gainNode2Ref.current || !pan1Ref.current) return;
    const ctx = audioCtxRef.current;
    gainNode2Ref.current.gain.linearRampToValueAtTime(isOverdrive ? 0.3 : 0.16, ctx.currentTime + 1);
    pan1Ref.current.pan.linearRampToValueAtTime(isOverdrive ? -1 : -0.2, ctx.currentTime + 1);
  }, [isOverdrive, isActive]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeRemaining > 0 && realization < 100) {
      const tickRate = isOverdrive ? 120 : 1000;

      interval = window.setInterval(() => {
        tickCounter.current += tickRate;
        if (tickCounter.current >= 1000) {
          setTimeRemaining(prev => prev - 1);
          tickCounter.current = 0;
        }

        const seedString = witnesses.map(item => item.text).join('') + trends.map(item => item.text).join('');
        let intentSeed = 0;
        for (let index = 0; index < seedString.length; index += 1) {
          intentSeed = ((intentSeed << 5) - intentSeed) + seedString.charCodeAt(index);
          intentSeed |= 0;
        }

        const targetValue = Math.abs(intentSeed) % 256;
        const entropyBuffer = new Uint8Array(isOverdrive ? 12 : 4);
        window.crypto.getRandomValues(entropyBuffer);

        let totalDistance = 0;
        entropyBuffer.forEach(value => {
          totalDistance += Math.abs(value - targetValue);
        });

        const avgDistance = totalDistance / entropyBuffer.length;
        const entropyCoherence = clamp(1 - avgDistance / 128);
        const tunedCoherence = clamp(
          entropyCoherence * 0.34 +
            coherenceProfile.sessionCoherence * 0.38 +
            coherenceProfile.semanticBridge * 0.12 +
            boosterEffects.coherenceGain
        );

        setResonance(prev => {
          const next = prev * 0.9 + tunedCoherence * 0.08 * phaseMeta[sessionPhase].multiplier + coherenceProfile.ritualStability * 0.02;
          return clamp(next, 0, 1.2);
        });

        const synergyBoost =
          activeBoosters.length > 0 ? boosterEffects.synergy * activeBoosters.reduce((acc, booster) => acc + booster.realization / 1400, 0) : 0;
        const volatility = Math.max(0, boosterEffects.drift - coherenceProfile.ritualStability * 0.025);
        let delta =
          (tunedCoherence - 0.48) * 0.09 +
          Math.pow(resonance, 2.2) * 0.36 +
          boosterEffects.realizationGain +
          synergyBoost +
          phaseMeta[sessionPhase].multiplier * 0.018 -
          volatility;

        if (sessionPhase === 'seal') {
          delta += coherenceProfile.anchorIntegrity * 0.03 + boosterEffects.lockGain * 0.02;
        }

        setRealization(prev => clamp(prev + delta, 0, 100));

        setSubSessions(prev =>
          prev.map(sub => {
            if (!sub.isActive) return sub;

            const roleBoost =
              sub.role === 'amplifier' ? 0.06 :
              sub.role === 'stabilizer' ? 0.04 :
              sub.role === 'target-locker' ? 0.05 :
              sub.role === 'probability-bender' ? 0.065 :
              sub.role === 'entropy-cleaner' ? 0.045 :
              0.055;

            const phaseBoost = sessionPhase === 'broadcast' ? 0.04 : sessionPhase === 'seal' ? 0.03 : 0.02;
            return { ...sub, realization: Math.min(100, sub.realization + roleBoost + phaseBoost + coherenceProfile.sessionCoherence * 0.02) };
          })
        );

        if (audioCtxRef.current && oscillatorRef.current && oscillator2Ref.current) {
          const ctx = audioCtxRef.current;
          if (isQuantumAudio) {
            const phaseFrequencyOffset = sessionPhase === 'broadcast' ? 22 : sessionPhase === 'seal' ? 12 : 0;
            const targetFreq = targetValue * 1.5 + 100 + avgDistance * 0.45 + phaseFrequencyOffset;
            const rampTime = ctx.currentTime + tickRate / 1000;
            oscillatorRef.current.frequency.linearRampToValueAtTime(targetFreq, rampTime);
            oscillator2Ref.current.frequency.linearRampToValueAtTime(targetFreq + 7.83, rampTime);
          } else {
            oscillatorRef.current.frequency.setValueAtTime(frequency, ctx.currentTime);
            oscillator2Ref.current.frequency.setValueAtTime(frequency + 7.83, ctx.currentTime);
          }
        }
      }, tickRate);
    } else if (isActive && (timeRemaining <= 0 || realization >= 100)) {
      setIsActive(false);
      setIsQuantumLocked(false);
      stopAudio();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    activeBoosters,
    boosterEffects,
    coherenceProfile,
    frequency,
    isActive,
    isOverdrive,
    isQuantumAudio,
    realization,
    resonance,
    sessionPhase,
    timeRemaining,
    trends,
    witnesses
  ]);

  const handleStart = () => {
    if (!isActive) {
      if (realization >= 100) setRealization(0);
      tickCounter.current = 0;
      setTimeRemaining(duration * 60);
      setIsActive(true);
      setIsQuantumLocked(true);
      setIsCharging(false);
      setSessionPhase('lock');
      setResonance(Math.max(0.12, coherenceProfile.sessionCoherence * 0.25));
      startAudio();
    } else {
      setIsActive(false);
      setIsQuantumLocked(false);
      setIsCharging(false);
      setChargeProgress(0);
      setSessionPhase('dormant');
      setResonance(0);
      stopAudio();
      tickCounter.current = 0;
    }
  };

  const startCharging = () => {
    if (isActive) {
      handleStart();
      return;
    }

    setIsCharging(true);
    setChargeProgress(0);
    const startedAt = Date.now();
    const durationMs = 3000;

    chargeTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setChargeProgress(progress);

      if (progress >= 100) {
        if (chargeTimerRef.current) clearInterval(chargeTimerRef.current);
        setIsCharging(false);
        handleStart();
      }
    }, 50);
  };

  const cancelCharging = () => {
    if (chargeTimerRef.current) {
      clearInterval(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    setIsCharging(false);
    setChargeProgress(0);
  };

  const handleResetRealization = () => {
    setRealization(0);
    setResonance(0);
    setSessionPhase('dormant');
  };

  const summonAIAssistant = () => {
    const id = `sub-${Date.now()}`;
    const sigilSeed = (Math.imul(Date.now() | 0, 0xcc9e2d51) ^ (Math.floor(Math.random() * 0x7fffffff) * 0x1b873593)) >>> 0;
    const labels = buildBoosterLabels(witnesses, trends, sigilSeed);
    const roleMeta = boosterCatalog[(sigilSeed + subSessions.length) % boosterCatalog.length];

    setSubSessions(prev => [
      ...prev,
      {
        id,
        title: labels.title,
        witness: labels.witness,
        trend: labels.trend,
        role: roleMeta.role,
        roleLabel: roleMeta.label,
        roleNote: roleMeta.note,
        sigilSeed,
        realization: 0,
        isActive: true
      }
    ]);
  };

  const removeSubSession = (id: string) => {
    setSubSessions(prev => prev.filter(sub => sub.id !== id));
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

      const witnessImages = Object.values(witnessImgRefs.current);
      if (witnessImages.length > 0) {
        ctx.globalAlpha = 0.5 / Math.sqrt(witnessImages.length);
        witnessImages.forEach(img => {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.82;
          const width = img.width * scale;
          const height = img.height * scale;
          ctx.drawImage(img, centerX - width / 2, centerY - height / 2, width, height);
        });
      }

      const trendImages = Object.values(trendImgRefs.current);
      if (trendImages.length > 0) {
        ctx.globalAlpha = 0.45 / Math.sqrt(trendImages.length);
        trendImages.forEach(img => {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.78;
          const width = img.width * scale;
          const height = img.height * scale;
          ctx.drawImage(img, centerX - width / 2, centerY - height / 2, width, height);
        });
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = isActive ? 0.8 : 0.35;
      ctx.strokeStyle = isActive ? (isOverdrive ? '#ff5500' : '#00ffcc') : '#104f45';
      ctx.lineWidth = isOverdrive && isActive ? 2.4 : 1.6;

      const rotationGain = sessionPhase === 'broadcast' ? 0.012 : sessionPhase === 'seal' ? 0.008 : 0.004;
      rotationRef.current += isActive ? (isOverdrive ? rotationGain * 2.2 : rotationGain) : 0.001;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.save();
      ctx.rotate(-rotationRef.current * 0.45);
      ctx.beginPath();
      ctx.setLineDash([5, 12]);
      ctx.arc(0, 0, 138, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.rotate(rotationRef.current);
      const radius = 45 + coherenceProfile.sessionCoherence * 8;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (let index = 0; index < 6; index += 1) {
        const angle = (index * Math.PI) / 3;
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
  }, [coherenceProfile.sessionCoherence, isActive, isOverdrive, sessionPhase]);

  const handleItemImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    id: string,
    setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressedDataUrl = await compressImage(file, 600, 0.7);
    setItems(prev => prev.map(item => (item.id === id ? { ...item, image: compressedDataUrl } : item)));
  };

  const handleItemTextChange = (
    value: string,
    id: string,
    setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>
  ) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, text: value } : item)));
  };

  const addItem = (setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>, prefix: string) => {
    setItems(prev => [...prev, { id: `${prefix}-${Date.now()}`, image: null, text: '' }]);
  };

  const removeItem = (id: string, setItems: React.Dispatch<React.SetStateAction<RadionicItem[]>>) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isCurrentLoaded || !isSavedSessionsLoaded) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffcc] font-mono p-4 pt-[12.5rem] md:p-8 md:pt-[12.5rem] flex flex-col items-center">
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
                  onChange={event => setSessionNameInput(event.target.value)}
                  placeholder="E.g., Wealth Protocol Alpha"
                  className="flex-1 bg-black/50 border border-[#00ffcc]/30 rounded px-3 text-[#00ffcc] focus:outline-none focus:border-[#00ffcc]/70 text-sm"
                  onKeyDown={event => event.key === 'Enter' && saveCurrentSession()}
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
                      <button
                        onClick={() => loadSession(session)}
                        className="flex-1 py-1.5 bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded hover:bg-[#00ffcc]/20 text-[#00ffcc] text-xs uppercase tracking-wider transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded hover:bg-red-900/40 text-red-400 text-xs uppercase tracking-wider transition-colors"
                      >
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

      <section className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 md:px-8">
        <div className="max-w-6xl mx-auto border border-cyan-300/25 bg-[#03110f]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,255,204,0.12)] overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.55fr))] gap-px bg-[#0b2924]">
            <div className="bg-[#03110f] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full border text-[10px] uppercase tracking-[0.24em] ${realization >= 100 ? 'border-white/40 bg-white/10 text-white' : isActive ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-[#00ffcc]/20 bg-[#00ffcc]/8 text-[#00ffcc]/70'}`}>
                  {operationStateLabel}
                </span>
                <span className="px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-500/8 text-cyan-300 text-[10px] uppercase tracking-[0.24em]">
                  {phaseMeta[sessionPhase].label}
                </span>
              </div>
              <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.26em] text-[#00ffcc]/55">Psychotronic operation detection</div>
                  <div className="text-2xl md:text-3xl text-[#e6fffd] mt-2">{realization.toFixed(1)}% result</div>
                </div>
                <div className="text-sm text-[#00ffcc]/72 max-w-xl leading-relaxed">
                  {isActive
                    ? operationStrength > 0.68
                      ? 'The app detects a coherent active operation and is tracking the path toward result lock.'
                      : 'The operation is running, but the field still looks partial or unstable.'
                    : realization >= 100
                      ? 'The chamber marks the session as completed and sealed.'
                      : 'The field is not currently transmitting. Start the session to measure active operation.'}
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#041f1b] border border-[#00ffcc]/12 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 via-[#00ffcc] to-white shadow-[0_0_14px_rgba(217,255,251,0.4)] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, realization))}%` }} />
              </div>
            </div>

            <div className="bg-[#03110f] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00ffcc]/55">ETA</div>
              <div className="text-xl text-[#dffef9] mt-2">{resultEtaLabel}</div>
              <div className="text-[11px] text-[#00ffcc]/42 mt-2">Estimated time to result</div>
            </div>

            <div className="bg-[#03110f] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00ffcc]/55">Operation</div>
              <div className="text-xl text-[#dffef9] mt-2">{(operationStrength * 100).toFixed(0)}%</div>
              <div className="text-[11px] text-[#00ffcc]/42 mt-2">Detected execution strength</div>
            </div>

            <div className="bg-[#03110f] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00ffcc]/55">Remaining</div>
              <div className="text-xl text-[#dffef9] mt-2">{Math.max(0, 100 - realization).toFixed(1)}%</div>
              <div className="text-[11px] text-[#00ffcc]/42 mt-2">Distance to lock</div>
            </div>

            <div className="bg-[#03110f] px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00ffcc]/55">Coherence</div>
              <div className="text-xl text-[#dffef9] mt-2">{(coherenceProfile.sessionCoherence * 100).toFixed(0)}%</div>
              <div className="text-[11px] text-[#00ffcc]/42 mt-2">Field quality right now</div>
            </div>
          </div>
        </div>
      </section>

      <header className="w-full max-w-6xl mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-[#00ffcc]/20 pb-6 gap-4">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)] flex items-center gap-4">
            Cyber Shaman
            {isOverdrive && (
              <span className="text-xs bg-[#ff5500]/20 text-[#ff5500] border border-[#ff5500]/50 px-2 py-1 rounded shadow-[0_0_15px_#ff5500]">
                OVERDRIVE ACTIVE
              </span>
            )}
          </h1>
          <p className="text-[#00ffcc]/60 text-sm tracking-widest uppercase">Psychotronic Manifestation Operating System</p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em]">
            <span className="px-3 py-1 rounded-full border border-[#00ffcc]/20 bg-[#00ffcc]/8 text-[#00ffcc]/70">Protocol {protocolStatus}</span>
            <span className="px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-500/8 text-cyan-300">{phaseMeta[sessionPhase].label}</span>
            <span className="px-3 py-1 rounded-full border border-emerald-400/20 bg-emerald-500/8 text-emerald-300">
              Coherence {(coherenceProfile.sessionCoherence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={quickSaveSession}
            aria-label={quickSaveSuccess ? 'Session saved' : 'Quick save session'}
            className={`p-2.5 rounded border transition-all duration-300 ${
              quickSaveSuccess
                ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                : 'bg-[#00ffcc]/10 border-[#00ffcc]/30 hover:border-[#00ffcc]/60 hover:bg-[#00ffcc]/20 text-[#00ffcc]'
            }`}
          >
            {quickSaveSuccess ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Save className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00ffcc]/10 border border-[#00ffcc]/30 hover:border-[#00ffcc]/60 hover:bg-[#00ffcc]/20 rounded text-[#00ffcc] text-sm uppercase tracking-wider transition-colors"
          >
            <FolderOpen className="w-4 h-4" /> Manage Sessions
          </button>
        </div>
      </header>

      <section className="w-full max-w-6xl mb-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <div className="border border-[#00ffcc]/20 bg-black/50 rounded-lg p-5 shadow-[0_0_20px_rgba(0,255,204,0.06)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#00ffcc]/15 pb-4">
            <div>
              <h2 className="text-lg uppercase tracking-[0.18em]">Configuration Matrix</h2>
              <p className="text-xs text-[#00ffcc]/50 uppercase tracking-[0.18em] mt-2">
                Witnesses and intentions define the anchor geometry of the session
              </p>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.2em] text-[#00ffcc]/55">
              <div>{witnesses.length} witness vectors</div>
              <div>{trends.length} intention streams</div>
            </div>
          </div>

          <main className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        onChange={event => handleItemImageUpload(event, witness.id, setWitnesses)}
                      />
                    </div>

                    <textarea
                      className="w-full h-24 bg-[#00ffcc]/5 border border-[#00ffcc]/30 rounded p-2 text-sm text-[#00ffcc] placeholder-[#00ffcc]/40 focus:outline-none focus:border-[#00ffcc]/70 resize-none"
                      placeholder="Enter target details, name, address, coordinates, or signature..."
                      value={witness.text}
                      onChange={event => handleItemTextChange(event.target.value, witness.id, setWitnesses)}
                    />
                  </div>
                ))}
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
                        onChange={event => handleItemImageUpload(event, trend.id, setTrends)}
                      />
                    </div>

                    <textarea
                      className="w-full h-24 bg-[#00ffcc]/5 border border-[#00ffcc]/30 rounded p-2 text-sm text-[#00ffcc] placeholder-[#00ffcc]/40 focus:outline-none focus:border-[#00ffcc]/70 resize-none"
                      placeholder="Enter intention, affirmation, desired outcome, or target future..."
                      value={trend.text}
                      onChange={event => handleItemTextChange(event.target.value, trend.id, setTrends)}
                    />
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>

        <aside className="border border-[#00ffcc]/20 bg-black/50 rounded-lg p-5 shadow-[0_0_20px_rgba(0,255,204,0.06)] flex flex-col gap-5">
          <div className="border-b border-[#00ffcc]/15 pb-4">
            <h2 className="text-lg uppercase tracking-[0.18em]">Coherence Engine</h2>
            <p className="text-xs text-[#00ffcc]/50 uppercase tracking-[0.18em] mt-2">
              Speculative diagnostic model inspired by coherence, biofeedback and probabilistic field metaphors
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
            {metricCards.map(card => (
              <div key={card.key} className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-[0.22em] text-[#00ffcc]/70">{card.label}</span>
                  <span className="text-sm text-[#00ffcc]">{(coherenceProfile[card.key] * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#021a17] overflow-hidden border border-[#00ffcc]/15">
                  <div
                    className="h-full bg-gradient-to-r from-[#00695c] via-cyan-400 to-[#d1fff4] shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                    style={{ width: `${coherenceProfile[card.key] * 100}%` }}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-[#00ffcc]/45 mt-3">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="border border-cyan-400/15 rounded-lg bg-cyan-500/6 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Session Coherence</div>
                <div className="text-3xl mt-2 text-[#d9fffb]">{(coherenceProfile.sessionCoherence * 100).toFixed(1)}%</div>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-300" />
            </div>
            <p className="text-[11px] leading-relaxed text-cyan-100/60 mt-3">
              {coherenceProfile.sessionCoherence > 0.72
                ? 'The chamber detects a clean overlap between witness and desired future.'
                : coherenceProfile.sessionCoherence > 0.5
                  ? 'The protocol is viable, but language and anchors could align more tightly.'
                  : 'Intent is still diffuse. Sharper witness details will improve manifestation pressure.'}
            </p>
          </div>
        </aside>
      </section>

      <footer className="w-full max-w-6xl border border-[#00ffcc]/20 bg-black/50 p-6 rounded-lg flex flex-col gap-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4">
                <Activity className="text-[#00ffcc] w-6 h-6 flex-shrink-0" />
                <div className="flex flex-col">
                  <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider mb-1 flex items-center justify-between">
                    Tone Source
                    <button
                      onClick={() => setIsQuantumAudio(!isQuantumAudio)}
                      className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        isQuantumAudio
                          ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]'
                          : 'bg-transparent border-[#00ffcc]/30 text-[#00ffcc]/50 hover:border-[#00ffcc]/60 hover:text-[#00ffcc]'
                      }`}
                    >
                      {isQuantumAudio ? 'QUANTUM' : 'FIXED'}
                    </button>
                  </label>
                  <input
                    type="number"
                    value={frequency}
                    disabled={isQuantumAudio}
                    title={isQuantumAudio ? 'Disable Quantum Mode to enter fixed frequency' : ''}
                    onChange={event => setFrequency(Number(event.target.value))}
                    className={`bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded px-3 py-2 text-[#00ffcc] w-32 focus:outline-none focus:border-[#00ffcc]/70 font-mono transition-opacity ${
                      isQuantumAudio ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Clock className="text-[#00ffcc] w-6 h-6 flex-shrink-0" />
                <div className="flex flex-col">
                  <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider mb-1">Timer</label>
                  <div className="flex gap-2">
                    {[15, 30, 60].map(minutes => (
                      <button
                        key={minutes}
                        onClick={() => setDuration(minutes)}
                        className={`px-3 py-2 rounded border font-mono text-sm transition-colors ${
                          duration === minutes
                            ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc]'
                            : 'bg-transparent border-[#00ffcc]/30 text-[#00ffcc]/70 hover:border-[#00ffcc]/60'
                        }`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2 border-t border-[#00ffcc]/15 pt-4 relative">
              {activeBoosters.length > 0 && (
                <div className="absolute -top-1 right-0 text-[10px] text-cyan-400 animate-pulse flex items-center gap-1 font-bold tracking-widest bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-400/30 backdrop-blur-sm shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  <Cpu className="w-3 h-3" />
                  ENTANGLEMENT x{boosterEffects.synergy.toFixed(2)}
                </div>
              )}

              <div className="flex justify-between items-end">
                <label className="text-xs text-[#00ffcc]/70 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${isOverdrive ? 'text-[#ff5500]' : 'text-[#00ffcc]'}`} />
                  Realization Pressure
                </label>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-mono ${
                      realization >= 100
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : isOverdrive
                          ? 'text-[#ff5500]'
                          : 'text-[#00ffcc]'
                    } tracking-widest`}
                  >
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
                  className={`h-full transition-all duration-300 ease-out ${
                    realization >= 100
                      ? 'bg-white shadow-[0_0_10px_#fff]'
                      : isOverdrive
                        ? 'bg-[#ff5500] shadow-[0_0_10px_#ff5500]'
                        : 'bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, realization))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4 flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <label className="text-xs text-cyan-400 capitalize tracking-widest flex items-center gap-2">
                <Zap className={`w-3 h-3 ${resonance > 0.8 ? 'animate-pulse' : ''}`} />
                Quantum Coherence / Resonance
              </label>
              <span className="text-[10px] font-mono text-cyan-400/70">{(resonance * 100).toFixed(1)}% COH</span>
            </div>
            <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden flex gap-1">
              {Array.from({ length: 20 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-full transition-all duration-500 ${
                    resonance > index / 20
                      ? resonance > 0.8
                        ? 'bg-white shadow-[0_0_5px_#fff]'
                        : 'bg-cyan-500'
                      : 'bg-cyan-950/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-[#00ffcc]/50 leading-relaxed">{phaseMeta[sessionPhase].note}</p>
          </div>
        </div>

        <div className="border-t border-[#00ffcc]/15 pt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setIsOverdrive(!isOverdrive)}
              className={`flex items-center gap-2 px-4 py-4 rounded font-bold uppercase transition-all duration-300 ${
                isOverdrive
                  ? 'bg-[#ff5500]/20 border border-[#ff5500]/50 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]'
                  : 'bg-transparent border border-[#00ffcc]/30 text-[#00ffcc]/60 hover:border-[#00ffcc]/60 hover:text-[#00ffcc]'
              }`}
              title="Toggle Signal Overdrive"
            >
              <Zap className="w-5 h-5 flex-shrink-0" />
            </button>

            <button
              onClick={summonAIAssistant}
              className="flex items-center gap-2 px-5 py-4 rounded font-bold uppercase transition-all duration-300 bg-[#00ffcc]/10 border border-[#00ffcc]/50 text-[#00ffcc] hover:bg-[#00ffcc]/20 hover:border-[#00ffcc] hover:shadow-[0_0_20px_rgba(0,255,204,0.3)]"
              title="Create a specialized booster linked to this session"
            >
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>AI-POWER-BOOSTER</span>
            </button>

            <button
              onMouseDown={startCharging}
              onMouseUp={cancelCharging}
              onMouseLeave={cancelCharging}
              onTouchStart={startCharging}
              onTouchEnd={cancelCharging}
              className={`flex items-center gap-2 px-8 py-4 rounded font-bold tracking-widest uppercase transition-all duration-300 relative overflow-hidden group select-none ${
                isActive
                  ? 'bg-red-900/20 border border-red-500/50 text-red-400 hover:bg-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-[#00ffcc]/10 border border-[#00ffcc]/50 text-[#00ffcc] hover:bg-[#00ffcc]/20 shadow-[0_0_20px_rgba(0,255,204,0.2)]'
              }`}
            >
              <div className="absolute inset-0 bg-[#00ffcc]/20 transition-transform duration-75 origin-left" style={{ transform: `scaleX(${chargeProgress / 100})` }} />
              <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              {isActive ? (
                <>
                  <Square className={`w-5 h-5 ${isQuantumLocked ? 'animate-pulse' : ''}`} />
                  Stop Session
                </>
              ) : isCharging ? (
                <>
                  <Activity className="w-5 h-5 animate-spin" />
                  Quantum Lock...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Hold to Start
                </>
              )}
            </button>

            {isActive && <div className="text-2xl font-mono text-[#00ffcc] drop-shadow-[0_0_5px_rgba(0,255,204,0.8)] w-24 text-right">{formatTime(timeRemaining)}</div>}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {emissionPhaseOrder.map(phase => {
              const isCurrent = phase === sessionPhase;
              const isPast = emissionPhaseOrder.indexOf(phase) < emissionPhaseOrder.indexOf(sessionPhase);
              return (
                <div
                  key={phase}
                  className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                    isCurrent
                      ? 'border-cyan-300 bg-cyan-400/10 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.18)]'
                      : isPast
                        ? 'border-[#00ffcc]/25 bg-[#00ffcc]/8 text-[#00ffcc]/75'
                        : 'border-[#00ffcc]/12 bg-black/30 text-[#00ffcc]/35'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.22em]">{phaseMeta[phase].label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>

      <section className="w-full max-w-6xl mt-8 border border-[#00ffcc]/20 bg-black/50 p-6 rounded-lg shadow-[0_0_25px_rgba(0,255,204,0.08)] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-[#00ffcc]/20 pb-4">
          <div>
            <h2 className="text-2xl tracking-[0.18em] uppercase text-[#00ffcc]">Manifestation Deck</h2>
            <p className="text-xs text-[#00ffcc]/55 uppercase tracking-[0.25em] mt-2">Emission chamber, booster architecture and return diagnostics</p>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#00ffcc]/60">
            {subSessions.length > 0 ? `${subSessions.length} boosts linked` : 'No boosts active'}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-6 items-start">
          <section className={`flex flex-col items-center justify-center border transition-colors duration-1000 ${isOverdrive && isActive ? 'border-[#ff5500]/50 shadow-[0_0_50px_rgba(255,85,0,0.15)] bg-black/80' : 'border-[#00ffcc]/20 shadow-[0_0_30px_rgba(0,255,204,0.1)] bg-black/50'} p-6 rounded-lg relative overflow-hidden min-h-[520px]`}>
            <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isOverdrive && isActive ? 'bg-[radial-gradient(circle_at_center,rgba(255,85,0,0.08)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(0,255,204,0.05)_0%,transparent_70%)]'}`} />
            <h3 className={`text-xl text-center border-b pb-2 tracking-widest uppercase w-full mb-6 relative z-10 transition-colors ${isOverdrive && isActive ? 'border-[#ff5500]/50 text-[#ff5500]' : 'border-[#00ffcc]/20'}`}>
              Fusion Chamber
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(220px,0.7fr)] gap-6 items-center w-full relative z-10">
              <div className={`relative w-full aspect-square max-w-[340px] mx-auto rounded-full border transition-colors duration-1000 ${isOverdrive && isActive ? 'border-[#ff5500]/50 shadow-[inset_0_0_80px_rgba(255,85,0,0.1)]' : 'border-[#00ffcc]/30 shadow-[inset_0_0_50px_rgba(0,255,204,0.05)]'} flex items-center justify-center bg-black`}>
                <canvas ref={canvasRef} width={300} height={300} className="rounded-full w-full h-full" />
              </div>

              <div className="flex flex-col gap-4">
                <div className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#00ffcc]/70">Current Phase</div>
                  <div className="text-2xl text-[#d9fffb] mt-2">{phaseMeta[sessionPhase].label}</div>
                  <p className="text-[11px] leading-relaxed text-[#00ffcc]/45 mt-3">{phaseMeta[sessionPhase].note}</p>
                </div>
                <div className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4">
                  <div className="flex justify-between items-center text-xs uppercase tracking-[0.22em] text-[#00ffcc]/70">
                    <span>Protocol Progress</span>
                    <span>{(totalProgress * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#031a17] overflow-hidden border border-[#00ffcc]/15">
                    <div className="h-full bg-gradient-to-r from-[#00ffcc]/40 via-cyan-400 to-white shadow-[0_0_10px_rgba(217,255,251,0.35)]" style={{ width: `${totalProgress * 100}%` }} />
                  </div>
                </div>
                <div className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#00ffcc]/70">Field Reading</div>
                  <p className="text-sm text-[#d9fffb] leading-relaxed mt-3">{lastReading.narrative}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 min-h-[520px]">
            <div className="flex items-center justify-between border border-[#00ffcc]/20 bg-black/40 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm tracking-[0.2em] uppercase text-[#00ffcc]">Boost Field</h3>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">{activeBoosters.length} active</span>
            </div>

            {subSessions.length === 0 ? (
              <div className="flex-1 border border-dashed border-[#00ffcc]/20 rounded-lg bg-black/30 flex items-center justify-center text-center px-6">
                <div className="max-w-xs">
                  <p className="text-sm uppercase tracking-[0.25em] text-[#00ffcc]/70">No boosters summoned</p>
                  <p className="text-xs text-[#00ffcc]/45 mt-3 leading-relaxed">Use the AI-POWER-BOOSTER control to deploy specialized support modules into the chamber.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                  {subSessions.map(sub => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -18, scale: 0.98 }}
                      className="bg-black/95 border border-[#00ffcc]/40 rounded-lg shadow-[0_0_30px_rgba(0,255,204,0.16)] overflow-hidden backdrop-blur-md"
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
                        <div className="relative h-28 bg-black/60 rounded overflow-hidden border border-[#00ffcc]/30 shadow-[inset_0_0_15px_rgba(0,255,204,0.3)]">
                          <QuantumSigilCanvas
                            seed={(sub.sigilSeed ^ sessionIntentHash) >>> 0}
                            frequency={frequency}
                            realization={sub.realization}
                            sessionActive={isActive}
                            isQuantumAudio={isQuantumAudio}
                          />
                          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent pt-4 pb-1 px-2">
                            <span className="text-[8px] uppercase tracking-[0.2em] text-[#00ffcc]/90 font-semibold">Live sigil</span>
                            <span className="block text-[7px] text-[#00ffcc]/50 font-mono mt-0.5">{frequency} Hz{isQuantumAudio ? ' - quantum' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
                          <span className="text-cyan-300">{sub.roleLabel}</span>
                          <span className="text-[#00ffcc]/55">{sub.isActive ? 'online' : 'idle'}</span>
                        </div>
                        <p className="text-[11px] text-[#00ffcc]/45 leading-relaxed">{sub.roleNote}</p>
                        <div className="text-[10px] uppercase tracking-wide text-[#00ffcc]/80 space-y-0.5">
                          <div className="flex justify-between border-b border-[#00ffcc]/10 pb-0.5">
                            <span>Target:</span>
                            <span className="text-[#00ffcc] font-bold">{sub.witness}</span>
                          </div>
                          <div className="flex justify-between border-b border-[#00ffcc]/10 pb-0.5">
                            <span>Boost:</span>
                            <span className="text-cyan-400 font-bold">{sub.trend}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="flex justify-between text-[8px] text-[#00ffcc]/50 uppercase">
                            <span>Booster Resonance</span>
                            <span>{sub.realization.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#00ffcc]/20">
                            <div className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-300" style={{ width: `${sub.realization}%` }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </section>
        </div>
      </section>

      <section className="w-full max-w-6xl mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-6">
        <div className="border border-[#00ffcc]/20 bg-black/50 rounded-lg p-6 shadow-[0_0_20px_rgba(0,255,204,0.06)]">
          <div className="flex items-center justify-between border-b border-[#00ffcc]/15 pb-4">
            <div>
              <h2 className="text-lg uppercase tracking-[0.18em]">Return Diagnostics</h2>
              <p className="text-xs text-[#00ffcc]/50 uppercase tracking-[0.18em] mt-2">Reading the chamber after emission</p>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#00ffcc]/55">{phaseMeta[sessionPhase].label}</div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnosticCards.map(card => (
              <div key={card.key} className="border border-[#00ffcc]/15 rounded-lg bg-black/35 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#00ffcc]/70">{card.label}</span>
                  <span className="text-sm text-[#d9fffb]">{(lastReading[card.key] * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#031a17] overflow-hidden border border-[#00ffcc]/12">
                  <div className={`${card.accent} h-full shadow-[0_0_10px_rgba(255,255,255,0.15)]`} style={{ width: `${lastReading[card.key] * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-cyan-400/20 bg-cyan-500/6 rounded-lg p-6 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
          <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">Oracle Notes</div>
          <p className="text-lg text-[#e6fffd] leading-relaxed mt-4">{lastReading.narrative}</p>
          <p className="text-sm text-cyan-100/70 leading-relaxed mt-4">{lastReading.guidance}</p>

          <div className="mt-6 pt-5 border-t border-cyan-400/15 space-y-3 text-[11px] uppercase tracking-[0.2em]">
            <div className="flex justify-between text-cyan-100/65">
              <span>Boosters online</span>
              <span>{activeBoosters.length}</span>
            </div>
            <div className="flex justify-between text-cyan-100/65">
              <span>Field pressure</span>
              <span>{(lastReading.fieldPressure * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-cyan-100/65">
              <span>Target lock</span>
              <span>{(lastReading.targetLock * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-cyan-100/65">
              <span>Outcome bias</span>
              <span>{(lastReading.outcomeBias * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
