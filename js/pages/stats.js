Site.ready(null, function (urlParams) {
    let profile = ProfileManager.getProfile(urlParams.get('profile'));
    if (urlParams.has('temp')) {
        Store.temporary();

        $('#show-profiles').addClass('pointer-events-none opacity-50');
        $('.css-temporary').show();

        profile = {
            temporary: true
        };
    } else if (urlParams.has('slot')) {
        profile['slot'] = urlParams.get('slot');
    }

    Loader.toggle(true);
    DatabaseManager.load(profile).then(function () {
        UI.register({
            Players: {
                tab: new PlayersTab('view-players'),
                buttonId: 'show-players'
            },
            PlayerDetail: {
                tab: new PlayerDetailTab('view-player-detail'),
                buttonId: 'show-players',
                buttonClickable: false
            },
            PlayerModal: {
                tab: new PlayerModalTab('view-player-modal')
            },
            Groups: {
                tab: new GroupsTab('view-groups'),
                buttonId: 'show-groups'
            },
            GroupDetail: {
                tab: new GroupDetailTab('view-group-detail'),
                buttonId: 'show-groups',
                buttonClickable: false
            },
            Browse: {
                tab: new BrowseTab('view-browse'),
                buttonId: 'show-browse'
            },
            Scripts: {
                tab: new ScriptsTab('view-scripts'),
                buttonId: 'show-scripts'
            },
            Files: {
                tab: new FilesTab('view-files'),
                buttonId: 'show-files'
            },
            Settings: {
                tab: new SettingsTab('view-settings'),
                buttonId: 'show-settings'
            },
            Profiles: {
                tab: new ProfilesTab('view-profiles'),
                buttonId: 'show-profiles'
            }
        });

        Loader.toggle(false);

        UI.show({
            'players': UI.Players,
            'groups': UI.Groups,
            'browse': UI.Browse,
            'scripts': UI.Scripts,
            'files': UI.Files
        }[SiteOptions.tab] || UI.Groups);

        if (urlParams.has('template')) {
            DialogController.open(SaveOnlineScriptDialog, urlParams.get('template'));
        }
    }).catch(function (e) {
        Loader.toggle(false);
        DialogController.open(ErrorDialog, `<h4 class="ui inverted header text-center">${intl('database.fatal_error#')}</h4><br>${e.message}`);
        Logger.error(e, 'Database could not be opened!');
    });
});