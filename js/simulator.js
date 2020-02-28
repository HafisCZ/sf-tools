// Get rune from weapon
function getRune (weapon, rune) {
    if (weapon.AttributeTypes[2] == rune) {
        return weapon.Attributes[2];
    } else {
        return 0;
    }
}

// Get random
function rand (perc) {
    return perc > 0 && (Math.random() * 100 < perc);
}

class FSModel {
    constructor (p, player) {
        this.p = p;
        this.model = player;

        this.health = player.getHealth();
        this.weapon1 = player.Items.Wpn1;
        if (player.Class == 4) {
            this.weapon2 = player.Items.Wpn2;
        }

        this.first = player.Items.Hand.HasEnchantment;
        this.secondAttack = player.Class == 6 ? 50 : 0;
    }

    getDefenseAtribute (source) {
        switch (source.model.Class) {
            case 1:
            case 5:
            case 6:
                return this.model.Strength;
            case 3:
            case 4:
                return this.model.Dexterity;
            case 2:
                return this.model.Intelligence;
            default:
                return { };
        }
    }

    getDamageReduction (source) {
        if (this.model.Class == 5) {
            return Math.min(10, this.model.Armor / source.model.Level) + 40;
        } else {
            return Math.min(this.getMaximumDamageReduction(), this.model.Armor / source.model.Level);
        }
    }

    getMaximumDamageReduction () {
        switch (this.model.Class) {
            case 1:
            case 5:
                return 50
            case 6:
            case 3:
            case 4:
                return 25;
            case 2:
                return 10;
            default:
                return 0;
        }
    }

    getSkipChance (source) {
        if (source.model.Class == 2) {
            return 0;
        } else {
            switch (this.model.Class) {
                case 1: return 25;
                case 3:
                case 4: return 50;
                default: return 0;
            }
        }
    }

    getCriticalChance (target) {
        return Math.min(50, this.model.Luck.Total * 2.5 / target.model.Level);
    }

    getCriticalMultiplier (weapon) {
        return 2 * (1 + this.model.Fortress.Gladiator * 0.05) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    getDamageRange (weapon, target) {
        let multPhysical = 1 - target.getDamageReduction(this) / 100;
        let multFire = (1 - target.model.Runes.ResistanceFire / 100) * (getRune(weapon, RUNE.FIRE_DAMAGE) / 100);
        let multCold = (1 - target.model.Runes.ResistanceCold / 100) * (getRune(weapon, RUNE.COLD_DAMAGE) / 100);
        let multLightning = (1 - target.model.Runes.ResistanceLightning / 100) * (getRune(weapon, RUNE.LIGHTNING_DAMAGE) / 100);

        let mult = (1 + this.model.Dungeons.Group / 100) * multPhysical * (1 + multFire + multCold + multLightning) * (this.model.Class == 2 && target.model.Class == 6 ? 2 : 1);

        let attributeAttack = this.model.getPrimaryAttribute().Total;
        let attributeDefense = target.getDefenseAtribute(this).Total;

        let damageMultiplier = mult * (1 + attributeAttack / 10 - Math.min(attributeAttack / 2, attributeDefense / 2) / 10);

        return {
            min: damageMultiplier * weapon.DamageMin,
            max: damageMultiplier * weapon.DamageMax
        };
    }

    getSpecialDamage (target) {
        if (this.model.Class == 5) {
            switch (target.model.Class) {
                case 1:
                case 3:
                case 4:
                case 6: {
                    return Math.min(target.health, this.health) / 3;
                }
                default: {
                    return 0;
                }
            }
        } else {
            return -1;
        }
    }
}

function runBattle (modelA, modelB) {
    var battle = new FSBattle(modelA, modelB);
    var wins = 0;
    for (var i = 0; i < 1E5; i++) {
        if (battle.fight() == 0) {
            wins++;
        }
    }

    var a = new FSModel(0, modelA);
    var b = new FSModel(1, modelB);
    a.weapon1.range = a.getDamageRange(a.weapon1, b);
    a.weapon1.crit = a.getCriticalMultiplier(a.weapon1);
    if (a.weapon2) {
        a.weapon2.range = a.getDamageRange(a.weapon2, b);
        a.weapon2.crit = a.getCriticalMultiplier(a.weapon2);
    }
    b.weapon1.range = b.getDamageRange(b.weapon1, a);
    b.weapon1.crit = b.getCriticalMultiplier(b.weapon1);
    if (b.weapon2) {
        b.weapon2.range = b.getDamageRange(b.weapon2, a);
        b.weapon2.crit = b.getCriticalMultiplier(b.weapon2);
    }
    a.skipchance = a.getSkipChance(b);
    a.critchance = a.getCriticalChance(b);
    b.skipchance = b.getSkipChance(a);
    b.critchance = b.getCriticalChance(a);
    a.special = a.getSpecialDamage(b);
    b.special = b.getSpecialDamage(a);

    return {
        wins: wins,
        example: battle.fight(true),
        a: a,
        b: b
    }
}

class FSBattle {
    constructor (modelA, modelB) {
        this.modelA = modelA;
        this.modelB = modelB;
    }

    fight (debug) {
        if (debug) {
            this.debug = [];
        }

        // Create fight models
        var a = new FSModel(0, this.modelA);
        var b = new FSModel(1, this.modelB);

        // Damage
        a.weapon1.range = a.getDamageRange(a.weapon1, b);
        a.weapon1.crit = a.getCriticalMultiplier(a.weapon1);
        if (a.weapon2) {
            a.weapon2.range = a.getDamageRange(a.weapon2, b);
            a.weapon2.crit = a.getCriticalMultiplier(a.weapon2);
        }

        b.weapon1.range = b.getDamageRange(b.weapon1, a);
        b.weapon1.crit = b.getCriticalMultiplier(b.weapon1);
        if (b.weapon2) {
            b.weapon2.range = b.getDamageRange(b.weapon2, a);
            b.weapon2.crit = b.getCriticalMultiplier(b.weapon2);
        }

        // Chances
        a.skipchance = a.getSkipChance(b);
        a.critchance = a.getCriticalChance(b);

        b.skipchance = b.getSkipChance(a);
        b.critchance = b.getCriticalChance(a);

        // Swap first & second
        var afirst = (a.first == b.first) ? rand(50) : a.first;
        if (afirst == false) {
            var c = a;
            a = b;
            b = c;
        }

        // Turn counter
        this.turn = 0;

        // Special damage for first round only
        var as = a.getSpecialDamage(b);
        var bs = b.getSpecialDamage(a);
        if (as >= 0 || bs >= 0) {
            this.turn++;

            if (as > 0) {
                b.health -= as;
            }

            if (bs > 0) {
                a.health -= bs;
            }

            if (as >= 0 && bs >= 0) {
                if (this.debug) {
                    this.debug.push({
                        turn: 0,
                        source: a,
                        target: b,
                        skipped: false,
                        critted: false,
                        rage: 1,
                        damage: 0
                    });
                }
            } else if (as >= 0) {
                if (this.debug) {
                    this.debug.push({
                        turn: 0,
                        source: a,
                        target: b,
                        skipped: false,
                        critted: false,
                        rage: 1,
                        damage: Math.trunc(as)
                    });
                }
            } else if (bs >= 0) {
                if (this.debug) {
                    this.debug.push({
                        turn: 0,
                        source: b,
                        target: a,
                        skipped: false,
                        critted: false,
                        rage: 1,
                        damage: Math.trunc(bs)
                    });
                }
            }
        }

        // Run until someone is dead
        while (a.health > 0 && b.health > 0) {
            this.attack(a, b);
            if (a.weapon2) {
                this.attack(a, b, a.weapon2);
            } else if (rand(a.secondAttack)) {
                this.attack(a, b);
            }

            if (b.health > 0) {
                this.attack(b, a);
                if (b.weapon2) {
                    this.attack(b, a, b.weapon2);
                } else if (rand(b.secondAttack)) {
                    this.attack(b, a);
                }
            }
        }

        if (this.debug) {
            return this.debug;
        } else {
            return a.health > 0 ? a.p : b.p;
        }
    }

    attack (source, target, weapon = source.weapon1) {
        var skipped = rand(target.skipchance);
        var critted = rand(source.critchance);
        var turn = this.turn++;
        var rage = 1 + turn / 6;

        var damage = rage * (Math.random() * (1 + weapon.range.max - weapon.range.min) + weapon.range.min);
        if (critted) {
            damage *= weapon.crit;
        }

        if (skipped) {
            damage = 0;
        } else {
            target.health -= damage;
        }

        if (this.debug) {
            this.debug.push({
                turn: turn,
                source: source,
                target: target,
                skipped: skipped,
                critted: critted,
                rage: rage.toFixed(2),
                damage: Math.trunc(damage)
            });
        }
    }
}
