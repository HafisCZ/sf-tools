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

// Resources View
class ResourcesView extends View {
    constructor (parent) {
        super(parent);

        // Blocks
        this.$inventory = this.$parent.find('[data-op="backpack"] [data-op="list"]');
        this.$player = this.$parent.find('[data-op="player"] [data-op="list"]');
        this.$bert = this.$parent.find('[data-op="bert"] [data-op="list"]');
        this.$mark = this.$parent.find('[data-op="mark"] [data-op="list"]');
        this.$kunigunde = this.$parent.find('[data-op="kunigunde"] [data-op="list"]');

        // Summary
        this.$summary = this.$parent.find('[data-op="summary"]');
    }

    show (id) {
        $('#show-compare, #show-crystal').show().off('click');
        $('#show-compare').on('click', () => UI.show(UI.Inventory, id));
        UI.reset(true);

        // Clear
        this.$parent.find('[data-op="list"]').html('');

        // Current player
        this.Player = Database.Players[id].Latest;
        this.Items = [];

        // Dismantling
        this.Dismantles = [];

        // Items
        this.inventory = [
            ... mapArray(this.Player.Inventory.Backpack, this.Items, true),
            ... mapArray(this.Player.Inventory.Chest, this.Items, true)
        ];

        this.player = mapArray(this.Player.Items, this.Items, true);
        this.bert = mapArray(this.Player.Inventory.Bert, this.Items, true);
        this.mark = mapArray(this.Player.Inventory.Mark, this.Items, true);
        this.kunigunde = mapArray(this.Player.Inventory.Kunigunde, this.Items, true);

        for (var item of Object.values(this.Items)) {
            item.BaseUpgrades = item.Upgrades;
        }

        this.refresh();
    }

    refresh () {
        // Calculate prices
        var dismantle = this.Dismantles.reduce((total, item) => {
            return {
                Metal: total.Metal + item.DismantlePrice.Metal,
                Crystal: total.Crystal + item.DismantlePrice.Crystal
            };
        }, { Metal: 0, Crystal: 0 });

        var sell = this.Dismantles.reduce((total, item) => {
            return {
                Metal: total.Metal + item.SellPrice.Metal,
                Crystal: total.Crystal + item.SellPrice.Crystal
            };
        }, { Metal: 0, Crystal: 0, Gold: 0 });

        // Current values
        this.Current = {
            Metal: this.Player.Metal,
            Crystal: this.Player.Crystals
        };

        // Spent values
        this.Used = {
            Metal: 0,
            Crystal: 0
        };

        for (var item of Object.values(this.Items)) {
            var cost = item.Original.getBlacksmithUpgradePriceRange(item.Upgrades);
            this.Used.Metal += cost.Metal;
            this.Used.Crystal += cost.Crystal;
        }

        this.Ready = {
            Metal: this.Current.Metal + dismantle.Metal - this.Used.Metal,
            Crystal: this.Current.Crystal + dismantle.Crystal - this.Used.Crystal
        };

        // Summary
        this.$summary.html(`
            <div class="item sf-margin bottom-05">
                <b>Current resources</b>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(this.Current.Metal) }</div>
                <div class="dsub"><img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(this.Current.Crystal) }</div>
                <div class="dsub"><img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item sf-margin bottom-05 top-20">
                <b>Sold resources</b>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(sell.Metal) }</div>
                <div class="dsub"><img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(sell.Crystal) }</div>
                <div class="dsub"><img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item sf-margin bottom-05 top-20">
                <b>Dismantled resources</b>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(dismantle.Metal) }</div>
                <div class="dsub"><img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(dismantle.Crystal) }</div>
                <div class="dsub"><img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item sf-margin bottom-05 top-20">

            </div>
            <div class="item sf-margin bottom-05 top-20">
                <b>Spendable resources</b>
            </div>
            <div class="item ${ this.Ready.Metal < 0 ? 'red' : '' }">
                <div class="dsub">${ formatAsSpacedNumber(this.Ready.Metal) }</div>
                <div class="dsub"><img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item ${ this.Ready.Crystal < 0 ? 'red' : '' }">
                <div class="dsub">${ formatAsSpacedNumber(this.Ready.Crystal) }</div>
                <div class="dsub"><img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item sf-margin bottom-05 top-20">
                <b>Used resources</b>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(this.Used.Metal) }</div>
                <div class="dsub"><img src="res/icon_metal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
            <div class="item">
                <div class="dsub">${ formatAsSpacedNumber(this.Used.Crystal) }</div>
                <div class="dsub"><img src="res/icon_crystal.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; display: inline-block;"></img></div>
            </div>
        `);

        // Blocks
        this.refreshBlock(this.$inventory, this.inventory);
        this.refreshBlock(this.$player, this.player);
        this.refreshBlock(this.$bert, this.bert);
        this.refreshBlock(this.$mark, this.mark);
        this.refreshBlock(this.$kunigunde, this.kunigunde);

        this.$parent.find('[data-id] .clickable').click(event => {
            var id = $(event.currentTarget).parent('[data-id]').attr('data-id');
            var pos = this.Dismantles.findIndex(i => i.InventoryID == id);
            if (pos == -1) {
                this.Dismantles.push(this.Items[id]);
            } else {
                this.Dismantles.splice(pos, 1);
            }

            this.refresh();
        });

        this.$parent.find('[data-op="add"]').click(event => {
            var id = $(event.currentTarget).attr('data-id');
            if (this.Items[id].Upgrades < 20) {
                this.Items[id].upgradeTo(this.Items[id].Upgrades + 1);
            }

            this.refresh();
        });

        this.$parent.find('[data-op="sub"]').click(event => {
            var id = $(event.currentTarget).attr('data-id');
            if (this.Items[id].Upgrades > this.Items[id].BaseUpgrades) {
                this.Items[id].upgradeTo(this.Items[id].Upgrades - 1);
            }

            this.refresh();
        });

        this.$parent.find('[data-op="ladd"]').click(event => {
            var id = $(event.currentTarget).attr('data-id');
            if (this.Items[id].Upgrades < 20) {
                this.Items[id].upgradeTo(20);
            }

            this.refresh();
        });

        this.$parent.find('[data-op="lsub"]').click(event => {
            var id = $(event.currentTarget).attr('data-id');
            if (this.Items[id].Upgrades > this.Items[id].BaseUpgrades) {
                this.Items[id].upgradeTo(this.Items[id].BaseUpgrades);
            }

            this.refresh();
        });
    }

    getItemElement (item) {
        var sell = item.getBlacksmithPrice();
        var dismantle = item.getDismantleReward();
        var upgradePrice = item.getBlacksmithUpgradePrice();
        var upgradeRange = item.getBlacksmithUpgradePriceRange();

        var toileted = sell.Metal == 0 && sell.Crystal == 0;

        return `
            <div class="css-resource-item ${ this.Dismantles.find(it => it.InventoryID == item.InventoryID) ? 'selected' : '' }" data-id="${ item.InventoryID }">
                <div class="css-inventory-item-header clickable">
                    ${ item.HasEnchantment ? '<span class="css-inventory-sub enchanted">Enchanted</span> ' : '' }
                    ${ toileted ? '<span class="css-inventory-sub washed">Washed</span> ' : '' }
                    ${ item.HasSocket ? '<span class="css-inventory-sub socketed">Socketed</span> ' : '' }
                    ${ ITEM_TYPES[item.Type] } (${ PLAYER_CLASS[item.Class] })
                    ${ item.HasRune ? ` <span class="css-inventory-sub runed">${ getNiceRuneText(item.RuneType) }</span>` : '' }
                </div>
                <div class="css-resource-item-body">
                    ${ toileted ? '' : getLocalizedValue('Sell:', sell.Gold, sell.Metal, sell.Crystal) }
                    ${ item.DismantlePrice.Metal == 0 && item.DismantlePrice.Crystal == 0 ? '' : getLocalizedBlacksmith('Dismantle:', dismantle.Metal, dismantle.Crystal) }
                    ${ item.Upgrades < 20 ? getLocalizedBlacksmith2(`Upgrade:`, upgradePrice.Metal, upgradePrice.Crystal, upgradeRange.Metal, upgradeRange.Crystal, this.Ready) : '' }
                </div>
                <div class="css-resource-item-footer">
                    <div data-op="lsub" data-id="${ item.InventoryID }">
                        <span class="noptr">${ item.BaseUpgrades }</span>
                    </div>
                    <div data-op="sub" data-id="${ item.InventoryID }">
                        <span class="noptr">-</span>
                    </div>
                    <div data-op="upgrades">
                        ${ item.BaseUpgrades }${ item.BaseUpgrades != item.Upgrades ? ` + ${ item.Upgrades - item.BaseUpgrades }` : '' }
                    </div>
                    <div data-op="add" data-id="${ item.InventoryID }">
                        <span class="noptr">+</span>
                    </div>
                    <div data-op="ladd" data-id="${ item.InventoryID }">
                        <span class="noptr">20</span>
                    </div>
                </div>
            </div>
        `;
    }

    toGrid (items) {
        var content = '';
        var index = 0;

        for (var i = 0; i < items.length; i++) {
            content += `
                ${ index % 5 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    ${ this.getItemElement(items[i]) }
                </div>
            `;

            index++;
        }

        return content + '</div>';
    }

    refreshBlock ($el, items) {
        if (items && items.length) {
            $el.html(this.toGrid(items)).parent('[data-op]').show();
        } else {
            $el.parent('[data-op]').hide();
        }
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

function getLocalizedBlacksmith2 (label, metal, crystals, metal2, crystals2, ready) {
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
                <div class="item ${ ready && metal > ready.Metal ? 'red' : 'green' }">
                    ${ m }
                </div>
                <div class="item ${ ready && crystals > ready.Crystal ? 'red' : 'green' }">
                    ${ c }
                </div>
            </div>
            <div class="css-inventory-item-sub3">
                <div class="item ${ ready && metal2 > ready.Metal ? 'red' : 'green' }">
                    ${ m2 }
                </div>
                <div class="item ${ ready && crystals2 > ready.Crystal ? 'red' : 'green' }">
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

function getBasisLine (value, label, warn) {
    return `
        <div class="item ${ warn ? 'orange' : '' }">
            <div class="csub">${ formatAsSpacedNumber(Math.trunc(value)) }</div>
            <div class="csub">${ label }</div>
        </div>
    `;
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

function getComparisonBase (player, char) {
    var ref = {};

    if (char == 1) {
        player = player.Companions.Bert;
    } else if (char == 2) {
        player = player.Companions.Mark;
    } else if (char == 3) {
        player = player.Companions.Kunigunde;
    }

    ref.Level = player.Level;

    ref.Runes = {
        Gold: player.Runes.Gold,
        XP: player.Runes.XP,
        Health: player.Runes.Health,
        Chance: player.Runes.Chance,
        Quality: player.Runes.Quality,
        ResistanceFire: player.Runes.ResistanceFire,
        ResistanceCold: player.Runes.ResistanceCold,
        ResistanceLightning: player.Runes.ResistanceLightning,
        DamageFire: player.Runes.DamageFire,
        DamageCold: player.Runes.DamageCold,
        DamageLightning: player.Runes.DamageLightning
    };

    ref.Str = player.Strength.Total;
    ref.Dex = player.Dexterity.Total;
    ref.Int = player.Intelligence.Total;
    ref.Con = player.Constitution.Total;
    ref.Lck = player.Luck.Total;

    var mult = (1 + player.Potions.Life / 100);
    var mult2 = (1 + player.Dungeons.Player / 100 + (char == 1 ? 0.33 : 0));
    var mult3 = (player.Class == 1 || player.Class == 5 ? 5 : (player.Class == 2 ? 2 : 4));
    var mult4 = player.Level + 1;
    ref.Hel = Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(ref.Con * mult4) * mult3) * mult2) * mult) * (1 + player.Runes.Health / 100));

    ref.Arm = player.Armor;
    ref.Vin = player.Damage.Min;
    ref.Vax = player.Damage.Max;
    ref.Vag = Math.ceil((player.Damage.Min + player.Damage.Max) / 2);

    ref.Red = Math.ceil(Math.min(666, player.Armor / getMaxReduction(player.Class)));
    ref.Cri = Math.ceil(Math.min(666, player.Luck.Total / 20));

    var dm = (1 + player.Primary.Total / 10) * (1 + player.Dungeons.Group / 100) * (1 + player.Runes.Damage / 100);
    ref.Min = Math.floor(ref.Vin * dm);
    ref.Max = Math.ceil(ref.Vax * dm);
    ref.Avg = Math.ceil((ref.Min + ref.Max) / 2);

    return ref;
}

function getComparison (basis, player, char, base, item, nogem, noupgrade) {
    var out = {
        Ref: basis
    };

    if (char == 1) {
        player = player.Companions.Bert;
    } else if (char == 2) {
        player = player.Companions.Mark;
    } else if (char == 3) {
        player = player.Companions.Kunigunde;
    }

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

    out.Str = out.Ref.Str + attr[0] + (nogem ? 0 : gems[0]);
    out.Dex = out.Ref.Dex + attr[1] + (nogem ? 0 : gems[1]);
    out.Int = out.Ref.Int + attr[2] + (nogem ? 0 : gems[2]);
    out.Con = out.Ref.Con + attr[3] + (nogem ? 0 : gems[3]);
    out.Lck = out.Ref.Lck + attr[4] + (nogem ? 0 : gems[4]);

    var mult = (1 + player.Potions.Life / 100);
    var mult2 = (1 + player.Dungeons.Player / 100 + (char == 1 ? 0.33 : 0));
    var mult3 = (player.Class == 1 || player.Class == 5 ? 5 : (player.Class == 2 ? 2 : 4));
    var mult4 = player.Level + 1;
    out.Hel = Math.ceil(Math.ceil(Math.ceil(Math.ceil(Math.ceil(out.Con * mult4) * mult3) * mult2) * mult) * (1 + (player.Runes.Health + item.getRune(5) - base.getRune(5)) / 100));

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

    out.Red = Math.ceil(Math.min(666, out.Arm / getMaxReduction(player.Class)));
    out.Cri = Math.ceil(Math.min(666, out.Lck / 20));

    if (item.Type == 1) {
        var rvin = out.Ref.Vin;
        var rvax = out.Ref.Vax;
        var rvag = out.Ref.Vag;

        rvin = base.DamageMin;
        rvax = base.DamageMax;
        rvag = Math.ceil((base.DamageMin + base.DamageMax) / 2);

        var dd = (1 + player.Primary.Total / 10) * (1 + player.Dungeons.Group / 100) * (1 + (base.getRune(10) + base.getRune(11) + base.getRune(12)) / 100);
        out.Ref.Min = Math.floor(rvin * dd);
        out.Ref.Rax = Math.ceil(rvax * dd);
        out.Ref.Rvg = Math.ceil((out.Ref.Min + out.Ref.Rax) / 2);
    }

    var pa = at[player.Primary.Type - 1].Total + attr[player.Primary.Type - 1] + (nogem ? 0 : gems[player.Primary.Type - 1]);
    var rn = item.Type == 1 ? (item.getRune(10) + item.getRune(11) + item.getRune(12)) : player.Runes.Damage;
    var dm = (1 + player.Dungeons.Group / 100) * (1 + rn / 100);

    out.Min = Math.floor(out.Vin * dm * (1 + pa / 10));
    out.Max = Math.ceil(out.Vax * dm * (1 + pa / 10));
    out.Avg = Math.ceil((out.Min + out.Max) / 2);

    return out;
}

function getBasisElement (b) {
    var cats = [
        (b.Runes.Gold ? getBasisLine(b.Runes.Gold, 'Gold') : '') +
        (b.Runes.XP ? getBasisLine(b.Runes.XP, 'XP') : '') +
        (b.Runes.Health ? getBasisLine(b.Runes.Health, 'Health') : ''),

        (b.Runes.Chance ? getBasisLine(b.Runes.Chance, 'Epic Chance') : '') +
        (b.Runes.Quality ? getBasisLine(b.Runes.Quality, 'Item Quality') : ''),

        (b.Runes.ResistanceFire ? getBasisLine(b.Runes.ResistanceFire, 'Fire Resistance') : '') +
        (b.Runes.ResistanceCold ? getBasisLine(b.Runes.ResistanceCold, 'Cold Resistance') : '') +
        (b.Runes.ResistanceLightning ? getBasisLine(b.Runes.ResistanceLightning, 'Lightning Resistance') : ''),

        (b.Runes.DamageFire ? getBasisLine(b.Runes.DamageFire, 'Fire Damage') : '') +
        (b.Runes.DamageCold ? getBasisLine(b.Runes.DamageCold, 'Cold Damage') : '') +
        (b.Runes.DamageLightning ? getBasisLine(b.Runes.DamageLightning, 'Lightning Damage') : '')
    ];

    return `
        ${ getBasisLine(b.Level, 'Level') }
        <div class="item">&nbsp;</div>
        ${ getBasisLine(b.Str, 'Strength') }
        ${ getBasisLine(b.Dex, 'Dexterity') }
        ${ getBasisLine(b.Int, 'Intelligence') }
        ${ getBasisLine(b.Con, 'Constitution') }
        ${ getBasisLine(b.Lck, 'Luck') }
        <div class="item">&nbsp;</div>
        ${ getBasisLine(b.Hel, 'Health') }
        ${ getBasisLine(b.Arm, 'Armor') }
        ${ getBasisLine(b.Red, 'Max Reduction Level', b.Red < b.Level) }
        <div class="item">&nbsp;</div>
        ${ getBasisLine(b.Vin, 'Minimum Range') }
        ${ getBasisLine(b.Vax, 'Maximum Range') }
        ${ getBasisLine(b.Vag, 'Average Range') }
        ${ getBasisLine(b.Cri, 'Max Crit Chance Level', b.Cri < b.Level) }
        <div class="item">&nbsp;</div>
        ${ getBasisLine(b.Min, 'Minimum Damage') }
        ${ getBasisLine(b.Max, 'Maximum Damage') }
        ${ getBasisLine(b.Avg, 'Average Damage') }
        <div class="item">&nbsp;</div>
        ${ cats[0] }
        ${ cats[0] ? '<div class="item">&nbsp;</div>' : '' }
        ${ cats[1] }
        ${ cats[1] ? '<div class="item">&nbsp;</div>' : '' }
        ${ cats[2] }
        ${ cats[2] ? '<div class="item">&nbsp;</div>' : '' }
        ${ cats[3] }
    `;
}

function getComparisonElement (basis, player, char, base, item, nogem, noupgrade) {
    var compare = getComparison(basis, player, char, base, item, nogem, noupgrade);
    var cats = [
        getCompareLine(compare.Str, compare.Ref.Str, 'Strength') +
        getCompareLine(compare.Dex, compare.Ref.Dex, 'Dexterity') +
        getCompareLine(compare.Int, compare.Ref.Int, 'Intelligence') +
        getCompareLine(compare.Con, compare.Ref.Con, 'Constitution') +
        getCompareLine(compare.Lck, compare.Ref.Lck, 'Luck'),

        getCompareLine(compare.Hel, compare.Ref.Hel, 'Health') +
        getCompareLine(compare.Arm, compare.Ref.Arm, 'Armor') +
        getCompareLine(compare.Red, compare.Ref.Red, 'Max Reduction Level'),

        getCompareLine(compare.Vin, compare.Ref.Vin, 'Minimum Range') +
        getCompareLine(compare.Vax, compare.Ref.Vax, 'Maximum Range') +
        getCompareLine(compare.Vag, compare.Ref.Vag, 'Average Range') +
        getCompareLine(compare.Cri, compare.Ref.Cri, 'Max Crit Chance Level'),

        getCompareLine(compare.Min, compare.Ref.Min, 'Minimum Damage') +
        getCompareLine(compare.Max, compare.Ref.Max, 'Maximum Damage') +
        getCompareLine(compare.Avg, compare.Ref.Avg, 'Average Damage'),

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

function mapArray (array, items, clone = false) {
    if (!Array.isArray(array)) {
        array = Object.values(array);
    }

    return array.filter(i => isAllowedType(i)).map(i => {
        if (clone) {
            var cloned = i.clone();
            cloned.Original = i;

            return mapToInventory(items, cloned);
        } else {
            return mapToInventory(items, i);
        }
    });
}

function isAllowedType (item) {
    return item.Type >= 1 && item.Type <= 10;
}

// Inventory View
class InventoryView extends View {
    constructor (parent) {
        super(parent);

        // Equipped
        this.$equipped = this.$parent.find('[data-op="equipped"] [data-op="list"]');

        // Inventories
        this.$backpack = this.$parent.find('[data-op="backpack"] [data-op="list"]');
        this.$chest = this.$parent.find('[data-op="chest"] [data-op="list"]');
        this.$shops = this.$parent.find('[data-op="shops"] [data-op="list"]');
        this.$player = this.$parent.find('[data-op="player"] [data-op="list"]');
        this.$bert = this.$parent.find('[data-op="bert"] [data-op="list"]');
        this.$mark = this.$parent.find('[data-op="mark"] [data-op="list"]');
        this.$kunigunde = this.$parent.find('[data-op="kunigunde"] [data-op="list"]');

        // Basis
        this.$basis = this.$parent.find('[data-op="basis"]');

        // Flipper
        this.$parent.find('[data-op="flip"]').click(() => {
            if (this.CompareBase != null) {
                if (this.CompareItems.length > 0) {
                    this.CompareItems = [];
                } else {
                    this.CompareItems = [
                        ... this.Items.filter(i => this.CompareBase && i.Type == this.CompareBase.Type && i.Class == this.CompareBase.Class)
                    ];
                }

                this.refresh();
            }
        });

        // Characters
        this.$parent.find('[data-op="swap"]').click(e => {
            this.setCharacterSelection($(e.currentTarget).attr('data-arg'));
            this.refresh();
        });

        // Checkboxes
        this.$parent.find('[data-op="nogem"]').checkbox('uncheck').change((event) => {
            this.NoGem = $(event.currentTarget).checkbox('is checked');
            this.refresh();
        });

        this.$parent.find('[data-op="noupgrade"]').checkbox('uncheck').change((event) => {
            this.NoUpgrade = $(event.currentTarget).checkbox('is checked');
            this.refresh();
        });
    }

    show (id) {
        $('#show-compare, #show-crystal').show().off('click');
        $('#show-crystal').on('click', () => UI.show(UI.Resources, id));
        UI.reset(true);

        this.$parent.find('[data-op="list"]').html('');

        // Current player
        this.Player = Database.Players[id].Latest;
        this.Items = [];

        // Micro-ing
        this.Micro = new Set();

        // Comparison
        this.Selected = 0;
        this.CompareBase = null;
        this.CompareItems = [];

        // Ignore upgrades and gems
        this.NoUpgrade = false;
        this.NoGem = false;

        // Generated item lists
        this.backpack = mapArray(this.Player.Inventory.Backpack, this.Items);
        this.chest = mapArray(this.Player.Inventory.Chest, this.Items);
        this.player = mapArray(this.Player.Items, this.Items);
        this.bert = mapArray(this.Player.Inventory.Bert, this.Items);
        this.mark = mapArray(this.Player.Inventory.Mark, this.Items);
        this.kunigunde = mapArray(this.Player.Inventory.Kunigunde, this.Items);

        if (!this.Player.Companions) {
            this.$parent.find('.css-companions').hide();
        } else {
            this.$parent.find('.css-companions').show();
        }

        // Set other stuff
        this.setCharacterSelection(0);
        this.refresh();
    }

    refreshBlock ($el, items, nosell, filter) {
        if (items && items.length) {
            var array = filter ? items.filter(filter) : items;
            if (array.length) {
                $el.html(this.toGrid(array, nosell)).parent('[data-op]').show();
            } else {
                $el.parent('[data-op]').hide();
            }
        } else {
            $el.parent('[data-op]').hide();
        }
    }

    setCharacterSelection (id) {
        this.selectEquippedItem();

        this.Selected = id;
        this.$parent.find('[data-op="swap"]').each((i, e) => {
            if (id == $(e).attr('data-arg')) {
                $(e).addClass('selected');
            } else {
                $(e).removeClass('selected');
            }
        });

        this.Basis = getComparisonBase(this.Player, id);
        this.$basis.html(getBasisElement(this.Basis));
    }

    isCorrectType (i) {
        return this.CompareBase && i.Type == this.CompareBase.Type && i.Class == this.CompareBase.Class;
    }

    selectEquippedItem (id) {
        this.CompareBase = this.CompareBase != null && this.CompareBase.InventoryID == id ? null : this.Items.find(i => i.InventoryID == id);
        this.CompareItems = [];
    }

    refresh () {
        // Character selection
        if (this.Selected == 0) {
            this.$equipped.html(this.toList(this.player.filter(i => i.Slot != 2 || this.Player.Class == 4)));
        } else if (this.Selected == 1) {
            this.$equipped.html(this.toList(this.bert));
        } else if (this.Selected == 2) {
            this.$equipped.html(this.toList(this.mark));
        } else if (this.Selected == 3) {
            this.$equipped.html(this.toList(this.kunigunde));
        }

        // Character click callback
        this.$parent.find('[data-eid]').each((i, e) => {
            var id = $(e).attr('data-eid');

            if (this.CompareBase && id == this.CompareBase.InventoryID) {
                $(e).addClass('selected');
            }

            if (this.Micro.has(id)) {
                $(e).removeClass('micro');
            }
        }).click(event => {
            this.selectEquippedItem($(event.currentTarget).attr('data-eid'));
            this.refresh();
        }).contextmenu(event => {
            event.preventDefault();

            var id = $(event.currentTarget).attr('data-eid');

            if (this.Micro.has(id)) {
                this.Micro.delete(id);
            } else {
                this.Micro.add(id);
            }

            this.refresh();
        });

        if (this.CompareBase == null) {
            // Inventory refresh
            this.refreshBlock(this.$backpack, this.backpack, false);
            this.refreshBlock(this.$chest, this.chest, false);
            this.refreshBlock(this.$shops, this.shops, true);
            this.refreshBlock(this.$player, this.Selected == 0 ? null : this.player, false);
            this.refreshBlock(this.$bert, this.Selected == 1 ? null : this.bert, false);
            this.refreshBlock(this.$mark, this.Selected == 2 ? null : this.mark, false);
            this.refreshBlock(this.$kunigunde, this.Selected == 3 ? null : this.kunigunde, false);
        } else {
            // Inventory refresh
            this.refreshBlock(this.$backpack, this.backpack, false, i => this.isCorrectType(i));
            this.refreshBlock(this.$chest, this.chest, false, i => this.isCorrectType(i));
            this.refreshBlock(this.$shops, this.shops, true, i => this.isCorrectType(i));
            this.refreshBlock(this.$player, this.Selected == 0 ? null : this.player, false, i => this.isCorrectType(i));
            this.refreshBlock(this.$bert, this.Selected == 1 ? null : this.bert, false, i => this.isCorrectType(i));
            this.refreshBlock(this.$mark, this.Selected == 2 ? null : this.mark, false, i => this.isCorrectType(i));
            this.refreshBlock(this.$kunigunde, this.Selected == 3 ? null : this.kunigunde, false, i => this.isCorrectType(i));

            var base = this.CompareBase;
            this.$parent.find('[data-id]').each((i, e) => {
                var $this = $(e);

                var id = $this.attr('data-id');
                var item = this.Items[id];

                if (item.Type == base.Type && item.Class == base.Class) {
                    $this.addClass('clickable');
                }

                if (this.CompareItems.find(it => it.InventoryID == item.InventoryID)) {
                    $this.addClass('selected');
                    $this.find('.front').hide();
                    $this.find('.back').show().html(getComparisonElement(this.Basis, this.Player, this.Selected, base, item, this.NoGem, this.NoUpgrade));
                }
            }).click(event => {
                var id = $(event.currentTarget).attr('data-id');
                var pos = this.CompareItems.findIndex(i => i.InventoryID == id);
                if (pos == -1) {
                    this.CompareItems.push(this.Items[id]);
                } else {
                    this.CompareItems.splice(pos, 1);
                }

                this.refresh();
            });
        }
    }

    getItemElement (item, ignoreCost, isEquip) {
        if (item.Type == 0) {
            return `
                <div class="css-inventory-item ${ isEquip ? 'clickable' : '' }" ${ isEquip ? 'data-eid' : 'data-id' }="${ item.InventoryID }">
                    <div class="css-inventory-item-header">
                        Empty slot for ${ ITEM_TYPES[item.Slot == 2 && this.Player.Class == 4 ? 1 : item.Slot] } (${ PLAYER_CLASS[this.Player.Class] })
                    </div>
                </div>
            `;
        } else {
            var upgradePrice = item.getBlacksmithUpgradePrice();
            var upgradeRange = item.getBlacksmithUpgradePriceRange();
            var double = item.Type == 1 && (this.Player.Class != 1 || this.Player.Class != 4);
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

    toGrid (items, ignoreCost) {
        var content = '';
        var index = 0;

        for (var i = 0; i < items.length; i++) {
            content += `
                ${ index % 4 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    ${ this.getItemElement(items[i], ignoreCost) }
                </div>
            `;

            index++;
        }

        return content + '</div>';
    }

    toList (items) {
        var content = '';

        for (var i = 0; i < items.length; i++) {
            content += `
                <div class="row">
                    <div class="column">
                        ${ this.getItemElement(items[i], false, true) }
                    </div>
                </div>
            `;
        }

        return content;
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

        $('#show-compare, #show-crystal').off('click').hide();
        $('.ui.container').addClass('hidden');

        screen.$parent.removeClass('hidden');
        screen.show(... arguments);
    },
    initialize: function () {
        $(document).on('contextmenu', function () {
            //event.preventDefault();
        });

        UI.PlayerSelect = new PlayerSelectView('view-playerselect');
        UI.Inventory = new InventoryView('view-inventory');
        UI.Resources = new ResourcesView('view-resources');
    },
    preinitialize: function () {
        UI.Loader = new LoaderView('modal-loader');
        UI.Exception = new ExceptionView('modal-exception');
    }
}
