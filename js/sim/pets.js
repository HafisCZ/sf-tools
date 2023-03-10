self.addEventListener('message', function ({ data: { players, mode, iterations } }) {
    FLAGS.set({
        NoGladiatorReduction: true
    });

    if (mode == 'pet') {
        self.postMessage({
            results: new PetSimulator().simulate(players[0], players[1], iterations)
        });
    } else if (mode == 'map') {
        var r = [];
        var obj = players[0];

        var orig = obj.Level;
        var p100 = obj.At100 + 1;

        let origGladiator = obj.Gladiator;

        for (var level = Math.min(99, Math.max(0, obj.Level - 1)); level < 100; level++) {
            obj.Level = level + 1;

            if (obj.Level == 100 && orig != 100) {
                obj.At100 = p100;
            }

            if (!r[level]) {
                r[level] = [];
            }

            obj.Gladiator = 15;
            r[level][15] = new PetSimulator().simulate(obj, players[1], iterations);

            if (r[level - 1] != undefined) {
                if (r[level - 1][15] > r[level][15]) {
                    r[level][15] = r[level - 1][15];
                }
            }

            if (r[level][15] == 0) {
                for (var i = origGladiator; i < 15; i++) {
                    r[level][i] = 0;
                }
            } else {
                for (var glad = 14; glad >= origGladiator; glad--) {
                    obj.Gladiator = glad;

                    r[level][glad] = new PetSimulator().simulate(obj, players[1], iterations);
                    if (r[level][glad] > r[level][glad + 1]) {
                        r[level][glad] = r[level][glad + 1];
                    }

                    if (r[level - 1] != undefined) {
                        if (r[level - 1][glad] > r[level][glad]) {
                            r[level][glad] = r[level - 1][glad];
                        }
                    }
                }
            }

            if (r[level][origGladiator] >= 50) {
                break;
            }
        }

        self.postMessage({
            results: r
        });
    }

    self.close();
});

const HABITAT_SHADOW = 0;
const HABITAT_LIGHT = 1;
const HABITAT_EARTH = 2;
const HABITAT_FIRE = 3;
const HABITAT_WATER = 4;

const PET_CLASS_MAP = [
    [
        2, 0, 0, 1, 1,
        1, 2, 2, 2, 0,
        1, 1, 2, 2, 0,
        0, 1, 0, 0, 2
    ],
    [
        0, 0, 1, 1, 2,
        2, 1, 0, 0, 1,
        1, 2, 2, 1, 1,
        0, 0, 0, 1, 2
    ],
    [
        0, 0, 2, 2, 0,
        2, 1, 1, 0, 0,
        2, 0, 2, 2, 1,
        1, 1, 0, 0, 0
    ],
    [
        2, 2, 0, 1, 1,
        2, 2, 1, 0, 1,
        1, 2, 2, 2, 2,
        2, 1, 0, 1, 0
    ],
    [
        1, 0, 0, 0, 0,
        2, 0, 2, 2, 0,
        1, 1, 1, 0, 1,
        1, 0, 1, 0, 2
    ]
];

const PET_FACTOR_MAP = [
    10, 11, 12, 13, 14, 16, 18, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100, 130, 160, 160
];

const PET_FACTOR_MAP_LUCK = [
    7.5, 8.5, 9.0, 9.5, 10.5, 12.0, 13.5, 15.0, 19.0, 22.5, 26.0, 30.0, 37.5, 45.0, 52.5, 60.0, 75, 97.5, 120, 120
];

const PET_HABITAT_MAP = [
    1, 3, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 75
];

FighterModel.prototype.hasAdvantage = function (target) {
    if (this.Player.Boss || target.Player.Boss) {
        return false;
    } else {
        switch (this.Player.Type) {
            case HABITAT_SHADOW: return target.Player.Type == HABITAT_WATER;
            case HABITAT_LIGHT: return target.Player.Type == HABITAT_SHADOW;
            case HABITAT_EARTH: return target.Player.Type == HABITAT_LIGHT;
            case HABITAT_FIRE: return target.Player.Type == HABITAT_EARTH;
            case HABITAT_WATER: return target.Player.Type == HABITAT_FIRE;
            default: return false;
        }
    }
}

FighterModel.prototype.getBaseDamage = function () {
    const damage = Math.trunc((this.Player.Level + 1) * this.getWeaponDamageMultiplier());

    return {
        Min: damage,
        Max: damage
    }
}

FighterModel.prototype.getDamageMultiplier = function (target) {
    const multiplier = this.Config.DamageMultiplier || 1;

    if (this.hasAdvantage(target)) {
        return multiplier * 1.25;
    } else {
        return multiplier;
    }
}

class PetModel {
    static normalize (boss, type, pet, level, bonus, gladiator) {
        const klass = PET_CLASS_MAP[type][pet] + 1;
        const multiplier = (level + 1) * (1 + bonus / 100);

        const main = Math.trunc(PET_FACTOR_MAP[pet] * multiplier);
        const luck =  Math.trunc(PET_FACTOR_MAP_LUCK[pet] * multiplier);

        const config = CONFIG.fromIndex(klass);

        const getAttribute = (type) => {
            return type === config.Attribute ? main : Math.trunc(main / 2);
        }

        return {
            Boss: boss,
            Type: type,
            Pet: pet,
            Class: klass,
            Level: level,
            Armor: level * config.MaximumDamageReduction,
            Strength: {
                Total: getAttribute('Strength')
            },
            Dexterity: {
                Total: getAttribute('Dexterity')
            },
            Intelligence: {
                Total: getAttribute('Intelligence')
            },
            Constitution: {
                Total: main
            },
            Luck: {
                Total: luck
            },
            Fortress: {
                Gladiator: gladiator
            }
        };
    }

    static getBonus (pack, at100, at150, at200) {
        return 5 * Math.trunc(pack + at200 + at150 * 0.75 + at100 * 0.5);
    }

    static fromHabitat (type, pet) {
        const level = PET_HABITAT_MAP[pet];
        const bonus = 5 + 5 * pet;

        return PetModel.normalize(true, type, pet, level, bonus, 0);
    }

    static fromPet (type, pet, level, pack, at100, at150, at200, gladiator) {
        const bonus = PetModel.getBonus(pack, at100, at150, at200);

        return PetModel.normalize(false, type, pet, level, bonus, gladiator);
    }

    static fromObject (obj, index = 0) {
        const object = obj.Boss ?
            PetModel.fromHabitat(obj.Type, obj.Pet) :
            PetModel.fromPet(obj.Type, obj.Pet, obj.Level, obj.Pack, obj.At100, obj.At150, obj.At200, obj.Gladiator);

        return FighterModel.create(index, object);
    }
}

class PetSimulator extends SimulatorBase {
    simulate (source, target, iterations) {
        this.cache(source, target);

        if ((this.ca.Player.Class == MAGE || this.cb.Player.Class == MAGE) && !this.fightPossible() && !this.fightPossible(true)) {
            return 0;
        } else {
            let score = 0;
            for (let i = 0; i < iterations; i++) {
                score += this.fight();
            }

            return score / (iterations / 100);
        }
    }

    cache (source, target) {
        this.ca = PetModel.fromObject(source, 0);
        this.cb = PetModel.fromObject(target, 1);

        FighterModel.initializeFighters(this.ca, this.cb);
    }

    fight () {
        this.a = this.ca;
        this.b = this.cb;

        this.a.reset();
        this.b.reset();

        return super.fight();
    }

    // Checks whether the fight is even possible or not for mage vs x class. Thanks to burningcherry for the idea & code example.
    fightPossible (enemyStarts = false) {
        this.a = this.ca;
        this.b = this.cb;

        if (enemyStarts) {
            [this.b, this.a] = [this.a, this.b];
        }
        
        this.a.reset();
        this.b.reset();
        
        this.turn = 0;

        while (this.a.Health > 0 && this.b.Health > 0) {
            let rage = 1 + this.turn++ / 6;

            this.b.Health -= rage * this.a.Weapon1.Min * (enemyStarts ? 1 : this.a.CriticalMultiplier);
            if (this.b.Health <= 0) {
                return !enemyStarts;
            }

            rage = 1 + this.turn++ / 6;
            this.a.Health -= rage * this.b.Weapon1.Min * (enemyStarts ? this.b.CriticalMultiplier : 1);
            if (this.a.Health <= 0) {
                return enemyStarts;
            }
        }
    }
}
