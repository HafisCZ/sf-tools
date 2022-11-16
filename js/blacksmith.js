class Blacksmith {
    static upgradeType (type) {
        return {
            'normal_1': [1, 0, 0],
            'normal_2': [1, 1, 0],
            'epic_3': [21, 0, 0],
            'epic_5': [6, 0, 0]
        }[type];
    }

    static upgradeList (type, value, double) {
        let item = SFItem.empty();

        item.Type = 1;
        item.PicIndex = double ? 1000 : 1;
        item.Attributes[0] = value;
        item.AttributeTypes = Blacksmith.upgradeType(type);
        item.SellPrice.Gold = 1;

        let dismantleBase = item.getBlacksmithPrice();

        let upgradeTotal = { Metal: 0, Crystal: 0 };
        let reclaimedTotal = { Metal: 0, Crystal: 0 };

        let entries = [];
        for (let level = 1; level <= 20; level++) {
            let upgrade = item.getBlacksmithUpgradePrice();
            upgradeTotal.Metal += upgrade.Metal;
            upgradeTotal.Crystal += upgrade.Crystal;

            let dismantleLast = item.getBlacksmithPrice();
            let attributeLast = item.Attributes[0];
            item.upgradeTo(level);

            let dismantle = item.getBlacksmithPrice();
            let attribute = item.Attributes[0];

            let dismantleTotal = {
                Metal: dismantle.Metal - dismantleBase.Metal,
                Crystal: dismantle.Crystal - dismantleBase.Crystal
            };

            dismantle.Metal -= dismantleLast.Metal;
            dismantle.Crystal -= dismantleLast.Crystal;

            reclaimedTotal.Metal += dismantle.Metal;
            reclaimedTotal.Crystal += dismantle.Crystal;

            let lost = {
                Metal: upgrade.Metal - dismantle.Metal,
                Crystal: upgrade.Crystal - dismantle.Crystal
            };

            let lostTotal = {
                Metal: upgradeTotal.Metal - dismantleTotal.Metal,
                Crystal: upgradeTotal.Crystal - dismantleTotal.Crystal
            };

            entries.push({
                level,
                attribute: attribute - attributeLast,
                attributeTotal: attribute - value,
                upgrade,
                upgradeTotal: Object.assign({}, upgradeTotal),
                dismantle,
                dismantleTotal,
                lost,
                lostTotal
            });
        }

        return entries;
    }
}
