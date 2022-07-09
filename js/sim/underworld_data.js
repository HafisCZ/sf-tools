const UnderworldUnits = new (class {
    getUnitCount (building, values) {
        if (building == 0) {
            return 0;
        } else if (building - 1 > values.length) {
            return values[values.length - 1];
        } else {
            return values[building - 1];
        }
    }

    getUnitLevel (building, upgrades) {
        return [12, 15, 20, 30, 40, 55, 70, 85, 100, 120, 140, 165, 190, 220, 250][building - 1] + upgrades;
    }

    createUnits (building, upgrades, counts, attributeMultiplier, shieldMode) {
        let units = [];

        let count = this.getUnitCount(building, counts);
        let level = this.getUnitLevel(building, upgrades);

        for (let i = 0; i < count; i++) {
            let cappedLevel = Math.min(600, level);

            let attribute = Math.round((level > 500 ? (408.5 * Math.max(0, level - 500) + KeeperCurve[500]) : KeeperCurve[level]) * attributeMultiplier);
            let luck = Math.min(49815, Math.ceil(attribute / 2));

            let damage = (cappedLevel + 1) * 2;

            units.push({
                Level: cappedLevel,
                Class: 1,
                NoBaseDamage: true, // Keep damage even if too low
                ForceArmor: 1, // Calculate armor for level
                BlockChance: shieldMode ? 25 : 0,
                Potions: {
                    Life: 0
                },
                Strength: {
                    Total: attribute
                },
                Dexterity: {
                    Total: attribute
                },
                Intelligence: {
                    Total: attribute
                },
                Constitution: {
                    Total: attribute
                },
                Luck: {
                    Total: luck
                },
                Dungeons: {
                    Player: 0,
                    Group: 0
                },
                Runes: {
                    Health: 0,
                    ResistanceFire: 0,
                    ResistanceCold: 0,
                    ResistanceLightning: 0
                },
                Fortress: {
                    Gladiator: 0
                },
                Items: {
                    Hand: {},
                    Wpn1: {
                        AttributeTypes: { 2: 0 },
                        Attributes: { 2: 0 },
                        DamageMax: damage,
                        DamageMin: damage,
                        HasEnchantment: false
                    }
                }
            });
        }

        return units;
    }

    fromEditor (data, shieldMode) {
        let goblins = this.createUnits(data.GoblinPit, data.GoblinUpgrades, [1, 2, 3, 4, 5], 1 / Math.sqrt(5), shieldMode);
        let trolls = this.createUnits(data.TrollBlock, data.TrollUpgrades, [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4], 0.5, shieldMode);
        let keepers = this.createUnits(data.Keeper, data.KeeperUpgrades, [1], 1, shieldMode);

        return [...goblins, ...trolls, ...keepers];
    }
})();
