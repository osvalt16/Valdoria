(function (window) {
  "use strict";

  // ============================================================
  // CONFIGURATION DES PERSONNAGES JOUABLES
  // ============================================================
  // Pour ajouter un nouveau personnage :
  //   1. Copie ta feuille de sprites dans assets/img/
  //      Format obligatoire : PNG 48×96 px, fond transparent
  //      Grille : 3 colonnes (frames) × 4 lignes (directions)
  //      Directions : bas / gauche / droite / haut (lignes 0→3)
  //      Frames     : marche-g / idle / marche-d (colonnes 0→2)
  //   2. Ajoute une entrée dans le tableau ci-dessous.
  //
  // Exemple :
  //   { id: "ninja", label: "Ninja", src: "assets/img/remote_ninja.png" }
  // ============================================================

  window.Valdoria = window.Valdoria || {};
  window.Valdoria.spritesConfig = [
    { id: "homme1",  label: "Garçon 1",  src: "assets/img/homme1.png"  },
    { id: "homme2",  label: "Garçon 2",  src: "assets/img/homme2.png"  },
    { id: "homme3",  label: "Garçon 3",  src: "assets/img/homme3.png"  },
    { id: "homme4",  label: "Garçon