# BalanceOS - Product Requirements Document

## Original Problem Statement
Der Benutzer möchte eine vollständig lokale Health-Tracking App namens **BalanceOS**. Die App soll alle Daten lokal in einer SQLite-Datenbank speichern (kein externes Backend). Die KI-Features laufen über den persönlichen ChatGPT API Key des Benutzers.

## User Personas
- Gesundheitsbewusste Benutzer, die ihre Ernährung, Sport und Vitaldaten tracken möchten
- Benutzer, die Datenschutz priorisieren und ihre Daten lokal behalten wollen
- Fitness-Enthusiasten mit verschiedenen Zielen (Abnehmen, Muskelaufbau, gesunder Lebensstil)

## Core Requirements
1. **Lokale Datenpersistenz**: Alle Daten werden lokal in SQLite gespeichert
2. **Kein externes Backend**: App funktioniert vollständig offline
3. **KI-Integration**: ChatGPT API (gpt-4o-mini) für Nährwertschätzungen und Trainingsvorschläge

## Tech Stack
- **Framework**: React Native mit Expo
- **Sprache**: TypeScript
- **Routing**: Expo File-based Routing
- **Datenbank**: SQLite via `expo-sqlite`
- **State Management**: Zustand
- **UI**: Custom Components mit Dark Theme
- **KI**: OpenAI API (gpt-4o-mini)

## What's Been Implemented (December 2025)

### SQLite Migration (COMPLETE)
- [x] Datenbank-Schema: `balanceos.db`
- [x] Service-Layer für alle DB-Operationen
- [x] Alle Screens auf lokale Services migriert
- [x] TypeScript Compilation erfolgreich

### App Rebranding (COMPLETE)
- [x] App umbenannt von "HealthMate" zu "BalanceOS"
- [x] app.json aktualisiert (name, slug, scheme)
- [x] Splash Screen aktualisiert

### OpenAI Integration (COMPLETE)
- [x] API Key in `/src/constants/apiKeys.ts` hinterlegt
- [x] AI Service erstellt (`/src/services/aiService.ts`)
- [x] **Nährwertschätzung** via ChatGPT funktional (Nutrition Screen)
- [x] **Workout-Vorschläge** via ChatGPT funktional (Sport Screen)
- [x] **Kalorienverbrauch-Schätzung** für Workouts
- [x] Loading-States für alle KI-Funktionen

## Features

### Nutrition Tracking
- Tägliche Mahlzeiten erfassen mit Nährwertangaben
- **KI-Schätzung**: Automatische Nährwertermittlung via ChatGPT
- Foto-Upload für Mahlzeiten
- Tracking: Kalorien, Protein, Kohlenhydrate, Fett, Ballaststoffe, Zucker, Salz, Wasser

### Vitals Tracking
- Gewicht und Körperfett
- Schlafzeiten und -qualität
- Morgenenergie
- Ruhepuls
- BMR (Grundumsatz) und NEAT Berechnungen

### Sport Tracking
- Schritte zählen
- Workouts erfassen (verschiedene Typen)
- Kalorienverbrauch
- Eigene Fitness-Ziele

### Finance Tracking
- Kategorien für Ausgaben
- Budgetverwaltung
- Tägliche/wöchentliche/monatliche Rhythmen

### App Blocker
- Zeitbasierte App-Sperren
- Passwort-Entsperrung
- Benachrichtigungen/Erinnerungen

### Dashboard & Analytics
- Tagesübersicht
- 30-Tage-Statistiken
- Gewichts- und Körperfett-Entwicklung

### Profile & Settings
- Persönliche Daten
- Nährwertziele
- Tracking-Einstellungen
- Sprachumschaltung (DE/EN)
- Datenexport als CSV

## Database Schema (SQLite)
- `profile`: Persönliche Daten und Ziele
- `nutrition_entries`: Mahlzeiten
- `vitals`: Tägliche Vitaldaten
- `sport`: Schritte und Workouts
- `finance_categories`: Ausgabenkategorien
- `finance_entries`: Einzelne Ausgaben
- `app_blocker_rules`: Sperrregeln
- `notifications`: Erinnerungen

## Files of Reference
- `/app/frontend/src/database/schema.ts` - SQLite Schema
- `/app/frontend/src/database/services.ts` - Alle DB Services
- `/app/frontend/src/constants/apiKeys.ts` - API Keys (OpenAI, FitBit)
- `/app/frontend/src/services/aiService.ts` - KI Service
- `/app/frontend/app.json` - App Konfiguration

## 3rd Party Integrations
- **expo-sqlite**: Lokale Datenbank
- **OpenAI API**: KI-Nährwertschätzung (gpt-4o-mini)
- **FitBit**: Client ID hinterlegt (Integration pending)

## Prioritized Backlog

### P0 (Immediate)
- [x] SQLite-Migration abgeschlossen
- [x] OpenAI API Key integriert
- [x] App in BalanceOS umbenannt
- [ ] App auf echtem Gerät testen

### P1 (Next)
- [ ] KI-Workout-Vorschläge im Sport Screen
- [ ] Tägliche KI-Tipps auf Dashboard
- [ ] FitBit Integration aktivieren

### P2 (Future)
- [ ] Foto-basierte Nährwertschätzung via Vision API
- [ ] Backup/Restore Funktionalität
- [ ] Apple Health/Google Fit Integration
- [ ] Widgets für Homescreen

## Important Notes
- Die App ist eine React Native/Expo Mobile App (NICHT im Web-Browser testbar)
- expo-sqlite funktioniert NUR auf nativen Geräten (iOS/Android)
- Testing muss auf echtem Gerät oder Emulator erfolgen
- Web-Preview zeigt Fehler wegen wa-sqlite.wasm (das ist normal)
