import type { CsoundObj } from '@csound/browser';
import { getFrequencyFromValue } from '@strudel/web';
import { generateRandomCsoundPatch } from './csound-generator';
import type { SynthPlugin } from './types';

export const DEFAULT_CSOUND_ORC = `
0dbfs = 1

instr 1
  iFreq   = p4
  iAmp    = p5
  iCutoff = p6

  aEnv  madsr 0.02, 0.12, 0.65, 0.18
  aOsc1 vco2 iAmp * 0.5, iFreq, 0
  aOsc2 vco2 iAmp * 0.5, iFreq * 1.003, 10
  aMix  = (aOsc1 + aOsc2) * aEnv
  aFilt moogladder aMix, limit(iCutoff, 80, 16000), 0.25
  aOut  = tanh(aFilt)
  outs aOut, aOut
endin
`;

function parseCsoundScoreLine(
	ctx: AudioContext,
	time: number,
	value: Record<string, unknown>,
	duration?: number,
): string {
	const delay = Math.max(0, time - ctx.currentTime);
	const dur = Number(duration ?? value.duration ?? 0.5);
	const freq = Number(getFrequencyFromValue(value) ?? value.freq ?? 440);
	const gain = Number(value.gain ?? 0.3);
	const cutoff = Number(value.cutoff ?? 1800);

	return [
		'i 1',
		delay.toFixed(4),
		(Number.isFinite(dur) && dur > 0 ? dur : 0.5).toFixed(4),
		(Number.isFinite(freq) && freq > 0 ? freq : 440).toFixed(2),
		(Number.isFinite(gain) ? gain : 0.3).toFixed(3),
		(Number.isFinite(cutoff) ? cutoff : 1800).toFixed(1),
	].join(' ');
}

export class CsoundSynthPlugin implements SynthPlugin {
	readonly name = 'csound';
	readonly label = 'Csound (WASM)';
	readonly routing = 'persistent-engine' as const;

	private instance: CsoundObj | null = null;
	private currentOrc = DEFAULT_CSOUND_ORC;
	private currentDescription = 'Default Dual-VCO';
	private lastMelodyCycle: number | null = null;
	private readonly listeners = new Set<(description: string) => void>();

	async load(ctx: AudioContext): Promise<void> {
		if (this.instance) {
			return;
		}

		const { Csound } = await import('@csound/browser');
		const csound = await Csound({
			audioContext: ctx,
			useWorker: false,
			autoConnect: true,
		});

		await csound.setOption('-odac');
		await csound.compileOrc(this.currentOrc);
		await csound.start();
		this.instance = csound;
	}

	applyToPattern(pattern: any): any {
		return pattern.sound(this.name).gain(0.35);
	}

	getDescription(): string {
		return this.currentDescription;
	}

	onPatchChange(listener: (description: string) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async randomizePatch(): Promise<string> {
		const patch = generateRandomCsoundPatch();
		this.currentDescription = patch.description;
		await this.updateSource(patch.orc);
		for (const listener of this.listeners) {
			listener(this.currentDescription);
		}
		return this.currentDescription;
	}

	async trigger(
		ctx: AudioContext,
		time: number,
		value: Record<string, unknown>,
		_onended: () => void,
		duration?: number,
	): Promise<void> {
		if (!this.instance) {
			return;
		}

		const cycle = typeof value.melodyCycle === 'number' ? value.melodyCycle : null;
		if (cycle !== null && cycle !== this.lastMelodyCycle) {
			this.lastMelodyCycle = cycle;
			await this.randomizePatch();
		}

		void this.instance.inputMessage(parseCsoundScoreLine(ctx, time, value, duration));
	}

	async updateSource(orc: string): Promise<void> {
		this.currentOrc = orc;
		if (this.instance) {
			await this.instance.compileOrc(orc);
		}
	}

	async [Symbol.asyncDispose](): Promise<void> {
		if (this.instance) {
			await this.instance.destroy();
			this.instance = null;
		}
		this.lastMelodyCycle = null;
	}
}

export const csoundSynth = new CsoundSynthPlugin();
