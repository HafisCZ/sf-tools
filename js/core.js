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

})(window);

// IndexedDB Setup
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction  || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

// File Database
const FileDatabase = new (class {

    ready (callback, error) {
        var request = window.indexedDB.open('database', 1);

        request.onsuccess = (e) => {
            this.db = request.result;
            callback();
        }

        request.onupgradeneeded = function (e) {
            e.target.result.createObjectStore('files', { keyPath: 'timestamp' });
        }

        request.onerror = error;
    }

    set (object) {
        this.db.transaction(['files'], 'readwrite').objectStore('files').put(object);
    }

    get (callback) {
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

    remove (key) {
        this.db.transaction(['files'], 'readwrite').objectStore('files').delete(key);
    }

})();

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

    removeByID (... identifiers) {
        for (var identifier of identifiers) {
            delete Database.Players[identifier];
            delete Database.Groups[identifier];
        }

        this.update();
    }

    add (... files) {
        var tempGroups = {};
        var tempPlayers = {};

        for (var file of files) {
            for (var data of file.groups) {
                data.timestamp = file.timestamp;
                let group = new SFGroup(data);
                group.MembersPresent = 0;

                if (!tempGroups[group.Identifier]) {
                    tempGroups[group.Identifier] = {};
                }
                tempGroups[group.Identifier][file.timestamp] = group;
            }

            for (var data of file.players) {
                data.timestamp = file.timestamp;
                let player = data.own ? new SFOwnPlayer(data) : new SFOtherPlayer(data);

                let groupID = player.hasGuild() ? Object.keys(tempGroups).find(id => {
                    var obj = getAtSafe(tempGroups, id, file.timestamp);
                    return obj.Identifier == player.Group.Identifier && obj.Members.includes(player.Identifier);
                }) : null;

                if (groupID) {
                    let group = tempGroups[groupID][file.timestamp];
                    group.MembersPresent++;

                    let index = group.Members.findIndex(identifier => identifier == player.Identifier);

                    player.Group.Role = group.Roles[index];
                    player.Group.Index = index;

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

    from (files) {
        this.Players = {};
        this.Groups = {};

        this.add(... files);
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

            if (this.Latest < group.LatestTimestamp) {
                this.Latest = group.LatestTimestamp;
            }
        }
    }

    constructor () {
        this.Hidden = Preferences.get('hidden', []);
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

const UpdateService = {
    update: function (file) {
        var updated = false;

        for (var i = 0, p; p = file.players[i]; i++) {
            if (!p.pets) {
                p.pets = p.own ? new Array(288).fill(0) : new Array(6).fill(0);
                updated = true;
            }
            if (!p.achievements) {
                p.achievements = new Array(160).fill(0);
                updated = true;
            }
            if (!p.prefix) {
                p.prefix = 's1_de';
                updated = true;
            }
            if (!p.id) {
                p.id = p.prefix + '_p' + (p.own ? p.save[1] : p.save[0]);
                updated = true;
            }
        }

        for (var i = 0, g; g = file.groups[i]; i++) {
            if (!g.id) {
                g.id = g.prefix + '_g' + g.save[0];
                updated = true;
            }
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
};

const Storage = new (class {

    load (callback, error) {
        FileDatabase.ready(() => {
            FileDatabase.get((current) => {
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

                Database.from(this.current);
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

    import (content) {
        try {
            var json = JSON.parse(content);
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
        } catch (exception) {
            throw exception.lineNumber + ' ' + exception;
        }
    }

    export (indexes) {
        download('archive.json', new Blob([
            JSON.stringify(indexes ? this.current.filter((file, index) => indexes.includes(index)) : this.current)
        ], {
            type: 'application/json'
        }));
    }

    add (content, timestamp) {
        try {
            var json = JSON.parse(content);
            var raws = [];
            for (var [key, val, url, ts] of filterPlayaJSON(json)) {
                if (ts) {
                    timestamp = ts;
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
                        } else if (key.includes('groupmember')) {
                            group.members = val.split(',');
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
                        }
                    }

                    if (!file.groups.find(g => g.name === group.name) && group.rank) {
                        file.groups.push(group);
                    }
                }

                if (raw.includes('otherplayername') || raw.includes('ownplayername')) {
                    let player = {
                        prefix: prefix || 's1_de'
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
                        } else if (key.includes('playerlookat')) {
                            player.save = val.split('/').map(a => Number(a));
                            player.own = false;
                            player.id = player.prefix + '_p' + player.save[0];
                        } else if (key.includes('playerSave')) {
                            player.save = val.split('/').map(a => Number(a));
                            player.own = true;
                            player.id = player.prefix + '_p' + player.save[1];
                        } else if (key.includes('petbonus') || key.includes('petsSave')) {
                            player.pets = val.split('/').map(a => Number(a));
                        } else if (key.includes('serverversion')) {
                            file.version = Number(val);
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
        } catch (exception) {
            throw exception.lineNumber + ' ' + exception;
        }
    }

    remove (index) {
        FileDatabase.remove(this.current[index].timestamp);
        Database.remove(this.current[index].timestamp);

        this.current.splice(index, 1);
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
