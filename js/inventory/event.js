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

        var content = '';
        var index = 0;

        var players = Object.values(Database.Players).map(player => player.Latest);
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
    }

    show () {
        UI.reset();
    }
}

function getLocalizedRune (type, value) {
    return `
        <div class="item"><img src="res/rune${ type }.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; margin-left: -0.5em; display: inline-block;"></img> +${ value }% <b>${ RUNETYPES[type] }</b></div>
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
        <div class="item"><img src="res/gem${ type }.png" style="width: 2em; height: 2em; margin-top: -0.5em; margin-bottom: -0.625em; margin-right: -0.25em; margin-left: -0.5em; display: inline-block;"></img> +${ value } <b>${ GEMATTRIBUTES[type] }</b></div>
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
                    Empty slot for ${ ITEM_TYPES[item.Slot] } (${ PLAYER_CLASS[item.Class] })
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
                    ${ toileted ? '<span class="css-inventory-sub washed">Washed</span> ' : '' }${ item.HasSocket ? '<span class="css-inventory-sub socketed">Socketed</span> ' : '' }${ ITEM_TYPES[item.Type] } (${ PLAYER_CLASS[item.Class] })${ item.HasRune ? ` <span class="css-inventory-sub runed">${ getNiceRuneText(item.RuneType) }</span>` : '' }
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
                        ${ item.HasGem ? getLocalizedGem(item.GemType, item.GemValue) : '' }
                        ${ item.HasRune ? getLocalizedRune(item.RuneType, item.RuneValue) : '' }
                        ${ item.Upgrades ? `<div class="item"><b>Upgrades</b> ${ item.Upgrades }/20</div>` : '' }
                        ${ toileted ? `<div class="item"><b>Toileted</b></div>` : '' }
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

function getComparisonElement (player, base, item, gemless) {
    return `
        <div class="css-inventory-comparison">
            <div class="item green">
                <div class="sub">
                    + 15
                </div>
                <div class="sub">
                    <b>Something</b>
                </div>
            </div>
            <div class="item red">
                <div class="sub">
                    - 15
                </div>
                <div class="sub">
                    <b>Something else</b>
                </div>
            </div>
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

        this.$parent.find('[data-eid] .css-inventory-item-header').on('contextmenu', function () {
            event.preventDefault();
            $(this).parent('.css-inventory-item').toggleClass('micro');
        });

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
        });

        this.backpack = this.Player.Inventory.Backpack.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));
        this.chest = this.Player.Inventory.Chest.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));
        this.shops = this.Player.Inventory.Shop.filter(i => isAllowedType(i)).map(i => mapToInventory(this.Items, i));

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
                    $(e).find('.back').show().html(getComparisonElement(this.Player, base, item));
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
