# 👥 Benutzer für das Ticketsystem einrichten

Es gibt **drei Möglichkeiten**, neue Benutzer für das Ticketsystem zu erstellen:

---

## 📱 **Methode 1: iOS-App (Empfohlen)**

### Voraussetzungen:
- Als **Admin** in der iOS-App angemeldet (z.B. `admin@facilitymaster.de` / `admin123`)

### Schritte:
1. Öffnen Sie die **FacilityMaster iOS-App**
2. Wechseln Sie zum Tab **"Admin"** (nur für Admins sichtbar)
3. Tippen Sie auf **"Benutzerverwaltung"**
4. Tippen Sie auf das **"+"** Symbol (oben rechts)
5. Füllen Sie das Formular aus:
   - **Persönliche Daten:**
     - Vorname
     - Nachname
     - E-Mail (muss eindeutig sein)
     - Passwort
     - Telefonnummer (optional)
   
   - **Rolle & Berechtigungen:**
     - Rolle: `USER`, `TECHNICIAN` oder `ADMIN`
     - "Ist Techniker" (Toggle)
     - "Account aktiv" (Toggle)
   
   - **Projekt-Zuordnung:**
     - Wählen Sie ein oder mehrere Projekte aus
     - Zugriffslevel: `READ`, `WRITE` oder `ADMIN`
     - Benutzertyp: `Contact`, `Technician`, `Manager`, `Admin` oder `Guest`
6. Tippen Sie auf **"Speichern"**

Der Benutzer wird sofort erstellt und kann sich mit den angegebenen Credentials anmelden.

---

## 🌐 **Methode 2: PWA (Web-Interface)**

### Voraussetzungen:
- Als **Admin** in der PWA angemeldet
- PWA läuft auf `http://localhost:5173`

### Schritte:
1. Öffnen Sie die **PWA** im Browser
2. Klicken Sie auf **"Admin"** im Header-Menü
3. Wählen Sie **"Benutzerverwaltung"**
4. Klicken Sie auf **"+ Neuer Benutzer"**
5. Füllen Sie das Formular aus (ähnlich wie in der iOS-App)
6. Klicken Sie auf **"Speichern"**

---

## 💻 **Methode 3: Backend (Kommandozeile)**

### Voraussetzungen:
- Node.js installiert
- Backend läuft oder Datenbank ist erreichbar
- Terminal-Zugriff

### Einfacher Benutzer erstellen:

```bash
cd facility-master-api
npm run create:user Max Mustermann max@example.com passwort123
```

### Techniker mit Projekt-Zuordnung:

```bash
# Zuerst Projekt-ID ermitteln (z.B. über die App oder Datenbank)
npm run create:user Peter Techniker peter@example.com passwort123 \
  --role TECHNICIAN \
  --technician \
  --project <project-uuid> \
  --access WRITE \
  --type Technician
```

### Admin-Benutzer:

```bash
npm run create:user Admin User admin2@example.com admin123 \
  --role ADMIN \
  --access ADMIN \
  --type Admin
```

### Alle Optionen:

```bash
npm run create:user <firstName> <lastName> <email> <password> [options]

Optionen:
  --phone <number>              Telefonnummer
  --role <ROLE>                 Rolle: USER, TECHNICIAN, ADMIN (Standard: USER)
  --technician                  Als Techniker markieren
  --project <projectId>         Projekt-ID zuweisen (kann mehrfach verwendet werden)
  --access <LEVEL>              Zugriffslevel: READ, WRITE, ADMIN (Standard: READ)
  --type <TYPE>                 Benutzertyp: Contact, Technician, Manager, Admin (Standard: Contact)
```

### Beispiel mit mehreren Projekten:

```bash
npm run create:user Maria Manager maria@example.com passwort123 \
  --role TECHNICIAN \
  --technician \
  --project <project-uuid-1> \
  --project <project-uuid-2> \
  --access WRITE \
  --type Manager
```

---

## 🔐 **Standard-Login-Daten (Demo)**

Für die Entwicklung stehen folgende Demo-Accounts zur Verfügung:

### Admin-Account
```
E-Mail:    admin@facilitymaster.de
Passwort:  admin123
Rolle:     Administrator (voller Zugriff)
```

### Techniker-Account
```
E-Mail:    techniker@facilitymaster.de
Passwort:  tech123
Rolle:     Techniker (eingeschränkter Zugriff)
```

### Standard-User
```
E-Mail:    user@facilitymaster.de
Passwort:  user123
Rolle:     Benutzer (Basis-Zugriff)
```

---

## 📋 **Benutzer-Rollen & Berechtigungen**

### **USER** (Standard-Benutzer)
- Kann eigene Tickets erstellen
- Kann eigene Tickets ansehen
- Eingeschränkter Zugriff

### **TECHNICIAN** (Techniker)
- Kann Tickets erstellen und bearbeiten
- Kann Tickets zugewiesen bekommen
- Kann Tickets in zugewiesenen Projekten ansehen
- Kann nicht alle Tickets sehen

### **ADMIN** (Administrator)
- Vollzugriff auf alle Funktionen
- Kann Benutzer verwalten
- Kann Projekte verwalten
- Kann alle Tickets sehen und verwalten

---

## 🎯 **Projekt-Zuordnung**

Jeder Benutzer kann **einem oder mehreren Projekten** zugeordnet werden:

- **READ**: Kann Tickets nur ansehen
- **WRITE**: Kann Tickets erstellen und bearbeiten
- **ADMIN**: Vollzugriff auf das Projekt

**Benutzertypen:**
- **Contact**: Standard-Kontakt, kann Tickets erstellen
- **Technician**: Techniker, kann Tickets zugewiesen bekommen
- **Manager**: Manager, erweiterte Berechtigungen
- **Admin**: Projekt-Administrator
- **Guest**: Gast, eingeschränkter Zugriff

---

## ⚠️ **Wichtige Hinweise**

1. **E-Mail muss eindeutig sein**: Jede E-Mail-Adresse kann nur einmal verwendet werden
2. **Passwort-Sicherheit**: Verwenden Sie starke Passwörter in der Produktion
3. **Projekt-Zuordnung**: Benutzer ohne Projekt-Zuordnung können sich nicht anmelden
4. **Account aktivieren**: Inaktive Accounts können sich nicht anmelden

---

## 🔧 **Troubleshooting**

### Benutzer kann sich nicht anmelden:
- ✅ Prüfen Sie, ob der Account aktiv ist (`isActive: true`)
- ✅ Prüfen Sie, ob der Benutzer einem Projekt zugeordnet ist
- ✅ Prüfen Sie, ob E-Mail und Passwort korrekt sind

### Passwort zurücksetzen:
```bash
npm run reset:password <email> <neues-passwort>
```

### Benutzer zu Projekt hinzufügen:
- Über die iOS-App: Benutzer bearbeiten → Projekt auswählen
- Über die PWA: Benutzer bearbeiten → Projekt auswählen
- Über die API: `POST /api/v1/users/:id/projects/:projectId`

---

**Status:** ✅ Alle Methoden funktionsfähig

**Empfohlene Methode:** iOS-App (einfachste und benutzerfreundlichste Option)








