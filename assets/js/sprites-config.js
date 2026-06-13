(function (window) {
  "use strict";

  // Ajoutez vos personnages ici.
  // Format PNG : 48x96 px, 3 colonnes (frames) x 4 lignes (directions).
  // Directions : bas / gauche / droite / haut (lignes 0->3)
  // Frames     : marche-g / idle / marche-d (colonnes 0->2)

  window.Valdoria = window.Valdoria || {};
  window.Valdoria.spritesConfig = [
    { id: "homme1",  label: "Garcon 1",  src: "assets/img/homme1.png"  },
    { id: "homme2",  label: "Garcon 2",  src: "assets/img/homme2.png"  },
    { id: "homme3",  label: "Garcon 3",  src: "assets/img/homme3.png"  },
    { id: "homme4",  label: "Garcon 4",  src: "assets/img/homme4.png"  },
    { id: "homme5",  label: "Garcon 5",  src: "assets/img/homme5.png"  },
    { id: "homme6",  label: "Garcon 6",  src: "assets/img/homme6.png"  },
    { id: "homme7",  label: "Garcon 7",  src: "assets/img/homme7.png"  },
    { id: "homme8",  label: "Garcon 8",  src: "assets/img/homme8.png"  },
    { id: "homme9",  label: "Garcon 9",  src: "assets/img/homme9.png"  },
    { id: "homme10", label: "Garcon 10", src: "assets/img/homme10.png" },
    { id: "fille1",  label: "Fille 1",   src: "assets/img/Fille1.png"  },
    { id: "fille2",  label: "Fille 2",   src: "assets/img/Fille2.png"  },
    { id: "fille3",  label: "Fille 3",   src: "assets/img/Fille3.png"  },
    { id: "fille4",  label: "Fille 4",   src: "assets/img/Fille4.png"  },
    { id: "fille5",  label: "Fille 5",   src: "assets/img/fille5.png"  },
    { id: "fille6",  label: "Fille 6",   src: "assets/img/fille6.png"  },
    { id: "fille7",  label: "Fille 7",   src: "assets/img/fille7.png"  },
    { id: "fille8",  label: "Fille 8",   src: "assets/img/fille8.png"  }
  ];

})(window);
