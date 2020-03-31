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

function getItemElement (item) {
    return `
        <div class="css-inventory-item">
            <div class="css-inventory-item-header">
                ${ ITEM_TYPES[item.Type] }
            </div>
            <div class="css-inventory-item-attribute-group">
                ${ item.Strength.Value ? `<div class="css-inventory-item-attribute">${ item.Strength.Value } Strength</div>` : '' }
                ${ item.Dexterity.Value ? `<div class="css-inventory-item-attribute">${ item.Dexterity.Value } Dexterity</div>` : '' }
                ${ item.Intelligence.Value ? `<div class="css-inventory-item-attribute">${ item.Intelligence.Value } Intelligence</div>` : '' }
                ${ item.Constitution.Value ? `<div class="css-inventory-item-attribute">${ item.Constitution.Value } Constitution</div>` : '' }
                ${ item.Luck.Value ? `<div class="css-inventory-item-attribute">${ item.Luck.Value } Luck</div>` : '' }
            </div>
            <div class="css-inventory-item-extra-group">
                ${ item.HasGem ? `<div class="css-inventory-item-extra">${ GEMTYPES[item.GemType] } (+ ${ item.GemValue } ${ item.GemType == 6 ? 'Everything' : POTIONS[this.GemType] })</div>` : (item.HasSocket ? `<div class="css-inventory-item-extra">Empty socket</div>` : '') }
                ${ item.HasRune ? `<div class="css-inventory-item-extry">${ item.RuneValue }% ${ RUNETYPES[item.RuneType] }</div>` : '' }
            </div>
            <div class="css-inventory-item-price-group">
                <div class="css-inventory-item-price">Sell: ${ Math.trunc(item.SellPrice.Gold) ? `${ formatAsSpacedNumber(Math.trunc(item.SellPrice.Gold)) } Gold ` : 'Flushed ' }${ item.SellPrice.Metal ? `${ item.SellPrice.Metal } Metal ` : '' }${ item.SellPrice.Crystal ? `${ item.SellPrice.Crystal } Crystals` : '' }</div>
                <div class="css-inventory-item-price">Dismantle: ${ item.DismantlePrice.Metal } Metal ${ item.DismantlePrice.Crystal ? ` ${ item.DismantlePrice.Crystal } Crystals` : '' }</div>
            </div>
        </div>
    `;
}

function toGrid (items) {
    var content = '';
    var index = 0;

    for (var i = 0; i < items.length; i++) {
        if (items[i].Type >= 1 && items[i].Type <= 10) {
            content += `
                ${ index % 4 == 0 ? `${ index != 0 ? '</div>' : '' }<div class="row">` : '' }
                <div class="column">
                    ${ getItemElement(items[i]) }
                </div>
            `;

            index++;
        }
    }

    return content + '</div>';
}

function toList (items) {
    var content = '';

    for (var i = 0; i < items.length; i++) {
        if (items[i].Type >= 1 && items[i].Type <= 10) {
            content += `
                <div class="row">
                    <div class="column">
                        ${ getItemElement(items[i]) }
                    </div>
                </div>
            `;
        }
    }

    return content;
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
        UI.reset(true);
        this.Player = Database.Players[id].Latest;

        this.$equipped.html(toList(Object.values(this.Player.Items)));

        this.$backpack.html(toGrid(this.Player.Inventory.Backpack));
        this.$chest.html(toGrid(this.Player.Inventory.Chest));
        this.$shops.html(toGrid(this.Player.Inventory.Shop));
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
