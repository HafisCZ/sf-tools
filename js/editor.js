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
            this.$object.closest('.field').removeClass('error');
            return true;
        } else {
            this.$object.closest('.field').addClass('error');
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

    get value () {
        return this.get();
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

    set value (value) {
        this.set(value);
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
            this.$object.closest('.field').removeClass('disabled');
        } else {
            this.$object.closest('.field').addClass('disabled');
        }
    }

    show (val) {
        if (val) {
            this.$object.closest('.field').show();
        } else {
            this.$object.closest('.field').hide();
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
        return Field.isNonZero(val) && val <= 800;
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

    static createRange (minimum, maximum) {
        return (val) => Field.isNumber(val) && val >= minimum && val <= maximum;
    }
}

class EditorBase {
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

    read () {
        let object = {};
        for (var [key, field] of Object.entries(this.fields)) {
            setObjectAt(object, field.path(), field.get());
        }

        return object;
    }

    clear () {
        for (var [key, field] of Object.entries(this.fields)) {
            field.clear();
        }
    }

    valid () {
        for (var [key, field] of Object.entries(this.fields)) {
            if (!field.valid()) {
                return false;
            }
        }

        return true;
    }
}

class Editor extends EditorBase {
    constructor ($parent, callback) {
        super();

        this._html(typeof $parent === 'string' ? $($parent) : $parent);
        this._bind();

        this._changeCallback = callback;
        this.clear();
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

    intl (key) {
        return intl(`editor.${key}`);
    }

    _bind () {
        this.fields = {
            name: new Field('[data-path="Name"]', ''),
            prefix: new Field('[data-path="Prefix"]', ''),

            class: new Field('[data-path="Class"]', '1'),
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
            values: Object.keys(CLASS_MAP).map((value) => ({
                image: `res/class${value}.png`,
                imageClass: '!-ml-3 !mr-2',
                name: intl(`general.class${value}`),
                value
            }))
        }).dropdown('setting', 'onChange', (value, text) => {
            if (value == 4) {
                $('[data-optional="Weapon2"]').show();
            } else {
                $('[data-optional="Weapon2"]').hide();
            }

            this.fields['shield'].show(value == 1);
        }).dropdown('set selected', '1');

        this.fields['potion_life'].$object.dropdown({
            values: [
                {
                    name: intl('general.no'),
                    value: 0
                },
                {
                    name: intl('general.yes'),
                    value: 25
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon1_rune'].$object.dropdown({
            values: [
                {
                    name: this.intl('none'),
                    value: 0
                },
                {
                    name: this.intl('fire'),
                    value: 40
                },
                {
                    name: this.intl('cold'),
                    value: 41
                },
                {
                    name: this.intl('lightning'),
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['weapon2_rune'].$object.dropdown({
            values: [
                {
                    name: this.intl('none'),
                    value: 0
                },
                {
                    name: this.intl('fire'),
                    value: 40
                },
                {
                    name: this.intl('cold'),
                    value: 41
                },
                {
                    name: this.intl('lightning'),
                    value: 42
                }
            ]
        }).dropdown('set selected', '0');

        this.fields['enchantment'].$object.dropdown({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon1_enchantment'].$object.dropdown({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        this.fields['weapon2_enchantment'].$object.dropdown({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ]
        }).dropdown('set selected', 'false');

        // Copy
        $('div.copy-current').click(() => copyText(JSON.stringify(this.read())));

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
            action: 'hide',
            values: [
                {
                    name: this.intl('smart_change'),
                    type: 'header',
                    class: 'header text-center'
                },
                ...Object.keys(CLASS_MAP).map((value) => ({
                    image: `res/class${value}.png`,
                    imageClass: '!-ml-3 !mr-2',
                    name: intl(`general.class${value}`),
                    value
                }))
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

            data.Armor = scaleValue(data.Armor, [50, 10, 25, 25, 10, 25, 50, 40, 50]);
            data.Items.Wpn1.DamageMin = scaleValue(data.Items.Wpn1.DamageMin, [2, 4.5, 2.5, 2, 2, 2, 2.5, 4.5, 4.5]);
            data.Items.Wpn1.DamageMax = scaleValue(data.Items.Wpn1.DamageMax, [2, 4.5, 2.5, 2, 2, 2, 2.5, 4.5, 4.5]);

            if (newClass == 1 /* WARRIOR */) {
                data.BlockChance = 25;
                data.Items.Wpn2.DamageMin = 25;
            } else if (newClass == 4 /* ASSASSIN */) {
                data.Items.Wpn2 = data.Items.Wpn1;
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
            <div class="flex flex-col gap-2">
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="field">
                        <label>${this.intl('name')}</label>
                        <div class="ui icon right action inverted centered input">
                            <input type="text" data-path="Name">
                            <input type="hidden" data-path="Prefix">
                            <div class="ui icon basic inverted buttons">
                                <div class="ui top right pointing inverted dropdown button morph">
                                    <i class="exchange link icon"></i>
                                </div>
                                <div class="ui button copy-current" data-position="right center" data-inverted="" data-tooltip="${this.intl('copy')}">
                                    <i class="outline copy link icon"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label>${this.intl('class')}</label>
                            <div class="ui search selection inverted dropdown" data-path="Class">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('level')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Level" placeholder="1 - 800">
                            </div>
                        </div>
                    </div>
                    <div class="five fields !mb-0">
                        <div class="field">
                            <label>${intl('general.attribute1')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Strength.Total">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('general.attribute2')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Dexterity.Total">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('general.attribute3')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Intelligence.Total">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('general.attribute4')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Constitution.Total">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('general.attribute5')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Luck.Total">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="five fields !mb-0">
                        <div class="field">
                            <label>${this.intl('min')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn1.DamageMin" placeholder="${this.intl('min_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('max')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn1.DamageMax" placeholder="${this.intl('max_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('weapon_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn1.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('rune')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn1.AttributeTypes.2">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label><br/></label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn1.Attributes.2" placeholder="0 - 60">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0" data-optional="Weapon2">
                    <div class="five fields !mb-0">
                        <div class="field">
                            <label>${this.intl('min')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn2.DamageMin" placeholder="${this.intl('min_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('max')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn2.DamageMax" placeholder="${this.intl('max_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('weapon_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn2.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('rune')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn2.AttributeTypes.2">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label><br/></label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn2.Attributes.2" placeholder="0 - 60">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="four fields !mb-0">
                        <div class="field">
                            <label>${this.intl('armor')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Armor" placeholder="${this.intl('armor_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('block')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="BlockChance" placeholder="0 - 25">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('fire')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceFire" placeholder="0 - 75">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('cold')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceCold" placeholder="0 - 75">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('lightning')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceLightning" placeholder="0 - 75">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="three fields !mb-0">
                        <div class="field">
                            <label>${this.intl('portal_health')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Dungeons.Player" placeholder="0 - 50">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('rune_health')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.Health" placeholder="0 - 15">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('life_potion')}</label>
                            <div class="ui selection inverted dropdown" data-path="Potions.Life">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="three fields !mb-0">
                        <div class="field">
                            <label>${this.intl('portal_damage')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Dungeons.Group" placeholder="0 - 50">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('gladiator')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Fortress.Gladiator" placeholder="0 - 15">
                            </div>
                        </div>
                        <div class="field">
                            <label>${this.intl('hand_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Hand.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
}
