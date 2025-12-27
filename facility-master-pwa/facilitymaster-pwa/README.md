# FacilityMaster PWA - Home Assistant Add-on

Progressive Web App für externe Ticketerstellung im FacilityMaster System.

## Installation

1. **Add-on installieren**
   - Fügen Sie dieses Repository zu Ihren Home Assistant Add-on Repositories hinzu
   - Suchen Sie nach "FacilityMaster PWA" in der Add-on Liste
   - Klicken Sie auf "Install"

2. **Add-on starten**
   - Klicken Sie auf "Start"
   - Warten Sie, bis der Status "Running" anzeigt
   - Das Add-on läuft nun auf Port 8080

3. **Zugriff auf die PWA**
   - Öffnen Sie im Browser: `http://YOUR_HOME_ASSISTANT_IP:8080`
   - Für externen Zugriff: Konfigurieren Sie Nginx Proxy Manager (siehe unten)

## Konfiguration

### API-Server Verbindung

Die API-Server URL wird **in der PWA selbst** konfiguriert, nicht in der Add-on Konfiguration:

1. Öffnen Sie die PWA im Browser
2. Melden Sie sich an
3. Navigieren Sie zu **Einstellungen**
4. Geben Sie die API-Server URL ein (z.B. `http://192.168.178.134:3000/api/v1`)
5. Klicken Sie auf **Verbindung testen**
6. Bei Erfolg: **Speichern** klicken

**Standard-URL**: `http://192.168.178.134:3000/api/v1`

### Nginx Proxy Manager Setup (Empfohlen für externen Zugriff)

1. **Öffnen Sie Nginx Proxy Manager**

2. **Erstellen Sie einen neuen Proxy Host**:
   - Domain: `facility.local` (oder Ihre gewünschte Domain)
   - Scheme: `http`
   - Forward Hostname/IP: `192.168.178.134` (Ihre Home Assistant IP)
   - Forward Port: `8080`
   - Cache Assets: Aktiviert
   - Block Common Exploits: Aktiviert
   - Websockets Support: Aktiviert

3. **SSL-Zertifikat (Optional)**:
   - Tab "SSL" öffnen
   - Let's Encrypt Zertifikat anfordern (wenn öffentliche Domain)
   - Oder selbst-signiertes Zertifikat nutzen (für lokales Netzwerk)

4. **Zugriff testen**:
   - Öffnen Sie `http://facility.local` (oder Ihre konfigurierte Domain)
   - PWA sollte laden und erreichbar sein

## Features

- **Offline-fähig**: Funktioniert auch ohne Internet-Verbindung
- **Installierbar**: Als App auf Smartphone/Desktop installierbar
- **Responsive**: Optimiert für alle Bildschirmgrößen
- **Sicher**: JWT-basierte Authentifizierung
- **Flexibel**: API-URL kann jederzeit in den Einstellungen geändert werden

## Port-Konfiguration

- **PWA Add-on**: Port 8080
- **API Add-on**: Port 3000
- **MariaDB**: Port 3306

Stellen Sie sicher, dass keine Port-Konflikte bestehen.

## Troubleshooting

### PWA lädt nicht

1. Überprüfen Sie, ob das Add-on läuft (Status: "Running")
2. Checken Sie die Add-on Logs auf Fehler
3. Testen Sie den Zugriff direkt: `http://YOUR_IP:8080`

### API-Verbindung schlägt fehl

1. Öffnen Sie die **Einstellungen** in der PWA
2. Überprüfen Sie die API-Server URL
3. Nutzen Sie **Verbindung testen** Funktion
4. Stellen Sie sicher, dass das FacilityMaster API Add-on läuft
5. Prüfen Sie, ob Port 3000 erreichbar ist

### PWA Update wird nicht angezeigt

1. Leeren Sie den Browser-Cache (Strg+Shift+R / Cmd+Shift+R)
2. Deinstallieren und neu installieren Sie die PWA (falls als App installiert)

### Nginx Proxy funktioniert nicht

1. Überprüfen Sie die Nginx Proxy Manager Logs
2. Stellen Sie sicher, dass Port 8080 im lokalen Netzwerk erreichbar ist
3. Testen Sie direkten Zugriff ohne Proxy zuerst

## Support

Bei Problemen:
- Überprüfen Sie die Add-on Logs
- Konsultieren Sie die Haupt-Dokumentation
- Öffnen Sie ein Issue auf GitHub

## Version

1.0.0 - Initial Release
