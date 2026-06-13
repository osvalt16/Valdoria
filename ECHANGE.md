# Système d'échange Pokémon — Valdoria

## Résumé

Les échanges se déroulent au **Cable Club** (2ème étage du Centre Pokémon), au même endroit que les combats. Tu choisis ton ami depuis le lobby, il accepte ta demande, et quand la Phase 2 sera prête, la ROM gère l'échange en natif via le câble link simulé.

---

## Comment faire un échange

### 1. Aller au Cable Club

Entre dans un Centre Pokémon et monte au 2ème étage (Cable Club). Le lobby Valdoria s'ouvre automatiquement si la map a été configurée (voir section Configuration).

### 2. Lancer une demande d'échange

Dans le lobby, clique **🔄 Échanger avec un ami ▾** pour ouvrir la liste de tes amis en ligne dans la salle.

- Seuls les amis avec qui tu as échangé ton tag `Nom#1234` apparaissent.
- Ton ami doit lui aussi être dans le Cable Club au même moment.

Clique sur le nom de ton ami → la demande est envoyée via Firebase.

### 3. Recevoir une demande d'échange

Une notification apparaît :

> **NomDresseur** veut échanger des Pokémon avec toi !  
> ✅ Accepter · ❌ Refuser

Si tu acceptes, les deux joueurs reçoivent la confirmation. En Phase 2, la ROM lance automatiquement le menu d'échange natif.

---

## Différence entre combat et échange

| | Combat | Échange |
|---|---|---|
| Localisation | Cable Club | Cable Club |
| Mode aléatoire | ✅ Oui | ❌ Non (ami uniquement) |
| Mode ami | ✅ Oui | ✅ Oui |
| Phase 1 (actuel) | Lobby + notification | Lobby + notification |
| Phase 2 (à venir) | Vrai combat SIO | Vrai échange SIO |

Les échanges aléatoires ne sont pas prévus : un échange Pokémon nécessite un accord sur ce qu'on donne et ce qu'on reçoit — ça ne se fait pas avec un inconnu au hasard.

---

## Compatibilité entre langues de ROM

Un échange entre un joueur avec une ROM française et un joueur avec une ROM anglaise fonctionne. Le câble link SIO est un protocole hardware GBA, indépendant de la langue.

Ce qui doit correspondre : la **génération** de la ROM. Fire Red et Leaf Green sont compatibles entre eux. Fire Red n'est pas compatible avec Emerald ou d'autres générations.

En Phase 2, Valdoria lira le code de ROM de chaque joueur (`cart.code`, déjà disponible dans `position.js`) et vérifiera la compatibilité avant d'établir la connexion SIO.

---

## Architecture technique

### Phase 1 — Lobby Firebase (actuel)

Le type de session (`"combat"` ou `"echange"`) est inclus dans le document Firebase du défi :

```
monde/defis/<id_cible>/
  de    : id de l'expéditeur
  pseudo: nom du dresseur
  tag   : Nom#1234
  type  : "combat" | "echange"
  ts    : timestamp
  accepte?: true  (ajouté par le receveur s'il accepte)
```

Le module `assets/js/linkroom.js` lit ce champ pour adapter les textes affichés ("te défie en combat !" vs "veut échanger des Pokémon avec toi !").

### Phase 2 — Câble link SIO (à venir)

Même infrastructure que pour les combats. La ROM sait distinguer "combat" et "échange" dans ses propres menus — Valdoria n'a qu'à établir le câble link. C'est le joueur qui choisit dans les menus natifs du jeu.

Le branchement Phase 2 se fait dans `linkroom.js` à la ligne commentée :
```javascript
// Phase 2 : lancer la session SIO ici
```

---

## Configuration de la map

Si le lobby ne s'ouvre pas automatiquement quand tu entres dans le Cable Club :

1. Lance le jeu
2. Entre dans le Cable Club (2ème étage d'un Centre Pokémon)
3. Ouvre **PokéKanto** → section **⚔️ Cable Club**
4. Clique **📍 Enregistrer cette map**

La map est sauvegardée dans ton navigateur et utilisée pour toutes les sessions suivantes.
