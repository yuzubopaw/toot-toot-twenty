# Toot-Toot & Jump-Jump

One page, two kindergarten games. A child taps a picture to choose.

- **Toot-Toot** — addition, counting to 50, and ordering days.
- **Jump-Jump** — counting from 1 to 10 with hopping bunnies. Pink meadow, for a K1 child.

## Play on the web

Open this link on an iPad or any phone/computer (no Mac server needed):

**https://yuzubopaw.github.io/toot-toot-twenty/**

The first page is named Toot-Toot & Jump-Jump. Toot-Toot lives at `ttt/`. Jump-Jump lives at `jjb/`. Each game keeps its own save on the iPad.

## Play on this computer

```bash
npm install
npm test
npm run build
npm run preview
```

Open the URL Vite prints (usually `http://localhost:4173`). That page is the chooser.

To work on one game alone:

- Toot-Toot: `npm run dev` (usually `http://localhost:5173`)
- Jump-Jump: `npm run dev:jjb` (usually `http://localhost:5174`)

## Jump-Jump Bunny

Count from 1 to 10. Three meadows are open on a new save:

1. **How many** — tap Hop once for each bunny, then tap the number.
2. **Hop to** — a big number is showing. Hop that many, then tap Done.
3. **What next** — bunnies sit on 1, 2, 3… Which number comes next?

Five hops finish a visit, then the bunnies parade. A miss tries again, then counts with you. There is no red X and no timer. Home goes back to the bunny title. The train-and-bunny button on that title returns to the chooser.

Grown-ups: Settings, then hold the flower for 3 seconds to reset. Mute is the speaker button.

## Toot-Toot Twenty

A colorful kindergarten math game for 5-year-olds. Play in **iPad Safari** or a desktop browser.

Sunny Station: two trains of animal friends arrive. Couple them, count, tap how many ride together. The first map already has **Garden Siding** (add), **Tally Track** (count up to 50), and **Date Depot** (put days in order up to 31). Extra addition stations unlock along the line.

## Play on an iPad (same home Wi‑Fi)

1. On this Mac, run `npm run build` and then `npm run preview` (it uses `--host`).
2. Look for a Network URL like `http://192.168.x.x:4173`.
3. On the iPad, open **Safari** and type that address.
4. Tap the train or the bunny. Inside a game, tap **Tap to play**.

The iPad and the Mac must be on the **same home network**. Do not use `localhost` on the iPad — that is the iPad itself, not the Mac.

This LAN URL is for your household only. Vite is not password-protected.

## How to play

1. Tap **Tap to play**.
2. The first map shows three open stations: **Garden Siding** (add), **Tally Track** (count), and **Date Depot** (order days). Tap one.
3. On Garden Siding, tap the green **Toot** lever to couple the trains.
4. Count the animals if you like, then tap the big number.
5. Six problems make a trip. Then a parade!

**Grown-ups:** Settings (gear) → hold the sun 3 seconds → unlock all stations or reset.

Mute is the speaker button. There is no App Store install yet — it is a web page.

## Requirements

- Node 20+
- iPadOS 16+ / Safari 16+ for the iPad
