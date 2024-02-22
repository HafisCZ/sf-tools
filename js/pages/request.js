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

const COMPANION_SCOPE = {
  Class: true,
  Strength: true,
  Dexterity: true,
  Intelligence: true,
  Constitution: true,
  Luck: true,
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
  }
}

const SCOPES = {
  'default': {
    ID: true,
    Name: true,
    Class: true,
    XP: true,
    XPNext: true,
    Level: true,
    Group: {
      Name: true,
      ID: true,
      Instructor: true,
      Treasure: true,
      Group: {
        Raid: true,
        Hydra: true,
        TotalInstructor: true,
        TotalTreasure: true
      }
    },
    Mount: true,
    Book: true,
    Fortress: true,
    Underworld: true,
    Dungeons: {
      Tower: true,
      Raid: true,
      Normal: true,
      Shadow: true,
      Twister: true,
      Group: true,
      Player: true,
      Youtube: true
    },
    Prefix: true,
    Runes: true,
    XPTotal: true,
    Toilet: true,
    Witch: true,
    CalendarDay: true,
    CalendarType: true
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
    }
  },
  'items': {
    Strength: true,
    Dexterity: true,
    Intelligence: true,
    Constitution: true,
    Luck: true,
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
    Inventory: {
      Dummy: {
        Head: ITEM_SCOPE,
        Body: ITEM_SCOPE,
        Hand: ITEM_SCOPE,
        Feet: ITEM_SCOPE,
        Neck: ITEM_SCOPE,
        Belt: ITEM_SCOPE,
        Ring: ITEM_SCOPE,
        Misc: ITEM_SCOPE,
        Wpn1: ITEM_SCOPE,
        Wpn2: ITEM_SCOPE
      }
    }
  },
  'companions': {
    Companions: {
      Bert: COMPANION_SCOPE,
      Kunigunde: COMPANION_SCOPE,
      Mark: COMPANION_SCOPE
    }
  },
  'idle': {
    Idle: {
      Runes: true,
      Upgrades: {
        Money: true,
        Speed: true
      }
    }
  }
}

Site.ready(null, function (urlParams) {
  // Remove scroll if inside iframe
  if (window.parent && window.parent !== window) {
    window.document.body.classList.add('within-iframe');
  }

  const redirect = parseURL(urlParams.get('redirect'));

  const scope = (urlParams.get('scope') || 'default').split(/\s|\+/).filter((field) => SCOPES[field]);
  const origin = urlParams.get('origin');
  const state = urlParams.get('state');

  // Modals
  const $containerNormal = $('#container-normal');
  const $containerError = $('#container-error');

  // Buttons
  const $importFile = $('#import-file');
  const $importEndpoint = $('#import-endpoint');
  const $close = $('[data-op="close"]');
  const $origin = $('#origin'); 
  const $content = $('#content');

  // Modes
  const canRedirect = urlParams.has('redirect') && redirect;
  const canMessage = !urlParams.has('redirect') && origin && window.parent && window.parent !== window;

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
    if (window.parent === window || !window.parent) {
      // Return to index page if not inside IFRAME
      window.location.href = '/index.html';
    } else {
      window.parent.postMessage({ event: 'sftools-close' }, '*');
    }
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
    Dialog.open(EndpointDialog, true).then((success) => {
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

  async function checkFullAccess () {
    if (window.parent === window || SiteOptions.has_storage_access) {
      return true;
    } else if (typeof window.document.hasStorageAccess === 'function' && typeof window.document.requestStorageAccess === 'function') {
      return await window.document.hasStorageAccess() || false;
    } else {
      return true;
    }
  }

  async function requestFullAccess () {
    const hasAccess = await window.document.hasStorageAccess()

    if (hasAccess) {
      SiteOptions.has_storage_access = true;

      return true;
    } else if (window.document.requestStorageAccess) {
      SiteOptions.has_storage_access = await window.document.requestStorageAccess() || false;

      return SiteOptions.has_storage_access;
    } else {
      return SiteOptions.has_storage_access;
    }
  }

  async function renderCharacterList (players) {
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
        sendData(player);
      })
  
      $element.appendTo($content);
    }

    const hasAccess = await checkFullAccess();

    if (hasAccess === false) {
      const $element = $(`
        <div class="!border-radius-1 border-gray p-2 background-dark:hover cursor-pointer flex gap-4 items-center">
          <div class="flex justify-content-center items-center" style="width: 42px; height: 42px; min-width: 42px;">
            <i class="ui large user lock icon" style="margin: 0;"></i>
          </div>
          <div>
            <div>${intl('request.access')}</div>
            <div class="text-gray">${intl('request.access_hint')}</div>
          </div>
        </div>
      `);

      $element.click(async () => {
        await requestFullAccess();

        render();
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

  function parseURL (url) {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }

  function addFormInput (form, name, value) {
    const input = document.createElement("input"); 
    input.value = value;
    input.name = name;

    form.appendChild(input);  
  }

  function sendDataViaForm (data) {
    const form = document.createElement("form");
    form.method = 'POST';
    form.acceptCharset = 'UTF-8';
    form.enctype = 'multipart/form-data';
    form.action = redirect.href;

    form.style.display = 'none';

    addFormInput(form, 'data', JSON.stringify(data));
    if (state) {
      addFormInput(form, 'state', state);
    }

    document.body.appendChild(form);

    form.submit();
  }

  function sendDataViaMessage (data) {
    const package = {
      event: 'sftools-data',
      data
    }

    if (state) {
      package.state = state;
    }

    window.parent.postMessage(package, '*');
  }

  function sendData (player) {
    const data = Object.create(null);
    copyWithWhitelist(player, data, scope.reduce((memo, name) => Object.assign(memo, SCOPES[name]), Object.create(null)));

    if (canRedirect) {
      sendDataViaForm(data);
    } else if (canMessage) {
      sendDataViaMessage(data);
    }
  }

  // Execute
  if ((canRedirect || canMessage) && scope.length > 0) {
    $containerNormal.show();

    render();

    $origin.text(origin || redirect.hostname);
  } else {
    $containerError.show();
  }
})
