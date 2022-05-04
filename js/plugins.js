(function ($) {

    $.fn.searchfield = function (command, arg, arg2) {
        return this.each(function () {
            var $this = $(this);

            if (command == 'create') {
                var $parent = $this.parent('div');

                this.$popup = $('<div class="ui fluid basic popup css-search-popup"></div>');
                this.$info = $('<div class="ui fluid basic popup css-search-popup"></div>');

                this.array = [];
                this.starred = Preferences.get('starred', []);

                this.limit = arg;

                this.shown = false;
                this.showninfo = false;

                for (var [ key, value ] of Object.entries(arg2 || { })) {
                    this.$info.append(`<div class="css-search-entryinfo"><code>${ key.length == 2 ? '' : '&nbsp;' }${ key }: &nbsp;&nbsp;</code>${ value }</div>`);
                }

                this.$popup.on('redraw', () => {
                    this.$popup.html('');

                    for (var i = 0; i < this.array.length; i++) {
                        var star = $(`<i class="star outline icon css-star" data-entry="${ i }"></i>`).on('click', event => {
                            $this.searchfield('favorite', $(event.currentTarget).attr('data-entry'));
                            event.stopPropagation();
                        });

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ _string_to_binary(this.array[i]) }">${ this.array[i] }</div>`).on('click', event => {
                            $this.searchfield('select', _binary_to_string($(event.currentTarget).attr('data-entry')));
                        }).append(star));
                    }

                    for (var i = 0; i < this.starred.length; i++) {
                        var star = $(`<i class="star icon css-unstar" data-entry="${ i }"></i>`).on('click', event => {
                            $this.searchfield('unfavorite', $(event.currentTarget).attr('data-entry'));
                            event.stopPropagation();
                        });

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ _string_to_binary(this.starred[i]) }">${ this.starred[i] }</div>`).on('click', event => {
                            $this.searchfield('select', _binary_to_string($(event.currentTarget).attr('data-entry')));
                        }).append(star));
                    }
                });

                $parent.prepend(this.$info);
                $parent.append($('<i class="info circle link icon css-search-info"></i>').mouseenter(event => {
                    if (!this.showninfo) {
                        if (this.shown) {
                            $this.searchfield('hide');
                        }

                        $this.searchfield('showinfo');
                    }
                }));

                $parent.prepend(this.$popup);
                $parent.append($('<i class="angle double down link icon css-search-dropdown"></i>').mouseenter(event => {
                    if (!this.shown) {
                        if (this.showninfo) {
                            $this.searchfield('hideinfo');
                        }

                        $this.searchfield('show');
                    }
                }));

                $parent.append($('<i class="close icon link icon css-search-clear"></i>').click(event => {
                    $this.searchfield('clear');
                }));

                $this.keydown(event => {
                    if (event.which == 13) {
                        $this.searchfield('add', $this.val());
                    }

                    if (this.shown) {
                        $this.searchfield('hide');
                    }
                });

                $parent.mouseleave(() => {
                    if (this.shown) {
                        $this.searchfield('hide');
                    }

                    if (this.showninfo) {
                        $this.searchfield('hideinfo');
                    }
                });

                this.$popup.trigger('redraw');
            } else if (command == 'add' && arg) {
                if (this.array[0] != arg) {
                    var fav = this.starred.findIndex(item => item == arg);
                    if (fav == -1) {
                        var index = this.array.findIndex(item => item == arg);
                        if (index != -1) {
                            this.array.splice(index, 1);
                        }

                        this.array.splice(0, 0, arg);
                        if (this.array.length > this.limit) {
                            this.array.pop();
                        }

                        this.$popup.trigger('redraw');
                    }
                }
            } else if (command == 'favorite') {
                var [ item ] = this.array.splice(arg, 1);
                this.starred.push(item);
                this.$popup.trigger('redraw');

                Preferences.set('starred', this.starred);
            } else if (command == 'unfavorite') {
                this.starred.splice(arg, 1);
                this.$popup.trigger('redraw');

                Preferences.set('starred', this.starred);

                if (this.starred.length == 0 && this.array.length == 0) {
                    $this.searchfield('hide');
                }
            } else if (command == 'toggle') {
                if (this.shown) {
                    this.shown = false;
                    this.$popup.hide();
                } else if (this.array.length || this.starred.length) {
                    this.shown = true;
                    this.$popup.show();
                }
            } else if (command == 'hide') {
                if (this.shown) {
                    this.shown = false;
                    this.$popup.hide();
                }
            } else if (command == 'hideinfo') {
                if (this.showninfo) {
                    this.showninfo = false;
                    this.$info.hide();
                }
            } else if (command == 'showinfo') {
                if (!this.showninfo) {
                    this.showninfo = true;
                    this.$info.show();
                }
            } else if (command == 'show') {
                if (!this.shown && (this.array.length || this.starred.length)) {
                    this.shown = true;
                    this.$popup.show();
                }
            } else if (command == 'clear'){
                $this.val('').trigger('change');
            } else if (command == 'select') {
                $this.val(arg).searchfield('hide').trigger('change');
            }

            return $this;
        });
    };

    $.fn.settingsButton = function (enabled) {
        return this.each(function () {
            if (enabled) {
                this.style.setProperty('background', '#21ba45', 'important');
                this.style.setProperty('color', 'white', 'important');
            } else {
                this.style.setProperty('background', '');
                this.style.setProperty('color', '');
            }
        });
    }

    $.fn.templatePopup = function (command, param) {
        return this.each(function () {
            var $this = $(this);

            if (command == 'create') {
                $this.css('position', 'fixed');

                this.$dropdown = $this.find('[data-op="name"]');

                // Save values
                this.trigger = param.trigger;
                this.getValues = param.getValues;
                this.onSave = param.onSave;
                this.pos = {
                    x: 0,
                    y: 0
                };

                this.shown = false;

                // Add listeners
                this.trigger.click(event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (this.shown) {
                        this.onSave(this.$dropdown.find('input.search').val() || this.$dropdown.dropdown('get value'));
                        $this.templatePopup('hide');
                    } else {
                        var bounds = event.currentTarget.getBoundingClientRect();
                        $this.templatePopup('show', {
                            x: window.scrollX + bounds.left,
                            y: window.scrollY + bounds.top,
                        });
                    }
                });

                $(window).click(event => {
                    if (this.shown && !$this.has(event.target).length) {
                        $this.templatePopup('hide');
                    }
                });
            } else if (command == 'pos') {
                this.pos = param;
            } else if (command == 'show') {
                $this.css('top', `calc(${ param.y }px + ${ this.pos.y }em)`).css('right', `calc(100vw - ${ param.x }px + ${ this.pos.x }em)`);

                if (!this.shown) {
                    this.shown = true;
                    $this.transition('stop').transition('fade');
                }

                this.$dropdown.dropdown({
                    allowAdditions: true,
                    forceSelection: false,
                    values: this.getValues()
                });
            } else if (command == 'hide') {
                this.shown = false;
                $this.transition('stop').transition('fade');
            }
        });
    }

    $.fn.context = function (command, param) {
        return this.each(function () {
            var menu = $(this);

            if (command == 'create' && param && param.items) {
                menu.addClass('css-context-menu');

                for (let item of param.items) {
                    menu.append($(`<div class="ui fluid basic button css-context-menu-item ${ item.enabled === false ? 'disabled' : '' }">${ item.label }</div>`).click(() => {
                        menu.context('hide');
                        item.action(this.source);
                    }));
                }

                $(window).click(() => {
                    if (this.shown) {
                        menu.context('hide');
                    }
                });

                this.startTimer = () => {
                    if (!this.timer) {
                        this.timer = setTimeout(() => menu.context('hide'), 1500);
                    }
                };

                this.stopTimer = () => {
                    if (this.timer) {
                        clearTimeout(this.timer);
                        this.timer = null;
                    }
                };

                menu.mouseenter(() => {
                    this.stopTimer();
                });

                menu.mouseleave(() => {
                    this.startTimer();
                });
            } else if (command == 'bind' && param instanceof jQuery) {
                param.contextmenu((event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    var bounds = event.currentTarget.getBoundingClientRect();
                    menu.context('show', {
                        x: window.scrollX + bounds.left + bounds.width,
                        y: window.scrollY + bounds.top,
                        source: $(event.currentTarget)
                    });
                });
            } else if (command == 'show' && param.x && param.y && param.source) {
                this.source = param.source;
                menu.css('top', `${ param.y }px`).css('left', `${ param.x }px`);

                if (!this.shown) {
                    this.shown = true;
                    menu.transition('stop').transition('fade');
                }

                this.stopTimer();
                this.startTimer();
            } else if (command == 'hide' && this.shown) {
                this.shown = false;
                this.stopTimer();
                menu.transition('stop').transition('fade');
            }
        });
    };

    $.fn.settings_selectionlist = function (args, ex) {
        return this.each(function () {
            let $this = $(this);

            if (typeof(args) == 'string') {
                if (!this.$items) {
                    // Do nothing
                } else if (args == 'set unsaved') {
                    this.$items.removeClass('unsaved').find('.save.icon').hide();
                    if (ex) {
                        this.$items.filter('.active').addClass('unsaved').find('.save.icon').show();
                    }
                }
            } else {
                // Arguments
                args = args || { };

                // Variables
                this.onClick = args.onClick || (() => { /* Do nothing */ });
                this.onRemove = args.onRemove || (() => { /* Do nothing */ });
                this.onSave = args.onSave || (() => { /* Do nothing */ });

                this.items = args.items || [];

                // Setup
                $this.html(this.items.reduce((c, item) => c + `
                    <div class="item ${ item.selected ? 'active' : '' }" data-value="${ item.value }">
                        <div class="right floated content" ${ !item.selected ? 'style="display: none;"' : '' }>
                            <i class="fitted save icon"></i><i class="fitted alternate outline trash icon"></i>
                        </div>
                        <div class="content css-entry-label">
                            ${ item.name }
                        </div>
                    </div>
                `, ''));

                // Handler
                this.$items = $this.find('[data-value]').click(event => {
                    this.onClick($(event.delegateTarget).attr('data-value'));
                });

                this.$items.find('.save.icon').click(event => {
                    this.onSave($(event.delegateTarget).closest('[data-value]').attr('data-value'));
                });

                this.$items.find('.trash.icon').click(event => {
                    this.onRemove($(event.delegateTarget).closest('[data-value]').attr('data-value'));
                });
            }
        });
    };

    $.fn.templates_selectionlist = function (args) {
        return this.each(function () {
            let $this = $(this);

            // Arguments
            args = args || { };

            // Variables
            this.onClick = args.onClick || (() => { /* Do nothing */ });
            this.items = args.items || [];

            // Setup
            $this.html(this.items.reduce((c, item) => c + `
                <div class="item" data-value="${ item.value }">
                    <div class="content css-entry-label ${ item.selected ? 'css-entry-highlight' : '' }">
                        ${ item.name }
                    </div>
                </div>
            `, ''));

            // Handler
            this.$items = $this.find('[data-value]').click(event => {
                this.onClick($(event.delegateTarget).attr('data-value'));
            });
        });
    };

    $.fn.captiveInputField = function (storageKey, defaultValue, validator = () => true) {
        return this.each(function () {
            let $this = $(this);
            $this.val(SharedPreferences.getRaw(storageKey, defaultValue));
            $this.on('input change', () => {
                if (validator($this.val())) {
                    SharedPreferences.setRaw(storageKey, $this.val());
                }
            });
        });
    }

    $.fn.templateList = function (args) {
        return this.each(function () {
            let $this = $(this);

            // Arguments
            args = args || { };

            // Variables
            this.onClick = args.onClick || (() => { /* Do nothing */ });
            this.items = args.items || [];

            // Setup
            $this.html(this.items.reduce((c, item) => c + `
                <div class="item" data-value="${ item }">
                    <div class="content">
                        ${ item }
                    </div>
                </div>
            `, ''));

            // Handler
            this.$items = $this.find('[data-value]').click(event => {
                this.$items.removeClass('selected');

                let $target = $(event.delegateTarget).addClass('selected');

                this.onClick($target.attr('data-value'));
            });

            if (this.items.length) {
                this.$items.first().addClass('selected');
                this.onClick(this.items[0]);
            }
        });
    };
}(jQuery));

class Field {
    constructor (querryString, defaultValue, validator = undefined) {
        this.$object = $(querryString);
        this.defaultValue = defaultValue.toString();
        this.validator = validator;
        this.isDropdown = this.$object.hasClass('dropdown');
        this.$object.on('change input', () => {
            if (this.valid()) {
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
