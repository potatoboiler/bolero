import { initStrudel, cat, sequence, sound, chord, freq, note, samples, hush, n, stack } from "@strudel/web"


export default function BoleroApp() {
    initStrudel();
    samples('github:tidalcycles/dirt-samples')
    // samples('github:tidalcycles/clean-samples')
    const tick1 = sound(`[sd sd*3]`);
    const tick2 = sound(`[sd sd]`);
    const tick3 = sound(`[sd *6]`);

    const beat1 = note(`[[c3, g3] ~]`) 
    const beat2 = note(`[[g3, g4] ~]`)
    const beat3 = note(`[[g2, g3] ~]`)
    const beat33 = note(`[[g2, g3] ~] ~ g3 ~`)

    const melody = sequence();

    // this only randomly plays correctly. concatenating sequences as in `cat(cat(tick1, tick1, tick1), cat(tick1, tick1, tick3))`, causes random ordering? 
    // also, two seconds to a cycle. not one?
    const snare = cat(tick1, tick1, tick2, tick1, tick1, tick3).fast(2)
    const accompaniment = cat(beat1, beat2, beat3, beat1, beat2, beat33).fast(2) // note() is not the same thing as n(). n() fails
    const pattern = stack(snare, accompaniment)

    const _ = new (window.AudioContext)();
    const playPattern = () => {
        pattern.play();
    };

    const stopPattern = () => {
        hush();
    }

    return <>
        <h1>YOUR MOMMMMM</h1>
        <div>
            <button onClick={playPattern}>Play</button>
            <button onClick={stopPattern}>Stop</button>
        </div>
    </>
}