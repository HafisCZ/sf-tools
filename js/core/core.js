// Version stuff
const MODULE_VERSION_MAJOR = '7';
const MODULE_VERSION_MINOR = '4811';
const MODULE_VERSION = `v${MODULE_VERSION_MAJOR}.${MODULE_VERSION_MINOR}`

class Logger {
    static #colors = {
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
        'CHANNEL': 'fccb81',
        'STDEBUG': 'c5d3e8'
    };

    static log (type, text) {
        console.log(
            `%c${ type }%c${ text }`,
            `background-color: #${ this.#colors[type] || 'ffffff' }; padding: 0.5em; font-size: 15px; font-weight: bold; color: black;`,
            'padding: 0.5em; font-size: 15px;'
        );
    }

    static error (err, text) {
        this.log('WARNING', text);
        console.error(err);
    }
};

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

    has (key) {
        return key in this.store;
    }

    all () {
        return this.store;
    }

    temporary () {
        this.store = {};
    }

    isTemporary () {
        return !this.isPermanent();
    }

    isPermanent () {
        return this.store instanceof Storage;
    }
}

const Store = (function () {
    const store = StoreWrapper.getStore('localStorage') || StoreWrapper.getStore('sessionStorage') || {}
    return Object.assign(
        new StoreWrapper(store),
        {
            shared: new StoreWrapper(store),
            session: new StoreWrapper(StoreWrapper.getStore('sessionStorage') || {})
        }
    );
})();

class StoreCache {
  // Timings
  static hours (value) {
    return value * 60 * 60 * 1000;
  }

  // Method
  static use (key, getter, lifetime) {
    const { entries } = Store.get('cache', { entries: {} });
  
    return new Promise(async (resolve, reject) => {
      if (entries[key] && entries[key].expire >= Date.now()) {
        resolve(entries[key].value);
      } else {
        try {
          const value = await getter();
    
          entries[key] = {
            value,
            expire: Date.now() + lifetime
          }
    
          Store.set('cache', { entries });
    
          resolve(value);
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  static invalidate (key) {
    const { entries } = Store.get('cache', { entries: {} });

    delete entries[key];

    Store.set('cache', { entries });
  }

  static clear () {
    Store.set('cache', { entries: {} });
  }
}

// Options
class OptionsHandler {
    #key;
    #defaults = {};
    #listeners = [];

    constructor (key, defaults) {
        this.#key = key;
        this.#defaults = defaults;
        this.options = Object.assign({}, defaults);

        Object.assign(this.options, Store.shared.get(this.#key, {}));

        for (const name of Object.keys(this.options)) {
            Object.defineProperty(this, name, {
                get: function () {
                    return this.options[name];
                },
                set: function (value) {
                    if (this.options[name] === value && typeof value !== 'object') return;
                    else {
                        this.options[name] = value;
                        Logger.log('OPTIONS', `Set ${this.#key}.${name} to ${Array.isArray(value) ? `[...${value.length}]` : value}`)
                        Store.shared.set(this.#key, this.options);
                        this.#changed(name);
                    }
                }
            });
        }
    }

    default (key) {
        return this.#defaults[key];
    }

    reset (key) {
        this[key] = this.#defaults[key];
    }

    keys () {
        return Object.keys(this.#defaults);
    }

    toggle (key) {
        this[key] = !this[key];
    }

    #changed (option) {
        for (const { name, callback } of this.#listeners) {
            if (name == option) callback(this.options[option]);
        }
    }

    onChange (option, listener) {
        this.#listeners.push({
            name: option,
            callback: listener
        })
    }
}

class Exporter {
    static get time () {
        return new Date().toISOString().replace(/[\-\:\.T]/g, '_').replace(/Z$/, '');
    }

    static download (name, content) {
        const url = URL.createObjectURL(content);

        const node = document.createElement('a');
        node.download = name;
        node.href = url;

        document.body.appendChild(node);
        node.click();
        node.remove();

        URL.revokeObjectURL(url);
    }

    static json (content, name = this.time) {
        this.download(`${ name }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
    }

    static png (content, name = this.time) {
        this.download(`${ name }.png`, content);
    }

    static csv (content, name = this.time) {
        this.download(`${ name }.csv`, new Blob([ content ], { type: 'text/csv' }));
    }

    static txt (content, name = this.time) {
        this.download(`${ name }.txt`, new Blob([ content ], { type: 'text/plain' }));
    }
}

class Site {
    static #metadata;
    static #resolve;

    static #startup = Date.now();
    static #promise = new Promise((resolve) => {
        Logger.log('APPINFO', `Version ${MODULE_VERSION}`);

        this.#resolve = resolve;
    });

    static options = new OptionsHandler(
        'options',
        {
            advanced: false,
            hidden: false,
            terms_accepted: false,
            endpoint_terms_accepted: false,
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
            tab: 'groups_grid',
            load_rows: 100,
            persisted: false,
            has_storage_access: false,
            locale: 'en',
            export_public_only: false,
            export_bundle_groups: true,
            unsafe_delete: false,
            skip_grid_if_single_entry_present: true,
            event_override: [],
            simulator_info_id: 0,
            table_sticky_header: false,
            script_author: '',
            debug: false,
            backup_reminder_frequency: 1,
            backup_reminder_timestamp: Date.now() + 2592000000,
            announcement_accepted: 0,
            announcements_viewed: []
        }
    )

    static run () {
        Logger.log('APPINFO', `Application ready in ${Date.now() - this.#startup} ms`);

        this.#resolve();
    }

    static is (name) {
        return this.#metadata.name === name;
    }

    static isType (type) {
        return this.#metadata.type === type;
    }

    static requires (name) {
        return this.#metadata.requires?.includes(name);
    }

    static isEvent (type) {
        if (Array.isArray(Site.options.event_override)) {
            if (Site.options.event_override.includes(type)) {
                return true;
            }
        }

        const date = new Date();

        if (type === 'april_fools_day') {
            return date.getMonth() === 3 && date.getDate() === 1;
        } else if (type === 'winter') {
            return [0, 1, 11].includes(date.getMonth());
        } else if (type === 'halloween') {
            return date.getMonth() === 9;
        } else {
            return false;
        }
    }

    static ready (metadata, callback) {
        this.#metadata = metadata;
        this.#promise.then(() => {
            this.data = callback(new URLSearchParams(window.location.search)) || {};
        });
    }

    static async recover (json) {
        let { preferences, data } = json;

        await DatabaseManager.reset();

        for (let [key, value] of Object.entries(preferences)) {
            Store.shared.set(key, value, true);
        }

        for (let [slot, { players, groups, trackers, metadata, links }] of Object.entries(data)) {
            let db = await DatabaseUtils.createSession(parseInt(slot || '0'));

            await db.clear('players');
            await db.clear('groups');
            await db.clear('trackers');
            await db.clear('metadata');
            await db.clear('links');

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

            for (let link of (links ?? [])) {
                await db.set('links', link);
            }
        }
    }

    static async dump () {
        let prefs = Store.shared.all();
        let slots = _uniq(Object.values(ProfileManager.profiles).map(profile => profile.slot || 0));
        let dumps = {};

        let slotDumps = slots.map(slot => new Promise(async (resolve) => {
            let db = await DatabaseUtils.createSession(parseInt(slot || '0'));

            dumps[slot] = {
                players: await db.where('players'),
                groups: await db.all('groups'),
                trackers: await db.all('trackers'),
                metadata: await db.all('metadata'),
                links: await db.all('links')
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
}

class SiteAPI {
    static #baseUrl = 'https://api.sftools.mar21.eu/api/';

    static #log (method, url) {
        Logger.log('APICALL', `${method} ${url}`)
    }

    static async post (endpoint, data) {
        const url = `${this.#baseUrl}${endpoint}`;
        this.#log('POST', url);

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

    static async get (endpoint, params = {}) {
        const url = `${this.#baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`;
        this.#log('GET', url);

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
}

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

class ProfileManager {
    static profiles = (function () {
        const data = Object.assign(Store.get('db_profiles', {}), {
            'default': DEFAULT_PROFILE,
            'own': DEFAULT_PROFILE_A,
            'month_old': DEFAULT_PROFILE_B
        });

        for (const [key, profile] of Object.entries(data)) {
            profile.key = key
        }

        return data;
    })();

    static #uiProfile () {
        if (typeof UI !== 'undefined') {
            return _dig(UI, 'profile', 'key');
        } else {
            return undefined;
        }
    }

    static isEditable (key) {
        return !this.#isDefault(key) && this.#uiProfile() != key;
    }

    static #getDefaultProfile () {
        return this.profiles['default'];
    }

    static getActiveProfile () {
        return this.profiles[Site.options.profile] || this.#getDefaultProfile();
    }

    static getProfile (name) {
        return this.profiles[name] || this.getActiveProfile();
    }

    static getActiveProfileName () {
        return this.#uiProfile() || Site.options.profile || 'default';
    }

    static setActiveProfile (name) {
        Site.options.profile = name;
    }

    static removeProfile (name) {
        delete this.profiles[name];
        Store.set('db_profiles', this.profiles);
    }

    static setProfile (name, profile) {
        this.profiles[name] = Object.assign(profile, { updated: Date.now() });
        Store.set('db_profiles', this.profiles);
    }

    static #isDefault (name) {
        return ['default', 'own', 'month_old'].includes(name);
    }

    static getProfiles () {
        return [
            [ 'default', this.profiles['default'] ],
            [ 'own', this.profiles['own'] ],
            [ 'month_old', this.profiles['month_old'] ],
            ..._sortDesc(Object.entries(this.profiles).filter(([key, ]) => !this.#isDefault(key)), ([, val]) => val.updated || 0)
        ];
    }
}

class Actions {
    static #script;
    static #defaultScript;

    static #instance;
    static #actions;
    static #trackers;

    static get EXPRESSION_CONFIG () {
        delete this.EXPRESSION_CONFIG;

        const config = TABLE_EXPRESSION_CONFIG.clone();
        for (const name of ['players', 'groups']) {
            config.register('variable', 'scope', name, (scope) => scope.get(name));
        }

        return (this.EXPRESSION_CONFIG = config);
    }

    static init () {
        this.#defaultScript = typeof DefaultScripts === 'function' ? DefaultScripts.getContent('actions') : '';

        this.#loadScript();
        this.#executeScript();
    }

    static #loadScript () {
        this.#script = Store.get('actions_script', this.#defaultScript);
    }

    static #saveScript () {
        Store.set('actions_script', this.#script);
    }

    static #executeScript () {
        this.#instance = new Script(this.#script || '', ScriptType.Action)

        this.#actions = this.#instance.actions;
        this.#trackers = this.#instance.trackers;
    }

    static getScript () {
        return this.#script;
    }

    static getInstance () {
        return this.#instance;
    }

    static getActions () {
        return this.#actions;
    }

    static getTrackers () {
        return this.#trackers;
    }

    static resetScript () {
        Store.remove('actions_script');

        this.#loadScript();
        this.#executeScript();
    }

    static setScript (script) {
        this.#script = script;

        this.#saveScript();
        this.#executeScript();
    }

    static apply (unfilteredPlayers, unfilteredGroups) {
        if (_empty(this.#actions)) {
            return {
                players: unfilteredPlayers,
                groups: unfilteredGroups
            }
        } else {
            const players = unfilteredPlayers.map((data) => new PlayerModel(data));
            const groups = unfilteredGroups.map((data) => new GroupModel(data));

            this.#applyTags(players, groups);
            this.#applyFilters(players, groups);

            return {
                players: players.map((player) => player.Data),
                groups: groups.map((group) => group.Data)
            }
        }
    }

    static #applyTags (players, groups) {
        const tagFile = this.#actions.filter((action) => action.type === 'tag_file');
        for (const { type, args: [tagExpression, conditionExpression] } of tagFile) {
            Logger.log('ACTIONS', `Applying action ${type}`)

            const scope = new ExpressionScope().add({
                players: Object.assign(players.map(p => [p, p]), { segmented: true }),
                groups
            });

            if (conditionExpression ? conditionExpression.eval(scope) : true) {
                const tag = tagExpression.eval(scope);

                for (const player of players) {
                    let existingTags = _wrapOrEmpty(player.Data.tag)
                    _pushUnlessIncludes(existingTags, tag);

                    player.Data.tag = existingTags;
                }

                for (const group of groups) {
                    let existingTags = _wrapOrEmpty(group.Data.tag)
                    _pushUnlessIncludes(existingTags, tag);

                    group.Data.tag = existingTags;
                }
            }
        }

        const tagPlayer = this.#actions.filter((action) => action.type === 'tag_player');
        for (const { type, args: [tagExpression, conditionExpression] } of tagPlayer) {
            Logger.log('ACTIONS', `Applying action ${type}`)

            for (const player of players) {
                const scope = new ExpressionScope().with(player, player);

                if (conditionExpression ? conditionExpression.eval(scope) : true) {
                    const tag = tagExpression.eval(scope);

                    let existingTags = _wrapOrEmpty(player.Data.tag)
                    _pushUnlessIncludes(existingTags, tag);

                    player.Data.tag = existingTags;
                }
            }
        }

        const tagGroup = this.#actions.filter((action) => action.type === 'tag_group');
        for (const { type, args: [tagExpression, conditionExpression] } of tagGroup) {
            Logger.log('ACTIONS', `Applying action ${type}`)

            for (const group of groups) {
                const scope = new ExpressionScope().with(group, group);

                if (conditionExpression ? conditionExpression.eval(scope) : true) {
                    const tag = tagExpression.eval(scope);

                    let existingTags = _wrapOrEmpty(group.Data.tag)
                    _pushUnlessIncludes(existingTags, tag);

                    group.Data.tag = existingTags;
                }
            }
        }
    }

    static #applyFilters (players, groups) {
        const selectsPlayer = this.#actions.filter((action) => action.type === 'select_player').map((action) => action.args[0]);
        const rejectsPlayer = this.#actions.filter((action) => action.type === 'reject_player').map((action) => action.args[0]);

        if (rejectsPlayer.length) {
            Logger.log('ACTIONS', `Applying action ${'reject_player'}`);

            _filterInPlace(players, (player) => {
                const scope = new ExpressionScope().with(player, player);

                return !rejectsPlayer.some((expression) => expression.eval(scope));
            })
        }

        if (selectsPlayer.length) {
            Logger.log('ACTIONS', `Applying action ${'select_player'}`);

            _filterInPlace(players, (player) => {
                const scope = new ExpressionScope().with(player, player);

                return selectsPlayer.some((expression) => expression.eval(scope));
            })
        }

        const selectsGroup = this.#actions.filter((action) => action.type === 'select_group').map((action) => action.args[0]);
        const rejectsGroup = this.#actions.filter((action) => action.type === 'reject_group').map((action) => action.args[0]);

        if (rejectsGroup.length) {
            Logger.log('ACTIONS', `Applying action ${'reject_group'}`);

            _filterInPlace(groups, (group) => {
                const scope = new ExpressionScope().with(group, group);

                return !rejectsGroup.some((expression) => expression.eval(scope));
            })
        }

        if (selectsGroup.length) {
            Logger.log('ACTIONS', `Applying action ${'select_group'}`);

            _filterInPlace(groups, (group) => {
                const scope = new ExpressionScope().with(group, group);

                return selectsGroup.some((expression) => expression.eval(scope));
            })
        }
    }

    static updateFromScript (trackers) {
        if (Object.keys(trackers).length > 0) {
            // Get current tracker settings
            let trackerSettings = Actions.getInstance();
            let trackerCode = trackerSettings.code;

            // Go through all required trackers
            let isset = false;
            for (let [ trackerName, tracker ] of Object.entries(trackers)) {
                if (trackerName in trackerSettings.trackers) {
                    if (tracker.hash != trackerSettings.trackers[trackerName].hash) {
                        Logger.log('TRACKER', `Tracker ${ trackerName } with hash ${ tracker.hash } found but overwritten by ${ trackerSettings.trackers[trackerName].hash }!`);
                    }
                } else {
                    trackerCode += `${ trackerCode ? '\n' : '' }${ tracker.str } # Automatic entry from ${ _formatDate(Date.now()) }`;
                    isset |= true;

                    Logger.log('TRACKER', `Tracker ${ trackerName } with hash ${ tracker.hash } added automatically!`);
                }
            }

            // Save settings
            if (isset) {
                Actions.setScript(trackerCode);
                DatabaseManager.refreshTrackers();
            }
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
