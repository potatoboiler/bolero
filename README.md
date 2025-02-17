# `create-preact`

<h2 align="center">
  <img height="256" width="256" src="./src/assets/preact.svg">
</h2>

<h3 align="center">Get started using Preact and Vite!</h3>

## Getting Started

-   `npm run dev` - Starts a dev server at http://localhost:5173/

-   `npm run build` - Builds for production, emitting to `dist/`. Prerenders app to static HTML

-   `npm run preview` - Starts a server at http://localhost:4173/ to test production build locally


# Random notes
Strudel and Tidal don't really overlap - they are the same technology in parallel implementations.
So there will not be feature parity. 
[Issue that tracks implemented features.](https://github.com/tidalcycles/strudel/issues/31)

There is a learning experience in returning to Tidal to learn both Haskell and Tidal. 
Composition ideas? But I doubt you can get very far in interesting composition because of the patternistic generation.
Unless... you imposed an algebraic structure on it? Possible to combine CCCategories?

- Samples do not come preloaded (should've guessed that one...).
- Replication of a bracketed pattern (/ sequence?) does not replicate the entire pattern but each individual element in the array? This is not clear, because THIS IS NOT DOCUMENTED BEHAVIOR IN STRUDEL.
`!` and `*` are not the same thing, even though they both multiply an event by a certain factor and try to fit them.. all into a single (or multiple?) cycles?

`npx [command name] [argument]` with the error "npm could not determine which executable to run" suggests that the executable is not installed.

Vite pre-rendering breaks with `initStrudel()` as you cannot assign the `initStrudel` property of the window before you render the window.
Worth looking into as a future issue, perhaps you can follow [this link](https://stackoverflow.com/questions/24700361/window-is-not-defined-on-prerender).