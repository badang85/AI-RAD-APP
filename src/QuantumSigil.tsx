import React, { useRef, useEffect, useMemo } from 'react';

/** Deterministic [0,1) from seed + salt — unique “DNA” per booster instance */
function hash01(n: number, salt: number) {
  let x = ((n + salt * 0x9e3779b9) >>> 0) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function hslToRgb(hDeg: number, s: number, l: number): [number, number, number] {
  let h = hDeg % 360;
  if (h < 0) h += 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

export interface QuantumSigilProps {
  seed: number;
  frequency: number;
  realization: number;
  resonance?: number;
  sessionActive: boolean;
  isQuantumAudio: boolean;
  className?: string;
}

/**
 * Living sigil: Julia-set fractal whose fixed “identity” comes from `seed`,
 * while phase, palette and zoom follow quantum frequency + booster realization.
 */
export function QuantumSigilCanvas({
  seed,
  frequency,
  realization,
  resonance = 0.5,
  sessionActive,
  isQuantumAudio,
  className = ''
}: QuantumSigilProps) {
  const baseParams = useMemo(() => {
    let cr0 = hash01(seed, 1) * 1.2 - 0.6;
    let ci0 = hash01(seed, 2) * 1.2 - 0.6;
    const mag = Math.sqrt(cr0 * cr0 + ci0 * ci0);
    const scaleC = mag > 0.82 ? 0.82 / mag : 1;
    cr0 *= scaleC;
    ci0 *= scaleC;
    const hueBase = (hash01(seed, 4) * 110 + hash01(seed, 5) * 70) % 360;
    /** Per-sigil “species” — avoids every window looking like the same Julia loop */
    const useBurningShip = hash01(seed, 9) > 0.4;
    const rotBias = hash01(seed, 11) * Math.PI * 2;
    return { cr0, ci0, hueBase, useBurningShip, rotBias };
  }, [seed]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef({ frequency, realization, resonance, sessionActive, isQuantumAudio });
  liveRef.current = { frequency, realization, resonance, sessionActive, isQuantumAudio };

  const imageDataRef = useRef<ImageData | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const cssW = parent.clientWidth;
      const cssH = parent.clientHeight;
      if (cssW < 2 || cssH < 2) return;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      imageDataRef.current = null;
      sizeRef.current = { w: 0, h: 0 };
    };

    resize();
    const parent = canvas.parentElement;
    const ro = parent ? new ResizeObserver(resize) : null;
    if (parent && ro) ro.observe(parent);

    const startT = performance.now();
    const { cr0, ci0, hueBase, useBurningShip, rotBias } = baseParams;
    const maxIter = 42;

    let raf = 0;
    const draw = () => {
      const { frequency: f, realization: rz, resonance: res, sessionActive: active, isQuantumAudio: qAudio } = liveRef.current;

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }

      // putImageData uses device pixels — buffer must match canvas.width / canvas.height
      const w = canvas.width;
      const h = canvas.height;

      if (!imageDataRef.current || sizeRef.current.w !== w || sizeRef.current.h !== h) {
        imageDataRef.current = ctx.createImageData(w, h);
        sizeRef.current = { w, h };
      }
      const imageData = imageDataRef.current!;
      const data = imageData.data;

      const t = (performance.now() - startT) * 0.001;
      /** Slow non-repeating component — keeps hue & structure from short loops */
      const tAperiodic = t * t * 0.00006 + Math.sin(t * 0.51) * t * 0.0004;
      const freqNorm = Math.max(0.2, f / 528);
      const qPulse = qAudio ? 1 : 0.32;
      const sessionMul = active ? 1 : 0.22;

      // Visual Coherence: Higher resonance = steadier movement
      const motionStability = Math.max(0.1, 1 - res * 0.8);
      const phase = t * (0.38 + freqNorm * 0.95) * qPulse * motionStability;
      const wobbleR =
        0.048 * Math.sin(phase + rz * 0.042 + seed * 0.001) +
        0.022 * Math.sin(t * 0.413 + f * 0.0018) +
        0.016 * Math.sin(tAperiodic * 13 + rotBias);
      const wobbleI =
        0.048 * Math.cos(phase * 1.07 + f * 0.0016 + seed * 0.002) +
        0.02 * Math.cos(t * 0.277 * Math.PI + seed * 0.01) +
        0.014 * Math.cos(t * 0.089 + tAperiodic * 7);
      const cr = cr0 + wobbleR;
      const ci = ci0 + wobbleI;

      const zoomBase =
        1.24 +
        (rz / 100) * 0.68 +
        0.07 * Math.sin(t * 0.17 + seed * 0.011) +
        0.045 * Math.sin(t * 0.073 * Math.SQRT2 + tAperiodic);
      const zoom = zoomBase * (1 + 0.025 * Math.sin(t * 0.19 + rotBias));
      const panX =
        0.11 * Math.sin(t * 0.155 * freqNorm + hash01(seed, 3) * 6.2831853) +
        0.04 * Math.sin(t * 0.041 * Math.PI);
      const panY =
        0.11 * Math.cos(t * 0.138 * freqNorm) + 0.035 * Math.cos(t * 0.067 * Math.PI * 1.1);
      const aspect = h / w;

      const hueShift = (f / 1000) * 85;
      const theta =
        t * 0.034 * (0.65 + rz * 0.009) * qPulse + rotBias * 0.15 + tAperiodic * 0.8;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
          const zx0 = ((ix / w) * 2 - 1) * zoom + panX;
          const zy0 = ((iy / h) * 2 - 1) * zoom * aspect + panY;
          let zx = zx0 * cosT - zy0 * sinT;
          let zy = zx0 * sinT + zy0 * cosT;

          let i = 0;
          for (; i < maxIter; i++) {
            if (useBurningShip) {
              zx = Math.abs(zx);
              zy = Math.abs(zy);
            }
            const x2 = zx * zx - zy * zy + cr;
            const y2 = 2 * zx * zy + ci;
            zx = x2;
            zy = y2;
            if (zx * zx + zy * zy > 4) break;
          }

          const p = (iy * w + ix) * 4;
          if (i >= maxIter) {
            data[p] = 2;
            data[p + 1] = 14;
            data[p + 2] = 18;
            data[p + 3] = 255;
          } else {
            const zmag = Math.sqrt(zx * zx + zy * zy);
            const smooth = i + 1 - Math.log2(Math.log2(Math.max(zmag, 1.0000001)));
            const tcol = smooth / maxIter;
            const hue =
              (hueBase +
                hueShift +
                tcol * 158 +
                t * 6.2 * sessionMul +
                tAperiodic * 28 +
                (useBurningShip ? 22 : 0)) %
              360;
            const sat = 0.58 + rz * 0.0035 + res * 0.2;
            const light = 0.12 + tcol * 0.62 * (0.35 + 0.65 * sessionMul) + (res > 0.8 ? 0.1 : 0);
            const [r, g, b] = hslToRgb(hue < 0 ? hue + 360 : hue, Math.min(1, sat), Math.min(1, light));
            data[p] = r;
            data[p + 1] = g;
            data[p + 2] = b;
            data[p + 3] = 255;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createLinearGradient(0, 0, 0, cssH);
      g.addColorStop(0, 'rgba(0,255,204,0.06)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,40,50,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      if (ro && parent) ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [seed, baseParams]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} aria-hidden />;
}
