const Preferences = new (class {
    constructor (window) {
        this.storage = window.localStorage || window.sessionStorage || { };
    }

    set (key, object, compress = false) {
        if (compress) {
            this.storage[key] = LZString.compressToUTF16(JSON.stringify(object));
        } else {
            this.storage[key] = JSON.stringify(object);
        }
    }

    get (key, def, compress = false) {
        if (compress) {
            return this.storage[key] ? JSON.parse(LZString.decompressFromUTF16(this.storage[key])) : def;
        } else {
            return this.storage[key] ? JSON.parse(this.storage[key]) : def;
        }
    }

    remove (key) {
        delete this.storage[key];
    }
})(window);

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

const Database = new (class {
    from (array) {
        this.Players = {};
        this.Groups = {};

        array.sort((a, b) => a.timestamp - b.timestamp);

        for (var file of array) {
            for (const groupdata of file.groups) {
                let group = new Group(groupdata);

                if (!this.Groups[group.Identifier]) {
                    this.Groups[group.Identifier] = {
                        List: []
                    };
                }

                this.Groups[group.Identifier][file.timestamp] = group;
                this.Groups[group.Identifier].List.push({
                    timestamp: file.timestamp,
                    group: group
                });
            }

            for (const playerdata of file.players) {
                let player = new Player(playerdata);

                let gid = player.Group ? Object.keys(this.Groups).find(g => this.Groups[g][file.timestamp] && this.Groups[g][file.timestamp].Name == player.Group.Name) : null;
                if (gid) {
                    let group = this.Groups[gid][file.timestamp];
                    let index = group.MemberIDs.findIndex(p => p === player.Identifier);

                    player.Group.Role = group.Roles[index];
                    player.Group.Treasure = group.Treasures[index];
                    player.Group.Instructor = group.Instructors[index];
                    player.Group.Pet = group.Pets[index];
                    player.Group.Own = group.Own;

                    if (!player.Fortress.Knights && group.Knights) {
                        player.Fortress.Knights = group.Knights[index];
                    }
                }

                if (!this.Players[player.Identifier]) {
                    this.Players[player.Identifier] = {
                        List: []
                    };
                }

                this.Players[player.Identifier][file.timestamp] = player;
                this.Players[player.Identifier].List.push({
                    timestamp: file.timestamp,
                    player: player
                });
            }
        }

        for (const [pid, instances] of Object.entries(this.Players)) {
            instances.LatestTimestamp = Math.max(... Object.keys(instances).filter(value => !isNaN(value)));
            instances.Latest = instances[instances.LatestTimestamp];
        }

        for (const [gid, instances] of Object.entries(this.Groups)) {
            instances.LatestTimestamp = Math.max(... Object.keys(instances).filter(value => !isNaN(value)));
            instances.Latest = instances[instances.LatestTimestamp];
        }

        this.Latest = Math.max(... array.map(instance => instance.timestamp));
    }
})();

const Storage = new (class {
    constructor () {
        this.load();
    }

    load () {
        this.current = Preferences.get('data', [], true);
        Database.from(this.current);
    }

    save () {
        Preferences.set('data', this.current, true);
    }

    import (content) {
        var files = Object.values(JSON.parse(content));

        try {
            var copy = [... this.current, ... files];
            Database.from(copy);
        } catch (e) {
            Database.from(this.current);
            throw e;
        }

        this.current.push(... files);
        Database.from(this.current);
        this.save();
    }

    export () {
        download('archive.json', new Blob([
            JSON.stringify(this.current)
        ], {
            type: 'application/json'
        }));
    }

    add (content, timestamp) {
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
            timestamp: timestamp
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

        try {
            var copy = [... this.current, file];
            Database.from(copy);
        } catch (e) {
            Database.from(this.current);
            throw e;
        }

        this.current.push(file);
        Database.from(this.current);
        this.save();
    }

    remove (index) {
        this.current.splice(index, 1);
        Database.from(this.current);
        this.save();
    }

    files () {
        return this.current;
    }
})();

const State = new (class {
    constructor () {
        this.sortByLevel = false;
        this.groupID = null;
        this.groupReferenceTimestamp = null;
    }

    setGroup (groupID, referenceTimestamp) {
        this.groupID = groupID;
        this.groupReferenceTimestamp = referenceTimestamp || Database.Groups[groupID].LatestTimestamp;
    }

    setReference (referenceTimestamp) {
        this.groupReferenceTimestamp = referenceTimestamp;
    }

    reset () {
        this.sortByLevel = false;
        this.groupID = null;
        this.groupReferenceTimestamp = null;
    }

    setSort (sortByLevel) {
        this.sortByLevel = sortByLevel;
    }

    isSorted () {
        return this.sortByLevel;
    }

    toggleSort () {
        this.sortByLevel = !this.sortByLevel;
    }

    getGroup () {
        return Database.Groups[this.groupID];
    }

    getGroupCurrent () {
        return Database.Groups[this.groupID].Latest;
    }

    getGroupReference () {
        return Database.Groups[this.groupID][this.groupReferenceTimestamp];
    }

    getGroupTimestamp () {
        return Database.Groups[this.groupID].LatestTimestamp;
    }

    getGroupReferenceTimestamp () {
        return this.groupReferenceTimestamp;
    }
})();
