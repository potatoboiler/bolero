import { initStrudel, arrange, cat, sound, note, samples, hush, stack } from "@strudel/web"

function staccato(input_note: any) {
    return cat(input_note, note(`~`)).fast(2)
}

export default function BoleroApp() {
    initStrudel();
    samples('github:tidalcycles/dirt-samples')
    samples('github:potatoboiler/bolero')
    // samples('github:tidalcycles/clean-samples')
    const tick1 = sound(`[sd sd*3]`);
    const tick2 = sound(`[sd sd]`);
    const tick3 = sound(`[sd *6]`);

    const beat1 = note(`[[c3, g3] ~]`) 
    const beat2 = note(`[[g3, g4] ~]`)
    const beat3 = note(`[[g2, g3] ~]`)
    const beat33 = note(`[[g2, g3] ~] ~ g3 ~`)
    
    // ~ rests used for staccatos mostly
    const mb1 = note("c5@6 b4 c5 d5 c5 b4 a4")
    const mb2 = note("[c5 ~]@2 c5 a4 c5@6 b4 c5")
    const mb3 = note("a4 g4 e4 f4 g4@8")
    const mb4 = note("g4 f4 e4 d4 e4 f4 g4 a4 g4@4")
    const mb5 = note("g4@5 a4 b4 a4 g4 f4 e4 d4")
    const mb6 = note("e4 d4 c4@3 ~ c4 d4 e4 ~ f4 ~")
    const mb7 = note("d4 g4@2")
    const mb8 = note("g4@7 ~")

    const mc1 = note("d5@7 c5 b4 a4 b4 c5")
    const mc2 = note("d5 c5 b4@3 c5 b4 a4 c5 b4 a4 f4")
    const mc3 = note("f4@2 [f4 ~] [f4 ~] [f4 ~]@2 [a4 ~]@2 c5 a4 b4 g4")
    const mc4 = note("f4@2 [f4 ~] [f4 ~] [f4 ~]@2 [a4 ~]@2 b4 g4 a4 f4")
    const mc5 = note("d4 ~ d4 c4 d4@5 ~ [d4 ~] [d4 ~]")
    const mc6 = note("[d4 ~]@2 [f4 ~]@2 a4 f4 g4 e4 [d4 ~]@2 d4 c4")
    const mc7 = note("d4@5 ~ d4 c4 d4@2 e4 f4")
    const mc8 = note("g4@9 f4 e4 d4")
    const mc9 = note("c4 ~@11")
    const mc10 = note("~@12")

    // using .fast(2/3) on each of these individual sequences will cause 2/3 of the seqeunce to play, and then play 2/3 of the next sequence, and then play the remaining 1/3
    // so you need to put .fast(2/3) on the entire thing
    const melody1 = cat(mb1, mb2, mb3, mb4, mb5, mb6, mb7, mb8);
    const melody2 = cat(mc1, mc2, mc3, mc4, mc5, mc6, mc7, mc8, mc9, mc10);
    const melody = arrange([8, melody1], [10, melody2]).fast(2/3).sound("nee").speed(1/8).attack(0.6).decay(0).sustain(0).release(0);

    // this only randomly plays correctly. concatenating sequences as in `cat(cat(tick1, tick1, tick1), cat(tick1, tick1, tick3))`, causes random ordering? 
    // also, two seconds to a cycle. not one?
    const snare = cat(tick1, tick1, tick2, tick1, tick1, tick3).fast(2).gain(0.2)
    const accompaniment = cat(beat1, beat2, beat3, beat1, beat2, beat33).fast(2) // note() is not the same thing as n(). n() fails
    const pattern = stack(snare, accompaniment, melody)
    // const pattern = melody

    const _ = new (window.AudioContext)();
    const playPattern = () => {
        pattern.play();
    };

    const stopPattern = () => {
        // WHY DOESN'T THIS WORK???
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