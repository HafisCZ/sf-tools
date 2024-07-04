class MonsterGenerator {
  static #DELTA = [
    {
      range: [10, 199],
      reset: [100, 50, 100, 50, 2000, 50, 75],
      delta: [20, 10, 20, 10, 2000, 2, 2]
    },
    {
      range: [200, 399],
      reset: [5000, 2500, 5500, 2500, 1000000, 500, 750],
      delta: [120, 60, 500, 60, 1500000, 4, 4]
    },
    {
      range: [400, 499],
      reset: [30000, 15000, 110000, 15000, 300000000, 1500, 1750],
      delta: [450, 250, 800, 250, 3000000, 5, 5]
    },
    {
      range: [500, 599],
      reset: [80000, 40000, 190000, 40000, 600000000, 2000, 2250],
      delta: [500, 250, 800, 250, 3000000, 5, 5]
    },
    {
      range: [600, 699],
      reset: [140000, 70000, 270000, 65000, 900000000, 2500, 2750],
      delta: [550, 275, 800, 250, 3000000, 5, 5]
    },
    {
      range: [700, 799],
      reset: [210000, 105000, 350000, 90000, 1200000000, 3000, 3250],
      delta: [600, 300, 800, 250, 3000000, 5, 5]
    },
    {
      range: [800, 899],
      reset: [280000, 140000, 430000, 115000, 1500000000, 3500, 3750],
      delta: [1000, 500, 800, 250, 7000000, 25, 25]
    },
    {
      range: [900, 999],
      reset: [400000, 200000, 510000, 140000, 2200000000, 6000, 6250],
      delta: [1200, 600, 800, 250, 7000000, 25, 25]
    },
    {
      range: [1000, 1009],
      reset: [540000, 280000, 590000, 165000, 2900000000, 8500, 8750],
      delta: [1300, 700, 800, 250, 7000000, 25, 25]
    }
  ]

  static MONSTER_NORMAL = Symbol();
  static MONSTER_RAID = Symbol();
  static MONSTER_BOSS = Symbol();

  static #MULTIPLIERS = {
    // Main, Side, Con, Luck, Health, Min, Max
    [this.MONSTER_NORMAL]: [1, 1, 1, 1, 1, 1, 1],
    [this.MONSTER_RAID]: [1.5, 1.5, 1.5, 1.5, 3, 1.5, 1.5]
  }

  static get (monsterType, monsterLevel, monsterClass, monsterRuneType = 0, monsterRuneValue = 0) {
    const base = this.#DELTA.find((entry) => monsterLevel >= entry.range[0] && monsterLevel <= entry.range[1]);

    const delta = monsterLevel - base.range[0];

    const [
      resetMain, resetSide, resetCon, resetLuck, resetHealth, resetMin, resetMax
    ] = base.reset;

    const [
      deltaMain, deltaSide, deltaCon, deltaLuck, deltaHealth, deltaMin, deltaMax
    ] = base.delta;

    const [
      multiplierMain, multiplierSide, multiplierCon, multiplierLuck, multiplierHealth, multiplierMin, multiplierMax
    ] = this.#MULTIPLIERS[monsterType];

    const main = multiplierMain * (resetMain + deltaMain * delta);
    const side = multiplierSide * (resetSide + deltaSide * delta);
    const con = multiplierCon * (resetCon + deltaCon * delta);
    const luck = multiplierLuck * (resetLuck + deltaLuck * delta);
    const health = multiplierHealth * (resetHealth + deltaHealth * delta);
    const min = multiplierMin * (resetMin + deltaMin * delta);
    const max = multiplierMax * (resetMax + deltaMax * delta);

    const model = {
      NoBaseDamage: true,
      Level: monsterLevel,
      Class: monsterClass,
      Armor: monsterLevel * CONFIG.fromIndex(monsterClass).MaximumDamageReduction,
      Health: health,
      Luck: { Total: luck },
      Constitution: { Total: con },
      Runes: {
        Health: 0,
        ResistanceFire: monsterRuneType == 40 ? monsterRuneValue : 0,
        ResistanceCold: monsterRuneType == 41 ? monsterRuneValue : 0,
        ResistanceLightning: monsterRuneType == 42 ? monsterRuneValue : 0
      },
      Items: {
        Wpn1: {
          AttributeTypes: { 2: monsterRuneType },
          Attributes: { 2: monsterRuneValue },
          DamageMax: max,
          DamageMin: min
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const name = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[CONFIG.fromIndex(monsterClass).Attribute][i];

      model[name] = {
        Total: i === 0 ? main : side
      }
    }

    return model;
  }
}