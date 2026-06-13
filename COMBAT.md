# Système de combat — Valdoria

## État actuel (Phase 1)

Le système de combat est en place côté lobby et matchmaking. Les joueurs peuvent se retrouver dans le **Cable Club** et s'envoyer des défis. Le combat réel dans la ROM n'est pas encore déclenché (Phase 2).

---

## Comment ça fonctionne

### 1. Configurer la map du Cable Club

La première fois, il faut apprendre au jeu quelle map correspond au Cable Club :

1. Lance une ROM Pokémon Rouge Feu
2. Va dans un Centre Pokémon → entre dans le Cable Club (2ème étage)
3. Ouvre le menu **PokéKanto** → section **⚔️ Cable Club**
4. Clique **📍 Enregistrer cette map**

Cette map est sauvegardée dans ton navigateur. Le lobby s'ouvrira automatiquement à chaque fois que tu entreras dans cette pièce.

### 2. Lancer une recherche de combat

Quand tu entres dans le Cable Club, une fenêtre s'ouvre avec deux options :

- **Combat aléatoire** — se connecte au premier joueur disponible dans la salle sur le serveur partagé
- **Défier un ami** — affiche la liste de tes amis (tag `Nom#1234`) qui sont dans la salle en ce moment

### 3. Recevoir un défi

Quand quelqu'un te défie, une notification apparaît :

> **NomDresseur te défie !**  
> ✅ Accepter · ❌ Refuser

Si tu acceptes, les deux joueurs reçoivent une confirmation de connexion.

---

## Architecture technique

### Phase 1 — Lobby Firebase (actuel)

- Chaque joueur qui entre dans le Cable Club écrit sa présence dans `monde/linkroom/<id>` sur Firebase
- Les défis transitent par `monde/defis/<id_cible>`
- La détection de map se fait via les coordonnées `g` (bank) et `m` (numéro de map) lues en RAM par `position.js`
- Le tag `Nom#1234` est partagé entre le tchat et le système de combat pour identifier les amis

```
Firebase Realtime Database
└── monde/
    ├── joueurs/        — positions de tous les joueurs connectés
    ├── linkroom/       — joueurs présents dans le Cable Club
    │   └── <id>/       — { pseudo, tag, ts }
    └── defis/
        └── <id_cible>/ — { de, pseudo, tag, ts, accepte? }
```

### Phase 2 — Câble link SIO via WebRTC (à venir)

Pour de vrais combats Pokémon, la ROM a besoin de croire qu'un câble link GBA est branché. Le plan :

1. **Implémenter le port SIO dans `js/sio.js`** — les registres SIOCNT, SIODATA, le mode Normal 32-bit utilisé par Fire Red pour les combats/échanges.
2. **Transport WebRTC** — un canal de données RTCDataChannel relie les deux navigateurs via les serveurs STUN publics (pas de serveur à héberger).
3. **Synchronisation lockstep** — les deux émulateurs avancent frame par frame ensemble. À chaque échange SIO, les données transitent via WebRTC. Si un paquet est en retard, on attend (pas de prédiction possible en Pokémon).
4. **Branchement** — quand Phase 2 est prête, elle se branche dans `linkroom.js` à l'endroit marqué `// Phase 2 : lancer la session SIO ici`.

### Pourquoi le Centre Pokémon 2ème étage ?

Dans Pokémon Rouge Feu, c'est l'emplacement natif du Cable Club — la salle où les ROM gèrent déjà les combats et échanges via câble link. En entrant dans cette pièce et en initiant un combat, la ROM suit son chemin de code normal : elle ouvre les menus de combat/échange natifs et pilote le port SIO. On n'a pas à réécrire la logique de jeu.

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `assets/js/linkroom.js` | Détection de map, présence Firebase, envoi/réception de défis, UI du lobby |
| `assets/js/network.js` | Broadcast du tag dans Firebase, lecture du tag des autres joueurs |
| `assets/js/tchat.js` | Fournit le tag `Nom#1234` au module linkroom |
| `assets/js/app.js` | Appelle `linkroom.check(pos)` dans la boucle de jeu (toutes les 125 ms) |
| `assets/js/position.js` | Lit les coordonnées `g` et `m` de la map courante depuis la RAM GBA |
| `js/sio.js` | Port SIO gbajs2 — à implémenter pour la Phase 2 |

---

## Limitations connues (Phase 1)

- Le lobby fonctionne mais aucun combat réel n'est déclenché dans la ROM
- La map du Cable Club doit être configurée manuellement la première fois
- Si les deux joueurs ne sont pas sur la même version de ROM, le câble link ne fonctionnera pas (Phase 2)
- Un seul défi à la fois par joueur
