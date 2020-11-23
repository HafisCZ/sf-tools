// Version stuff
const MODULE_VERSION = 'v4.1100';
const TABLE_VERSION = 'v8';
const CORE_VERSION = 'v8';

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
            'TRACKER': 'c8f542'
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
})();

class PreferencesHandler {

    constructor () {
        this.storage = window.localStorage || window.sessionStorage || { };
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

    temporary () {
        this.storage = { };
        this.anonymous = true;
    }

}

// Preferences
const Preferences = new PreferencesHandler();
const SharedPreferences = new PreferencesHandler();

const DEFAULT_OFFSET = -60 * 60 * 1000;
const HAS_PROXY = typeof(Proxy) != 'undefined';

const CACHE_DEFAULT = 0;
const CACHE_DISABLE = 1;
const CACHE_DONT_CLEAR = 2;

const SiteOptions = new (class {
    constructor () {
        // Get values + defaults
        this.options = {
            lazy: false,
            beta: false,
            insecure: false,
            obfuscated: false,
            groups_hidden: false,
            players_hidden: false,
            browse_hidden: false,
            groups_other: false,
            players_other: false,
            files_hide: false,
            inventory: false,
            cache_policy: 0,
            tracker: false
        };

        Object.assign(this.options, SharedPreferences.get('options', {}));

        // Add setters & getters
        for (let propName of Object.keys(this.options)) {
            Object.defineProperty(this, propName, {
                get: function () {
                    return this.options[propName];
                },
                set: function (value) {
                    this.options[propName] = value;
                    SharedPreferences.set('options', this.options);
                }
            });
        }

        // Add site params
        this.params = {
            beta: false,
            temp: false
        };
    }

})();

// IndexedDB Setup
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction  || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

class DatabaseHandler {
    constructor (name, stores, onReady, onError) {
        this.name = name;
        this.stores = stores;

        // Add stores
        for (let { name, key } of stores) {
            let getStore = () => this.database.transaction([ name ], 'readwrite').objectStore(name);
            this[name] = {
                // Get all items
                get: callback => {
                    let r = getStore().getAll();
                    r.onsuccess = () => callback(r.result);
                    r.onerror = () => callback([]);
                },
                // Set item
                set: object => getStore().put(object),
                // Remove item
                remove: objectKey => getStore().delete(objectKey),
                // Remove all items
                clear: () => getStore().clear(),
                // Add all
                setMultiple: array => {
                    let s = getStore();
                    for (let obj of array) {
                        s.put(obj);
                    }
                }
            }
        }

        // Open db
        let openRequest = indexedDB.open(this.name, 2);

        // Success
        openRequest.onsuccess = event => {
            this.database = openRequest.result;
            onReady();
        }

        // Upgrade
        openRequest.onupgradeneeded = event => {
            let db = event.target.result;

            for (let { name, key } of this.stores) {
                db.objectStoreNames.contains(name) || db.createObjectStore(name, {
                    keyPath: key
                });
            }
        }

        // Error
        openRequest.onerror = onError;
    }
}

class TemporaryDatabase {
    constructor (stores) {
        for (let { name, key } of stores) {
            this[name] = {
                content: {},
                // Get all items
                get: function (callback) {
                    callback(Object.values(this.content));
                },
                // Set items
                set: function (object) {
                    this.content[object[key]] = object;
                },
                // Remove item
                remove: function (key) {
                    delete this.content[key];
                },
                // Clear
                clear: () => {
                    this.content = {};
                },
                // Add all
                setMultiple: array => {
                    for (let obj of array) {
                        this.content[obj[key]] = obj;
                    }
                }
            }
        }
    }
}

// Database
const Database = new (class {

    // Check if player exists
    hasPlayer (id, timestamp) {
        return Database.Players[id] && (timestamp ? Database.Players[id][timestamp] : true) ? true : false;
    }

    // Check if group exists
    hasGroup (id, timestamp) {
        return Database.Groups[id] && (timestamp ? Database.Groups[id][timestamp] : true) ? true : false;
    }

    // Get player
    getPlayer (id, timestamp) {
        let player = this.Players[id];
        if (player && timestamp) {
            return this.loadPlayer(player[timestamp]);
        } else {
            return player;
        }
    }

    // Get group
    getGroup (id, timestamp) {
        if (timestamp && this.Groups[id]) {
            return this.Groups[id][timestamp];
        } else {
            return this.Groups[id];
        }
    }

    // Load player
    loadPlayer (lazyPlayer) {
        if (lazyPlayer && lazyPlayer.IsProxy) {
            let { Identifier, Timestamp, Data, Own } = lazyPlayer;

            // Get player
            let player = Own ? new SFOwnPlayer(Data, this.LoadInventory) : new SFOtherPlayer(Data);

            // Get player group
            let group = this.getGroup(player.Group.Identifier, Timestamp);
            if (group) {
                // Find index of player in the group
                let gi = group.Members.findIndex(i => i == Identifier);

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

            // Replace needed references
            let playerObj = this.Players[Identifier];

            playerObj[Timestamp] = player;
            playerObj.List.find(([ ts, p ]) => ts == Timestamp)[1] = player;
            if (playerObj.LatestTimestamp == Timestamp) {
                playerObj.Latest = player;
            }

            // Return new player
            return player;
        } else {
            return lazyPlayer;
        }
    }

    remove (... timestamps) {
        this.ChangeInitiated = Date.now();

        for (var timestamp of timestamps) {
            Object.values(this.Players).forEach(function (p) {
                delete p[timestamp];
                if (!Object.keys(p).filter(x => !isNaN(x)).length) {
                    delete Database.Players[p.Latest.Identifier];
                }
            });

            Object.values(this.Groups).forEach(function (g) {
                delete g[timestamp];
                if (!Object.keys(g).filter(x => !isNaN(x)).length) {
                    delete Database.Groups[g.Latest.Identifier];
                }
            });
        }

        this.update();
    }

    removeByIDSingle (identifier, timestamp) {
        this.ChangeInitiated = Date.now();

        if (Database.Players[identifier]) {
            delete Database.Players[identifier][timestamp];
        } else if (Database.Groups[identifier]) {
            delete Database.Groups[identifier][timestamp];
        }

        this.update();
    }

    removeByID (... identifiers) {
        this.ChangeInitiated = Date.now();

        for (var identifier of identifiers) {
            delete Database.Players[identifier];
            delete Database.Groups[identifier];
        }

        this.update();
    }

    add (files, enableTracker) {
        this.ChangeInitiated = Date.now();

        var tempGroups = {};
        var tempPlayers = {};

        for (var file of files) {
            for (var data of file.groups) {
                if (this.Filters.Group && !this.Filters.Group(data)) {
                    continue;
                }

                data.timestamp = file.timestamp;
                data.offset = file.offset || DEFAULT_OFFSET;
                let group = new SFGroup(data);
                group.MembersPresent = 0;

                if (!tempGroups[group.Identifier]) {
                    tempGroups[group.Identifier] = {};
                }
                tempGroups[group.Identifier][file.timestamp] = group;
            }

            for (var data of file.players) {
                if (this.Filters.Player && !this.Filters.Player(data)) {
                    continue;
                }

                data.timestamp = file.timestamp;
                data.offset = file.offset || DEFAULT_OFFSET;

                let player = null;
                let groupID = null;

                if (HAS_PROXY && Database.Lazy && !enableTracker) {
                    player = new Proxy({
                        Data: data,
                        Identifier: data.id,
                        Timestamp: file.timestamp,
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
                                return Database.getPlayer(target.Identifier, target.Timestamp)[prop];
                            }
                        }
                    });

                    groupID = Object.keys(tempGroups).find(id => {
                        var obj = getAtSafe(tempGroups, id, file.timestamp);
                        return obj.Members && obj.Members.includes(player.Identifier);
                    });

                    if (groupID) {
                        let group = tempGroups[groupID][file.timestamp];
                        group.MembersPresent++;
                    }
                } else {
                    player = data.own ? new SFOwnPlayer(data, Database.LoadInventory) : new SFOtherPlayer(data);
                    groupID = player.Group.Identifier ? Object.keys(tempGroups).find(id => {
                        var obj = getAtSafe(tempGroups, id, file.timestamp);
                        return obj.Identifier == player.Group.Identifier && obj.Members.includes(player.Identifier);
                    }) : null;

                    if (groupID) {
                        let group = tempGroups[groupID][file.timestamp];
                        group.MembersPresent++;

                        let index = group.Members.findIndex(identifier => identifier == player.Identifier);

                        player.Group.Group = group;
                        player.Group.Role = group.Roles[index];
                        player.Group.Index = index;
                        player.Group.Rank = group.Rank;

                        if (group.Own) {
                            player.Group.Own = true;
                            player.Group.Pet = group.Pets[index];
                            player.Group.Treasure = group.Treasures[index];
                            player.Group.Instructor = group.Instructors[index];

                            if (!player.Fortress.Knights && group.Knights) {
                                player.Fortress.Knights = group.Knights[index];
                            }
                        } else {
                            player.Group.Pet = group.Pets[index];
                        }
                    }
                }

                if (!tempPlayers[player.Identifier]) {
                    tempPlayers[player.Identifier] = {};
                }
                tempPlayers[player.Identifier][file.timestamp] = player;

                if (enableTracker && Database.Trackers) {
                    Database.track(player);
                }
            }

            for (var [identifier, groups] of Object.entries(tempGroups)) {
                for (var [timestamp, group] of Object.entries(groups)) {
                    if (!group.MembersPresent) {
                        delete groups[timestamp];
                    }
                }
                if (!Object.values(groups).length) {
                    delete tempGroups[identifier];
                }
            }
        }

        Object.entries(tempPlayers).forEach((entry) => {
            if (!this.Players[entry[0]]) {
                this.Players[entry[0]] = {};
            }

            Object.entries(entry[1]).forEach((subentry) => {
                this.Players[entry[0]][subentry[0]] = subentry[1];
            });
        });

        Object.entries(tempGroups).forEach((entry) => {
            if (!this.Groups[entry[0]]) {
                this.Groups[entry[0]] = {};
            }

            Object.entries(entry[1]).forEach((subentry) => {
                this.Groups[entry[0]][subentry[0]] = subentry[1];
            });
        });

        this.update();
    }

    from (files, pfilter, gfilter) {
        this.Players = {};
        this.Groups = {};

        this.Filters = {
            Player: pfilter,
            Group: gfilter
        };

        this.add(files.filter(file => !file.hidden));

        this.Hidden = Preferences.get('hidden', []);

        if (this.Trackers) {
            this.refreshTrackers();
        }
    }

    refreshTrackers () {
        this.Trackers = new Settings(SettingsManager.get('tracker', '', PredefinedTemplates.Tracker)).trackers;

        let trackerEntries = Object.entries(this.Trackers);
        let cachedTrackers = Preferences.get('trackers', { });

        let changedTrackers = trackerEntries.map(([ name, { ast, out, hash } ]) => cachedTrackers[name] != hash ? name : null).filter(x => x);
        changedTrackers.push(... Object.keys(cachedTrackers).filter(name => !this.Trackers[name]));

        if (changedTrackers.length) {
            let cmap = trackerEntries.reduce((col, [ name, { hash } ]) => {
                col[name] = hash;
                return col;
            }, {})

            for (let [ key, hash ] of Object.entries(cmap)) {
                if (cachedTrackers[key]) {
                    if (hash != cachedTrackers[key]) {
                        Logger.log('TRACKER', `Tracker ${ key } changed! ${ cachedTrackers[key] } -> ${ hash }`);
                    }
                } else {
                    Logger.log('TRACKER', `Tracker ${ key } with hash ${ hash } added!`);
                }
            }

            for (let name of changedTrackers) {
                if (!this.Trackers[name]) {
                    Logger.log('TRACKER', `Tracker ${ name } with hash ${ cachedTrackers[name] } removed!`)
                }
            }

            Preferences.set('trackers', cmap);

            let changed = { };
            for (let pid of Object.keys(this.Players)) {
                // Untrack changed keys
                let x = this.untrack(pid, changedTrackers);
                if (x) {
                    changed[x.identifier] = x;
                }

                for (let [ ts, ] of this.Players[pid].List) {
                    // Re-track keys
                    let y = this.track(this.getPlayer(pid, ts), true);
                    if (y) {
                        changed[y.identifier] = y;
                    }
                }
            }

            let centries = Object.values(changed);
            if (centries.length) {
                Storage.db.profiles.setMultiple(centries.map(ce => {
                    return {
                        identifier: ce.identifier,
                        value: JSON.stringify(ce)
                    };
                }));
            }
        }
    }

    untrack (pid, trackers) {
        let profile = this.Profiles[pid];
        if (profile) {
            let changed = false;

            for (let key of Object.keys(profile)) {
                if (trackers.includes(key)) {
                    delete profile[key];
                    changed = true;
                }
            }

            if (changed) {
                this.Profiles[pid] = profile;
                return profile;
            }
        }

        return false;
    }

    track (player, nsave) {
        let changed = false;
        let profile = this.Profiles[player.Identifier] || {
            identifier: player.Identifier
        };

        for (let [ name, { ast, out } ] of Object.entries(this.Trackers)) {
            if (ast.eval(player)) {
                if (!profile[name] || profile[name].ts > player.Timestamp) {
                    profile[name] = {
                        ts: player.Timestamp,
                        out: out ? out.eval(player) : player.Timestamp
                    };

                    changed = true;
                }
            }
        }

        if (changed) {
            this.Profiles[player.Identifier] = profile;
            if (nsave) {
                return profile;
            } else {
                Storage.db.profiles.set(profile);
            }
        }

        return false;
    }

    update () {
        this.Latest = 0;

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
            player.Latest = player[player.LatestTimestamp];
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

        this.Changed = Date.now();
        Logger.log('STORAGE', `Database changed! ${ this.ChangeInitiated ? `Took ${ this.Changed - this.ChangeInitiated }ms` : `Timestamp: ${ this.Changed }` }`);

        this.ChangeInitiated = null;
        this.StateChanged = false;
    }

    hide (identifier) {
        var index = this.Hidden.indexOf(identifier);
        if (index >= 0) {
            this.Hidden.splice(index, 1);
        } else {
            this.Hidden.push(identifier);
        }

        Preferences.set('hidden', this.Hidden);
    }

})();

const PlayerUpdaters = [
    p => {
        if (!p.pets) {
            p.pets = [];
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (!p.achievements) {
            p.achievements = [];
            return true;
        } else if (p.achievements.length == 60) {
            p.achievements = [ ... p.achievements.slice(0, 60), ... new Array(20).fill(0), ... p.achievements.slice(60, 120), ... new Array(20).fill(0) ];
            return true;
        } else if (p.achievements.length == 70) {
            p.achievements = [ ... p.achievements.slice(0, 70), ... new Array(10).fill(0), ... p.achievements.slice(70, 140), ... new Array(10).fill(0) ];
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (p.own && !p.tower) {
            p.tower = [];
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (p.own && !p.witch) {
            p.witch = [];
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (!p.prefix) {
            p.prefix = 's1_de';
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (!p.id) {
            p.id = p.prefix + '_p' + (p.own ? p.save[1] : p.save[0]);
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (!p.class) {
            p.class = (p.own ? p.save[29] : p.save[20]) % 256;
            return true;
        } else {
            return false;
        }
    },
    p => {
        if (p.own && !p.idle) {
            p.idle = [];
            return true;
        } else {
            return false;
        }
    }
];

const GroupUpdaters = [
    g => {
        if (!g.id) {
            g.id = g.prefix + '_g' + g.save[0];
            return true;
        } else {
            return false;
        }
    },
    g => {
        if (!g.names) {
            g.names = new Array(50).fill('').map((x, i) => `member_${ i }`);
            return true;
        } else {
            return false;
        }
    }
];

const UpdateService = {
    update: function (file) {
        var updated = false;

        for (var i = 0, p; p = file.players[i]; i++) {
            for (var updater of PlayerUpdaters) {
                if (updater(p)) {
                    updated = true;
                }
            }
        }

        for (var i = 0, g; g = file.groups[i]; i++) {
            for (var updater of GroupUpdaters) {
                if (updater(g)) {
                    updated = true;
                }
            }
        }

        if (file.offset == undefined) {
            file.offset = DEFAULT_OFFSET;
            updated = true;
        }

        return updated;
    },
    mergeInto : function (a, b) {
        if (!a.version || a.version < b.version) {
            a.version = b.version;
        }

        for (var p of b.players) {
            let player = a.players.find(bp => bp.prefix == p.prefix && (p.own ? (p.save[1] == bp.save[1]) : (p.save[0] == bp.save[0])));
            if (!player) {
                a.players.push(p);
            } else {
                // Merge idle game if missing (idlegame -> idlesave change)
                if ((!player.idle || player.idle.length == 0) && p.idle) {
                    player.idle = p.idle;
                }
            }
        }

        for (var g of b.groups) {
            if (!a.groups.find(bg => bg.prefix == g.prefix && bg.save[0] == g.save[0])) {
                a.groups.push(g);
            }
        }
    }
}

const Storage = new (class {

    /*
        Load storage
    */
    load (callback, error, { temporary = false, trackers = false, slot = 0, lazy = false, inventory = false, pfilter = null, gfilter = null } = {}) {
        // Print out flags
        Logger.log('R_FLAGS', `Temporary: ${ temporary }`);
        Logger.log('R_FLAGS', `Slot: ${ slot }`);
        Logger.log('R_FLAGS', `Lazy: ${ lazy }`);
        Logger.log('R_FLAGS', `LoadInventory: ${ inventory }`);
        Logger.log('R_FLAGS', `Filters: ${ pfilter }, ${ gfilter }`);

        // Set flags
        Database.Lazy = lazy;
        Database.LoadInventory = inventory;
        Database.Trackers = trackers && SiteOptions.tracker;

        // Mark preferences as temporary
        if (temporary) {
            Preferences.temporary();
        }

        // Capture start time
        let loadStart = Date.now();

        // Profiles callback
        let onReady = () => {
            if (SiteOptions.tracker) {
                this.db.profiles.get(onProfilesReady);
            } else {
                onProfilesReady([]);
            }
        }

        // Database callback
        let onProfilesReady = (profiles) => {
            // Set current profiles
            Database.Profiles = profiles.reduce((obj, profile) => {
                obj[profile.identifier] = typeof profile.value == 'string' ? JSON.parse(profile.value) : profile;
                return obj;
            }, {});

            // Capture profile end time
            let loadProfilesEnd = Date.now();

            this.db.files.get((current) => {
                // Set current files
                this.current = current;

                // Capture database end time
                let loadDatabaseEnd = Date.now();

                // Correction
                let corrected = this.current.reduce((corr, file) => {
                    if (UpdateService.update(file)) {
                        this.db.files.set(file);
                        return true;
                    } else {
                        return corr;
                    }
                }, false);

                // Capture update end
                let loadUpdateEnd = Date.now();

                // Create database
                Database.from(this.current, pfilter, gfilter);

                // Capture end time
                var loadEnd = Date.now();

                Logger.log('STORAGE', `Database: ${ loadDatabaseEnd - loadProfilesEnd } ms, ${ SiteOptions.tracker ? `Tracker: ${ loadProfilesEnd - loadStart } ms, ` : '' }Update${ corrected ? '/Yes' : '' }: ${ loadUpdateEnd - loadDatabaseEnd } ms, Processing${ HAS_PROXY && this.Lazy ? '/Lazy' : '' }: ${ loadEnd - loadUpdateEnd } ms`);
                if (loadEnd - loadUpdateEnd > 1000) {
                    Logger.log('WARNING', 'Processing step is taking too long!');
                }

                callback();
            });
        }

        // Create database
        if (temporary) {
            this.db = new TemporaryDatabase([
                {
                    name: 'files',
                    key: 'timestamp'
                },
                {
                    name: 'profiles',
                    key: 'identifier'
                }
            ]);

            onReady();
        } else {
            this.db = new DatabaseHandler(slot ? `database_${ slot }` : 'database', [
                {
                    name: 'files',
                    key: 'timestamp'
                },
                {
                    name: 'profiles',
                    key: 'identifier'
                }
            ], onReady, error);
        }
    }

    save (... files) {
        this.current.sort((a, b) => a.timestamp - b.timestamp);
        for (var i = 0, file; file = files[i]; i++) {
            this.db.files.set(file);
        }
    }

    update (index, file) {
        this.current[index] = file;
        this.save(file);
    }

    import (json) {
        var files = [];

        for (var file of json) {
            UpdateService.update(file);

            var existingFile = this.current.find(f => f.timestamp == file.timestamp);
            if (existingFile) {
                UpdateService.mergeInto(existingFile, file);
                file = existingFile;
            } else {
                this.current.push(file);
            }

            files.push(file);
        }

        Database.add(files, true);
        this.save(... files);
    }

    export (indexes) {
        download(`archive_${ Date.now() }`, new Blob([ JSON.stringify(this.getExportData(indexes)) ], { type: 'application/json' }));
    }

    getExportData (indexes) {
        let files = indexes ? this.current.filter((file, index) => indexes.includes(index)) : this.current;
        let content = [];

        // Create new files from stored files
        for (let file of files) {
            content.push({
                timestamp: file.timestamp,
                label: file.label,
                version: file.version,
                offset: file.offset,
                players: file.players,
                groups: file.groups
            });
        }

        return content;
    }

    exportGroupData (identifier, timestamps) {
        download(`archive_${ Date.now() }_${ identifier }.json`, new Blob([ JSON.stringify(this.getExportGroupData(identifier, timestamps)) ], { type: 'application/json' }));
    }

    getExportGroupData (identifier, timestamps) {
        var content = [];
        var group = Database.Groups[identifier];

        for (var file of this.current) {
            if (timestamps.includes(file.timestamp)) {
                var rfile = {
                    timestamp: file.timestamp,
                    label: identifier,
                    version: file.version,
                    offset: file.offset,
                    players: group[file.timestamp] ? file.players.filter(player => group[file.timestamp].Members.includes(player.id)) : [],
                    groups: group[file.timestamp] ? [group[file.timestamp].Data] : []
                };

                if (rfile.players.length) {
                    content.push(rfile);
                }
            }
        }

        return content;
    }

    getExportManyPlayerData (identifiers) {
        var content = [];

        for (var file of this.current) {
            var players = file.players.filter(player => identifiers.includes(player.id));
            var pids = players.map(p => p.id);

            var groups = [];

            for (var group of file.groups) {
                let g = Database.Groups[group.id] ? Database.Groups[group.id][file.timestamp] : null;
                if (g) {
                    if (g.Members.some(x => pids.includes(x))) {
                        groups.push(g.Data);
                    }
                }
            }

            var rfile = {
                timestamp: file.timestamp,
                version: file.version,
                offset: file.offset,
                players: players,
                groups: groups
            };

            if (rfile.players.length) {
                content.push(rfile);
            }
        }

        return content;
    }

    getExportPlayerData (identifier, timestamps) {
        var content = [];
        var player = Database.Players[identifier];

        for (var file of this.current) {
            if (timestamps.includes(file.timestamp)) {
                var tplayer = player[file.timestamp];

                var rfile = {
                    timestamp: file.timestamp,
                    version: file.version,
                    label: identifier,
                    offset: file.offset,
                    players: tplayer ? [ tplayer.Data ] : [],
                    groups: tplayer && tplayer.Group && tplayer.Group.Group ? [ tplayer.Group.Group.Data ] : []
                };

                if (rfile.players.length) {
                    content.push(rfile);
                }
            }
        }

        return content;
    }

    exportPlayerData (identifier, timestamps) {
        download(`archive_${ Date.now() }_${ identifier }.json`, new Blob([ JSON.stringify(this.getExportPlayerData(identifier, timestamps)) ], { type: 'application/json' }));
    }

    add (content, timestamp) {
        var json = JSON.parse(content);
        if (Array.isArray(json)) {
            this.import(json);
        } else {
            this.importSingle(json, timestamp);
        }
    }

    importSingle (json, timestamp, offset = DEFAULT_OFFSET) {
        var raws = [];
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

        var file = {
            groups: [],
            players: [],
            timestamp: timestamp,
            offset: offset,
            version: 0
        }

        let owngroups = [];
        for (var pair of raws) {
            var [raw, prefix] = pair;

            if (raw.includes('groupSave') || raw.includes('groupsave')) {
                var group = {
                    prefix: prefix || 's1_de'
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
                        group.id = group.prefix + '_g' + group.save[0];
                    } else if (key.includes('groupSave') && group.own == undefined) {
                        group.save = val.split('/').map(a => Number(a));
                        group.own = false;
                        group.id = group.prefix + '_g' + group.save[0];
                    } else if (key.includes('groupmember')) {
                        group.names = val.split(',');
                    }
                }

                if (!file.groups.find(g => g.name === group.name) && group.rank) {
                    file.groups.push(group);
                }
            }

            var own = raw.includes('ownplayername');
            if (raw.includes('otherplayername') || raw.includes('ownplayername')) {
                let player = {
                    prefix: prefix || 's1_de',
                    own: own
                };

                for (var [key, val] of parsePlayaResponse(raw)) {
                    if (key.includes('groupname')) {
                        player.groupname = val;

                        if (key.includes('own')) {
                            owngroups.push(val);
                        }
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
                        player.id = player.prefix + '_p' + player.save[0];
                    } else if (own && key.includes('playerSave')) {
                        player.save = val.split('/').map(a => Number(a));

                        player.save[4] = 0;
                        player.save[503] = 0;
                        player.save[504] = 0;
                        player.save[505] = 0;
                        player.save[561] = 0;

                        player.id = player.prefix + '_p' + player.save[1];
                    } else if ((!own && key.includes('petbonus')) || (own && key.includes('petsSave'))) {
                        player.pets = val.split('/').map(a => Number(a));
                    } else if (key.includes('serverversion')) {
                        file.version = Number(val);
                    } else if (own && key.includes('towerSave')) {
                        player.tower = val.split('/').map(a => Number(a));
                    } else if (own && key.includes('fortresschest')) {
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
                    } else if (key.includes('otherdescription') && player.save && !owngroups.includes(player.groupname) && val.startsWith('$r')) {
                        let torem = val.slice(2, 4).toLowerCase();
                        if (/dt|ch/.test(torem)) {
                            for (let i = 0; i < 49; i++) player.save[208 + i] = 0;
                            for (let i = 0; i < 5; i++) player.save[253 + i] = 0;
                            for (let i = 0; i < 11; i++) player.save[183 + i] = 0;
                            player.save[164] = 0;
                            player.save[165] = 0;
                        }
                    }
                }

                if (!file.players.find(p => p.name === player.name)) {
                    file.players.push(player);
                }
            }
        }

        UpdateService.update(file);

        var existingFile = this.current.find(f => f.timestamp == file.timestamp);
        if (existingFile) {
            UpdateService.mergeInto(existingFile, file);
            file = existingFile;
        } else {
            this.current.push(file);
        }

        Database.add([ file ], true);
        this.save(file);
    }

    remove (index) {
        this.db.files.remove(this.current[index].timestamp);
        Database.remove(this.current[index].timestamp);

        this.current.splice(index, 1);
    }

    updateTimestamp (index, newTimestamp) {
        let file = this.current[index];
        this.remove(index);
        file.timestamp = newTimestamp;
        this.import([ file ]);
    }

    // Set hidden files
    setHidden (state, ... indexes) {
        if (state == null) {
            // Toggle by first file (used only for single file)
            this.setHidden(!this.current[indexes[0]].hidden, ... indexes);
        } else {
            let files = this.current.filter((file, index) => indexes.includes(index));
            files.forEach(file => file.hidden = state);

            // Update the database (should cause just one update instead of several)
            if (state) {
                Database.remove(... files.map(file => file.timestamp));
            } else {
                Database.add(files);
            }

            // Save files
            this.save(... files);
        }
    }

    removeByIDSingle (identifier, timestamp) {
        var changed = null;

        for (var i = 0, file; file = this.current[i]; i++) {
            var change = false;

            for (var j = 0, group; group = file.groups[j]; j++) {
                if (group.id == identifier && group.timestamp == timestamp) {
                    file.groups.splice(j--, 1);
                    change = true;
                }
            }

            for (var j = 0, player; player = file.players[j]; j++) {
                if (player.id == identifier && player.timestamp == timestamp) {
                    file.players.splice(j--, 1);
                    change = true;
                }
            }

            if (change) {
                changed = file;
                break;
            }
        }

        if (changed) {
            Database.removeByIDSingle(identifier, timestamp);
            this.save(changed);
        }
    }

    removeByID (... identifiers) {
        var changed = [];

        for (var i = 0, file; file = this.current[i]; i++) {
            var change = false;
            for (var j = 0, group; group = file.groups[j]; j++) {
                if (identifiers.includes(group.id)) {
                    file.groups.splice(j--, 1);
                    change = true;
                }
            }
            for (var j = 0, player; player = file.players[j]; j++) {
                if (identifiers.includes(player.id)) {
                    file.players.splice(j--, 1);
                    change = true;
                }
            }
            if (change) {
                changed.push(file);
            }
        }

        if (changed.length) {
            Database.removeByID(... identifiers);
            this.save(... changed);
        }
    }

    merge (indexes) {
        var timestamps = indexes.map(i => this.current[i].timestamp);
        var files = this.current.filter(f => timestamps.includes(f.timestamp));
        files.reverse();

        var base = files[0];
        for (var i = 1, file; file = files[i]; i++) {
            UpdateService.mergeInto(base, file);
        }

        timestamps.forEach(t => {
            this.db.files.remove(t);
            this.current.splice(this.current.findIndex(file => file.timestamp == t), 1);
        });

        Database.remove(... timestamps);
        Database.add([ base ]);

        this.current.push(base);
        this.save(base);
    }

    files () {
        for (let i = 0; i < this.current.length; i++) {
            this.current[i].index = i;
        }

        return this.current;
    }
})();
