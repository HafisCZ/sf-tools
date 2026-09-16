class MonsterGenerator {
  static MONSTER_NORMAL = Symbol();
  static MONSTER_RAID = Symbol();

  static #MULTIPLIERS = {
    [this.MONSTER_NORMAL]: {
      Default: 1,
      Health: 1
    },
    [this.MONSTER_RAID]: {
      Default: 1.5,
      Health: 3
    }
  }

  static #DELTA = {
    [this.MONSTER_NORMAL]: [
      {
        range: [10, 149],
        reset: [100, 50, 100, 50, 2000, 50, 75, 100],
        delta: [20, 10, 20, 10, 2000, 2, 2, 50]
      },
      {
        range: [150, 199],
        reset: [2900, 1450, 2900, 1450, 282000, 330, 355, 7100],
        delta: [42, 21, 52, 21, 2000, 3.4, 7.9, 58]
      },
      {
        range: [200, 349],
        reset: [5000, 2500, 5500, 2500, 1000000, 500, 750, 10000],
        delta: [120, 60, 500, 60, 1500000, 4, 4, 80]
      },
      {
        range: [350, 399],
        reset: [23000, 11500, 80500, 11500, 226000000, 1100, 1350, 22000],
        delta: [140, 70, 590, 70, 1500000, 8, 8, 100]
      },
      {
        range: [400, 449],
        reset: [30000, 15000, 110000, 15000, 300000000, 1500, 1750, 27000],
        delta: [450, 250, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [450, 499],
        reset: [52500, 27500, 150000, 27500, 450000000, 1750, 2000, 33000],
        delta: [550, 250, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [500, 549],
        reset: [80000, 40000, 190000, 40000, 600000000, 2000, 2250, 39000],
        delta: [500, 250, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [550, 599],
        reset: [105000, 52500, 230000, 52500, 750000000, 2250, 2500, 45000],
        delta: [700, 350, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [600, 649],
        reset: [140000, 70000, 270000, 65000, 900000000, 2500, 2750, 51000],
        delta: [550, 275, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [650, 699],
        reset: [167500, 83750, 310000, 77500, 1050000000, 2750, 3000, 57000],
        delta: [850, 425, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [700, 749],
        reset: [210000, 105000, 350000, 90000, 1200000000, 3000, 3250, 63000],
        delta: [600, 300, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [750, 799],
        reset: [240000, 120000, 390000, 102500, 1350000000, 3250, 3500, 69000],
        delta: [800, 400, 800, 250, 3000000, 5, 5, 120]
      },
      {
        range: [800, 849],
        reset: [280000, 140000, 430000, 115000, 1500000000, 3500, 3750, 75000],
        delta: [1000, 500, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [850, 899],
        reset: [330000, 165000, 470000, 127500, 1850000000, 4750, 5000, 81000],
        delta: [1400, 700, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [900, 949],
        reset: [400000, 200000, 510000, 140000, 2200000000, 6000, 6250, 87000],
        delta: [1200, 600, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [950, 999],
        reset: [460000, 230000, 550000, 152500, 2550000000, 7250, 7500, 93000],
        delta: [1600, 1000, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [1000, 1049],
        reset: [540000, 279300, 589200, 164750, 2900000000, 8500, 8750, 98880],
        delta: [1300, 700, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [1050, 1099],
        reset: [605000, 315000, 630000, 177500, 3250000000, 9750, 10000, 105000],
        delta: [1900, 700, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [1100, 1149],
        reset: [700000, 350000, 670000, 190000, 3600000000, 11000, 11250, 111000],
        delta: [1400, 700, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [1150, 1199],
        reset: [770000, 385000, 710000, 202500, 3950000000, 12250, 12500, 117000],
        delta: [2200, 700, 800, 250, 7000000, 25, 25, 120]
      },
      {
        range: [1200, 1209],
        reset: [880000, 420000, 750000, 215000, 4300000000, 13500, 13750, 123000],
        delta: [1500, 700, 800, 250, 7000000, 25, 25, 120]
      }
    ],
    [this.MONSTER_RAID]: [
      {
        range: [10, 199],
        reset: [150, 75, 150, 75, 6000, 75, 113, 150],
        delta: [30, 15, 30, 15, 6000, 3, 3, 75]
      },
      {
        range: [200, 399],
        reset: [7500, 3750, 7530, 3750, 3000000, 750, 1125, 15000],
        delta: [180, 90, 750, 90, 4500000, 6, 6, 120]
      },
      {
        range: [400, 499],
        reset: [45000, 22500, 165000, 22500, 900000000, 2250, 2625, 40500],
        delta: [675, 375, 1200, 375, 9000000, 7.5, 7.5, 180]
      },
      {
        range: [500, 599],
        reset: [120000, 60000, 165000, 22500, 1800000000, 3000, 3375, 61560],
        delta: [750, 375, 1200, 375, 9000000, 7.5, 7.5, 180]
      },
      {
        range: [600, 699],
        reset: [218250, 109125, 417000, 101250, 2790000000, 3825, 4200, 78300],
        delta: [825, 412.5, 1200, 375, 9000000, 7.5, 7.5, 180]
      },
      {
        range: [700, 799],
        reset: [315000, 157500, 525000, 135000, 3600000000, 4500, 4875, 94500],
        delta: [900, 450, 1200, 375, 9000000, 7.5, 7.5, 180]
      },
      {
        range: [800, 899],
        reset: [420000, 210000, 645000, 172500, 4500000000, 5250, 5625, 112500],
        delta: [1500, 750, 1200, 375, 21000000, 37.5, 37.5, 180]
      },
      {
        range: [900, 999],
        reset: [600000, 300000, 765000, 210000, 6600000000, 9000, 9375, 130500],
        delta: [1800, 900, 1200, 375, 21000000, 37.5, 37.5, 180]
      },
      {
        range: [1000, 1099],
        reset: [808800, 420000, 885000, 247500, 8700000000, 12750, 13125, 148500],
        delta: [2100, 1050, 1200, 375, 21000000, 37.5, 37.5, 180]
      },
      {
        range: [1100, 1199],
        reset: [1050000, 525000, 1005000, 285000, 10800000000, 16500, 16875, 166500],
        delta: [2100, 1050, 1200, 375, 21000000, 37.5, 37.5, 180]
      },
      {
        range: [1200, 1209],
        reset: [880000, 420000, 750000, 215000, 4300000000, 20250, 20625, 184500],
        delta: [1500, 700, 800, 250, 7000000, 37.5, 37.5, 180]
      }
    ]
  }

  static create (monsterType, monsterLevel, monsterClass, monsterRuneType = 0, monsterRuneValue = 0) {
    const base = this.#DELTA[monsterType === this.MONSTER_RAID ? this.MONSTER_NORMAL : monsterType].find((entry) => monsterLevel >= entry.range[0] && monsterLevel <= entry.range[1]);

    const delta = monsterLevel - base.range[0];

    const [
      resetMain, resetSide, resetCon, resetLuck, resetHealth, resetMin, resetMax, resetArmor
    ] = base.reset;

    const [
      deltaMain, deltaSide, deltaCon, deltaLuck, deltaHealth, deltaMin, deltaMax, deltaArmor
    ] = base.delta;

    const multipliers = this.#MULTIPLIERS[monsterType];

    const main = (resetMain + deltaMain * delta) * multipliers.Default;
    const side = (resetSide + deltaSide * delta) * multipliers.Default;
    const con = (resetCon + deltaCon * delta) * multipliers.Default;
    const luck = (resetLuck + deltaLuck * delta) * multipliers.Default;
    const health = (resetHealth + deltaHealth * delta) * multipliers.Health;
    const min = Math.round(resetMin + deltaMin * delta) * multipliers.Default;
    const max = Math.round(resetMax + deltaMax * delta) * multipliers.Default;
    const armor = resetArmor + deltaArmor * delta;

    const model = {
      NoBaseDamage: true,
      NoGladiator: true,
      Level: monsterLevel,
      Class: monsterClass,
      Armor: (armor === -1 ? monsterLevel * CONFIG.fromID(monsterClass).MaximumDamageReduction : armor) * multipliers.Default,
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
      const name = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[CONFIG.fromID(monsterClass).Attribute][i];

      model[name] = {
        Total: i === 0 ? main : side
      }
    }

    return model;
  }

  static createVariantsOf (monster, classList, runeList, flags = { updateRuneResistance: false, updateDamage: true, updateHealth: true }) {
    const variants = []

    const oldDefinition = CONFIG.fromID(monster.Class);
    const oldattributes = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[oldDefinition.Attribute].map((kind) => _dig(monster, kind)).map((att) => ({ Total: att.Total }));

    for (let i = 0; i < classList.length; i++) {
      const newDefinition = CONFIG.fromID(classList[i]);

      const classVariant = mergeDeep({}, monster)

      const newAttributes = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[newDefinition.Attribute];

      for (let i = 0; i < 3; i++) {
        classVariant[newAttributes[i]]['Total'] = oldattributes[i]['Total'];
      }

      classVariant.Armor = _scale(monster.Armor, oldDefinition.MaximumDamageReduction, newDefinition.MaximumDamageReduction);

      if (flags.updateDamage) {
        classVariant.Items.Wpn1.DamageMin = _scale(monster.Items.Wpn1.DamageMin, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier);
        classVariant.Items.Wpn1.DamageMax = _scale(monster.Items.Wpn1.DamageMax, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier);
      }

      if (monster.Health && flags.updateHealth) {
        classVariant.Health = _scale(monster.Health, oldDefinition.HealthMultiplier, newDefinition.HealthMultiplier);
      }

      if (classList[i] == WARRIOR) {
        classVariant.BlockChance = newDefinition.SkipChance * 100;

        classVariant.Items.Wpn2 = ItemModel.empty();
        classVariant.Items.Wpn2.DamageMin = newDefinition.SkipChance * 100;
      } else if (classList[i] == ASSASSIN) {
        classVariant.Items.Wpn2 = classVariant.Items.Wpn1;
      }

      classVariant.Class = classList[i];

      for (let j = 0; j < runeList.length; j++) {
        const variant = mergeDeep({}, classVariant)

        variant.Items.Wpn1.AttributeTypes = { 2: runeList[j] }

        if (variant.Class === ASSASSIN) {
          variant.Items.Wpn2.AttributeTypes = { 2: runeList[j] }
        }

        if (flags.updateRuneResistance) {
          const maxResistance = Math.max(
            monster.Runes.ResistanceFire,
            monster.Runes.ResistanceCold,
            monster.Runes.ResistanceLightning
          )

          variant.Runes.ResistanceFire = runeList[j] === RUNE_FIRE_DAMAGE ? maxResistance : 0
          variant.Runes.ResistanceCold = runeList[j] === RUNE_COLD_DAMAGE ? maxResistance : 0
          variant.Runes.ResistanceLightning = runeList[j] === RUNE_LIGHTNING_DAMAGE ? maxResistance : 0
        }

        variants.push(variant)
      }
    }

    return variants;
  }
}