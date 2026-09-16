# Toot-Toot Twenty

A colorful kindergarten math game for 5-year-olds. Play in **iPad Safari** or a desktop browser.

Sunny Station: two trains of animal friends arrive. Couple them, count, tap how many ride together. Extra stations unlock along the line, including **Tally Track** (count up to 50) and **Date Depot** (put days in order up to 31).

## Play on the web

Open this link on an iPad or any phone/computer (no Mac server needed):

**https://kmoon118.github.io/toot-toot-twenty/**

## Play on this computer

```bash
cd Math_Games
npm install
npm test
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Play on an iPad (same home Wi‑Fi)

1. On this Mac, run `npm run dev` (it already uses `--host`).
2. Look for a Network URL like `http://192.168.x.x:5173`.
3. On the iPad, open **Safari** and type that address.
4. Tap the big red engine (**Tap to play**).

The iPad and the Mac must be on the **same home network**. Do not use `localhost` on the iPad — that is the iPad itself, not the Mac.

This LAN URL is for your household only. Vite is not password-protected.

## How to play

1. Tap **Tap to play**.
2. Tap Garden Siding (the first station).
3. Tap the green **Toot** lever to couple the trains.
4. Count the animals if you like, then tap the big number.
5. Six problems make a trip. Then a parade!

**Grown-ups:** Settings (gear) → hold the sun 3 seconds → unlock all stations or reset.

Mute is the speaker button. There is no App Store install yet — it is a web page.

## Requirements

- Node 20+
- iPadOS 16+ / Safari 16+ for the iPad
