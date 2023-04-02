// Shamelessly stolen with permission from https://hellevatorrewards.12hp.de/

const HELLEVATOR_THEMES = [
  4, 3, 2, 1, 0
]

const HELLEVATOR_ENEMY_DELTA = [
	{
    range: [0, 94],
		reset: [100, 50, 100, 50, 2000, 50, 75],
		delta: [40, 20, 40, 20, 4000, 4, 4]
	},
	{
    range: [95, 194],
		reset: [5000, 2500, 5500, 2500, 1000000, 500, 750],
		delta: [240, 120, 1000, 120, 3000000, 8, 8]
	},
	{
    range: [195, 254],
		reset: [30000, 15000, 110000, 15000, 300000000, 1500, 1750],
		delta: [900, 500, 1600, 500, 6000000, 10, 10]
	},
	{
    range: [245, 294],
		reset: [80000, 40000, 190000, 40000, 600000000, 2000, 2250],
		delta: [1000, 500, 1600, 500, 6000000, 10, 10]
	},
	{
    range: [295, 344],
		reset: [140000, 70000, 270000, 65000, 900000000, 2500, 2750],
		delta: [1100, 550, 1600, 500, 6000000, 10, 10]
	},
	{
    range: [345, 394],
		reset: [210000, 105000, 350000, 90000, 1200000000, 3000, 3250],
		delta: [1200, 600, 1600, 500, 6000000, 10, 10]
	},
	{
    range: [395, 444],
		reset: [280000, 140000, 430000, 115000, 1500000000, 3500, 3750],
		delta: [2000, 1000, 1600, 500, 14000000, 10, 10]
	},
	{
    range: [445, 494],
		reset: [400000, 200000, 510000, 140000, 2200000000, 4000, 4250],
		delta: [2400, 1200, 1600, 500, 14000000, 10, 10]
	},
  {
    range: [495, 499],
    reset: [540000, 280000, 590000, 165000, 2900000000, 4500, 4750],
    delta: [2600, 1400, 1600, 500, 14000000, 10, 10]
  }
];

const HellevatorEnemies = new (class {
  constructor () {
    this._enemies = {}
  }

  _generateEnemy({ floor, level, main, side, con, luck, health, element, klass, min, max }) {
    const obj = {
      Floor: floor,
      Level: level,
      Class: klass,
      NoBaseDamage: true,
      Armor: level * CONFIG.fromIndex(klass).MaximumDamageReduction,
      Health: health,
      Potions: { Life: 0 },
      Dungeons: {
        Player: 0,
        Group: 0
      },
      Luck: { Total: luck },
      Constitution: { Total: con },
      Fortress: { Gladiator: 0 },
      Runes: {
        Health: 0,
        ResistanceFire: element == 40 ? 25 : 0,
        ResistanceCold: element == 41 ? 25 : 0,
        ResistanceLightning: element == 42 ? 25 : 0
      },
      Items: {
        Hand: {},
        Wpn1: {
          AttributeTypes: { 2: element },
          Attributes: { 2: 25 },
          DamageMax: max,
          DamageMin: min,
          HasEnchantment: false
        }
      }
    };

    const attributes = {
      1: ['Strength', 'Dexterity', 'Intelligence'],
      2: ['Intelligence', 'Strength', 'Dexterity'],
      3: ['Dexterity', 'Strength', 'Intelligence']
    }

    for (const [index, name] of Object.entries(attributes[klass])) {
      obj[name] = { Total: index === 0 ? main : side }
    }

    return obj;
  }

  async _generateEnemies (theme) {
    this._enemies[theme] = [];

    const themeData = await fetch(`/js/sim/hellevator/theme${theme}.json`).then((data) => data.json());

    for (const { range: [ rangeStart, rangeEnd ], reset: [ resetMain, resetSide, resetCon, resetLuck, resetHealth, resetMin, resetMax ], delta: [ deltaMain, deltaSide, deltaCon, deltaLuck, deltaHealth, deltaMin, deltaMax ] } of HELLEVATOR_ENEMY_DELTA) {
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const delta = i - rangeStart;

        this._enemies[theme][i] = this._generateEnemy({
          floor: i + 1,
          level: 10 + i * 2,
          klass: _dig(themeData, i, 1) || 1,
          element: _dig(themeData, i, 0) || 40,
          main: resetMain + delta * deltaMain,
          side: resetSide + delta * deltaSide, 
          con: resetCon + delta * deltaCon,
          luck: resetLuck + delta * deltaLuck,
          health: resetHealth + delta * deltaHealth,
          min: resetMin + delta * deltaMin,
          max: resetMax + delta * deltaMax
        });
      }
    }
  }

  async floorRange (start, end = start, theme = HELLEVATOR_THEMES[0]) {
    if (typeof this._enemies[theme] === 'undefined') {
      await this._generateEnemies(theme);
    }

    return this._enemies[theme].slice(start - 1, end);
  }
})()
