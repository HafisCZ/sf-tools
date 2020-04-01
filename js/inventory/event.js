// View
class View {
    constructor (parent) {
        this.$parent = $(`#${ parent }`);
    }

    show () {

    }

    load () {

    }

    refresh () {

    }
}

// Character select view
class PlayerSelectView extends View {
    constructor (parent) {
        super(parent);
        var players = Object.values(Database.Players).map(player => player.Latest);

        if (players.length) {
            var content = '';
            var index = 0;

            for (var i = 0, player; player = players[i]; i++) {
                content += `
                    ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                    <div class="column">
                        <div class="ui segment css-inventory-player css-transparent clickable" data-id="${ player.Identifier }">
                            <img class="ui medium centered image" src="res/class${ player.Class }.png">
                            <h3 class="ui margin-medium-top margin-none-bottom centered muted header">${ player.Prefix }</h3>
                            <h3 class="ui margin-none-top centered header">${ player.Name }</h3>
                        </div>
                    </div>
                `;
                index++;
            }

            content += '</div>';

            this.$parent.find('[data-op="list"]').html(content).find('[data-id]').click(function (event) {
                var obj = $(event.currentTarget);
                UI.show(UI.Inventory, obj.attr('data-id'));
            });
        } else {
            this.$parent.html('<h1 class="ui centered header">The Inventory Manager depends on the Statistics module.<br/><br/>You will have to upload a file containing your character<br/>before you will be able to use this module.</h1>');
        }
    }

    show () {
        UI.reset();
    }
}

function getLocalizedRune (type, value) {
    return `
        <div class="item"><b>${ RUNETYPES[type] }</b> +${ value }% <img src="res/rune${ type }.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; margin-left: -0.25em; display: inline-block;"></img></div>
    `;
}

const COLOR = [
    '',
    'lightblue',
    'yellow',
    'lightgreen',
    'magenta',
    'red'
];

function getLocalizedValue (label, gold, metal, crystals) {
    var g = '';
    if (gold) {
        g = `<img src="res/icon_gold.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(gold) }`;
    }

    var m = '';
    if (metal) {
        m = `<img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(metal) }`;
    }

    var c = '';
    if (crystals) {
        c = `<img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(crystals) }`;
    }

    return `
        <div class="item">
            <div><b>${ label }</b></div>
            <div class="css-inventory-item-sub3">
                <div class="item">
                    ${ g }
                </div>
                <div class="item">
                    ${ m }
                </div>
                <div class="item">
                    ${ c }
                </div>
            </div>
        </div>
    `;
}

function getLocalizedBlacksmith (label, metal, crystals) {
    var m = '';
    if (metal) {
        m = `<img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(metal) }`;
    }

    var c = '';
    if (crystals) {
        c = `<img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(crystals) }`;
    }

    return `
        <div class="item">
            <div><b>${ label }</b></div>
            <div class="css-inventory-item-sub3">
                <div class="item">
                    ${ m }
                </div>
                <div class="item">
                    ${ c }
                </div>
            </div>
        </div>
    `;
}

function getLocalizedBlacksmith2 (label, metal, crystals, metal2, crystals2) {
    var m = '';
    if (metal) {
        m = `<img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(metal) }`;
    }

    var c = '';
    if (crystals) {
        c = `<img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(crystals) }`;
    }

    var m2 = '';
    if (metal2) {
        m2 = `<img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(metal2) }`;
    }

    var c2 = '';
    if (crystals2) {
        c2 = `<img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img> ${ formatAsSpacedNumber(crystals2) }`;
    }

    return `
        <div class="item">
            <div><b>${ label }</b></div>
            <div class="css-inventory-item-sub3">
                <div class="item">
                    ${ m }
                </div>
                <div class="item">
                    ${ c }
                </div>
            </div>
            <div class="css-inventory-item-sub3">
                <div class="item">
                    ${ m2 }
                </div>
                <div class="item">
                    ${ c2 }
                </div>
            </div>
        </div>
    `;
}

function getLocalizedGem (type, value) {
    return `
        <div class="item"><b>${ GEMATTRIBUTES[type] }</b> +${ value } <img src="res/gem${ type }.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; margin-left: -0.25em; display: inline-block;"></img></div>
    `;
}

function getLocalizedAttribute (attribute, ups, gemtype, gemvalue, double) {
    var base = Math.trunc(attribute.Value * Math.pow(1 / 1.03, ups));
    var upgrades = attribute.Value - base;
    var gem = gemtype == attribute.Type || gemtype == 6 ? gemvalue : 0;

    var content = `<span style="color: gray;">${ base }</span>`;

    if (ups) {
        content += ` + <span style="color: lightgray;">${ upgrades }</span>`;
    }

    if (gemtype) {
        content += ` + ${ gem }${ double ? ' x2' : '' }`;
    }

    return `
        <div class="item css-inventory-item-sub3a">
            <div class="item">
                ${ attribute.Value }
            </div>
            <div class="item">
                ${ upgrades || gem ? content : '' }
            </div>
            <div class="item">
                <b style="color: ${ COLOR[attribute.Type] };">${ GEMATTRIBUTES[attribute.Type] }</b>
            </div>
        </div>
    `;
}

function getNiceRuneText (rune) {
    switch (rune) {
        case 1: return 'of Wealth';
        case 2: return 'of Epic Attraction';
        case 3: return 'of Quality';
        case 4: return 'of Knowledge';
        case 5: return 'of Health';
        case 6: return 'of Fire';
        case 7: return 'of Ice';
        case 8: return 'of Lightning';
        case 9: return 'of Elements';
        case 10: return 'of Fire';
        case 11: return 'of Ice';
        case 12: return 'of Lightning';
        default: return 'of Error';
    }
}

function getItemElement (player, item, ignoreCost, isEquip) {
    if (item.Type == 0) {
        return `
            <div class="css-inventory-item ${ isEquip ? 'clickable' : '' }" ${ isEquip ? 'data-eid' : 'data-id' }="${ item.InventoryID }">
                <div class="css-inventory-item-header">
                    Empty slot for ${ ITEM_TYPES[item.Slot == 2 && player.Class == 4 ? 1 : item.Slot] } (${ PLAYER_CLASS[player.Class] })
                </div>
            </div>
        `;
    } else {
        var upgradePrice = item.getBlacksmithUpgradePrice();
        var upgradeRange = item.getBlacksmithUpgradePriceRange();
        var double = item.Type == 1 && (player.Class != 1 || player.Class != 4);
        var toileted = item.SellPrice.Gold == 0 && item.SellPrice.Metal == 0 && item.SellPrice.Crystal == 0 && !ignoreCost;

        return `
            <div class="css-inventory-item ${ isEquip ? 'clickable micro' : '' }" ${ isEquip ? 'data-eid' : 'data-id' }="${ item.InventoryID }">
                <div class="css-inventory-item-header">
                    ${ item.HasEnchantment ? '<span class="css-inventory-sub enchanted">Enchanted</span> ' : '' }${ toileted ? '<span class="css-inventory-sub washed">Washed</span> ' : '' }${ item.HasSocket ? '<span class="css-inventory-sub socketed">Socketed</span> ' : '' }${ ITEM_TYPES[item.Type] } (${ PLAYER_CLASS[item.Class] })${ item.HasRune ? ` <span class="css-inventory-sub runed">${ getNiceRuneText(item.RuneType) }</span>` : '' }
                </div>
                <div class="front">
                    <div class="css-inventory-item-attribute">
                        ${ item.Strength.Value ? getLocalizedAttribute(item.Strength, item.Upgrades, item.GemType, item.GemValue, double) : '' }
                        ${ item.Dexterity.Value ? getLocalizedAttribute(item.Dexterity, item.Upgrades, item.GemType, item.GemValue, double) : '' }
                        ${ item.Intelligence.Value ? getLocalizedAttribute(item.Intelligence, item.Upgrades, item.GemType, item.GemValue, double) : '' }
                        ${ item.Constitution.Value ? getLocalizedAttribute(item.Constitution, item.Upgrades, item.GemType, item.GemValue, double) : '' }
                        ${ item.Luck.Value ? getLocalizedAttribute(item.Luck, item.Upgrades, item.GemType, item.GemValue, double) : '' }
                    </div>
                    <div class="css-inventory-item-extra">
                        ${ item.Type == 1 ? `<div class="item"><b>Damage range</b> ${ item.DamageMin } - ${ item.DamageMax }</div>` : '' }
                        ${ item.Type > 1 && item.Type < 8 ? `<div class="item"><b>Armor</b> ${ item.Armor }</div>` : '' }
                        ${ item.HasGem ? getLocalizedGem(item.GemType, item.GemValue) : '' }
                        ${ item.HasRune ? getLocalizedRune(item.RuneType, item.RuneValue) : '' }
                        ${ item.Upgrades ? `<div class="item"><b>Upgrades</b> ${ item.Upgrades }/20</div>` : '' }
                    </div>
                    <div class="css-inventory-item-price">
                        ${ ignoreCost || (item.SellPrice.Gold == 0 && item.SellPrice.Metal == 0 && item.SellPrice.Crystal == 0) ? '' : getLocalizedValue('Sell:', item.SellPrice.Gold, item.SellPrice.Metal, item.SellPrice.Crystal) }
                        ${ (item.DismantlePrice.Metal == 0 && item.DismantlePrice.Crystal == 0) ? '' : getLocalizedBlacksmith('Dismantle:', item.DismantlePrice.Metal, item.DismantlePrice.Crystal) }
                        ${ item.Upgrades < 20 ? getLocalizedBlacksmith2(`Upgrade:`, upgradePrice.Metal, upgradePrice.Crystal, upgradeRange.Metal, upgradeRange.Crystal) : '' }
                    </div>
                </div>
                <div class="back" style="display: none;">

                </div>
            </div>
        `;
    }
}

function toGrid (player, items, ignoreCost) {
    var content = '';
    var index = 0;

    for (var i = 0; i < items.length; i++) {
        content += `
            ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
            <div class="column">
                ${ getItemElement(player, items[i], ignoreCost) }
            </div>
        `;

        index++;
    }

    return content + '</div>';
}

function toList (player, items) {
    var content = '';

    for (var i = 0; i < items.length; i++) {
        content += `
            <div class="row">
                <div class="column">
                    ${ getItemElement(player, items[i], false, true) }
                </div>
            </div>
        `;
    }

    return content;
}

function getCompareLine (cur, ref, label) {
    var diff = cur - ref;
    if (Math.trunc(diff) == 0) {
        return '';
    } else {
        return `
            <div class="item ${ diff > 0 ? 'green' : (diff / ref >= -0.025 ? 'orange' : 'red') }">
                <div class="sub">${ diff > 0 ? '+' : '-' } ${ formatAsSpacedNumber(Math.trunc(Math.abs(diff))) }</div>
                <div class="sub">${ label }</div>
            </div>
        `;
    }
}

function getCompareRuneLine (base, item) {
    if ((base.HasRune && item.HasRune && base.RuneType == item.RuneType)) {
        return `
            <div class="item green">
                <div class="sub">+ ${ item.RuneValue - base.RuneValue }%</div>
                <div class="sub">${ RUNETYPES[item.RuneType] }</div>
            </div>
        `;
    } else if (!base.HasRune && item.HasRune) {
        return `
            <div class="item green">
                <div class="sub">+ ${ item.RuneValue }%</div>
                <div class="sub">${ RUNETYPES[item.RuneType] }</div>
            </div>
        `;
    } else if (base.HasRune && item.HasRune && base.RuneType != item.RuneType) {
        return `
            <div class="item orange">
                <div class="sub">+ ${ item.RuneValue }%</div>
                <div class="sub">${ RUNETYPES[item.RuneType] }</div>
            </div>
        `;
    } else if (base.HasRune && !item.HasRune) {
        return `
            <div class="item red">
                <div class="sub"></div>
                <div class="sub">No rune</div>
            </div>
        `;
    } else {
        return '';
    }
}

function getCompareSocketLine (base, item) {
    if (base.HasGem && item.HasGem && (item.GemType != base.GemType || item.GemValue != base.GemValue)) {
        if (item.GemType != base.GemType) {
            return `
                <div class="item orange">
                    <div class="sub">+ ${ item.GemValue }</div>
                    <div class="sub">${ GEMATTRIBUTES[item.GemType] }</div>
                </div>
            `;
        } else if (item.GemValue > base.GemValue) {
            return `
                <div class="item green">
                    <div class="sub">+ ${ item.GemValue - base.GemValue }</div>
                    <div class="sub">${ GEMATTRIBUTES[item.GemType] }</div>
                </div>
            `;
        } else {
            return `
                <div class="item red">
                    <div class="sub">- ${ Math.abs(item.GemValue - base.GemValue) }</div>
                    <div class="sub">${ GEMATTRIBUTES[item.GemType] }</div>
                </div>
            `;
        }
    } else if (base.HasSocket && !item.HasSocket) {
        return `
            <div class="item red">
                <div class="sub"></div>
                <div class="sub">No socket</div>
            </div>
        `;
    } else if (!base.HasSocket && item.HasSocket) {
        if (item.HasGem) {
            return `
                <div class="item green">
                    <div class="sub">+ ${ item.GemValue }</div>
                    <div class="sub">${ GEMATTRIBUTES[item.GemType] }</div>
                </div>
            `;
        } else {
            return `
                <div class="item green">
                    <div class="sub"></div>
                    <div class="sub">Empty Socket</div>
                </div>
            `;
        }
    } else if (base.HasSocket && item.HasSocket) {
        return `
            <div class="item orange">
                <div class="sub"></div>
                <div class="sub">Empty Socket</div>
            </div>
        `;
    } else {
        return '';
    }
}


function getRealGemValue (player, item, type) {
    if (item.GemType == type || item.GemType == 6) {
        if (player.Class != 1 && player.Class != 4 && item.Type == 1) {
            return item.GemValue * 2;
        } else {
            return item.GemValue;
        }
    } else {
        return 0;
    }
}

function getMaxReduction (c) {
    switch (c) {
        case 1:
        case 7:
            return 50;
        case 2:
        case 5:
            return 10;
        default:
            return 25;
    }
}

function getComparison (player, base, item, nogem, noupgrade) {
    var out = {
        Ref: {}
    };

    // Attribute arrays
    var pb = [ player.Pets.Water, player.Pets.Light, player.Pets.Earth, player.Pets.Shadow, player.Pets.Fire ];
    var at = [ player.Strength, player.Dexterity, player.Intelligence, player.Constitution, player.Luck ];
    var ia = [ item.Strength.Value, item.Dexterity.Value, item.Intelligence.Value, item.Constitution.Value, item.Luck.Value ];
    var ca = [ base.Strength.Value, base.Dexterity.Value, base.Intelligence.Value, base.Constitution.Value, base.Luck.Value ];

    var attr = [];
    var gems = [];

    if (noupgrade) {
        var iascale = 1 / Math.pow(1.03, item.Upgrades);
        var cascale = Math.pow(1.03, base.Upgrades);

        for (var i = 0; i < 5; i++) {
            ia[i] /= iascale;
        }

        for (var i = 0; i < 5; i++) {
            ca[i] /= cascale;
        }
    }

    for (var i = 0; i < 5; i++) {
        var mult = (1 + at[i].PotionSize / 100);
        var mult2 = (1 + pb[i] / 100);
        var mult3 = (player.ClassBonus ? 1.11 : 1);

        attr[i] = Math.ceil(Math.ceil(Math.ceil(ia[i] * mult) * mult2) * mult3) - Math.ceil(Math.ceil(Math.ceil(ca[i] * mult) * mult2) * mult3);
        gems[i] = Math.ceil(Math.ceil(Math.ceil(getRealGemValue(player, item, i + 1) * mult) * mult2) * mult3) - Math.ceil(Math.ceil(Math.ceil(getRealGemValue(player, base, i + 1) * mult) * mult2) * mult3);
    }

    out.Ref.Str = player.Strength.Total;
    out.Ref.Dex = player.Dexterity.Total;
    out.Ref.Int = player.Intelligence.Total;
    out.Ref.Con = player.Constitution.Total;
    out.Ref.Lck = player.Luck.Total;

    out.Str = out.Ref.Str + attr[0] + (nogem ? 0 : gems[0]);
    out.Dex = out.Ref.Dex + attr[1] + (nogem ? 0 : gems[1]);
    out.Int = out.Ref.Int + attr[2] + (nogem ? 0 : gems[2]);
    out.Con = out.Ref.Con + attr[3] + (nogem ? 0 : gems[3]);
    out.Lck = out.Ref.Lck + attr[4] + (nogem ? 0 : gems[4]);

    var mult = (1 + player.Potions.Life / 100);
    var mult2 = (1 + player.Dungeons.Player / 100);
    var mult3 = (player.Class == 1 || player.Class == 5 ? 5 : (player.Class == 2 ? 2 : 4));
    var mult4 = player.Level + 1;

    out.Ref.Hel = Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(out.Ref.Con * mult4) * mult3) * mult2) * mult) * (1 + player.Runes.Health / 100));
    out.Hel = Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(out.Con * mult4) * mult3) * mult2) * mult) * (1 + (player.Runes.Health + item.getRune(5) - base.getRune(5)) / 100));

    out.Ref.Arm = player.Armor;
    out.Ref.Vin = player.Damage.Min;
    out.Ref.Vax = player.Damage.Max;
    out.Ref.Vag = Math.ceil((player.Damage.Min + player.Damage.Max) / 2);

    if (item.Type == 1) {
        out.Vin = item.DamageMin;
        out.Vax = item.DamageMax;
        out.Vag = Math.ceil((item.DamageMin + item.DamageMax) / 2);
        out.Arm = player.Armor;
    } else {
        out.Vin = out.Ref.Vin;
        out.Vax = out.Ref.Vax;
        out.Vag = out.Ref.Vag;
        out.Arm = player.Armor + item.Armor - base.Armor;
    }

    out.Ref.Red = Math.ceil(Math.min(666, player.Armor / getMaxReduction(player.Class)));
    out.Red = Math.ceil(Math.min(666, out.Arm / getMaxReduction(player.Class)));

    out.Ref.Cri = Math.ceil(Math.min(666, player.Luck.Total / 20));
    out.Cri = Math.ceil(Math.min(666, out.Lck / 20));

    var po = at[player.Primary.Type - 1].Total;
    var pa = po + attr[player.Primary.Type - 1] + (nogem ? 0 : gems[player.Primary.Type - 1]);
    var dm = (1 + player.Dungeons.Group / 100);

    out.Ref.Min = Math.floor(out.Ref.Vin * dm * (1 + po / 10));
    out.Ref.Max = Math.ceil(out.Ref.Vax * dm * (1 + po / 10));
    out.Ref.Avg = Math.ceil((out.Ref.Min + out.Ref.Max) / 2);

    out.Min = Math.floor(out.Vin * dm * (1 + pa / 10));
    out.Max = Math.ceil(out.Vax * dm * (1 + pa / 10));
    out.Avg = Math.ceil((out.Min + out.Max) / 2);

    return out;
}

function getComparisonElement (player, base, item, nogem, noupgrade) {
    var compare = getComparison(player, base, item, nogem, noupgrade);
    var cats = [
        getCompareLine(compare.Str, compare.Ref.Str, 'Strength') +
        getCompareLine(compare.Dex, compare.Ref.Dex, 'Dexterity') +
        getCompareLine(compare.Int, compare.Ref.Int, 'Intelligence') +
        getCompareLine(compare.Con, compare.Ref.Con, 'Constitution') +
        getCompareLine(compare.Lck, compare.Ref.Lck, 'Luck'),

        getCompareLine(compare.Hel, compare.Ref.Hel, 'Health') +
        getCompareLine(compare.Arm, compare.Ref.Arm, 'Armor') +
        getCompareLine(compare.Red, compare.Ref.Red, 'Max Reduction Level'),

        getCompareLine(compare.Min, compare.Ref.Min, 'Minimum Damage') +
        getCompareLine(compare.Max, compare.Ref.Max, 'Maximum Damage') +
        getCompareLine(compare.Avg, compare.Ref.Avg, 'Average Damage') +
        getCompareLine(compare.Cri, compare.Ref.Cri, 'Max Crit Chance Level'),

        getCompareLine(compare.Vin, compare.Ref.Vin, 'Minimum Range') +
        getCompareLine(compare.Vax, compare.Ref.Vax, 'Maximum Range') +
        getCompareLine(compare.Vag, compare.Ref.Vag, 'Average Range'),

        getCompareRuneLine(base, item) +
        getCompareSocketLine(base, item)
    ];

    return `
        <div class="css-inventory-comparison">
            ${ cats[0] }
            ${ cats[0] ? '<div class="item">&nbsp;</div>' : '' }
            ${ cats[1] }
            ${ cats[1] ? '<div class="item">&nbsp;</div>' : '' }
            ${ cats[2] }
            ${ cats[2] ? '<div class="item">&nbsp;</div>' : '' }
            ${ cats[3] }
            ${ cats[3] ? '<div class="item">&nbsp;</div>' : '' }
            ${ cats[4] }
        </div>
    `;
}

function mapToInventory (items, item) {
    item.InventoryID = items.length;
    items.push(item);
    return item;
}

function isAllowedType (item) {
    return item.Type >= 1 && item.Type <= 10;
}

// Character select view
class InventoryView extends View {
    constructor (parent) {
        super(parent);

        this.$backpack = this.$parent.find('[data-op="backpack"] [data-op="list"]');
        this.$chest = this.$parent.find('[data-op="chest"] [data-op="list"]');
        this.$shops = this.$parent.find('[data-op="shops"] [data-op="list"]');
        this.$equipped = this.$parent.find('[data-op="equipped"] [data-op="list"]');
        this.$name = this.$parent.find('[data-op="name"] [data-op="list"]');
    }

    show (id) {
        $(document).on('contextmenu', function () {
            event.preventDefault();
        });

        UI.reset(true);
        this.Player = Database.Players[id].Latest;

        this.EquippedItems = [];
        this.Items = [];

        this.CompareBase = null;
        this.CompareItems = [];

        this.$equipped.html(toList(this.Player, Object.values(this.Player.Items).filter(i => i.Slot != 2 || this.Player.Class == 4).map(i => mapToInventory(this.EquippedItems, i))));

        this.$parent.find('.css-inventory-item[data-eid]').click((event) => {
            var e = $(event.currentTarget);
            var id = e.attr('data-eid');
            if (this.CompareBase != null && this.CompareBase.InventoryID == id) {
                this.CompareBase = null;
            } else {
                this.CompareBase = this.EquippedItems[id];
            }

            this.CompareItems = [];
            this.refresh();
        }).on('contextmenu', function () {
            event.preventDefault();
            $(this).toggleClass('micro');
        });

        this.backpack = this.Player.Inventory.Backpack.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));
        this.chest = this.Player.Inventory.Chest.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));
        this.shops = this.Player.Inventory.Shop.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));

        this.$parent.find('[data-op="nogem"]').checkbox('uncheck').change((event) => {
            this.NoGem = $(event.currentTarget).checkbox('is checked');
            this.refresh();
        });

        this.$parent.find('[data-op="noupgrade"]').checkbox('uncheck').change((event) => {
            this.NoUpgrade = $(event.currentTarget).checkbox('is checked');
            this.refresh();
        });

        this.refresh();
    }

    refresh () {
        var base = this.CompareBase;
        var items = this.CompareItems;

        if (base == null) {
            if (this.backpack.length) {
                this.$backpack.html(toGrid(this.Player, this.backpack));
                this.$backpack.parent('[data-op="backpack"]').show();
            } else {
                this.$backpack.parent('[data-op="backpack"]').hide();
            }

            if (this.chest.length) {
                this.$chest.html(toGrid(this.Player, this.chest));
                this.$chest.parent('[data-op="chest"]').show();
            } else {
                this.$chest.parent('[data-op="chest"]').hide();
            }

            if (this.shops.length) {
                this.$shops.html(toGrid(this.Player, this.shops, true));
                this.$shops.parent('[data-op="shops"]').show();
            } else {
                this.$shops.parent('[data-op="shops"]').hide();
            }

            this.$parent.find('.css-inventory-item[data-eid]').each((i, e) => {
                $(e).removeClass('selected');
            });
        } else {
            var backpack = this.backpack.filter(i => this.CompareBase && i.Type == this.CompareBase.Type && i.Class == this.CompareBase.Class);
            if (backpack.length) {
                this.$backpack.html(toGrid(this.Player, backpack));
                this.$backpack.parent('[data-op="backpack"]').show();
            } else {
                this.$backpack.parent('[data-op="backpack"]').hide();
            }

            var chest = this.chest.filter(i => this.CompareBase && i.Type == this.CompareBase.Type && i.Class == this.CompareBase.Class);
            if (chest.length) {
                this.$chest.html(toGrid(this.Player, chest));
                this.$chest.parent('[data-op="chest"]').show();
            } else {
                this.$chest.parent('[data-op="chest"]').hide();
            }

            var shops = this.shops.filter(i => this.CompareBase && i.Type == this.CompareBase.Type && i.Class == this.CompareBase.Class);
            if (shops.length) {
                this.$shops.html(toGrid(this.Player, shops, true));
                this.$shops.parent('[data-op="shops"]').show();
            } else {
                this.$shops.parent('[data-op="shops"]').hide();
            }

            this.$parent.find('.css-inventory-item[data-id]').each((i, e) => {
                var item = this.Items[$(e).attr('data-id')];
                if (item.Type == base.Type && item.Class == base.Class) {
                    $(e).addClass('clickable');
                } else {
                    $(e).addClass('css-inventory-hidden');
                }

                if (items.find(it => it.InventoryID == item.InventoryID)) {
                    $(e).addClass('selected');
                    $(e).find('.front').hide();
                    $(e).find('.back').show().html(getComparisonElement(this.Player, base, item, this.NoGem, this.NoUpgrade));
                } else {
                    $(e).removeClass('selected');
                    $(e).find('.front').show();
                    $(e).find('.back').hide();
                }
            }).click((event) => {
                if (this.CompareBase) {
                    var id = $(event.currentTarget).attr('data-id');
                    var item = this.Items[id];

                    if (item.Type == this.CompareBase.Type && item.Class == this.CompareBase.Class) {
                        var pos = this.CompareItems.findIndex(it => it.InventoryID == id);
                        if (pos == -1) {
                            this.CompareItems.push(this.Items[id]);
                        } else {
                            this.CompareItems.splice(pos, 1);
                        }

                        this.refresh();
                    }
                }
            });;

            this.$parent.find('.css-inventory-item[data-eid]').each((i, e) => {
                var id = $(e).attr('data-eid');
                if (base != null && base.InventoryID == id) {
                    $(e).addClass('selected');
                } else {
                    $(e).removeClass('selected');
                }
            });
        }
    }

    bindToClick (el) {
        el.click((event) => {
            if (this.CompareBase) {
                var id = $(event.currentTarget).attr('data-id');
                var item = this.Items[id];

                if (item.Type == this.CompareBase.Type && item.Class == this.CompareBase.Class) {
                    var pos = this.CompareItems.findIndex(it => it.InventoryID == id);
                    if (pos == -1) {
                        this.CompareItems.push(this.Items[id]);
                    } else {
                        this.CompareItems.splice(pos, 1);
                    }

                    this.refresh();
                }
            }
        });
    }
}

// Loader View
class LoaderView extends View {
    constructor (parent) {
        super(parent);
    }

    alert (text) {
        this.$parent.find('[data-op="text"]').html(`<h1 class="ui header white">${ text }</h1>`);
    }
}

// Exception View
class ExceptionView extends View {
    constructor (parent) {
        super(parent);
    }

    alert (text) {
        this.$parent.find('[data-op="content"]').html(text);
        this.$parent.modal('show');
    }
}

// UI object collection
const UI = {
    current: null,
    reset: function (soft) {
        if (soft) {
            $('#show-back').click(function (event) {
                event.preventDefault();
                UI.show(UI.PlayerSelect);
            });
        } else {
            $('#show-back').off('click');
        }
    },
    show: function (screen, ... arguments) {
        UI.current = screen;

        $('.ui.container').addClass('hidden');

        screen.$parent.removeClass('hidden');
        screen.show(... arguments);
    },
    initialize: function () {
        UI.PlayerSelect = new PlayerSelectView('view-playerselect');
        UI.Inventory = new InventoryView('view-inventory');
    },

    Loader: new LoaderView('modal-loader'),
    Exception: new ExceptionView('modal-exception')
}
