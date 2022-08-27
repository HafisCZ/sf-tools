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

    static isUnderworldBuilding (val) {
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
        this._html(typeof $parent === 'string' ? $($parent) : $parent);
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
            prefix: new Field('[data-path="Prefix"]', ''),

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
            gladiator: new Field('[data-path="Fortress.Gladiator"]', '', Field.isUnderworldBuilding),
            potion_life: new Field('[data-path="Potions.Life"]', '0'),
            enchantment: new Field('[data-path="Items.Hand.HasEnchantment"]', 'false'),
            shield: new Field('[data-path="BlockChance"]', '25'),

            str: new Field('[data-path="Strength.Total"]', '', Field.isNonZero),
            dex: new Field('[data-path="Dexterity.Total"]', '', Field.isNonZero),
            int: new Field('[data-path="Intelligence.Total"]', '', Field.isNonZero),
            con: new Field('[data-path="Constitution.Total"]', '', Field.isNonZero),
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
            values: Object.keys(CLASS_MAP).map((e) => {
                return {
                    name: `<img class="ui centered image class-picture" src="res/class${e}.png"><span data-intl="general.class${e}"></span>`,
                    value: e
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
                    name: '<span data-intl="editor.none"></span>',
                    value: 0
                },
                {
                    name: '<img class="ui centered image class-picture" src="res/mask1.png"><span data-intl="general.mask1"></span>',
                    value: 1
                },
                {
                    name: '<img class="ui centered image class-picture" src="res/mask2.png"><span data-intl="general.mask2"></span>',
                    value: 2
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['instrument'].$object.dropdown({
            preserveHTML: true,
            values: INSTRUMENT_TYPES.map((name, index) => {
                return {
                    name: `<img class="ui centered image class-picture" src="res/instrument${index}.png"><span data-intl="general.instrument${index}"></span>`,
                    value: index
                }
            })
        }).dropdown('set selected', '0');

        this.fields['potion_life'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="general.no"></span>',
                    value: 0
                },
                {
                    name: '<span data-intl="general.yes"></span>',
                    value: 25
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon1_rune'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="editor.none"></span>',
                    value: 0
                },
                {
                    name: '<span data-intl="editor.fire"></span>',
                    value: 40
                },
                {
                    name: '<span data-intl="editor.cold"></span>',
                    value: 41
                },
                {
                    name: '<span data-intl="editor.lightning"></span>',
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon2_rune'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="general.none"></span>',
                    value: 0
                },
                {
                    name: '<span data-intl="editor.fire"></span>',
                    value: 40
                },
                {
                    name: '<span data-intl="editor.cold"></span>',
                    value: 41
                },
                {
                    name: '<span data-intl="editor.lightning"></span>',
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['enchantment'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="general.no"></span>',
                    value: false
                },
                {
                    name: '<span data-intl="general.yes"></span>',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon1_enchantment'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="general.no"></span>',
                    value: false
                },
                {
                    name: '<span data-intl="general.yes"></span>',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon2_enchantment'].$object.dropdown({
            values: [
                {
                    name: '<span data-intl="general.no"></span>',
                    value: false
                },
                {
                    name: '<span data-intl="general.yes"></span>',
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        // Copy
        $('div.copy-current').click(() => copyText(JSON.stringify(this.read()))).attr('data-tooltip', intl('editor.copy'));

        // Morph
        this.morph = new (class extends Field {
            show (val) {
                if (val) {
                    this.$object.parent().find('.copy-current').css('border-left', '');
                    this.$object.show();
                } else {
                    this.$object.hide();
                    this.$object.parent().find('.copy-current').css('border-left', 'none');
                }
            }
        })('div.morph', '');
        this.morph.$object.dropdown({
            preserveHTML: true,
            action: 'hide',
            values: [
                {
                    name: '<span data-intl="editor.smart_change"></span>',
                    disabled: true
                },
                ...Object.keys(CLASS_MAP).map((e) => {
                    return {
                        name: `<img class="ui centered image class-picture" src="res/class${e}.png"><span data-intl="general.class${e}"></span>`,
                        value: e
                    };
                })
            ]
        }).dropdown('setting', 'onChange', (value) => {
            this._morph(parseInt(value));
        });

        for (let field of Object.values(this.fields)) {
            field.setListener(() => this._changeListener());
        }
    }

    _morph (newClass) {
        let oldClass = this.fields['class'].get();

        if (this.valid() && oldClass != newClass) {
            // Helper methods
            const swapAttributes = function (obj, type) {
                let attributes = _array_to_hash(['Main', 'Side1', 'Side2'], kind => [kind, _dig(obj, MAIN_ATTRIBUTE_MAP[kind][oldClass - 1], type)]);
                for (let kind of ['Main', 'Side1', 'Side2']) {
                    obj[MAIN_ATTRIBUTE_MAP[kind][newClass - 1]][type] = attributes[kind];
                }
            }

            const scaleValue = function (value, mapping) {
                return Math.ceil(value / (mapping[oldClass - 1]) * (mapping[newClass - 1]));
            }

            // Convert data
            let data = this.read();

            swapAttributes(data, 'Base');
            swapAttributes(data, 'Total');

            data.Armor = scaleValue(data.Armor, [50, 10, 25, 25, 10, 25, 50, 25, 25]);
            data.Items.Wpn1.DamageMin = scaleValue(data.Items.Wpn1.DamageMin, [2, 4.5, 2.5, 2, 2, 2, 2.5, 4.5, 4.5]);
            data.Items.Wpn1.DamageMax = scaleValue(data.Items.Wpn1.DamageMax, [2, 4.5, 2.5, 2, 2, 2, 2.5, 4.5, 4.5]);

            if (newClass == 1 /* WARRIOR */) {
                data.BlockChance = 25;
                data.Items.Wpn2.DamageMin = 25;
            } else if (newClass == 4 /* ASSASSIN */) {
                data.Items.Wpn2 = data.Items.Wpn1;
            } else if (newClass == 8 /* DRUID */) {
                data.Mask = 2;
            } else if (newClass == 9 /* BARD */) {
                data.Instrument = 0;
            }

            data.Class = newClass;

            // Fill data back in
            this.fill(data);
        } else {
            Toast.warn('Class change failed', 'Please ensure your data is valid and you are not trying to convert into current class.');
        }
    }

    _html ($parent) {
        $parent.html(`
            <div class="bordered bone">
                <div class="field">
                    <label data-intl="editor.name"></label>
                    <div class="ui icon right action input">
                        <input class="text-center" type="text" data-path="Name">
                        <input type="hidden" data-path="Prefix">
                        <div class="ui icon basic buttons">
                            <div class="ui top right pointing dropdown button morph">
                                <i class="exchange link icon"></i>
                            </div>
                            <div class="ui button copy-current" data-position="right center">
                                <i class="outline copy link icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="two fields">
                    <div class="field">
                        <label data-intl="editor.class"></label>
                        <div class="ui search selection compact dropdown" data-path="Class">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label data-intl="editor.mask"></label>
                        <div class="ui selection compact dropdown" data-path="Mask">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label data-intl="editor.instrument"></label>
                        <div class="ui selection compact dropdown" data-path="Instrument">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label data-intl="editor.level"></label>
                        <input class="text-center" type="text" data-path="Level" placeholder="1 - 700">
                    </div>
                </div>
                <div class="five fields">
                    <div class="field">
                        <label data-intl="general.strength"></label>
                        <input class="text-center" type="text" data-path="Strength.Total">
                    </div>
                    <div class="field">
                        <label data-intl="general.dexterity"></label>
                        <input class="text-center" type="text" data-path="Dexterity.Total">
                    </div>
                    <div class="field">
                        <label data-intl="general.intelligence"></label>
                        <input class="text-center" type="text" data-path="Intelligence.Total">
                    </div>
                    <div class="field">
                        <label data-intl="general.constitution"></label>
                        <input class="text-center" type="text" data-path="Constitution.Total">
                    </div>
                    <div class="field">
                        <label data-intl="general.luck"></label>
                        <input class="text-center" type="text" data-path="Luck.Total">
                    </div>
                </div>
            </div>
            <div class="bordered btwo">
                <div class="five fields">
                    <div class="field">
                        <label data-intl="editor.min"></label>
                        <input class="text-center" type="text" data-path="Items.Wpn1.DamageMin" placeholder="Item Min">
                    </div>
                    <div class="field">
                        <label data-intl="editor.max"></label>
                        <input class="text-center" type="text" data-path="Items.Wpn1.DamageMax" placeholder="Item Max">
                    </div>
                    <div class="field">
                        <label data-intl="editor.weapon_enchant"></label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn1.HasEnchantment">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label data-intl="editor.rune"></label>
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
                        <label data-intl="editor.min"></label>
                        <input class="text-center" type="text" data-path="Items.Wpn2.DamageMin" placeholder="Item Min">
                    </div>
                    <div class="field">
                        <label data-intl="editor.max"></label>
                        <input class="text-center" type="text" data-path="Items.Wpn2.DamageMax" placeholder="Item Max">
                    </div>
                    <div class="field">
                        <label data-intl="editor.weapon_enchant"></label>
                        <div class="ui selection compact dropdown" data-path="Items.Wpn2.HasEnchantment">
                            <div class="text"></div>
                            <i class="dropdown icon"></i>
                        </div>
                    </div>
                    <div class="field">
                        <label data-intl="editor.rune"></label>
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
                        <label data-intl="editor.armor"></label>
                        <input class="text-center" type="text" data-path="Armor" placeholder="Armor points">
                    </div>
                    <div class="field">
                        <label data-intl="editor.block"></label>
                        <input class="text-center" type="text" data-path="BlockChance" placeholder="0 - 25">
                    </div>
                    <div class="field">
                        <label data-intl="editor.fire"></label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceFire" placeholder="0 - 75">
                    </div>
                    <div class="field">
                        <label data-intl="editor.cold"></label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceCold" placeholder="0 - 75">
                    </div>
                    <div class="field">
                        <label data-intl="editor.lightning"></label>
                        <input class="text-center" type="text" data-path="Runes.ResistanceLightning" placeholder="0 - 75">
                    </div>
                </div>
            </div>
            <div class="bordered bfive">
                <div class="three fields">
                    <div class="field">
                        <label data-intl="editor.portal_health"></label>
                        <input class="text-center" type="text" data-path="Dungeons.Player" placeholder="0 - 50">
                    </div>
                    <div class="field">
                        <label data-intl="editor.rune_health"></label>
                        <input class="text-center" type="text" data-path="Runes.Health" placeholder="0 - 15">
                    </div>
                    <div class="field">
                        <label data-intl="editor.life_potion"></label>
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
                        <label data-intl="editor.portal_damage"></label>
                        <input class="text-center" type="text" data-path="Dungeons.Group" placeholder="0 - 50">
                    </div>
                    <div class="field">
                        <label data-intl="editor.gladiator"></label>
                        <input class="text-center" type="text" data-path="Fortress.Gladiator" placeholder="0 - 15">
                    </div>
                    <div class="field">
                        <label data-intl="editor.hand_enchant"></label>
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
