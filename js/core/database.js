const DATABASE_PARAMS = [
    9,
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
        },
        links: {
            key: 'id'
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
            apply: (_transaction, database) => {
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
        },
        {
            shouldApply: version => version < 8,
            apply: (_transaction, database) => {
                database.createObjectStore('links', { keyPath: 'id' })
            }
        },
        {
            shouldApply: (version) => version < 9,
            apply: (transaction) => {
                transaction.objectStore('players').deleteIndex('tag')
                transaction.objectStore('players').createIndex('tag', 'tag', { multiEntry: true })
            }
        }
    ],
    [
        {
            shouldApply: (version) => version < 6,
            apply: async (database) => {
                const players = await database.where('players');
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
                const updatersToRun = this.dataUpdaters.filter((updater) => updater.shouldApply(this.oldVersion));

                if (updatersToRun.length > 0) {
                    Logger.log('STORAGE', 'Updating database data due to compatibility with new version');
                    Toast.info(intl('database.update_info.title'), intl('database.update_info.message'));

                    for (const updater of this.dataUpdaters) {
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

    transaction (storeNames, callback, mode = 'readwrite') {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction(storeNames, mode);
            const stores = storeNames.reduce((memo, storeName) => {
                memo[storeName] = transaction.objectStore(storeName);

                return memo;
            }, Object.create(null));

            callback({
                set: (storeName, value) => stores[storeName].put(value),
                remove: (storeName, key) => stores[storeName].delete(key)
            })

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        })
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

            transaction (storeNames, callback, mode) {
                callback({
                    set: () => {},
                    remove: () => {}
                });

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

            all (store, index, query) {
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
                value = value.map((v) => Expression.create(v).eval());
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
        return text.split('&').filter(_notEmpty).reduce((memo, item) => {
            const [key, ...val] = item.split(':');

            const normalizedKey = this.#normalizeKey(key);
            if (normalizedKey === 'otherplayerachievement' && val[0].startsWith('achievement')) {
                val.splice(0, 1);
            }

            memo[normalizedKey] = new PlayaResponse(val.join(':'));

            return memo;
        }, {});
    }

    static #normalizeKey (key) {
        return key.replace(/\(\d+?\)| /g, '').split('.')[0].toLowerCase();
    }

    static unescape (string) {
        if (typeof string === 'string') {
            for (const [encodedCharacter, character] of this.PLAYA_RESPONSE_CHARACTER_ENCODING) {
                string = string.replaceAll(`$${encodedCharacter}`, character)
            }
        }

        return string;
    }

    static importData (json, timestamp, offset = -3600000) {
        let raws = [];
        let groups = [];
        let players = [];
        let bonusPool = {};
        let bonusPoolByName = {};
        let currentVersion = undefined;

        for (const { url, text, date } of this.search(json)) {
            if (date) {
                timestamp = date.getTime();
                offset = _timestampOffset(date);
            }

            if (text.includes('otherplayername') || text.includes('othergroup') || text.includes('ownplayername') || text.includes('gtinternal') || text.includes('gtranking') || text.includes('legendaries')) {
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
                    data.description = r.owngroupdescription.string?.slice(r.owngroupdescription.string.indexOf('§') + 1);
                } else {
                    data.own = false;
                    data.name = r.othergroupname.string;
                    data.rank = r.othergrouprank.number;
                    data.knights = undefined;
                    data.save = r.othergroup.numbers;
                    data.names = r.othergroupmember.strings;
                    data.description = r.othergroupdescription.string?.slice(r.othergroupdescription.string.indexOf('§') + 1);

                    if (data.description.indexOf('$s$s$s') !== -1) {
                        data.description = data.description.slice(data.description.indexOf('$s$s$s') + 6);
                    }
                }

                data.identifier = `${data.prefix}_g${data.save[0]}`;

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
                    data.identifier = `${data.prefix}_p${data.save[1]}`;
                    data.class = data.save[29] % 65536;

                    // Optionals
                    data.groupname = r.owngroupname?.string;
                    data.units = r.unitlevel?.numbers;
                    data.achievements = r.achievement?.numbers;
                    data.pets = r.ownpets?.numbers;
                    data.tower = r.owntower?.numbers;
                    data.chest = r.fortresschest?.numbers;
                    data.dummy = r.dummies?.numbers;
                    data.scrapbook = r.scrapbook?.string;
                    data.scrapbook_legendary = r.legendaries?.string;
                    data.witch = r.witch?.numbers;
                    data.idle = r.idle?.numbers;
                    data.calendar = r.calenderinfo?.numbers;
                    data.webshopid = r.webshopid?.string;
                    data.resources = r.resources?.numbers;
                    data.dailyTasks = r.dailytasklist?.numbers;
                    data.eventTasks = r.eventtasklist?.numbers;
                    data.description = r.owndescription?.string;

                    // Post-process
                    if (data.save[435]) {
                        data.group = `${data.prefix}_g${data.save[435]}`
                    }

                    for (const i of [4, 503, 504, 505, 561]) {
                        data.save[i] = 0;
                    }

                    data.dungeons = {
                        light: r.dungeonprogresslight?.numbers,
                        shadow: r.dungeonprogressshadow?.numbers
                    }

                    if (r.gtsave) {
                        const v = r.gtsave.numbers;
                        data.gtsave = {
                            tokens: v[4],
                            floor_max: v[7],
                            floor: v[3]
                        }
                    }

                    // Save version
                    currentVersion = r.serverversion.number;
                } else {
                    data.own = false;
                    data.name = r.otherplayername.string;
                    data.save = r.otherplayer.numbers;
                    data.identifier = `${data.prefix}_p${data.save[0]}`;
                    data.class = data.save[20] % 65536;

                    // Optionals
                    data.groupname = r.otherplayergroupname?.string;
                    data.units = r.otherplayerunitlevel?.numbers;
                    data.achievements = r.otherplayerachievement?.numbers || r.achievement?.number;
                    data.fortressrank = r.otherplayerfortressrank?.number;
                    data.pets = r.otherplayerpetbonus?.numbers;
                    data.description = r.otherdescription?.string;

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

            if (r.gtranking) {
                for (let gtEntry of r.gtranking.table) {
                    bonusPoolByName[`${prefix}_g${gtEntry[1]}`] = {
                        gtsave: {
                            rank: parseInt(gtEntry[0]),
                            tokens: parseInt(gtEntry[2])
                        }
                    };
                }
            }

            if (r.legendaries) {
                const lastOwnPlayer = players.find((player) => player.prefix === prefix && player.own);
                if (lastOwnPlayer) {
                    lastOwnPlayer.scrapbook_legendary = r.legendaries.string;
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

        for (const group of groups) {
            let bonusEntry = undefined;
            if (bonusEntry = bonusPoolByName[`${group.prefix}_g${group.name}`]) {
                Object.assign(group, bonusEntry);
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

class DatabaseManager {
    static #interface = null;

    static #profile = null;

    static #links = new Map();
    static #linksLookup = new Map();

    // Metadata & Settings
    static #metadataDelta = [];
    static #metadata = {};
    static #hiddenModels = new Set();
    static #sessionObjects = {};
    static #hiddenVisible = false;
    static #hiddenIdentifiers = new Set();

    // Trackers
    static #trackerData = {};
    static #trackedPlayers = {};
    static #trackerConfig = {};
    static #trackerConfigEntries = [];

    static #addToSession (object) {
        this.#sessionObjects[_uuid(object)] = object;
    }

    static async reset () {
        if (this.#interface) {
            await this.#interface.close();
        }

        this.#interface = null;

        this.#links.clear();
        this.#linksLookup.clear();

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
        this.GroupTimestamps = [];
        this.Prefixes = [];
        this.GroupNames = {};
        this.PlayerNames = {};

        this.#metadataDelta = [];
        this.#hiddenModels = new Set();
        this.#hiddenIdentifiers = new Set();
        this.#hiddenVisible = SiteOptions.hidden;
    }

    static #addPlayer (data) {
        const model = new Proxy({
            Data: data,
            Identifier: data.identifier,
            LinkId: this.getLink(data.identifier),
            Timestamp: data.timestamp,
            Own: data.own,
            Name: data.name,
            Prefix: _formatPrefix(data.prefix),
            Class: data.class || ((data.own ? data.save[29] : data.save[20]) % 65536),
            Group: {
                Identifier: data.group,
                LinkId: this.getLink(data.group),
                Name: data.groupname
            }
        }, {
            get: function (target, prop) {
                if (prop == 'Data' || prop == 'Identifier' || prop == 'Timestamp' || prop == 'Own' || prop == 'Name' || prop == 'Prefix' || prop == 'Class' || prop == 'Group' || prop == 'LinkId') {
                    return target[prop];
                } else if (prop == 'IsProxy') {
                    return true;
                } else {
                    return DatabaseManager.getPlayer(target.LinkId, target.Timestamp)[prop];
                }
            }
        });

        if (this.hasGroup(model.Group.LinkId, model.Timestamp)) {
            this.Groups[model.Group.LinkId][model.Timestamp].MembersPresent++;
        }

        this.#registerModel('Players', model.LinkId, model.Timestamp, model);
    }

    static getLink (identifier) {
        if (identifier) {
            return this.#links.get(identifier) || identifier;
        } else {
            // Return undefined since we dont want links to be created for invalid identifiers
            return undefined;
        }
    }

    static async resetLinks () {
        for (const [sourceLink, links] of this.#linksLookup.entries()) {
            if (links.length > 1) {
                await this.unlink(sourceLink, false);
            }
        }

        await this.#interface.clear('links')

        this.#updateLists();
    }

    static exportLinks () {
        return Object.fromEntries(Array.from(this.#linksLookup.entries()).filter(([, links]) => links.length > 1))
    }

    static async importLinks (linksObject) {
        for (const [fileTargetLink, fileSourceLinks] of Object.entries(linksObject)) {
            const targetLink = this.#links.get(fileTargetLink) || fileTargetLink;

            for (const sourceLink of fileSourceLinks) {
                const parentLink = this.#links.get(sourceLink) || sourceLink;

                // If link is reference to self, no need to unlink
                if (parentLink == sourceLink) continue
                else {
                    // Otherwise we need it to separate from parent link
                    // Objects that are affected
                    const { players, groups } = this.getFile(this.getRelatedLinks([parentLink]), null);

                    const objects = [
                        ...players,
                        ...groups
                    ];

                    // Unload objects
                    for (const timestamp of this.Identifiers.values(parentLink)) {
                        this.#unload(parentLink, timestamp);
                    }

                    // Separate link
                    this.#links.set(sourceLink, sourceLink);
                    this.#linksLookup.set(sourceLink, [ sourceLink ]);

                    // Remove from lookup
                    const lookup = this.#linksLookup.get(parentLink);
                    _remove(lookup, sourceLink);

                    this.#linksLookup.set(parentLink, lookup);

                    await this.#interface.set('links', { id: sourceLink, pid: sourceLink });

                    // Add players and groups back to be registered with new links
                    for (const object of objects) {
                        if (this.isPlayer(object.identifier)) {
                            this.#addPlayer(object);
                        } else {
                            this.#addGroup(object);
                        }
                    }
                }
            }

            await this.link(fileSourceLinks, targetLink, false);
        }

        this.#updateLists();
    }

    static getRelatedLinks (links) {
        const acc = new Set(links);

        for (const link of links) {
            const entry = DatabaseManager.getAny(link);
            if (entry?.Relations) {
                for (const relation of entry.Relations) {
                    acc.add(relation);
                }
            }
        }

        return Array.from(acc);
    }

    static async unlink (sourceLink, updateLists = true) {
        const identifiers = this.getLinkedIdentifiers(sourceLink);

        // Objects that are affected
        const { players, groups } = this.getFile(this.getRelatedLinks([sourceLink]), null);

        const objects = [
            ...players,
            ...groups
        ];

        // Unload objects
        for (const timestamp of this.Identifiers.values(sourceLink)) {
            this.#unload(sourceLink, timestamp);
        }

        // Separate all links
        for (const identifier of identifiers) {
            this.#links.delete(identifier);
            this.#linksLookup.delete(identifier);

            await this.#interface.remove('links', identifier);
        }

        // Add players and groups back to be registered with new links
        for (const object of objects) {
            if (this.isPlayer(object.identifier)) {
                this.#addPlayer(object);
            } else {
                this.#addGroup(object);
            }
        }

        // Reload lists
        if (updateLists) {
            this.#updateLists();
        }
    }

    static async link (sourceLinks, targetLink, updateLists = true) {
        // Update all existing links
        const targetLookup = this.#linksLookup.get(targetLink) || [targetLink];

        // Objects that are affected
        const objects = [];

        //  Target tracker
        let targetTracker = this.#trackedPlayers[targetLink];

        for (const sourceLink of sourceLinks) {
            if (sourceLink === targetLink && this.#links.has(sourceLink)) {
                // Skip for target link as it is already registered
                continue;
            }

            for (const identifier of this.getLinkedIdentifiers(sourceLink)) {
                this.#links.set(identifier, targetLink);

                targetLookup.push(identifier);

                // Save link  to database
                await this.#interface.set('links', { id: identifier, pid: targetLink });
            }

            if (sourceLink === targetLink) {
                // Skip the rest for target link
                continue;
            }

            // Remove from lookup as link shouldnt exist anymore afterwards
            this.#linksLookup.delete(sourceLink);

            // Add objects to array
            const { players, groups } = this.getFile(this.getRelatedLinks([sourceLink]), null);

            objects.push(...players);
            objects.push(...groups);

            // Unload
            for (const timestamp of this.Identifiers.values(sourceLink)) {
                this.#unload(sourceLink, timestamp);
            }

            // Update trackers
            const sourceTracker = this.#trackedPlayers[sourceLink];
            if (sourceTracker) {
                targetTracker = Object.assign(sourceTracker, targetTracker || {});

                delete this.#trackedPlayers[sourceLink];

                await this.#interface.remove('trackers', sourceLink);
            }
        }

        // Update target tracker
        if (targetTracker) {
            // Ensure identifier is correct
            targetTracker.identifier = targetLink;

            this.#trackedPlayers[targetLink] = targetTracker;

            await this.#interface.set('trackers', targetTracker);
        }

        // Set lookup to new array
        this.#linksLookup.set(targetLink, _uniq(targetLookup));

        // Add players and groups back to be registered with new links
        for (const object of objects) {
            if (this.isPlayer(object.identifier)) {
                this.#addPlayer(object);
            } else {
                this.#addGroup(object);
            }
        }

        // Reload lists
        if (updateLists) {
            this.#updateLists();
        }
    }

    static getLinkedIdentifiers (linkId) {
        return this.#linksLookup.get(linkId) || [linkId];
    }

    static #addGroup (data) {
        // Create model instance and set link id
        const model = new GroupModel(data);
        model.LinkId = this.getLink(model.Identifier);

        for (const player of model.Players) {
            player.LinkId = this.getLink(player.Identifier);
        }

        this.#registerModel('Groups', model.LinkId, model.Timestamp, model);
    }

    // INTERNAL: Add model
    static #registerModel (type, identifier, timestamp, model) {
        this.Identifiers.add(identifier, timestamp);
        this.Timestamps.add(timestamp, identifier);

        if (!this[type][identifier]) {
            this[type][identifier] = Object.create(null);
        }

        this[type][identifier][timestamp] = model;
    }

    // INTERNAL: Update internal player/group lists
    static #updateLists () {
        const start = Date.now();

        this.Latest = 0;
        this.LatestPlayer = 0;
        this.LatestGroup = 0;
        this.LastChange = Date.now();
        this.GroupNames = Object.create(null);
        this.PlayerNames = Object.create(null);

        const prefixes = new Set();
        const playerTimestamps = new Set();
        const groupTimestamps = new Set();

        for (const player of Object.values(this.Players)) {
            player.LatestTimestamp = 0;
            player.Links = Object.create(null);
            player.Relations = new Set();

            const array = [];
            for (const [ ts, obj ] of Object.entries(player)) {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push(obj);

                    this.Latest = Math.max(this.Latest, timestamp);
                    this.LatestPlayer = Math.max(this.LatestPlayer, timestamp);
                    player.LatestTimestamp = Math.max(player.LatestTimestamp, timestamp);

                    if (obj.Data.group) {
                        this.GroupNames[obj.Group.LinkId] = obj.Data.groupname;

                        // Group is related to the player
                        player.Relations.add(obj.Group.LinkId);
                    }

                    playerTimestamps.add(timestamp);
                    prefixes.add(obj.Data.prefix);

                    player.Links[obj.Identifier] = {
                        Identifier: obj.Identifier,
                        Prefix: obj.Prefix,
                        Name: obj.Name
                    }
                }
            }

            _sortDesc(array, p => p.Timestamp);

            player.List = array;
            player.Own = array.find(p => p.Own) != undefined;

            if (this.#profile.block_preload) {
                player.Latest = player[player.LatestTimestamp];
            } else {
                player.Latest = this.loadPlayer(player[player.LatestTimestamp]);
            }

            this.PlayerNames[player.Latest.LinkId] = player.Latest.Data.name;
        }

        for (const group of Object.values(this.Groups)) {
            group.LatestTimestamp = 0;
            group.LatestDisplayTimestamp = 0;
            group.Links = Object.create(null);
            group.Relations = new Set();

            const array = [];
            for (const [ ts, obj ] of Object.entries(group)) {
                if (!isNaN(ts)) {
                    const timestamp = Number(ts);
                    array.push(obj);

                    this.Latest = Math.max(this.Latest, timestamp);
                    this.LatestGroup = Math.max(this.LatestGroup, timestamp);
                    group.LatestTimestamp = Math.max(group.LatestTimestamp, timestamp);

                    obj.MembersPresent = _lenWhere(obj.Players, (player) => this.hasPlayer(player.LinkId, timestamp));
                    if (obj.MembersPresent || SiteOptions.groups_empty) {
                        group.LatestDisplayTimestamp = Math.max(group.LatestDisplayTimestamp, timestamp);
                    }

                    for (const player of obj.Players) {
                        // Player is related to the group
                        group.Relations.add(player.LinkId);
                    }

                    groupTimestamps.add(ts);
                    prefixes.add(obj.Data.prefix);

                    group.Links[obj.Identifier] = {
                        Identifier: obj.Identifier,
                        Prefix: obj.Prefix,
                        Name: obj.Name
                    }
                }
            }

            _sortDesc(array, g => g.Timestamp);

            group.List = array;
            group.Own = array.find(g => g.Own) != undefined;
            group.Latest = group[group.LatestTimestamp];

            this.GroupNames[group.Latest.LinkId] = group.Latest.Data.name;
        }

        this.PlayerTimestamps = Array.from(playerTimestamps);
        this.GroupTimestamps = Array.from(groupTimestamps);
        this.Prefixes = Array.from(prefixes);

        Logger.log('STDEBUG', `List update took ${Date.now() - start} ms`);
    }

    // INTERNAL: Load player from proxy
    static loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            const { LinkId: linkId, Timestamp: timestamp, Data: data, Group: { LinkId: groupLinkId } } = lazyPlayer;

            // Create player instance and set links and inject guild data
            const player = new PlayerModel(data);
            player.LinkId = linkId;
            player.injectGroup(this.getGroup(groupLinkId, timestamp));
            player.Group.LinkId = groupLinkId;

            let playerObj = this.Players[linkId];

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

    static async #loadTemporary () {
        this.#interface = DatabaseUtils.createTemporarySession();

        this.#links.clear();
        this.#hiddenIdentifiers = new Set();

        this.#updateLists();
        Logger.log('PERFLOG', 'Skipped load in temporary mode');
    }

    static #initModel (type, model) {
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

    static async #loadDatabase () {
        const beginTimestamp = Date.now();

        // Open interface
        this.#interface = await DatabaseUtils.createSession(this.#profile.slot);
        if (!this.#interface) {
            throw 'Database was not opened correctly';
        }

        // Load all existing links
        const links = await this.#interface.all('links');

        this.#links.clear();
        for (const { id: identifier, pid: linkId } of links) {
            this.#links.set(identifier, linkId);

            const lookup = this.#linksLookup.get(linkId) || [];
            lookup.push(identifier);
    
            this.#linksLookup.set(linkId, lookup);
        }

        // Load metadata
        this.#metadata = _arrayToHash(await this.#interface.all('metadata'), md => [ md.timestamp, md ]);

        // Load groups
        if (!this.#profile.only_players) {
            const groups = DatabaseUtils.filterArray(this.#profile, 'primary_g') || await this.#interface.all('groups', ... DatabaseUtils.profileFilter(this.#profile, 'primary_g'));
            const groupsFilter = this.#profile.secondary_g && Expression.create(this.#profile.secondary_g);

            if (groupsFilter) {
                for (const group of groups) {
                    ExpressionCache.reset();
                    if (groupsFilter.eval(new ExpressionScope().addSelf(group))) {
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
        const players = DatabaseUtils.filterArray(this.#profile) || await this.#interface.where('players', ... DatabaseUtils.profileFilter(this.#profile));
        const playersFilter = this.#profile.secondary && Expression.create(this.#profile.secondary);

        if (playersFilter) {
            for (const player of players) {
                ExpressionCache.reset();
                if (playersFilter.eval(new ExpressionScope().addSelf(player))) {
                    this.#initModel('Player', player);
                }
            }
        } else {
            for (const player of players) {
                this.#initModel('Player', player);
            }
        }

        // Load trackers
        if (!this.#profile.only_players) {
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

    static async reloadHidden () {
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
    static async load (profile = DEFAULT_PROFILE) {
        await this.reset();

        Actions.init();

        this.#profile = profile;

        if (this.#profile.temporary) {
            return this.#loadTemporary();
        } else {
            return this.#loadDatabase();
        }
    }

    static isHidden (entry) {
        return entry.hidden || this.#metadata[entry.timestamp]?.hidden;
    }

    static async #markHidden (timestamp, hidden) {
        const metadata = Object.assign(this.#metadata[timestamp], { timestamp: parseInt(timestamp), hidden });

        this.#metadata[timestamp] = metadata;
        await this.#interface.set('metadata', metadata);
    }

    static #addMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (!this.#metadata[timestamp]) {
            this.#metadata[timestamp] = { timestamp, identifiers: [] }
        }

        _pushUnlessIncludes(this.#metadata[timestamp].identifiers, identifier);
        this.#metadataDelta.push(timestamp);
    }

    static #removeMetadata (identifier, dirty_timestamp) {
        const timestamp = parseInt(dirty_timestamp);

        if (this.#metadata[timestamp]) {
            _remove(this.#metadata[timestamp].identifiers, identifier);
            this.#metadataDelta.push(timestamp);
        }
    }

    static async #updateMetadata () {
        await this.#interface.transaction(['metadata'], (tx) => {
            for (const timestamp of _uniq(this.#metadataDelta)) {
                if (_empty(this.#metadata[timestamp].identifiers)) {
                    delete this.#metadata[timestamp];
    
                    tx.remove('metadata', timestamp);
                } else {
                    tx.set('metadata', this.#metadata[timestamp]);
                }
            }
        });

        this.#metadataDelta = [];
    }

    // Check if player exists
    static hasPlayer (id, timestamp) {
        return this.Players[id] && (timestamp ? this.Players[id][timestamp] : true) ? true : false;
    }

    // Check if group exists
    static hasGroup (id, timestamp) {
        return this.Groups[id] && (timestamp ? this.Groups[id][timestamp] : true) ? true : false;
    }

    // Get player
    static getPlayer (identifier, timestamp = undefined) {
        const player = this.Players[identifier];
        if (player && timestamp) {
            return this.loadPlayer(player[timestamp]);
        } else {
            return player;
        }
    }

    static getLatestPlayers (onlyOwn = false) {
        const array = Object.values(this.Players).map(player => player.Latest);
        if (onlyOwn) {
            return array.filter((player) => player.Own);
        } else {
            return array;
        }
    }

    // Get group
    static getGroup (identifier, timestamp = undefined) {
        const group = this.Groups[identifier];
        if (group && timestamp) {
            return group[timestamp];
        } else {
            return group;
        }
    }

    static getAny (identifier, timestamp = undefined) {
        if (this.isPlayer(identifier)) {
            return this.getPlayer(identifier, timestamp);
        } else {
            return this.getGroup(identifier, timestamp);
        }
    }

    static async remove (instances) {
        this.#interface.transaction(['players', 'groups'], (tx) => {
            for (const { identifier, timestamp } of instances) {
                tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
    
                this.#removeMetadata(identifier, timestamp);
                this.#unload(this.getLink(identifier), timestamp);
            }
        });

        await this.#updateMetadata();
        this.#updateLists();
    }

    static async #removeAuto (data) {
        let { identifiers, timestamps, instances } = Object.assign({ identifiers: [], timestamps: [], instances: [] }, data);

        if (identifiers.length > 0) {
            await this.#removeIdentifiers(...identifiers);
        }

        if (timestamps.length > 0) {
            await this.#removeTimestamps(...timestamps);
        }

        if (instances.length > 0) {
            await this.remove(instances);
        }
    }

    static async safeRemove (data, unsafeOverride = false) {
        if (unsafeOverride || SiteOptions.unsafe_delete) {
            Loader.toggle(true);

            await this.#removeAuto(data);

            Loader.toggle(false);

            return [true];
        } else {
            return Dialog.open(DataManageDialog, data);
        }
    }

    static #unload (identifier, timestamp) {
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
    static async #removeTimestamps (... timestamps) {
        await this.#interface.transaction(['players', 'groups'], (tx) => {
            for (const timestamp of timestamps) {
                for (const linkId of this.Timestamps.values(timestamp)) {
                    for (const identifier of this.getLinkedIdentifiers(linkId)) {
                        // Try removal for all linked identifiers
                        tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
    
                        this.#removeMetadata(identifier, timestamp);
                    }
    
                    this.#unload(linkId, timestamp);
                }
            }
        })

        await this.#updateMetadata();
        this.#updateLists();
    }

    static async purge () {
        await this.#interface.transaction(['players', 'groups'], (tx) => {
            for (const [timestamp, identifiers] of this.Timestamps.entries()) {
                for (const linkId of identifiers) {
                    for (const identifier of this.getLinkedIdentifiers(linkId)) {
                        tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
    
                        this.#removeMetadata(identifier, timestamp);
                    }
                }
            }
        })

        await this.#updateMetadata();

        this.Players = Object.create(null);
        this.Groups = Object.create(null);
        this.Timestamps = new ModelRegistry();
        this.Identifiers = new ModelRegistry();

        this.#updateLists();
    }

    static #removeFromPool (identifier, timestamp) {
        this.Timestamps.remove(timestamp, identifier);
        this.Identifiers.remove(identifier, timestamp);
    }

    static async migrateHiddenFiles () {
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

    static async #removeIdentifiers (... identifiers) {
        await this.#interface.transaction(['players', 'groups'], (tx) => {
            for (const linkId of identifiers) {
                for (const timestamp of this.Identifiers.values(linkId)) {
                    for (const identifier of this.getLinkedIdentifiers(linkId)) {
                        tx.remove(this.isPlayer(identifier) ? 'players' : 'groups', [identifier, parseInt(timestamp)]);
    
                        this.#removeMetadata(identifier, timestamp);
                    }
     
                    this.#unload(linkId, timestamp);
                }
            }
        });

        await this.#updateMetadata();
        this.#updateLists();
    }

    static isIdentifierHidden (identifier) {
        return this.#hiddenIdentifiers.has(identifier);
    }

    static hideIdentifier (identifier) {
        if (!this.#hiddenIdentifiers.delete(identifier)) {
            this.#hiddenIdentifiers.add(identifier);
        }

        Store.set('hidden_identifiers', Array.from(this.#hiddenIdentifiers));
    }

    static async setTags (instances, tags) {
        await this.#interface.transaction(['players', 'groups'], (tx) => {
            for (const instance of instances) {
                if (tags) {
                    instance.tag = tags;
                } else {
                    delete instance.tag;
                }
    
                tx.set(this.isPlayer(instance.identifier) ? 'players' : 'groups', instance);
            }
        })

        this.LastChange = Date.now();
    }

    static async updateTimestamp (from, to) {
        if (from && to) {
            const file = this.getFile(null, [ from ]);

            for (const i of file.players) {
                i.timestamp = to;
            }

            for (const i of file.groups) {
                i.timestamp = to;
            }

            await this.#addFile(file.players, file.groups, { skipActions: true });
            await this.#removeTimestamps(from);
        }
    }

    static async merge (timestamps) {
        if (timestamps.length > 1) {
            timestamps.sort((b, a) => a - b);

            let players = [];
            let groups = [];

            const newestTimestamp = timestamps.shift();

            for (const timestamp of timestamps) {
                const file = this.getFile(null, [ timestamp ]);

                for (const player of file.players) {
                    player.timestamp = newestTimestamp;
                }

                for (const group of file.groups) {
                    group.timestamp = newestTimestamp;
                }

                players = players.concat(file.players);
                groups = groups.concat(file.groups);
            }

            await this.#addFile(players, groups, { skipExisting: true, skipActions: true });
            await this.#removeTimestamps(... timestamps);
        }
    }

    static async hide (entries) {
        for (const entry of entries) {
            entry.hidden = !entry.hidden;

            if (entry.hidden) {
                this.#hiddenModels.add(entry);
            } else {
                this.#hiddenModels.delete(entry);
            }

            if (entry.hidden && !SiteOptions.hidden) {
                this.#unload(this.getLink(entry.identifier), entry.timestamp);
            }

            await this.#interface.set(this.isPlayer(entry.identifier) ? 'players' : 'groups', entry);
        }

        this.#updateLists();
    }

    static async hideTimestamps (... timestamps) {
        if (_notEmpty(timestamps)) {
            const shouldHide = !_every(timestamps, timestamp => _dig(this.#metadata, timestamp, 'hidden'));

            for (const timestamp of timestamps) {
                for (const identifier of this.Timestamps.values(timestamp)) {
                    const model = _dig(this, this.isPlayer(identifier) ? 'Players' : 'Groups', this.getLink(identifier), timestamp, 'Data')

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

    static async importCollection (array, processCallback, errorCallback, flags = {}) {
        let players = [];
        let groups = [];

        const offset = _timestampOffset();

        for (const item of array) {
            try {
                const { text, timestamp } = await processCallback(item);

                const { players: filePlayers } = await this.import(text, timestamp, offset, Object.assign({ deferred: true }, flags));

                players = players.concat(filePlayers);
            } catch (e) {
                errorCallback(e);
            }
        }

        this.#updateLists();

        if (!flags.temporary) {
            for (const player of players) {
                await this.#track(this.getLink(player.identifier), player.timestamp);
            }
        }

        return {
            players,
            groups
        }
    }

    // HAR - string
    // Endpoint - string
    // Share - object
    // Archive - string
    static import (text, timestamp, timestampOffset, flags) {
        this.#validateImport(text);

        const data = typeof text === 'string' ? JSON.parse(text) : text;

        return this.#import(data, timestamp, timestampOffset, flags);
    }

    static #validateImport (text) {
        if (typeof text === 'string' && text.length === 0) {
            throw new Error('File is empty');
        }
    }

    static export (identifiers, timestamps, constraint) {
        return this.getFile(identifiers, timestamps, constraint);
    }

    static relatedGroupData (players, groups, bundleGroups = true) {
        const entries = {};
        for (const group of groups) {
            entries[_uuid(group)] = group;
        }
        
        if (bundleGroups) {
            for (const player of players) {
                const group = _dig(this.Groups, this.getLink(player.group), player.timestamp, 'Data');
                if (group) {
                    entries[_uuid(group)] = group;
                }
            }
        }

        return Object.values(entries);
    }

    static getFile (identifiers, timestamps, constraint = null) {
        let players = [];
        let groups = [];

        if (!identifiers) {
            identifiers = Array.from(this.Identifiers.keys());
        }

        if (!timestamps) {
            timestamps = Array.from(this.Timestamps.keys());
        }

        identifiers = new Set(identifiers);

        for (const timestamp of timestamps) {
            for (const identifier of this.Timestamps.values(timestamp)) {
                if (identifiers.has(identifier)) {
                    const isPlayer = this.isPlayer(identifier);
                    const data = this[isPlayer ? 'Players' : 'Groups'][identifier]?.[timestamp]?.Data;

                    if (!constraint || constraint(data)) {
                        (isPlayer ? players : groups).push(data);
                    }
                }
            }
        }

        return {
            players,
            groups
        };
    }

    static isPlayer (identifier) {
        return /_p\d/.test(identifier);
    }

    static isGroup (identifier) {
        return /_g\d/.test(identifier);
    }

    static #normalizeGroup (group) {
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

    static #normalizePlayer (player) {
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

    static async #addFile (playerEntries, groupEntries, flags = {}) {
        const unfilteredPlayers = playerEntries || [];
        const unfilteredGroups = groupEntries || [];

        for (const group of unfilteredGroups) {
            this.#normalizeGroup(group);
        }

        for (const player of unfilteredPlayers) {
            this.#normalizePlayer(player);
        }

        if (flags.skipExisting) {
            _filterInPlace(unfilteredGroups, (group) => !this.hasGroup(group.identifier, group.timestamp));
            _filterInPlace(unfilteredPlayers, (player) => !this.hasPlayer(player.identifier, player.timestamp));
        }

        const { players, groups } = flags.skipActions ? { players: unfilteredPlayers, groups: unfilteredGroups } : Actions.apply(unfilteredPlayers, unfilteredGroups);

        if (flags.temporary) {
            for (const group of unfilteredGroups) {
                this.#addGroup(group);
                this.#addToSession(group);
            }

            for (const player of unfilteredPlayers) {
                this.#addPlayer(player);
                this.#addToSession(player);
            }

            if (!flags.deferred) {
                this.#updateLists();
            }

            return {
                players: unfilteredPlayers,
                groups: unfilteredGroups
            }
        } else {
            for (const group of groups) {
                this.#addGroup(group);
                this.#addMetadata(group.identifier, group.timestamp);
            }
    
            for (const player of players) {
                this.#addPlayer(player);
                this.#addMetadata(player.identifier, player.timestamp);
            }

            await this.#interface.transaction(['groups', 'players'], (tx) => {
                for (const group of groups) tx.set('groups', group);
                for (const player of players) tx.set('players', player);
            })

            await this.#updateMetadata();

            if (!flags.deferred) {
                this.#updateLists();

                for (const player of players) {
                    await this.#track(this.getLink(player.identifier), player.timestamp);
                }
            }

            return {
                players,
                groups
            }
        }
    }

    static getTracker (identifier, tracker) {
        return _dig(this.#trackedPlayers, identifier, tracker, 'out');
    }

    static async refreshTrackers () {
        this.#trackerConfig = Actions.getTrackers();
        this.#trackerConfigEntries = Object.entries(this.#trackerConfig);
        this.#trackerData = Store.get('tracker_data', {});

        const addTrackers = _compact(this.#trackerConfigEntries.map(([ name, { hash } ]) => this.#trackerData[name] != hash ? name : undefined));
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

    static async #track (identifier, timestamp) {
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

    static async #untrack (identifier, removedTrackers) {
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

    static findDataFieldFor (timestamp, field) {
        for (const identifier of this.Timestamps.values(timestamp)) {
            const value = _dig(this.Players, identifier, timestamp, 'Data', field);
            if (value) {
                return value;
            }
        }

        return undefined;
    }

    static getTagsForTimestamp (timestamps) {
        const tags = {};

        const requestedTimestamps = timestamps ?? this.Timestamps.keys();
        for (const timestamp of requestedTimestamps) {
            for (const identifier of this.Timestamps.values(timestamp)) {
                const playerTags = _wrapOrEmpty(_dig(this.isPlayer(identifier) ? this.Players : this.Groups, identifier, timestamp, 'Data', 'tag'));

                for (const tag of playerTags) {
                    if (tags[tag]) {
                        tags[tag] += 1;
                    } else {
                        tags[tag] = 1;
                    }
                }
            }
        }

        return tags;
    }

    static async #import (json, timestamp, timestampOffset = -3600000, flags = {}) {
        if (Array.isArray(json)) {
            // Archive, Share
            if (_dig(json, 0, 'players') || _dig(json, 0, 'groups')) {
                let players = [];
                let groups = [];

                for (let file of json) {
                    const { players: filePlayers, groups: fileGroups } = await this.#addFile(file.players, file.groups, flags);

                    players = players.concat(filePlayers);
                    groups = groups.concat(fileGroups);
                }

                return {
                    players,
                    groups
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

                return await this.#addFile(players, groups, flags);
            }
        } else if (typeof json == 'object' && _dig(json, 'players')) {
            return this.#addFile(json.players, json.groups, flags);
        } else {
            // HAR, Endpoint
            let { players, groups } = PlayaResponse.importData(json, timestamp, timestampOffset);
            return this.#addFile(players, groups, flags);
        }
    }
}

DatabaseManager.reset()
