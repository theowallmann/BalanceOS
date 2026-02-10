# HealthMate App - Product Requirements Document

## Original Problem Statement
Der Benutzer möchte eine vollständig lokale Health-Tracking App. Die App soll alle Daten lokal in einer SQLite-Datenbank speichern statt über ein externes Backend. Nach erfolgreicher SQLite-Migration sollen die KI-Features über den persönlichen ChatGPT API Key des Benutzers laufen.

## User Personas
- Gesundheitsbewusste Benutzer, die ihre Ernährung, Sport und Vitaldaten tracken möchten
- Benutzer, die Datenschutz priorisieren und ihre Daten lokal behalten wollen
- Fitness-Enthusiasten mit verschiedenen Zielen (Abnehmen, Muskelaufbau, gesunder Lebensstil)

## Core Requirements
1. **Lokale Datenpersistenz**: Alle Daten werden lokal in SQLite gespeichert
2. **Kein externes Backend**: App funktioniert vollständig offline
3. **KI-Integration**: ChatGPT API für Ernährungsschätzungen und Trainingsvorschläge (via User's API Key)

## Tech Stack
- **Framework**: React Native mit Expo
- **Sprache**: TypeScript
- **Routing**: Expo File-based Routing
- **Datenbank**: SQLite via `expo-sqlite`
- **State Management**: Zustand
- **UI**: Custom Components mit Dark Theme

## Features Implemented

### Nutrition Tracking
- Tägliche Mahlzeiten erfassen mit Nährwertangaben
- Kalorien, Protein, Kohlenhydrate, Fett, Ballaststoffe, Zucker, Salz, Wasser
- KI-Schätzung für Nährwerte (benötigt ChatGPT API Key)
- Foto-Upload für Mahlzeiten

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
- Gesamtstatistiken
- Gewichts- und Körperfett-Entwicklung

### Profile & Settings
- Persönliche Daten (Größe, Geburtsdatum, Geschlecht)
- Nährwertziele
- Vital- und Sportziele
- Tracking-Einstellungen (was wird getrackt)
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

## What's Been Implemented (December 2025)

### SQLite Migration (COMPLETE)
- [x] Datenbank-Schema erstellt (`/app/frontend/src/database/schema.ts`)
- [x] Service-Layer für alle DB-Operationen (`/app/frontend/src/database/services.ts`)
- [x] Alle Screens migriert auf lokale Services:
  - [x] `index.tsx` (Dashboard)
  - [x] `nutrition.tsx`
  - [x] `vitals.tsx`
  - [x] `sport.tsx`
  - [x] `finance.tsx`
  - [x] `blocker.tsx`
  - [x] `profile.tsx`
  - [x] `settings.tsx`
- [x] DB-Initialisierung in `_layout.tsx`
- [x] TypeScript Compilation erfolgreich

## Prioritized Backlog

### P0 (Immediate)
- [ ] App auf echtem Gerät testen
- [ ] Runtime-Fehler debuggen falls vorhanden

### P1 (Next)
- [ ] ChatGPT API Key Integration in Settings
- [ ] KI-Ernährungsschätzung aktivieren
- [ ] KI-Trainingsvorschläge aktivieren

### P2 (Future)
- [ ] Offline-Synchronisation verbessern
- [ ] Backup/Restore Funktionalität
- [ ] Fitbit-Integration (optional)
- [ ] Apple Health/Google Fit Integration

## Files of Reference
- `/app/frontend/src/database/schema.ts` - SQLite Schema Definition
- `/app/frontend/src/database/services.ts` - Alle DB Services
- `/app/frontend/app/_layout.tsx` - Root Layout mit DB Init
- `/app/frontend/src/constants/colors.ts` - Dark Theme Colors
- `/app/frontend/src/hooks/useLanguage.ts` - Mehrsprachigkeit

## Notes
- Die App ist eine React Native/Expo Mobile App (kein Web-App)
- Backend-Server existiert noch, wird aber nicht mehr verwendet
- `dataStore.ts` ist noch auf alte API ausgerichtet, wird aber nicht mehr aktiv verwendet
- Alle Screens verwenden direkt die lokalen Services
