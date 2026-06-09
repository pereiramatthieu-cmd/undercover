const wordPairs = [

  // ── Personnages Dragon Ball ──
  { citizens: "Goku", undercover: "Vegeta" },
  { citizens: "Gohan", undercover: "Goten" },
  { citizens: "Piccolo", undercover: "Freezer" },
  { citizens: "Boo", undercover: "Cell" },
  { citizens: "Broly", undercover: "Gogeta" },
  { citizens: "Trunks", undercover: "Gohan" },
  { citizens: "Krilin", undercover: "Yamcha" },

  // ── Personnages Naruto ──
  { citizens: "Naruto", undercover: "Sasuke" },
  { citizens: "Sakura", undercover: "Hinata" },
  { citizens: "Kakashi", undercover: "Iruka" },
  { citizens: "Itachi", undercover: "Madara" },
  { citizens: "Pain", undercover: "Obito" },
  { citizens: "Minato", undercover: "Kushina" },
  { citizens: "Gaara", undercover: "Rock Lee" },
  { citizens: "Shikamaru", undercover: "Choji" },
  { citizens: "Neji", undercover: "Hinata" },
  { citizens: "Jiraiya", undercover: "Tsunade" },
  { citizens: "Orochimaru", undercover: "Kabuto" },

  // ── Personnages One Piece ──
  { citizens: "Luffy", undercover: "Zoro" },
  { citizens: "Sanji", undercover: "Nami" },
  { citizens: "Robin", undercover: "Franky" },
  { citizens: "Usopp", undercover: "Brook" },
  { citizens: "Ace", undercover: "Sabo" },
  { citizens: "Shanks", undercover: "Barbe Blanche" },
  { citizens: "Kaido", undercover: "Big Mom" },
  { citizens: "Doflamingo", undercover: "Crocodile" },
  { citizens: "Mihawk", undercover: "Hancock" },
  { citizens: "Trafalgar Law", undercover: "Kid" },

  // ── Personnages Bleach ──
  { citizens: "Ichigo", undercover: "Rukia" },
  { citizens: "Aizen", undercover: "Urahara" },
  { citizens: "Byakuya", undercover: "Kenpachi" },
  { citizens: "Renji", undercover: "Toshiro" },
  { citizens: "Orihime", undercover: "Chad" },
  { citizens: "Grimmjow", undercover: "Ulquiorra" },

  // ── Personnages Attack on Titan ──
  { citizens: "Eren", undercover: "Mikasa" },
  { citizens: "Levi", undercover: "Erwin" },
  { citizens: "Armin", undercover: "Hange" },
  { citizens: "Reiner", undercover: "Bertholdt" },
  { citizens: "Annie", undercover: "Historia" },

  // ── Personnages Demon Slayer ──
  { citizens: "Tanjiro", undercover: "Zenitsu" },
  { citizens: "Inosuke", undercover: "Nezuko" },
  { citizens: "Rengoku", undercover: "Tengen" },
  { citizens: "Muzan", undercover: "Doma" },
  { citizens: "Akaza", undercover: "Kokushibo" },

  // ── Personnages My Hero Academia ──
  { citizens: "Deku", undercover: "Bakugo" },
  { citizens: "Todoroki", undercover: "Iida" },
  { citizens: "Uraraka", undercover: "Tsuyu" },
  { citizens: "All Might", undercover: "Endeavor" },
  { citizens: "Hawks", undercover: "Dabi" },
  { citizens: "Toga", undercover: "Shigaraki" },

  // ── Personnages Jujutsu Kaisen ──
  { citizens: "Itadori", undercover: "Megumi" },
  { citizens: "Nobara", undercover: "Maki" },
  { citizens: "Gojo", undercover: "Geto" },
  { citizens: "Sukuna", undercover: "Mahito" },

  // ── Personnages Hunter x Hunter ──
  { citizens: "Gon", undercover: "Killua" },
  { citizens: "Kurapika", undercover: "Leorio" },
  { citizens: "Hisoka", undercover: "Illumi" },
  { citizens: "Netero", undercover: "Meruem" },

  // ── Personnages Fullmetal Alchemist ──
  { citizens: "Edward Elric", undercover: "Alphonse Elric" },
  { citizens: "Roy Mustang", undercover: "Riza Hawkeye" },
  { citizens: "Scar", undercover: "Envy" },
  { citizens: "Greed", undercover: "Lust" },

  // ── Personnages Death Note ──
  { citizens: "Light", undercover: "L" },
  { citizens: "Near", undercover: "Mello" },
  { citizens: "Ryuk", undercover: "Rem" },

  // ── Personnages One Punch Man ──
  { citizens: "Saitama", undercover: "Genos" },
  { citizens: "Tatsumaki", undercover: "Fubuki" },
  { citizens: "Garou", undercover: "Bang" },
  { citizens: "King", undercover: "Atomic Samurai" },

  // ── Personnages divers ──
  { citizens: "Natsu", undercover: "Gray" },
  { citizens: "Erza", undercover: "Lucy" },
  { citizens: "Meliodas", undercover: "Ban" },
  { citizens: "Gintoki", undercover: "Shinpachi" },
  { citizens: "Spike Spiegel", undercover: "Jet Black" },
  { citizens: "Vash", undercover: "Wolfwood" },
  { citizens: "Shinji", undercover: "Rei" },
  { citizens: "Asuka", undercover: "Misato" },
  { citizens: "Denji", undercover: "Power" },
  { citizens: "Kaneki", undercover: "Touka" },
  { citizens: "Subaru", undercover: "Emilia" },
  { citizens: "Rem", undercover: "Ram" },
  { citizens: "Kazuma", undercover: "Aqua" },
  { citizens: "Megumin", undercover: "Darkness" },
  { citizens: "Kirito", undercover: "Asuna" },
  { citizens: "Mob", undercover: "Reigen" },
  { citizens: "Sailor Moon", undercover: "Sailor Mars" },

  // ── Techniques emblématiques ──
  { citizens: "Rasengan", undercover: "Chidori" },
  { citizens: "Kamehameha", undercover: "Big Bang Attack" },
  { citizens: "Gear 2", undercover: "Gear 4" },
  { citizens: "Gear 4", undercover: "Gear 5" },
  { citizens: "Bankai", undercover: "Shikai" },
  { citizens: "Super Saiyan", undercover: "Super Saiyan 2" },
  { citizens: "Super Saiyan Blue", undercover: "Super Saiyan Dieu" },
  { citizens: "Ultra Instinct", undercover: "Ultra Ego" },
  { citizens: "Sharingan", undercover: "Byakugan" },
  { citizens: "Susanoo", undercover: "Amaterasu" },
  { citizens: "Fruit du Démon", undercover: "Haki" },
  { citizens: "One For All", undercover: "All For One" },
  { citizens: "Respiration du Soleil", undercover: "Respiration de l'Eau" },
  { citizens: "Expansion du Domaine", undercover: "Énergie Maudite" },
  { citizens: "Alchemy", undercover: "Pierre Philosophale" },

  // ── Pokémon ──
  { citizens: "Pikachu", undercover: "Raichu" },
  { citizens: "Charizard", undercover: "Blastoise" },
  { citizens: "Mewtwo", undercover: "Mew" },
  { citizens: "Gengar", undercover: "Ectoplasma" },
  { citizens: "Eevee", undercover: "Évoli" },
  { citizens: "Lucario", undercover: "Riolu" },
  { citizens: "Snorlax", undercover: "Ronflex" },
  { citizens: "Gyarados", undercover: "Magicarpe" },
  { citizens: "Dracaufeu", undercover: "Tortank" },
  { citizens: "Bulbizarre", undercover: "Salamèche" },
  { citizens: "Mewtwo", undercover: "Zarbi" },
  { citizens: "Ronflex", undercover: "Goinfrex" },
  { citizens: "Pikachu", undercover: "Évoli" },
  { citizens: "Ash", undercover: "Gary" },
  { citizens: "Team Rocket", undercover: "Team Magma" },
  { citizens: "Dresseur", undercover: "Champion d'arène" },
  { citizens: "Légendaire", undercover: "Shiny" },
  { citizens: "Méga-évolution", undercover: "Gigamax" },

  // ── Séries ──
  { citizens: "Dragon Ball Z", undercover: "Dragon Ball Super" },
  { citizens: "Naruto", undercover: "Boruto" },
  { citizens: "One Piece", undercover: "Fairy Tail" },
  { citizens: "Bleach", undercover: "Naruto" },
  { citizens: "Attack on Titan", undercover: "Vinland Saga" },
  { citizens: "Demon Slayer", undercover: "Jujutsu Kaisen" },
  { citizens: "My Hero Academia", undercover: "Black Clover" },
  { citizens: "Death Note", undercover: "Code Geass" },
  { citizens: "Fullmetal Alchemist", undercover: "Soul Eater" },
  { citizens: "Hunter x Hunter", undercover: "Yu Yu Hakusho" },
  { citizens: "One Punch Man", undercover: "Mob Psycho 100" },
  { citizens: "Sword Art Online", undercover: "Log Horizon" },
  { citizens: "Re:Zero", undercover: "KonoSuba" },
  { citizens: "Tokyo Ghoul", undercover: "Parasyte" },
  { citizens: "Haikyuu", undercover: "Kuroko no Basket" },
  { citizens: "Berserk", undercover: "Vagabond" },
  { citizens: "Evangelion", undercover: "Gurren Lagann" },
  { citizens: "Cowboy Bebop", undercover: "Trigun" },
  { citizens: "Spirited Away", undercover: "Princess Mononoke" },
  { citizens: "Your Name", undercover: "A Silent Voice" },
  { citizens: "Chainsaw Man", undercover: "Tokyo Ghoul" },
  { citizens: "Jojo's Bizarre Adventure", undercover: "Stardust Crusaders" },
];

module.exports = wordPairs;
