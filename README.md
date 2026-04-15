# 🌿 SmartGuard — Plant Monitoring Dashboard

Real-time IoT plant health monitoring and smart irrigation control panel built with **React**, **Vite**, and **Firebase Realtime Database**.

![SmartGuard](https://img.shields.io/badge/Status-Live-4CAF50?style=flat-square) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite) ![Firebase](https://img.shields.io/badge/Firebase-RTDB-FFCA28?style=flat-square&logo=firebase)

## Features

- **Live Dashboard** — Real-time sensor cards with health scoring ring, trend indicators, and 24h moisture/temperature charts
- **Control Panel** — Manual/auto pump toggle, moisture threshold slider, pump activity timeline
- **Analytics** — Multi-sensor trend chart, radar health visualization, hourly patterns, correlation plots, data table
- **Alerts & Logs** — Threshold-based alert engine with severity levels (critical/warning), grouped by date
- **Plant Health Engine** — Weighted multi-sensor scoring system (moisture 40%, temperature 25%, humidity 20%, air quality 15%)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Styling | Vanilla CSS (glassmorphism, Outfit font) |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Firebase Realtime Database |
| Hardware | ESP8266 + BME680 + Soil Moisture Sensor |
| Deployment | Vercel |

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- A Firebase project with Realtime Database enabled

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/smart-guard.git
cd smart-guard

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env and fill in your Firebase credentials

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173` (also accessible on your LAN).

### Environment Variables

Create a `.env` file in the project root with these values from your Firebase console:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.region.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> ⚠️ Never commit the `.env` file. It is already listed in `.gitignore`.

## Deployment (Vercel)

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Git Integration
1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add your `VITE_*` environment variables in the Vercel project settings
4. Deploy!

The included `vercel.json` handles SPA routing automatically.

## Project Structure

```
smart-guard/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── manifest.json
├── src/
│   ├── components/       # Layout, Header, Sidebar
│   ├── context/          # FirebaseContext (live data provider)
│   ├── pages/            # Dashboard, Control, Analytics, Alerts, NotFound
│   ├── utils/            # plantHealth.js (scoring & threshold engine)
│   ├── firebase.js       # Firebase initialization
│   ├── main.jsx          # Entry point
│   └── index.css         # Design system & global styles
├── .env.example          # Template for environment variables
├── vercel.json           # SPA rewrite rules
└── vite.config.js        # Build configuration
```

## Firebase Data Structure

```
├── plant/                 # Live sensor readings (written by ESP8266)
│   ├── moisture: 45
│   ├── temperature: 28.3
│   ├── humidity: 62.1
│   ├── pressure: 1013.2
│   ├── gas: 32.5
│   └── pump: false
├── control/               # Control commands (written by dashboard)
│   ├── auto: true
│   ├── pump: false
│   └── threshold: 30
└── sensor_log/            # Historical entries (written by ESP8266)
    └── {timestamp_key}/
        ├── moisture, temperature, humidity, ...
        └── timestamp: "2026-04-15T12:00:00Z"
```

## License

MIT
