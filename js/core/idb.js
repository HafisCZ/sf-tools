const DATABASE_PARAMS_V5 = [
    'sftools',
    5,
    {
        players: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp',
                group: 'group',
                prefix: 'prefix',
                profile: 'profile',
                origin: 'origin',
                tag: 'tag'
            }
        },
        groups: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp',
                prefix: 'prefix',
                profile: 'profile',
                origin: 'origin'
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
        }
    ]
];

const DATABASE_PARAMS_V1 = [
    'database',
    2,
    {
        files: {
            key: 'timestamp'
        },
        profiles: {
            key: 'identifier'
        }
    }
];

function _bindOnSuccessOnError (event, resolve, reject) {
    if (resolve) event.onsuccess = () => resolve(event.result);
    if (reject) event.onerror = () => reject(event.error);
    return event;
}

class IndexedDBWrapper {
    static delete (name) {
        return new Promise((resolve, reject) => _bindOnSuccessOnError(
            indexedDB.deleteDatabase(name), resolve, reject
        ));
    }

    static exists (name, version) {
        return new Promise((resolve, reject) => {
            let openRequest = indexedDB.open(name, version);
            openRequest.onsuccess = () => resolve(true);
            openRequest.onerror = () => resolve(false);
            openRequest.onupgradeneeded = event => {
                event.target.transaction.abort();
                resolve(false);
            };
        });
    }

    constructor (name, version, stores, updaters) {
        this.name = name;
        this.version = version;
        this.stores = stores;
        this.updaters = updaters;
        this.database = null;
    }

    store (store, index) {
        let databaseStore = this.database.transaction(store, 'readwrite').objectStore(store);
        if (index) {
            return databaseStore.index(index);
        } else {
            return databaseStore;
        }
    }

    open () {
        return new Promise((resolve, reject) => {
            let openRequest = _bindOnSuccessOnError(indexedDB.open(this.name, this.version), resolve, reject);

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
                    for (const updater of this.updaters) {
                        if (updater.shouldApply(event.oldVersion)) {
                            updater.apply(event.currentTarget.transaction, database);
                        }
                    }
                }
            }
        }).then(db => {
            this.database = db;
            return this;
        });
    }

    close () {
        return new Promise((resolve, reject) => {
            this.database.close();
            resolve();
        });
    }

    set (store, value) {
        return new Promise((resolve, reject) => _bindOnSuccessOnError(
            this.store(store).put(value), resolve, reject
        ));
    }

    get (store, key) {
        return new Promise((resolve, reject) => _bindOnSuccessOnError(
            this.store(store).get(key), resolve, reject
        ));
    }

    remove (store, key) {
        return new Promise((resolve, reject) => _bindOnSuccessOnError(
            this.store(store).delete(key), resolve, reject
        ));
    }

    where (store, index, query) {
        return new Promise((resolve, reject) => {
            let items = [];
            let cursorRequest = this.store(store, index).openCursor(query);
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

    all (store, index) {
        return new Promise((resolve, reject) => _bindOnSuccessOnError(
            this.store(store, index).getAll(), resolve, reject
        ));
    }
}

class MigrationUtils {
    static migrateGroup (group, origin, timestampDefault) {
        if (group.id) {
            group.identifier = group.id;
            delete group.id;
        }

        group.origin = origin;
        group.group = group.identifier;
        group.timestamp = parseInt(group.timestamp || timestampDefault);
        group.own = group.own ? 1 : 0;
        group.names = group.names || group.members;
        group.profile = ProfileManager.getActiveProfileName();

        return group;
    }

    static migratePlayer (player, origin, timestampDefault, versionDefault) {
        if (player.id) {
            player.identifier = player.id;
            delete player.id;
        }

        player.origin = origin;
        player.timestamp = parseInt(player.timestamp || timestampDefault);
        player.version = player.version || versionDefault;
        player.own = player.own ? 1 : 0;
        player.profile = ProfileManager.getActiveProfileName();

        let group = player.save[player.own ? 435 : 161];
        if (group) {
            player.group = `${player.prefix}_g${group}`
        }

        return player;
    }
}

class DatabaseUtils {
    static async migrateable (slot) {
        DATABASE_PARAMS_V1[0] = DatabaseUtils.getNameFromSlot(slot);
        return IndexedDBWrapper.exists(... DATABASE_PARAMS_V1);
    }

    static async createSession(attemptMigration = false) {
        let database = await new IndexedDBWrapper(... DATABASE_PARAMS_V5).open();

        if (attemptMigration) {
            PopupController.close(LoaderPopup);
            await PopupController.open(PendingMigrationPopup);
            PopupController.open(LoaderPopup);
            if (SiteOptions.migration_allowed) {
                Logger.log('MIGRATE', `Migrating files`);

                let migratedDatabase = await new IndexedDBWrapper(... DATABASE_PARAMS_V1).open();
                let migratedFiles = await migratedDatabase.where('files');

                for (let file of migratedFiles) {
                    const version = file.version;
                    const timestamp = file.timestamp;

                    for (let player of file.players) {
                        await database.set('players', MigrationUtils.migratePlayer(player, 'migration', timestamp, version));
                    }

                    for (let group of file.groups) {
                        await database.set('groups', MigrationUtils.migrateGroup(group, 'migration', timestamp));
                    }
                }

                Logger.log('MIGRATE', `Migrating trackers`);
                let migratedTrackers = await migratedDatabase.where('profiles');
                for (let tracker of migratedTrackers) {
                    await database.set('trackers', tracker);
                }

                Logger.log('MIGRATE', `Cleaning up database`);

                await migratedDatabase.close();
                if (SiteOptions.migration_accepted) {
                    await IndexedDBWrapper.delete(DATABASE_PARAMS_V1[0]);
                }

                Logger.log('MIGRATE', `All migrations finished`);
            }
        }

        return database;
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
        })();
    }

    static getNameFromSlot (slot = 0) {
        return slot ? `database_${slot}` : 'database';
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
}

const Exporter = new (class {
    json (content, name = Date.now()) {
        download(`${ name }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
    }
})();

class PlayaResponse {
    static fromText (text) {
        return _array_to_hash(text.split('&').filter(_not_empty), item => {
            const items = item.split(':');
            const key = items[items.length - 2];
            const val = items[items.length - 1];

            return [this._normalizeKey(key), new PlayaResponse(val)];
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
};

const DatabaseManager = new (class {
    constructor () {
        this._reset();
    }

    // INTERNAL: Reset all content
    _reset () {
        if (this.Database) {
            this.Database.close();
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
        this.Identifiers = Object.create(null);
        this.Timestamps = Object.create(null);
        this.PlayerTimestamps = [];
        this.Prefixes = [];
        this.GroupNames = {};
    }

    // INTERNAL: Add player
    _addPlayer (data) {
        let player = new Proxy({
            Data: data,
            Identifier: data.identifier,
            Timestamp: data.timestamp,
            Own: data.own,
            Name: data.name,
            Prefix: data.prefix.replace(/\_/g, ' '),
            Class: data.class
        }, {
            get: function (target, prop) {
                if (prop == 'Data' || prop == 'Identifier' || prop == 'Timestamp' || prop == 'Own' || prop == 'Name' || prop == 'Prefix' || prop == 'Class') {
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
        if (!this.Identifiers[identifier]) {
            this.Identifiers[identifier] = new Set();
            this[type][identifier] = {};
        }
        this.Identifiers[identifier].add(timestamp);

        if (!this.Timestamps[timestamp]) {
            this.Timestamps[timestamp] = new Set();
        }
        this.Timestamps[timestamp].add(identifier);

        this[type][identifier][timestamp] = model;
    }

    // INTERNAL: Update internal player/group lists
    _updateLists () {
        this.Latest = 0;
        this.LatestPlayer = 0;
        this.LastChange = Date.now();
        this.GroupNames = {};

        const playerTimestamps = new Set();

        for (const [identifier, player] of Object.entries(this.Players)) {
            player.LatestTimestamp = 0;
            player.List = Object.entries(player).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push([ timestamp, obj ]);
                    if (this.Latest < timestamp) {
                        this.Latest = timestamp;
                    }
                    if (this.LatestPlayer < timestamp) {
                        this.LatestPlayer = timestamp;
                    }
                    if (player.LatestTimestamp < timestamp) {
                        player.LatestTimestamp = timestamp;
                    }
                    if (obj.Data.group) {
                        this.GroupNames[obj.Data.group] = obj.Data.groupname;
                    }
                    playerTimestamps.add(timestamp);
                }

                return array;
            }, []);

            _sort_des(player.List, le => le[0]);
            player.Latest = this._loadPlayer(player[player.LatestTimestamp]);
            player.Own = player.List.find(x => x[1].Own) != undefined;

            if (this.Latest < player.LatestTimestamp) {
                this.Latest = player.LatestTimestamp;
            }
        }

        for (const [identifier, group] of Object.entries(this.Groups)) {
            group.LatestTimestamp = 0;
            group.LatestDisplayTimestamp = 0;
            group.List = Object.entries(group).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push([ timestamp, obj ]);
                    if (this.Latest < timestamp) {
                        this.Latest = timestamp;
                    }
                    if (group.LatestTimestamp < timestamp) {
                        group.LatestTimestamp = timestamp;
                    }
                    if ((obj.MembersPresent || SiteOptions.groups_empty) && group.LatestDisplayTimestamp < timestamp) {
                        group.LatestDisplayTimestamp = timestamp;
                    }
                }

                return array;
            }, []);

            _sort_des(group.List, le => le[0]);
            group.Latest = group[group.LatestTimestamp];
            group.Own = group.List.find(x => x[1].Own) != undefined;

            if (this.Latest < group.LatestTimestamp) {
                this.Latest = group.LatestTimestamp;
            }
        }

        this.PlayerTimestamps = Array.from(playerTimestamps);
        this.Prefixes = Array.from(new Set(Object.keys(this.Identifiers).filter(id => this._isPlayer(id)).map(identifier => this.Players[identifier].Latest.Data.prefix)));
    }

    // INTERNAL: Load player from proxy
    _loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            const { Identifier: identifier, Timestamp: timestamp, Data: data, Own: own } = lazyPlayer;

            // Get player
            let player = own ? new SFOwnPlayer(data) : new SFOtherPlayer(data);

            // Get player group
            let group = this.getGroup(player.Group.Identifier, timestamp);
            if (group) {
                // Find index of player in the group
                let gi = group.Members.findIndex(i => i == identifier);

                // Add guild information
                player.Group.Group = group;
                player.Group.Role = group.Roles[gi];
                player.Group.Index = gi;
                player.Group.Rank = group.Rank;
                player.Group.ReadyDefense = group.States[gi] == 1 || group.States[gi] == 3;
                player.Group.ReadyAttack = group.States[gi] > 1;

                if (player.LastOnline < 6e11) {
                    player.LastOnline = group.LastActives[gi];
                }

                if (group.Own) {
                    player.Group.Own = true;
                    player.Group.Pet = group.Pets[gi];
                    player.Group.Treasure = group.Treasures[gi];
                    player.Group.Instructor = group.Instructors[gi];

                    if (!player.Fortress.Knights && group.Knights) {
                        player.Fortress.Knights = group.Knights[gi];
                    }
                } else {
                    player.Group.Pet = group.Pets[gi];
                }
            }

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

    // Load database
    async load (profile = DEFAULT_PROFILE) {
        this._reset();
        this.Profile = profile;

        if (profile.temporary) {
            return new Promise(async (resolve, reject) => {
                this.Database = DatabaseUtils.createTemporarySession();
                this.Hidden = new Set();

                this._updateLists();
                Logger.log('PERFLOG', 'Skipped load in temporary mode');

                resolve();
            });
        } else {
            const attemptMigration = await DatabaseUtils.migrateable(profile.slot);
            return DatabaseUtils.createSession(attemptMigration).then(async database => {
                const beginTimestamp = Date.now();

                this.Database = database;

                if (!profile.only_players) {
                    const groupFilter = DatabaseUtils.profileFilter(profile, 'primary_g');
                    const groups = DatabaseUtils.filterArray(profile, 'primary_g') || (_not_empty(groupFilter) ? (
                        await this.Database.where('groups', ... groupFilter)
                    ) : (
                        await this.Database.all('groups')
                    ));

                    if (profile.secondary_g) {
                        const filter = new Expression(profile.secondary_g);
                        for (const group of groups) {
                            if (!this._isHidden(group, false) || SiteOptions.hidden) {
                                ExpressionCache.reset();
                                if (new ExpressionScope().addSelf(group).eval(filter)) {
                                    this._addGroup(group);
                                }
                            }
                        }
                    } else {
                        for (const group of groups) {
                            if (!this._isHidden(group, false) || SiteOptions.hidden) {
                                this._addGroup(group);
                            }
                        }
                    }
                }

                const metadatas = await this.Database.all('metadata');
                for (const metadata of metadatas) {
                    this.Metadata[metadata.timestamp] = metadata;
                }

                const playerFilter = DatabaseUtils.profileFilter(profile);
                let players = DatabaseUtils.filterArray(profile) || (_not_empty(playerFilter) ? (
                    await this.Database.where('players', ... playerFilter)
                ) : (
                    await this.Database.all('players')
                ));

                if (profile.secondary) {
                    const filter = new Expression(profile.secondary);
                    for (const player of players) {
                        if (!this._isHidden(player) || SiteOptions.hidden) {
                            ExpressionCache.reset();
                            if (new ExpressionScope().addSelf(player).eval(filter)) {
                                this._addPlayer(player);
                            }
                        }
                    }
                } else {
                    for (const player of players) {
                        if (!this._isHidden(player) || SiteOptions.hidden) {
                            this._addPlayer(player);
                        }
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

                await Actions.apply('load');
            });
        }
    }

    _isHidden (obj, allowDirect = true) {
        return (allowDirect && _dig(obj, 'hidden')) || _dig(this.Metadata, obj.timestamp, 'hidden');
    }

    async _markHidden (timestamp, hidden) {
        const metadata = Object.assign(this.Metadata[timestamp] || { timestamp }, { hidden });

        this.Metadata[timestamp] = metadata;
        await this.Database.set('metadata', metadata);
    }

    async _removeMetadata (timestamp) {
        delete this.Metadata[timestamp];
        await this.Database.remove('metadata', parseInt(timestamp));
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

    remove (players) {
        return new Promise(async (resolve, reject) => {
            for (let { identifier, timestamp, group } of players) {
                await this.Database.remove('players', [identifier, parseInt(timestamp)]);
                await this._unload(identifier, timestamp);
            }

            await this._groupsCleanup();
            this._updateLists();
            resolve();
        });
    }

    async _unload (identifier, timestamp) {
        return new Promise(async (resolve, reject) => {
            await this._removeFromPool(identifier, timestamp);

            if (this._isPlayer(identifier)) {
                delete this.Players[identifier][timestamp];
                if (_empty(this.Identifiers[identifier])) {
                    delete this.Players[identifier];
                }
            } else {
                delete this.Groups[identifier][timestamp];
                if (_empty(this.Identifiers[identifier])) {
                    delete this.Groups[identifier];
                }
            }

            resolve();
        });
    }

    async _groupsCleanup () {
        for (const identifier of Object.keys(this.Groups)) {
            for (const timestamp of this.Identifiers[identifier]) {
                const group = this.getGroup(identifier, timestamp);
                group.MembersPresent = Array.from(this.Timestamps[timestamp]).filter(id => _dig(this.Players, id, timestamp, 'Data', 'group') == identifier).length;
            }
        }
    }

    // Remove one or more timestamps
    removeTimestamps (... timestamps) {
        return new Promise(async (resolve, reject) => {
            for (const timestamp of timestamps.filter(timestamp => this.Timestamps[timestamp])) {
                for (const identifier of this.Timestamps[timestamp]) {
                    let isPlayer = this._isPlayer(identifier);
                    await this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
                    await this._removeMetadata(timestamp);
                    await this._unload(identifier, timestamp);
                }

                delete this.Timestamps[timestamp];
            }

            this._updateLists();
            resolve();
        });
    }

    _removeFromPool (identifier, timestamp) {
        return new Promise((resolve, reject) => {
            this.Timestamps[timestamp].delete(identifier);
            if (this.Timestamps[timestamp].size == 0) {
                delete this.Timestamps[timestamp];
            }

            this.Identifiers[identifier].delete(parseInt(timestamp));
            if (this.Identifiers[identifier].size == 0) {
                delete this.Identifiers[identifier];
            }

            resolve();
        });
    }

    migrateHiddenFiles () {
        return new Promise(async (resolve, reject) => {
            for (const [timestamp, identifiers] of Object.entries(this.Timestamps)) {
                const players = Array.from(identifiers).filter(identifier => this._isPlayer(identifier));
                if (_all_true(players, id => _dig(this.Players, id, timestamp, 'Data', 'hidden'))) {
                    for (const id of players) {
                        const player = this.Players[id][timestamp].Data;
                        delete player['hidden'];

                        await this.Database.set('players', player);
                    }

                    await this._markHidden(timestamp, true);
                }
            }

            this._updateLists();
            resolve();
        });
    }

    removeIdentifiers (... identifiers) {
        return new Promise(async (resolve, reject) => {
            for (const identifier of identifiers.filter(identifier => this.Identifiers[identifier])) {
                delete this.Players[identifier];
                delete this.Groups[identifier];

                for (const timestamp of this.Identifiers[identifier]) {
                    let isPlayer = this._isPlayer(identifier);
                    await this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
                    await this._removeFromPool(identifier, timestamp);
                }

                delete this.Identifiers[identifier];
            }

            this._updateLists();
            resolve();
        });
    }

    hideIdentifier (identifier) {
        if (!this.Hidden.delete(identifier)) {
            this.Hidden.add(identifier);
        }

        Preferences.set('hidden_identifiers', Array.from(this.Hidden));
    }

    setTagFor (identifier, timestamp, tag) {
        return new Promise(async (resolve, reject) => {
            const player = _dig(this.Players, identifier, timestamp, 'Data');
            player.tag = tag;
            await this.Database.set('players', player);
            resolve();
        });
    }

    setTag (timestamps, tag) {
        return new Promise(async (resolve, reject) => {
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
            resolve();
        });
    }

    rebase (from, to) {
        return new Promise(async (resolve, reject) => {
            if (from && to) {
                const file = this._getFile(null, [ from ]);
                const origin = this.findDataFieldFor(from, 'origin')

                for (const i of file.players) {
                    i.timestamp = to;
                }

                for (const i of file.groups) {
                    i.timestamp = to;
                }

                await this._addFile(null, file.players, file.groups, origin);
                await this.removeTimestamps(from);
            }

            resolve();
        });
    }

    merge (timestamps) {
        return new Promise(async (resolve, reject) => {
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

                    await this._addFile(null, file.players, file.groups, 'merge');
                }

                for (const timestamp of timestamps) {
                    await this._removeMetadata(timestamp);
                }

                await this.removeTimestamps(... timestamps);
            }

            resolve();
        });
    }

    hide (players) {
        return new Promise(async (resolve, reject) => {
            for (const player of players) {
                if ((player.hidden = !player.hidden) && !SiteOptions.hidden) {
                    await this._unload(player.identifier, player.timestamp);
                }

                await this.Database.set('players', player);
            }

            await this._groupsCleanup();
            this._updateLists();
            resolve();
        });
    }

    hideTimestamps (... timestamps) {
        return new Promise(async (resolve, reject) => {
            if (_not_empty(timestamps)) {
                const shouldHide = !_all_true(timestamps, timestamp => _dig(this.Metadata, timestamp, 'hidden'));
                for (const timestamp of timestamps) {
                    await this._markHidden(timestamp, shouldHide);
                }

                if (!SiteOptions.hidden) {
                    for (const timestamp of timestamps) {
                        for (const identifier of this.Timestamps[timestamp]) {
                            await this._unload(identifier, timestamp);
                        }
                    }
                }

                this._updateLists();
            }

            resolve();
        });
    }

    // HAR - string
    // Endpoint - string
    // Share - object
    // Archive - string
    import (text, timestamp, offset, origin) {
        return new Promise(async (resolve, reject) => {
            try {
                await this._import(_jsonify(text), timestamp, offset, origin);
                resolve();
            } catch (exception) {
                reject(exception);
            }
        });
    }

    export (identifiers, timestamps, constraint) {
        return new Promise((resolve, reject) => {
            resolve(this._getFile(identifiers, timestamps, constraint));
        });
    }

    getGroupsFor (players) {
        let groups = {};

        for (let player of players) {
            let group = _dig(this.Groups, player.group, player.timestamp, 'Data');
            if (_present(group) && !groups[_uuid(group)]) {
                groups[_uuid(group)] = group;
            }
        }

        return Object.values(groups);
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
            identifiers = Object.keys(this.Identifiers);
        }

        if (!_present(timestamps)) {
            timestamps = Object.keys(this.Timestamps);
        }

        for (let timestamp of timestamps) {
            if (!_present(this.Timestamps[timestamp]) || this.Timestamps[timestamp].size == 0) {
                continue;
            }

            for (let identifier of this.Timestamps[timestamp]) {
                if (!identifiers.includes(identifier)) {
                    continue;
                }

                let isPlayer = this._isPlayer(identifier);
                let data = (isPlayer ? this.Players[identifier][timestamp] : this.Groups[identifier][timestamp]).Data;

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

    async _addFile (items, players_ex, groups_ex, origin) {
        let players = players_ex || [];
        let groups = groups_ex || [];
        if (items) {
            for (let item of items) {
                if (this._isPlayer(item.identifier)) {
                    players.push(item);
                } else {
                    groups.push(item);
                }
            }
        }

        const migratedGroups = groups.map(group => MigrationUtils.migrateGroup(group, origin));
        const migratedPlayers = players.map(player => MigrationUtils.migratePlayer(player, origin));

        for (let group of migratedGroups) {
            this._addGroup(group);
            await this.Database.set('groups', group);
        }

        for (let player of migratedPlayers) {
            this._addPlayer(player);
            await this.Database.set('players', player);
        }

        this._updateLists();
        for (const { identifier, timestamp } of migratedPlayers) {
            await this._track(identifier, timestamp);
        }

        await Actions.apply('import', migratedPlayers, migratedGroups);
    }

    getTracker (identifier, tracker) {
        return _dig(this.TrackedPlayers, identifier, tracker, 'out');
    }

    async refreshTrackers () {
        this.TrackerConfig = SettingsManager.trackerConfig();
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
        for (const identifier of this.Timestamps[timestamp]) {
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

    async _import (json, timestamp, offset = -3600000, origin = null) {
        if (Array.isArray(json)) {
            // Archive, Share
            if (_dig(json, 0, 'players') || _dig(json, 0, 'groups')) {
                for (let file of json) {
                    await this._addFile(null, file.players, file.groups, origin);
                }
            } else {
                await this._addFile(json, null, null, origin);
            }
        } else if (typeof json == 'object' && _dig(json, 'players')) {
            await this._addFile(null, json.players, json.groups, origin);
        } else {
            // HAR, Endpoint
            let raws = [];
            let groups = [];
            let players = [];
            let currentVersion = undefined;

            for (var [key, val, url, ts] of filterPlayaJSON(json)) {
                if (ts) {
                    timestamp = ts.getTime();
                    offset = ts.getTimezoneOffset() * 60 * 1000;
                }

                if (key === 'text' && (val.includes('otherplayername') || val.includes('othergroup') || val.includes('ownplayername'))) {
                    var url = url.split(/.*\/(.*)\.sfgame\.(.*)\/.*/g);
                    if (url.length > 2) {
                        raws.push([val, url[1] + '_' + url[2]]);
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

                        // Post-process
                        if (data.save[435]) {
                            data.group = `${data.prefix}_g${data.save[435]}`
                        }

                        for (const i of [4, 503, 504, 505, 561]) {
                            data.save[i] = 0;
                        }

                        // Save version
                        currentVersion = r.serverversion.number;
                    } else {
                        data.own = false;
                        data.name = r.otherplayername.string;
                        data.save = r.otherplayer.numbers;
                        data.identifier = data.prefix + '_p' + data.save[0];

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
            }

            for (const player of players) {
                player.version = currentVersion;
            }

            await this._addFile(null, players, groups, origin);
        }
    }
})();
