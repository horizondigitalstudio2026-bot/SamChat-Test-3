# SamChat — Phase 1 : socle technique

Messagerie temps réel premium avec identité visuelle originale **"Aurora"**
(glassmorphism, dégradé violet → cyan → rose, animations signature).

Ce livrable couvre la **Phase 1** du projet : authentification sécurisée,
messagerie privée en temps réel (texte + médias), contacts, présence,
indicateur de saisie, accusés de réception, réactions, édition/suppression
de messages avec historique, et une interface premium complète.

Les phases suivantes (groupes avancés, appels WebRTC, stories, assistant IA,
coffre-fort, profils business, dashboard admin, packs d'emojis exclusifs...)
s'ajouteront sur cette même base sans la casser.

---

## 1. Prérequis

- [Node.js](https://nodejs.org) version 18 ou supérieure
- npm (fourni avec Node.js)

Vérifiez votre version :

```bash
node -v
npm -v
```

---

## 2. Installation

Ouvrez le dossier `samchat` dans Visual Studio Code, puis dans un terminal :

```bash
# 1. Installer les dépendances
npm install

# 2. Créer votre fichier d'environnement
cp .env.example .env
```

Ouvrez `.env` et changez au minimum `JWT_SECRET` et `JWT_REFRESH_SECRET`
par des chaînes aléatoires longues (même en local, c'est une bonne habitude).

---

## 3. Lancer le projet en local

```bash
npm run dev
```

(`nodemon` redémarre le serveur automatiquement à chaque modification.
Pour un lancement simple sans rechargement automatique : `npm start`.)

Le serveur affiche :

```
[INFO] SamChat démarré sur http://localhost:4000 (development)
```

Ouvrez **http://localhost:4000** dans votre navigateur.

La base de données SQLite (`server/database/samchat.db`) est créée et son
schéma initialisé automatiquement au premier démarrage — aucune commande
manuelle n'est nécessaire.

---

## 4. Tester l'application

1. Créez un premier compte via "Créer un compte".
2. Ouvrez une fenêtre de navigation privée (ou un autre navigateur) et
   créez un second compte.
3. Depuis le premier compte, cliquez sur le bouton **+** du rail de
   navigation, recherchez le second utilisateur, et démarrez la conversation.
4. Envoyez des messages : ils apparaissent en temps réel des deux côtés,
   avec indicateur "en train d'écrire", statut en ligne/hors ligne, etc.

---

## 5. Structure du projet

```
samchat/
├── client/public/          # Application cliente (HTML/CSS/JS vanilla)
│   ├── index.html
│   ├── manifest.json       # PWA
│   ├── css/
│   │   ├── design-system.css   # Design tokens + identité "Aurora"
│   │   ├── auth.css
│   │   └── app.css
│   └── js/
│       ├── api.js          # Client REST
│       ├── auth.js         # Connexion / inscription
│       ├── socket.js       # Client Socket.IO
│       ├── ui.js           # Utilitaires d'affichage
│       └── app.js          # Orchestration de l'application
│
├── server/
│   ├── server.js           # Point d'entrée (HTTP + Socket.IO)
│   ├── app.js               # Configuration Express
│   ├── config/              # Variables d'environnement + connexion DB
│   ├── controllers/         # Logique métier des routes REST
│   ├── middleware/          # Auth, rate limiting, validation, uploads
│   ├── models/               # Accès aux données (SQLite)
│   ├── routes/                # Définition des routes REST
│   ├── services/              # Logique Socket.IO temps réel
│   ├── utils/                  # Logger, gestion des jetons JWT
│   ├── database/                # Fichier SQLite (généré automatiquement)
│   └── logs/                     # Journaux applicatifs
│
├── uploads/                 # Fichiers envoyés (images, vidéos, audio, documents)
├── .env.example
└── package.json
```

---

## 6. Sécurité mise en place (Phase 1)

- Mots de passe hashés avec **bcrypt** (12 rounds)
- Authentification par **JWT** (jeton d'accès court + jeton de rafraîchissement
  en cookie `httpOnly`)
- **Rate limiting** sur les routes globales et renforcé sur `/auth/login`
  et `/auth/register`
- **Helmet** pour les en-têtes HTTP de sécurité
- **CORS** restreint à l'URL du client
- Sanitisation anti-XSS de toutes les entrées texte
- Validation stricte des formulaires (`express-validator`)
- Journalisation des tentatives de connexion (`login_logs`)
- Vérification d'appartenance à une conversation avant tout accès aux messages

---

## 7. Prochaines phases prévues

| Phase | Contenu |
|-------|---------|
| 2 | Groupes avancés, réponses/transferts de messages, épinglage, archivage |
| 3 | Appels audio/vidéo WebRTC, partage d'écran, stories/statuts |
| 4 | Assistant IA, traduction automatique, planification de messages, recherche intelligente, coffre-fort, profils multiples/business |
| 5 | Dashboard administrateur, packs d'emojis exclusifs SamChat, personnalisation avancée (thèmes, polices, sons) |

---

## 8. Dépannage rapide

- **Le port 4000 est déjà utilisé** → changez `PORT` dans `.env`.
- **Erreur `better-sqlite3` au `npm install`** → assurez-vous d'avoir les
  outils de compilation natifs (sur Windows : `npm install --global
  windows-build-tools` en administrateur ; sur macOS : Xcode Command Line
  Tools via `xcode-select --install`).
- **Les fichiers uploadés ne s'affichent pas** → vérifiez que le dossier
  `uploads/` a les droits d'écriture.