// Version stuff
const MODULE_VERSION_MAJOR = '6';
const MODULE_VERSION_MINOR = '3586';
const MODULE_VERSION = `v${MODULE_VERSION_MAJOR}.${MODULE_VERSION_MINOR}`

const Logger = new (class {
    constructor () {
        this.colors = {
            'STORAGE': 'fcba03',
            'WARNING': 'fc6203',
            'OPTIONS': '42adf5',
            'TAB_GEN': '3bc922',
            'PERFLOG': 'ffffff',
            'ECLIENT': 'd142f5',
            'TRACKER': 'c8f542',
            'ACTIONS': 'eb73c3',
            'IN_WARN': 'ebd883',
            'APPINFO': 'd29af8',
            'MESSAGE': 'ffffff',
            'APICALL': 'd99ab5',
            'CHANNEL': 'fccb81'
        };

        this.log('APPINFO', `Version ${MODULE_VERSION}`);
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
                    Logger.log('OPTIONS', `Set ${this.key}.${name} to ${Array.isArray(value) ? `[...${value.length}]` : value}`)
                    Store.shared.set(this.key, this.options);
                    this.changed(name);
                }
            });
        }
    }

    default (key) {
        return this.defaults[key];
    }

    reset (key) {
        this[key] = this.defaults[key];
    }

    keys () {
        return Object.keys(this.defaults);
    }

    toggle (key) {
        this[key] = !this[key];
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
        endpoint_terms_accepted: false,
        simulator_notice_accepted: false,
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
        load_rows: 100,
        persisted: false,
        locale: 'en',
        export_public_only: false,
        export_bundle_groups: true,
        unsafe_delete: false,
        event_override: [],
        legacy_battlemage_icon: false
    }
)

const Exporter = new (class {
    get time () {
        return new Date().toISOString().replace(/[\-\:\.T]/g, '_').replace(/Z$/, '');
    }

    json (content, name = this.time) {
        window.download(`${ name }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
    }

    png (content, name = this.time) {
        window.download(`${ name }.png`, content);
    }

    csv (content, name = this.time) {
        window.download(`${ name }.csv`, new Blob([ content ], { type: 'text/csv' }));
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

    is (type) {
        return this.metadata && this.metadata.type === type;
    }

    isEvent (type) {
        if (Array.isArray(SiteOptions.event_override)) {
            if (SiteOptions.event_override.includes(type)) {
                return true;
            }
        }

        const date = new Date();

        if (type === 'april_fools_day') {
            return date.getMonth() === 3 && date.getDate() === 1;
        } else if (type === 'winter') {
            return [0, 1, 11].includes(date.getMonth());
        } else {
            return false;
        }
    }

    ready (metadata, callback) {
        this.metadata = metadata;

        this.promise.then(() => {
            this.data = callback(new URLSearchParams(window.location.search)) || {};
        });
    }

    async recover (json) {
        let { preferences, data } = json;

        await DatabaseManager.reset();

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
        const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`;
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

const SELF_PROFILE_WITH_GROUP = {
    primary: {
        name: 'own',
        mode: 'equals',
        value: ['1']
    },
    secondary: null
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
            ..._sortDesc(Object.entries(this.profiles).filter(([key, ]) => !this.isDefault(key)), ([, val]) => val.updated || 0)
        ];
    }
})();

const Actions = class {
    static get EXPRESSION_CONFIG () {
        delete this.EXPRESSION_CONFIG;

        const config = TABLE_EXPRESSION_CONFIG.clone();
        for (const name of ['players', 'groups']) {
            config.register('variable', 'scope', name, (scope) => scope.get(name));
        }

        return (this.EXPRESSION_CONFIG = config);
    }

    static init () {
        this.defaultScript = typeof DefaultScripts === 'object' ? DefaultScripts.getContent('actions') : '';

        this._loadScript();

        const legacyTracker = ScriptManager.getContent('tracker', '');
        if (legacyTracker) {
            this.script = `${this.script || ''}\n${legacyTracker}`;

            Store.set('actions_script', this.script);
            ScriptManager.remove('tracker');
        }

        this._executeScript();
    }

    static _loadScript () {
        this.script = Store.get('actions_script', this.defaultScript);
    }

    static _saveScript () {
        Store.set('actions_script', this.script);
    }

    static _executeScript () {
        this.instance = new Settings(this.script || '', null, ScriptType.Action)

        this.actions = this.instance.actions;
        this.trackers = this.instance.trackers;
    }

    static getScript () {
        return this.script;
    }

    static getInstance () {
        return this.instance;
    }

    static getActions () {
        return this.actions;
    }

    static getTrackers () {
        return this.trackers;
    }

    static resetScript () {
        Store.remove('actions_script');

        this._loadScript();
        this._executeScript();
    }

    static setScript (script) {
        this.script = script;

        this._saveScript();
        this._executeScript();
    }

    static async apply (playerData, groupData) {
        if (_notEmpty(this.actions)) {
            let players = playerData.map(({identifier, timestamp}) => DatabaseManager.getPlayer(identifier, timestamp));
            let groups = groupData.map(({identifier, timestamp}) => DatabaseManager.getGroup(identifier, timestamp));

            for (const action of this.actions) {
                Logger.log('ACTIONS', `Applying action ${action.action}`)
                await this._applyAction(action, players, groups);
            }
        }
    }

    static async _applyAction ({ action, type, args }, players, groups) {
        if (action == 'tag') {
            const [tagExpr, conditionExpr] = args;

            if (type == 'player') {
                for (const player of players) {
                    let scope = new ExpressionScope().with(player, player);
                    if (conditionExpr.eval(scope)) {
                        let tag = tagExpr.eval(scope);
                        if (player.Data.tag != tag) {
                            await DatabaseManager.setTagFor(player.Identifier, player.Timestamp, tag);
                        }
                    }
                }
            } else if (type == 'file') {
                let mappedPlayers = Object.assign(players.map(p => [p, p]), { segmented: true });
                let scope = new ExpressionScope().add({ players: mappedPlayers, groups });
                if (conditionExpr.eval(scope)) {
                    const tag = tagExpr.eval(scope);
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
                    if (conditionExpr.eval(scope)) {
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
}

class Broadcast {
    constructor (token = this._randomToken()) {
        Logger.log('CHANNEL', `Creating channel ${token}`);

        this._token = token;
        this._channel = new BroadcastChannel(token);
    }

    on (type, callback) {
        this._channel.addEventListener('message', ({ data: { type: _type, data } }) => {
            if (_type === type) {
                Logger.log('CHANNEL', `Received ${type} from ${this._token}`);

                callback(data);
            }
        })
    }

    send (type, data) {
        Logger.log('CHANNEL', `Sending ${type} to ${this._token}`);

        this._channel.postMessage({
            type, data
        });
    }

    close () {
        Logger.log('CHANNEL', `Closing channel ${this._token}`)

        this._channel.close();
    }

    _randomToken () {
        return randomSHA1();
    }

    get token () {
        return this._token;
    }
}
