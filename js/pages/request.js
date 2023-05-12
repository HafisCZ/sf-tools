const ITEM_SCOPE = {
  SlotType: true,
  SlotIndex: true,
  GemType: true,
  HasSocket: true,
  GemValue: true,
  HasGem: true,
  HasRune: true,
  Class: true,
  PicIndex: true,
  Index: true,
  IsEpic: true,
  Type: true,
  IsFlushed: true,
  HasValue: true,
  Enchantment: true,
  Armor: true,
  DamageMin: true,
  DamageMax: true,
  Upgrades: true,
  UpgradeMultiplier: true,
  AttributeTypes: true,
  Attributes: true,
  HasEnchantment: true,
  Color: true,
  ColorClass: true,
  SellPrice: true,
  DismantlePrice: true,
  Strength: true,
  Dexterity: true,
  Intelligence: true,
  Constitution: true,
  Luck: true,
  RuneType: true,
  RuneValue: true
}

const SCOPES = {
  'default': {
    ID: true,
    Class: true,
    XP: true,
    XPNext: true,
    Level: true,
    Group: {
      Name: true,
      ID: true,
      Instructor: true,
      Treasure: true
    },
    Mount: true,
    Book: true,
    Fortress: true,
    Underworld: true,
    Dungeons: {
      Tower: true
    },
    Prefix: true,
    Runes: true,
    XPTotal: true,
    Toilet: true,
    Witch: true
  },
  'pets': {
    Pets: {
      ShadowFood: true,
      LightFood: true,
      EarthFood: true,
      FireFood: true,
      WaterFood: true,
      ShadowLevels: true,
      LightLevels: true,
      EarthLevels: true,
      FireLevels: true,
      WaterLevels: true,
      ShadowCount: true,
      LightCount: true,
      EarthCount: true,
      FireCount: true,
      WaterCount: true,
      ShadowLevel: true,
      LightLevel: true,
      EarthLevel: true,
      FireLevel: true,
      WaterLevel: true,
      Shadow: true,
      Light: true,
      Earth: true,
      Fire: true,
      Water: true,
      Dungeons: true
    },
  },
  'items': {
    Potions: true,
    Damage: true,
    Damage2: true,
    Armor: true,
    Items: {
      Head: ITEM_SCOPE,
      Body: ITEM_SCOPE,
      Hand: ITEM_SCOPE,
      Feet: ITEM_SCOPE,
      Neck: ITEM_SCOPE,
      Belt: ITEM_SCOPE,
      Ring: ITEM_SCOPE,
      Misc: ITEM_SCOPE,
      Wpn1: ITEM_SCOPE,
      Wpn2: ITEM_SCOPE,
    },
  }
}

Site.ready(null, function (urlParams) {
  const origin = urlParams.get('origin');
  const redirect = urlParams.get('redirect');
  const scope = (urlParams.get('scope') || 'default').split(/\s|\+/).filter((field) => SCOPES[field]);

  // Buttons
  const $importFile = $('#import-file');
  const $importEndpoint = $('#import-endpoint');
  const $close = $('#close');
  const $origin = $('#origin'); 
  const $content = $('#content');

  // Callbacks
  $importFile.change((event) => {
    importFile(event);
  })

  $importEndpoint.click(() => {
    importEndpoint();
  })

  $close.click(() => {
    returnBack();
  })

  // Methods
  function returnBack () {
    window.location.href = '/index.html';
  }

  function importFile (event) {
    Loader.toggle(true, { progress: true });
  
    const files = Array.from(event.target.files);
  
    let filesDone = 0;
    let filesCount = files.length;
  
    let promises = [];
  
    for (const file of files) {
        const promise = file.text().then(async (content) => {
            await DatabaseManager.import(content, file.lastModified).catch((e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            });
  
            Loader.progress(++filesDone / filesCount);
        });
  
        promises.push(promise);
    }
  
    Promise.all(promises).then(() => {
      Loader.close();
      render();
    });
  }
  
  function importEndpoint () {
    DialogController.open(EndpointDialog, true).then((success) => {
      if (success) {
        render();
      }
    });
  }

  function render () {
    $content.empty();
  
    DatabaseManager.load(SELF_PROFILE_WITH_GROUP).then(() => {
      const players = DatabaseManager.getLatestPlayers(true);
  
      renderCharacterList(players);
    })
  }

  function renderCharacterList (players) {
    for (const player of _sortDesc(players, (player) => player.Timestamp)) {
      const $element = $(`
        <div data-player class="!border-radius-1 border-gray p-2 background-dark:hover cursor-pointer flex gap-4 items-center">
          <img class="ui image" style="width: 3em; height: 3em;" src="${_classImageUrl(player.Class)}">
          <div>
            <div class="text-gray">${player.Prefix}</div>
            <div>${player.Name}</div>
          </div>
          <div style="margin-left: auto; mr-1">
            <i class="ui big sign in alternate disabled icon text-gray"></i>
          </div>
        </div>
      `);
  
      $element.click(() => {
        redirectToOrigin(player);
      })
  
      $element.appendTo($content);
    }
  }

  function copyWithWhitelist (source, target, whitelist, limit) {
    for (const [key, list] of Object.entries(whitelist)) { 
      if (!source.hasOwnProperty(key) || (limit && !limit.includes(key))) {
        // If it doesnt have a key or is outside of limit, ignore
        continue;
      } else if (list === true) {
        target[key] = source[key];
      } else if (Array.isArray(source[key])) {
        const array = [];

        for (const item of source[key]) {
          const copy = Object.create(null);
          copyWithWhitelist(item, copy, list);

          array.push(copy);
        }

        target[key] = array;
      } else if (source[key] && typeof source[key] === 'object') {
        const object = Object.create(null);
        copyWithWhitelist(source[key], object, list);

        target[key] = object;
      }
    }
  }

  function redirectToOrigin (player) {
    const data = Object.create(null);
    copyWithWhitelist(player, data, scope.reduce((memo, name) => Object.assign(memo, SCOPES[name]), Object.create(null)));

    const form = document.createElement("form");
    form.method = 'POST';
    form.action = redirect;   
    
    const input = document.createElement("input"); 
    input.value = JSON.stringify(data);
    input.name = 'data';
    
    form.appendChild(input);  

    document.body.appendChild(form);

    form.submit();
  }

  // Execute
  if (origin && redirect && scope.length > 0) {
    $origin.text(origin);

    render();
  } else {
    returnBack();
  }
})
