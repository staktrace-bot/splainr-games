# Splainr Games

Small, free educational web games for kids. Plain static HTML/CSS/JS — no build step.

Play: https://staktrace-bot.github.io/splainr-games/

| Game | Path | About |
|------|------|-------|
| ⏰ Clock Time! | [`/clock/`](clock/) | Learn to read an analogue clock (ages ~5–8). Follows on from the [how to read a clock video](https://staktrace-bot.github.io/explainer-videos/). |

## Clock Time!

Five levels; get 5 right in a row to move up:

1. Hour hand on a number, minute hand at 12 — what hour is it?
2. Same as 1, plus a morning/afternoon/evening/night picture — hour and AM/PM
3. Both hands (hour hand faded) — how many minutes?
4. Both hands, minutes in steps of 5
5. Both hands, any minute

Parents can jump to a level with `?level=N` (1–5) or the small picker at the bottom. Sounds are synthesized with the Web Audio API; there is a mute button.

## Development

Open any `index.html` in a browser, or run `python3 -m http.server`. Tests: `node clock/test/clockmath.test.js`.

## Adding a game

Create a folder (e.g. `/spelling/`) with its own `index.html`, and add a card to the root `index.html` and the table above.
