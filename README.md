# BalanceOS

Eine vollständig lokale Health-Tracking App für iOS und Android.

## Features
- 🍎 Ernährungstracking mit KI-Schätzung (OpenAI)
- 🏃 Sport & Schritte tracking
- 💤 Schlaf & Vitaldaten
- 💰 Finanztracking
- ⌚ FitBit Integration
- 📱 100% Offline - alle Daten lokal in SQLite

## Tech Stack
- React Native / Expo
- TypeScript
- SQLite (expo-sqlite)
- OpenAI API (gpt-4o-mini)
- FitBit API

## Installation

```bash
cd frontend
yarn install
npx expo start
```

## Entwicklung
Die App ist vollständig lokal - es gibt kein Backend. Alle Daten werden in einer SQLite-Datenbank auf dem Gerät gespeichert.
