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
                group: 'group'
            }
        },
        groups: {
            key: ['identifier', 'timestamp'],
            indexes: {
                own: 'own',
                identifier: 'identifier',
                timestamp: 'timestamp'
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
        if (Array.isArray(index)) {
            return databaseStore;
        } else if (index) {
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
        group.identifier = group.id;
        delete group.id;

        return group;
    }

    static migratePlayer (player) {
        player.identifier = player.id;
        delete player.id;

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

        if (await IndexedDBWrapper.exists(... DATABASE_PARAMS_V1)) {
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

            let migratedTrackers = await migratedDatabase.where('profiles');
            for (let tracker of migratedTrackers) {
                await database.set('trackers', tracker);
            }

            migratedDatabase.close();
            //await _databaseDelete(DATABASE_PARAMS_V1[0]);
        }

        return database;
    }

    static async createTemporarySession () {
        return null;
    }

    static getNameFromSlot (slot = 0) {
        if (slot) {
            return `database_${slot}`
        } else {
            return 'database'
        }
    }
}

const DEFAULT_PROFILE = Object.freeze({
    temporary: false,
    slot: 0,
    filters: []
});

const DatabaseManager = new (class {
    constructor () {
        this.reset();
    }

    reset () {
        this.Database = null;
        this.Options = {};

        this.Players = {};
        this.Groups = {};
    }

    _createFilter (filters) {
        if (!filters || filters.size < 1) {
            return undefined;
        }

        let indexes = [];
        for (let { name, mode, values } of (filters || [])) {
            let value = null;
            if (mode == 'below') {
                value = IDBKeyRange.upperBound(... values);
            } else if (mode == 'above') {
                value = IDBKeyRange.lowerBound(... values);
            } else if (mode == 'equal') {
                value = IDBKeyRange.bound(... values);
            } else {
                value = IDBKeyRange.only(... values);
            }

            indexes.push({
                name: value
            });
        }

        return indexes;
    }

    load (profile = DEFAULT_PROFILE) {
        this.reset();
        return new Promise(async (resolve, reject) => {
            if (profile.temporary) {
                this.Database = await DatabaseUtils.createTemporarySession();
            } else {
                this.Database = await DatabaseUtils.createSession(profile.slot);

                let players = await this.Database.where('players', this._createFilter(profile.filters));
                let groups = await this.Database.where('groups', this._createFilter(profile.filters));

                // TODO: Finish loading into player models
            }

            resolve();
        });
    }
})();
