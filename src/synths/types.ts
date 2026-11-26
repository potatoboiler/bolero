/**
 * How a synth connects to Strudel's Web Audio graph:
 * - `'sample'`: registered externally by Strudel (e.g. via `samples(...)`).
 * - `'per-voice'`: returns a fresh `VoiceHandle` per note for `superdough` FX/mixing.
 * - `'persistent-engine'`: owns one long-lived output node and returns `void` from `trigger`.
 */
export type SynthRoutingMode = 'sample' | 'per-voice' | 'persistent-engine';

/** Per-note audio handle returned by `'per-voice'` plugins so Strudel can route and stop it. */
export interface VoiceHandle {
	node: AudioNode;
	stop: (stopTime: number) => void;
}

/** Lazy-load lifecycle state for UI controls. */
export type SynthPluginStatus = 'unloaded' | 'loading' | 'ready' | 'error';

/** Pluggable in-browser synthesizer or sample backend. */
export interface SynthPlugin {
	/** Identifier passed to `.sound(name)`. */
	readonly name: string;
	/** Human-readable name for UI controls. */
	readonly label: string;
	readonly routing: SynthRoutingMode;
	/** Lazy-initializes any WASM modules, worklets, or engine state on `ctx`. */
	load(ctx: AudioContext): Promise<void>;
	/** Applies synth-specific Strudel pattern modifiers (defaults to `.sound(name)`). */
	applyToPattern?(pattern: any): any;
	/** Schedules a note at `time` (in `AudioContext.currentTime` seconds); omit for `'sample'` backends. */
	trigger?(
		ctx: AudioContext,
		time: number,
		value: Record<string, unknown>,
		onended: () => void,
		duration?: number,
	): VoiceHandle | void | Promise<VoiceHandle | void>;
	/** Optional hook to hot-compile/reload synth definitions (e.g. Csound `.orc`). */
	updateSource?(source: string): Promise<void>;
	/** Optional async RAII teardown (`await using`) for long-lived engine instances. */
	[Symbol.asyncDispose]?(): Promise<void>;
}
