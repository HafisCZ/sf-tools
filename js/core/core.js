// Version stuff
const MODULE_VERSION_MAJOR = '5';
const MODULE_VERSION = 'v5.2897';
const TABLE_VERSION = 'v10';
const CORE_VERSION = 'v3.5';

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
            'ACTIONS': 'eb73c3',
            'IN_WARN': 'ebd883',
            'APPINFO': 'd29af8',
            'MESSAGE': 'ffffff',
            'APICALL': 'd99ab5'
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

class StoreWrapper {
    static isAvailable () {
        let currentValue = StoreWrapper.available;
        if (typeof currentValue === 'undefined') {
            try {
                window.localStorage['test'];
                currentValue = true;
            } catch (exception) {
                currentValue = false;
            }

            if (!currentValue) {
                Logger.log('WARNING', 'Storage is not accessible');
                StoreWrapper.available = currentValue;
            }
        }

        return currentValue;
    }

    static getStore (type) {
        if (StoreWrapper.isAvailable()) {
            return window[type];
        } else {
            return undefined;
        }
    }

    constructor (store) {
        this.store = store;
    }

    set (key, data, rawData = false) {
        this.store[key] = rawData ? data : JSON.stringify(data);
    }

    get (key, defaultData, rawData = false) {
        const data = this.store[key];
        return data ? (rawData ? data : JSON.parse(data)) : defaultData;
    }

    remove (key) {
        delete this.store[key];
    }

    keys () {
        return Object.keys(this.store);
    }

    all () {
        return this.store;
    }

    temporary () {
        this.store = {};
    }

    isTemporary () {
        return !(this.store instanceof Storage);
    }
}

const Store = (function () {
    const store = StoreWrapper.getStore('localStorage') || StoreWrapper.getStore('sessionStorage') || {}
    return Object.assign(
        new StoreWrapper(store),
        {
            shared: new StoreWrapper(store)
        }
    );
})();

// Options
const OptionsHandler = class {
    constructor (key, defaults) {
        this.key = key;
        this.defaults = defaults;
        this.options = Object.assign({}, defaults);

        this.listeners = [];

        Object.assign(this.options, Store.shared.get(this.key, {}));

        for (const name of Object.keys(this.options)) {
            Object.defineProperty(this, name, {
                get: function () {
                    return this.options[name];
                },
                set: function (value) {
                    this.options[name] = value;
                    Logger.log('R_FLAGS', `${this.key}.${name} set to ${Array.isArray(value) ? `[...${value.length}]` : value}`)
                    Store.shared.set(this.key, this.options);
                    this.changed(name);
                }
            });
        }
    }

    keys () {
        return Object.keys(this.defaults);
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
}

const SiteOptions = new OptionsHandler(
    'options',
    {
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
        locale: 'en',
        debug: false,
        export_public_only: false,
        export_bundle_groups: true,
        unsafe_delete: false
    }
)

const Exporter = new (class {
    json (content, name = Date.now()) {
        download(`${ name }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
    }
})();

const Site = new (class {
    constructor () {
        this.startup = Date.now();
        this.promise = new Promise((resolve) => {
            this.resolve = resolve;
        });
    }

    run () {
        Logger.log('APPINFO', `Application ready in ${Date.now() - this.startup} ms`);

        this.resolve();
    }

    ready (callback) {
        this.promise.then(() => {
            this.data = callback(new URLSearchParams(window.location.search)) || {};
        });
    }

    async recover (json) {
        let { preferences, data } = json;

        await DatabaseManager._reset();

        for (let [key, value] of Object.entries(preferences)) {
            Store.shared.set(key, value, true);
        }

        for (let [slot, { players, groups, trackers, metadata }] of Object.entries(data)) {
            let db = await DatabaseUtils.createSession(parseInt(slot || '0'));

            await db.clear('players');
            await db.clear('groups');
            await db.clear('trackers');
            await db.clear('metadata');

            for (let player of players) {
                await db.set('players', player);
            }

            for (let group of groups) {
                await db.set('groups', group);
            }

            for (let tracker of trackers) {
                await db.set('trackers', tracker);
            }

            for (let metadat of metadata) {
                await db.set('metadata', metadat);
            }
        }
    }

    async dump () {
        let prefs = Store.shared.all();
        let slots = _uniq(Object.values(ProfileManager.profiles).map(profile => profile.slot || 0));
        let dumps = {};

        let slotDumps = slots.map(slot => new Promise(async (resolve, reject) => {
            let db = await DatabaseUtils.createSession(parseInt(slot || '0'));

            dumps[slot] = {
                players: await db.where('players'),
                groups: await db.all('groups'),
                trackers: await db.all('trackers'),
                metadata: await db.all('metadata')
            }

            resolve()
        }));

        return Promise.all(slotDumps).then(() => {
            return {
                timestamp: Date.now(),
                preferences: prefs,
                data: dumps
            };
        })
    }
})();

const SiteAPI = new (class {
    constructor () {
        this.baseUrl = 'https://sftools-api.netlify.app/api/'
    }

    log (method, url) {
        Logger.log('APICALL', `${method} ${url}`)
    }

    async post (endpoint, data) {
        const url = `${this.baseUrl}${endpoint}`;
        this.log('POST', url);

        return new Promise((resolve, reject) => {
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(data)
            }).then((response) => {
                return response.json();
            }).then((data) => {
                if (data.error) {
                    reject(data);
                } else {
                    resolve(data);
                }
            }).catch((e) => {
                reject({ error: e.message });
            })
        })
    }

    async get (endpoint, params = {}) {
        const url = `${this.baseUrl}${endpoint}?${_hash_to_query(params)}`;
        this.log('GET', url);

        return new Promise((resolve, reject) => {
            fetch(url).then((response) => {
                return response.json();
            }).then((data) => {
                if (data.error) {
                    reject(data);
                } else {
                    resolve(data);
                }
            }).catch((e) => {
                reject({ error: e.message });
            });
        })
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
        this.profiles = Object.assign(Store.get('db_profiles', {}), {
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
        Store.set('db_profiles', this.profiles);
    }

    setProfile (name, profile) {
        this.profiles[name] = Object.assign(profile, { updated: Date.now() });
        Store.set('db_profiles', this.profiles);
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

const ACTION_PROPS = ['players', 'groups'];

const Actions = new (class {
    init () {
        this.defaultScript = typeof DefaultScripts === 'object' ? DefaultScripts.actions.content : '';

        this._loadScript();

        const legacyTracker = SettingsManager.get('tracker', '');
        if (legacyTracker) {
            this.script = `${this.script || ''}\n${legacyTracker}`;

            Store.set('actions_script', this.script);
            SettingsManager.remove('tracker');
        }

        this._executeScript();
    }

    _loadScript () {
        this.script = Store.get('actions_script', this.defaultScript);
    }

    _saveScript () {
        Store.set('actions_script', this.script);
    }

    _executeScript () {
        this.instance = new Settings(this.script || '', null, EditorType.ACTIONS)

        this.actions = this.instance.actions;
        this.trackers = this.instance.trackers;
    }

    getScript () {
        return this.script;
    }

    getInstance () {
        return this.instance;
    }

    getActions () {
        return this.actions;
    }

    getTrackers () {
        return this.trackers;
    }

    resetScript () {
        Store.remove('actions_script');

        this._loadScript();
        this._executeScript();
    }

    setScript (script) {
        this.script = script;

        this._saveScript();
        this._executeScript();
    }

    async apply (playerData, groupData) {
        if (_not_empty(this.actions)) {
            let players = playerData.map(({identifier, timestamp}) => DatabaseManager.getPlayer(identifier, timestamp));
            let groups = groupData.map(({identifier, timestamp}) => DatabaseManager.getGroup(identifier, timestamp));

            for (const action of this.actions) {
                Logger.log('ACTIONS', `Applying action ${action.action}`)
                await this._applyAction(action, players, groups);
            }
        }
    }

    async _applyAction ({ action, type, args }, players, groups) {
        if (action == 'tag') {
            const [tagExpr, conditionExpr] = args;

            if (type == 'player') {
                for (const player of players) {
                    let scope = new ExpressionScope().with(player, player);
                    if (scope.eval(conditionExpr)) {
                        let tag = scope.eval(tagExpr);
                        if (player.Data.tag != tag) {
                            await DatabaseManager.setTagFor(player.Identifier, player.Timestamp, tag);
                        }
                    }
                }
            } else if (type == 'file') {
                let mappedPlayers = Object.assign(players.map(p => [p, p]), { segmented: true });
                let scope = new ExpressionScope().add({ players: mappedPlayers, groups });
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
                    let scope = new ExpressionScope().with(player, player);
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
