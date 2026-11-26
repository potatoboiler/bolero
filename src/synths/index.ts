import { getAudioContext, registerSound } from '@strudel/web';
import { csoundSynth } from './csound';
import type { SynthPlugin, VoiceHandle } from './types';

// Ensure Explicit Resource Management symbols exist in older browsers.
(Symbol as { dispose?: symbol }).dispose ??= Symbol('Symbol.dispose');
(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol('Symbol.asyncDispose');

export * from './types';
export { csoundSynth, CsoundSynthPlugin, DEFAULT_CSOUND_ORC } from './csound';
export { generateRandomCsoundPatch, type GeneratedCsoundPatch } from './csound-generator';

const neeSynth: SynthPlugin = {
	name: 'nee',
	label: 'nee (Sample)',
	routing: 'sample',
	async load() {},
	applyToPattern: (pattern) =>
		pattern.sound('nee').speed(1 / 8).attack(0.6).decay(0).sustain(0).release(0),
};

export const synths = {
	nee: neeSynth,
	csound: csoundSynth,
} as const satisfies Record<string, SynthPlugin>;

export type SynthId = keyof typeof synths;
export const DEFAULT_SYNTH: SynthId = 'nee';

const loadCache = new Map<SynthId, Promise<void>>();
let registered = false;

export async function loadSynth(id: SynthId): Promise<void> {
	const existing = loadCache.get(id);
	if (existing) {
		return existing;
	}

	const promise = synths[id].load(getAudioContext() as AudioContext);
	loadCache.set(id, promise);

	try {
		await promise;
	} catch (err) {
		loadCache.delete(id);
		throw err;
	}
}

export function registerSynth(id: SynthId): void {
	const plugin: SynthPlugin = synths[id];
	const trigger = plugin.trigger?.bind(plugin);
	if (!trigger) {
		return;
	}

	registerSound(
		plugin.name,
		async (
			time: number,
			value: Record<string, unknown>,
			onended: () => void,
			duration?: number,
		): Promise<VoiceHandle | undefined> => {
			await loadSynth(id);
			const ctx = getAudioContext() as AudioContext;
			const handle = await trigger(ctx, time, value, onended, duration);
			return plugin.routing === 'persistent-engine' ? undefined : (handle ?? undefined);
		},
		{ type: 'synth', label: plugin.label },
	);
}

export function registerBuiltInSynths(): void {
	if (registered) {
		return;
	}
	registered = true;

	for (const id of Object.keys(synths) as SynthId[]) {
		registerSynth(id);
	}
}
