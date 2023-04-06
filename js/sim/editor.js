class Field {
    constructor (querryString, defaultValue, validator = undefined, formatter = undefined) {
        this.$object = $(querryString);
        this.defaultValue = defaultValue.toString();
        this.validator = validator;
        this.formatter = formatter;
        this.isDropdown = this.$object.hasClass('dropdown');
        this.$object.on('change input', () => {
            if (this.triggerAlways || this.valid()) {
                this.triggerListener();
            }
        });
    }

    initialize (data) {
        const value = data.value;
        delete data.value;

        this.$object.dropdown(data);
        this.$object.dropdown('set selected', String(value));
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
        if (this.formatter) {
            return this.formatter.get(value);
        } else if (isNaN(value)) {
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
            this.$object.dropdown('set selected', String(value));
        } else {
            this.$object.val(this.formatter ? this.formatter.set(value) : value);
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
    constructor (fields) {
        this.fields = fields;
        this.fieldsEntries = Object.entries(fields);
        this.fieldsArray = Object.values(fields);

        for (const [key, field] of this.fieldsEntries) {
            field.key = key;
        }
    }

    fill (object) {
        if (object) {
            for (const field of this.fieldsArray) {
                const value = getObjectAt(object, field.path());

                if (typeof value === 'undefined') {
                    field.clear();
                } else {
                    field.set(value);
                }
            }
        } else {
            this.clear();
        }
    }

    read (object = {}) {
        for (const field of this.fieldsArray) {
            setObjectAt(object, field.path(), field.get());
        }

        return object;
    }

    clear () {
        for (const field of this.fieldsArray) {
            field.clear();
        }
    }

    valid () {
        return this.fieldsArray.every((field) => field.valid());
    }
}

class Editor extends EditorBase {
    static createPlayerEditor (selector) {
        document.querySelector(selector).innerHTML = Editor.getPlayerEditorHTML();
    }

    static getExtendedEditorFields (selector, extension) {
        return Object.assign(
            extension,
            Editor.getEditorFields(selector)
        )
    }

    static getEditorFields (selector) {
        return {
            name: new Field(`${selector} [data-path="Name"`, ''),
            prefix: new Field(`${selector} [data-path="Prefix"`, ''),

            class: new Field(`${selector} [data-path="Class"`, '1'),
            level: new Field(`${selector} [data-path="Level"`, '', Field.isPlayerLevel),
            armor: new Field(`${selector} [data-path="Armor"`, '', Field.isNumber),

            resistance_fire: new Field(`${selector} [data-path="Runes.ResistanceFire"`, '', Field.isResistanceRune),
            resistance_cold: new Field(`${selector} [data-path="Runes.ResistanceCold"`, '', Field.isResistanceRune),
            resistance_lightning: new Field(`${selector} [data-path="Runes.ResistanceLightning"`, '', Field.isResistanceRune),

            portal_hp: new Field(`${selector} [data-path="Dungeons.Player"`, '', Field.isDungeon),
            portal_damage: new Field(`${selector} [data-path="Dungeons.Group"`, '', Field.isDungeon),

            runes_health: new Field(`${selector} [data-path="Runes.Health"`, '', Field.isHealthRune),
            gladiator: new Field(`${selector} [data-path="Fortress.Gladiator"`, '', Field.isUnderworldBuilding),
            potion_life: new Field(`${selector} [data-path="Potions.Life"`, '0'),
            enchantment: new Field(`${selector} [data-path="Items.Hand.HasEnchantment"`, 'false'),
            shield: new Field(`${selector} [data-path="BlockChance"`, '25'),

            str: new Field(`${selector} [data-path="Strength.Total"`, '', Field.isNonZero),
            dex: new Field(`${selector} [data-path="Dexterity.Total"`, '', Field.isNonZero),
            int: new Field(`${selector} [data-path="Intelligence.Total"`, '', Field.isNonZero),
            con: new Field(`${selector} [data-path="Constitution.Total"`, '', Field.isNonZero),
            lck: new Field(`${selector} [data-path="Luck.Total"`, '', Field.isNumber),

            weapon1_min: new Field(`${selector} [data-path="Items.Wpn1.DamageMin"`, '', Field.isNumber),
            weapon1_max: new Field(`${selector} [data-path="Items.Wpn1.DamageMax"`, '', Field.isNumber),
            weapon1_enchantment: new Field(`${selector} [data-path="Items.Wpn1.HasEnchantment"`, 'false'),
            weapon1_rune: new Field(`${selector} [data-path="Items.Wpn1.AttributeTypes.2"`, '0'),
            weapon1_value: new Field(`${selector} [data-path="Items.Wpn1.Attributes.2"`, '', Field.isDamageRune),

            weapon2_min: new Field(`${selector} [data-path="Items.Wpn2.DamageMin"`, '', Field.isNumber),
            weapon2_max: new Field(`${selector} [data-path="Items.Wpn2.DamageMax"`, '', Field.isNumber),
            weapon2_enchantment: new Field(`${selector} [data-path="Items.Wpn2.HasEnchantment"`, 'false'),
            weapon2_rune: new Field(`${selector} [data-path="Items.Wpn2.AttributeTypes.2"`, '0'),
            weapon2_value: new Field(`${selector} [data-path="Items.Wpn2.Attributes.2"`, '', Field.isDamageRune)
        }
    }

    constructor (selector, callback = null, fields = Editor.getEditorFields(selector)) {
        super(fields);

        this._bind();

        this._changeCallback = callback;
        this.clear();
    }

    read () {
        return super.read(new PlayerModel());
    }

    valid () {
        const ass = this.fields['class'].get() != 4;

        for (const [key, field] of this.fieldsEntries) {
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
        const object = new PlayerModel();
        for (const field of Object.values(this.fields)) {
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
        this.fields['class'].initialize({
            values: CONFIG.indexes().map((value) => ({
                image: `res/class${value}.png`,
                imageClass: '!-ml-3 !mr-2',
                name: intl(`general.class${value}`),
                value
            })),
            onChange: (value) => {
                if (value == ASSASSIN) {
                    $('[data-optional="Weapon2"]').show();
                } else {
                    $('[data-optional="Weapon2"]').hide();
                }

                this.fields['shield'].show(value == WARRIOR);
            },
            value: '1'
        });

        this.fields['potion_life'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: 0
                },
                {
                    name: intl('general.yes'),
                    value: 25
                }
            ],
            value: '0'
        });

        this.fields['weapon1_rune'].initialize({
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
            ],
            value: '0'
        });

        this.fields['weapon2_rune'].initialize({
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
            ],
            value: '0'
        })

        this.fields['enchantment'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ],
            value: 'false'
        });

        this.fields['weapon1_enchantment'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ],
            value: 'false'
        });

        this.fields['weapon2_enchantment'].initialize({
            values: [
                {
                    name: intl('general.no'),
                    value: false
                },
                {
                    name: intl('general.yes'),
                    value: true
                }
            ],
            value: 'false'
        });

        // Copy
        $('div.copy-current').click(() => copyJSON(this.read()));

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

        this.morph.initialize({
            action: 'hide',
            values: [
                {
                    name: this.intl('smart_change'),
                    type: 'header',
                    class: 'header text-center'
                },
                ...CONFIG.indexes().map((value) => ({
                    image: `res/class${value}.png`,
                    imageClass: '!-ml-3 !mr-2',
                    name: intl(`general.class${value}`),
                    value
                }))
            ],
            onChange: (value) => {
                this._morph(parseInt(value));
            }
        });

        for (const field of this.fieldsArray) {
            field.setListener(() => this._changeListener());
        }
    }

    _morph (newClass) {
        const oldClass = this.fields['class'].get();

        if (this.valid() && oldClass != newClass) {
            const oldDefinition = CONFIG.fromIndex(oldClass);
            const newDefinition = CONFIG.fromIndex(newClass);

            // Helper methods
            const getAttributeList = function (attribute) {
                return {
                    'Strength': ['Strength', 'Dexterity', 'Intelligence'],
                    'Dexterity': ['Dexterity', 'Strength', 'Intelligence'],
                    'Intelligence': ['Intelligence', 'Strength', 'Dexterity']
                }[attribute]
            }

            const swapAttributes = function (obj) {
                const oldattributes = getAttributeList(oldDefinition.Attribute).map((kind) => _dig(obj, kind)).map((att) => ({ Base: att.Base, Total: att.Total }));
                const newAttributes = getAttributeList(newDefinition.Attribute);

                for (let i = 0; i < 3; i++) {
                    for (const type of ['Base', 'Total']) {
                        obj[newAttributes[i]][type] = oldattributes[i][type];
                    }
                }
            }

            const scaleValue = function (value, oldValue, newValue) {
                return Math.ceil(value / oldValue * newValue);
            }

            // Convert data
            const data = this.read();

            swapAttributes(data);

            data.Armor = scaleValue(data.Armor, oldDefinition.MaximumDamageReduction, newDefinition.MaximumDamageReduction);
            data.Items.Wpn1.DamageMin = scaleValue(data.Items.Wpn1.DamageMin, oldDefinition.WeaponDamageMultiplier, newDefinition.WeaponDamageMultiplier);
            data.Items.Wpn1.DamageMax = scaleValue(data.Items.Wpn1.DamageMax, oldDefinition.WeaponDamageMultiplier, newDefinition.WeaponDamageMultiplier);

            if (newClass == WARRIOR) {
                data.BlockChance = newDefinition.SkipChance;

                data.Items.Wpn2 = SFItem.empty();
                data.Items.Wpn2.DamageMin = newDefinition.SkipChance;
            } else if (newClass == ASSASSIN) {
                data.Items.Wpn2 = data.Items.Wpn1;
            }

            data.Class = newClass;

            // Fill data back in
            this.fill(data);
        } else {
            Toast.warn('Class change failed', 'Please ensure your data is valid and you are not trying to convert into current class.');
        }
    }

    static getPlayerEditorHTML () {
        return `
            <div class="flex flex-col gap-2">
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="field">
                        <label>${intl('editor.name')}</label>
                        <div class="ui icon right action inverted centered input">
                            <input type="text" data-path="Name">
                            <input type="hidden" data-path="Prefix">
                            <div class="ui icon basic inverted buttons">
                                <div class="ui top right pointing inverted dropdown button morph">
                                    <i class="exchange link icon"></i>
                                </div>
                                <div class="ui button copy-current" data-position="right center" data-inverted="" data-tooltip="${intl('editor.copy')}">
                                    <i class="outline copy link icon"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label>${intl('editor.class')}</label>
                            <div class="ui search selection inverted dropdown" data-path="Class">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.level')}</label>
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
                            <label>${intl('editor.min')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn1.DamageMin" placeholder="${intl('editor.min_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.max')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn1.DamageMax" placeholder="${intl('editor.max_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.weapon_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn1.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.rune')}</label>
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
                            <label>${intl('editor.min')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn2.DamageMin" placeholder="${intl('editor.min_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.max')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Items.Wpn2.DamageMax" placeholder="${intl('editor.max_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.weapon_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Wpn2.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.rune')}</label>
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
                            <label>${intl('editor.armor')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Armor" placeholder="${intl('editor.armor_placeholder')}">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.block')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="BlockChance" placeholder="0 - 25">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.fire')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceFire" placeholder="0 - 75">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.cold')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceCold" placeholder="0 - 75">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.lightning')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.ResistanceLightning" placeholder="0 - 75">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ui grey inverted segment !p-2 !m-0">
                    <div class="three fields !mb-0">
                        <div class="field">
                            <label>${intl('editor.portal_health')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Dungeons.Player" placeholder="0 - 50">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.rune_health')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Runes.Health" placeholder="0 - 15">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.life_potion')}</label>
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
                            <label>${intl('editor.portal_damage')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Dungeons.Group" placeholder="0 - 50">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.gladiator')}</label>
                            <div class="ui inverted centered input">
                                <input type="text" data-path="Fortress.Gladiator" placeholder="0 - 15">
                            </div>
                        </div>
                        <div class="field">
                            <label>${intl('editor.hand_enchant')}</label>
                            <div class="ui selection inverted dropdown" data-path="Items.Hand.HasEnchantment">
                                <div class="text"></div>
                                <i class="dropdown icon"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
