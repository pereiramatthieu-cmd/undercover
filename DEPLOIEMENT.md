# 🚀 Guide de déploiement — Undercover

## Architecture

```
undercover/
├── server/      → Node.js + Socket.io  (déployer sur Railway)
└── client/      → React                (déployer sur Vercel)
```

---

## 1. Déployer le serveur sur Railway

### Étapes

1. Va sur [railway.app](https://railway.app) et crée un compte (gratuit)
2. Clique **New Project → Deploy from GitHub repo**
3. Connecte ton GitHub et pousse d'abord le code :
   ```bash
   cd undercover
   git init
   git add .
   git commit -m "init"
   # Crée un repo sur github.com puis :
   git remote add origin https://github.com/TON_USER/undercover.git
   git push -u origin main
   ```
4. Dans Railway, sélectionne ton repo
5. **Root Directory** → mets `server`
6. Railway détecte Node.js automatiquement
7. Va dans **Variables** et ajoute :
   ```
   PORT=3001
   ```
8. Clique **Deploy** → attends 1-2 min
9. Dans **Settings → Networking**, génère un domaine public
10. Copie l'URL, elle ressemble à : `https://undercover-server-xxxx.railway.app`

---

## 2. Déployer le front sur Vercel

### Étapes

1. Va sur [vercel.com](https://vercel.com) et crée un compte (gratuit)
2. Clique **New Project → Import Git Repository**
3. Sélectionne ton repo GitHub
4. **Root Directory** → mets `client`
5. Dans **Environment Variables**, ajoute :
   ```
   REACT_APP_SERVER_URL=https://undercover-server-xxxx.railway.app
   ```
   (remplace par l'URL Railway de l'étape 1)
6. Clique **Deploy**
7. Vercel te donne une URL : `https://undercover-xxxx.vercel.app`

---

## 3. Tester en local (développement)

### Terminal 1 — Serveur
```bash
cd undercover/server
npm install
npm run dev
# → Serveur sur http://localhost:3001
```

### Terminal 2 — Front
```bash
cd undercover/client
npm install
# Crée un fichier .env.local :
echo "REACT_APP_SERVER_URL=http://localhost:3001" > .env.local
npm start
# → App sur http://localhost:3000
```

---

## 4. Variables d'environnement résumé

| Variable | Où | Valeur |
|---|---|---|
| `PORT` | Railway (server) | `3001` |
| `REACT_APP_SERVER_URL` | Vercel (client) | URL Railway |

---

## 5. Domaine personnalisé (optionnel)

- Sur **Vercel** : Settings → Domains → ajoute ton domaine
- Le serveur Railway n'a pas besoin de domaine custom

---

## Notes

- Railway free tier : 500h/mois, suffisant pour tester
- Vercel free tier : illimité pour les projets perso
- Les rooms vivent en mémoire → elles disparaissent si le serveur redémarre (normal pour une v1)
