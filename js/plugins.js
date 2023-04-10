(function ($) {
    $.fn.operator = function (op) {
        return this.find(`[data-op="${op}"]`);
    }

    $.fn.searchfield = function (command, arg) {
        return this.each(function () {
            var $this = $(this);

            if (command == 'create') {
                var $parent = $this.parent('div');

                this.$popup = $('<div class="ui fluid basic popup inverted css-search-popup"></div>');
                this.$info = $('<div class="ui fluid basic popup inverted css-search-popup"></div>');

                this.array = [];
                this.starred = Store.get('starred', []);

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

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ _stringToBinary(this.array[i]) }">${ this.array[i] }</div>`).on('click', event => {
                            $this.searchfield('select', _binaryToString($(event.currentTarget).attr('data-entry')));
                        }).append(star));
                    }

                    for (var i = 0; i < this.starred.length; i++) {
                        var star = $(`<i class="star icon css-unstar" data-entry="${ i }"></i>`).on('click', event => {
                            $this.searchfield('unfavorite', $(event.currentTarget).attr('data-entry'));
                            event.stopPropagation();
                        });

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ _stringToBinary(this.starred[i]) }">${ this.starred[i] }</div>`).on('click', event => {
                            $this.searchfield('select', _binaryToString($(event.currentTarget).attr('data-entry')));
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

                Store.set('starred', this.starred);
            } else if (command == 'unfavorite') {
                this.starred.splice(arg, 1);
                this.$popup.trigger('redraw');

                Store.set('starred', this.starred);

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
                    this.style.setProperty('background', 'var(--button-color-active)', 'important');
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

                Store.shared.set(storageKey, this.isActive, true);

                callback(this.isActive);

                if (this.isActive) {
                    this.style.setProperty('background', 'var(--button-color-active)', 'important');
                } else {
                    this.style.setProperty('background', '');
                }
            });

            if (Store.shared.get(storageKey, 'false', true) == 'true') {
                this.click();
            }
        });
    }

    $.fn.settingsButton = function (enabled) {
        return this.each(function () {
            if (enabled) {
                this.style.setProperty('background', 'var(--button-color-active)', 'important');
            } else {
                this.style.setProperty('background', '');
            }
        });
    }

    $.fn.captiveInputField = function (storageKey, defaultValue, validator = () => true) {
        return this.each(function () {
            let $this = $(this);
            $this.val(Store.shared.get(storageKey, defaultValue, true));
            $this.on('input change', () => {
                if (validator($this.val())) {
                    Store.shared.set(storageKey, $this.val(), true);
                }
            });
        });
    }
}(jQuery));
