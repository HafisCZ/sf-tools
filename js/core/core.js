// Version stuff
const MODULE_VERSION = 'v5.2250';
const TABLE_VERSION = 'v10';
const CORE_VERSION = 'v3.5';
const LOCALES_VERSION = 'v2';

const Logger = new (class {
    constructor () {
        this.colors = {
            'STORAGE': 'fcba03',
            'WARNING': 'fc6203',
            'R_FLAGS': '42adf5',
            'TAB_GEN': '3bc922',
            'VERSION': '90f5da',
            'PERFLOG': 'ffffff',
            'ECLIENT': 'd142f5',
            'TRACKER': 'c8f542',
            'ACTIONS': 'eb73c3'
        };

        this.log('VERSION', `Module: ${ MODULE_VERSION }, Core: ${ CORE_VERSION }, Table: ${ TABLE_VERSION }`);
    }

    log (type, text) {
        console.log(
            `%c${ type }%c${ text }`,
            `background-color: #${ this.colors[type] || 'ffffff' }; padding: 0.5em; font-size: 15px; font-weight: bold; color: black;`,
            'padding: 0.5em; font-size: 15px;'
        );
    }

    error (err, text) {
        this.log('WARNING', text);
        console.error(err);
    }
})();

class PreferencesHandler {
    static _isAccessible () {
        let currentValue = PreferencesHandler.available;

        if (typeof currentValue === 'undefined') {
            try {
                window.localStorage['test'];
                currentValue = true;
            } catch (exception) {
                currentValue = false;
            }

            if (!currentValue) {
                Logger.log('WARNING', 'Storage is not accessible');
                PreferencesHandler.available = currentValue;
            }
        }

        return currentValue;
    }

    _getStorage (kind) {
        if (PreferencesHandler._isAccessible()) {
            return window[kind];
        } else {
            return undefined;
        }
    }

    constructor () {
        this.storage = this._getStorage('localStorage') || this._getStorage('sessionStorage') || { };
    }

    set (key, object) {
        this.storage[key] = JSON.stringify(object);
    }

    setRaw (key, object) {
        this.storage[key] = object;
    }

    get (key, def) {
        return this.storage[key] ? JSON.parse(this.storage[key]) : def;
    }

    getRaw (key, def) {
        return this.storage[key] || def;
    }

    exists (key) {
        return this.storage[key] != null;
    }

    remove (key) {
        delete this.storage[key];
    }

    keys () {
        return Object.keys(this.storage);
    }

    getAll () {
        return this.storage;
    }

    temporary () {
        this.storage = { };
        this.anonymous = true;
    }
}

// Preferences
const Preferences = new PreferencesHandler();
const SharedPreferences = new PreferencesHandler();

const SiteOptions = new (class {
    constructor () {
        // Get values + defaults
        this.options = {
            insecure: false,
            obfuscated: false,
            advanced: false,
            hidden: false,
            terms_accepted: false,
            version_accepted: false,
            groups_hidden: false,
            players_hidden: false,
            browse_hidden: false,
            groups_other: false,
            players_other: false,
            always_prev: false,
            migration_allowed: true,
            migration_accepted: false,
            profile: 'default',
            groups_empty: false,
            tab: 'groups',
            load_rows: 50,
            persisted: false,
            locale: 'en'
        };

        this.listeners = [];

        Object.assign(this.options, SharedPreferences.get('options', {}));

        // Add setters & getters
        for (let propName of Object.keys(this.options)) {
            Object.defineProperty(this, propName, {
                get: function () {
                    return this.options[propName];
                },
                set: function (value) {
                    this.options[propName] = value;
                    Logger.log('R_FLAGS', `${propName} set to ${value}`)
                    SharedPreferences.set('options', this.options);
                    this.changed(propName);
                }
            });
        }
    }

    changed (option) {
        for (const { name, callback } of this.listeners) {
            if (name == option) callback(this.options[option]);
        }
    }

    onChange (option, listener) {
        this.listeners.push({
            name: option,
            callback: listener
        })
    }
})();

const Site = new (class {
    constructor () {
        this.promise = new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    locales () {
        return ['en', 'pt', 'pl', 'it'];
    }

    getLocale () {
        return SiteOptions.locale || 'en';
    }

    setLocale (locale) {
        SiteOptions.locale = locale;

        window.location.href = window.location.href;
    }

    run () {
        this.resolve();
    }

    ready (callback) {
        this.promise.then(callback);
    }
})();

const DEFAULT_PROFILE = {
    name: 'Default',
    temporary: false,
    slot: 0,
    primary: null,
    secondary: null,
    primary_g: null,
    secondary_g: null
};

const SELF_PROFILE = {
    primary: {
        name: 'own',
        mode: 'equals',
        value: ['1']
    },
    secondary: null,
    only_players: true
};

const FIGHT_SIMULATOR_PROFILE = {
    only_players: true,
    block_preload: true
}

const HYDRA_PROFILE = {
    block_preload: true
}

const DEFAULT_PROFILE_A = {
    name: 'Own only',
    primary: {
        name: 'own',
        mode: 'equals',
        value: ['1']
    },
    secondary: null,
    primary_g: {
        name: 'own',
        mode: 'equals',
        value: ['1']
    },
    secondary_g: null
};

const DEFAULT_PROFILE_B = {
    name: 'Newer that 1 month',
    primary: {
        name: 'timestamp',
        mode: 'above',
        value: ['now() - 4 * @7days']
    },
    secondary: null,
    primary_g: {
        name: 'timestamp',
        mode: 'above',
        value: ['now() - 4 * @7days']
    },
    secondary_g: null
};

const ProfileManager = new (class {
    constructor () {
        this.profiles = Object.assign(Preferences.get('db_profiles', {}), {
            'default': DEFAULT_PROFILE,
            'own': DEFAULT_PROFILE_A,
            'month_old': DEFAULT_PROFILE_B
        });

        for (const [key, profile] of Object.entries(this.profiles)) {
            profile.key = key
        }
    }

    uiProfile () {
        if (typeof UI !== 'undefined') {
            return _dig(UI, 'profile', 'key');
        } else {
            return undefined;
        }
    }

    isEditable (key) {
        return !this.isDefault(key) && this.uiProfile() != key;
    }

    getDefaultProfile () {
        return this.profiles['default'];
    }

    getActiveProfile () {
        return this.profiles[SiteOptions.profile] || this.getDefaultProfile();
    }

    getProfile (name) {
        return this.profiles[name] || this.getActiveProfile();
    }

    getActiveProfileName () {
        return this.uiProfile() || SiteOptions.profile || 'default';
    }

    setActiveProfile (name) {
        SiteOptions.profile = name;
    }

    removeProfile (name) {
        delete this.profiles[name];
        Preferences.set('db_profiles', this.profiles);
    }

    setProfile (name, profile) {
        this.profiles[name] = Object.assign(profile, { updated: Date.now() });
        Preferences.set('db_profiles', this.profiles);
    }

    isDefault(name) {
        return ['default', 'own', 'month_old'].includes(name);
    }

    getProfiles () {
        return [
            [ 'default', this.profiles['default'] ],
            [ 'own', this.profiles['own'] ],
            [ 'month_old', this.profiles['month_old'] ],
            ..._sort_des(Object.entries(this.profiles).filter(([key, ]) => !this.isDefault(key)), ([, val]) => val.updated || 0)
        ];
    }
})();

const ACTION_PROPS = ['players', 'groups', 'origin'];

const Actions = new (class {
    init () {
        this.defaultScript = typeof PredefinedTemplates === 'object' ? PredefinedTemplates['Actions'] : '';

        this._loadScript();
        this._executeScript();
    }

    _loadScript () {
        this.script = Preferences.get('actions_script', this.defaultScript);
    }

    _saveScript () {
        Preferences.set('actions_script', this.script);
    }

    _executeScript () {
        this.actions = new Settings(this.script || '', null, EditorType.ACTIONS).actions;
    }

    getScript () {
        return this.script;
    }

    resetScript () {
        Preferences.remove('actions_script');

        this._loadScript();
        this._executeScript();
    }

    setScript (script) {
        this.script = script;

        this._saveScript();
        this._executeScript();
    }

    async apply (playerData, groupData, origin) {
        if (_not_empty(this.actions)) {
            let players = playerData.map(({identifier, timestamp}) => DatabaseManager.getPlayer(identifier, timestamp));
            let groups = groupData.map(({identifier, timestamp}) => DatabaseManager.getGroup(identifier, timestamp));

            for (const action of this.actions) {
                Logger.log('ACTIONS', `Applying action ${action.action}`)
                await this._applyAction(action, players, groups, origin);
            }
        }
    }

    async _applyAction ({ action, type, args }, players, groups, origin) {
        if (action == 'tag') {
            const [tagExpr, conditionExpr] = args;

            if (type == 'player') {
                for (const player of players) {
                    let scope = new ExpressionScope().with(player, player).add({ origin });
                    if (scope.eval(conditionExpr)) {
                        let tag = scope.eval(tagExpr);
                        if (player.Data.tag != tag) {
                            await DatabaseManager.setTagFor(player.Identifier, player.Timestamp, tag);
                        }
                    }
                }
            } else if (type == 'file') {
                let mappedPlayers = Object.assign(players.map(p => [p, p]), { segmented: true });
                let scope = new ExpressionScope().add({ players: mappedPlayers, groups, origin });
                if (scope.eval(conditionExpr)) {
                    const tag = scope.eval(tagExpr);
                    for (const { Identifier: id, Timestamp: ts, Data: data } of players) {
                        if (data.tag != tag) {
                            await DatabaseManager.setTagFor(id, ts, tag);
                        }
                    }
                }
            } else {
                throw 'Invalid action';
            }
        } else if (action == 'remove') {
            const [conditionExpr] = args;

            if (type == 'player') {
                let playersToRemove = [];

                for (const player of players) {
                    let scope = new ExpressionScope().with(player, player).add({ origin });
                    if (scope.eval(conditionExpr)) {
                        playersToRemove.push(player.Data);
                    }
                }

                await DatabaseManager.remove(playersToRemove);
            } else {
                throw 'Invalid action';
            }
        } else {
            throw 'Invalid action';
        }
    }
})();
