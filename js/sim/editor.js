class Field {
    constructor (querryString, defaultValue, validator = undefined) {
        this.$object = $(querryString);
        this.defaultValue = defaultValue.toString();
        this.validator = validator;
        this.isDropdown = this.$object.hasClass('dropdown');
        this.$object.on('change input', () => {
            if (this.triggerAlways || this.valid()) {
                this.triggerListener();
            }
        });
    }

    valid () {
        var isValid = this.validator ? this.validator(this.get()) : true;
        if (isValid) {
            this.$object.parent('.field').removeClass('error');
            return true;
        } else {
            this.$object.parent('.field').addClass('error');
            return false;
        }
    }

    get () {
        var value = this.isDropdown ? this.$object.dropdown('get value') : this.$object.val();
        if (isNaN(value)) {
            if (value == 'true') {
                return true;
            } else if (value == 'false') {
                return false;
            } else {
                return value;
            }
        } else {
            return Number(value);
        }
    }

    path () {
        return this.$object.attr('data-path');
    }

    set (value) {
        if (value == undefined) {
            value = this.defaultValue;
        }

        if (this.isDropdown) {
            this.$object.dropdown('set selected', value.toString());
        } else {
            this.$object.val(value);
        }
    }

    editable (val) {
        if (val) {
            this.$object.removeAttr('disabled');
        } else {
            this.$object.attr('disabled', 'disabled');
        }
    }

    toggle (val) {
        if (val) {
            this.$object.parent('.field').removeClass('disabled');
        } else {
            this.$object.parent('.field').addClass('disabled');
        }
    }

    show (val) {
        if (val) {
            this.$object.parent('.field').show();
        } else {
            this.$object.parent('.field').hide();
        }
    }

    clear () {
        if (this.isDropdown) {
            this.$object.dropdown('set selected', this.defaultValue);
        } else {
            this.$object.val(this.defaultValue);
        }
    }

    setListener (listener) {
        this.changeListener = listener;

        if (this.isDropdown) {
            let existingListener = this.$object.dropdown('setting', 'onChange');
            this.$object.dropdown('setting', 'onChange', (e, t, n) => {
                if (existingListener) {
                    existingListener(e, t, n);
                }
                this.triggerListener();
            });
        }
    }

    triggerListener () {
        if (this.changeListener) {
            this.changeListener();
        }
    }

    static isNumber (val) {
        return !isNaN(val) && Number.isInteger(val) && val >= 0;
    }

    static isWeaponDamage (val) {
        return Field.isNumber(val) && val <= 6264;
    }

    static isPlayerLevel (val) {
        return Field.isNonZero(val) && val <= 700;
    }

    static isGladiator (val) {
        return Field.isNumber(val) && val <= 15;
    }

    static isDamageRune (val) {
        return Field.isNumber(val) && val <= 60;
    }

    static isResistanceRune (val) {
        return Field.isNumber(val) && val <= 75;
    }

    static isBlockChance (val) {
        return Field.isNumber(val) && val <= 25;
    }

    static isPetCount (val) {
        return Field.isNumber(val) && val <= 20;
    }

    static isPetLevel (val) {
        return Field.isNonZero(val) && val <= 200;
    }

    static isDungeon (val) {
        return Field.isNumber(val) && val <= 50;
    }

    static isHealthRune (val) {
        return Field.isNumber(val) && val <= 15;
    }

    static isHydraPlayerCount (val) {
        return Field.isNumber(val) && val >= 10 && val <= 50;
    }

    static isHydraPetLevel (val) {
        return Field.isNonZero(val) && val <= 600;
    }

    static isNonZero (val) {
        return !isNaN(val) && val > 0;
    }
}

class Editor {
    constructor ($parent, callback) {
        this._html($parent);
        this._bind();

        this._changeCallback = callback;
        this.clear();
    }

    fill (object) {
        if (object) {
            for (var [key, field] of Object.entries(this.fields)) {
                field.set(getObjectAt(object, field.path()));
            }
        } else {
            for (var [key, field] of Object.entries(this.fields)) {
                field.clear();
            }
        }
    }

    clear () {
        for (var [key, field] of Object.entries(this.fields)) {
            field.clear();
        }
    }

    read () {
        var object = new SFPlayer();
        for (var [key, field] of Object.entries(this.fields)) {
            setObjectAt(object, field.path(), field.get());
        }

        return object;
    }

    valid () {
        var ass = this.fields['class'].get() != 4;
        for (var [key, field] of Object.entries(this.fields)) {
            if (ass && ['weapon2_min', 'weapon2_max', 'weapon2_value'].includes(key)) {
                continue;
            }

            if (!field.valid()) {
                return false;
            }
        }

        return true;
    }

    empty (defClass = undefined) {
        var object = new SFPlayer();
        for (var [key, field] of Object.entries(this.fields)) {
            setObjectAt(object, field.path(), field.defaultValue);
        }

        if (typeof defClass !== 'undefined') {
            object.Class = defClass;
        }

        return object;
    }

    pauseListener () {
        this._ignoreChanges = true;
    }

    resumeListener () {
        this._ignoreChanges = false;
    }

    _changeListener () {
        if (this.valid() && this._changeCallback && !this._ignoreChanges) {
            this._changeCallback();
        }
    }

    _bind () {
        this.fields = {
            name: new Field('[data-path="Name"]', ''),
            class: new Field('[data-path="Class"]', '1'),
            mask: new Field('[data-path="Mask"]', '0'),
            instrument: new Field('[data-path="Instrument"]', '0'),
            level: new Field('[data-path="Level"]', '', Field.isPlayerLevel),
            armor: new Field('[data-path="Armor"]', '', Field.isNumber),

            resistance_fire: new Field('[data-path="Runes.ResistanceFire"]', '', Field.isResistanceRune),
            resistance_cold: new Field('[data-path="Runes.ResistanceCold"]', '', Field.isResistanceRune),
            resistance_lightning: new Field('[data-path="Runes.ResistanceLightning"]', '', Field.isResistanceRune),

            portal_hp: new Field('[data-path="Dungeons.Player"]', '', Field.isDungeon),
            portal_damage: new Field('[data-path="Dungeons.Group"]', '', Field.isDungeon),

            runes_health: new Field('[data-path="Runes.Health"]', '', Field.isHealthRune),
            gladiator: new Field('[data-path="Fortress.Gladiator"]', '', Field.isGladiator),
            potion_life: new Field('[data-path="Potions.Life"]', '0'),
            enchantment: new Field('[data-path="Items.Hand.HasEnchantment"]', 'false'),
            shield: new Field('[data-path="BlockChance"]', '25'),

            str: new Field('[data-path="Strength.Total"]', '', Field.isNumber),
            dex: new Field('[data-path="Dexterity.Total"]', '', Field.isNumber),
            int: new Field('[data-path="Intelligence.Total"]', '', Field.isNumber),
            con: new Field('[data-path="Constitution.Total"]', '', Field.isNumber),
            lck: new Field('[data-path="Luck.Total"]', '', Field.isNumber),

            weapon1_min: new Field('[data-path="Items.Wpn1.DamageMin"]', '', Field.isNumber),
            weapon1_max: new Field('[data-path="Items.Wpn1.DamageMax"]', '', Field.isNumber),
            weapon1_enchantment: new Field('[data-path="Items.Wpn1.HasEnchantment"]', 'false'),
            weapon1_rune: new Field('[data-path="Items.Wpn1.AttributeTypes.2"]', '0'),
            weapon1_value: new Field('[data-path="Items.Wpn1.Attributes.2"]', '', Field.isDamageRune),

            weapon2_min: new Field('[data-path="Items.Wpn2.DamageMin"]', '', Field.isNumber),
            weapon2_max: new Field('[data-path="Items.Wpn2.DamageMax"]', '', Field.isNumber),
            weapon2_enchantment: new Field('[data-path="Items.Wpn2.HasEnchantment"]', 'false'),
            weapon2_rune: new Field('[data-path="Items.Wpn2.AttributeTypes.2"]', '0'),
            weapon2_value: new Field('[data-path="Items.Wpn2.Attributes.2"]', '', Field.isDamageRune)
        };

        this.fields['class'].$object.dropdown({
            preserveHTML: true,
            values: Object.entries(CLASS_MAP).map((e) => {
                return {
                    name: `<img class="ui centered image class-picture" src="res/class${ e[0] }.png"><span>${ e[1] }</span>`,
                    value: e[0]
                };
            })
        }).dropdown('setting', 'onChange', (value, text) => {
            if (value == 4) {
                $('[data-optional="Weapon2"]').show();
            } else {
                $('[data-optional="Weapon2"]').hide();
            }

            this.fields['shield'].show(value == 1);
            this.fields['mask'].show(value == 8);
            this.fields['instrument'].show(value == 9);
        }).dropdown('set selected', '1');

        this.fields['mask'].$object.dropdown({
            preserveHTML: true,
            values: [
                {
                    name: 'None',
                    value: 0
                },
                {
                    name: '<img class="ui centered image class-picture" src="res/mask1.png"><span>Bear</span>',
                    value: 1
                },
                {
                    name: '<img class="ui centered image class-picture" src="res/mask2.png"><span>Cat</span>',
                    value: 2
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['instrument'].$object.dropdown({
            preserveHTML: true,
            values: INSTRUMENT_TYPES.map((name, index) => {
                return {
                    name: `<img class="ui centered image class-picture" src="res/instrument${index}.png"><span>${name}</span>`,
                    value: index
                }
            })
        }).dropdown('set selected', '0');

        this.fields['potion_life'].$object.dropdown({
            values: [
                {
                    name: 'No',
                    value: 0
                },
                {
                    name: 'Yes',
                    value: 25
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon1_rune'].$object.dropdown({
            values: [
                {
                    name: 'None',
                    value: 0
                },
                {
                    name: 'Fire',
                    value: 40
                },
                {
                    name: 'Cold',
                    value: 41
                },
                {
                    name: 'Lightning',
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon2_rune'].$object.dropdown({
            values: [
                {
                    name: 'None',
                    value: 0
                },
                {
                    name: 'Fire',
                    value: 40
                },
                {
                    name: 'Cold',
                    value: 41
                },
                {
                    name: 'Lightning',
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['enchantment'].$object.dropdown({
            values: [
                {
                    name: 'No',
                    value: false
                },
                {
                    name: 'Yes',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon1_enchantment'].$object.dropdown({
            values: [
                {
                    name: 'No',
                    value: false
                },
                {
                    name: 'Yes',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon2_enchantment'].$object.dropdown({
            values: [
                {
                    name: 'No',
                    value: false
                },
                {
                    name: 'Yes',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        for (let field of Object.values(this.fields)) {
            field.setListener(() => this._changeListener());
        }
    }

    _html ($parent) {
        $parent.html(`
            <div class="bordered bone">
                <div class="field">
                    <label>Name</label>
                    <input class="text-center" type="text" data-path="Name">
                </div>
                <div class="two fields">
                    <div class="field">
                        <label>Class</label>
                        <div class="ui search selection compact dropdown" data-path="Class">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>Mask</label>
                        <div class="ui selection compact dropdown" data-path="Mask">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>Instrument</label>
                        <div class="ui selection compact dropdown" data-path="Instrument">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>Level</label>
                        <input class="text-center" type="text" data-path="Level" placeholder="1 - 700">
                    </div>
                </div>
                <div class="five fields">
                    <div class="field">
                        <label>Strength</label>
                        <input class="text-center" type="text" data-path="Strength.Total">
                    </div>
                    <div class="field">
                        <label>Dexterity</label>
                        <input class="text-center" type="text" data-path="Dexterity.Total">
                    </div>
                    <div class="field">
                        <label>Intelligence</label>
                        <input class="text-center" type="text" data-path="Intelligence.Total">
                    </div>
                    <div class="field">
                        <label>Constitution</label>
                        <input class="text-center" type="text" data-path="Constitution.Total">
                    </div>
                    <div class="field">
                        <label>Luck</label>
                        <input class="text-center" type="text" data-path="Luck.Total">
                    </div>
                </div>
            </div>
            <div class="bordered btwo">
                <div class="five fields">
                    <div class="field">
                        <label>Min</label>
                        <input class="text-center" type="text" data-path="Items.Wpn1.DamageMin" placeholder="Item Min">
                    </div>
                    <div class="field">
                        <label>Max</label>
                        <input class="text-center" type="text" data-path="Items.Wpn1.DamageMax" placeholder="Item Max">
                    </div>
                    <div class="field">
                        <label>Crit</label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn1.HasEnchantment">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>Rune</label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn1.AttributeTypes.2">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label><br/></label>
                        <input class="text-center" type="text" data-path="Items.Wpn1.Attributes.2" placeholder="0 - 60">
                    </div>
                </div>
            </div>
            <div class="bordered bthree" data-optional="Weapon2">
                <div class="five fields">
                    <div class="field">
                        <label>Min</label>
                        <input class="text-center" type="text" data-path="Items.Wpn2.DamageMin" placeholder="Item Min">
                    </div>
                    <div class="field">
                        <label>Max</label>
                        <input class="text-center" type="text" data-path="Items.Wpn2.DamageMax" placeholder="Item Max">
                    </div>
                    <div class="field">
                        <label>Crit</label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn2.HasEnchantment">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label>Rune</label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn2.AttributeTypes.2">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label><br/></label>
                        <input class="text-center" type="text" data-path="Items.Wpn2.Attributes.2" placeholder="0 - 60">
                    </div>
                </div>
            </div>
            <div class="bordered bfour">
                <div class="four fields">
                    <div class="field">
                        <label>Armor</label>
                        <input class="text-center" type="text" data-path="Armor" placeholder="Armor points">
                    </div>
                    <div class="field">
                        <label>Block %</label>
                        <input class="text-center" type="text" data-path="BlockChance" placeholder="0 - 25">
                    </div>
                    <div class="field">
                        <label>Fire</label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceFire" placeholder="0 - 75">
                    </div>
                    <div class="field">
                        <label>Cold</label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceCold" placeholder="0 - 75">
                    </div>
                    <div class="field">
                        <label>Lightning</label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceLightning" placeholder="0 - 75">
                    </div>
                </div>
            </div>
            <div class="bordered bfive">
                <div class="three fields">
                    <div class="field">
                        <label>Portal Health</label>
                        <input class="text-center" type="text" data-path="Dungeons.Player" placeholder="0 - 50">
                    </div>
                    <div class="field">
                        <label>Rune Health</label>
                        <input class="text-center" type="text" data-path="Runes.Health" placeholder="0 - 15">
                    </div>
                    <div class="field">
                        <label>Life Potion</label>
                        <div class="ui selection compact dropdown" data-path="Potions.Life">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bordered bsix">
                <div class="three fields">
                    <div class="field">
                        <label>Portal Damage</label>
                        <input class="text-center" type="text" data-path="Dungeons.Group" placeholder="0 - 50">
                    </div>
                    <div class="field">
                        <label>Gladiator (0 - 15)</label>
                        <input class="text-center" type="text" data-path="Fortress.Gladiator" placeholder="0 - 15">
                    </div>
                    <div class="field">
                        <label>Shadow of the Cowboy</label>
                        <div class="ui selection compact dropdown" data-path="Items.Hand.HasEnchantment">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
}
