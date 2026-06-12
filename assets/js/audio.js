(function (window) {
  "use strict";

  // Sortie audio via AudioWorklet (thread audio dédié).
  // Pourquoi : le ScriptProcessor de gbajs tourne sur le thread principal,
  // déjà occupé par l'émulation → callbacks en retard → craquements.
  // Le worklet rejoue les échantillons poussés par l'émulateur avec :
  // - un contrôle de débit (±0,5 %) : l'horloge de l'émulateur (calée sur
  //   l'écran) et l'horloge audio divergent légèrement ; sans correction le
  //   tampon déborde ou se vide toutes les ~30 s → saut ou coupure audible ;
  // - un amorçage : après une coupure, on attend ~60 ms de réserve avant de
  //   reprendre, au lieu d'enchaîner micro-coupures et reprises ;
  // - un passe-bas 2 pôles à 8 kHz : la musique GBA (mixée à ~13 kHz puis
  //   recopiée à 32 kHz sans interpolation) produit un aliasing métallique
  //   que le filtre adoucit, comme la sortie analogique de la vraie console ;
  // - un fondu doux vers le silence quand il n'y a plus rien à jouer.

  const state = window.Valdoria.state;

  const WORKLET_CODE = `
class ValdoriaAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.N = 1 << 16;
    this.bufL = new Float32Array(this.N);
    this.bufR = new Float32Array(this.N);
    this.w = 0;          // position d'écriture (entière)
    this.r = 0;          // position de lecture (fractionnaire)
    this.inRate = 32768; // taux d'échantillonnage GBA
    this.lastL = 0;
    this.lastR = 0;
    this.primed = false;
    // passe-bas 2 pôles à 8 kHz (états L1, L2, R1, R2)
    this.lpA = 1 - Math.exp(-2 * Math.PI * 8000 / sampleRate);
    this.f0 = 0; this.f1 = 0; this.f2 = 0; this.f3 = 0;
    this.port.onmessage = e => {
      const d = e.data;
      if (d.rate) { this.inRate = d.rate; return; }
      const l = d.l, r = d.r;
      for (let i = 0; i < l.length; i++) {
        this.bufL[this.w % this.N] = l[i];
        this.bufR[this.w % this.N] = r[i];
        this.w++;
      }
      // garde-fou : si vraiment trop d'avance s'accumule, on resaute à la cible
      if (this.w - this.r > this.inRate * 0.35) this.r = this.w - this.inRate * 0.15;
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const cible = this.inRate * 0.15;         // ~150 ms de réserve visée
    if (!this.primed) {
      if (this.w - this.r >= cible * 0.5) this.primed = true;
      else {
        for (let i = 0; i < L.length; i++) {
          this.lastL *= 0.97; this.lastR *= 0.97;
          L[i] = this.lastL; R[i] = this.lastR;
        }
        return true;
      }
    }
    // contrôle de débit : on lit plus ou moins vite pour rester autour de
    // la réserve cible. Plage asymétrique : on accepte de ralentir un peu
    // plus (-1,5 %, à peine audible) qu'accélérer, car le risque principal
    // est le tampon qui se vide quand le téléphone rame.
    const ecart = (this.w - this.r - cible) / cible;
    const correction = Math.max(-0.015, Math.min(0.01, ecart * 0.02));
    const step = (this.inRate / sampleRate) * (1 + correction);
    const a = this.lpA;
    for (let i = 0; i < L.length; i++) {
      let l, r;
      if (this.r + 1 < this.w) {
        const i0 = Math.floor(this.r), t = this.r - i0;
        const p = i0 % this.N, q = (i0 + 1) % this.N;
        l = this.bufL[p] * (1 - t) + this.bufL[q] * t;
        r = this.bufR[p] * (1 - t) + this.bufR[q] * t;
        this.r += step;
      } else {
        this.primed = false;                  // plus rien : on réamorcera
        l = this.lastL * 0.97;
        r = this.lastR * 0.97;
      }
      this.f0 += a * (l - this.f0);
      this.f1 += a * (this.f0 - this.f1);
      this.f2 += a * (r - this.f2);
      this.f3 += a * (this.f2 - this.f3);
      this.lastL = L[i] = this.f1;
      this.lastR = R[i] = this.f3;
    }
    return true;
  }
}
registerProcessor("valdoria-audio", ValdoriaAudioProcessor);
`;

  async function setup(gba) {
    const audio = gba.audio;
    if (!audio || !audio.context || !audio.context.audioWorklet) return false;
    const ctx = audio.context;
    try {
      if (!ctx.__valdoriaWorklet) {
        const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        ctx.__valdoriaWorklet = true;
      }
      if (state.audioNode) { try { state.audioNode.disconnect(); } catch (e) {} }
      const node = new AudioWorkletNode(ctx, "valdoria-audio", { outputChannelCount: [2] });
      node.connect(ctx.destination);
      node.port.postMessage({ rate: 32768 });
      state.audioNode = node;
      state.audioLastPtr = 0;
      // neutralise la sortie d'origine (ScriptProcessor) : le worklet la remplace
      try { audio.jsAudio.disconnect(); } catch (e) { /* pas encore connecté */ }
      audio.jsAudio = { connect() {}, disconnect() {} };
      return true;
    } catch (error) {
      console.warn("[audio] worklet indisponible, sortie d'origine conservée", error);
      return false;
    }
  }

  // À appeler après chaque frame émulée : pousse les nouveaux échantillons
  // du tampon circulaire de gbajs vers le worklet.
  function pump(gba) {
    const audio = gba.audio;
    const node = state.audioNode;
    if (!node || !audio || !audio.buffers) return;
    const sp = audio.samplePointer;
    if (!audio.masterEnable || !audio.enabled) { state.audioLastPtr = sp; return; }
    const n = (sp - state.audioLastPtr) & audio.sampleMask;
    if (n <= 0 || n > 8192) { state.audioLastPtr = sp; return; }
    const l = new Float32Array(n), r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = (state.audioLastPtr + i) & audio.sampleMask;
      l[i] = audio.buffers[0][idx];
      r[i] = audio.buffers[1][idx];
    }
    node.port.postMessage({ l, r }, [l.buffer, r.buffer]);
    state.audioLastPtr = sp;
  }

  window.Valdoria.audio = { setup, pump };
})(window);
