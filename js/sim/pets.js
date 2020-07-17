const SimulatorType = {
    Pet: 1,
    PetMap: 2,
    PlayerAll: 3,
    PlayerOne: 4,
    PlayerTournament: 5,
    Guild: 6,
    Dungeon: 7,
    PetPath: 8
}

const WARRIOR = 1;
const MAGE = 2;
const SCOUT = 3;

function getRandom (success) {
    return success > 0 && (Math.random() * 100 < success);
}

self.addEventListener('message', function (message) {
    var ts = Date.now();

    // Sent vars
    var player = message.data.player;
    var players = message.data.players;
    var mode = message.data.mode;
    var iterations = message.data.iterations || 100000;

    var tracking = message.data.tracking || 0;

    // Sim type decision
    if (mode == SimulatorType.Pet) {
        var r = new PetSimulator().simulate(players[0], players[1]);
        self.postMessage({
            command: 'finished',
            results: r,
            time: Date.now() - ts
        });
    } else if (mode == SimulatorType.PetMap) {
        var r = [];
        var obj = players[0];

        var orig = obj.Level;
        var p100 = obj.At100 + 1;

        for (var level = Math.min(99, Math.max(0, obj.Level - 1)); level < 100; level++) {
            obj.Level = level + 1;

            if (obj.Level == 100 && orig != 100) {
                obj.At100 = p100;
            }

            if (!r[level]) {
                r[level] = [];
            }

            obj.Gladiator = 15;
            r[level][15] = new PetSimulator().simulate(obj, players[1], 1E5);

            if (r[level][15] == 0) {
                for (var i = 0; i < 15; i++) {
                    r[level][i] = 0;
                }
            } else {
                for (var glad = 14; glad >= 0; glad--) {
                    obj.Gladiator = glad;

                    r[level][glad] = new PetSimulator().simulate(obj, players[1], 1E5);
                    if (r[level][glad] > r[level][glad + 1]) {
                        r[level][glad] = r[level][glad + 1];
                    }
                }
            }

            if (r[level][0] >= 50) {
                break;
            }
        }

        self.postMessage({
            command: 'finished',
            results: r,
            time: Date.now() - ts,
            tracking: tracking
        });
    } else if (mode === SimulatorType.PetPath) {
        var pets = [];

        for (var i = 0; i < 19; i++) {
            if (players[i].Role != 2) {
                continue;
            }

            var pet = {
                Pet: i,
                Gladiator: players[i].Glad,
                Fights: []
            };

            if (pets.length == 0 && i != 0) {
                for (var j = 0; j <= i; j++) {
                    pet.Fights.push({
                        Target: j,
                        Gladiator: 0,
                        Pack: players.reduce((total, p, k) => total + (k < j && k < i && p.Role ? 1 : 0), 1)
                    });
                }
            }

            for (var j = i + 1; j < 19; j++) {
                pet.Fights.push({
                    Target: j,
                    Gladiator: pet.Gladiator,
                    Pack: players.reduce((total, p, k) => total + (k < j && p.Role ? 1 : 0), 0)
                });

                if (j == 18) {
                    pet.Fights.push({
                        Target: 19,
                        Gladiator: pet.Gladiator,
                        Pack: players.reduce((total, p) => total + (p.Role ? 1 : 0), 0)
                    });
                }

                if (players[j].Role == 2) {
                    break;
                }
            }

            pets.push(pet);
        }

        var type = players.Type;
        var win = players.Threshold;
        var food = 0;
        var at100 = 0;
        var defeats = [];

        for (var pet of pets) {
            var level = 1;

            for (var fight of pet.Fights) {
                for (; level <= 100; level++) {
                    var r = new PetSimulator().simulate({
                        Boss: false,
                        Index: 0,
                        Type: type,
                        Pet: pet.Pet,
                        Level: level,
                        At100: at100,
                        At200: 0,
                        Pack: fight.Pack,
                        Gladiator: fight.Gladiator
                    }, {
                        Boss: true,
                        Index: 1,
                        Type: type,
                        Pet: fight.Target
                    }, 1E5);

                    if (r < win) {
                        if (level == 100) {
                            level = 0;
                            break;
                        }
                    } else {
                        break;
                    }
                }

                if (level == 100) {
                    at100++;
                } else if (level == 0) {
                    break;
                } else {
                    defeats[fight.Target] = level;
                }
            }

            if (level > 0) {
                food += level;
            } else {
                food = 0;
                break;
            }
        }

        self.postMessage({
            command: 'finished',
            results: food,
            time: Date.now() - ts,
            tracking: defeats
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

        // Vars
        this.Class = PET_CLASS_MAP[this.Type][this.Pet] + 1;
        this.Attribute = Math.trunc(PET_FACTOR_MAP[this.Pet] * (this.Level + 1) * (1 + this.Bonus / 100));
        this.DefenseAttribute = Math.trunc(this.Attribute / 2);
        this.TotalHealth = (this.Level + 1) * this.Attribute * (this.Class == WARRIOR ? 5 : (this.Class == MAGE ? 2 : 4));
    }

    initialize (target) {
        var multa = Math.trunc((this.Class == WARRIOR ? 2 : (this.Class == MAGE ? 4.5 : 2.5)) * (this.Level + 1));
        var multb = (1 + Math.max(this.Attribute / 2, this.Attribute - target.getDefenseAtribute(this)) / 10);
        var multc = (this.Boss == false && target.Boss == false && this.hasAdvantage(target)) ? 1.25 : 1;
        this.Damage = Math.trunc(multa * multb * multc);

        this.Critical = 2 * (1 + 0.05 * this.Gladiator);
        this.SkipChance = target.Class == MAGE ? 0 : (this.Class == WARRIOR ? 25 : (this.Class == MAGE ? 0 : 50));
        this.CriticalChance = Math.min(50, this.Attribute * 20 / 6 / target.Level);
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

    static getBonus (pack, at100, at200) {
        return 5 * Math.trunc(pack + at200 + at100 / 2);
    }

    static fromPet (boss, index, type, pet, level, pack, at100, at200, gladiator) {
        return new PetModel(boss, index, type, pet, level, 5 * Math.trunc(pack + at100 / 2 + at200), gladiator);
    }

    static fromHabitat (boss, index, type, pet) {
        return new PetModel(boss, index, type, pet, PET_HABITAT_MAP[pet], 5 + 5 * pet, 0);
    }

    static fromObject (obj) {
        if (obj.Boss) {
            return PetModel.fromHabitat(obj.Boss, obj.Index, obj.Type, obj.Pet);
        } else {
            return PetModel.fromPet(obj.Boss, obj.Index, obj.Type, obj.Pet, obj.Level, obj.Pack, obj.At100, obj.At200, obj.Gladiator);
        }
    }
}

class PetSimulator {
    simulate (source, target, iterations = 1E7) {
        this.ca = PetModel.fromObject(source);
        this.cb = PetModel.fromObject(target);

        this.ca.initialize(this.cb);
        this.cb.initialize(this.ca);

        if ((this.ca.Class == MAGE || this.cb.Class == MAGE) && !this.fightPossible()) {
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
    fightPossible () {
        this.a = this.ca;
        this.b = this.cb;

        this.a.Health = this.a.TotalHealth;
        this.b.Health = this.b.TotalHealth;

        this.turn = 0;

        while (this.a.Health > 0 && this.b.Health > 0) {
            var rage = 1 + this.turn++ / 6;

            this.b.Health -= rage * this.a.Damage * this.a.Critical;
            if (this.b.Health <= 0) {
                return true;
            }

            rage = 1 + this.turn++ / 6;
            this.a.Health -= rage * this.b.Damage;
            if (this.a.Health <= 0) {
                return false;
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
