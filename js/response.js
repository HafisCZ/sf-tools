const MessageName = {
    SUCCESS: "success",
	ERROR: "error",
	TIMESTAMP: "timestamp",
	SESSION_ID: "sessionid",
	AGE: "age",
	GEN: "gen",
	MAX_UPGRADE_LEVEL: "maxupgradelevel",
	ACHIEVEMENT: "achievement",
	NEW_ACHIEVEMENT: "newachievement",
	ARENA_RANK: "arenarank",
	CHAT_HISTORY: "chathistory",
	CHAT_TIME: "chattime",
	CHAT_WHISPER: "chatwhisper",
	CID: "cid",
	CLIENT_GENERATION: "clientgeneration",
	COINS_SPECIAL: "coinsspecial",
    COMBAT_LOG_LIST: "combatloglist",
	DRAGON_GOLD_BONUS: "dragongoldbonus",
	DUNGEON_FACES: "dungeonfaces",
	DUNGEON_OPENED: "dungeonopened",
	FIGHT: "fight",
	FIGHT_ADDITIONAL_PLAYERS: "fightadditionalplayers",
	FIGHT_GROUPS: "fightgroups",
	FIGHT_HEADER: "fightheader",
	WINNER_ID: "winnerid",
	FIGHT_RESULT: "fightresult",
	FORTRESS_CHEST: "fortresschest",
	FORTRESS_GROUP_PRICE: "fortressgroupprice",
	FORTRESS_PRICE: "fortressprice",
	FORTRESS_PRICE_REROLL: "fortresspricereroll",
	FORTRESS_RANK: "fortressrank",
	UNDERWORLD_RANK: "underworldrank",
	FORTRESS_WALL_LEVEL: "fortresswalllevel",
	FRIEND_LIST: "friendlist",
	GAMBLE_COIN_VALUE: "gamblecoinvalue",
	GAMBLE_GOLD_VALUE: "gamblegoldvalue",
	GEMSTONE_BACKPACK_SLOT: "gemstonebackpackslot",
	GUILD_RANK: "guildrank",
	GROUP_SKILL_PRICE: "groupskillprice",
	IDLE: "idle",
	INBOX_CAPACITY: "inboxcapacity",
	LAST_GROUP_FIGHT_EXP: "lastgroupfightexp",
	LOGIN_COUNT: "login count",
	LOGIN_COUNT_B: "logincount",
	MAX_RANK: "maxrank",
	MESSAGE_LIST: "messagelist",
	MESSAGE_TEXT: "messagetext",
	MOUNT_EXPIRED: "mountexpired",
	NO_TV: "notv",
	OKTOBERFEST: "oktoberfest",
	DAILY_REWARD: "dailyreward",
	OTHER_DESCRIPTION: "otherdescription",
	OTHER_GROUP: "othergroup",
	OTHER_GROUP_ATTACK: "othergroupattack",
	OTHER_GROUP_DEFENSE: "othergroupdefense",
	OTHER_GROUP_DESCRIPTION: "othergroupdescription",
	OTHER_GROUP_FIGHT_COST: "othergroupfightcost",
	OTHER_GROUP_MEMBER: "othergroupmember",
	OTHER_GROUP_NAME: "othergroupname",
	OTHER_GROUP_POTION: "othergrouppotion",
	OTHER_GROUP_KNIGHTS: "othergroupknights",
	OTHER_GROUP_RANK: "othergrouprank",
	OTHER_PLAYER: "otherplayer",
	OTHER_PLAYER_FORTRESS_RANK: "otherplayerfortressrank",
	OTHER_PLAYER_FRIEND_STATUS: "otherplayerfriendstatus",
	OTHER_PLAYER_GROUP_NAME: "otherplayergroupname",
	OTHER_PLAYER_NAME: "otherplayername",
	OTHER_PLAYER_PET_BONUS: "otherplayerpetbonus",
	OTHER_PLAYER_UNIT_LEVEL: "otherplayerunitlevel",
	OWN_DESCRIPTION: "owndescription",
	OWN_GROUP_ATTACK: "owngroupattack",
	OWN_GROUP_DEFENSE: "owngroupdefense",
	OWN_GROUP_DESCRIPTION: "owngroupdescription",
	OWN_GROUP_KNIGHTS: "owngroupknights",
	OWN_GROUP_MEMBER: "owngroupmember",
	OWN_GROUP_NAME: "owngroupname",
	OWN_GROUP_POTION: "owngrouppotion",
	OWN_GROUP_RANK: "owngrouprank",
	OWN_GROUP_SAVE: "owngroupsave",
	OWN_PETS: "ownpets",
	OWN_PETS_STATS: "ownpetsstats",
	OWN_PLAYER_NAME: "ownplayername",
	OWN_PLAYER_SAVE: "ownplayersave",
	OWN_TOWER: "owntower",
	OWN_TOWER_LEVEL: "owntowerlevel",
	PAYMENT_JWT: "paymentjwt",
	PETS_DEFENSE_TYPE: "petsdefensetype",
	PETS_HATCH_INDEX: "petshatchindex",
	PETS_RANK: "petsrank",
	PLAYER_ID: "playerid",
	RANK_LIST_FORTRESS: "ranklistfortress",
	RANK_LIST_GROUP: "ranklistgroup",
	RANK_LIST_GROUP_GLOBAL: "ranklistgroupglobal",
	RANK_LIST_PETS: "ranklistpets",
	RANK_LIST_PLAYER: "ranklistplayer",
	RANK_LIST_PLAYER_GLOBAL: "ranklistplayerglobal",
	RANK_LIST_PLAYER_POSITION: "ranklistplayerposition",
	RANK_LIST_UNDERWORLD: "ranklistunderworld",
	SCRAPBOOK: "scrapbook",
	SERVER_VERSION: "serverversion",
	CRYPTO_ID: "cryptoid",
	CRYPTO_KEY: "cryptokey",
	SHADOW_FACES: "shadowfaces",
	SHADOW_OPENED: "shadowopened",
	SINGLE_PORTAL_ENEMY_LEVEL: "singleportalenemylevel",
	SKIP_ALLOW: "skipallow",
	SOLDIER_ADVICE: "soldieradvice",
	STARTER_PACKAGE: "starterpackage",
	STONE_PER_HOUR_NEXT_LEVEL: "stoneperhournextlevel",
	TAVERN_SPECIAL: "tavernspecial",
	TOILETT_FULL: "toilettfull",
	TOILETT_SPAWN_SLOT: "toilettspawnslot",
	TRACKING: "tracking",
	UNIT_LEVEL: "unitlevel",
	UNIT_PRICE: "unitprice",
	UPGRADE_PRICE: "upgradeprice",
	WAGES_PER_HOUR: "wagesperhour",
	WHEEL_RESULT: "wheelresult",
	WITCH: "witch",
	WOOD_PER_HOUR_NEXT_LEVEL: "woodperhournextlevel",
	WORK_REWARD: "workreward",
	SOULS_PER_HOUR_NEXT_LEVEL: "soulsperhournextlevel",
	GOLD_PER_HOUR_NEXT_LEVEL: "goldperhournextlevel",
	UNDERWORLD_PRICE: "underworldprice",
	UNDERWORLD_UPGRADE_PRICE: "underworldupgradeprice",
	UNDERWORLD_MAX_SOULS: "underworldmaxsouls"
};

class Archive {
    static getMessages (json) {
        let content = new Array();
        for (let object of Archive.deepSearch(json)) {
            if (object[0] == 'text' && Archive.isMessage(object[1])) {
                content.push(new Message(object[1]));
            }
        }

        return content;
    }

    static isMessage (test) {
        for (const messageName of Object.values(MessageName)) {
            if (test.startsWith(messageName)) {
                return true;
            }
        }
    }

    static * deepSearch (object, trace = []) {
        for (var index in object) {
            const ptrace = trace.concat(index);
            yield [index, object[index]];

            if (object[index] != null && typeof(object[index]) == 'object') {
                yield* Iterator.deep(object[index], ptrace);
            }
        }
    }
}

class Message {
    constructor (response) {
        this.content = new Object();
        response.split('&').forEach(message => {
            var [messageName, messageBody] = message.split(':', 2);
            this.content[messageName.split(/[.(]/, 1)[0].toLowerCase()] = messageBody.split(/[,\/]/).filter(value => value.length);
        });
    }

    contains (name) {
        return this.content[name] ? true : false;
    }

    asArray (name) {
        return this.content[name];
    }

    asComplexDataType (name) {
        return ComplexDataType.fromArray(this.content[name]);
    }
}

class ComplexDataType {
    constructor (bytes) {
        this.bytes = bytes;
        this.ptr = 0;
    }

    byte () {
        return this.bytes[this.ptr++];
    }

    short () {
        return this.bytes[this.ptr++] + (this.bytes[this.ptr++] << 8);
    }

    long () {
        return this.bytes[this.ptr++] + (this.bytes[this.ptr++] << 8) + (this.bytes[this.ptr++] << 16) + (this.bytes[this.ptr++] << 24);
    }

    assert (size) {
        if (this.bytes.length != size) {
            throw 'COMPLEXDATATYPE SIZE NOT EQUAL';
        }
    }

    static fromArray (arr) {
        return new ComplexDataType(arr.reduce((bytes, word) => bytes.concat([word % 0x100, (word >> 8) % 0x100, (word >> 16) % 0x100, (word >> 24) % 0x100]), []));
    }

    static fromString (str) {
        return ComplexDataType.fromArray(padStr.split('/'));
    }
}
