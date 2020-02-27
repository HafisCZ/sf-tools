function getRune (weapon, rune) {
    if (weapon.AttributeTypes[2] == rune) {
        return weapon.Attributes[2];
    } else {
        return 0;
    }
}

class FSModel {
    constructor (player) {
        this.model = player;

        this.health = player.getHealth();
        this.weapon1 = player.Items.Wpn1;
        if (player.Class == 4) {
            this.weapon2 = player.Items.Wpn2;
        }

        this.first = player.Items.Hand.HasEnchantment;
        this.secondAttackChance = player.Class == 6 ? 50 : 0;
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

class FSBattle {
    constructor (modelA, modelB) {
        this.modelA = modelA;
        this.modelB = modelB;
    }

    fight () {
        // Create fight models
        var a = new FSModel(this.modelA);
        a.p = 0;

        var b = new FSModel(this.modelB);
        b.p = 1;

        // Create damage ranges
        a.range1 = a.getDamageRange(a.weapon1, b);
        b.range1 = b.getDamageRange(b.weapon1, a);

        a.crit1 = a.getCriticalMultiplier(a.weapon1);
        b.crit1 = b.getCriticalMultiplier(b.weapon1);

        a.skipchance = a.getSkipChance(b);
        b.skipchance = b.getSkipChance(a);

        a.critchance = a.getCriticalChance(b);
        b.critchance = b.getCriticalChance(a);

        if (a.weapon2) {
            a.range2 = a.getDamageRange(a.weapon2, b);
            a.crit2 = a.getCriticalMultiplier(a.weapon2);
        }

        if (b.weapon2) {
            b.range2 = b.getDamageRange(b.weapon2, a);
            b.crit2 = b.getCriticalMultiplier(b.weapon2);
        }

        // Decide who starts first
        var afirst = (a.first == b.first) ? rand(50) : a.first;
        if (afirst == false) {
            var c = a;
            a = b;
            b = c;
        }

        // Turns
        var turn = 0;

        // Special damage for first round only
        var as = a.getSpecialDamage(b);
        var bs = b.getSpecialDamage(a);
        if (as >= 0 || bs >= 0) {
            turn++;

            if (as > 0) {
                b.health -= as;
            }

            if (bs > 0) {
                a.health -= bs;
            }
        }

        // Run until someone is dead
        while (a.health > 0 && b.health > 0) {
            turn = this.attack(turn, a, b);
            if (b.health > 0) {
                turn = this.attack(turn, b, a);
            }
        }

        return a.health > 0 ? a.p : b.p;
    }

    attack (turn, a, b) {
        // First attack
        if (!rand(b.skipchance)) {
            b.health -= (1 + turn++ / 6) * (rand(a.critchance) ? a.crit1 : 1) * (a.range1.min + Math.random() * (a.range1.max - a.range1.min + 1));
        }

        // Second attack from assassin
        if (a.weapon2) {
            if (!rand(b.skipchance)) {
                b.health -= (1 + turn++ / 6) * (rand(a.critchance) ? a.crit2 : 1) * (a.range2.min + Math.random() * (a.range2.max - a.range2.min + 1));
            }
        }

        // Second attack from berserker
        if (rand(a.model.secondAttackChance)) {
            if (!rand(b.skipchance)) {
                b.health -= (1 + turn++ / 6) * (rand(a.critchance) ? a.crit1 : 1) * (a.range1.min + Math.random() * (a.range1.max - a.range1.min + 1));
            }
        }

        return turn;
    }
}
