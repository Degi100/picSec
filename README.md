# PicSec

Private Foto-Sharing App mit End-to-End Encryption für den Inner Circle.

## Features

### Authentifizierung
- Google OAuth Login via Supabase
- JWT Token-basierte API Authentifizierung
- Sichere Token-Speicherung mit Expo SecureStore

### Galerien
- Erstellen und Verwalten von privaten Foto-Galerien
- Galerie-Mitgliederverwaltung mit Rollen:
  - **Owner** - Volle Kontrolle, kann Mitglieder einladen/entfernen
  - **Photoshoter** - Kann Fotos hochladen und ansehen
  - **Viewer** - Kann nur Fotos ansehen

### Einladungssystem
- User per E-Mail zu Galerien einladen
- Einladungen annehmen/ablehnen
- Einladungen mit Ablaufdatum

### Bilder
- Fotos aus Galerie hochladen
- Kamera-Integration zum direkten Fotografieren
- Bild-Grid Ansicht
- Bilder löschen

### Sicherheit
- End-to-End Encryption mit TweetNaCl (libsodium)
- Verschlüsselte Galerie-Keys pro Mitglied
- Bilder werden clientseitig verschlüsselt

## Tech Stack

### Mobile App
- **Expo SDK 54** mit React Native 0.81
- **expo-router** für Navigation
- **TanStack Query** für Server State Management
- **Zustand** für Client State
- **TweetNaCl** für Encryption

### Backend API
- **Hono** - Ultraschnelles Web Framework
- **MongoDB** - Datenbank
- **MinIO** - S3-kompatibler Object Storage für Bilder

### Shared Packages
- **@picsec/shared** - Types, Interfaces, Zod Schemas
- **@picsec/crypto** - Encryption Utilities
- **@picsec/db** - MongoDB Schemas und Queries

## Projekt-Struktur

```
picsec/
├── apps/
│   ├── mobile/          # Expo React Native App
│   └── api/             # Hono Backend
├── packages/
│   ├── shared/          # Gemeinsame Types & Schemas
│   ├── crypto/          # E2E Encryption
│   └── db/              # Datenbank Layer
└── pnpm-workspace.yaml
```

## Setup

### Voraussetzungen
- Node.js 20+
- pnpm 9+
- MongoDB
- MinIO (oder S3-kompatibler Storage)

### Installation

```bash
# Dependencies installieren
pnpm install

# Environment Variables konfigurieren
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env

# Backend starten
cd apps/api
pnpm dev

# Mobile App starten
cd apps/mobile
pnpm start
```

### Mobile App bauen

```bash
cd apps/mobile

# APK für Android (ohne Store)
npx eas-cli build --profile preview --platform android

# iOS Simulator Build
npx eas-cli build --profile development --platform ios
```

## API Endpoints

### Auth
- `POST /api/v1/auth/google` - Google OAuth Login
- `POST /api/v1/auth/refresh` - Token Refresh

### Galleries
- `GET /api/v1/galleries` - Meine Galerien
- `POST /api/v1/galleries` - Galerie erstellen
- `GET /api/v1/galleries/:id` - Galerie Details
- `PATCH /api/v1/galleries/:id` - Galerie bearbeiten
- `DELETE /api/v1/galleries/:id` - Galerie löschen

### Gallery Members
- `POST /api/v1/galleries/:id/members` - Mitglied hinzufügen
- `DELETE /api/v1/galleries/:id/members/:memberId` - Mitglied entfernen
- `PATCH /api/v1/galleries/:id/members/:memberId` - Rolle ändern

### Images
- `GET /api/v1/galleries/:id/images` - Bilder einer Galerie
- `POST /api/v1/galleries/:id/images` - Bild hochladen
- `DELETE /api/v1/images/:id` - Bild löschen

### Invites
- `POST /api/v1/galleries/:id/invite-by-email` - User einladen
- `GET /api/v1/invites/pending` - Meine Einladungen
- `POST /api/v1/invites/:id/accept` - Einladung annehmen
- `POST /api/v1/invites/:id/decline` - Einladung ablehnen

## Lizenz

Private Nutzung - Alle Rechte vorbehalten.
