(function ($) {

    $.fn.searchfield = function (command, arg) {
        return this.each(function () {
            var $this = $(this);

            if (command == 'create') {
                var $parent = $this.parent('div');

                this.$popup = $('<div class="ui fluid basic popup css-search-popup"></div>');
                this.popup = this.$popup.get(0);

                this.array = [];
                this.starred = Preferences.get('starred', []);

                this.limit = arg;
                this.shown = false;

                this.$popup.on('redraw', () => {
                    this.$popup.html('');

                    for (var i = 0; i < this.array.length; i++) {
                        var star = $(`<i class="star outline icon css-star" data-entry="${ i }"></i>`).on('click', event => {
                            $this.searchfield('favorite', $(event.currentTarget).attr('data-entry'));
                            event.stopPropagation();
                        });

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ btoa(this.array[i]) }">${ this.array[i] }</div>`).on('click', event => {
                            $this.searchfield('select', atob($(event.currentTarget).attr('data-entry')));
                        }).append(star));
                    }

                    for (var i = 0; i < this.starred.length; i++) {
                        var star = $(`<i class="star icon css-unstar" data-entry="${ i }"></i>`).on('click', event => {
                            $this.searchfield('unfavorite', $(event.currentTarget).attr('data-entry'));
                            event.stopPropagation();
                        });

                        this.$popup.append($(`<div class="css-search-entry" data-entry="${ btoa(this.starred[i]) }">${ this.starred[i] }</div>`).on('click', event => {
                            $this.searchfield('select', atob($(event.currentTarget).attr('data-entry')));
                        }).append(star));
                    }
                });

                $parent.prepend(this.$popup);
                $parent.append($('<i class="angle double down link icon css-search-dropdown"></i>').mouseenter(event => {
                    if (!this.shown) {
                        $this.searchfield('show');
                    }
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
            } else if (command == 'show') {
                if (!this.shown && (this.array.length || this.starred.length)) {
                    this.shown = true;
                    this.$popup.show();
                }
            } else if (command == 'select') {
                $this.val(arg).searchfield('hide').trigger('change');
            }

            return $this;
        });
    };

    $.fn.context = function (command, param) {
        return this.each(function () {
            var menu = $(this);

            if (command == 'create' && param && param.items) {
                menu.addClass('css-context-menu');

                for (let item of param.items) {
                    menu.append($(`<div class="ui fluid basic button css-context-menu-item">${ item.label }</div>`).click(() => {
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

}(jQuery));
