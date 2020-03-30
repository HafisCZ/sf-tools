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
        $('#show-back').off('click');
    }
}

// Character select view
class InventoryView extends View {
    constructor (parent) {
        super(parent);
    }

    show (id) {
        $('#show-back').click(function (event) {
            event.preventDefault();
            UI.show(UI.PlayerSelect);
        });

        this.Player = Database.Players[id].Latest;

        // WIP
        this.$parent.html(`<h1 class="ui centered header">${ this.Player.Name }</h1>`);
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
