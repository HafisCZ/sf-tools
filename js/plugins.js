(function ($) {
    $.fn.operator = function (op) {
        return this.find(`[data-op="${op}"]`);
    }

    $.fn.searchfield = function (command, arg) {
        return this.each(function () {
            var $this = $(this);

            if (command == 'create') {
                var $parent = $this.parent('div');

                this.$popup = $('<div class="ui fluid basic popup css-search-popup"></div>');
                this.$info = $('<div class="ui fluid basic popup css-search-popup"></div>');

                this.array = [];
                this.starred = Preferences.get('starred', []);

                this.shown = false;
                this.showninfo = false;

                for (var [ key, value ] of Object.entries(arg || { })) {
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
                $parent.append($('<i class="info circle link icon"></i>').mouseenter(event => {
                    if (!this.showninfo) {
                        if (this.shown) {
                            $this.searchfield('hide');
                        }

                        $this.searchfield('showinfo');
                    }
                }));

                $parent.prepend(this.$popup);
                $parent.append($('<i class="angle double down link icon !mr-8"></i>').mouseenter(event => {
                    if (!this.shown) {
                        if (this.showninfo) {
                            $this.searchfield('hideinfo');
                        }

                        $this.searchfield('show');
                    }
                }));

                $parent.append($('<i class="close link icon !mr-16"></i>').click(event => {
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
                        if (this.array.length > 5) {
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

    $.fn.toggleButton = function (callback, state = false) {
        return this.each(function () {
            this.isActive = state;
            this.callback = callback;

            this.updateStyle = () => {
                if (this.isActive) {
                    this.style.setProperty('background', '#21ba45', 'important');
                } else {
                    this.style.setProperty('background', '');
                }
            }

            this.updateStyle();
            this.addEventListener('click', () => {
                this.isActive = !this.isActive;
                this.callback(this.isActive);
                this.updateStyle();
            });
        });
    }

    $.fn.captiveToggleButton = function (storageKey, callback) {
        return this.each(function () {
            this.isActive = false;

            this.addEventListener('click', () => {
                this.isActive = !this.isActive;

                SharedPreferences.setRaw(storageKey, this.isActive);

                callback(this.isActive);

                if (this.isActive) {
                    this.style.setProperty('background', '#21ba45', 'important');
                } else {
                    this.style.setProperty('background', '');
                }
            });

            if (SharedPreferences.getRaw(storageKey, 'false') == 'true') {
                this.click();
            }
        });
    }

    $.fn.settingsButton = function (enabled) {
        return this.each(function () {
            if (enabled) {
                this.style.setProperty('background', '#21ba45', 'important');
            } else {
                this.style.setProperty('background', '');
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
