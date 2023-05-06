const DATABASE_PARAMS = [
    7,
    {
        players: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp',
                group: 'group',
                prefix: 'prefix',
                tag: 'tag'
            }
        },
        groups: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp',
                prefix: 'prefix'
            }
        },
        trackers: {
            key: 'identifier'
        },
        metadata: {
            key: 'timestamp'
        }
    },
    [
        {
            shouldApply: version => version < 2,
            apply: transaction => {
                transaction.objectStore('players').createIndex('profile', 'profile');
                transaction.objectStore('groups').createIndex('profile', 'profile');
            }
        },
        {
            shouldApply: version => version < 3,
            apply: transaction => {
                transaction.objectStore('players').createIndex('origin', 'origin');
                transaction.objectStore('groups').createIndex('origin', 'origin');
            }
        },
        {
            shouldApply: version => version < 4,
            apply: transaction => {
                transaction.objectStore('players').createIndex('tag', 'tag');
            }
        },
        {
            shouldApply: version => version < 5,
            apply: (transaction, database) => {
                database.createObjectStore('metadata', { keyPath: 'timestamp' });
            }
        },
        {
            shouldApply: version => version < 7,
            apply: transaction => {
                transaction.objectStore('players').deleteIndex('origin')
                transaction.objectStore('groups').deleteIndex('origin')

                transaction.objectStore('players').deleteIndex('profile')
                transaction.objectStore('groups').deleteIndex('profile')
            }
        }
    ],
    [
        {
            shouldApply: version => version < 6,
            apply: async (database) => {
                const players = await database.all('players');
                const groups = await database.all('groups');
                const entries = [].concat(players, groups);

                const metadata = _arrayToHash(await database.all('metadata'), entry => [ entry.timestamp, Object.assign(entry, { identifiers: [] }) ]);

                for (const { timestamp: dirty_timestamp, identifier } of entries) {
                    const timestamp = parseInt(dirty_timestamp);
                    if (!metadata[timestamp]) {
                        metadata[timestamp] = { timestamp, identifiers: [] };
                    }

                    metadata[timestamp].identifiers.push(identifier);
                }

                for (const data of Object.values(metadata)) {
                    await database.set('metadata', data);
                }
            }
        }
    ]
];

class IndexedDBWrapper {
    static promisify (event) {
        return new Promise((resolve, reject) => {
            event.onsuccess = () => resolve(event.result);
            event.onerror = () => reject(event.error);
        })
    }

    constructor (name, version, stores, updaters, dataUpdaters) {
        this.name = name;
        this.version = version;
        this.oldVersion = version;
        this.stores = stores;
        this.updaters = updaters;
        this.dataUpdaters = dataUpdaters;
        this.database = null;
    }

    store (store, index, transactionType = 'readwrite') {
        let databaseStore = this.database.transaction(store, transactionType).objectStore(store);
        if (index) {
            return databaseStore.index(index);
        } else {
            return databaseStore;
        }
    }

    open () {
        return IndexedDBWrapper.promisify((() => {
            const openRequest = indexedDB.open(this.name, this.version);
            
            openRequest.onupgradeneeded = (event) => {
                let database = openRequest.result;
                if (event.oldVersion < 1) {
                    Logger.log('STORAGE', 'Creating database');
                    for (const [ name, { key, indexes } ] of Object.entries(this.stores)) {
                        let store = database.createObjectStore(name, { keyPath: key });
                        if (indexes) {
                            for (let [ indexName, indexKey ] of Object.entries(indexes)) {
                                store.createIndex(indexName, indexKey);
                            }
                        }
                    }
                } else if (Array.isArray(this.updaters)) {
                    Logger.log('STORAGE', 'Updating database to new version');
                    Toast.info(intl('database.update_info.title'), intl('database.update_info.message'));
                    for (const updater of this.updaters) {
                        if (updater.shouldApply(event.oldVersion)) {
                            updater.apply(event.currentTarget.transaction, database);
                        }
                    }
                }

                this.oldVersion = event.oldVersion;
            }

            return openRequest;
        })()).then(async (db) => {
            this.database = db;

            if (this.version != this.oldVersion && Array.isArray(this.dataUpdaters)) {
                Logger.log('STORAGE', 'Updating database data due to compatibility with new version');
                Toast.info(intl('database.update_info.title'), intl('database.update_info.message'));
                for (const updater of this.dataUpdaters) {
                    if (updater.shouldApply(this.oldVersion)) {
                        await updater.apply(this);
                    }
                }
            }

            return this;
        });
    }

    close () {
        return new Promise((resolve) => {
            this.database.close();
            resolve();
        });
    }

    set (store, value) {
        return IndexedDBWrapper.promisify(
            this.store(store).put(value)
        );
    }

    get (store, key) {
        return IndexedDBWrapper.promisify(
            this.store(store, null, 'readonly').get(key)
        );
    }

    remove (store, key) {
        return IndexedDBWrapper.promisify(
            this.store(store).delete(key)
        );
    }

    clear (store) {
        return IndexedDBWrapper.promisify(
            this.store(store).clear()
        );
    }

    count (store, index, query) {
        return IndexedDBWrapper.promisify(
            this.store(store, index, query).count()
        );
    }

    where (store, index, query) {
        return new Promise((resolve) => {
            let items = [];
            let cursorRequest = this.store(store, index, 'readonly').openCursor(query);
            cursorRequest.onerror = () => resolve([]);
            cursorRequest.onsuccess = event => {
                let cursor = event.target.result;
                if (cursor) {
                    items.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(items);
                }
            };
        });
    }

    all (store, index, query) {
        return IndexedDBWrapper.promisify(
            this.store(store, index, 'readonly').getAll(query)
        );
    }
}

class DatabaseUtils {
    static async createSession(slot) {
        await DatabaseUtils.requestPersistentStorage();

        return new IndexedDBWrapper(`sftools${slot ? `_${slot}` : ''}`, ... DATABASE_PARAMS).open();
    }

    static createTemporarySession () {
        return new (class {
            set (store, value) {
                return Promise.resolve();
            }

            get (store, key) {
                return Promise.resolve();
            }

            remove (store, key) {
                return Promise.resolve();
            }

            where (store, index, query) {
                return Promise.resolve([]);
            }

            close () {

            }
        })();
    }

    static filterArray (profile, type = 'primary') {
        return _dig(profile, type, 'mode') === 'none' ? [] : undefined;
    }

    static profileFilter (profile, type = 'primary') {
        let filter = profile[type];
        if (filter) {
            let { name, mode, value } = filter;
            if (value) {
                value = value.map(v => new Expression(v).eval());
            }

            let range = null;
            if (mode == 'below') {
                range = IDBKeyRange.upperBound(... value);
            } else if (mode == 'above') {
                range = IDBKeyRange.lowerBound(... value);
            } else if (mode == 'between') {
                range = IDBKeyRange.bound(... value);
            } else if (mode == 'equals') {
                range = IDBKeyRange.only(... value);
            }

            return [name, range];
        } else {
            return [];
        }
    }

    static async requestPersistentStorage () {
        if (!SiteOptions.persisted && _dig(window, 'navigator', 'storage', 'persist')) {
            return window.navigator.storage.persist().then((persistent) => {
                if (persistent) {
                    SiteOptions.persisted = true;
                    Toast.info('Storage', 'Persistent mode');
                } else {
                    Toast.warn('Storage', 'Default mode');
                }
            });
        }
    }
}

class PlayaResponse {
    static PLAYA_RESPONSE_CHARACTER_ENCODING = Object.entries({
        'd': '$',
        'P': '%',
        'c': ':',
        'C': ',',
        'S': ';',
        'p': '|',
        's': '/',
        '+': '&',
        'q': '"',
        'r': '#',
        'b': `\n`
    });

    static * search (json) {
        for (const entry of _dig(json, 'log', 'entries')) {
            let { text, encoding } = _dig(entry, 'response', 'content');

            if (text && encoding !== 'base64') {
                yield {
                    text,
                    url: _dig(entry, 'request', 'url'),
                    date: new Date(entry.startedDateTime)
                }
            }
        }
    }

    static fromText (text) {
        return _arrayToHash(text.split('&').filter(_notEmpty), item => {
            const [key, ...val] = item.split(':');

            const normalizedKey = this.#normalizeKey(key);
            if (normalizedKey === 'otherplayerachievement' && val[0].startsWith('achievement')) {
                val.splice(0, 1);
            }

            return [normalizedKey, new PlayaResponse(val.join(':'))];
        });
    }

    static #normalizeKey (key) {
        return key.replace(/\(\d+?\)| /g, '').split('.')[0].toLowerCase();
    }

    static unescape (string) {
        if (typeof string === 'string') {
            for (const [encodedCharacter, character] of this.PLAYA_RESPONSE_CHARACTER_ENCODING) {
                string = string.replace(`$${encodedCharacter}`, character)
            }
        }

        return string;
    }

    static importData (json, timestamp, offset = -3600000) {
        let raws = [];
        let groups = [];
        let players = [];
        let bonusPool = {};
        let currentVersion = undefined;

        for (const { url, text, date } of this.search(json)) {
            if (date) {
                timestamp = date.getTime();
                offset = date.getTimezoneOffset() * 60 * 1000;
            }

            if (text.includes('otherplayername') || text.includes('othergroup') || text.includes('ownplayername') || text.includes('gtinternal')) {
                if (url) {
                    const urlParts = url.toLowerCase().split(/.*\/(.*)\.sfgame\.(.*)\/.*/g);
                    if (urlParts.length > 2) {
                        raws.push([text, urlParts[1] + '_' + urlParts[2]]);
                    }
                } else {
                    raws.push([text, 'invalid_server']);
                }
            }
        }

        for (let [text, prefix] of raws) {
            const r = this.fromText(text);
            if ((r.owngroupsave && r.owngrouprank && r.owngroupname && r.owngroupmember) || (r.othergroup && r.othergrouprank && r.othergroupname && r.othergroupmember)) {
                const data = {
                    prefix: prefix,
                    timestamp: timestamp,
                    offset: offset
                };

                if (r.owngroupsave && r.owngroupname) {
                    data.own = true;
                    data.name = r.owngroupname.string;
                    data.rank = r.owngrouprank.number;
                    data.knights = r.owngroupknights.numbers;
                    data.save = r.owngroupsave.numbers;
                    data.names = r.owngroupmember.strings;
                } else {
                    data.own = false;
                    data.name = r.othergroupname.string;
                    data.rank = r.othergrouprank.number;
                    data.knights = undefined;
                    data.save = r.othergroup.numbers;
                    data.names = r.othergroupmember.strings;
                }

                data.identifier = data.prefix + '_g' + data.save[0]

                if (!groups.find(g => g.identifier === data.identifier)) {
                    groups.push(data);
                }
            }

            if (r.otherplayername || r.ownplayername) {
                const data = {
                    prefix: prefix,
                    timestamp: timestamp,
                    offset: offset
                };

                if (r.ownplayername) {
                    data.own = true;
                    data.name = r.ownplayername.string;
                    data.save = r.ownplayersave.numbers;
                    data.identifier = data.prefix + '_p' + data.save[1];
                    data.class = data.save[29] % 65536;

                    // Optionals
                    data.groupname = _try(r.owngroupname, 'string');
                    data.units = _try(r.unitlevel, 'numbers');
                    data.achievements = _try(r.achievement, 'numbers');
                    data.pets = _try(r.ownpets, 'numbers');
                    data.tower = _try(r.owntower, 'numbers');
                    data.chest = _try(r.fortresschest, 'numbers');
                    data.dummy = _try(r.dummies, 'numbers');
                    data.scrapbook = _try(r.scrapbook, 'string');
                    data.scrapbook_legendary = _try(r.legendaries, 'string');
                    data.witch = _try(r.witch, 'numbers');
                    data.idle = _try(r.idle, 'numbers');
                    data.calendar = _try(r.calenderinfo, 'numbers');
                    data.webshopid = _try(r.webshopid, 'string');
                    data.resources = _try(r.resources, 'numbers');

                    // Post-process
                    if (data.save[435]) {
                        data.group = `${data.prefix}_g${data.save[435]}`
                    }

                    for (const i of [4, 503, 504, 505, 561]) {
                        data.save[i] = 0;
                    }

                    data.dungeons = {
                        light: _try(r.dungeonprogresslight, 'numbers'),
                        shadow: _try(r.dungeonprogressshadow, 'numbers')
                    }

                    // Save version
                    currentVersion = r.serverversion.number;
                } else {
                    data.own = false;
                    data.name = r.otherplayername.string;
                    data.save = r.otherplayer.numbers;
                    data.identifier = data.prefix + '_p' + data.save[0];
                    data.class = data.save[20] % 65536;

                    // Optionals
                    data.groupname = _try(r.otherplayergroupname, 'string');
                    data.units = _try(r.otherplayerunitlevel, 'numbers');
                    data.achievements = _try(r.otherplayerachievement, 'numbers') || _try(r.achievement, 'numbers');
                    data.fortressrank = _try(r.otherplayerfortressrank, 'number');
                    data.pets = _try(r.otherplayerpetbonus, 'numbers');

                    // Post-process
                    if (data.save[161]) {
                        data.group = `${data.prefix}_g${data.save[161]}`
                    }
                }

                if (!players.find(p => p.identifier === data.identifier)) {
                    players.push(data);
                }
            }

            if (r.gtinternal) {
                for (let gtEntry of r.gtinternal.table) {
                    let identifier = `${prefix}_p${gtEntry[0]}`;

                    bonusPool[identifier] = {
                        gtsave: {
                            tokens: parseInt(gtEntry[1]),
                            floor_max: parseInt(gtEntry[5]),
                            floor: parseInt(gtEntry[6])
                        }
                    };
                }
            }
        }

        for (const player of players) {
            player.version = currentVersion;

            let bonusEntry = undefined;
            if (bonusEntry = bonusPool[player.identifier]) {
                Object.assign(player, bonusEntry);
            }
        }

        return { players, groups };
    }

    constructor (value) {
        this._value = value;
    }

    get numbers () {
        return this._value.split(/\/|,/).map(Number);
    }

    get mixed () {
        return this._value.split(/\/|,/).map((v) => isNaN(v) ? v : Number(v))
    }

    get number () {
        return parseInt(this._value);
    }

    get strings () {
        return this._value.split(/\/|,/);
    }

    get string () {
        return this._value;
    }

    get table () {
        return this._value.split(';').filter(v => v).map(v => v.split(',').filter(v => v));
    }
};

class ModelRegistry {
    #data = new Map();

    add (major, minor) {
        const data = this.#data.get(major) || new Set();
        data.add(minor);

        this.#data.set(major, data);
    }

    remove (major, minor) {
        const data = this.#data.get(major);
        if (data) {
            data.delete(minor);

            if (data.size === 0) {
                this.#data.delete(major);
            }
        }
    }

    values (major) {
        return this.#data.get(major) || [];
    }

    empty (major) {
        const data = this.#data.get(major);
        if (data) {
            return data.size === 0;
        } else {
            return true;
        }
    }

    entries () {
        return this.#data.entries();
    }

    keys () {
        return this.#data.keys();
    }
}

const DatabaseManager = new (class {
    #interface = null;

    // Metadata & Settings
    #metadataDelta = [];
    #metadata = {};
    #hiddenModels = new Set();
    #sessionObjects = {};
    #hiddenVisible = false;
    #hiddenIdentifiers = new Set();

    // Trackers
    #trackerData = {};
    #trackedPlayers = {};
    #trackerConfig = {};
    #trackerConfigEntries = [];

    constructor () {
        this.#sessionObjects = {};

        this.reset();
    }

    #addToSession (object) {
        this.#sessionObjects[_uuid(object)] = object;
    }

    async reset () {
        if (this.#interface) {
            await this.#interface.close();
        }

        this.#interface = null;

        // Models
        this.Players = Object.create(null);
        this.Groups = Object.create(null);
        this.#metadata = {};

        this.#trackerData = {}; // Metadata
        this.#trackedPlayers = {}; // Tracker results
        this.#trackerConfig = {}; // Tracker configurations (individual trackers)
        this.#trackerConfigEntries = [];

        // Pools
        this.Identifiers = new ModelRegistry();
        this.Timestamps = new ModelRegistry();
        this.PlayerTimestamps = [];
        this.Prefixes = [];
        this.GroupNames = {};
        this.PlayerNames = {};

        this.#metadataDelta = [];
        this.#hiddenModels = new Set();
        this.#hiddenIdentifiers = new Set();
        this.#hiddenVisible = SiteOptions.hidden;
    }

    // INTERNAL: Add player
    #addPlayer (data) {
        let player = new Proxy({
            Data: data,
            Identifier: data.identifier,
            Timestamp: data.timestamp,
            Own: data.own,
            Name: data.name,
            Prefix: _formatPrefix(data.prefix),
            Class: data.class || ((data.own ? data.save[29] : data.save[20]) % 65536),
            Group: {
                Identifier: data.group,
                Name: data.groupname
            }
        }, {
            get: function (target, prop) {
                if (prop == 'Data' || prop == 'Identifier' || prop == 'Timestamp' || prop == 'Own' || prop == 'Name' || prop == 'Prefix' || prop == 'Class' || prop == 'Group') {
                    return target[prop];
                } else if (prop == 'IsProxy') {
                    return true;
                } else {
                    return DatabaseManager.getPlayer(target.Identifier, target.Timestamp)[prop];
                }
            }
        });

        if (this.hasGroup(data.group, data.timestamp)) {
            this.Groups[data.group][data.timestamp].MembersPresent++;
        }

        this.#registerModel('Players', data.identifier, data.timestamp, player);
    }

    // INTERNAL: Add group
    #addGroup (data) {
        this.#registerModel('Groups', data.identifier, data.timestamp, new GroupModel(data));
    }

    // INTERNAL: Add model
    #registerModel (type, identifier, timestamp, model) {
        this.Identifiers.add(identifier, timestamp);
        this.Timestamps.add(timestamp, identifier);

        if (!this[type][identifier]) {
            this[type][identifier] = Object.create(null);
        }

        this[type][identifier][timestamp] = model;
    }

    // INTERNAL: Update internal player/group lists
    #updateLists () {
        this.Latest = 0;
        this.LatestPlayer = 0;
        this.LastChange = Date.now();
        this.GroupNames = Object.create(null);
        this.PlayerNames = Object.create(null);

        const prefixes = new Set();
        const playerTimestamps = new Set();

        for (const player of Object.values(this.Players)) {
            player.LatestTimestamp = 0;

            const array = [];
            for (const [ ts, obj ] of Object.entries(player)) {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push(obj);

                    this.Latest = Math.max(this.Latest, timestamp);
                    this.LatestPlayer = Math.max(this.LatestPlayer, timestamp);
                    player.LatestTimestamp = Math.max(player.LatestTimestamp, timestamp);

                    if (obj.Data.group) {
                        this.GroupNames[obj.Data.group] = obj.Data.groupname;
                    }

                    playerTimestamps.add(timestamp);
                }
            }

            _sortDesc(array, p => p.Timestamp);

            player.List = array;
            player.Own = array.find(p => p.Own) != undefined;

            if (this.Profile.block_preload) {
                player.Latest = player[player.LatestTimestamp];
            } else {
                player.Latest = this.loadPlayer(player[player.LatestTimestamp]);
            }

            this.PlayerNames[player.Latest.Data.identifier] = player.Latest.Data.name;

            prefixes.add(player.Latest.Data.prefix);
        }

        for (const group of Object.values(this.Groups)) {
            group.LatestTimestamp = 0;
            group.LatestDisplayTimestamp = 0;

            const array = [];
            for (const [ ts, obj ] of Object.entries(group)) {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push(obj);

                    this.Latest = Math.max(this.Latest, timestamp);
                    group.LatestTimestamp = Math.max(group.LatestTimestamp, timestamp);

                    obj.MembersPresent = Array.from(this.Timestamps.values(timestamp)).filter((id) => obj.Members.includes(id)).length
                    if (obj.MembersPresent || SiteOptions.groups_empty) {
                        group.LatestDisplayTimestamp = Math.max(group.LatestDisplayTimestamp, timestamp);
                    }
                }
            }

            _sortDesc(array, g => g.Timestamp);

            group.List = array;
            group.Own = array.find(g => g.Own) != undefined;
            group.Latest = group[group.LatestTimestamp];

            this.GroupNames[group.Latest.Data.identifier] = group.Latest.Data.name;

            prefixes.add(group.Latest.Data.prefix);
        }

        this.PlayerTimestamps = Array.from(playerTimestamps);
        this.Prefixes = Array.from(prefixes);
    }

    // INTERNAL: Load player from proxy
    loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            const { Identifier: identifier, Timestamp: timestamp, Data: data } = lazyPlayer;

            // Get player
            const player = new PlayerModel(data);
            player.injectGroup(this.getGroup(player.Group.Identifier, timestamp));

            let playerObj = this.Players[identifier];

            playerObj[timestamp] = player;

            const listIndex = playerObj.List.findIndex((p) => p.Timestamp == timestamp);
            playerObj.List[listIndex] = player

            if (playerObj.LatestTimestamp == timestamp) {
                playerObj.Latest = player;
            }

            return player;
        } else {
            return lazyPlayer;
        }
    }

    async #loadTemporary () {
        this.#interface = DatabaseUtils.createTemporarySession();
        this.#hiddenIdentifiers = new Set();

        this.#updateLists();
        Logger.log('PERFLOG', 'Skipped load in temporary mode');
    }

    #initModel (type, model) {
        if (this.isHidden(model)) {
            this.#hiddenModels.add(model);

            if (SiteOptions.hidden) {
                if (type === 'Player') {
                    this.#addPlayer(model);
                } else {
                    this.#addGroup(model);
                }
            }
        } else if (type === 'Player') {
            this.#addPlayer(model);
        } else {
            this.#addGroup(model);
        }
    }

    async #loadDatabase (profile) {
        const beginTimestamp = Date.now();

        // Open interface
        this.#interface = await DatabaseUtils.createSession(profile.slot);
        if (!this.#interface) {
            throw 'Database was not opened correctly';
        }

        // Load metadata
        this.#metadata = _arrayToHash(await this.#interface.all('metadata'), md => [ md.timestamp, md ]);

        // Load groups
        if (!profile.only_players) {
            const groups = DatabaseUtils.filterArray(profile, 'primary_g') || await this.#interface.all('groups', ... DatabaseUtils.profileFilter(profile, 'primary_g'));

            if (profile.secondary_g) {
                const filter = new Expression(profile.secondary_g);

                for (const group of groups) {
                    ExpressionCache.reset();
                    if (filter.eval(new ExpressionScope().addSelf(group))) {
                        this.#initModel('Group', group);
                    }
                }
            } else {
                for (const group of groups) {
                    this.#initModel('Group', group);
                }
            }
        }

        // Load players
        const players = DatabaseUtils.filterArray(profile) || await this.#interface.where('players', ... DatabaseUtils.profileFilter(profile));
        if (profile.secondary) {
            const filter = new Expression(profile.secondary);
  
            for (const player of players) {
                ExpressionCache.reset();
                if (filter.eval(new ExpressionScope().addSelf(player))) {
                    this.#initModel('Player', player);
                }
            }
        } else {
            for (const player of players) {
                this.#initModel('Player', player);
            }
        }

        // Load trackers
        if (!profile.only_players) {
            const trackers = await this.#interface.all('trackers');

            for (const tracker of trackers) {
                this.#trackedPlayers[tracker.identifier] = tracker;
            }
        }

        // Generate lists
        this.#updateLists();
        await this.refreshTrackers();

        this.#hiddenIdentifiers = new Set(Store.get('hidden_identifiers', []));

        // Restore session-only objects
        const sessionObjects = Object.values(this.#sessionObjects);
        if (sessionObjects.length > 0) {
            for (const object of Object.values(sessionObjects)) {
                if (this.isPlayer(object.identifier)) {
                    this.#initModel('Player', object);
                } else {
                    this.#initModel('Group', object);
                }
            }    

            this.#updateLists();
        }

        Logger.log('PERFLOG', `Load done in ${Date.now() - beginTimestamp} ms`);
    }

    async reloadHidden () {
        if (this.#hiddenVisible != SiteOptions.hidden) {
            this.#hiddenVisible = SiteOptions.hidden;
            
            const beginTimestamp = Date.now();

            if (this.#hiddenVisible) {
                // Load all hidden models
                for (const model of this.#hiddenModels) {
                    if (this.isPlayer(model.identifier)) {
                        this.#addPlayer(model);
                    } else {
                        this.#addGroup(model);
                    }
                }
            } else {
                // Unload all hidden models
                for (const { identifier, timestamp } of this.#hiddenModels) {
                    this.#unload(identifier, timestamp);
                }
            }

            this.#updateLists();
            await this.refreshTrackers();

            Logger.log('PERFLOG', `${this.#hiddenVisible ? 'Load' : 'Unload'} done in ${Date.now() - beginTimestamp} ms`);
        }
    }

    // Load database
    async load (profile = DEFAULT_PROFILE) {
        await this.reset();

        Actions.init();

        this.Profile = profile;

        if (profile.temporary) {
            return this.#loadTemporary();
        } else {
            return this.#loadDatabase(profile);
        }
    }

    isHidden (entry) {
        return _dig(entry, 'hidden') || _dig(this.#metadata, entry.timestamp, 'hidden');
    }

    async #markHidden (timestamp, hidden) {
        const metadata = Object.assign(this.#metadata[timestamp], { timestamp: parseInt(timestamp), hidden });

        this.#metadata[timestamp] = metadata;
        await this.#interface.set('metadata', metadata);
    }

    #addMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (!this.#metadata[timestamp]) {
            this.#metadata[timestamp] = { timestamp, identifiers: [] }
        }

        _pushUnlessIncludes(this.#metadata[timestamp].identifiers, identifier);
        this.#metadataDelta.push(timestamp);
    }

    #removeMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (this.#metadata[timestamp]) {
            _remove(this.#metadata[timestamp].identifiers, identifier);
            this.#metadataDelta.push(timestamp);
        }
    }

    async #updateMetadata () {
        for (const timestamp of _uniq(this.#metadataDelta)) {
            if (_empty(this.#metadata[timestamp].identifiers)) {
                delete this.#metadata[timestamp];

                await this.#interface.remove('metadata', timestamp);
            } else {
                await this.#interface.set('metadata', this.#metadata[timestamp]);
            }
        }

        this.#metadataDelta = [];
    }

    // Check if player exists
    hasPlayer (id, timestamp) {
        return this.Players[id] && (timestamp ? this.Players[id][timestamp] : true) ? true : false;
    }

    // Check if group exists
    hasGroup (id, timestamp) {
        return this.Groups[id] && (timestamp ? this.Groups[id][timestamp] : true) ? true : false;
    }

    // Get player
    getPlayer (identifier, timestamp) {
        let player = this.Players[identifier];
        if (player && timestamp) {
            return this.loadPlayer(player[timestamp]);
        } else {
            return player;
        }
    }

    getLatestPlayers (onlyOwn = false) {
        const array = Object.values(this.Players).map(player => player.Latest);

        if (onlyOwn) {
            return array.filter((player) => player.Own);
        } else {
            return array;
        }
    }

    // Get group
    getGroup (identifier, timestamp) {
        if (timestamp && this.Groups[identifier]) {
            return this.Groups[identifier][timestamp];
        } else {
            return this.Groups[identifier];
        }
    }

    getAny (identifier) {
        return this[this.isPlayer(identifier) ? 'Players' : 'Groups'][identifier];
    }

    async remove (instances) {
        for (const { identifier, timestamp } of instances) {
            await this.#interface.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

            this.#removeMetadata(identifier, timestamp);
            this.#unload(identifier, timestamp);
        }

        await this.#updateMetadata();
        this.#updateLists();
    }

    async removeAuto (data) {
        let { identifiers, timestamps, instances } = Object.assign({ identifiers: [], timestamps: [], instances: [] }, data);

        if (identifiers.length > 0) {
            await this.removeIdentifiers(...identifiers);
        }

        if (timestamps.length > 0) {
            await this.removeTimestamps(...timestamps);
        }

        if (instances.length > 0) {
            await this.remove(instances);
        }
    }

    safeRemove (data, callback) {
        if (SiteOptions.unsafe_delete) {
            Loader.toggle(true);

            this.removeAuto(data).then(() => {
                Loader.toggle(false);
                callback();
            });
        } else {
            DialogController.open(DataManageDialog, data, callback);
        }
    }

    #unload (identifier, timestamp) {
        this.#removeFromPool(identifier, timestamp);

        if (this.isPlayer(identifier)) {
            delete this.Players[identifier][timestamp];
            if (this.Identifiers.empty(identifier)) {
                delete this.Players[identifier];
            }
        } else {
            delete this.Groups[identifier][timestamp];
            if (this.Identifiers.empty(identifier)) {
                delete this.Groups[identifier];
            }
        }
    }

    // Remove one or more timestamps
    async removeTimestamps (... timestamps) {
        for (const timestamp of timestamps) {
            for (const identifier of this.Timestamps.values(timestamp)) {
                let isPlayer = this.isPlayer(identifier);
                await this.#interface.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this.#removeMetadata(identifier, timestamp);
                this.#unload(identifier, timestamp);
            }
        }

        await this.#updateMetadata();
        this.#updateLists();
    }

    async purge () {
        for (const [timestamp, identifiers] of this.Timestamps.entries()) {
            for (const identifier of identifiers) {
                let isPlayer = this.isPlayer(identifier);
                await this.#interface.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this.#removeMetadata(identifier, timestamp);
            }
        }

        await this.#updateMetadata();

        this.Players = Object.create(null);
        this.Groups = Object.create(null);
        this.Timestamps = new ModelRegistry();
        this.Identifiers = new ModelRegistry();

        this.#updateLists();
    }

    #removeFromPool (identifier, timestamp) {
        this.Timestamps.remove(timestamp, identifier);
        this.Identifiers.remove(identifier, timestamp);
    }

    async migrateHiddenFiles () {
        for (const [timestamp, identifiers] of this.Timestamps.entries()) {
            const players = Array.from(identifiers).filter(identifier => this.isPlayer(identifier));
            if (_every(players, id => _dig(this.Players, id, timestamp, 'Data', 'hidden'))) {
                for (const id of players) {
                    const player = this.Players[id][timestamp].Data;
                    delete player['hidden'];

                    await this.#interface.set('players', player);
                }

                for (const groupIdentifier of Array.from(identifiers).filter(identifier => !this.isPlayer(identifier))) {
                    this.#hiddenModels.add(_dig(this.Groups, groupIdentifier, timestamp, 'Data'))
                }

                await this.#markHidden(timestamp, true);
            }
        }

        this.#updateLists();
    }

    async removeIdentifiers (... identifiers) {
        for (const identifier of identifiers) {
            for (const timestamp of this.Identifiers.values(identifier)) {
                let isPlayer = this.isPlayer(identifier);
                await this.#interface.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this.#removeMetadata(identifier, timestamp);
                this.#unload(identifier, timestamp);
            }
        }

        await this.#updateMetadata();
        this.#updateLists();
    }

    isIdentifierHidden (identifier) {
        return this.#hiddenIdentifiers.has(identifier);
    }

    hideIdentifier (identifier) {
        if (!this.#hiddenIdentifiers.delete(identifier)) {
            this.#hiddenIdentifiers.add(identifier);
        }

        Store.set('hidden_identifiers', Array.from(this.#hiddenIdentifiers));
    }

    async setTagFor (identifier, timestamp, tag) {
        const player = _dig(this.Players, identifier, timestamp, 'Data');
        player.tag = tag;
        
        await this.#interface.set('players', player);
    }

    async setTag (timestamps, tag) {
        const { players } = this.getFile(null, timestamps);
        for (const player of players) {
            if (!tag || _empty(tag)) {
                delete player.tag;
            } else {
                player.tag = tag;
            }

            await this.#interface.set('players', player);
        }

        this.LastChange = Date.now();
    }

    async rebase (from, to) {
        if (from && to) {
            const file = this.getFile(null, [ from ]);

            for (const i of file.players) {
                i.timestamp = to;
            }

            for (const i of file.groups) {
                i.timestamp = to;
            }

            await this.#addFile(file.players, file.groups);
            await this.removeTimestamps(from);
        }
    }

    async merge (timestamps) {
        if (timestamps.length > 1) {
            timestamps.sort((b, a) => a - b);

            let newestTimestamp = timestamps.shift();
            for (let timestamp of timestamps) {
                let file = this.getFile(null, [ timestamp ]);

                for (let item of file.players) {
                    item.timestamp = newestTimestamp;
                }

                for (let item of file.groups) {
                    item.timestamp = newestTimestamp;
                }

                await this.#addFile(file.players, file.groups, { skipExisting: true });
            }

            await this.removeTimestamps(... timestamps);
        }
    }

    async hide (entries) {
        for (const entry of entries) {
            entry.hidden = !entry.hidden;

            if (entry.hidden) {
                this.#hiddenModels.add(entry);
            } else {
                this.#hiddenModels.delete(entry);
            }

            if (entry.hidden && !SiteOptions.hidden) {
                this.#unload(entry.identifier, entry.timestamp);
            }

            await this.#interface.set(this.isPlayer(entry.identifier) ? 'players' : 'groups', entry);
        }

        this.#updateLists();
    }

    async hideTimestamps (... timestamps) {
        if (_notEmpty(timestamps)) {
            const shouldHide = !_every(timestamps, timestamp => _dig(this.#metadata, timestamp, 'hidden'));

            for (const timestamp of timestamps) {
                for (const identifier of this.Timestamps.values(timestamp)) {
                    const model = _dig(this, this.isPlayer(identifier) ? 'Players' : 'Groups', identifier, timestamp, 'Data')

                    if (shouldHide) {
                        this.#hiddenModels.add(model)
                    } else {
                        this.#hiddenModels.delete(model)
                    }
                }
            }

            for (const timestamp of timestamps) {
                await this.#markHidden(timestamp, shouldHide);
            }

            if (!SiteOptions.hidden) {
                for (const timestamp of timestamps) {
                    for (const identifier of this.Timestamps.values(timestamp)) {
                        this.#unload(identifier, timestamp);
                    }
                }
            }

            this.#updateLists();
        }
    }

    // HAR - string
    // Endpoint - string
    // Share - object
    // Archive - string
    async import (text, timestamp, timestampOffset, flags) {
        const data = typeof text === 'string' ? JSON.parse(text) : text;

        await this.#import(data, timestamp, timestampOffset, flags);
    }

    async export (identifiers, timestamps, constraint) {
        const data = this.getFile(identifiers, timestamps, constraint);

        if (SiteOptions.export_public_only) {
            for (const [index, group] of Object.entries(data.groups)) {
                if (group.own) {
                    data.groups[index] = ModelUtils.toOtherGroup(group);
                }
            }

            for (const [index, player] of Object.entries(data.players)) {
                if (player.own) {
                    data.players[index] = ModelUtils.toOtherPlayer(player);
                }
            }
        }

        return data;
    }

    relatedGroupData (players, groups, bundleGroups = true) {
        const entries = {};
        for (const group of groups) {
            entries[_uuid(group)] = group;
        }
        
        if (bundleGroups) {
            for (const player of players) {
                const group = _dig(this.Groups, player.group, player.timestamp, 'Data');
                if (group) {
                    entries[_uuid(group)] = group;
                }
            }
        }

        return Object.values(entries);
    }

    getFile (identifiers, timestamps, constraint = null) {
        let players = [];
        let groups = [];

        if (!identifiers) {
            identifiers = Array.from(this.Identifiers.keys());
        }

        if (!timestamps) {
            timestamps = Array.from(this.Timestamps.keys());
        }

        for (let timestamp of timestamps) {
            let timestampIdentifiers = this.Timestamps.values(timestamp);

            if (!timestampIdentifiers || timestampIdentifiers.size == 0) {
                continue;
            }

            for (let identifier of timestampIdentifiers) {
                if (!identifiers.includes(identifier)) {
                    continue;
                }

                let isPlayer = this.isPlayer(identifier);
                let data = _dig(this, isPlayer ? 'Players' : 'Groups', identifier, timestamp, 'Data');

                if (!constraint || constraint(data)) {
                    (isPlayer ? players : groups).push(data);
                }
            }
        }

        return {
            players: players,
            groups: groups
        };
    }

    isPlayer (identifier) {
        return /_p\d/.test(identifier);
    }

    isGroup (identifier) {
        return /_g\d/.test(identifier);
    }

    #normalizeGroup (group) {
        if (group.id) {
            group.identifier = group.id;
            delete group.id;
        }

        group.prefix = group.prefix.toLowerCase();
        group.identifier = group.identifier.toLowerCase();
        group.group = group.identifier.toLowerCase();
        group.timestamp = parseInt(group.timestamp);
        group.own = group.own ? 1 : 0;
        group.names = group.names || group.members;
    }

    #normalizePlayer (player) {
        if (player.id) {
            player.identifier = player.id;
            delete player.id;
        }

        player.prefix = player.prefix.toLowerCase();
        player.identifier = player.identifier.toLowerCase();
        player.timestamp = parseInt(player.timestamp);
        player.own = player.own ? 1 : 0;

        let group = player.save[player.own ? 435 : 161];
        if (group) {
            player.group = `${player.prefix}_g${group}`;
        }
    }

    async #addFile (playerEntries, groupEntries, flags = {}) {
        const players = playerEntries || [];
        const groups = groupEntries || [];

        for (const group of groups) {
            this.#normalizeGroup(group);
        }

        for (const player of players) {
            this.#normalizePlayer(player);
        }

        if (flags.skipExisting) {
            _filterInPlace(groups, (group) => !this.hasGroup(group.identifier, group.timestamp));
            _filterInPlace(players, (player) => !this.hasPlayer(player.identifier, player.timestamp));
        }

        if (flags.temporary) {
            for (const group of groups) {
                this.#addGroup(group);
                this.#addToSession(group);
            }

            for (const player of players) {
                this.#addPlayer(player);
                this.#addToSession(player);
            }

            this.#updateLists();
        } else {
            for (const group of groups) {
                this.#addGroup(group);
                this.#addMetadata(group.identifier, group.timestamp);
    
                await this.#interface.set('groups', group);
            }
    
            for (const player of players) {
                this.#addPlayer(player);
                this.#addMetadata(player.identifier, player.timestamp);
    
                await this.#interface.set('players', player);
            }
    
            await this.#updateMetadata();
    
            this.#updateLists();
            for (const player of players) {
                await this.#track(player.identifier, player.timestamp);
            }
    
            await Actions.apply(players, groups);
        }
    }

    getTracker (identifier, tracker) {
        return _dig(this.#trackedPlayers, identifier, tracker, 'out');
    }

    async refreshTrackers () {
        this.#trackerConfig = Actions.getTrackers();
        this.#trackerConfigEntries = Object.entries(this.#trackerConfig);
        this.#trackerData = Store.get('tracker_data', {});

        const addTrackers = _compact(this.#trackerConfigEntries.map(([ name, { ast, out, hash } ]) => this.#trackerData[name] != hash ? name : undefined));
        const remTrackers = Object.keys(this.#trackerData).filter(name => !this.#trackerConfig[name]);

        this.#trackerData = _arrayToHash(this.#trackerConfigEntries, ([name, { hash }]) => [name, hash]);;
        Store.set('tracker_data', this.#trackerData);

        if (_notEmpty(remTrackers)) {
            for (const name of remTrackers) {
                Logger.log('TRACKER', `Removed tracker ${ name }`);
            }

            for (const identifier of Object.keys(this.#trackedPlayers)) {
                await this.#untrack(identifier, remTrackers);
            }
        }

        if (_notEmpty(addTrackers)) {
            for (const [ name, { hash } ] of this.#trackerConfigEntries) {
                if (this.#trackerData[name]) {
                    if (hash != this.#trackerData[name]) {
                        Logger.log('TRACKER', `Tracker ${ name } changed! ${ this.#trackerData[name] } -> ${ hash }`);
                    }
                } else {
                    Logger.log('TRACKER', `Tracker ${ name } with hash ${ hash } added!`);
                }
            }

            for (let identifier of Object.keys(this.Players)) {
                await this.#untrack(identifier, addTrackers);

                const list = this.getPlayer(identifier).List;
                for (let i = list.length - 1; i >= 0; i--) {
                    if (await this.#track(identifier, _dig(list, i, 'Timestamp'))) {
                        break;
                    }
                }
            }
        }
    }

    async #track (identifier, timestamp) {
        const player = this.getPlayer(identifier, timestamp);
        const playerTracker = this.#trackedPlayers[identifier] || {
            identifier: identifier
        };

        let trackerChanged = false;
        for (const [ name, { ast, out } ] of this.#trackerConfigEntries) {
            const currentTracker = playerTracker[name];
            if (ast.eval(new ExpressionScope().with(player)) && (!currentTracker || currentTracker.ts > timestamp)) {
                playerTracker[name] = {
                    ts: timestamp,
                    out: out ? out.eval(new ExpressionScope().with(player)) : timestamp
                }
                trackerChanged = true;
            }
        }

        if (trackerChanged) {
            this.#trackedPlayers[identifier] = playerTracker;
            await this.#interface.set('trackers', playerTracker);

            Logger.log('TRACKER', `Tracking updated for ${ identifier }`);
        }

        return trackerChanged;
    }

    async #untrack (identifier, removedTrackers) {
        const currentTracker = this.#trackedPlayers[identifier];
        if (currentTracker) {
            let trackerChanged = false;
            for (const name of Object.keys(currentTracker)) {
                if (removedTrackers.includes(name)) {
                    delete currentTracker[name];
                    trackerChanged = true;
                }
            }

            if (trackerChanged) {
                this.#trackedPlayers[identifier] = currentTracker;
                await this.#interface.set('trackers', currentTracker);
            }
        }
    }

    findDataFieldFor (timestamp, field) {
        for (const identifier of this.Timestamps.values(timestamp)) {
            const value = _dig(this.Players, identifier, timestamp, 'Data', field);
            if (value) {
                return value;
            }
        }

        return undefined;
    }

    findUsedTags (timestamps) {
        const tags = {};
        const { players } = this.getFile(null, timestamps);
        for (const player of players) {
            if (tags[player.tag]) {
                tags[player.tag] += 1;
            } else {
                tags[player.tag] = 1;
            }
        }

        return tags;
    }

    async #import (json, timestamp, timestampOffset = -3600000, flags = {}) {
        if (Array.isArray(json)) {
            // Archive, Share
            if (_dig(json, 0, 'players') || _dig(json, 0, 'groups')) {
                for (let file of json) {
                    await this.#addFile(file.players, file.groups, flags);
                }
            } else {
                const players = [];
                const groups = [];

                for (const entry of json) {
                    if (this.isPlayer(entry.identifier)) {
                        players.push(entry);
                    } else {
                        groups.push(entry);
                    }
                }

                await this.#addFile(players, groups, flags);
            }
        } else if (typeof json == 'object' && _dig(json, 'players')) {
            await this.#addFile(json.players, json.groups, flags);
        } else {
            // HAR, Endpoint
            let { players, groups } = PlayaResponse.importData(json, timestamp, timestampOffset);
            await this.#addFile(players, groups, flags);
        }
    }
})();
