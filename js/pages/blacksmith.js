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

Site.ready(null, function () {
    let $table = $('#table');

    const EditorController = new (class extends EditorBase {
        constructor () {
            super({
                type: new Field('[data-path="type"]', 'normal_1'),
                value: new Field('[data-path="value"]', 0, Field.isNumber),
                double: new Field('[data-path="double"]', 'false')
            })

            this.fields['type'].$object.dropdown({
                values: ['normal_1', 'normal_2', 'epic_3', 'epic_5'].map(value => ({
                    name: intl(`blacksmith.item.types.${value}`),
                    value
                }))
            }).dropdown('set selected', 'normal_1');

            this.fields['double'].$object.dropdown({
                values: [
                    {
                        name: intl('general.no'),
                        value: false
                    },
                    {
                        name: intl('general.yes'),
                        value: true
                    }
                ]
            }).dropdown('set selected', 'false');

            for (const field of this.fieldsArray) {
                field.triggerAlways = true;
                field.setListener(() => generateTable());
            }
        }
    });

    function generateResource ({ Metal: metal, Crystal: crystal }, relateTo = null) {
        return `
            <div class="resource${relateTo ? ' related' : ''}">
                <div class="row"><div class="value"><img src="res/icon_metal.png"> ${formatAsSpacedNumber(metal, ' ')}</div><div class="percentage">${relateTo ? (100 * metal / Math.max(1, relateTo.Metal)).toFixed(1) : ''}%</div></div>
                <div class="row"><div class="value"><img src="res/icon_crystal.png"> ${formatAsSpacedNumber(crystal, ' ')}</div><div class="percentage">${relateTo ? (100 * crystal / Math.max(1, relateTo.Crystal)).toFixed(1) : ''}%</div></div>
            </div>
        `;
    }

    function generateTable () {
        if (EditorController.valid()) {
            let { type, value, double } = EditorController.read();

            let html = '';
            for (let { level, attribute, attributeTotal, upgrade, upgradeTotal, dismantle, dismantleTotal, lost, lostTotal } of Blacksmith.upgradeList(type, value, double)) {
                html += `
                    <tr>
                        <td class="!text-center">${level}</td>
                        <td class="!text-center">${formatAsSpacedNumber(attribute, ' ')}</td>
                        <td class="!text-center">${formatAsSpacedNumber(attributeTotal, ' ')}</td>
                        <td></td>
                        <td>${generateResource(upgrade)}</td>
                        <td>${generateResource(upgradeTotal)}</td>
                        <td>${generateResource(dismantle)}</td>
                        <td>${generateResource(dismantleTotal)}</td>
                        <td>${generateResource(lost, upgrade)}</td>
                        <td>${generateResource(lostTotal, upgradeTotal)}</td>
                    </tr>
                `;
            }

            $table.html(html);
        } else {
            $table.html(
                `<tr><td colspan="10" class="!text-center p-4">${intl('blacksmith.table.invalid')}</td></tr>`
            );
        }
    }

    generateTable();
});