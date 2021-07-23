const DATABASE_PARAMS_V5 = [
    'sftools',
    1,
    {
        players: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp',
                group: 'group',
                prefix: 'prefix'
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
        }
    }
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

    constructor (name, version, stores) {
        this.name = name;
        this.version = version;
        this.stores = stores;
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
                for (let [ name, { key, indexes } ] of Object.entries(this.stores)) {
                    let store = database.createObjectStore(name, { keyPath: key });
                    if (indexes) {
                        for (let [ indexName, indexKey ] of Object.entries(indexes)) {
                            store.createIndex(indexName, indexKey);
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
}

class MigrationUtils {
    static migrateGroup (group) {
        if (group.id) {
            group.identifier = group.id;
            delete group.id;
        }

        group.group = group.identifier;
        group.timestamp = parseInt(group.timestamp);
        group.own = group.own ? 1 : 0;

        return group;
    }

    static migratePlayer (player) {
        if (player.id) {
            player.identifier = player.id;
            delete player.id;
        }

        player.timestamp = parseInt(player.timestamp);
        player.own = player.own ? 1 : 0;

        let group = player.save[player.own ? 435 : 161];
        if (group) {
            player.group = `${player.prefix}_g${group}`
        }

        return player;
    }
}

class DatabaseUtils {
    static async createSession(slot) {
        DATABASE_PARAMS_V1[0] = DatabaseUtils.getNameFromSlot(slot);

        let database = await new IndexedDBWrapper(... DATABASE_PARAMS_V5).open();

        if (false && await IndexedDBWrapper.exists(... DATABASE_PARAMS_V1)) {
            Logger.log('MIGRATE', `Migrating files`);

            let migratedDatabase = await new IndexedDBWrapper(... DATABASE_PARAMS_V1).open();
            let migratedFiles = await migratedDatabase.where('files');

            for (let file of migratedFiles) {
                for (let player of file.players) {
                    await database.set('players', MigrationUtils.migratePlayer(player));
                }

                for (let group of file.groups) {
                    await database.set('groups', MigrationUtils.migrateGroup(group));
                }
            }

            Logger.log('MIGRATE', `Migrating trackers`);
            let migratedTrackers = await migratedDatabase.where('profiles');
            for (let tracker of migratedTrackers) {
                await database.set('trackers', tracker);
            }

            Logger.log('MIGRATE', `Cleaning up database`);

            migratedDatabase.close();
            //await _databaseDelete(DATABASE_PARAMS_V1[0]);

            Logger.log('MIGRATE', `All migrations finished`);
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

    static filterArray (profile, type) {
        return _dig(profile, 'filters', type, 'mode') === 'none' ? [] : undefined;
    }

    static profileFilter (profile, type) {
        let filter = _dig(profile, 'filters', type);
        if (filter) {
            let { name, mode, value } = filter;

            let range = null;
            if (mode == 'below') {
                range = IDBKeyRange.upperBound(... value);
            } else if (mode == 'above') {
                range = IDBKeyRange.lowerBound(... value);
            } else if (mode == 'between') {
                range = IDBKeyRange.bound(... value);
            } else {
                range = IDBKeyRange.only(... value);
            }

            return [name, range];
        } else {
            return [];
        }
    }
}

function _dig (obj, ... path) {
    for (let i = 0; obj && i < path.length; i++) obj = obj[path[i]];
    return obj;
}

function _present (obj) {
    return obj !== null && typeof obj !== 'undefined';
}

const DEFAULT_PROFILE = Object.freeze({
    temporary: false,
    slot: 0,
    filters: {
        players: null,
        groups: null
    }
});

const Exporter = new (class {
    json (content, name = Date.now()) {
        download(`${ name }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
    }
})();

const DatabaseManager = new (class {
    constructor () {
        this._reset();
    }

    // INTERNAL: Reset all content
    _reset () {
        this.Database = null;
        this.Options = {};
        this.Hidden = [];

        // Models
        this.Players = {};
        this.Groups = {};
        this.Trackers = {};

        // Pools
        this.Identifiers = Object.create(null);
        this.Timestamps = Object.create(null);
        this.Prefixes = [];
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
        this.LastChange = Date.now();

        for (const [identifier, player] of Object.entries(this.Players)) {
            player.LatestTimestamp = 0;
            player.List = Object.entries(player).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    var timestamp = Number(ts);
                    array.push([ timestamp, obj ]);
                    if (this.Latest < timestamp) {
                        this.Latest = timestamp;
                    }
                    if (player.LatestTimestamp < timestamp) {
                        player.LatestTimestamp = timestamp;
                    }
                }

                return array;
            }, []);

            player.List.sort((a, b) => b[0] - a[0]);
            player.Latest = this._loadPlayer(player[player.LatestTimestamp]);
            player.Own = player.List.find(x => x[1].Own) != undefined;

            if (this.Latest < player.LatestTimestamp) {
                this.Latest = player.LatestTimestamp;
            }
        }

        for (const [identifier, group] of Object.entries(this.Groups)) {
            group.LatestTimestamp = 0;
            group.List = Object.entries(group).reduce((array, [ ts, obj ]) => {
                if (!isNaN(ts)) {
                    var timestamp = Number(ts);
                    array.push([ timestamp, obj ]);
                    if (this.Latest < timestamp) {
                        this.Latest = timestamp;
                    }
                    if (group.LatestTimestamp < timestamp) {
                        group.LatestTimestamp = timestamp;
                    }
                }

                return array;
            }, []);

            group.List.sort((a, b) => b[0] - a[0]);
            group.Latest = group[group.LatestTimestamp];
            group.Own = group.List.find(x => x[1].Own) != undefined;

            if (this.Latest < group.LatestTimestamp) {
                this.Latest = group.LatestTimestamp;
            }
        }

        this.Prefixes = Array.from(new Set(Object.keys(this.Identifiers).map(identifier => this.getAny(identifier).Latest.Data.prefix)));
    }

    // INTERNAL: Load player from proxy
    _loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            const { Identifier: identifier, Timestamp: timestamp, Data: data, Own: own } = lazyPlayer;

            // Get player
            let player = own ? new SFOwnPlayer(data, true) : new SFOtherPlayer(data);

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
    load (profile = DEFAULT_PROFILE) {
        this._reset();

        if (profile.temporary) {
            return new Promise((resolve, reject) => {
                this.Database = DatabaseUtils.createTemporarySession();
                resolve();
            });
        } else {
            return DatabaseUtils.createSession(profile.slot).then(async database => {
                this.Database = database;

                let players = DatabaseUtils.filterArray(profile, 'players') || (await this.Database.where(
                    'players',
                    ... DatabaseUtils.profileFilter(profile, 'players')
                ));

                let groups = DatabaseUtils.filterArray(profile, 'groups') || (await this.Database.where(
                    'groups',
                    ... DatabaseUtils.profileFilter(profile, 'groups')
                ));

                groups.forEach(group => this._addGroup(group));
                players.forEach(group => this._addPlayer(group));
                this._updateLists();

                this.Hidden = new Set(Preferences.get('hidden_identifiers', []));
            });
        }
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

    // Remove one or more timestamps
    removeTimestamps (... timestamps) {
        for (const timestamp of timestamps.filter(timestamp => this.Timestamps[timestamp])) {
            this.Timestamps[timestamp].forEach(identifier => {
                let isPlayer = this._isPlayer(identifier);
                this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                let object = this[isPlayer ? 'Players' : 'Groups'][identifier];
                delete object[timestamp];
                if (!Object.keys(object).filter(ts => !isNaN(ts)).length) {
                    delete this[isPlayer ? 'Players' : 'Groups'][identifier];
                }

                this.Identifiers[identifier].delete(parseInt(timestamp));
                if (this.Identifiers[identifier].size == 0) {
                    delete this.Identifiers[identifier];
                }
            });

            delete this.Timestamps[timestamp];
        }

        this._updateLists();
    }

    removeIdentifiers (... identifiers) {
        for (const identifier of identifiers.filter(identifier => this.Identifiers[identifier])) {
            delete this.Players[identifier];
            delete this.Groups[identifier];

            this.Identifiers[identifier].forEach(timestamp => {
                let isPlayer = this._isPlayer(identifier);
                this.Database.remove(isPlayer ? 'players' : 'groups', [identifier, parseInt(timestamp)]);

                this.Timestamps[timestamp].delete(identifier);
                if (this.Timestamps[timestamp].size == 0) {
                    delete this.Timestamps[timestamp];
                }
            });

            delete this.Identifiers[identifier];
        }

        this._updateLists();
    }

    hide (identifier) {
        if (!this.Hidden.delete(identifier)) {
            this.Hidden.add(identifier);
        }

        Preferences.set('hidden_identifiers', Array.from(this.Hidden));
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

                await this._addFile(file);
            }

            this.removeTimestamps(... timestamps);
        }
    }

    // HAR - string
    // Endpoint - string
    // Share - object
    // Archive - string
    import (text, timestamp, offset) {
        return new Promise(async (resolve, reject) => {
            if (typeof text === 'string') {
                text = JSON.parse(text);
            }

            await this._import(text, timestamp, offset, resolve);
            resolve();
        });
    }

    export (identifiers, timestamps, constraint) {
        return new Promise((resolve, reject) => {
            resolve(this._getFile(identifiers, timestamps, constraint));
        });
    }

    refreshTrackers () {

    }

    track (player, nsave) {

    }

    untrack (pid, trackers) {

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

    async _addFile (items, players_ex, groups_ex) {
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

        for (let group of groups) {
            let migratedGroup = MigrationUtils.migrateGroup(group);
            this._addGroup(migratedGroup);

            await this.Database.set('groups', migratedGroup);
        }

        for (let player of players) {
            let migratedPlayer = MigrationUtils.migratePlayer(player);
            this._addPlayer(migratedPlayer);

            await this.Database.set('players', migratedPlayer);
        }

        this._updateLists();
    }

    async _import (json, timestamp, offset = -3600000) {
        if (Array.isArray(json)) {
            // Archive, Share
            if (_dig(json, 0, 'players') || _dig(json, 0, 'groups')) {
                for (let file of json) {
                    await this._addFile(null, file.players, file.groups);
                }
            } else {
                await this._addFile(json);
            }
        } else {
            // HAR, Endpoint
            let raws = [];
            let groups = [];
            let players = [];

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

            for (var pair of raws) {
                var [raw, prefix] = pair;

                if (raw.includes('groupSave') || raw.includes('groupsave')) {
                    var group = {
                        prefix: prefix || 's1_de',
                        timestamp: timestamp,
                        offset: offset
                    };

                    for (var [key, val] of parsePlayaResponse(raw)) {
                        if (key.includes('groupname')) {
                            group.name = val;
                        } else if (key.includes('grouprank')) {
                            group.rank = Number(val);
                        } else if (key.includes('groupknights')) {
                            group.knights = val.split(',').map(a => Number(a));
                        } else if (key.includes('owngroupsave') && group.own == undefined) {
                            group.save = val.split('/').map(a => Number(a));
                            group.own = true;
                            group.identifier = group.prefix + '_g' + group.save[0];
                        } else if (key.includes('groupSave') && group.own == undefined) {
                            group.save = val.split('/').map(a => Number(a));
                            group.own = false;
                            group.identifier = group.prefix + '_g' + group.save[0];
                        } else if (key.includes('groupmember')) {
                            group.names = val.split(',');
                        }
                    }

                    if (!groups.find(g => g.id === group.id) && group.rank) {
                        groups.push(group);
                    }
                }

                var own = raw.includes('ownplayername');
                if (raw.includes('otherplayername') || raw.includes('ownplayername')) {
                    let player = {
                        prefix: prefix || 's1_de',
                        own: own,
                        timestamp: timestamp,
                        offset: offset
                    };

                    for (var [key, val] of parsePlayaResponse(raw)) {
                        if (key.includes('groupname')) {
                            player.groupname = val;
                        } else if (key.includes('name')) {
                            player.name = val;
                        } else if (key.includes('unitlevel')) {
                            player.units = val.split('/').map(a => Number(a));
                        } else if (key.includes('achievement') && !key.includes('new')) {
                            player.achievements = val.split('/').map(a => Number(a));
                        } else if (key.includes('fortressrank')) {
                            player.fortressrank = Number(val);
                        } else if (!own && key.includes('playerlookat')) {
                            player.save = val.split('/').map(a => Number(a));
                            player.identifier = player.prefix + '_p' + player.save[0];
                            if (player.save[161]) {
                                player.group = `${player.prefix}_g${player.save[161]}`
                            }
                        } else if (own && key.includes('playerSave')) {
                            player.save = val.split('/').map(a => Number(a));

                            player.save[4] = 0;
                            player.save[503] = 0;
                            player.save[504] = 0;
                            player.save[505] = 0;
                            player.save[561] = 0;

                            player.identifier = player.prefix + '_p' + player.save[1];
                            if (player.save[435]) {
                                player.group = `${player.prefix}_g${player.save[435]}`
                            }
                        } else if ((!own && key.includes('petbonus')) || (own && key.includes('petsSave'))) {
                            player.pets = val.split('/').map(a => Number(a));
                        } else if (key.includes('serverversion')) {
                            // file.version = Number(val);
                        } else if (own && key.includes('towerSave')) {
                            player.tower = val.split('/').map(a => Number(a));
                        } else if (own && key.includes('fortresschest') && val.length) {
                            player.chest = val.split('/').map(a => Number(a));
                        } else if (own && key.includes('dummies')) {
                            player.dummy = val.split('/').map(a => Number(a));
                        } else if (own && key.includes('scrapbook')) {
                            player.scrapbook = val;
                        } else if (own && key.includes('legendaries')) {
                            player.scrapbook_legendary = val;
                        } else if (own && key.includes('witchData')) {
                            player.witch = val.split('/').map(a => Number(a));
                        } else if (own && (key.includes('idlegame') || key.includes('idlesave'))) {
                            player.idle = val.split('/').map(a => Number(a));
                        }
                    }


                    if (!players.find(p => p.identifier === player.identifier)) {
                        players.push(player);
                    }
                }
            }

            await this._addFile(null, players, groups);
        }
    }
})();
