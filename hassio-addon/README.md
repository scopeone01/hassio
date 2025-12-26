# FacilityMaster API - Home Assistant Add-on

Backend API Server für die FacilityMaster iOS App mit MariaDB Unterstützung.

## 🚀 Features

- **RESTful API** für Facility Management
- **JWT Authentifizierung** für sichere Kommunikation
- **MariaDB Integration** über Home Assistant MariaDB Add-on
- **Automatische Migrationen** bei Start
- **Health Monitoring** mit Watchdog
- **Home Assistant Ingress** Unterstützung

## 📋 Voraussetzungen

1. **Home Assistant** (OS oder Supervised)
2. **MariaDB Add-on** installiert und konfiguriert
3. **Datenbank erstellt** für FacilityMaster

## 🔧 Installation

### 1. MariaDB Add-on installieren

Falls noch nicht vorhanden:
1. Gehe zu **Einstellungen → Add-ons → Add-on Store**
2. Suche nach "MariaDB"
3. Installiere das offizielle MariaDB Add-on
4. Starte das Add-on

### 2. Datenbank erstellen

Verbinde dich mit der MariaDB und erstelle die Datenbank:

```sql
CREATE DATABASE IF NOT EXISTS facility_master 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'facilitymaster'@'%' 
  IDENTIFIED BY 'dein_sicheres_passwort';

GRANT ALL PRIVILEGES ON facility_master.* 
  TO 'facilitymaster'@'%';

FLUSH PRIVILEGES;
```

### 3. FacilityMaster API Add-on installieren

1. Füge dieses Repository zu Home Assistant hinzu:
   - **Einstellungen → Add-ons → Add-on Store → ⋮ → Repositories**
   - URL hinzufügen: `https://github.com/scopeone/facility-master-api`

2. Installiere "FacilityMaster API"

3. Konfiguriere das Add-on (siehe unten)

4. Starte das Add-on

## ⚙️ Konfiguration

```yaml
log_level: info
database_host: core-mariadb
database_port: 3306
database_name: facility_master
database_user: facilitymaster
database_password: "dein_sicheres_passwort"
jwt_secret: "ein_sehr_langer_zufälliger_string_mindestens_32_zeichen"
jwt_expires_in: "24h"
auto_migrate: true
auto_seed_demo_data: false
```

### Optionen

| Option | Beschreibung | Standard |
|--------|-------------|----------|
| `log_level` | Log-Level (trace/debug/info/warning/error/fatal) | `info` |
| `database_host` | MariaDB Hostname | `core-mariadb` |
| `database_port` | MariaDB Port | `3306` |
| `database_name` | Datenbankname | `facility_master` |
| `database_user` | Datenbank-Benutzer | `facilitymaster` |
| `database_password` | Datenbank-Passwort | - |
| `jwt_secret` | JWT Signatur-Schlüssel (min. 32 Zeichen) | Auto-generiert |
| `jwt_expires_in` | JWT Token Gültigkeit | `24h` |
| `auto_migrate` | Automatische DB-Migrationen beim Start | `true` |
| `auto_seed_demo_data` | Demo-Daten erstellen | `false` |

## 🌐 API Endpoints

Nach dem Start ist die API erreichbar unter:
- **Lokal:** `http://homeassistant.local:3000`
- **Ingress:** Über das Home Assistant UI

### Health Check

```
GET /health
```

Gibt den Server-Status zurück.

### Authentifizierung

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@facilitymaster.de",
  "password": "admin123"
}
```

### Projekte

```
GET /api/projects          # Alle Projekte
POST /api/projects         # Neues Projekt
GET /api/projects/:id      # Projekt Details
PUT /api/projects/:id      # Projekt aktualisieren
DELETE /api/projects/:id   # Projekt löschen
```

### Tickets

```
GET /api/tickets           # Alle Tickets
POST /api/tickets          # Neues Ticket
GET /api/tickets/:id       # Ticket Details
PUT /api/tickets/:id       # Ticket aktualisieren
DELETE /api/tickets/:id    # Ticket löschen
```

## 👤 Demo-Benutzer

Wenn `auto_seed_demo_data: true` aktiviert ist:

| Email | Passwort | Rolle |
|-------|----------|-------|
| admin@facilitymaster.de | admin123 | ADMIN |
| techniker@facilitymaster.de | tech123 | TECHNICIAN |
| user@facilitymaster.de | user123 | USER |

⚠️ **Wichtig:** Ändere die Passwörter in der Produktion!

## 📱 iOS App Konfiguration

In der FacilityMaster iOS App:

1. **Server-URL:** `http://homeassistant.local` oder IP-Adresse
2. **Port:** `3000`
3. **HTTPS:** Aus (außer du hast SSL konfiguriert)

## 🔍 Troubleshooting

### Add-on startet nicht

1. Prüfe die Logs: **Einstellungen → Add-ons → FacilityMaster API → Log**
2. Stelle sicher, dass MariaDB läuft
3. Überprüfe die Datenbank-Credentials

### Verbindung zur Datenbank fehlgeschlagen

```
Error: Connection refused
```

- Prüfe, ob MariaDB gestartet ist
- Überprüfe `database_host` (sollte `core-mariadb` sein)
- Überprüfe Benutzer und Passwort

### JWT Token ungültig

- Stelle sicher, dass `jwt_secret` konfiguriert ist
- Bei Änderungen müssen sich Benutzer neu einloggen

### API antwortet nicht

1. Prüfe Health-Endpoint: `http://homeassistant.local:3000/health`
2. Überprüfe Firewall-Einstellungen
3. Stelle sicher, dass Port 3000 freigegeben ist

## 📄 Logs

Logs sind verfügbar unter:
- **Add-on Log:** Einstellungen → Add-ons → FacilityMaster API → Log
- **Container Log:** `docker logs addon_local_facilitymaster-api`

## 🛠️ Entwicklung

### Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/scopeone/facility-master-api.git
cd facility-master-api

# Dependencies installieren
npm install

# Umgebungsvariablen setzen
cp .env.example .env
# .env bearbeiten

# Server starten
npm run dev
```

### Add-on bauen

```bash
# Im hassio-addon Verzeichnis
docker build -t facilitymaster-api .
```

## 📞 Support

- **GitHub Issues:** [facility-master-api/issues](https://github.com/scopeone/facility-master-api/issues)
- **Email:** support@scopeone.de

## 📜 Lizenz

MIT License - siehe [LICENSE](LICENSE)

