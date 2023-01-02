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

                const metadata = _array_to_hash(await database.all('metadata'), entry => [ entry.timestamp, Object.assign(entry, { identifiers: [] }) ]);

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

class MigrationUtils {
    static migrateGroup (group) {
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

        return group;
    }

    static migratePlayer (player) {
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

        return player;
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
    static * iterateJSON (json) {
        for (const entry of _dig(json, 'log', 'entries')) {
            let { text, encoding } = _dig(entry, 'response', 'content');
            
            if (text) {
                if (encoding === 'base64') {
                    text = atob(text)
                }

                yield {
                    text,
                    url: _dig(entry, 'request', 'url'),
                    date: new Date(entry.startedDateTime)
                }
            }
        }
    }

    static fromText (text) {
        return _array_to_hash(text.split('&').filter(_not_empty), item => {
            const [key, ...val] = item.split(':');

            const normalizedKey = this._normalizeKey(key);
            if (normalizedKey === 'otherplayerachievement' && val[0].startsWith('achievement')) {
                val.splice(0, 1);
            }

            return [normalizedKey, new PlayaResponse(val.join(':'))];
        });
    }

    static _normalizeKey (key) {
        return key.replace(/\(\d+?\)| /g, '').split('.')[0].toLowerCase();
    }

    constructor (value) {
        this._value = value;
    }

    get numbers () {
        return this._value.split(/\/|,/).map(Number);
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
    add (major, minor) {
        if (!this[major]) {
            this[major] = new Set();
        }
        this[major].add(minor);
    }

    remove (major, minor) {
        if (this[major]) {
            this[major].delete(minor);
            if (!this[major].size) {
                delete this[major];
            }
        }
    }

    array (major) {
        if (this[major]) {
            return Array.from(this[major]);
        } else {
            return [];
        }
    }

    empty (major) {
        if (this[major]) {
            return this[major].size == 0;
        } else {
            return true;
        }
    }

    entries () {
        return Object.entries(this);
    }

    keys () {
        return Object.keys(this);
    }
}

const DatabaseManager = new (class {
    constructor () {
        this._reset();
    }

    // INTERNAL: Reset all content
    async _reset () {
        if (this.Database) {
            await this.Database.close();
        }

        this.Database = null;
        this.Options = {};
        this.Hidden = [];

        // Models
        this.Players = {};
        this.Groups = {};
        this.Metadata = {};

        this.TrackerData = {}; // Metadata
        this.TrackedPlayers = {}; // Tracker results
        this.TrackerConfig = {}; // Tracker configurations (individual trackers)
        this.TrackerConfigEntries = [];

        // Pools
        this.Identifiers = new ModelRegistry();
        this.Timestamps = new ModelRegistry();
        this.PlayerTimestamps = [];
        this.Prefixes = [];
        this.GroupNames = {};

        this._metadataDelta = [];
        this._hiddenModels = new Set();

        this.HiddenVisible = SiteOptions.hidden;
    }

    // INTERNAL: Add player
    _addPlayer (data) {
        let player = new Proxy({
            Data: data,
            Identifier: data.identifier,
            Timestamp: data.timestamp,
            Own: data.own,
            Name: data.name,
            Prefix: _pretty_prefix(data.prefix),
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

        this._registerModel('Players', data.identifier, data.timestamp, player);
    }

    // INTERNAL: Add group
    _addGroup (data) {
        this._registerModel('Groups', data.identifier, data.timestamp, new SFGroup(data));
    }

    // INTERNAL: Add model
    _registerModel (type, identifier, timestamp, model) {
        this.Identifiers.add(identifier, timestamp);
        this.Timestamps.add(timestamp, identifier);

        if (!this[type][identifier]) {
            this[type][identifier] = {};
        }

        this[type][identifier][timestamp] = model;
    }

    // INTERNAL: Update internal player/group lists
    _updateLists () {
        this.Latest = 0;
        this.LatestPlayer = 0;
        this.LastChange = Date.now();
        this.GroupNames = {};

        const prefixes = new Set();
        const playerTimestamps = new Set();

        for (const player of Object.values(this.Players)) {
            player.LatestTimestamp = 0;
            player.List = Object.entries(player).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push([ timestamp, obj ]);

                    this.Latest = Math.max(this.Latest, timestamp);
                    this.LatestPlayer = Math.max(this.LatestPlayer, timestamp);
                    player.LatestTimestamp = Math.max(player.LatestTimestamp, timestamp);

                    if (obj.Data.group) {
                        this.GroupNames[obj.Data.group] = obj.Data.groupname;
                    }

                    playerTimestamps.add(timestamp);
                }

                return array;
            }, []);

            _sort_des(player.List, le => le[0]);

            if (this.Profile.block_preload) {
                player.Latest = player[player.LatestTimestamp];
            } else {
                player.Latest = this._loadPlayer(player[player.LatestTimestamp]);
            }

            player.Own = player.List.find(x => x[1].Own) != undefined;

            prefixes.add(player.Latest.Data.prefix);
        }

        for (const [identifier, group] of Object.entries(this.Groups)) {
            group.LatestTimestamp = 0;
            group.LatestDisplayTimestamp = 0;
            group.List = Object.entries(group).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push([ timestamp, obj ]);

                    this.Latest = Math.max(this.Latest, timestamp);
                    group.LatestTimestamp = Math.max(group.LatestTimestamp, timestamp);

                    obj.MembersPresent = this.Timestamps.array(timestamp).filter(id => _dig(this.Players, id, timestamp, 'Data', 'group') == identifier).length
                    if (obj.MembersPresent || SiteOptions.groups_empty) {
                        group.LatestDisplayTimestamp = Math.max(group.LatestDisplayTimestamp, timestamp);
                    }
                }

                return array;
            }, []);

            _sort_des(group.List, le => le[0]);
            group.Latest = group[group.LatestTimestamp];
            group.Own = group.List.find(x => x[1].Own) != undefined;

            prefixes.add(group.Latest.Data.prefix);
        }

        this.PlayerTimestamps = Array.from(playerTimestamps);
        this.Prefixes = Array.from(prefixes);
    }

    // INTERNAL: Load player from proxy
    _loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            const { Identifier: identifier, Timestamp: timestamp, Data: data, Own: own } = lazyPlayer;

            // Get player
            const player = own ? new SFOwnPlayer(data) : new SFOtherPlayer(data);
            player.injectGroup(this.getGroup(player.Group.Identifier, timestamp));

            let playerObj = this.Players[identifier];

            playerObj[timestamp] = player;
            playerObj.List.find(([ ts, p ]) => ts == timestamp)[1] = player;
            if (playerObj.LatestTimestamp == timestamp) {
                playerObj.Latest = player;
            }

            return player;
        } else {
            return lazyPlayer;
        }
    }

    async _loadTemporary () {
        this.Database = DatabaseUtils.createTemporarySession();
        this.Hidden = new Set();

        this._updateLists();
        Logger.log('PERFLOG', 'Skipped load in temporary mode');
    }

    _initModel (type, model) {
        if (this._isHidden(model)) {
            this._hiddenModels.add(model);

            if (SiteOptions.hidden) {
                this[`_add${type}`](model);
            }
        } else {
            this[`_add${type}`](model);
        }
    }

    async _loadDatabase (profile) {
        this.Database = await DatabaseUtils.createSession(profile.slot);
        if (!this.Database) {
            throw 'Database was not opened correctly';
        }

        const beginTimestamp = Date.now();

        if (!profile.only_players) {
            const groupFilter = DatabaseUtils.profileFilter(profile, 'primary_g');
            const groups = DatabaseUtils.filterArray(profile, 'primary_g') || (_not_empty(groupFilter) ? (
                await this.Database.all('groups', ... groupFilter)
            ) : (
                await this.Database.all('groups')
            ));

            if (profile.secondary_g) {
                const filter = new Expression(profile.secondary_g);
                for (const group of groups) {
                    ExpressionCache.reset();
                    if (new ExpressionCache().addSelf(group).eval(filter)) {
                        this._initModel('Group', group);
                    }
                }
            } else {
                for (const group of groups) {
                    this._initModel('Group', group);
                }
            }
        }

        this.Metadata = _array_to_hash(await this.Database.all('metadata'), md => [ md.timestamp, md ]);

        const playerFilter = DatabaseUtils.profileFilter(profile);
        let players = DatabaseUtils.filterArray(profile) || (_not_empty(playerFilter) ? (
            await this.Database.where('players', ... playerFilter)
        ) : (
            await this.Database.where('players')
        ));

        if (profile.secondary) {
            const filter = new Expression(profile.secondary);
            for (const player of players) {
                ExpressionCache.reset();
                if (new ExpressionCache().addSelf(player).eval(filter)) {
                    this._initModel('Player', player);
                }
            }
        } else {
            for (const player of players) {
                this._initModel('Player', player);
            }
        }

        if (!profile.only_players) {
            let trackers = await this.Database.all('trackers');
            for (const tracker of trackers) {
                this.TrackedPlayers[tracker.identifier] = tracker;
            }
        }

        this._updateLists();
        await this.refreshTrackers();

        this.Hidden = new Set(Preferences.get('hidden_identifiers', []));

        Logger.log('PERFLOG', `Load done in ${Date.now() - beginTimestamp} ms`);
    }

    async reloadHidden () {
        if (this.HiddenVisible != SiteOptions.hidden) {
            this.HiddenVisible = SiteOptions.hidden;
            
            const beginTimestamp = Date.now();

            if (this.HiddenVisible) {
                // Load all hidden models
                for (const model of this._hiddenModels) {
                    if (this._isPlayer(model.identifier)) {
                        this._addPlayer(model);
                    } else {
                        this._addGroup(model);
                    }
                }
            } else {
                // Unload all hidden models
                for (const { identifier, timestamp } of this._hiddenModels) {
                    this._unload(identifier, timestamp);
                }
            }

            this._updateLists();
            await this.refreshTrackers();

            Logger.log('PERFLOG', `${this.HiddenVisible ? 'Load' : 'Unload'} done in ${Date.now() - beginTimestamp} ms`);
        }
    }

    // Load database
    async load (profile = DEFAULT_PROFILE) {
        await this._reset();

        Actions.init();

        this.Profile = profile;

        if (profile.temporary) {
            return this._loadTemporary();
        } else {
            return this._loadDatabase(profile);
        }
    }

    _isHidden (entry) {
        return _dig(entry, 'hidden') || _dig(this.Metadata, entry.timestamp, 'hidden');
    }

    async _markHidden (timestamp, hidden) {
        const metadata = Object.assign(this.Metadata[timestamp], { timestamp: parseInt(timestamp), hidden });

        this.Metadata[timestamp] = metadata;
        await this.Database.set('metadata', metadata);
    }

    _addMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (!this.Metadata[timestamp]) {
            this.Metadata[timestamp] = { timestamp, identifiers: [] }
        }

        _push_unless_includes(this.Metadata[timestamp].identifiers, identifier);
        this._metadataDelta.push(timestamp);
    }

    _removeMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (this.Metadata[timestamp]) {
            _remove(this.Metadata[timestamp].identifiers, identifier);
            this._metadataDelta.push(timestamp);
        }
    }

    async _updateMetadata () {
        for (const timestamp of _uniq(this._metadataDelta)) {
            if (_empty(this.Metadata[timestamp].identifiers)) {
                delete this.Metadata[timestamp];

                await this.Database.remove('metadata', timestamp);
            } else {
                await this.Database.set('metadata', this.Metadata[timestamp]);
            }
        }

        this._metadataDelta = [];
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
            return this._loadPlayer(player[timestamp]);
        } else {
            return player;
        }
    }

    getLatestPlayers () {
        return Object.values(this.Players).map(player => player.Latest);
    }

    isHidden (id, ts) {
        return _dig(this.Players, id, ts, 'Data', 'hidden');
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
        return this[this._isPlayer(identifier) ? 'Players' : 'Groups'][identifier];
    }

    async remove (instances) {
        for (const { identifier, timestamp } of instances) {
            await this.Database.remove(this._isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

            this._removeMetadata(identifier, timestamp);
            this._unload(identifier, timestamp);
        }

        await this._updateMetadata();
        this._updateLists();
    }

    async _removeAuto (data) {
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

            this._removeAuto(data).then(() => {
                Loader.toggle(false);
                callback();
            });
        } else {
            DialogController.open(DataManageDialog, data, callback);
        }
    }

    _unload (identifier, timestamp) {
        this._removeFromPool(identifier, timestamp);

        if (this._isPlayer(identifier)) {
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
            for (const identifier of this.Timestamps.array(timestamp)) {
                let isPlayer = this._isPlayer(identifier);
                await this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this._removeMetadata(identifier, timestamp);
                this._unload(identifier, timestamp);
            }
        }

        await this._updateMetadata();
        this._updateLists();
    }

    async purge () {
        for (const [timestamp, identifiers] of this.Timestamps.entries()) {
            for (const identifier of Array.from(identifiers)) {
                let isPlayer = this._isPlayer(identifier);
                await this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this._removeMetadata(identifier, timestamp);
            }
        }

        await this._updateMetadata();

        this.Players = {};
        this.Groups = {};
        this.Timestamps = new ModelRegistry();
        this.Identifiers = new ModelRegistry();

        this._updateLists();
    }

    _removeFromPool (identifier, timestamp) {
        this.Timestamps.remove(timestamp, identifier);
        this.Identifiers.remove(identifier, timestamp);
    }

    async migrateHiddenFiles () {
        for (const [timestamp, identifiers] of this.Timestamps.entries()) {
            const players = Array.from(identifiers).filter(identifier => this._isPlayer(identifier));
            if (_all_true(players, id => _dig(this.Players, id, timestamp, 'Data', 'hidden'))) {
                for (const id of players) {
                    const player = this.Players[id][timestamp].Data;
                    delete player['hidden'];

                    await this.Database.set('players', player);
                }

                for (const groupIdentifier of Array.from(identifiers).filter(identifier => !this._isPlayer(identifier))) {
                    this._hiddenModels.add(_dig(this.Groups, groupIdentifier, timestamp, 'Data'))
                }

                await this._markHidden(timestamp, true);
            }
        }

        this._updateLists();
    }

    async removeIdentifiers (... identifiers) {
        for (const identifier of identifiers) {
            for (const timestamp of this.Identifiers.array(identifier)) {
                let isPlayer = this._isPlayer(identifier);
                await this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this._removeMetadata(identifier, timestamp);
                this._unload(identifier, timestamp);
            }
        }

        await this._updateMetadata();
        this._updateLists();
    }

    hideIdentifier (identifier) {
        if (!this.Hidden.delete(identifier)) {
            this.Hidden.add(identifier);
        }

        Preferences.set('hidden_identifiers', Array.from(this.Hidden));
    }

    async setTagFor (identifier, timestamp, tag) {
        const player = _dig(this.Players, identifier, timestamp, 'Data');
        player.tag = tag;
        
        await this.Database.set('players', player);
    }

    async setTag (timestamps, tag) {
        const { players } = this._getFile(null, timestamps);
        for (const player of players) {
            if (!tag || _empty(tag)) {
                delete player.tag;
            } else {
                player.tag = tag;
            }

            await this.Database.set('players', player);
        }

        this.LastChange = Date.now();
    }

    async rebase (from, to) {
        if (from && to) {
            const file = this._getFile(null, [ from ]);

            for (const i of file.players) {
                i.timestamp = to;
            }

            for (const i of file.groups) {
                i.timestamp = to;
            }

            await this._addFile(null, file.players, file.groups);
            await this.removeTimestamps(from);
        }
    }

    async merge (timestamps) {
        if (timestamps.length > 1) {
            timestamps.sort((b, a) => a - b);

            let newestTimestamp = timestamps.shift();
            for (let timestamp of timestamps) {
                let file = this._getFile(null, [ timestamp ]);

                for (let item of file.players) {
                    item.timestamp = newestTimestamp;
                }

                for (let item of file.groups) {
                    item.timestamp = newestTimestamp;
                }

                await this._addFile(null, file.players, file.groups, { skipExisting: true });
            }

            await this.removeTimestamps(... timestamps);
        }
    }

    async hide (entries) {
        for (const entry of entries) {
            entry.hidden = !entry.hidden;

            if (entry.hidden) {
                this._hiddenModels.add(entry);
            } else {
                this._hiddenModels.delete(entry);
            }

            if (entry.hidden && !SiteOptions.hidden) {
                this._unload(entry.identifier, entry.timestamp);
            }

            await this.Database.set(this._isPlayer(entry.identifier) ? 'players' : 'groups', entry);
        }

        this._updateLists();
    }

    async hideTimestamps (... timestamps) {
        if (_not_empty(timestamps)) {
            const shouldHide = !_all_true(timestamps, timestamp => _dig(this.Metadata, timestamp, 'hidden'));

            for (const timestamp of timestamps) {
                for (const identifier of this.Timestamps.array(timestamp)) {
                    const model = _dig(this, this._isPlayer(identifier) ? 'Players' : 'Groups', identifier, timestamp, 'Data')

                    if (shouldHide) {
                        this._hiddenModels.add(model)
                    } else {
                        this._hiddenModels.delete(model)
                    }
                }
            }

            for (const timestamp of timestamps) {
                await this._markHidden(timestamp, shouldHide);
            }

            if (!SiteOptions.hidden) {
                for (const timestamp of timestamps) {
                    for (const identifier of this.Timestamps.array(timestamp)) {
                        this._unload(identifier, timestamp);
                    }
                }
            }

            this._updateLists();
        }
    }

    // HAR - string
    // Endpoint - string
    // Share - object
    // Archive - string
    import (text, timestamp, timestampOffset) {
        return new Promise(async (resolve, reject) => {
            try {
                await this._import(_jsonify(text), timestamp, timestampOffset);
                resolve();
            } catch (exception) {
                reject(exception);
            }
        });
    }

    async export (identifiers, timestamps, constraint) {
        return this._getFile(identifiers, timestamps, constraint);
    }

    getGroupsFor (players, groups, bundleGroups = true) {
        const entries = {};
        for (const group of groups) {
            entries[_uuid(group)] = group;
        }
        
        if (bundleGroups) {
            for (const player of players) {
                const group = _dig(this.Groups, player.group, player.timestamp, 'Data');
                if (_present(group) && !entries[_uuid(group)]) {
                    entries[_uuid(group)] = group;
                }
            }
        }

        return Object.values(entries);
    }

    _fileize (players, groups) {
        const files = {};

        for (const player of players) {
            const ts = player.timestamp;

            if (!files[ts]) {
                files[ts] = {
                    timestamp: ts,
                    players: [],
                    groups: []
                }
            }

            files[ts].players.push(player);
        }

        for (const group of groups) {
            const ts = group.timestamp;

            if (!files[ts]) {
                files[ts] = {
                    timestamp: ts,
                    players: [],
                    groups: []
                }
            }

            files[ts].groups.push(group);
        }

        return Object.values(files);
    }

    _getFile (identifiers, timestamps, constraint = null) {
        let players = [];
        let groups = [];

        if (!_present(identifiers)) {
            identifiers = this.Identifiers.keys();
        }

        if (!_present(timestamps)) {
            timestamps = this.Timestamps.keys();
        }

        for (let timestamp of timestamps) {
            let timestampIdentifiers = this.Timestamps.array(timestamp);

            if (!_present(timestampIdentifiers) || timestampIdentifiers.size == 0) {
                continue;
            }

            for (let identifier of timestampIdentifiers) {
                if (!identifiers.includes(identifier)) {
                    continue;
                }

                let isPlayer = this._isPlayer(identifier);
                let data = _dig(this, isPlayer ? 'Players' : 'Groups', identifier, timestamp, 'Data');

                if (!_present(constraint) || constraint(data)) {
                    (isPlayer ? players : groups).push(data);
                }
            }
        }

        return {
            players: players,
            groups: groups
        };
    }

    _isPlayer (identifier) {
        return /_p\d/.test(identifier);
    }

    async _addFile (entries, playerEntries, groupEntries, flags = {}) {
        let players = playerEntries || [];
        let groups = groupEntries || [];
        if (entries) {
            for (let entry of entries) {
                if (this._isPlayer(entry.identifier)) {
                    players.push(entry);
                } else {
                    groups.push(entry);
                }
            }
        }

        for (const group of groups) {
            MigrationUtils.migrateGroup(group);
        }

        for (const player of players) {
            MigrationUtils.migratePlayer(player);
        }
        if (flags.skipExisting) {
            groups = groups.filter(({ identifier, timestamp }) => !this.hasGroup(identifier, timestamp))
            players = players.filter(({ identifier, timestamp }) => !this.hasPlayer(identifier, timestamp))
        }

        for (let group of groups) {
            this._addGroup(group);
            this._addMetadata(group.identifier, group.timestamp);

            await this.Database.set('groups', group);
        }

        for (let player of players) {
            this._addPlayer(player);
            this._addMetadata(player.identifier, player.timestamp);

            await this.Database.set('players', player);
        }

        await this._updateMetadata();

        this._updateLists();
        for (const { identifier, timestamp } of players) {
            await this._track(identifier, timestamp);
        }

        await Actions.apply(players, groups);
    }

    getTracker (identifier, tracker) {
        return _dig(this.TrackedPlayers, identifier, tracker, 'out');
    }

    async refreshTrackers () {
        this.TrackerConfig = Actions.getTrackers();
        this.TrackerConfigEntries = Object.entries(this.TrackerConfig);
        this.TrackerData = Preferences.get('tracker_data', {});

        const addTrackers = _compact(this.TrackerConfigEntries.map(([ name, { ast, out, hash } ]) => this.TrackerData[name] != hash ? name : undefined));
        const remTrackers = Object.keys(this.TrackerData).filter(name => !this.TrackerConfig[name]);

        this.TrackerData = _array_to_hash(this.TrackerConfigEntries, ([name, { hash }]) => [name, hash]);;
        Preferences.set('tracker_data', this.TrackerData);

        if (_not_empty(remTrackers)) {
            for (const name of remTrackers) {
                Logger.log('TRACKER', `Removed tracker ${ name }`);
            }

            for (const identifier of Object.keys(this.TrackedPlayers)) {
                await this._untrack(identifier, remTrackers);
            }
        }

        if (_not_empty(addTrackers)) {
            for (const [ name, { hash } ] of this.TrackerConfigEntries) {
                if (this.TrackerData[name]) {
                    if (hash != this.TrackerData[name]) {
                        Logger.log('TRACKER', `Tracker ${ name } changed! ${ this.TrackerData[name] } -> ${ hash }`);
                    }
                } else {
                    Logger.log('TRACKER', `Tracker ${ name } with hash ${ hash } added!`);
                }
            }

            for (let identifier of Object.keys(this.Players)) {
                await this._untrack(identifier, addTrackers);

                const list = this.getPlayer(identifier).List;
                for (let i = list.length - 1; i >= 0; i--) {
                    if (await this._track(identifier, _dig(list, i, 0))) {
                        break;
                    }
                }
            }
        }
    }

    async _track (identifier, timestamp) {
        const player = this.getPlayer(identifier, timestamp);
        const playerTracker = this.TrackedPlayers[identifier] || {
            identifier: identifier
        };

        let trackerChanged = false;
        for (const [ name, { ast, out } ] of this.TrackerConfigEntries) {
            const currentTracker = playerTracker[name];
            if (new ExpressionScope().with(player).eval(ast) && (_nil(currentTracker) || currentTracker.ts > timestamp)) {
                playerTracker[name] = {
                    ts: timestamp,
                    out: out ? new ExpressionScope().with(player).eval(out) : timestamp
                }
                trackerChanged = true;
            }
        }

        if (trackerChanged) {
            this.TrackedPlayers[identifier] = playerTracker;
            await this.Database.set('trackers', playerTracker);

            Logger.log('TRACKER', `Tracking updated for ${ identifier }`);
        }

        return trackerChanged;
    }

    async _untrack (identifier, removedTrackers) {
        const currentTracker = this.TrackedPlayers[identifier];
        if (currentTracker) {
            let trackerChanged = false;
            for (const name of Object.keys(currentTracker)) {
                if (removedTrackers.includes(name)) {
                    delete currentTracker[name];
                    trackerChanged = true;
                }
            }

            if (trackerChanged) {
                this.TrackedPlayers[identifier] = currentTracker;
                await this.Database.set('trackers', currentTracker);
            }
        }
    }

    findDataFieldFor (timestamp, field) {
        for (const identifier of this.Timestamps.array(timestamp)) {
            const value = _dig(this.Players, identifier, timestamp, 'Data', field);
            if (value) {
                return value;
            }
        }

        return undefined;
    }

    findUsedTags (timestamps) {
        const tags = {};
        const { players } = this._getFile(null, timestamps);
        for (const player of players) {
            if (tags[player.tag]) {
                tags[player.tag] += 1;
            } else {
                tags[player.tag] = 1;
            }
        }

        return tags;
    }

    _import_har (json, timestamp, offset = -3600000) {
        let raws = [];
        let groups = [];
        let players = [];
        let bonusPool = {};
        let currentVersion = undefined;

        for (const { url, text, date } of PlayaResponse.iterateJSON(json)) {
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
            const r = PlayaResponse.fromText(text);
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

    async _import (json, timestamp, timestampOffset = -3600000) {
        if (Array.isArray(json)) {
            // Archive, Share
            if (_dig(json, 0, 'players') || _dig(json, 0, 'groups')) {
                for (let file of json) {
                    await this._addFile(null, file.players, file.groups);
                }
            } else {
                await this._addFile(json, null, null);
            }
        } else if (typeof json == 'object' && _dig(json, 'players')) {
            await this._addFile(null, json.players, json.groups);
        } else {
            // HAR, Endpoint
            let { players, groups } = this._import_har(json, timestamp, timestampOffset);
            await this._addFile(null, players, groups);
        }
    }
})();
