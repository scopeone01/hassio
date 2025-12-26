# 🚀 Quick Start - PWA Anmeldung

## Schritt 1: Backend starten

```bash
cd facility-master-api

# 1. Datenbank starten (Docker)
docker run --name facility-postgres \
  -e POSTGRES_DB=facility_master \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:14

# 2. .env Datei erstellen (falls nicht vorhanden)
# Siehe SETUP.md für Details

# 3. Datenbank-Migrationen ausführen
npm run migrate

# 4. Initiale User erstellen
npm run seed:users

# 5. Server starten
npm run dev
```

## Schritt 2: PWA starten

```bash
cd facility-master-pwa
npm install
npm run dev
```

## Schritt 3: Anmelden

1. Öffne http://localhost:5173 im Browser
2. Verwende einen der folgenden Accounts:

### Admin (voller Zugriff)
- **E-Mail:** `admin@facilitymaster.de`
- **Passwort:** `admin123`

### Techniker
- **E-Mail:** `techniker@facilitymaster.de`
- **Passwort:** `tech123`

### Standard-User
- **E-Mail:** `user@facilitymaster.de`
- **Passwort:** `user123`

## Nach dem Login

- Bei **einem Projekt**: Automatische Weiterleitung zum Dashboard
- Bei **mehreren Projekten**: Projekt-Auswahl wird angezeigt
- **Admins** sehen zusätzlich Admin-Menüpunkte in der Navigation

## Neue User erstellen

Nach dem Login als Admin:
1. Klicke auf "Benutzer" in der Navigation
2. Klicke auf "+ Neuer Benutzer"
3. Fülle das Formular aus
4. Weise dem User Projekte zu

## Probleme?

- **"Ungültige Anmeldedaten"**: Stelle sicher, dass `npm run seed:users` ausgeführt wurde
- **"Kein Projekt zugewiesen"**: Erstelle ein Projekt über "Projekte verwalten" im Admin-Menü
- **Backend-Fehler**: Prüfe ob PostgreSQL läuft: `docker ps`








