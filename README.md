# Valdoria — Aventure à deux

Émulateur GBA dans le navigateur + couche multijoueur : chaque joueur charge sa propre ROM (Rouge Feu ou hack basé dessus), et une couche de code lit la position du joueur dans la mémoire du jeu, l'échange en pair-à-pair, et affiche ton ami comme un fantôme bleu directement dans ton écran de jeu quand vous êtes sur la même map.

**Important : aucune ROM n'est hébergée ici.** Chaque joueur fournit sa propre ROM, qui reste sur son ordinateur. Ce dépôt ne contient que du code original (émulateur gbajs2 sous licence BSD, chargé depuis un CDN).

## Comment jouer

1. Ouvre la page : https://osvalt16.github.io/Valdoria/
2. Entre ton pseudo, clique sur **Choisir ma ROM (.gba)** et sélectionne ta ROM
3. Le jeu se lance (flèches = croix, Z = A, X = B, Entrée = Start, \ = Select)
4. Joueur 1 : clique **Créer un salon** et envoie le code à ton ami
5. Joueur 2 : entre le code et clique **Rejoindre**
6. Quand vous êtes sur la même map, vous vous voyez dans le jeu !

## Comment ça marche

- L'émulateur [gbajs2](https://github.com/andychase/gbajs2) fait tourner la ROM en JavaScript
- La couche multijoueur lit en RAM le pointeur du bloc de sauvegarde (position X/Y + numéro de map du joueur), 8 fois par seconde
- Les positions s'échangent en P2P (PeerJS / WebRTC), sans serveur de jeu
- Un canvas transparent par-dessus l'écran dessine le fantôme de l'ami à sa position relative

Si la position n'est pas lue (lien "debug" en bas pour vérifier), l'adresse du pointeur peut être ajustée via l'URL : `?sb1=0x03005008`.

## Mettre en ligne (GitHub Pages)

Depuis ce dossier, dans un terminal :

```
git init
git add .
git commit -m "Page de jeu Valdoria"
git branch -M main
git remote add origin https://github.com/osvalt16/Valdoria.git
git push -u origin main
```

Puis sur GitHub : **Settings → Pages → Source : Deploy from a branch → main / (root) → Save**.
La page sera en ligne quelques minutes plus tard sur `https://osvalt16.github.io/Valdoria/`.

⚠️ Le fichier `.gitignore` empêche d'envoyer les ROMs par accident. Ne le supprime pas et ne pousse jamais de fichier `.gba` sur GitHub.

## Idées pour la suite

- Vrai sprite animé à la place du fantôme (lecture de la direction du personnage)
- Chat texte intégré
- Plus de 2 joueurs dans le même salon
- Échanges et combats via émulation du câble link
