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
}(jQuery));

class DOM {
    static byID (id) {
        return document.getElementById(id)
    }

    static listen (element, events, callback) {
        for (let i = 0; i < events.length; i++) {
            element.addEventListener(events[i], callback);
        }
    }

    static settingsButton (element, enabled) {
        const style = element.style;

        if (enabled) {
            style.setProperty('background', 'var(--button-color-active)', 'important');
        } else {
            style.setProperty('background', '');
        }
    }

    static input ({ element, key, def, validator }) {
        const field = element.closest('.field');

        const value = Store.shared.get(key, def, true);
        element.value = value;

        const listener = function () {
            const value = element.value
            const valid = typeof validator !== 'undefined' ? validator(value) : true

            if (valid) {
                field.classList.remove('error');

                Store.shared.set(key, value, true);
            } else {
                field.classList.add('error');
            }
        }

        this.listen(element, ['input', 'change'], listener);
    }

    static toggle ({ element, key, callback, value }) {
        let active = typeof value === 'undefined' ? (typeof key === 'undefined' ? false : (Store.shared.get(key, 'false', true) == 'true')) : value;

        const style = element.style;
        const apply = function () {
            if (active) {
                style.setProperty('background', 'var(--button-color-active)', 'important');
            } else {
                style.setProperty('background', '');
            }
        }

        element.addEventListener('click', function () {
            active = !active;

            if (typeof key !== 'undefined') {
                Store.shared.set(key, active, true);
            }

            callback(active);
            apply();
        })

        apply();
    }

    static dropdown (element, items) {
        let html = '';

        for (let i = 0, item; i < items.length; i++) {
            item = items[i];
            html += `<div class="item${item.selected ? ' active selected' : ''}" data-value="${item.value}">${item.name}</div>`

            if (item.selected) {
                const text = element.querySelector('div.text')
                
                text.classList.remove('default');
                text.innerText = item.name;
            }
        }

        let menu = element.querySelector('div.menu');
        if (menu) {
            // Do nothing as menu already exists
        } else {
            menu = document.createElement('div');
            menu.setAttribute('tabindex', '-1');
            menu.setAttribute('class', 'menu transition hidden');

            element.insertAdjacentElement('beforeend', menu);
        }

        menu.innerHTML = html;
    }
}