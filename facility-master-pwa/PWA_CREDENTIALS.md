# 🔐 PWA Standard-Credentials

## 📋 Standard-Login-Daten

Für die **FacilityMaster PWA** stehen folgende Demo-Accounts zur Verfügung:

**⚠️ WICHTIG:** Diese User müssen zuerst in der Datenbank erstellt werden!

### Initiale User erstellen

```bash
# Im Backend-Verzeichnis
cd facility-master-api
npm run seed:users
```

Dies erstellt folgende Demo-Accounts:

### 👤 **Admin-Account**
```
E-Mail:    admin@facilitymaster.de
Passwort:  admin123
Rolle:     Administrator (voller Zugriff)
```

### 🔧 **Techniker-Account**
```
E-Mail:    techniker@facilitymaster.de
Passwort:  tech123
Rolle:     Techniker (eingeschränkter Zugriff)
```

### 👥 **Standard-User**
```
E-Mail:    user@facilitymaster.de
Passwort:  user123
Rolle:     Benutzer (Basis-Zugriff)
```

---

## 🚀 **Verwendung**

### 1. PWA öffnen
```
URL: http://localhost:5173
```

### 2. Login-Seite
- Die Login-Seite wird automatisch angezeigt
- Geben Sie eine der oben genannten E-Mail-Adressen ein
- Geben Sie das entsprechende Passwort ein

### 3. Nach erfolgreichem Login
- Sie werden zur **Projekt-Auswahl** weitergeleitet
- Je nach Rolle haben Sie unterschiedliche Berechtigungen

---

## ⚠️ **WICHTIG: Nur für Entwicklung!**

Diese Credentials sind **nur für die Entwicklung** gedacht!

### Für Production:
1. ✅ **Passwörter ändern** (starke Passwörter verwenden)
2. ✅ **Echte User-Datenbank** implementieren
3. ✅ **bcrypt** für Passwort-Hashing verwenden
4. ✅ **JWT_SECRET** in `.env` ändern
5. ✅ **HTTPS** aktivieren

---

## 🔧 **Backend Auth-Endpoint**

Die Auth-Route ist unter:
```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "admin@facilitymaster.de",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "admin@facilitymaster.de",
    "firstName": "Admin",
    "lastName": "User",
    "fullName": "Admin User",
    "roleName": "ADMIN"
  }
}
```

---

## 📝 **Token-Verwendung**

Nach erfolgreichem Login wird ein **JWT-Token** zurückgegeben.

**In API-Requests verwenden:**
```javascript
headers: {
  'Authorization': 'Bearer <token>'
}
```

**Token-Gültigkeit:** 24 Stunden

---

## 🛠 **Token-Verifizierung**

```
GET /api/v1/auth/verify
Headers: Authorization: Bearer <token>
```

---

## 🔄 **Passwörter zurücksetzen**

Aktuell nicht implementiert. Für Production:
- Passwort-Reset-Funktion hinzufügen
- E-Mail-Versand implementieren
- Secure Token-Generierung

---

**Status:** ✅ **Demo-Accounts aktiv**

**Nächste Schritte:** Für Production echte User-Verwaltung implementieren!

