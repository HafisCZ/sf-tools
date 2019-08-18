function* traverse(o, path = []) {
	for (var i in o) {
		const itempath = path.concat(i);
		yield [i, o[i]];
		
		if (o[i] !== null && typeof(o[i]) == 'object') {
			yield* traverse(o[i], itempath);
		}
	}
}

function dig(val) {
	return val < 10 ? '0' + val : val;
}

function* traverseResponse(response) {
	var o = response.split('&');
	for (i in o) {
		var [key, value] = o[i].split(':', 2);
		
		yield [key, value];
	}
}

var sftools = {
	
	// loaded data
	data: [],
	
	// import new har file
	import: function(file) {
		if (file) {
			// Create new reader and read the file
			var reader = new FileReader();
			
			reader.readAsText(file, 'UTF-8');
			reader.onload = (event) => {
				// Parse file contents
				var raw = event.target.result;
				var json = JSON.parse(raw);
				
				// Player & group list
				var players = [];
				var groups = [];
				
				// Iterate over all entries that match player or guild
				for (var [key, value] of traverse(json)) {
					if (key === 'text' && (value.includes('otherplayername') || value.includes('ownplayername'))) {
						var player = sftools.buildPlayer(value);
						
						if (!players.find((p) => { return p.Name === player.Name; })) {
							players.push(player);
						}
						
						if (value.includes('owngroup')) {
							var group = sftools.buildGroup(value);
						
							if (!groups.find((g) => { return g.Name === group.Name; })) {
								groups.push(group);
							}
						}
					} else if (key === 'text' && value.includes('othergroup')) {
						var group = sftools.buildGroup(value);
						
						if (!groups.find((g) => { return g.Name === group.Name; })) {
							groups.push(group);
						}
					}
				}
				
				var d = new Date(file.lastModified);
				var date = dig(d.getDate()) + '.' + dig(d.getMonth()) + '.' + d.getFullYear() + ' ' + dig(d.getHours()) + ':' + dig(d.getMinutes());
				
				sftools.data.push({
					Players: players,
					Groups: groups,
					Label: date
				});

				sftools.sync();
				window.dispatchEvent(new Event('sftools.updatelist'));
			};
		}
	},
	
	buildPlayer: function(data) {
		var player = {};
		
		for (var [k, v] of traverseResponse(data)) {
			if (k.includes('groupname')) player.Group = v;
			else if (k.includes('name')) player.Name = v;
			else if (k.includes('unitlevel')) {
				var values = v.split('/');
				player.FortressWall = Number(values[0]);
				player.FortressWarriors = Number(values[1]);
				player.FortressArchers = Number(values[2]);
				player.FortressMages = Number(values[3]);
			}
			else if (k.includes('achievement')) {
				player.Achievements = v.split('/').slice(0, 70).map((e) => Number(e)).reduce((a, b) => a + b, 0);
			}
			else if (k.includes('fortressrank')) {
				player.RankFortress = Number(v);
			}
			else if (k.includes('otherdescription') || k.includes('owndescription')) {
				player.Description = v;
			}
			else if (k.includes('playerlookat')) {
				var vals = v.split('/').map((value) => Number(value));
				
				player.XP = vals[3];
				player.XPNext = vals[4];
				player.Book = vals[163] - 10000;
				player.Level = vals[173];
				
				player.HonorPlayer = vals[5];
				player.RankPlayer= vals[6];
				
				player.Race = vals[18] % 16;
				player.Sex = vals[19] % 16;
				player.Class = vals[20] % 16;
				
				player.Strength = vals[21] + vals[26];
				player.Dexterity = vals[22] + vals[27];
				player.Intelligence = vals[23] + vals[28];
				player.Constitution = vals[24] + vals[29];
				player.Luck = vals[25] + vals[30];
				player.Armor = vals[168];
				
				player.Head = sftools.buildItem(vals.slice(39, 51));
				player.Body = sftools.buildItem(vals.slice(51, 63));
				player.Hands = sftools.buildItem(vals.slice(63, 75));
				player.Feet = sftools.buildItem(vals.slice(75, 87));
				player.Neck = sftools.buildItem(vals.slice(87, 99));
				player.Belt = sftools.buildItem(vals.slice(99, 111));
				player.Ring = sftools.buildItem(vals.slice(111, 123));
				player.Misc = sftools.buildItem(vals.slice(123, 135));
				
				player.Weapon = sftools.buildItem(vals.slice(135, 147));
				player.WeaponSecondary = sftools.buildItem(vals.slice(147, 159));
				
				player.Mount = vals[159] % 16;
				
				player.Potion1 = vals[194] == 16 ? 6 : (vals[194] == 0 ? 0 : 1 + (vals[194] - 1) % 5);
				player.Potion2 = vals[195] == 16 ? 6 : (vals[195] == 0 ? 0 : 1 + (vals[195] - 1) % 5);
				player.Potion3 = vals[196] == 16 ? 6 : (vals[196] == 0 ? 0 : 1 + (vals[196] - 1) % 5);
				
				player.PotionLen1 = vals[200];
				player.PotionLen2 = vals[201];
				player.PotionLen3 = vals[202];
				
				player.HonorFortress = vals[248];
				player.FortressUpgrades = vals[247];
				player.FortressKnights = vals[258];
				
				player.Face = vals.slice(8, 18);
				player.Fortress = vals.slice(208, 220);
			}
			else if (k.includes('playerSave')) {
				var vals = v.split('/').map((value) => Number(value));
				
				player.XP = vals[8];
				player.XPNext = vals[9];
				player.Book = vals[438] - 10000;
				player.Level = vals[465];
				
				player.HonorPlayer = vals[10];
				player.RankPlayer= vals[11];
				
				player.Race = vals[27] % 16;
				player.Sex = vals[28] % 16;
				player.Class = vals[29] % 16;
				
				player.Strength = vals[30] + vals[35];
				player.Dexterity = vals[31] + vals[36];
				player.Intelligence = vals[32] + vals[37];
				player.Constitution = vals[33] + vals[38];
				player.Luck = vals[34] + vals[39];
				player.Armor = vals[447];
				
				player.Head = sftools.buildItem(vals.slice(48, 60));
				player.Body = sftools.buildItem(vals.slice(60, 72));
				player.Hands = sftools.buildItem(vals.slice(72, 84));
				player.Feet = sftools.buildItem(vals.slice(84, 96));
				player.Neck = sftools.buildItem(vals.slice(96, 108));
				player.Belt = sftools.buildItem(vals.slice(108, 120));
				player.Ring = sftools.buildItem(vals.slice(120, 132));
				player.Misc = sftools.buildItem(vals.slice(132, 144));
				
				player.Weapon = sftools.buildItem(vals.slice(144, 156));
				player.WeaponSecondary = sftools.buildItem(vals.slice(156, 168));
				
				player.Mount = vals[286] % 16;
				
				player.Potion1 = vals[493] == 16 ? 6 : (vals[493] == 0 ? 0 : 1 + (vals[493] - 1) % 5);
				player.Potion2 = vals[494] == 16 ? 6 : (vals[494] == 0 ? 0 : 1 + (vals[494] - 1) % 5);
				player.Potion3 = vals[495] == 16 ? 6 : (vals[495] == 0 ? 0 : 1 + (vals[495] - 1) % 5);
				
				player.PotionLen1 = vals[499];
				player.PotionLen2 = vals[500];
				player.PotionLen3 = vals[501];
				
				player.RankFortress = vals[583];
				player.HonorFortress = vals[582];
				player.FortressUpgrades = vals[581];
				player.FortressKnights = vals[598];
				
				player.Face = vals.slice(17, 27);
				player.Fortress = vals.slice(524, 536);
			}
		}
		
		// todo: guild add info
		
		return player;
	},
	
	remove: function(index) {
		sftools.data.splice(index, 1);
		
		sftools.sync();
		window.dispatchEvent(new Event('sftools.updatelist'));
	},
	
	sync: function() {
		window.localStorage.setItem('sftools.data', JSON.stringify(sftools.data));
	},
	
	init: function() {
		var data = window.localStorage.getItem('sftools.data');
		
		if (data) {
			sftools.data = JSON.parse(data);
			window.dispatchEvent(new Event('sftools.updatelist'));	
		}
	},
	
	buildGroup: function(data) {
		var group = {};
		
		for (var [k, v] of traverseResponse(data)) {
			if (k.includes('name')) group.Name = v;
		}
		
		return group;
	},
	
	buildItem: function (data) {
		var item = {};
	
		item.SlotID = data[0];
		item.ItemID = data[1];
		item.Rating1 = data[2];
		item.Rating2 = data[3];
		item.Attribute1Type = data[4];
		item.Attribute2Type = data[5];
		item.Attribute3Type = data[6];
		item.Attribute1 = data[7];
		
		if (item.Attribute1Type === 6) {
			item.Attribute3 = item.Attribute2 = item.Attribute1;
		} else {
			item.Attribute2 = data[8];
			item.Attribute3 = data[9];
		}
		
		item.Value = data[10] / 100;
		item.Mods = data[11];
		
		return item;
	}
	
};