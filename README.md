# Splainr Games

Small, free educational web games for kids. Plain static HTML/CSS/JS — no build step.

Play: https://staktrace-bot.github.io/splainr-games/

| Game | Path | About |
|------|------|-------|
| ⏰ Clock Time! | [`/clock/`](clock/) | Learn to read an analogue clock (ages ~5–8). Follows on from the [how to read a clock video](https://staktrace-bot.github.io/explainer-videos/). |
| 🖍️ ButtPen | [`/buttpen/`](buttpen/) | A kid-friendly Logo / turtle drawing sandbox. The character holds the pen in their butt and draws as they walk. |

## Clock Time!

Five levels; get 5 right in a row to move up:

1. Hour hand on a number, minute hand at 12 — what hour is it?
2. Same as 1, plus a morning/afternoon/evening/night picture — hour and AM/PM
3. Both hands (hour hand faded) — how many minutes?
4. Both hands, minutes in steps of 5
5. Both hands, any minute

Parents can jump to a level with `?level=N` (1–5) or the small picker at the bottom. Sounds are synthesized with the Web Audio API; there is a mute button.

## ButtPen

A Logo-style drawing language with a silly twist: pick a character (turtle, puppy, kitty, bunny, dino, robot, or unicorn) who holds the crayon in their butt and draws as they walk. You can change the character at any time without losing the drawing.

Commands (case-insensitive):

- `forward 50` / `fd` / `go`, `back 50` / `bk`
- `left` / `right` / `turn left 90` (degrees default to 90)
- `pen up` / `pen down`, `color red` (or `colour`, or `#ff00aa`), `width 4`
- `repeat 4 [ ... ]` — loops, including loops inside loops
- `to square :size ... end` then `square 50` — reusable recipes, with `+ - * /` in numbers
- `home`, `clear` / `cs`, `hide` / `show`

Tap the helper buttons (including a prominent **Repeat** button) to insert commands, or type in the editor. There’s a one-line quick command box (Enter to run, ↑ for history), Run / Step / Stop / Clear, adjustable speed, example programs (square, star, flower, house), autosave, a “Save picture” PNG download, and a **Print** button that prints just the drawing (with the character and a small “Made with ButtPen” caption) on a landscape page. Works on phones and laptops.

## Development

Open any `index.html` in a browser, or run `python3 -m http.server`. Tests:

- `node clock/test/clockmath.test.js`
- `node buttpen/test/parser.test.js && node buttpen/test/interpreter.test.js`
- Playwright (optional): `node buttpen/test/visual.js` (serves the repo and checks layouts / drawings). Pass a URL to run against a live site: `node buttpen/test/visual.js https://staktrace-bot.github.io/splainr-games/buttpen/`

## Adding a game

Create a folder (e.g. `/spelling/`) with its own `index.html`, and add a card to the root `index.html` and the table above.
