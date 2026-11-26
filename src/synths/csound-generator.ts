export interface GeneratedCsoundPatch {
	orc: string;
	description: string;
}

const randRange = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const HEADER = `
0dbfs = 1
giSine ftgen 0, 0, 4096, 10, 1
`;

function buildSubtractivePatch(): GeneratedCsoundPatch {
	const waveforms = [
		{ id: 0, name: 'saw' },
		{ id: 10, name: 'square' },
		{ id: 12, name: 'tri' },
	] as const;
	const w1 = pick(waveforms);
	const w2 = pick(waveforms);
	const detune = randRange(1.001, 1.012).toFixed(4);
	const subAmt = Math.random() > 0.45 ? randRange(0.15, 0.35).toFixed(2) : '0';
	const res = randRange(0.12, 0.55).toFixed(2);
	const envDepth = randRange(0.6, 2.2).toFixed(2);
	const atk = randRange(0.008, 0.06).toFixed(3);
	const dec = randRange(0.08, 0.28).toFixed(3);
	const sus = randRange(0.35, 0.85).toFixed(2);
	const rel = randRange(0.1, 0.35).toFixed(3);
	const vibDepth = Math.random() > 0.5 ? randRange(0.002, 0.008).toFixed(4) : '0';
	const vibRate = randRange(3.5, 6.5).toFixed(2);

	const orc = `${HEADER}
instr 1
  iFreq   = p4
  iAmp    = p5
  iCutoff = p6

  aEnv     madsr ${atk}, ${dec}, ${sus}, ${rel}
  kFiltEnv madsr ${atk}, ${dec}, 0.25, ${rel}
  kVib     lfo ${vibDepth}, ${vibRate}, 0
  kPitch   = iFreq * (1 + kVib)

  aOsc1 vco2 iAmp * 0.45, kPitch, ${w1.id}
  aOsc2 vco2 iAmp * 0.45, kPitch * ${detune}, ${w2.id}
  aSub  poscil iAmp * ${subAmt}, kPitch * 0.5, giSine
  aMix  = (aOsc1 + aOsc2 + aSub) * aEnv
  aFilt moogladder aMix, limit(iCutoff * (0.4 + kFiltEnv * ${envDepth}), 80, 16000), ${res}
  aOut  = tanh(aFilt)
  outs aOut, aOut
endin
`;

	return {
		orc,
		description: `Subtractive (${w1.name}+${w2.name}, res ${res}${subAmt !== '0' ? ', +sub' : ''})`,
	};
}

function buildFmPatch(): GeneratedCsoundPatch {
	const ratios = [
		[1, 1],
		[1, 2],
		[1, 3],
		[2, 1],
		[2, 3],
		[1, 1.414],
		[1, 2.756],
	] as const;
	const [car, mod] = pick(ratios);
	const baseNdx = randRange(0.2, 1.2).toFixed(2);
	const envNdx = randRange(1.0, 4.5).toFixed(2);
	const atk = randRange(0.005, 0.04).toFixed(3);
	const dec = randRange(0.08, 0.32).toFixed(3);
	const sus = randRange(0.25, 0.75).toFixed(2);
	const rel = randRange(0.12, 0.4).toFixed(3);

	const orc = `${HEADER}
instr 1
  iFreq   = p4
  iAmp    = p5
  iCutoff = p6

  aEnv    madsr ${atk}, ${dec}, ${sus}, ${rel}
  kModEnv madsr ${atk}, ${dec}, 0.15, ${rel}
  kNdx    = ${baseNdx} + (kModEnv * ${envNdx})

  aSig  foscili iAmp * 0.85, iFreq, ${car}, ${mod}, kNdx, giSine
  aFilt butterlp aSig * aEnv, limit(iCutoff, 120, 16000)
  aOut  = tanh(aFilt)
  outs aOut, aOut
endin
`;

	return {
		orc,
		description: `FM (${car}:${mod}, idx ${baseNdx}→${(Number(baseNdx) + Number(envNdx)).toFixed(1)})`,
	};
}

function buildAdditivePatch(): GeneratedCsoundPatch {
	const rolloff = randRange(1.05, 2.15);
	const oddBias = randRange(0.35, 1.0);
	const inharm = Math.random() > 0.55 ? randRange(0.0008, 0.006) : 0;
	const atk = randRange(0.01, 0.07).toFixed(3);
	const dec = randRange(0.1, 0.35).toFixed(3);
	const sus = randRange(0.35, 0.8).toFixed(2);
	const rel = randRange(0.12, 0.45);

	const partialCount = 6;
	const lines: string[] = [];
	const terms: string[] = [];

	for (let k = 1; k <= partialCount; k++) {
		const weight = (k % 2 === 1 ? 1 : oddBias) / Math.pow(k, rolloff);
		const freqRatio = k * Math.sqrt(1 + inharm * k * k);
		const pDec = (Number(dec) / (1 + 0.3 * (k - 1))).toFixed(3);
		const pRel = (rel / (1 + 0.25 * (k - 1))).toFixed(3);
		lines.push(
			`  aEnv${k} madsr ${atk}, ${pDec}, ${sus}, ${pRel}`,
			`  aP${k}   poscil iAmp * ${weight.toFixed(4)}, iFreq * ${freqRatio.toFixed(4)}, giSine`,
		);
		terms.push(`(aP${k} * aEnv${k})`);
	}

	const orc = `${HEADER}
instr 1
  iFreq   = p4
  iAmp    = p5
  iCutoff = p6

${lines.join('\n')}
  aSum  = (${terms.join(' + ')}) * 0.65
  aFilt butterlp aSum, limit(iCutoff, 120, 16000)
  aOut  = tanh(aFilt)
  outs aOut, aOut
endin
`;

	return {
		orc,
		description: `Additive (rolloff ${rolloff.toFixed(2)}${inharm > 0 ? ', stretched' : ''})`,
	};
}

function buildModalPatch(): GeneratedCsoundPatch {
	const ratioSets = [
		{ name: 'wood', ratios: [1, 2.0, 3.0, 4.02, 5.1], q: [28, 35, 42, 48, 55] },
		{ name: 'bell', ratios: [1, 2.0, 2.76, 4.07, 5.4], q: [45, 55, 65, 75, 85] },
		{ name: 'glass', ratios: [1, 1.5, 2.32, 3.18, 4.4], q: [35, 45, 55, 65, 75] },
	] as const;
	const preset = pick(ratioSets);
	const qScale = randRange(0.75, 1.35);
	const pluckMix = randRange(0.25, 0.55).toFixed(2);
	const rel = randRange(0.15, 0.45).toFixed(3);

	const modeLines = preset.ratios.map((r, idx) => {
		const q = (preset.q[idx] * qScale).toFixed(1);
		const w = (1 / (idx + 1)).toFixed(3);
		return `  aM${idx + 1} mode aExc, limit(iFreq * ${r}, 40, 16000), ${q}\n  aRes${idx + 1} = aM${idx + 1} * ${w}`;
	});
	const sumExpr = preset.ratios.map((_, idx) => `aRes${idx + 1}`).join(' + ');

	const orc = `${HEADER}
instr 1
  iFreq   = p4
  iAmp    = p5
  iCutoff = p6

  aImp  linseg 1, 0.008, 0, 1, 0
  aNoi  rand iAmp * 0.5
  aExc  = aNoi * aImp
${modeLines.join('\n')}
  aPlk  pluck iAmp * ${pluckMix}, iFreq, iFreq, 0, 1
  aEnv  madsr 0.004, 0.18, 0.35, ${rel}
  aMix  = ((${sumExpr}) * 0.25 + aPlk * aEnv)
  aFilt butterlp aMix, limit(iCutoff, 120, 16000)
  aOut  = tanh(aFilt)
  outs aOut, aOut
endin
`;

	return {
		orc,
		description: `Modal/Pluck (${preset.name})`,
	};
}

const GENERATORS = [
	buildSubtractivePatch,
	buildFmPatch,
	buildAdditivePatch,
	buildModalPatch,
] as const;

/** Generates a random, speaker-safe Csound 7 instrument implementing `instr 1 (p4=freq, p5=amp, p6=cutoff)`. */
export function generateRandomCsoundPatch(): GeneratedCsoundPatch {
	return pick(GENERATORS)();
}
