const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;

function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

self.addEventListener('message', function ({ data: { players, mode, iterations } }) {
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

const Habitat = {
    Shadow: 0,
    Light: 1,
    Earth: 2,
    Fire: 3,
    Water: 4
}

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

class PetModel {
    constructor (boss, index, type, pet, level, bonus, gladiator) {
        this.Index = index;

        // Sets
        this.Type = type;
        this.Pet = pet;
        this.Level = level;
        this.Bonus = bonus;
        this.Gladiator = gladiator;
        this.Boss = boss;

        let multiplier = (this.Level + 1) * (1 + this.Bonus / 100);

        // Vars
        this.Class = PET_CLASS_MAP[this.Type][this.Pet] + 1;
        this.Attribute = Math.trunc(PET_FACTOR_MAP[this.Pet] * multiplier);
        this.DefenseAttribute = Math.trunc(this.Attribute * 0.5);
        this.LuckAttribute = Math.trunc(PET_FACTOR_MAP_LUCK[this.Pet] * multiplier);
        this.TotalHealth = (this.Level + 1) * this.Attribute * (this.Class == WARRIOR ? 5 : (this.Class == MAGE ? 2 : 4));
        this.Armor = this.Level * (this.Class == WARRIOR ? 50 : (this.Class == SCOUT ? 25 : 10));
    }

    initialize (target) {
        var multa = Math.trunc((this.Class == WARRIOR ? 2 : (this.Class == MAGE ? 4.5 : 2.5)) * (this.Level + 1));
        var multb = (1 + Math.max(this.Attribute / 2, this.Attribute - target.getDefenseAtribute(this)) / 10);
        var multc = (this.Boss == false && target.Boss == false && this.hasAdvantage(target)) ? 1.25 : 1;

        var ap = target.Armor / this.Level;
        if (this.Class == MAGE) {
            ap = 0;
        } else if (target.Class == MAGE) {
            ap = Math.min(10, ap);
        } else if (target.Class == WARRIOR) {
            ap = Math.min(50, ap);
        } else if (target.Class == SCOUT) {
            ap = Math.min(25, ap);
        }

        this.Damage = Math.trunc(multa * multb * multc * (1 - ap / 100));
        this.Critical = 2 * (1 + 0.05 * this.Gladiator);
        this.SkipChance = target.Class == MAGE ? 0 : (this.Class == WARRIOR ? 25 : (this.Class == MAGE ? 0 : 50));
        this.CriticalChance = Math.min(50, 5 * this.LuckAttribute / (target.Level * 2));
    }

    hasAdvantage (target) {
        switch (this.Type) {
            case Habitat.Shadow: return target.Type == Habitat.Water;
            case Habitat.Light: return target.Type == Habitat.Shadow;
            case Habitat.Earth: return target.Type == Habitat.Light;
            case Habitat.Fire: return target.Type == Habitat.Earth;
            case Habitat.Water: return target.Type == Habitat.Fire;
            default: return false;
        }
    }

    getDefenseAtribute (source) {
        return (this.Class == source.Class ? this.Attribute : this.DefenseAttribute) / 2;
    }

    static getBonus (pack, at100, at150, at200) {
        return 5 * Math.trunc(pack + at200 + at150 * 0.75 + at100 * 0.5);
    }

    static fromPet (boss, index, type, pet, level, pack, at100, at150, at200, gladiator) {
        return new PetModel(boss, index, type, pet, level, PetModel.getBonus(pack, at100, at150, at200), gladiator);
    }

    static fromHabitat (boss, index, type, pet) {
        return new PetModel(boss, index, type, pet, PET_HABITAT_MAP[pet], 5 + 5 * pet, 0);
    }

    static fromObject (obj) {
        if (obj.Boss) {
            return PetModel.fromHabitat(obj.Boss, obj.Index, obj.Type, obj.Pet);
        } else {
            return PetModel.fromPet(obj.Boss, obj.Index, obj.Type, obj.Pet, obj.Level, obj.Pack, obj.At100, obj.At150, obj.At200, obj.Gladiator);
        }
    }
}

class PetSimulator {
    simulate (source, target, iterations) {
        this.ca = PetModel.fromObject(source);
        this.cb = PetModel.fromObject(target);

        this.ca.initialize(this.cb);
        this.cb.initialize(this.ca);

        if ((this.ca.Class == MAGE || this.cb.Class == MAGE) && !this.fightPossible() && !this.fightPossible(true)) {
            return 0;
        } else {
            var score = 0;
            for (var i = 0; i < iterations; i++) {
                score += this.fight();
            }

            return score / (iterations / 100);
        }
    }

    // Checks whether the fight is even possible or not for mage vs x class. Thanks to burningcherry for the idea & code example.
    fightPossible (enemyStarts = false) {
        this.a = this.ca;
        this.b = this.cb;
        if (enemyStarts) {
            [this.b, this.a] = [this.a, this.b];
        }

        this.a.Health = this.a.TotalHealth;
        this.b.Health = this.b.TotalHealth;

        this.turn = 0;

        while (this.a.Health > 0 && this.b.Health > 0) {
            var rage = 1 + this.turn++ / 6;

            this.b.Health -= rage * this.a.Damage * (enemyStarts ? 1 : this.a.Critical);
            if (this.b.Health <= 0) {
                return !enemyStarts;
            }

            rage = 1 + this.turn++ / 6;
            this.a.Health -= rage * this.b.Damage * (enemyStarts ? this.b.Critical : 1);
            if (this.a.Health <= 0) {
                return enemyStarts;
            }
        }
    }

    fight () {
        this.a = this.ca;
        this.b = this.cb;

        this.a.Health = this.a.TotalHealth;
        this.b.Health = this.b.TotalHealth;

        this.turn = 0;

        if (getRandom(50)) {
            [this.a, this.b] = [this.b, this.a];
        }

        while (this.a.Health > 0 && this.b.Health > 0) {
            if (!this.attack(this.a, this.b)) {
                break;
            }

            [this.a, this.b] = [this.b, this.a];
        }

        return (this.a.Health > 0 ? this.a.Index : this.b.Index) == 0;
    }

    attack (source, target) {
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        if (!getRandom(target.SkipChance)) {
            target.Health -= rage * source.Damage * (getRandom(source.CriticalChance) ? source.Critical : 1);
            return target.Health > 0;
        } else {
            return true;
        }
    }
}
