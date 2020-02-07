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

// Event Handler
const Handle = new (class {

    constructor () {
        this.listeners = {};
    }

    bind (event, listener) {
        if (this.listeners[event]) {
            this.listeners[event].push(listener);
        } else {
            this.listeners[event] = [ listener ];
        }
    }

    unbind (event, listener) {
        if (this.listeners[event] && this.listeners[event].indexOf(listener)) {
            this.listeners[event].splice(this.listners[event].indexOf(listener), 1);
        }
    }

    call (event, ... args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(... args));
        }
    }

})();

// Database
const Database = new (class {

    remove (... timestamps) {
        for (var timestamp of timestamps) {
            Object.values(this.Players).forEach(function (p) {
                if (p.List.length == 1 && p.List[0].timestamp == timestamp) {
                    delete Database.Players[p.Latest.Identifier];
                } else {
                    delete p[timestamp];
                }
            });

            Object.values(this.Groups).forEach(function (g) {
                if (g.List.length == 1 && g.List[0].timestamp == timestamp) {
                    delete Database.Groups[g.Latest.Identifier];
                } else {
                    delete g[timestamp];
                }
            });

            this.update();
        }
    }

    add (... files) {
        var tempGroups = {};
        var tempPlayers = {};

        for (var file of files) {
            for (var data of file.groups) {
                let group = new SFGroup(data);

                if (!tempGroups[group.Identifier]) {
                    tempGroups[group.Identifier] = {};
                }
                tempGroups[group.Identifier][file.timestamp] = group;
            }

            for (var data of file.players) {
                let player = data.own ? new SFOwnPlayer(data) : new SFOtherPlayer(data);

                let gid = player.hasGuild() ? Object.keys(tempGroups).find(id => getAtSafe(tempGroups, id, file.timestamp).Name == player.Group.Name) : null;
                if (gid) {
                    let group = tempGroups[gid][file.timestamp];
                    let index = group.MemberIDs.findIndex(i => i == player.Identifier);

                    player.Group.Role = group.Roles[index];
                    player.Group.Treasure = group.Treasures[index];
                    player.Group.Instructor = group.Instructors[index];
                    player.Group.Pet = group.Pets[index];
                    player.Group.Own = group.Own;

                    if (!player.Fortress.Knights && group.Knights) {
                        player.Fortress.Knights = group.Knights[index];
                    }
                }

                if (!tempPlayers[player.Identifier]) {
                    tempPlayers[player.Identifier] = {};
                }
                tempPlayers[player.Identifier][file.timestamp] = player;
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
        this.Latest = 0;

        for (const [id, obj] of Object.entries(this.Players)) {
            obj.List = Object.entries(obj).map(function (entry) {
                return {
                    timestamp: Number(entry[0]),
                    player: entry[1]
                };
            }).filter(entry => !isNaN(entry.timestamp));

            obj.List.sort((a, b) => a.timestamp - b.timestamp);
            obj.LatestTimestamp = obj.List[obj.List.length - 1].timestamp;
            obj.Latest = obj[obj.LatestTimestamp];
            if (obj.LatestTimestamp > this.Latest) {
                this.Latest = obj.LatestTimestamp;
            }
        }

        for (const [id, obj] of Object.entries(this.Groups)) {
            obj.List = Object.entries(obj).map(function (entry) {
                return {
                    timestamp: Number(entry[0]),
                    group: entry[1]
                };
            }).filter(entry => !isNaN(entry.timestamp));

            obj.List.sort((a, b) => a.timestamp - b.timestamp);
            obj.LatestTimestamp = obj.List[obj.List.length - 1].timestamp;
            obj.Latest = obj[obj.LatestTimestamp];
            if (obj.LatestTimestamp > this.Latest) {
                this.Latest = obj.LatestTimestamp;
            }
        }
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
        }

        return updated;
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
                    this.save();
                }

                Database.from(this.current);
                callback();
            });
        }, error);
    }

    save () {
        this.current.sort((a, b) => a.timestamp - b.timestamp);
        this.current.forEach((f) => {
            FileDatabase.set(f);
        });
    }

    import (content) {
        try {
            var json = JSON.parse(content);
            var list = json.filter(file => (this.current.find(cfile => cfile.timestamp == file.timestamp) == null));
            list.forEach(f => UpdateService.update(f));

            Database.add(... list);

            this.current.push(... list);
            this.save();
        } catch (exception) {
            throw exception.lineNumber + ' ' + exception;
        }
    }

    export () {
        download('archive.json', new Blob([
            JSON.stringify(this.current)
        ], {
            type: 'application/json'
        }));
    }

    add (content, timestamp) {
        try {
            var json = JSON.parse(content);
            var raws = [];
            for (var [key, val, url] of filterPlayaJSON(json)) {
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
                        prefix: prefix
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
                        } else if (key.includes('owngroupsave')) {
                            group.save = val.split('/').map(a => Number(a));
                            group.own = true;
                        } else if (key.includes('groupSave')) {
                            group.save = val.split('/').map(a => Number(a));
                        }
                    }

                    if (!file.groups.find(g => g.name === group.name) && group.members) {
                        file.groups.push(group);
                    }
                }

                if (raw.includes('otherplayername') || raw.includes('ownplayername')) {
                    let player = {
                        prefix: prefix
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
                        } else if (key.includes('playerSave')) {
                            player.save = val.split('/').map(a => Number(a));
                            player.own = true;
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

            if (this.current.find(x => x.timestamp == file.timestamp)) {
                return;
            }

            if (file.players.length == 0) {
                throw 'The file must contain at least one player.';
            }

            UpdateService.update(file);
            Database.add(file);

            this.current.push(file);
            this.save();
        } catch (exception) {
            throw exception.lineNumber + ' ' + exception;
        }
    }

    remove (index) {
        FileDatabase.remove(this.current[index].timestamp);
        Database.remove(this.current[index].timestamp);

        this.current.splice(index, 1);
    }

    merge (indexes) {
        var timestamps = indexes.map(i => this.current[i].timestamp);
        var files = this.current.filter(f => timestamps.includes(f.timestamp));
        files.reverse();

        var base = files[0];
        for (var i = 1, file; file = files[i]; i++) {
            for (var p of file.players) {
                if (!base.players.find(bp => bp.prefix == p.prefix && bp.name == p.name)) {
                    base.players.push(p);
                }
            }

            for (var g of file.groups) {
                if (!base.groups.find(bg => bg.prefix == g.prefix && bg.name == g.name)) {
                    base.groups.push(g);
                }
            }
        }

        timestamps.forEach(t => {
            FileDatabase.remove(t);
            this.current.splice(this.current.findIndex(file => file.timestamp == t), 1);
        });

        Database.remove(... timestamps);
        Database.add(base);

        this.current.push(base);
        this.save();
    }

    files () {
        return this.current;
    }
})();

const State = new (class {
    constructor () {
        this.groupID = null;
        this.groupTimestamp = null;
        this.groupReferenceTimestamp = null;
        this.sortBy = null;
        this.sortStyle = null;
    }

    setGroup (groupID, timestamp, referenceTimestamp) {
        this.groupID = groupID;
        this.groupTimestamp = timestamp || Database.Groups[groupID].LatestTimestamp;
        this.groupReferenceTimestamp = referenceTimestamp || Database.Groups[groupID].LatestTimestamp;
    }

    getSort () {
        return this.sortBy;
    }

    setSort (by, style) {
        this.sortBy = by;
        this.sortStyle = style;
    }

    getSortStyle () {
        return this.sortStyle;
    }

    clearSort () {
        this.sortBy = null;
        this.sortStyle = 0;
    }

    unsetGroup () {
        this.groupID = null;
    }

    setReference (referenceTimestamp) {
        this.groupReferenceTimestamp = referenceTimestamp;
    }

    setTimestamp (timestamp) {
        this.groupTimestamp = timestamp;
    }

    toggleSort () {
        this.sortByLevel = !this.sortByLevel;
    }

    reset () {
        this.groupTimestamp = this.getGroup().LatestTimestamp;
        this.groupReferenceTimestamp = this.groupTimestamp;
    }

    getGroupID () {
        return this.groupID;
    }

    getGroupTimestamp () {
        return this.groupTimestamp;
    }

    getGroupReferenceTimestamp () {
        return this.groupReferenceTimestamp;
    }

    getGroup () {
        return Database.Groups[this.groupID];
    }

    getGroupCurrent () {
        return Database.Groups[this.groupID][this.groupTimestamp];
    }

    getGroupReference () {
        return Database.Groups[this.groupID][this.groupReferenceTimestamp];
    }
})();
