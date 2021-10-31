// Version stuff
const MODULE_VERSION = 'v5.1785';
const TABLE_VERSION = 'v9';
const CORE_VERSION = 'v3';

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
            'MIGRATE': '7a8ccf'
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
                window.localStorage;
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

    get (key, def) {
        return this.storage[key] ? JSON.parse(this.storage[key]) : def;
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
            groups_empty: false,
            players_hidden: false,
            browse_hidden: false,
            groups_other: false,
            players_other: false,
            always_prev: false,
            migration_allowed: true,
            migration_accepted: false,
            profile: 'default'
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

const DEFAULT_PROFILE = {
    name: 'Default',
    temporary: false,
    slot: 0,
    primary: null,
    secondary: null
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

const ProfileManager = new (class {
    constructor () {
        this.profiles = Object.assign({
            'default': DEFAULT_PROFILE,
            'own': {
                name: 'Own only',
                primary: {
                    name: 'own',
                    mode: 'equals',
                    value: ['1']
                },
                secondary: null
            },
            'month_old': {
                name: 'Newer that 1 month',
                primary: {
                    name: 'timestamp',
                    mode: 'above',
                    value: ['now() - 4 * @7days']
                },
                secondary: null
            }
        }, Preferences.get('db_profiles', {}));
    }

    isEditable (key) {
        return !['default', 'own', 'month_old'].includes(key) && SiteOptions.profile != key;
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
        return SiteOptions.profile || 'default';
    }

    setActiveProfile (name) {
        SiteOptions.profile = name;
    }

    removeProfile (name) {
        delete this.profiles[name];
        Preferences.set('db_profiles', this.profiles);
    }

    setProfile (name, profile) {
        this.profiles[name] = profile;
        Preferences.set('db_profiles', this.profiles);
    }

    getProfiles () {
        return Object.entries(this.profiles);
    }
})();
