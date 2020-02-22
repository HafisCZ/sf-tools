class FSModel {
    constructor (player) {
        this.model = player;
    }

    copy () {
        return new FSModel(this.model);
    }

    getCriticalChance (target) {
        return Math.min(50, this.model.Luck.Total * 2.5 / target.model.Level);
    }

    getCriticalMultiplier (gladiator) {
        return 2 * (1 + gladiator * 0.05) * (this.model.Items.Wpn1.HasEnchantment || this.model.Items.Wpn2.HasEnchantment ? 1.05 : 1);
    }

    getDamageRange (target) {
        var resistance = target.getResistance(this);

        let multPhysical = resistance / 100;
        let multFire = (1 - target.model.Runes.ResistanceFire / 100) * (this.model.Runes.DamageFire / 100);
        let multCold = (1 - target.model.Runes.ResistanceCold / 100) * (this.model.Runes.DamageCold / 100);
        let multLightning = (1 - target.model.Runes.ResistanceLightning / 100) * (this.model.Runes.DamageLightning / 100);

        let mult = (1 + this.model.Dungeons.Group / 100) * multPhysical * (1 + multFire + multCold + multLightning);

        let attributeAttack = this.model.getPrimaryAttribute().Total;
        let attributeDefense = target.model.getDefenseAtribute(this.model).Total;

        let damageMultiplier = mult * (1 + attributeAttack / 10 - Math.min(attributeAttack / 2, attributeDefense / 2) / 10);

        return {
            min: damageMultiplier * this.model.Damage.Min,
            max: damageMultiplier * this.model.Damage.Max
        };
    }

    getHealth () {
        var base = 1 + this.model.Level;
        base *= this.model.Constitution.Total;
        base *= 1 + this.model.Dungeons.Player / 100;
        base *= 1 + this.model.Runes.Health / 100;
        base *= this.model.Potions.Life ? 1.25 : 1;

        switch (this.model.Class) {
            case 1:
            case 5:
                return 5 * base;
            case 3:
            case 4:
            case 6:
                return 4 * base;
            case 2:
                return 2 * base;
            default:
                return 0;
        }
    }

    getResistance (source) {
        var resistance = this.model.Armor / source.model.Level;

        switch (this.model.Class) {
            case 1:
                return Math.min(50, resistance);
            case 2:
                return Math.min(10, resistance);
            case 3:
                return Math.min(25, resistance);
            case 4:
                return Math.min(25, resistance);
            case 5:
                return Math.min(50, resistance + 40);
            case 6:
                return Math.min(25, resistance / 2);
            default:
                return 0;
        }
    }

    getSpecialDamage (target) {
        if (this.model.Class == 5 && (target.model.Class != 2 && target.model.Class != 5)) {
            return Math.min(target.getHealth(), this.getHealth()) / 3;
        } else {
            return 0;
        }
    }

    getSecondAttackChance () {
        return this.model.Class == 6 ? 50 : 0;
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
}
