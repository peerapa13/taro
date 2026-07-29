# README for Tarot Web App

## Overview
A premium‑styled Tarot‑card reading web app that lets you draw cards, see mythic meanings, and enjoy a star‑ry background with ambient music.

## Project Structure
```
D:/dev/
├─ index.html
├─ style.css
├─ script.js
├─ cards.js
├─ assets/
│   ├─ img/          # Card images (place your own JPG/PNG files here)
│   │   └─ back.jpg   # placeholder for the back of the deck
│   └─ audio/
│       └─ ambient.mp3  # background ambience (replace with your own track)
└─ README.md
```

## Getting started
1. Open `index.html` in a browser (double‑click or `Open with` → your favorite browser).
2. Click **"หยิบไพ่"** to draw a card; the card’s name and meaning appear below.
3. Use the **Reset** button (top‑right) to reshuffle the deck.

## Customisation
- **Add more cards** – edit `cards.js` and add objects to `TAROT_CARDS` (same format as existing entries).
- **Change colours / gradients** – modify `.btn-primary` or other CSS rules in `style.css`.
- **Swap background music** – replace `assets/audio/ambient.mp3` with any MP3 you prefer (keep the same filename or edit the `<audio>` tag in `index.html`).
- **Replace card images** – put PNG/JPG files in `assets/img/` and update the `img` paths in `cards.js`.

Enjoy your mystical reading experience! ✨🔮
