class MonsterGenerator {
  static MONSTER_NORMAL = Symbol();
  static MONSTER_RAID = Symbol();
  static MONSTER_DRIVING_BOSS = Symbol();

  static DELTA = {
    [this.MONSTER_NORMAL]: [
      {
        range: [10, 199],
        reset: [100, 50, 100, 50, 2000, 50, 75, -1],
        delta: [20, 10, 20, 10, 2000, 2, 2, 0]
      },
      {
        range: [200, 399],
        reset: [5000, 2500, 5500, 2500, 1000000, 500, 750, -1],
        delta: [120, 60, 500, 60, 1500000, 4, 4, 0]
      },
      {
        range: [400, 499],
        reset: [30000, 15000, 110000, 15000, 300000000, 1500, 1750, -1],
        delta: [450, 250, 800, 250, 3000000, 5, 5, 0]
      },
      {
        range: [500, 599],
        reset: [80000, 40000, 190000, 40000, 600000000, 2000, 2250, -1],
        delta: [500, 250, 800, 250, 3000000, 5, 5, 0]
      },
      {
        range: [600, 699],
        reset: [140000, 70000, 270000, 65000, 900000000, 2500, 2750, -1],
        delta: [550, 275, 800, 250, 3000000, 5, 5, 0]
      },
      {
        range: [700, 799],
        reset: [210000, 105000, 350000, 90000, 1200000000, 3000, 3250, -1],
        delta: [600, 300, 800, 250, 3000000, 5, 5, 0]
      },
      {
        range: [800, 899],
        reset: [280000, 140000, 430000, 115000, 1500000000, 3500, 3750, -1],
        delta: [1000, 500, 800, 250, 7000000, 25, 25, 0]
      },
      {
        range: [900, 999],
        reset: [400000, 200000, 510000, 140000, 2200000000, 6000, 6250, -1],
        delta: [1200, 600, 800, 250, 7000000, 25, 25, 0]
      },
      {
        range: [1000, 1009],
        reset: [540000, 280000, 590000, 165000, 2900000000, 8500, 8750, -1],
        delta: [1300, 700, 800, 250, 7000000, 25, 25, 0]
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
        range: [1000, 1009],
        reset: [808800, 420000, 885000, 247500, 8700000000, 12750, 13125, 148500],
        delta: [2100, 1050, 1200, 375, 21000000, 37.5, 37.5, 180]
      }
    ],
    [this.MONSTER_DRIVING_BOSS]: [
      {
        range: [10, 199],
        reset: [80, 40, 81.5, 40, -1, 40, 60, -1],
        delta: [16, 8, 4.5, 8, 0, 1.6, 1.6, 0]
      },
      {
        range: [200, 399],
        reset: [4000, 2000, 6000, 2000, -1, 400, 600, -1],
        delta: [96, 48, 600, 48, 1200000, 3.2, 3.2, 0]
      },
      {
        range: [400, 499],
        reset: [24000, 12000, 132000, 12000, -1, 1200, 1400, -1],
        delta: [360, 200, 960, 200, 0, 4, 4, 0]
      },
      {
        range: [500, 599],
        reset: [64000, 32000, 228000, 32000, -1, 1600, 1800, -1],
        delta: [400, 200, 960, 200, 0, 4, 4, 0]
      },
      {
        range: [600, 699],
        // TODO: Health
        reset: [112000, 56000, 216000, 52000, -1, 2000, 2200, -1],
        delta: [440, 220, 640, 200, 0, 4, 4, 0]
      },
      {
        range: [700, 799],
        // TODO: Health
        reset: [168000, 84000, 280000, 72000, -1, 2400, 2600, -1],
        delta: [480, 240, 640, 200, 0, 4, 4, 0]
      },
      {
        range: [800, 899],
        // TODO: Health
        reset: [224000, 112000, 344000, 92000, -1, 2800, 3000, -1],
        delta: [800, 400, 640, 200, 0, 20, 20, 0]
      },
      {
        range: [900, 999],
        // TODO: Health
        reset: [320000, 160000, 408000, 112000, -1, 4800, 5000, -1],
        delta: [960, 480, 640, 200, 0, 20, 20, 0]
      },
      {
        range: [1000, 1009],
        // TODO: Health
        reset: [432000, 224000, 472000, 132000, -1, 6800, 7000, -1],
        delta: [1040, 560, 640, 200, 0, 20, 20, 0]
      }
    ]
  }

  static create (monsterType, monsterLevel, monsterClass, monsterRuneType = 0, monsterRuneValue = 0) {
    const base = this.DELTA[monsterType].find((entry) => monsterLevel >= entry.range[0] && monsterLevel <= entry.range[1]);

    const delta = monsterLevel - base.range[0];

    const [
      resetMain, resetSide, resetCon, resetLuck, resetHealth, resetMin, resetMax, resetArmor
    ] = base.reset;

    const [
      deltaMain, deltaSide, deltaCon, deltaLuck, deltaHealth, deltaMin, deltaMax, deltaArmor
    ] = base.delta;

    const main = resetMain + deltaMain * delta;
    const side = resetSide + deltaSide * delta;
    const con = resetCon + deltaCon * delta;
    const luck = resetLuck + deltaLuck * delta;
    const health = resetHealth + deltaHealth * delta;
    const min = resetMin + deltaMin * delta;
    const max = resetMax + deltaMax * delta;
    const armor = resetArmor + deltaArmor * delta;

    const config = CONFIG.fromIndex(monsterClass);

    const model = {
      NoBaseDamage: true,
      Level: monsterLevel,
      Class: monsterClass,
      Armor: armor === -1 ? monsterLevel * config.MaximumDamageReduction : armor,
      Health: health === -1 ? (monsterLevel + 1) * con * config.HealthMultiplier : health,
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
      const name = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[config.Attribute][i];

      model[name] = {
        Total: i === 0 ? main : side
      }
    }

    return model;
  }

  static createVariantsOf (monster, classList, runeList, flags = { updateRuneResistance: false, updateDamage: true, updateHealth: true }) {
    const variants = []

    const oldDefinition = CONFIG.fromIndex(monster.Class);
    const oldattributes = PlayerModel.ATTRIBUTE_ORDER_BY_ATTRIBUTE[oldDefinition.Attribute].map((kind) => _dig(monster, kind)).map((att) => ({ Total: att.Total }));

    for (let i = 0; i < classList.length; i++) {
      const newDefinition = CONFIG.fromIndex(classList[i]);

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