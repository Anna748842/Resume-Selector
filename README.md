# Resume-Selector

A resume screening dashboard for comparing candidate resumes against job requirements.

## Local development

1. Copy the server env template:
   ```bash
   copy .env.example .env
   ```
2. Copy the client Firebase env template:
   ```bash
   copy client\.env.example client\.env
   ```
3. Fill both files with your values.
4. Install dependencies:
   ```bash
   npm install
   npm --prefix client install
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## GitHub Pages deployment

This project is configured for GitHub Pages with the repository URL:

https://anna748842.github.io/Resume-Selector/

Build and deploy:

```bash
npm run deploy
```

If the repo is not published yet, push the project to a GitHub repository named `Resume-Selector` and enable GitHub Pages from the `gh-pages` branch.

## Firebase setup

1. Create a Firebase project in the Firebase Console.
2. Add a web app and copy the config values into `client/.env` using the `VITE_FIREBASE_*` keys.
3. Run:
   ```bash
   firebase login
   firebase use --add
   firebase deploy
   ```

> Note: GitHub Pages hosts static assets only. The Express + MongoDB backend in this repo is intended for local development or a separate hosted backend. For production, use Firebase Hosting and/or Firebase Functions/Firestore for the app data layer.
