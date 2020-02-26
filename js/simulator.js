class FSModel {
    constructor (player) {
        this.model = player;

        this.health = player.Health;
        this.weapon1 = player.Items.Wpn1;
        if (player.Class == 4) {
            this.weapon2 = player.Items.Wpn2;
        }

        this.first = player.Items.Hand.HasEnchantment;
        this.secondAttackChance = player.Class == 6 ? 50 : 0;
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

    getCriticalMultiplier (weapon, gladiator) {
        return 2 * (1 + gladiator * 0.05) * (weapon.HasEnchantment ? 1.05 : 1);
    }

    getDamageRange (weapon, target) {
        let multPhysical = target.model.getDamageReduction(this.model);
        let multFire = (1 - target.model.Runes.ResistanceFire / 100) * (weapon.getRune(RUNE.FIRE_DAMAGE) / 100);
        let multCold = (1 - target.model.Runes.ResistanceCold / 100) * (weapon.getRune(RUNE.COLD_DAMAGE) / 100);
        let multLightning = (1 - target.model.Runes.ResistanceLightning / 100) * (weapon.getRune(RUNE.LIGHTNING_DAMAGE) / 100);

        let mult = (1 + this.model.Dungeons.Group / 100) * multPhysical * (1 + multFire + multCold + multLightning);

        let attributeAttack = this.model.getPrimaryAttribute().Total;
        let attributeDefense = target.model.getDefenseAtribute(this.model).Total;

        let damageMultiplier = mult * (1 + attributeAttack / 10 - Math.min(attributeAttack / 2, attributeDefense / 2) / 10);

        return {
            min: damageMultiplier * weapon.DamageMin,
            max: damageMultiplier * weapon.DamageMax
        };
    }

    getSpecialDamage (target) {
        if (this.model.Class == 5 && (target.model.Class != 2 && target.model.Class != 5)) {
            return Math.min(target.getHealth(), this.getHealth()) / 3;
        } else {
            return 0;
        }
    }
}

function FSBattle {
    constructor (modelA, modelB) {
        this.modelA = modelA;
        this.modelB = modelB;
    }

    fight (glad1, glad2) {
        // Create fight models
        var a = new FSModel(this.modelA);
        var b = new FSModel(this.modelB);

        // Create damage ranges
        a.range1 = a.getDamageRange(a.weapon1, b);
        b.range1 = b.getDamageRange(b.weapon1, a);

        if (a.weapon2) {
            a.range2 = a.getDamageRange(a.weapon2, b);
        }

        if (b.weapon2) {
            b.range2 = b.getDamageRange(b.weapon2, a);
        }

        // Decide who starts first
        var afirst = (a.first == b.first) ? rand(50) : a.first;
        if (afirst == false) {
            var c = a;
            a = b;
            b = c;
        }

        // Turns
        var turn = 1;

        // Special damage for first round only
        var sdmg = a.getSpecialDamage(b);
        of (sdmg) {
            b.health -= sdmg;
            turn++;
        }

        // Run until someone is dead
        while (a.health && b.health) {
            this.attack(turn++, a, b);
        }

        return a.health ? a : b;
    }

    attack (turn, a, b) {

    }
}
