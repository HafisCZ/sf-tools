// Preferences
const Preferences = new (class {

    constructor (window) {
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

})(window);

const SharedPreferences = new (class {

    constructor (window) {
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

})(window);

const SiteOptions = new (class {
    constructor () {
        this.options = SharedPreferences.get('options', {
            lazy: false,
            beta: false,
            insecure: false,
            obfuscated: false,
            groups_hidden: false,
            players_hidden: false,
            browse_hidden: false,
            groups_other: false,
            players_other: false
        });

        this.params = {
            beta: false,
            temp: false,
            insecure: false,
            obfuscated: false,
            groups_hidden: false,
            players_hidden: false,
            browse_hidden: false,
            groups_other: false,
            players_other: false
        };
    }

    get lazy () {
        return this.options.lazy;
    }

    set lazy (value) {
        this.options.lazy = value;
        SharedPreferences.set('options', this.options);
    }

    get obfuscated () {
        return this.options.obfuscated;
    }

    set obfuscated (value) {
        this.options.obfuscated = value;
        SharedPreferences.set('options', this.options);
    }

    get beta () {
        return this.options.beta;
    }

    set beta (value) {
        this.options.beta = value;
        SharedPreferences.set('options', this.options);
    }

    get insecure () {
        return this.options.insecure;
    }

    set insecure (value) {
        this.options.insecure = value;
        SharedPreferences.set('options', this.options);
    }

    get groups_hidden () {
        return this.options.groups_hidden;
    }

    set groups_hidden (value) {
        this.options.groups_hidden = value;
        SharedPreferences.set('options', this.options);
    }

    get players_hidden () {
        return this.options.players_hidden;
    }

    set players_hidden (value) {
        this.options.players_hidden = value;
        SharedPreferences.set('options', this.options);
    }

    get browse_hidden () {
        return this.options.browse_hidden;
    }

    set browse_hidden (value) {
        this.options.browse_hidden = value;
        SharedPreferences.set('options', this.options);
    }

    get groups_other () {
        return this.options.groups_other;
    }

    set groups_other (value) {
        this.options.groups_other = value;
        SharedPreferences.set('options', this.options);
    }

    get players_other () {
        return this.options.players_other;
    }

    set players_other (value) {
        this.options.players_other = value;
        SharedPreferences.set('options', this.options);
    }
})();

// IndexedDB Setup
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction  || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

// File Database
const FileDatabase = new (class {

    temporary () {
        this.anonymous = true;
    }

    slot (id) {
        this.dbname = 'database_' + id;
    }

    ready (callback, error) {
        if (!this.dbname) {
            this.dbname = 'database';
        }

        if (this.anonymous) {
            this.db = { };
            callback();
        } else {
            var request = window.indexedDB.open(this.dbname, 1);

            request.onsuccess = (e) => {
                this.db = request.result;
                callback();
            }

            request.onupgradeneeded = function (e) {
                e.target.result.createObjectStore('files', { keyPath: 'timestamp' });
            }

            request.onerror = error;
        }
    }

    set (object) {
        if (this.anonymous) {
            this.db[object.timestamp] = object;
        } else {
            this.db.transaction(['files'], 'readwrite').objectStore('files').put(object);
        }
    }

    get (callback) {
        if (this.anonymous) {
            callback(Object.values(this.db));
        } else {
            var result = [];
            this.db.transaction('files').objectStore('files').openCursor().onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                    result.push(cursor.value);
                    cursor.continue();
                } else {
                    callback(result);
                }
            }
        }
    }

    remove (key) {
        if (this.anonymous) {
            delete this.db[key];
        } else {
            this.db.transaction(['files'], 'readwrite').objectStore('files').delete(key);
        }
    }

})();

const DEFAULT_OFFSET = -60 * 60 * 1000;
const HAS_PROXY = typeof(Proxy) != 'undefined';

// Database
const Database = new (class {

    remove (... timestamps) {
        for (var timestamp of timestamps) {
            Object.values(this.Players).forEach(function (p) {
                if (p[timestamp] && p.List.length == 1) {
                    delete Database.Players[p.Latest.Identifier];
                } else {
                    delete p[timestamp];
                }
            });

            Object.values(this.Groups).forEach(function (g) {
                if (g[timestamp] && g.List.length == 1) {
                    delete Database.Groups[g.Latest.Identifier];
                } else {
                    delete g[timestamp];
                }
            });

            this.update();
        }
    }

    removeByIDSingle (identifier, timestamp) {
        if (Database.Players[identifier]) {
            delete Database.Players[identifier][timestamp];
        } else if (Database.Groups[identifier]) {
            delete Database.Groups[identifier][timestamp];
        }

        this.update();
    }

    removeByID (... identifiers) {
        for (var identifier of identifiers) {
            delete Database.Players[identifier];
            delete Database.Groups[identifier];
        }

        this.update();
    }

    preload (id, timestamp) {
        if (this.Players[id][timestamp].IsProxy) {
            var data = this.Players[id][timestamp].Data;
            var player = data.own ? new SFOwnPlayer(data, Database.LoadInventory) : new SFOtherPlayer(data);

            let groupID = null;
            if (player.Group.Identifier && this.Groups[player.Group.Identifier] && this.Groups[player.Group.Identifier][timestamp]) {
                groupID = player.Group.Identifier;
            }

            if (groupID) {
                let group = Database.Groups[groupID][timestamp];
                let index = group.Members.findIndex(identifier => identifier == player.Identifier);

                player.Group.Group = group;
                player.Group.Role = group.Roles[index];
                player.Group.Index = index;
                player.Group.Rank = group.Rank;
                player.Group.ReadyDefense = group.States[index] == 1 || group.States[index] == 3;
                player.Group.ReadyAttack = group.States[index] > 1;

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

            this.Players[id][timestamp] = player;

            return true;
        } else {
            return false;
        }
    }

    load (id, timestamp) {
        if (this.Players[id][timestamp].IsProxy) {
            var data = this.Players[id][timestamp].Data;
            var player = data.own ? new SFOwnPlayer(data, Database.LoadInventory) : new SFOtherPlayer(data);

            let groupID = null;
            if (player.Group.Identifier && this.Groups[player.Group.Identifier] && this.Groups[player.Group.Identifier][timestamp]) {
                groupID = player.Group.Identifier;
            }

            if (groupID) {
                let group = Database.Groups[groupID][timestamp];
                let index = group.Members.findIndex(identifier => identifier == player.Identifier);

                player.Group.Group = group;
                player.Group.Role = group.Roles[index];
                player.Group.Index = index;
                player.Group.Rank = group.Rank;
                player.Group.ReadyDefense = group.States[index] == 1 || group.States[index] == 3;
                player.Group.ReadyAttack = group.States[index] > 1;

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

            this.Players[id][timestamp] = player;
            this.update();

            return player;
        } else {
            return this.Players[id][timestamp];
        }
    }

    add (... files) {
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

                if (HAS_PROXY && Database.Lazy) {
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
                                return Database.load(target.Identifier, target.Timestamp)[prop];
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

        this.add(... files.filter(file => !file.hidden));

        this.Hidden = Preferences.get('hidden', []);
    }

    update () {
        this.Changed = Date.now();
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

        Logger.log('STORAGE', 'Database changed! Timestamp: ' + this.Changed);
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
        if (p.own && !p.chest) {
            p.chest = [];
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
            if (!a.players.find(bp => bp.prefix == p.prefix && (p.own ? (p.save[1] == bp.save[1]) : (p.save[0] == bp.save[0])))) {
                a.players.push(p);
            }
        }

        for (var g of b.groups) {
            if (!a.groups.find(bg => bg.prefix == g.prefix && bg.save[0] == g.save[0])) {
                a.groups.push(g);
            }
        }
    }
}

const Logger = new (class {
    constructor () {
        this.colors = {
            'STORAGE': 'fcba03',
            'WARNING': 'fc6203'
        };
    }

    log (type, text) {
        console.log(
            `%c${ type }%c${ text }`,
            `background-color: #${ this.colors[type] || 'ffffff' }; padding: 0.5em; font-size: 15px; font-weight: bold; color: black;`,
            'padding: 0.5em; font-size: 15px;'
        );
    }
})();

const Storage = new (class {
    load (callback, error, args) {
        var loadStart = Date.now();

        if (args.temporary) {
            Preferences.temporary();
            FileDatabase.temporary();
        }

        if (!args.temporary && args.slot) {
            FileDatabase.slot(args.slot);
        }

        Database.Lazy = args.lazy || false;
        Database.LoadInventory = args.inventory || false;

        FileDatabase.ready(() => {
            FileDatabase.get((current) => {
                var loadDatabaseEnd = Date.now();
                this.current = current;

                // Correction
                var corrected = false;
                for (var i = 0, f; f = this.current[i]; i++) {
                    if (UpdateService.update(f)) {
                        corrected = true;
                    }
                }

                if (corrected) {
                    this.save(... this.current);
                }
                var loadUpdateEnd = Date.now();

                Database.from(this.current, args.pfilter, args.gfilter);
                var loadEnd = Date.now();

                Logger.log('STORAGE', `Database: ${ loadDatabaseEnd - loadStart } ms,  Update: ${ loadUpdateEnd - loadDatabaseEnd } ms, Processing${ HAS_PROXY && Database.Lazy ? '/Lazy' : '' }: ${ loadEnd - loadUpdateEnd } ms`);
                if (loadEnd - loadUpdateEnd > 1000) {
                    Logger.log('WARNING', 'Processing step is taking too long!');
                }

                callback();
            });
        }, error);
    }

    save (... files) {
        this.current.sort((a, b) => a.timestamp - b.timestamp);
        for (var i = 0, file; file = files[i]; i++) {
            FileDatabase.set(file);
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

        Database.add(... files);
        this.save(... files);
    }

    export (indexes) {
        download('archive.json', new Blob([
            JSON.stringify(indexes ? this.current.filter((file, index) => indexes.includes(index)) : this.current)
        ], {
            type: 'application/json'
        }));
    }

    getExportData (indexes) {
        return indexes ? this.current.filter((file, index) => indexes.includes(index)) : this.current
    }

    exportGroupData (identifier, timestamps) {
        download(`archive_${ identifier }.json`, new Blob([ JSON.stringify(this.getExportGroupData(identifier, timestamps)) ], { type: 'application/json' }));
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

    exportPlayerData (identifier, timestamps) {
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

        download(`archive_${ identifier }.json`, new Blob([ JSON.stringify(content) ], { type: 'application/json' }));
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
                        player.id = player.prefix + '_p' + player.save[1];
                    } else if (key.includes('petbonus') || key.includes('petsSave')) {
                        player.pets = val.split('/').map(a => Number(a));
                    } else if (key.includes('serverversion')) {
                        file.version = Number(val);
                    } else if (key.includes('towerSave')) {
                        player.tower = val.split('/').map(a => Number(a));
                    } else if (key.includes('fortresschest')) {
                        player.chest = val.split('/').map(a => Number(a));
                    } else if (key.includes('witchData')) {
                        player.witch = val.split('/').map(a => Number(a));
                    } else if (key.includes('idlegame')) {
                        player.idle = val.split('/').map(a => Number(a));
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

        Database.add(file);
        this.save(file);
    }

    remove (index) {
        FileDatabase.remove(this.current[index].timestamp);
        Database.remove(this.current[index].timestamp);

        this.current.splice(index, 1);
    }

    hide (index) {
        var file = this.current[index];

        if (file.hidden) {
            file.hidden = false;
            Database.add(file);
        } else {
            file.hidden = true;
            Database.remove(file.timestamp);
        }

        this.save(file);
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
            FileDatabase.remove(t);
            this.current.splice(this.current.findIndex(file => file.timestamp == t), 1);
        });

        Database.remove(... timestamps);
        Database.add(base);

        this.current.push(base);
        this.save(base);
    }

    files () {
        return this.current;
    }
})();
