$('#show-compare, #show-crystal').hide();

Site.ready(null, function (urlParams) {
    Loader.toggle(true);
    DatabaseManager.load(SELF_PROFILE).then(function () {
        UI.initialize();
        Loader.toggle(false);

        var id = urlParams.get('id');
        if (DatabaseManager.Players[id]) {
            UI.show(UI.Inventory, { id });
            UI.reset(true);
        } else {
            UI.show(UI.PlayerSelect);
        }
    }).catch(function (e) {
        Loader.toggle(false);
        DialogController.open(ErrorDialog, `<h4 class="ui inverted header text-center">${intl('database.fatal_error#')}</h4><br>${e.message}`);
        Logger.error(e, 'Database could not be opened!');
    });
})