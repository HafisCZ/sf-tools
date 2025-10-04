// Helper class
class DynamicLoader {
    constructor (container) {
        this.callback = null;
        this.observer = new IntersectionObserver(
            () => this._callback(),
            { threshold: 1.0 }
        );

        this.observed = container.insertAdjacentElement('afterend', document.createElement('div'));
        this.observer.observe(this.observed);
    }

    _callback () {
        if (this.callback) {
            this.callback();
        }
    }

    start (callback) {
        this.callback = callback;
        this.callback();
    }

    stop () {
        this.callback = null;
    }
}

// Context menu handler
class CustomMenu {
    constructor (parent, items) {
        this.parent = parent;
        this.source = null;
        this.timer = null;

        this.container = document.createElement('div');
        this.container.setAttribute('class', 'ui custom inverted popup right center css-context-menu hidden');

        this.parent.insertAdjacentElement('afterbegin', this.container);

        for (const { label, action } of items) {
            const item = document.createElement('div');
            item.setAttribute('class', 'ui fluid basic inverted button css-context-menu-item');
            item.innerText = label;

            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                action(this.source);

                if (this.#visible()) {
                    this.#hide();
                }
            });

            this.container.insertAdjacentElement('beforeend', item);
        }

        window.addEventListener('click', () => {
            if (this.#visible()) {
                this.#hide();
            }
        })

        this.container.addEventListener('mouseenter', () => {
            this.#endTimer();
        })

        this.container.addEventListener('mouseleave', () => {
            this.#startTimer();
        })
    }

    attach (elements) {
        this.source = null;

        for (const element of elements) {
            element.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                event.stopPropagation();

                const bounds = event.currentTarget.getBoundingClientRect();
                this.#show(
                    event.currentTarget,
                    window.scrollX + bounds.left + bounds.width,
                    window.scrollY + bounds.top
                )
            })
        }
    }

    #visible () {
        return this.container.classList.contains('visible');
    }

    #hidden () {
        return this.container.classList.contains('hidden');
    }

    #startTimer () {
        if (this.timer) {
            return;
        }

        this.timer = setTimeout(
            () => this.#hide(),
            1500
        );
    }

    #endTimer () {
        if (this.timer) {
            clearTimeout(this.timer);

            this.timer = null;
        }
    }

    #show (element, x, y) {
        this.source = element;

        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;

        if (this.#hidden()) {
            $(this.container).transition('fade').show();
        }

        this.#endTimer();
        this.#startTimer();
    }

    #hide () {
        if (this.#visible()) {
            $(this.container).transition('fade').hide();
        }

        this.#endTimer();
    }
}

// Search class list
const PLAYER_CLASS_SEARCH = [
    '',
    'warrior',
    'mage',
    'scout',
    'assassin',
    'battle mage',
    'berserker',
    'demon hunter',
    'druid',
    'bard',
    'necromancer',
    'paladin'
];

// Group Detail View
class GroupTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        this.table = new TableController(this.$table, TableType.Group);
        this.table.subscribe('change', () => {
            this.table.bodyElement.insertAdjacentHTML('beforeend', '<tr style="height: 2em;"></tr>');
        })
        this.table.subscribe('inject', (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    Dialog.open(PlayerDetailDialog, { identifier: event.currentTarget.dataset.id, timestamp: this.timestamp, reference: this.reference || this.timestamp })
                })
            }

            this.contextMenu.attach(clickableElements);
        })

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            var node = document.createElement('div');
            node.innerHTML = `${ _formatDate(Number(this.timestamp)) } - ${ _formatDate(Number(this.reference)) }`;

            document.body.prepend(node);
            var range = document.createRange();
            range.selectNode(node);

            var range2 = document.createRange();
            range2.selectNode(this.$table.get(0));

            window.getSelection().removeAllRanges();

            window.getSelection().addRange(range);
            window.getSelection().addRange(range2);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();

            document.body.removeChild(node);
        });

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            copyJSON(this.table.getArray().map(p => ModelUtils.toSimulatorData(p.current)));
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage(($table) => {
                const ta = Number(this.timestamp);
                const tb = Number(this.reference);

                const $tableBody = $table.find('tbody');

                const tableSpan = $table.attr('data-column-count');
                const tableFixed = $table.hasClass('sftools-table-fixed');

                const timestampRow = $(`<tr style="height: 2em;"><td colspan="${tableSpan}" class="text-left" style="padding-left: 8px;">${_formatDate(ta)}${ta != tb ? ` - ${_formatDate(tb)}` : ''}</td></tr>`);
                if (tableFixed) {
                    $tableBody.children(":first").after(timestampRow);
                } else {
                    $tableBody.prepend(timestampRow);
                }                
            }).then((blob) => {
                Exporter.png(blob, `${this.group.Latest.Name}.${this.timestamp}${this.timestamp != this.reference ? `.${this.reference}` : ''}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `${this.group.Latest.Name}.${this.timestamp}${this.timestamp != this.reference ? `.${this.reference}` : ''}`);
            });
        });

        this.$parent.operator('export').click(() => {
            const createExport = (timestamps) => (() => DatabaseManager.export(null, timestamps, (player) => player.group == this.identifier))

            Dialog.open(
                ExportFileDialog,
                {
                    currentWithReference: createExport([ this.timestamp, this.reference ]),
                    current: createExport([ this.timestamp ]),
                    last: createExport([ _dig(this.list, 0, 'Timestamp') ]),
                    last5: createExport(this.list.slice(0, 5).map(entry => entry.Timestamp)),
                    all: createExport(this.list.map(entry => entry.Timestamp))
                },
                DatabaseManager.getAny(this.identifier).Latest.Identifier
            )
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.copy.player'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, this.timestamp)));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, this.timestamp), true));
                    }
                }
            ]
        );

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.scripts, { identifier: this.identifier })
            }
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');

        this.$timestamp = this.$parent.find('[data-op="timestamp"]');
        this.$reference = this.$parent.find('[data-op="reference"]');
    }

    refreshQuickSwapDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (text, value, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.scriptOverride == value) {
                    this.scriptOverride = '';

                    settings = Scripts.getAssignedContent(this.identifier, 'group');
                } else {
                    this.scriptOverride = value;

                    $(element).addClass('active');
                    settings = Scripts.getContent(value);
                }

                this.table.setScript(settings);
                this.refresh();

                this.$configure.dropdown('hide');

            },
            values: [
                {
                    name: intl('stats.scripts.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... Scripts.sortedList('group').map(({ key: value, name }) => ({ name, value }))
            ]
        });
    }

    show ({ identifier }) {
        this.refreshQuickSwapDropdown();

        this.identifier = identifier;
        this.group = DatabaseManager.getGroup(identifier);

        this.$name.html(this.group.Latest.Name);

        const links = DatabaseManager.getLinkedIdentifiers(this.identifier);
        this.$identifier.html(links.length === 1 ? links[0] : links.join(' / '));

        var listTimestamp = [];
        var listReference = [];

        this.list = Site.options.groups_empty ? this.group.List : this.group.List.filter((g) => g.MembersPresent);

        this.timestamp = _dig(this.list, 0, 'Timestamp');
        this.reference = (Site.options.always_prev ? _dig(this.list, 1, 'Timestamp') : undefined) || this.timestamp;

        const formatEntry = (group) => {
            if (group.MembersPresent >= group.MembersTotal) {
                return _formatDate(group.Timestamp);
            } else {
                return `<div class="flex justify-content-between"><span>${_formatDate(group.Timestamp)}</span><span class="text-gray">${group.MembersPresent} / ${group.MembersTotal}</span></div>`
            }
        }

        for (const group of this.list) {
            const timestamp = group.Timestamp;

            listTimestamp.push({
                name: formatEntry(group),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            if (timestamp <= this.timestamp) {
                listReference.push({
                    name: formatEntry(group),
                    value: timestamp,
                    selected: timestamp == this.reference
                });
            }
        }

        // Dropdowns
        this.$timestamp.dropdown({
            values: listTimestamp
        }).dropdown('setting', 'onChange', (value, text) => {
            this.timestamp = value;
            if (this.reference > this.timestamp) {
                this.reference = value;
            }

            var subref = listReference.slice(listReference.findIndex(entry => entry.value == this.timestamp));
            for (var i = 0; i < subref.length; i++) {
                subref[i].selected = subref[i].value == this.reference;
            }

            this.$reference.dropdown({
                values: subref
            }).dropdown('setting', 'onChange', (value) => {
                this.reference = value;
                this.load();
            });

            this.load();
        });

        this.$reference.dropdown({
            values: listReference
        }).dropdown('setting', 'onChange', (value) => {
            this.reference = value;
            this.load();
        });

        this.table.clearSorting();
        this.load();
    }

    load () {
        this.scriptOverride = null;
        this.$configure.find('.item').removeClass('active');

        DOM.settingsButton(this.$configure.get(0), Scripts.isAssigned(this.identifier));

        this.table.setScript(Scripts.getAssignedContent(this.identifier, 'group'));

        var current = this.group[this.timestamp];
        var reference = this.group[this.reference];

        // Joined and kicked members
        var joined = current.Members.filter(id => !reference.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        var kicked = reference.Members.filter(id => !current.Members.includes(id)).map(id => {
            let p = DatabaseManager.getPlayer(id, this.timestamp);
            if (p) {
                return p.Name;
            } else {
                return _dig(DatabaseManager.getPlayer(id), 'Latest', 'Name') || id;
            }
        });

        // Members
        var members = [];
        var missing = [];
        for (const { LinkId: linkId, Name: name } of current.Players) {
            let player = DatabaseManager.getPlayer(linkId, this.timestamp);
            if (player) {
                members.push(player);
            } else {
                missing.push(name);
            }
        }

        // Reference members
        var membersReferences = [];
        for (const member of members) {
            var player = DatabaseManager.getPlayer(member.LinkId);
            if (player) {
                var playerReference = DatabaseManager.getPlayer(member.LinkId, this.reference);
                if (playerReference && playerReference.Group.LinkId == this.identifier) {
                    membersReferences.push(playerReference);
                } else {
                    var p = player.List.concat().reverse().find(p => p.Timestamp >= this.reference && p.Timestamp <= member.Timestamp && p.Group.LinkId == this.identifier);
                    if (p) {
                        membersReferences.push(p);
                    }
                }
            } else {
                membersReferences.push(member);
            }
        }

        // Add entries
        const entries = new GroupTableArray({
            joined,
            kicked,
            missing,
            timestamp: _safeInt(this.timestamp),
            reference: _safeInt(this.reference)
        });

        members.forEach(function (player) {
            entries.add(player, membersReferences.find(c => c.LinkId == player.LinkId));
        });

        this.table.setEntries(entries);

        this.refresh();
    }

    refresh () {
        this.table.refresh();
    }

    reload () {
        this.scriptOverride = '';
        this.refreshQuickSwapDropdown();
        this.load();
    }
}

class PlayerTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table = this.$parent.find('[data-op="table"]');

        this.table = new TableController(this.$table, TableType.Player);
        this.table.subscribe('inject', (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    const dataset = event.currentTarget.dataset;
                    Dialog.open(PlayerDetailDialog, { identifier: dataset.id, timestamp: dataset.ts, reference: dataset.ts })
                });
            }

            this.contextMenu.attach(clickableElements);
        })

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            copyNode(this.table.element);
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage().then((blob) => {
                Exporter.png(blob, `${this.player.Name}.${Exporter.time}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `${this.player.Name}.${Exporter.time}`);
            });
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.copy.player'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, target.dataset.ts)));
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (target) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(target.dataset.id, target.dataset.ts), true));
                    }
                }
            ]
        );

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.scripts, { identifier: this.identifier })
            }
        });

        this.$parent.operator('export').click(() => {
            const createExport = (timestamps) => (() => DatabaseManager.export([ this.identifier ], timestamps))

            Dialog.open(
                ExportFileDialog,
                {
                    last: createExport([ _dig(this.list, 0, 'Timestamp') ]),
                    last5: createExport(this.list.slice(0, 5).map(entry => entry.Timestamp)),
                    all: createExport()
                },
                DatabaseManager.getAny(this.identifier).Latest.Identifier
            )
        });

        this.$name = this.$parent.find('[data-op="name"]');
        this.$identifier = this.$parent.find('[data-op="identifier"]');
    }

    refreshQuickSwapDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (text, value, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.scriptOverride == value) {
                    this.scriptOverride = '';

                    settings = Scripts.getAssignedContent(this.identifier, 'player');
                } else {
                    this.scriptOverride = value;

                    $(element).addClass('active');
                    settings = Scripts.getContent(value);
                }

                this.table.setScript(settings);
                this.refresh();

                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.scripts.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... Scripts.sortedList('player').map(({ key: value, name }) => ({ name, value }))
            ]
        });
    }

    show ({ identifier }) {
        this.refreshQuickSwapDropdown();
        this.identifier = identifier;

        const { List: list, Latest: player } = DatabaseManager.getPlayer(identifier);
        this.list = list;
        this.player = player;

        this.array = new PlayerTableArray();
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            const c = list[i + 1];

            this.array.add(p, c || p);
        }

        this.$name.html(this.player.Name);

        const links = DatabaseManager.getLinkedIdentifiers(this.identifier);
        this.$identifier.html(links.length === 1 ? links[0] : links.join(' / '));

        this.load();
    }

    load () {
        this.scriptOverride = null;
        this.$configure.find('.item').removeClass('active');

        // Table instance
        this.table.setScript(Scripts.getAssignedContent(this.identifier, 'player'));

        this.array.forEach((e) => DatabaseManager.loadPlayer(e.current));

        // Configuration indicator
        DOM.settingsButton(this.$configure.get(0), Scripts.isAssigned(this.identifier));
        
        this.refresh();
    }

    refresh () {
        this.table.setEntries(this.array);
        this.table.refresh();
    }

    reload () {
        this.refreshQuickSwapDropdown();
        this.load();
    }
}

class GroupsTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table1 = this.$parent.find('[data-op="table1"]');
        this.$table2 = this.$parent.find('[data-op="table2"]');

        // Tables
        this.tableBase = new TableController(this.$table1, TableType.Groups);
        this.tableSubscribe(this.tableBase);

        this.tableQ = new TableController(this.$table2, TableType.Groups);
        this.tableSubscribe(this.tableQ);

        // Keep track of what table is displayed and swap if necessary later
        this.table = this.tableBase;
        this.tableQEnabled = false;

        this.identifier = 'groups';

        this.$reference = this.$parent.find('[data-op="reference"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            copyNode(this.table.element);
        });

        document.addEventListener('keyup', (event) => {
            if (event.keyCode == 17) {
                if (UI.current == this) {
                    this.$parent.find('.css-op-select').removeClass('css-op-select');
                }
            }
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage().then((blob) => {
                Exporter.png(blob, `groups.${this.timestamp}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `groups.${this.timestamp}`);
            });
        });

         // Context menu
         this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                DatabaseManager.hideIdentifier($(el).attr('data-id'));
                            }
                        } else {
                            DatabaseManager.hideIdentifier(source.dataset.id);
                        }

                        this.$filter.trigger('change');
                    }
                },
                {
                    label: intl('stats.share.title_short'),
                    action: (source) => {
                        const ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => el.dataset.id);
                        ids.push(source.dataset.id);

                        const cleanedIds = _uniq(ids);
                        const cleanedMembers = cleanedIds.map((id) => DatabaseManager.Groups[id].List.reduce((memo, g) => memo.concat(g.Members), []));

                        Dialog.open(
                            ExportFileDialog,
                            () => DatabaseManager.export(_uniq([ ...cleanedIds, ...cleanedMembers ].flat())),
                            'groups'
                        )
                    }
                },
                {
                    label: intl('stats.context.remove_current'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let instances = elements.length ? elements.map((el) => DatabaseManager.getGroup(el.dataset.id, el.dataset.ts).Data) : [DatabaseManager.getGroup(source.dataset.id, source.dataset.ts).Data];

                        DatabaseManager.safeRemove({ instances }).then(([value]) => {
                            if (value) this.$filter.trigger('change');
                        });
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let identifiers = elements.length ? elements.map(el => el.dataset.id) : [source.dataset.id];

                        DatabaseManager.safeRemove({ identifiers }).then(([value]) => {
                            if (value) this.$filter.trigger('change');
                        });
                    }
                }
            ]
        );

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.scripts, { identifier: 'groups' })
            }
        });

        // Hidden toggle
        this.hidden = Site.options.browse_hidden;

        DOM.toggle({
            element: this.$parent.operator('show-hidden').get(0),
            value: Site.options.browse_hidden,
            callback: (active) => {
                Site.options.browse_hidden = (this.hidden = active);

                this.recalculate = true;
                this.$filter.trigger('change');
            }
        })

        DOM.toggle({
            element: this.$parent.operator('show-empty').get(0),
            value: Site.options.groups_empty,
            callback: (active) => {
                Site.options.groups_empty = !Site.options.groups_empty;

                this.recalculate = true;
                this.$filter.trigger('change');
            }
        })

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['g', 's', 'e', '#', 'l', 'f', 'r', 'h', 'o', 'sr', 'q', 't'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change(async (event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b|^)(g|s|e|l|f|r|h|o|sr|q|t|#):/);

            var terms = [
                {
                   test: function (arg, current) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (current.Name.toLowerCase().includes(subterm) || current.Prefix.toLowerCase().includes(subterm)) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            var entryLimit = undefined;

            this.shidden = false;
            this.autosort = undefined;
            this.tableQEnabled = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'g') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, current) => {
                            for (var term of arg) {
                                if (current.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == '#') {
                    terms.push({
                        test: (arg, current) => {
                            return current.Data.tag && _wrapOrEmpty(current.Data.tag).some((tag) => arg.includes(tag));
                        },
                        arg: arg.split('|').map(rarg => rarg.trim())
                    })
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, current, timestamp) => current.Timestamp == timestamp,
                        arg: arg.toLowerCase()
                    });
                    this.recalculate = true;
                } else if (key == 'e') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        terms.push({
                            test: (arg, current, timestamp, compare) => arg.eval(new ExpressionScope().with(current, compare)),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        this.autosort = (current, compare) => ast.eval(new ExpressionScope().with(current, compare));
                    }
                } else if (key == 'f') {
                    entryLimit = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'r') {
                    this.recalculate = true;
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    terms.push({
                        test: (arg, current, timestamp) => DatabaseManager.getPlayer(current.LinkId).Own
                    });
                    this.recalculate = true;
                    this.shidden = true;
                } else if (key == 'q' && typeof(arg) == 'string' && arg.length) {
                    this.tableQEnabled = true;
                    this.recalculate = true;

                    // Clear original sort
                    this.table.clearSorting();

                    this.table = this.tableQ;
                    this.table.setScript(`category${ arg.split(',').reduce((c, a) => c + `\nheader ${ a.trim() }`, '') }`);
                } else if (key == 't' && typeof(arg) == 'string' && arg.length) {
                    let script = await this.tryGetSettings(arg.trim());
                    if (script) {
                        this.tableQEnabled = true;
                        this.recalculate = true;

                        // Clear original sort
                        this.table.clearSorting();

                        this.table = this.tableQ;
                        this.table.setScript(script);
                    }
                }
            }

            if (!this.tableQEnabled) {
                this.table = this.tableBase;
            }

            const entries = new BrowseTableArray({
                entryLimit,
                timestamp: _safeInt(this.timestamp),
                reference: _safeInt(this.reference),
                externalSort: this.autosort,
                suppressUpdate: !this.recalculate
            });

            for (const [identifier, { List: inputList }] of Object.entries(DatabaseManager.Groups)) {
                const list = Site.options.groups_empty ? inputList : inputList.filter((g) => g.MembersPresent);

                const hidden = DatabaseManager.isIdentifierHidden(identifier);
                if (this.hidden || this.shidden || !hidden) {
                    const current = list.find((entry) => entry.Timestamp <= this.timestamp);
                    if (current) {
                        const timestamp = current.Timestamp;

                        const compare = list.concat().reverse().find((entry) => entry.Timestamp >= this.reference && entry.Timestamp <= timestamp) || current;
                        const reference = compare.Timestamp;
                        
                        if (terms.every((term) => term.test(term.arg, current, this.timestamp, reference))) {
                            entries.add(
                                current,
                                compare,
                                timestamp == this.timestamp,
                                hidden
                            )
                        }
                    }
                }
            }

            this.table.setEntries(entries);

            this.refresh();

            this.recalculate = false;
        });
    }

    tableSubscribe (table) {
        table.subscribe('inject', (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    if (event.ctrlKey) {
                        event.currentTarget.classList.toggle('css-op-select');
                    } else {
                        UI.show(UI.group, { identifier: event.currentTarget.dataset.id });
                    }
                });

                clickableElement.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                })
            }

            this.contextMenu.attach(clickableElements);
        });
    }

    async tryGetSettings (code) {
        if (typeof this.settingsRepo == 'undefined') {
            this.settingsRepo = {};
        }

        if (!(code in this.settingsRepo)) {
            this.settingsRepo[code] = (await SiteAPI.get('script_get', { key: code.trim() })).script.content;
        }

        return this.settingsRepo[code];
    }

    updateSelectors () {
        const timestamps = [];
        const references = [];

        for (const timestamp of DatabaseManager.GroupTimestamps) {
            timestamps.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            references.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.reference
            });
        }

        timestamps.sort((a, b) => b.value - a.value);
        references.sort((a, b) => b.value - a.value);

        this.$timestamp.dropdown('clear', true);
        this.$reference.dropdown('clear', true);

        DOM.dropdown(this.$timestamp.get(0), timestamps);
        DOM.dropdown(this.$reference.get(0), references);

        this.$timestamp.dropdown({
            onChange: (value) => {
                this.timestamp = value;
                this.recalculate = true;

                if (this.reference > this.timestamp) {
                    this.reference = value;
                }

                const subref = references.slice(references.findIndex(entry => entry.value == this.timestamp));
                for (let i = 0; i < subref.length; i++) {
                    subref[i].selected = subref[i].value == this.reference;
                }

                this.$reference.dropdown('clear', true);

                DOM.dropdown(this.$reference.get(0), subref);

                this.$reference.dropdown({
                    onChange: (value) => {
                        this.reference = value;
                        this.recalculate = true;
                        this.$filter.trigger('change');
                    }
                });
    
                this.$filter.trigger('change');
            }
        })

        this.$reference.dropdown({
            onChange: (value) => {
                this.reference = value;
                this.recalculate = true;
                this.$filter.trigger('change');
            }
        });
    }

    show (params) {
        const nonBrowseOrigin = params && params.origin !== this;
        // const nonUpdated = this.lastDatabaseChange === DatabaseManager.LastChange && this.lastScriptChange === Scripts.LastChange;

        /*if (nonBrowseOrigin && nonUpdated) {
            // If no update has happened, just do nothing and display previously rendered table
            return;
        } else*/ {
            this.lastDatabaseChange = DatabaseManager.LastChange;
            this.lastScriptChange = Scripts.LastChange

            this.timestamp = DatabaseManager.LatestGroup;
            this.reference = DatabaseManager.LatestGroup;

            this.tableBase.resetInjector();
            this.tableQ.resetInjector();
    
            this.refreshQuickSwapDropdown();
            this.updateSelectors();
    
            this.load();
        }
    }

    load () {
        // Configuration indicator
        this.$configure.find('.item').removeClass('active');
        DOM.settingsButton(this.$configure.get(0), Scripts.isAssigned('groups'));

        this.table.setScript(Scripts.getAssignedContent('groups', 'groups'));

        this.scriptOverride = null;
        this.recalculate = true;
        this.$filter.trigger('change');
    }

    refreshQuickSwapDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (text, value, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.scriptOverride == value) {
                    this.scriptOverride = null;

                    settings = Scripts.getAssignedContent('groups', 'groups');
                } else {
                    this.scriptOverride = value;

                    $(element).addClass('active');
                    settings = Scripts.getContent(value);
                }

                this.table.setScript(settings);

                this.recalculate = true;
                this.$filter.trigger('change');
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.scripts.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... Scripts.sortedList('groups').map(({ key: value, name }) => ({ name, value }))
            ]
        });
    }

    _toggleTable (table) {
        if (table === this.table) {
            table.element.style.display = '';
        } else {
            table.element.style.display = 'none';
        }
    }

    refresh () {
        this._toggleTable(this.tableBase);
        this._toggleTable(this.tableQ);

        this.table.refresh();
    }

    reload () {
        this.refreshQuickSwapDropdown();
        this.load();
    }
}

class PlayersTab extends Tab {
    constructor (parent) {
        super(parent);

        this.$table1 = this.$parent.find('[data-op="table1"]');
        this.$table2 = this.$parent.find('[data-op="table2"]');

        // Tables
        this.tableBase = new TableController(this.$table1, TableType.Players);
        this.tableSubscribe(this.tableBase);

        this.tableQ = new TableController(this.$table2, TableType.Players);
        this.tableSubscribe(this.tableQ);

        // Keep track of what table is displayed and swap if necessary later
        this.table = this.tableBase;
        this.tableQEnabled = false;

        this.identifier = 'players';

        this.$reference = this.$parent.find('[data-op="reference"]');
        this.$timestamp = this.$parent.find('[data-op="timestamp"]');

        // Copy
        this.$parent.find('[data-op="copy"]').click(() => {
            this.table.forceInject();

            copyNode(this.table.element);
        });

        document.addEventListener('keyup', (event) => {
            if (event.keyCode == 17) {
                if (UI.current == this) {
                    this.$parent.find('.css-op-select').removeClass('css-op-select');
                }
            }
        });

        // Save
        this.$parent.find('[data-op="save"]').click(() => {
            this.table.toImage().then((blob) => {
                Exporter.png(blob, `players.${this.timestamp}`);
            });
        });

        this.$parent.find('[data-op="save-csv"]').click(() => {
            this.table.toCSV().then((blob) => {
                Exporter.csv(blob, `players.${this.timestamp}`);
            });
        });

        // Context menu
        this.contextMenu = new CustomMenu(
            this.$parent.get(0),
            [
                {
                    label: intl('stats.context.hide'),
                    action: (source) => {
                        var sel = this.$parent.find('[data-id].css-op-select');
                        if (sel.length) {
                            for (var el of sel) {
                                DatabaseManager.hideIdentifier($(el).attr('data-id'));
                            }
                        } else {
                            DatabaseManager.hideIdentifier(source.dataset.id);
                        }

                        this.$filter.trigger('change');
                    }
                },
                {
                    label: intl('stats.copy.player'),
                    action: (source) => {
                        let sel = this.$parent.find('[data-id].css-op-select');
                        let cnt = null;

                        if (sel.length) {
                            cnt = sel.toArray().map(x => ModelUtils.toSimulatorData(DatabaseManager.getPlayer(x.dataset.id, x.dataset.ts)));
                        } else {
                            cnt = ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id, source.dataset.ts));
                        }

                        copyJSON(cnt);
                    }
                },
                {
                    label: intl('stats.copy.player_companions'),
                    action: (source) => {
                        copyJSON(ModelUtils.toSimulatorData(DatabaseManager.getPlayer(source.dataset.id, source.dataset.ts), true));
                    }
                },
                {
                    label: intl('stats.share.title_short'),
                    action: (source) => {
                        let ids = this.$parent.find('[data-id].css-op-select').toArray().map(el => el.dataset.id);
                        ids.push(source.dataset.id);

                        Dialog.open(
                            ExportFileDialog,
                            () => DatabaseManager.export(_uniq(ids)),
                            'players'
                        )
                    }
                },
                {
                    label: intl('stats.context.remove_current'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let instances = elements.length ? elements.map((el) => DatabaseManager.getPlayer(el.dataset.id, el.dataset.ts).Data) : [DatabaseManager.getPlayer(source.dataset.id, source.dataset.ts).Data];

                        DatabaseManager.safeRemove({ instances }).then(([value]) => {
                            if (value) this.$filter.trigger('change');
                        });
                    }
                },
                {
                    label: intl('stats.context.remove'),
                    action: (source) => {
                        let elements = this.$parent.find('[data-id].css-op-select').toArray();
                        let identifiers = elements.length ? elements.map(el => el.dataset.id) : [source.dataset.id];

                        DatabaseManager.safeRemove({ identifiers }).then(([value]) => {
                            if (value) this.$filter.trigger('change');
                        });
                    }
                }
            ]
        );

        // Copy 2
        this.$parent.find('[data-op="copy-sim"]').click(() => {
            var array = this.table.getInternalEntries();
            var slice = this.table.getArray().entryLimit || this.table.getEntryLimit();
            if (slice) {
                array = array.slice(0, slice);
            }

            copyJSON(array.map(p => ModelUtils.toSimulatorData(p.current)));
        });

        // Configuration
        this.$configure = this.$parent.find('[data-op="configure"]').contextmenu(event => {
            event.preventDefault();
        }).click(event => {
            let caller = $(event.target);
            if (caller.hasClass('icon') || caller.hasClass('button')) {
                UI.show(UI.scripts, { identifier: 'players' })
            }
        });

        // Hidden toggle
        this.hidden = Site.options.browse_hidden;

        DOM.toggle({
            element: this.$parent.operator('show-hidden').get(0),
            value: Site.options.browse_hidden,
            callback: (active) => {
                Site.options.browse_hidden = (this.hidden = active);

                this.recalculate = true;
                this.$filter.trigger('change');
            }
        })

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['c', 'p', 'g', 's', 'e', '#', 'l', 'f', 'r', 'h', 'o', 'sr', 'q', 't'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change(async (event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b|^)(c|p|g|s|e|l|f|r|h|o|sr|q|t|#):/);

            var terms = [
                {
                   test: function (arg, player, timestamp) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            var entryLimit = undefined;

            this.shidden = false;
            this.autosort = undefined;
            this.tableQEnabled = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == '#') {
                    terms.push({
                        test: (arg, current) => {
                            return current.Data.tag && _wrapOrEmpty(current.Data.tag).some((tag) => arg.includes(tag));
                        },
                        arg: arg.split('|').map(rarg => rarg.trim())
                    })
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player, timestamp) => player.Timestamp == timestamp,
                        arg: arg.toLowerCase()
                    });
                    this.recalculate = true;
                } else if (key == 'e') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        terms.push({
                            test: (arg, player, timestamp, compare) => arg.eval(new ExpressionScope().with(player, compare)),
                            arg: ast
                        });
                    }
                } else if (key == 'sr') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        this.autosort = (player, compare) => ast.eval(new ExpressionScope().with(player, compare));
                    }
                } else if (key == 'f') {
                    entryLimit = isNaN(arg) ? 1 : Math.max(1, Number(arg));
                } else if (key == 'r') {
                    this.recalculate = true;
                } else if (key == 'h') {
                    this.shidden = true;
                } else if (key == 'o') {
                    terms.push({
                        test: (arg, player, timestamp) => DatabaseManager.getPlayer(player.LinkId).Own
                    });
                    this.recalculate = true;
                    this.shidden = true;
                } else if (key == 'q' && typeof(arg) == 'string' && arg.length) {
                    this.tableQEnabled = true;
                    this.recalculate = true;

                    // Clear original sort
                    this.table.clearSorting();

                    this.table = this.tableQ;
                    this.table.setScript(`category${ arg.split(',').reduce((c, a) => c + `\nheader ${ a.trim() }`, '') }`);
                } else if (key == 't' && typeof(arg) == 'string' && arg.length) {
                    let script = await this.tryGetSettings(arg.trim());
                    if (script) {
                        this.tableQEnabled = true;
                        this.recalculate = true;

                        // Clear original sort
                        this.table.clearSorting();

                        this.table = this.tableQ;
                        this.table.setScript(script);
                    }
                }
            }

            if (!this.tableQEnabled) {
                this.table = this.tableBase;
            }

            const entries = new BrowseTableArray({
                entryLimit,
                timestamp: _safeInt(this.timestamp),
                reference: _safeInt(this.reference),
                externalSort: this.autosort,
                suppressUpdate: !this.recalculate
            });

            for (const [identifier, { List: list }] of Object.entries(DatabaseManager.Players)) {
                const hidden = DatabaseManager.isIdentifierHidden(identifier);
                if (this.hidden || this.shidden || !hidden) {
                    const currentPlayer = list.find((entry) => entry.Timestamp <= this.timestamp);
                    if (currentPlayer) {
                        const timestamp = currentPlayer.Timestamp;

                        const comparePlayer = list.concat().reverse().find((entry) => entry.Timestamp >= this.reference && entry.Timestamp <= timestamp) || currentPlayer;
                        const reference = comparePlayer.Timestamp;
                        
                        if (terms.every((term) => term.test(term.arg, DatabaseManager.loadPlayer(currentPlayer), this.timestamp, reference))) {
                            entries.add(
                                DatabaseManager.loadPlayer(currentPlayer),
                                DatabaseManager.loadPlayer(comparePlayer),
                                timestamp == this.timestamp,
                                hidden
                            )
                        }
                    }
                }
            }

            this.table.setEntries(entries);

            this.refresh();

            this.recalculate = false;
        });
    }

    tableSubscribe (table) {
        table.subscribe('inject', (element) => {
            const clickableElements = Array.from(element.querySelectorAll('[data-id]'));
            for (const clickableElement of clickableElements) {
                clickableElement.addEventListener('click', (event) => {
                    if (event.ctrlKey) {
                        event.currentTarget.classList.toggle('css-op-select');
                    } else {
                        Dialog.open(PlayerDetailDialog, { identifier: event.currentTarget.dataset.id, timestamp: this.timestamp, reference: this.reference || this.timestamp })
                    }
                });

                clickableElement.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                })
            }

            this.contextMenu.attach(clickableElements);
        });
    }

    async tryGetSettings (code) {
        if (typeof this.settingsRepo == 'undefined') {
            this.settingsRepo = {};
        }

        if (!(code in this.settingsRepo)) {
            this.settingsRepo[code] = (await SiteAPI.get('script_get', { key: code.trim() })).script.content;
        }

        return this.settingsRepo[code];
    }

    updateSelectors () {
        const timestamps = [];
        const references = [];

        for (const timestamp of DatabaseManager.PlayerTimestamps) {
            timestamps.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.timestamp
            });

            references.push({
                name: _formatDate(timestamp),
                value: timestamp,
                selected: timestamp == this.reference
            });
        }

        timestamps.sort((a, b) => b.value - a.value);
        references.sort((a, b) => b.value - a.value);

        this.$timestamp.dropdown('clear', true);
        this.$reference.dropdown('clear', true);

        DOM.dropdown(this.$timestamp.get(0), timestamps);
        DOM.dropdown(this.$reference.get(0), references);

        this.$timestamp.dropdown({
            onChange: (value) => {
                this.timestamp = value;
                this.recalculate = true;

                if (this.reference > this.timestamp) {
                    this.reference = value;
                }

                const subref = references.slice(references.findIndex(entry => entry.value == this.timestamp));
                for (let i = 0; i < subref.length; i++) {
                    subref[i].selected = subref[i].value == this.reference;
                }

                this.$reference.dropdown('clear', true);

                DOM.dropdown(this.$reference.get(0), subref);

                this.$reference.dropdown({
                    onChange: (value) => {
                        this.reference = value;
                        this.recalculate = true;
                        this.$filter.trigger('change');
                    }
                });
    
                this.$filter.trigger('change');
            }
        })

        this.$reference.dropdown({
            onChange: (value) => {
                this.reference = value;
                this.recalculate = true;
                this.$filter.trigger('change');
            }
        });
    }

    show (params) {
        const nonBrowseOrigin = params && params.origin !== this;
        const nonUpdated = this.lastDatabaseChange === DatabaseManager.LastChange && this.lastScriptChange === Scripts.LastChange;

        if (nonBrowseOrigin && nonUpdated) {
            // If no update has happened, just do nothing and display previously rendered table
            return;
        } else {
            this.lastDatabaseChange = DatabaseManager.LastChange;
            this.lastScriptChange = Scripts.LastChange

            this.timestamp = DatabaseManager.LatestPlayer;
            this.reference = DatabaseManager.LatestPlayer;

            this.tableBase.resetInjector();
            this.tableQ.resetInjector();
    
            this.refreshQuickSwapDropdown();
            this.updateSelectors();
    
            this.load();
        }
    }

    load () {
        // Configuration indicator
        this.$configure.find('.item').removeClass('active');
        DOM.settingsButton(this.$configure.get(0), Scripts.isAssigned('players'));

        this.table.setScript(Scripts.getAssignedContent('players', 'players'));

        this.scriptOverride = null;
        this.recalculate = true;
        this.$filter.trigger('change');
    }

    refreshQuickSwapDropdown () {
        this.$configure.dropdown({
            on: 'contextmenu',
            showOnFocus: false,
            action: (text, value, element) => {
                this.$configure.find('.item').removeClass('active');

                let settings = '';
                if (this.scriptOverride == value) {
                    this.scriptOverride = null;

                    settings = Scripts.getAssignedContent('players', 'players');
                } else {
                    this.scriptOverride = value;

                    $(element).addClass('active');
                    settings = Scripts.getContent(value);
                }

                this.table.setScript(settings);

                this.recalculate = true;
                this.$filter.trigger('change');
                this.$configure.dropdown('hide');
            },
            values: [
                {
                    name: intl('stats.scripts.quick_swap'),
                    type: 'header',
                    class: 'header font-bold !text-center'
                },
                ... Scripts.sortedList('players').map(({ key: value, name }) => ({ name, value }))
            ]
        });
    }

    _toggleTable (table) {
        if (table === this.table) {
            table.element.style.display = '';
        } else {
            table.element.style.display = 'none';
        }
    }

    refresh () {
        this._toggleTable(this.tableBase);
        this._toggleTable(this.tableQ);

        this.table.refresh();
    }

    reload () {
        this.refreshQuickSwapDropdown();
        this.load();
    }
}

// Groups View
class GroupsGridTab extends Tab {
    _prepareOption (operator, key, storeKey) {
        DOM.toggle({
            element: this.$parent.operator(operator).get(0),
            value: Site.options[storeKey],
            callback: (active) => {
                Site.options[storeKey] = (this[key] = active);
                this.show();
            }
        })

        return Site.options[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        this.identifier = 'group';

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'groups_hidden');
        this.others = this._prepareOption('show-other', 'others', 'groups_other');
        this.empty = this._prepareOption('show-empty', 'empty', 'groups_empty');

        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        // Actions
        this.$actions = this.$parent.operator('actions');

        this.$actions.operator('action-unselect').click(() => {
            this.#clearSelection();
        })

        this.$actions.operator('action-hide').click(() => {
            for (const identifier of this.#selection) {
                DatabaseManager.hideIdentifier(identifier);
            }

            this.show();
        })

        this.$actions.operator('action-copy').click(() => {
            const players = this.#selection.flatMap((identifier) => {
                const group = DatabaseManager.getGroup(identifier).Latest;

                return group.Players.map((player) => {
                    if (DatabaseManager.hasPlayer(player.LinkId, group.Timestamp)) {
                        return ModelUtils.toSimulatorData(DatabaseManager.getPlayer(player.LinkId, group.Timestamp));
                    } else {
                        return null;
                    }
                }).filter((p) => p)
            })

            copyJSON(players);

            this.#clearSelection();
        })

        this.$actions.operator('action-share').click(() => {
            const selection = _uniq(this.#selection.flatMap((groupIdentifier) => {
                return [groupIdentifier, ...DatabaseManager.Groups[groupIdentifier].List.reduce((memo, g) => memo.concat(g.Players.map((p) => p.LinkId)), [])]
            }));

            Dialog.open(
                ExportFileDialog,
                () => DatabaseManager.export(selection),
                'groups'
            )

            this.#clearSelection();
        })

        this.$actions.operator('action-link').click(() => {
            Dialog.open(ManageLinkDialog, this.#selection).then(([value]) => {
                if (value) this.show();
            })

            this.#clearSelection();
        })

        this.$actions.operator('action-remove').click(() => {
            DatabaseManager.safeRemove({ identifiers: this.#selection }).then(([value]) => {
                if (value) this.show()
            });
        })

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['g', 's', 'l', 'h', 'a', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(g|s|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, group) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (group.Name.toLowerCase().includes(subterm) || group.Prefix.toLowerCase().includes(subterm)) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            this.hidden_override = false;
            this.others_override = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'g') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, group) => {
                            for (var term of arg) {
                                if (group.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, group) => group.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (const group of Object.values(DatabaseManager.Groups)) {
                let matches = true;
                for (const term of terms) {
                    matches &= term.test(term.arg, group.Latest);
                }

                if (matches) {
                    this.entries.push(group);
                }
            }

            if (this.empty) {
                this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);
            } else {
                this.entries.sort((a, b) => b.LatestDisplayTimestamp - a.LatestDisplayTimestamp);
            }

            this.refresh();
        });
    }

    show () {
        const viewableGroups = Object.entries(DatabaseManager.Groups);
        if (Site.options.skip_grid_if_single_entry_present && viewableGroups.length == 1 && (Site.options.groups_empty || viewableGroups[0][1].List.filter((g) => g.MembersPresent).length > 0)) {
            UI.show(UI.group, { identifier: viewableGroups[0][0] });
        } else {
            this.load();
        }
    }

    #refreshActions () {
        const checkedItems = this.#selection;

        if (checkedItems.length > 0) {
            this.$actions.show();

            if (checkedItems.length > 1) {
                this.$actions.operator('action-copy-companions').addClass('pointer-events-none text-gray');
            } else {
                this.$actions.operator('action-copy-companions').removeClass('pointer-events-none text-gray');
            }

            if (checkedItems.length !== 1 || DatabaseManager.getLinkedIdentifiers(checkedItems[0]).length > 1) {
                this.$actions.operator('action-link').removeClass('pointer-events-none text-gray');
            } else {
                this.$actions.operator('action-link').addClass('pointer-events-none text-gray');
            }
        } else {
            this.$actions.hide();
        }
    }

    get #selection () {
        return this.$list.find('.checkbox input:checked').get().map((item) => item.dataset.checkboxId);
    }

    #clearSelection () {
        this.$list.find('.checkbox').checkbox('set unchecked');

        this.#refreshActions();
    }

    refresh () {
        this.$list.empty();

        this.#refreshActions();

        const latestPlayerTimestamp = this.empty ? DatabaseManager.Latest : DatabaseManager.LatestPlayer;
        const filteredEntries = this.entries.filter(group => {
            const visible = !DatabaseManager.isIdentifierHidden(group.Latest.LinkId);
            const own = group.Own;

            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override) && (this.empty || group.LatestDisplayTimestamp);
        });

        const items = [`
            <div class="column">
                <div class="ui basic grey inverted segment cursor-pointer !p-0 !border-radius-1 h-full gap-4 justify-content-center flex flex-col items-center" data-id="view-table" style="height: 270px;">
                    <div>
                        <i class="ui huge inverted table icon"></i>
                    </div>
                    <span>${intl('stats.guilds.browse')}</span>
                </div>
            </div>
        `];

        for (const group of filteredEntries) {
            items.push(`
                <div class="column">
                    <div class="ui basic ${latestPlayerTimestamp != (this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) ? 'red' : 'grey'} inverted segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.isIdentifierHidden(group.Latest.LinkId) ? 'opacity-50' : '' }" data-id="${ group.Latest.LinkId }" style="height: 270px;">
                        <span class="text-85% my-2">${ _formatDate(this.empty ? group.LatestTimestamp : group.LatestDisplayTimestamp) }</span>
                        <img class="ui image" src="res/group.png" width="173" height="173">
                        <h3 class="ui grey header !m-0 !mt-2">${ group.Latest.Prefix }</h3>
                        <h3 class="ui inverted header !mt-0 !mb-1">${ group.Latest.Name }</h3>
                        <div class="ui fitted checkbox" style="position: absolute; left: 0.5em; top: 0.5em;">
                            <input type="checkbox" data-checkbox-id="${group.Latest.LinkId}">
                        </div>
                    </div>
                </div>
            `)
        }

        this.loader.start(() => {
            const blockClickable = $(items.splice(0, 20).join('')).appendTo(this.$list).find('[data-id]').click(function (event) {
                if (event.target.closest('.checkbox')) {
                    return;
                } else if (event.ctrlKey) {
                    $(event.currentTarget).find('.checkbox').checkbox('toggle checked');
                } else {
                    const identifier = this.dataset.id;

                    if (identifier === 'view-table') {
                        UI.show(UI.groups);
                    } else {
                        UI.show(UI.group, { identifier });
                    }
                }
            })

            blockClickable.find('.checkbox').checkbox({
                onChange: () => this.#refreshActions()
            });

            if (items.length == 0) {
                this.loader.stop();
            }
        });
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Players View
class PlayersGridTab extends Tab {
    _prepareOption (operator, key, storeKey) {
        DOM.toggle({
            element: this.$parent.operator(operator).get(0),
            value: Site.options[storeKey],
            callback: (active) => {
                Site.options[storeKey] = (this[key] = active);
                this.show();
            }
        })

        return Site.options[storeKey];
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]');

        this.identifier = 'player';

        // Toggles
        this.hidden = this._prepareOption('show-hidden', 'hidden', 'players_hidden');
        this.others = this._prepareOption('show-other', 'others', 'players_other');
        
        // Observer
        this.loader = new DynamicLoader(this.$list.get(0));

        // Actions
        this.$actions = this.$parent.operator('actions');

        this.$actions.operator('action-unselect').click(() => {
            this.#clearSelection();
        })

        this.$actions.operator('action-hide').click(() => {
            for (const identifier of this.#selection) {
                DatabaseManager.hideIdentifier(identifier);
            }

            this.show();
        })

        this.$actions.operator('action-copy').click(() => {
            copyJSON(this.#selection.flatMap((identifier) => ModelUtils.toSimulatorData(DatabaseManager.getPlayer(identifier).Latest)));

            this.#clearSelection();
        })

        this.$actions.operator('action-copy-companions').click(() => {
            copyJSON(this.#selection.flatMap((identifier) => ModelUtils.toSimulatorData(DatabaseManager.getPlayer(identifier).Latest, true)));

            this.#clearSelection();
        })

        this.$actions.operator('action-share').click(() => {
            const selection = this.#selection;

            Dialog.open(
                ExportFileDialog,
                () => DatabaseManager.export(selection),
                'players'
            )

            this.#clearSelection();
        })

        this.$actions.operator('action-link').click(() => {
            Dialog.open(ManageLinkDialog, this.#selection).then(([value]) => {
                if (value) this.show();
            })

            this.#clearSelection();
        })

        this.$actions.operator('action-remove').click(() => {
            DatabaseManager.safeRemove({ identifiers: this.#selection }).then(([value]) => {
                if (value) this.show()
            })
        })

        // Filter
        this.$filter = this.$parent.operator('filter').searchfield(
            'create',
            _arrayToHash(
                ['c', 'p', 'g', 's', 'e', 'l', 'a', 'h', 'd'],
                k => [k, intl(`stats.filters.${k}`)]
            )
        ).change((event) => {
            var filter = $(event.currentTarget).val().split(/(?:\s|\b)(c|p|g|s|e|l|a|h|d):/);

            var terms = [
                {
                   test: function (arg, player) {
                       var matches = arg.reduce((total, term) => {
                           var subterms = term.split('|').map(rarg => rarg.trim());
                           for (var subterm of subterms) {
                               if (player.Name.toLowerCase().includes(subterm) || player.Prefix.toLowerCase().includes(subterm) || PLAYER_CLASS_SEARCH[player.Class].includes(subterm) || (player.hasGuild() && player.Group.Name.toLowerCase().includes(subterm))) {
                                   return total + 1;
                               }
                           }

                           return total;
                       }, 0);
                       return (matches == arg.length);
                   },
                   arg: filter[0].toLowerCase().split('&').map(rarg => rarg.trim())
                }
            ];

            this.hidden_override = false;
            this.others_override = false;

            for (var i = 1; i < filter.length; i += 2) {
                var key = filter[i];
                var arg = (filter[i + 1] || '').trim();

                if (key == 'c') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (PLAYER_CLASS_SEARCH[player.Class] == term) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'p') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'g') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.hasGuild() && player.Group.Name.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 's') {
                    terms.push({
                        test: (arg, player) => {
                            for (var term of arg) {
                                if (player.Prefix.toLowerCase().includes(term)) {
                                    return true;
                                }
                            }

                            return false;
                        },
                        arg: arg.toLowerCase().split('|').map(rarg => rarg.trim())
                    });
                } else if (key == 'l') {
                    terms.push({
                        test: (arg, player) => player.Timestamp == DatabaseManager.Latest,
                        arg: arg.toLowerCase()
                    });
                } else if (key == 'e') {
                    var ast = Expression.create(arg);
                    if (ast) {
                        terms.push({
                            test: (arg, player) => arg.eval(new ExpressionScope().with(player, player).addSelf(player)),
                            arg: ast
                        });
                    }
                } else if (key == 'a') {
                    this.hidden_override = true;
                    this.others_override = true;
                } else if (key == 'h') {
                    this.hidden_override = true;
                } else if (key == 'd') {
                    this.others_override = true;
                }
            }

            this.entries = [];

            for (var player of Object.values(DatabaseManager.Players)) {
                var hidden = DatabaseManager.isIdentifierHidden(player.Latest.LinkId);
                if (this.hidden || !hidden || this.hidden_override) {
                    var matches = true;
                    for (var term of terms) {
                        matches &= term.test(term.arg, player.Latest, player.LatestTimestamp);
                    }

                    if (matches) {
                        this.entries.push(player);
                    }
                }
            }

            this.entries.sort((a, b) => b.LatestTimestamp - a.LatestTimestamp);

            this.refresh();
        });
    }

    show () {
        let identitifiers = Object.keys(DatabaseManager.Players);
        if (Site.options.skip_grid_if_single_entry_present && identitifiers.length == 1) {
            UI.show(UI.player, { identifier: identitifiers[0] });
        } else {
            this.load();
        }
    }

    #refreshActions () {
        const checkedItems = this.#selection;

        if (checkedItems.length > 0) {
            this.$actions.show();

            if (checkedItems.length > 1) {
                this.$actions.operator('action-copy-companions').addClass('pointer-events-none text-gray');
            } else {
                this.$actions.operator('action-copy-companions').removeClass('pointer-events-none text-gray');
            }

            if (checkedItems.length !== 1 || DatabaseManager.getLinkedIdentifiers(checkedItems[0]).length > 1) {
                this.$actions.operator('action-link').removeClass('pointer-events-none text-gray');
            } else {
                this.$actions.operator('action-link').addClass('pointer-events-none text-gray');
            }
        } else {
            this.$actions.hide();
        }
    }

    get #selection () {
        return this.$list.find('.checkbox input:checked').get().map((item) => item.dataset.checkboxId);
    }

    #clearSelection () {
        this.$list.find('.checkbox').checkbox('set unchecked');

        this.#refreshActions();
    }

    refresh () {
        this.$list.empty();

        this.#refreshActions();

        const filteredEntries = this.entries.filter(player => {
            const visible = !DatabaseManager.isIdentifierHidden(player.Latest.LinkId);
            const own = player.Own;
            
            return (visible || this.hidden || this.hidden_override) && (own || this.others || this.others_override);
        })
        
        const items = [];
        for (const player of filteredEntries) {
            items.push(`
                <div class="column">
                    <div class="ui basic inverted ${DatabaseManager.Latest != player.LatestTimestamp ? 'red' : 'grey'} segment cursor-pointer !p-0 !border-radius-1 flex flex-col items-center ${ DatabaseManager.isIdentifierHidden(player.Latest.LinkId) ? 'opacity-50' : '' }" data-id="${ player.Latest.LinkId }" style="height: 270px;">
                        <span class="text-85% my-2">${ _formatDate(player.LatestTimestamp) }</span>
                        <img class="ui image" src="${_classImageUrl(player.Latest.Class)}" width="173" height="173">
                        <h3 class="ui grey header !m-0 !mt-2">${ player.Latest.Prefix }</h3>
                        <h3 class="ui inverted header !mt-0 !mb-1">${ player.Latest.Name }</h3>
                        <div class="ui fitted checkbox" style="position: absolute; left: 0.5em; top: 0.5em;">
                            <input type="checkbox" data-checkbox-id="${player.Latest.LinkId}">
                        </div>
                    </div>
                </div>
            `);
        }

        this.loader.start(() => {
            const blockClickable = $(items.splice(0, 20).join('')).appendTo(this.$list).find('[data-id]').click(function (event) {
                if (event.target.closest('.checkbox')) {
                    return;
                } else if (event.ctrlKey) {
                    $(event.currentTarget).find('.checkbox').checkbox('toggle checked');
                } else {
                    UI.show(UI.player, { identifier: this.dataset.id });
                }
            })

            blockClickable.find('.checkbox').checkbox({
                onChange: () => this.#refreshActions()
            });

            if (items.length == 0) {
                this.loader.stop();
            }
        });

        this.#refreshActions();
    }

    load () {
        this.$filter.trigger('change');
    }
}

// Files View
class FilesTab extends Tab {
    // Export all to json file
    exportAll () {
        Dialog.open(
            ExportFileDialog,
            () => DatabaseManager.export(),
            'files'
        );
    }

    // Export selected to cloud
    exportSelected () {
        if (this.simple) {
            if (this.selectedFiles.size === 0) return;

            Dialog.open(
                ExportFileDialog,
                () => DatabaseManager.export(undefined, this.selectedFiles),
                'files'
            );
        } else {
            if (this.selectedEntries.size === 0) return;

            const players = [];
            const groups = [];
            for (const entry of this.selectedEntries.values()) {
                if (DatabaseManager.isPlayer(entry.identifier)) {
                    players.push(entry);
                } else {
                    groups.push(entry);
                }
            }

            Dialog.open(
                ExportFileDialog,
                () => ({ players, groups: DatabaseManager.relatedGroupData(players, groups, Site.options.export_bundle_groups) }),
                'files'
            );
        }
    }

    tagSelected () {
        if (this.simple) {
            if (this.selectedFiles.size > 0) {
                Dialog.open(TagDialog, 'timestamps', Array.from(this.selectedFiles)).then(([value]) => {
                    if (value) this.show()
                });

                return;
            }
        } else if (this.selectedEntries.size > 0) {
            const playerEntries = Array.from(this.selectedEntries.values()).filter((player) => DatabaseManager.isPlayer(player.identifier));

            if (playerEntries.length > 0) {
                Dialog.open(TagDialog, 'instances', Array.from(this.selectedEntries.values())).then((value) => {
                    if (value) this.show()
                });

                return;
            }
        }

        // TODO: Allow tag background & color customization
    }

    // Delete all
    deleteAll () {
        Dialog.open(
            ConfirmationDialog,
            intl('dialog.delete_all.title'),
            intl('dialog.delete_all.notice'),
            true,
            2
        ).then(([value]) => {
            if (value) {
                Loader.toggle(true);
                DatabaseManager.purge().then(() => this.show());
            }
        })
    }

    // Delete selected
    deleteSelected () {
        if (this.simple) {
            if (this.selectedFiles.size > 0) {
                DatabaseManager.safeRemove({ timestamps: Array.from(this.selectedFiles) }).then(([value]) => {
                    if (value) this.show()
                });
            }
        } else if (this.selectedEntries.size > 0) {
            DatabaseManager.safeRemove({ instances: Array.from(this.selectedEntries.values()) }).then(([value]) => {
                if (value) this.show()
            });
        }
    }

    // Merge selected
    mergeSelected () {
        if (this.simple) {
            if (this.selectedFiles.size > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(Array.from(this.selectedFiles)).then(() => this.show());
            }
        } else {
            const timestamps = _uniq(Array.from(this.selectedEntries.values()).map(entry => entry.timestamp));
            if (timestamps.length > 1) {
                Loader.toggle(true);
                DatabaseManager.merge(timestamps).then(() => this.show());
            }
        }
    }

    // Hide selected
    hideSelected () {
        Loader.toggle(true);
        if (this.simple) {
            DatabaseManager.hideTimestamps(... Array.from(this.selectedFiles)).then(() => this.show());
        } else {
            DatabaseManager.hide(Array.from(this.selectedEntries.values())).then(() => this.show());
        }
    }

    hideMigrate () {
        Loader.toggle(true);
        DatabaseManager.migrateHiddenFiles().then(() => this.show());
    }

    // Import file via har
    importJson (fileEvent) {
        Loader.toggle(true, { progress: true });

        const files = Array.from(fileEvent.currentTarget.files);

        let filesDone = 0;
        let filesCount = files.length;

        DatabaseManager.importCollection(
            files,
            async (file) => {
                Loader.progress(++filesDone / filesCount);
                return {
                    text: await file.text(),
                    timestamp: file.lastModified
                }
            },
            (e) => {
                Toast.error(intl('database.import_error'), e.message);
                Logger.error(e, 'Error occured while trying to import a file!');
            }
        ).then(() => this.show());
    }

    // Import file via endpoint
    importEndpoint () {
        Dialog.open(EndpointDialog, false).then(([value]) => {
            if (value) this.show();
        });
    }

    // Import file via cloud
    importCloud () {
        Dialog.open(ImportFileDialog).then(([value]) => {
            if (value) this.show();
        });
    }

    // Prepare checkbox
    prepareCheckbox (property, name) {
        this.$parent.find(`[data-op="checkbox-${ name }"]`).checkbox({
            onChecked: () => { Site.options[property] = true },
            onUnchecked: () => { Site.options[property] = false }
        }).checkbox(Site.options[property] ? 'set checked' : 'set unchecked');
    }

    constructor (parent) {
        super(parent);

        this.$fileCounter = this.$parent.find('[data-op="selected-counter"]');

        this.$parent.find('[data-op="export"]').click(() => this.exportAll());
        this.$parent.find('[data-op="export-partial"]').click(() => this.exportSelected());
        this.$parent.find('[data-op="delete-all"]').click(() => this.deleteAll());
        this.$parent.find('[data-op="delete"]').click(() => this.deleteSelected());
        this.$parent.find('[data-op="merge"]').click(() => this.mergeSelected());
        this.$parent.find('[data-op="hide"]').click(() => this.hideSelected());
        this.$parent.find('[data-op="upload"]').change(event => this.importJson(event));
        this.$parent.find('[data-op="endpoint"]').click(() => this.importEndpoint());
        this.$parent.find('[data-op="shared"]').click(() => this.importCloud());

        this.$migrateHidden = this.$parent.find('[data-op="hide-migrate"]').click(() => this.hideMigrate());
        this.$tags = this.$parent.find('[data-op="tags"]').click(() => this.tagSelected());
        this.$filters = this.$parent.find('[data-op="filters"]');

        this.$resultsAdvanced = this.$parent.find('[data-op="files-search-results"]');
        this.$resultsSimple = this.$parent.find('[data-op="files-search-results-simple"]');

        this.$parent.find('[data-op="mark-all"]').click(() => this.markAll());

        this.$advancedCenter = this.$parent.find('[data-op="advanced-center"]');
        this.$simpleCenter = this.$parent.find('[data-op="simple-center"]');

        this.simpleLoader = new DynamicLoader(this.$simpleCenter.find('table').get(0));
        this.advancedLoader = new DynamicLoader(this.$advancedCenter.find('table').get(0));

        this.prepareCheckbox('advanced', 'advanced');
        Site.options.onChange('advanced', enabled => this.setLayout(enabled));

        this.prepareCheckbox('hidden', 'hidden');
        Site.options.onChange('hidden', async () => {
            await DatabaseManager.reloadHidden();
            this.show({ forceUpdate: true });
        });

        this.prepareCheckbox('export_public_only', 'export-public-only');
        this.prepareCheckbox('export_bundle_groups', 'export-bundle-groups');

        this.$tagFilter = this.$parent.find('[data-op="simple-tags"]');
        this.tagFilter = undefined;

        this.ExpressionConfig = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'players', 'groups', 'version', 'tags']) {
            this.ExpressionConfig.register('accessor', 'none', name, (object) => object[name]);
        }

        this.setLayout(Site.options.advanced, true);
    }

    setLayout (advanced, supressUpdate = false) {
        window.scrollTo({ top: 0 });

        this.$advancedCenter.toggle(advanced);
        this.$simpleCenter.toggle(!advanced);
        this.simple = !advanced;
        if (!supressUpdate) this.show({ forceUpdate: true });
    }

    markAll () {
        if (this.simple) {
            let filesToMark = [];
            let filesToIgnore = [];

            for (const timestamp of _intKeys(this.currentFiles)) {
                if (this.selectedFiles.has(timestamp)) {
                    filesToIgnore.push(timestamp);
                } else {
                    filesToMark.push(timestamp);
                }
            }

            let visibleEntries = _arrayToHash(this.$resultsSimple.find('td[data-timestamp]').toArray(), (el) => [el.dataset.timestamp, el.children[0]]);

            let noneToMark = _empty(filesToMark);
            if (noneToMark && !_empty(filesToIgnore)) {
                for (let timestamp of filesToIgnore) {
                    this.selectedFiles.delete(timestamp);

                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.remove('check');
                    }
                }
            } else if (!noneToMark) {
                for (let timestamp of filesToMark) {
                    this.selectedFiles.add(timestamp);

                    if (visibleEntries[timestamp]) {
                        visibleEntries[timestamp].classList.add('check');
                    }
                }
            }
        } else {
            let entriesToMark = [];
            let entriesToIgnore = [];

            for (let uuid of Object.keys(this.currentEntries)) {
                if (this.selectedEntries.has(uuid)) {
                    entriesToIgnore.push(uuid);
                } else {
                    entriesToMark.push(uuid);
                }
            }

            let visibleEntries = _arrayToHash(this.$resultsAdvanced.find('td[data-mark]').toArray(), (el) => [el.dataset.mark, el.children[0]]);

            let noneToMark = _empty(entriesToMark);
            if (noneToMark && !_empty(entriesToIgnore)) {
                for (let uuid of entriesToIgnore) {
                    this.selectedEntries.delete(uuid);

                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.remove('check');
                    }
                }
            } else if (!noneToMark) {
                for (let uuid of entriesToMark) {
                    this.selectedEntries.set(uuid, this.currentEntries[uuid]);

                    if (visibleEntries[uuid]) {
                        visibleEntries[uuid].classList.add('check');
                    }
                }
            }
        }

        this.updateSelectedCounter();
    }

    updateSelectedCounter () {
        if (this.simple) {
            this.$fileCounter.html(this.selectedFiles.size === 0 ? intl('stats.files.selected.no') : this.selectedFiles.size);
        } else {
            this.$fileCounter.html(this.selectedEntries.size === 0 ? intl('stats.files.selected.no') : this.selectedEntries.size);
        }
    }

    updateEntrySearchResults () {
        this.updateSelectedCounter();

        const prefixes = this.$filter_prefix.dropdown('get value');
        const group_identifiers = this.$filter_group.dropdown('get value').map(value => value !== '0' ? value : undefined);
        const player_identifiers = this.$filter_player.dropdown('get value');
        const timestamps = this.$filter_timestamp.dropdown('get value').map(value => parseInt(value));
        const ownership = parseInt(this.$filter_ownership.dropdown('get value'));
        const hidden = this.$filter_hidden.dropdown('get value');
        const hidden_allowed = Site.options.hidden;
        const tags = this.$filter_tags.dropdown('get value');
        const type = parseInt(this.$filter_type.dropdown('get value'));

        const { players, groups } = DatabaseManager.getFile(null, null, (data) => {
            const isPlayer = DatabaseManager.isPlayer(data.identifier);

            const conditions = [
                // Prefix
                prefixes.length === 0 || prefixes.includes(data.prefix),
                // Player identifier
                player_identifiers.length === 0 || (isPlayer && player_identifiers.includes(DatabaseManager.getLink(data.identifier))),
                // Group identifiers
                group_identifiers.length === 0 || group_identifiers.includes(DatabaseManager.getLink(isPlayer ? data.group : data.identifier)),
                // Timestamps
                timestamps.length === 0 || timestamps.includes(data.timestamp),
                // Tags
                tags.length === 0 || _wrapOrEmpty(data.tag).some((tag) => tags.includes(tag)),
                // Ownership
                !ownership || data.own != ownership - 1,
                // Type
                !type || isPlayer != type - 1,
                // Hidden
                !hidden_allowed || hidden.length === 0 || (data.hidden && hidden.includes('yes')) || (!data.hidden && hidden.includes('no'))
            ];

            return conditions.reduce((acc, condition) => acc && condition, true);
        })

        const entries = players.concat(groups);

        // Save into current list
        this.currentEntries = entries.reduce((memo, entry) => {
            memo[_uuid(entry)] = entry;
            return memo;
        }, {});

        const displayEntries = entries.sort((a, b) => b.timestamp - a.timestamp).map((entry) => {
            const isPlayer = DatabaseManager.isPlayer(entry.identifier);

            return `
                <tr data-tr-mark="${_uuid(entry)}" ${entry.hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-mark="${_uuid(entry)}"><i class="square outline icon"></i></td>
                    <td class="!text-center">${ this.timeMap[entry.timestamp] }</td>
                    <td class="!text-center">${ this.prefixMap[entry.prefix] }</td>
                    <td class="!text-center"><i class="ui ${isPlayer ? 'blue user' : 'orange users'} icon"></i></td>
                    <td>${ entry.name }</td>
                    <td>${ isPlayer ? (this.groupMap[entry.group] || '') : '' }</td>
                    <td class="flex gap-1 flex-wrap">${ _wrapOrEmpty(entry.tag).map((tag) => `<div class="ui horizontal label" style="background-color: ${_strToHSL(tag)}; color: white; margin: 0;">${tag}</div>`).join('') }</td>
                </tr>
            `
        });

        this.$resultsAdvanced.empty();

        this.advancedLoader.start(() => {
            $(displayEntries.splice(0, 25).join('')).appendTo(this.$resultsAdvanced).find('[data-mark]').click((event) => {
                let uuid = event.currentTarget.dataset.mark;

                if (event.shiftKey && this.lastSelectedEntry && this.lastSelectedEntry != uuid) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-mark="${this.lastSelectedEntry}"]`);
                    const $endSelector = $(`tr[data-tr-mark="${uuid}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ uuid, this.lastSelectedEntry ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(obj.dataset.trMark);
                    }

                    // Change all timestamps
                    if (this.selectedEntries.has(uuid)) {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).removeClass('check');
                            this.selectedEntries.delete(mark);
                        }
                    } else {
                        for (const mark of toChange) {
                            $(`[data-mark="${mark}"] > i`).addClass('check');
                            this.selectedEntries.set(mark, this.currentEntries[mark]);
                        }
                    }
                } else {
                    if ($(`[data-mark="${uuid}"] > i`).toggleClass('check').hasClass('check')) {
                        this.selectedEntries.set(uuid, this.currentEntries[uuid]);
                    } else {
                        this.selectedEntries.delete(uuid);
                    }
                }

                this.lastSelectedEntry = uuid;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedEntries.has(element.dataset.mark)) {
                    element.children[0].classList.add('check');
                }
            });

            if (displayEntries.length == 0) {
                this.advancedLoader.stop();
            }
        });
    }

    updateFileSearchResults () {
        let currentFilesAll = (Site.options.groups_empty ? Array.from(DatabaseManager.Timestamps.keys()) : DatabaseManager.PlayerTimestamps).map((ts) => {
            let playerCount = 0;
            let groupCount = 0;

            for (const id of DatabaseManager.Timestamps.values(ts)) {
                if (DatabaseManager.isPlayer(id)) {
                    playerCount++;
                } else {
                    groupCount++;
                }
            }

            return {
                timestamp: ts,
                prettyDate: _formatDate(ts),
                playerCount,
                groupCount,
                version: DatabaseManager.findDataFieldFor(ts, 'version'),
                tags: (() => {
                    const tagMap = DatabaseManager.getTagsForTimestamp([ts]);
                    const tagEntries = _sortDesc(Object.entries(tagMap), ([, a]) => a);

                    let tagContent = '';
                    for (const [name, count] of tagEntries) {
                        const countText = count !== (playerCount + groupCount) ? `${count}x ` : '';

                        tagContent += `
                            <div class="ui horizontal label" style="background-color: ${_strToHSL(name)}; color: white; margin: 0;">${countText}${name}</div>
                        `;
                    }

                    return {
                        tagList: Object.keys(tagMap),
                        tagContent
                    };
                })()
            }
        }).filter(({ tags: { tagList } }) => {
            return typeof this.tagFilter === 'undefined' || tagList.includes(this.tagFilter) || (tagList.length === 0 && this.tagFilter === '');
        });

        if (this.expressionFilter && this.expressionFilter.isValid()) {
            currentFilesAll = currentFilesAll.filter(({ tags: { tagList }, timestamp, version }) => {
                return this.expressionFilter.eval(new ExpressionScope().addSelf(
                    Object.assign(
                        DatabaseManager.getFile(null, [ timestamp ]),
                        {
                            timestamp,
                            version,
                            tags: tagList
                        }
                    )
                ));
            });
        }

        this.currentFiles = _arrayToHash(currentFilesAll, file => [file.timestamp, file]);
        this.$resultsSimple.empty();

        const entries = _sortDesc(Object.entries(this.currentFiles), v => v[0]).map(([timestamp, { prettyDate, playerCount, groupCount, version, tags: { tagContent } }]) => {
            const hidden = DatabaseManager.isHidden({ timestamp });

            return `
                <tr data-tr-timestamp="${timestamp}" ${hidden ? 'style="color: gray;"' : ''}>
                    <td class="cursor-pointer !text-center" data-timestamp="${timestamp}"><i class="square outline icon"></i></td>
                    <td class="!text-center">${ prettyDate }</td>
                    <td class="!text-center">${ playerCount }</td>
                    <td class="!text-center">${ groupCount }</td>
                    <td class="flex gap-1 flex-wrap">${ tagContent }</td>
                    <td class="!text-center">${ version || 'Not known' }</td>
                    <td class="!text-center"></td>
                    <td class="cursor-pointer !text-center" data-edit="${timestamp}"><i class="wrench icon"></i></td>
                </tr>
            `;
        });

        this.simpleLoader.start(() => {
            let $entries = $(entries.splice(0, 25).join('')).appendTo(this.$resultsSimple);

            $entries.find('[data-timestamp]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.timestamp);

                if (event.shiftKey && this.lastSelectedTimestamp && this.lastSelectedTimestamp != timestamp) {
                    // Elements
                    const $startSelector = $(`tr[data-tr-timestamp="${this.lastSelectedTimestamp}"]`);
                    const $endSelector = $(`tr[data-tr-timestamp="${timestamp}"]`);
                    // Element indexes
                    const startSelectorIndex = $startSelector.index();
                    const endSelectorIndex = $endSelector.index();
                    const selectDown = startSelectorIndex < endSelectorIndex;
                    const elementArray = selectDown ? $startSelector.nextUntil($endSelector) : $endSelector.nextUntil($startSelector);
                    // Get list of timestamps to be changed
                    const toChange = [ timestamp, this.lastSelectedTimestamp ];
                    for (const obj of elementArray.toArray()) {
                        toChange.push(parseInt(obj.dataset.trTimestamp));
                    }

                    // Change all timestamps
                    if (this.selectedFiles.has(timestamp)) {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).removeClass('check');
                            this.selectedFiles.delete(ts);
                        }
                    } else {
                        for (const ts of toChange) {
                            $(`[data-timestamp="${ts}"] > i`).addClass('check');
                            this.selectedFiles.add(ts);
                        }
                    }
                } else {
                    if ($(`[data-timestamp="${timestamp}"] > i`).toggleClass('check').hasClass('check')) {
                        this.selectedFiles.add(timestamp);
                    } else {
                        this.selectedFiles.delete(timestamp);
                    }
                }

                this.lastSelectedTimestamp = timestamp;
                this.updateSelectedCounter();
            }).each((index, element) => {
                if (this.selectedFiles.has(parseInt(element.dataset.timestamp))) {
                    element.children[0].classList.add('check');
                }
            });

            $entries.find('[data-edit]').click((event) => {
                const timestamp = parseInt(event.currentTarget.dataset.edit);
                Dialog.open(FileEditDialog, timestamp).then(([value]) => {
                    if (value) this.show()
                });
            });

            if (entries.length == 0) {
                this.simpleLoader.stop();
            }
        });
    }

    updateTagFilterButtons () {
        const selector = `[data-tag="${ typeof this.tagFilter === 'undefined' ? '*' : this.tagFilter }"]`;

        this.$tagFilter.find('[data-tag]').addClass('basic inverted').css('color', '').css('background-color', '');

        const $tag = this.$tagFilter.find(selector);
        if ($tag.length > 0) {
            $tag.removeClass('basic inverted');

            if ($tag.data('color')) {
                $tag.css('background-color', $tag.data('color')).css('color', 'white');
            }
        }
    }

    updateFileList () {
        // Tag filters
        let currentTags = Object.keys(DatabaseManager.getTagsForTimestamp());
        if (currentTags.length > 1 || (currentTags.length == 1 && currentTags[0] !== 'undefined')) {
            let content = `
                <div data-tag="*" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.all')}</div>
                <div data-tag="" class="ui basic inverted tiny button" style="margin-bottom: 0.5rem;">${intl('stats.files.tags.none')}</div>
            `;

            for (const name of currentTags) {
                if (name !== 'undefined') {
                    content += `
                        <div data-tag="${name}" class="ui basic inverted tiny button" data-color="${_strToHSL(name)}" style="margin-bottom: 0.5rem">${name}</div>
                    `;
                }
            }

            this.$tagFilter.html(content);
            this.$tagFilter.show();

            if (this.tagFilter !== '' && this.tagFilter !== undefined && !currentTags.includes(this.tagFilter)) {
                this.tagFilter = undefined;
            }

            this.updateTagFilterButtons();

            this.$parent.find('[data-tag]').click((event) => {
                const tag = event.currentTarget.dataset.tag;
                const tagToFilter = tag === '*' ? undefined : tag;

                if (tagToFilter !== this.tagFilter) {
                    this.tagFilter = tagToFilter;

                    this.updateTagFilterButtons();
                    this.updateFileSearchResults();
                } else if (typeof tagToFilter !== 'undefined') {
                    this.$parent.find('[data-tag="*"]').click();
                }
            });
        } else {
            this.$tagFilter.hide();
            this.tagFilter = undefined;
        }

        // Expression filter
        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.expression')}</label>
                <div class="ta-editor">
                    <div class="ui inverted input">
                        <input class="ta-editor-textarea" style="padding-left: 1em !important;" type="text" placeholder="${intl('stats.files.filters.expression_placeholder')}">
                    </div>
                    <div class="ta-editor-overlay" style="width: 100%; margin-top: 0.75em; margin-left: 1em;"></div>
                </div>
            </div>
        `);

        let $field = this.$filters.find('.ta-editor-textarea');
        let $parent = $field.closest('.field');

        $field.on('input change', (event) => {
            let content = event.currentTarget.value;

            this.expressionFilter = Expression.create(content);
            this.$filters.find('.ta-editor-overlay').html(
                Highlighter.expression(content, undefined, this.ExpressionConfig).text
            );

            if (!content || this.expressionFilter) {
                $parent.removeClass('error');
            } else {
                $parent.addClass('error');
            }

            if (event.type === 'change') {
                this.updateFileSearchResults();
            }
        }).val(this.expressionFilter ? this.expressionFilter.string : '').trigger('change');
    }

    updateEntryLists () {
        this.prefixMap = _arrayToHash(DatabaseManager.Prefixes, (prefix) => [prefix, _formatPrefix(prefix)]);
        this.timeMap = _arrayToHash(Array.from(DatabaseManager.Timestamps.keys()), (ts) => [ts, _formatDate(ts)]);
        this.playerMap = DatabaseManager.PlayerNames;
        this.groupMap = Object.assign({ 0: intl('stats.files.filters.none') }, DatabaseManager.GroupNames);

        this.timeArray = Object.entries(this.timeMap).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
        this.tagsArray = Object.keys(DatabaseManager.getTagsForTimestamp()).filter(tag => tag !== 'undefined');

        const playerNameFrequency = {};
        for (const name of Object.values(this.playerMap)) {
            if (name in playerNameFrequency) {
                playerNameFrequency[name]++;
            } else {
                playerNameFrequency[name] = 1;
            }
        }

        const groupNameFrequency = {};
        for (const [id, name] of Object.entries(this.groupMap)) {
            if (id == '0') {
                // 0 is a placeholder, ignore it
                continue;
            } else if (name in groupNameFrequency) {
                groupNameFrequency[name]++;
            } else {
                groupNameFrequency[name] = 1;
            }
        }

        this.$filters.html(`
            <div class="field">
                <label>${intl('stats.files.filters.type')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-type">
                    <option value="0">${intl('stats.files.filters.any')}</option>
                    <option value="1">${intl('stats.files.filters.player')}</option>
                    <option value="2">${intl('stats.files.filters.group')}</option>
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.timestamp')} (<span data-op="unique-timestamp"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-timestamp">
                    ${ this.timeArray.map(([timestamp, value]) => `<option value="${ timestamp }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.player')} (<span data-op="unique-player"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-player">
                    ${ Object.entries(this.playerMap).map(([identifier, name]) => `<option value="${ identifier }">${ name }${ playerNameFrequency[name] > 1 ? ` - ${_formatPrefix(identifier)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.group')} (<span data-op="unique-group"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-group">
                    ${ Object.entries(this.groupMap).map(([identifier, name]) => `<option value="${ identifier }">${ name }${ groupNameFrequency[name] > 1 ? ` - ${_formatPrefix(identifier)}` : '' }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.prefix')} (<span data-op="unique-prefix"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-prefix">
                    ${ Object.entries(this.prefixMap).map(([prefix, value]) => `<option value="${ prefix }">${ value }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.tags')} (<span data-op="unique-tags"></span> ${intl('stats.files.filters.n_unique')})</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-tags">
                    <option value="undefined">${intl('stats.files.tags.none')}</option>
                    ${ this.tagsArray.map((tag) => `<option value="${ tag }">${ tag }</option>`).join('') }
                </select>
            </div>
            <div class="field">
                <label>${intl('stats.files.filters.ownership')}</label>
                <select class="ui fluid search selection inverted dropdown" data-op="files-search-ownership">
                    <option value="0">${intl('stats.files.filters.ownership_all')}</option>
                    <option value="1">${intl('stats.files.filters.ownership_own')}</option>
                    <option value="2">${intl('stats.files.filters.ownership_other')}</option>
                </select>
            </div>
            <div class="field" ${ Site.options.hidden ? '' : 'style="display: none;"' }>
                <label>${intl('stats.files.filters.hidden')}</label>
                <select class="ui fluid search selection inverted dropdown" multiple="" data-op="files-search-hidden">
                    <option value="yes">${intl('general.yes')}</option>
                    <option value="no">${intl('general.no')}</option>
                </select>
            </div>
        `);

        this.$filter_timestamp = this.$parent.find('[data-op="files-search-timestamp"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_player = this.$parent.find('[data-op="files-search-player"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_group = this.$parent.find('[data-op="files-search-group"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_prefix = this.$parent.find('[data-op="files-search-prefix"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_hidden = this.$parent.find('[data-op="files-search-hidden"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_tags = this.$parent.find('[data-op="files-search-tags"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this),
            placeholder: intl('stats.files.filters.any')
        });

        this.$filter_ownership = this.$parent.find('[data-op="files-search-ownership"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$filter_type = this.$parent.find('[data-op="files-search-type"]').dropdown({
            onChange: this.updateEntrySearchResults.bind(this)
        });

        this.$parent.find('[data-op="unique-timestamp"]').html(Object.keys(this.timeMap).length);
        this.$parent.find('[data-op="unique-player"]').html(Object.keys(this.playerMap).length);
        this.$parent.find('[data-op="unique-group"]').html(Object.keys(this.groupMap).length - 1);
        this.$parent.find('[data-op="unique-prefix"]').html(Object.keys(this.prefixMap).length);
        this.$parent.find('[data-op="unique-tags"]').html(this.tagsArray.length);

        this.updateEntrySearchResults();
    }

    show (params) {
        this.selectedEntries = new Map();
        this.selectedFiles = new Set();

        this.lastSelectedTimestamp = null;
        this.lastSelectedEntry = null;

        Loader.toggle(false);

        this.$migrateHidden.toggle(!this.simple && Site.options.hidden);

        // Set counters
        if (this.lastChange != DatabaseManager.LastChange || (params && params.forceUpdate)) {
            this.lastChange = DatabaseManager.LastChange;
            if (this.simple) {
                this.updateFileList();
            } else {
                this.updateEntryLists();
            }
        } else {
            this.$resultsAdvanced.find('[data-mark] > i').removeClass('check');
            this.$resultsSimple.find('[data-timestamp] > i').removeClass('check');
        }

        this.updateSelectedCounter();
    }
}

class ScriptsTab extends Tab {
    constructor (parent) {
        super(parent);

        // Left sidebar
        this.$list = this.$parent.operator('list');
        this.$script = this.$parent.operator('script');

        this.$listSearch = this.$parent.operator('list-search');
        this.$listSearch.on('input', () => {
            this.#updateSearch();
        })

        this.$target = this.$parent.operator('target');

        // Right sidebar
        this.$helpWiki = this.$parent.operator('help-wiki');
        this.$helpWiki.click(() => {
            window.open('https://github.com/HafisCZ/sf-tools/wiki', '_blank');
        });

        this.$helpManual = this.$parent.operator('help-manual');
        this.$helpManual.click(() => {
            Dialog.open(ScriptManualDialog);
        });

        this.$helpShortcuts = this.$parent.operator('help-shortcuts');
        this.$helpShortcuts.click(() => {
            Dialog.open(EditorShortcutsDialog);
        });

        this.$libraryScripts = this.$parent.operator('library-scripts');
        this.$libraryScripts.click(() => {
            Dialog.open(ScriptRepositoryDialog).then(([value, key]) => {
                if (value) {
                    this.hide();
                    this.#setScript(key);
                    this.#updateSidebars();
                }
            })
        });
 
        // Actions
        this.$copy = this.$parent.operator('copy');
        this.$copy.click(() => {
            copyText(this.editor.content);
        });

        this.$edit = this.$parent.operator('edit');
        this.$edit.click(() => {
            Dialog.open(ScriptEditDialog, this.script, null).then(([value, script]) => {
                if (value) {
                    this.script = Scripts.update(this.script.key, script);

                    this.#updateSidebars();
                }
            });
        });

        this.$export = this.$parent.operator('export');
        this.$export.click(() => {
            Exporter.txt(this.editor.content, `script_${Exporter.time}`);
        });

        this.$import = this.$parent.operator('import');
        this.$import.change(async (event) => {
            const text = await _dig(event, 'currentTarget', 'files', 0).text();
 
            this.editor.content = text;
        });

        this.$remoteManage = this.$parent.operator('remote-manage');

        this.$remoteAdd = this.$parent.operator('remote-add');
        this.$remoteAdd.click(() => {
            if (this.#verifyRemoteRequirements()) return;

            Loader.toggle(true);

            const { key, name, version, description, content } = this.script;

            SiteAPI.post('script_create', { name, description, version, author: Site.options.script_author, content }).then(({ script }) => {
                this.script = Scripts.markRemote(key, script);
        
                StoreCache.invalidate('remote_scripts');
        
                Scripts.remoteAdd(script.key, { version: script.version, updated_at: Date.parse(script.updated_at) });

                this.#updateSidebars();
            }).catch(({ error }) => {
                Toast.error(intl('stats.scripts.remote_action_error'), error);
            }).finally(() => {
                Loader.toggle(false);
            });
        });

        this.$remoteUpdate = this.$parent.operator('remote-update');
        this.$remoteUpdateAvailable = this.$parent.operator('remote-update-available');

        this.$remoteUpdate.click(() => {
            if (this.#verifyRemoteRequirements()) return;

            Loader.toggle(true);

            const { key, name, version, description, content, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

            SiteAPI.post('script_update', { name, description, version, author: Site.options.script_author, content, key: remoteKey, secret: remoteSecret }).then(({ script }) => {
                this.script = Scripts.markRemote(key, script);

                StoreCache.invalidate('remote_scripts');

                Scripts.remoteAdd(script.key, { version: script.version, updated_at: Date.parse(script.updated_at) });

                this.#updateSidebars();
            }).catch(({ error }) => {
                Toast.error(intl('stats.scripts.remote_action_error'), error);
            }).finally(() => {
                Loader.toggle(false);
            });
        })

        this.$remoteRemove = this.$parent.operator('remote-remove');
        this.$remoteRemove.click(() => {
            Dialog.open(
                ConfirmationDialog,
                intl('dialog.delete_remote_script.title'),
                intl(`dialog.delete_remote_script.message`)
            ).then(([value]) => {
                if (value) {
                    Loader.toggle(true);

                    const { key, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

                    SiteAPI.get('script_delete', { key: remoteKey, secret: remoteSecret }).then(() => {
                        this.script = Scripts.markRemote(key);
                
                        StoreCache.invalidate('remote_scripts');
                
                        Scripts.remoteRemove(remoteKey);

                        this.#updateSidebars();
                    }).catch(({ error }) => {
                        Toast.error(intl('stats.scripts.remote_action_error'), error);
                    }).finally(() => {
                        Loader.toggle(false);
                    });
                }
            })
        });

        this.$remoteRefresh = this.$parent.operator('remote-refresh');
        this.$remoteRefresh.click(() => {
            Loader.toggle(true);

            const { key, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

            SiteAPI.get('script_info', { key: remoteKey, secret: remoteSecret }).then(({ script }) => {
                Scripts.markRemote(key, script);

                StoreCache.invalidate('remote_scripts');

                this.#updateSidebars();
            }).catch(({ error }) => {
                Toast.error(intl('stats.scripts.remote_action_error'), error);
            }).finally(() => {
                Loader.toggle(false);
            });
        })

        this.$remoteRequestPublic = this.$parent.operator('remote-visibility-public');
        this.$remoteRequestPublic.click(() => {
            const callback = ([value]) => {
                if (value) {
                    Loader.toggle(true);

                    const { key, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

                    SiteAPI.post('script_update', { key: remoteKey, secret: remoteSecret, visibility: 'public' }).then(({ script }) => {
                        Scripts.markRemote(key, script);

                        StoreCache.invalidate('remote_scripts');

                        this.#updateSidebars();
                    }).catch(({ error }) => {
                        Toast.error(intl('stats.scripts.remote_action_error'), error);
                    }).finally(() => {
                        Loader.toggle(false);
                    });
                }
            }

            if (this.script.remote.verified) {
                callback([true]);
            } else {
                Dialog.open(
                    ConfirmationDialog,
                    intl('dialog.remote_script_verification.title'),
                    intl(`dialog.remote_script_verification.message`),
                    true
                ).then(callback);
            }
        })

        this.$remoteRequestPrivate = this.$parent.operator('remote-visibility-private');
        this.$remoteRequestPrivate.click(() => {
            Loader.toggle(true);

            const { key, remote: { key: remoteKey, secret: remoteSecret } } = this.script;

            SiteAPI.post('script_update', { key: remoteKey, secret: remoteSecret, visibility: 'private' }).then(({ script }) => {
                Scripts.markRemote(key, script);

                StoreCache.invalidate('remote_scripts');

                this.#updateSidebars();
            }).catch(({ error }) => {
                Toast.error(intl('stats.scripts.remote_action_error'), error);
            }).finally(() => {
                Loader.toggle(false);
            });
        })

        // Archive
        this.$libraryArchive = this.$parent.operator('library-archive');
        this.$libraryArchive.click((event) => {
            if (event.ctrlKey && this.#hasArchivedPreviousVersion()) {
                this.editor.content = ScriptArchive.find('overwrite', this.script.key, this.script.version - 1).content;

                this.#updateSidebars();
            } else {
                Dialog.open(ScriptArchiveDialog).then(([value, content]) => {
                    if (value) {
                        if (content === true) {
                            this.#updateSidebars();
                        } else {
                            this.editor.content = content;
                        }
                    }
                })
            }
        });

        // Button handling
        this.$close = this.$parent.operator('close');
        this.$close.click(() => {
            this.returnTo();
        });

        this.$reset = this.$parent.operator('reset');
        this.$reset.click(() => {
            this.hide();
            this.show({ key: this.script.key });
        });

        this.$save = this.$parent.operator('save');
        this.$save.click((event) => {
            this.#saveScript(event.ctrlKey);
        });

        this.$remove = this.$parent.operator('remove');
        this.$remove.click(() => {
            const assignments = Scripts.getAssigns(this.script.key).map((identifier) => {
                if (DatabaseManager.isPlayer(identifier)) {
                    return DatabaseManager.PlayerNames[identifier] ?? identifier;
                } else if (DatabaseManager.isGroup(identifier)) {
                    return DatabaseManager.GroupNames[identifier] ?? identifier;
                } else {
                    return identifier;
                }
            });

            Dialog.open(
                ConfirmationDialog,
                intl('dialog.delete_script.title'),
                intl('dialog.delete_script.notice') + (this.script.remote ? intl('dialog.delete_script.notice_bonus_remote') : '') + (assignments.length > 0 ? intl('dialog.delete_script.notice_bonus_used', { tables: assignments.join(', ') }) : '')
            ).then(([value]) => {
                if (value) {
                    this.remove();
                }
            })
        });

        this.editor = new ScriptEditor(this.$parent.operator('editor').get(0), ScriptType.Table);

        this.editor.subscribe('change', (val) => {
            if (this.script) {
                this.#contentChanged(val !== this.script.content);
            } else {
                this.#contentChanged(val !== '');
            }
        })
        
        this.editor.subscribe('ctrl+s', () => {
            this.#saveScript(false);
        })

        this.editor.subscribe('ctrl+shift+s', () => {
            this.#saveScript(true);
        })

        // React to CTRL presses
        this.ctrlDown = false;
        this.#updateButtons();

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Control' && !this.ctrlDown) {
                this.ctrlDown = true;
                this.#updateButtons();
            } else if (event.key === 'Escape' && UI.current === this && !DialogController.dialogOpen && this.returnTo) {
                this.hide();
                this.returnTo();
            }
        });

        window.addEventListener('keyup', (event) => {
            if (event.key === 'Control' && this.ctrlDown) {
                this.ctrlDown = false;
                this.#updateButtons();
            }
        });

        this.$script.click((event) => {
            if (event.target && event.target.dataset.op === 'remote-copy') {
                copyText(event.target.innerText);

                Toast.info(intl('stats.scripts.remote_copy_toast.title'), intl('stats.scripts.remote_copy_toast.message'));
            }
        })

        this.$assign = this.$parent.operator('assign');
        this.$assign.click(() => {
            Scripts.assign(this.target, this.script.key);

            this.#updateSidebars();
        })

        this.$unassign = this.$parent.operator('unassign');
        this.$unassign.click(() => {
            Scripts.unassign(this.target);

            this.#updateSidebars();
        })
    }

    #verifyRemoteRequirements () {
        if (Site.options.script_author) {
            return false;
        } else {
            Toast.warn(intl('stats.scripts.remote_author_missing.title'), intl('stats.scripts.remote_author_missing.message'));

            return true;
        }
    }

    #saveScript (allowReturn) {
        if (this.$save.hasClass('disabled')) {
            return;
        }

        if (this.script) {
            this.save();
    
            if (allowReturn && this.returnTo) {
                this.returnTo();
            }
        } else {
            Dialog.open(ScriptEditDialog, { content: this.editor.content }, '_current').then(([value, script]) => {
                if (value) {
                    this.script = Scripts.create(script);

                    if (this.target) {
                        Scripts.assign(this.target, this.script.key);
                    }
    
                    this.#updateSidebars();
                    this.#contentChanged(false);
    
                    if (allowReturn && this.returnTo) {
                        this.returnTo();
                    }
                }
            })
        }
    }

    #updateScript () {
        if (this.script) {
            const { name, description, version, remote, updated_at } = this.script;
            
            this.$script.html(`
                <div>
                    <div class="wrap-none overflow-hidden text-overflow-ellipsis font-bold" title="${_escape(name)}">${_escape(name)}</div>
                    <div class="text-gray text-overflow-ellipsis-2-line wrap-pre mt-2" title="${_escape(description || '')}">${_escape(description || '')}</div>
                </div>
                <div class="text-gray flex justify-content-between">
                    <div><i class="ui desktop icon"></i> v${version} - ${_formatDate(updated_at)}</div>
                    <div>${remote ? `<i class="icons" title="${intl(remote.verified ? 'stats.scripts.tooltip.remote_verified' : 'stats.scripts.tooltip.remote')}"><i class="ui satellite dish icon"></i>${remote.verified ? '<i class="ui green bottom right corner check icon" style="text-shadow: none;"></i>' : ''}</i> <span title="${intl('stats.scripts.tooltip.remote_copy')}" data-op="remote-copy" class="select-none font-monospace cursor-pointer" style="line-height: 14px;">${remote.key}</span>` : ''}</div>
                </div>
            `)
        } else {
            this.$script.empty()
        }
    }

    #updateButtons () {
        if (UI.current !== this) {
            return;
        }

        if (this.ctrlDown && this.returnTo) {
            this.$save.find('i').removeClass('save').addClass('reply');
        } else {
            this.$save.find('i').removeClass('reply').addClass('save');
        }

        if (this.ctrlDown && this.#hasArchivedPreviousVersion()) {
            this.$libraryArchive.find('i').removeClass('archive').addClass('box open');

            const version = this.script.version - 1;
            this.$libraryArchive.find('span').text(intl('stats.scripts.sidebar.recover', { version }));
        } else {
            this.$libraryArchive.find('i').addClass('archive').removeClass('box open');
            this.$libraryArchive.find('span').text(intl('stats.scripts.sidebar.archive'));
        }

        if (this.returnTo && this.targetExplicit) {
            this.$target.addClass('disabled');
        } else {
            this.$target.removeClass('disabled');
        }

        if (this.script) {
            this.$remove.removeClass('disabled');
            this.$edit.removeClass('disabled');

            if (this.target) {
                if (Scripts.isAssignedTo(this.target, this.script.key)) {
                    this.$assign.hide();
                    this.$unassign.show();
                } else {
                    this.$assign.show().removeClass('disabled');
                    this.$unassign.hide();
                }
            } else {
                this.$assign.show().addClass('disabled');
                this.$unassign.hide();
            }

            if (this.script.remote) {
                this.$remoteManage.removeClass('disabled');

                if (this.script.remote.version !== this.script.version) {
                    this.$remoteUpdate.removeClass('disabled');
                    this.$remoteUpdateAvailable.show();
                } else {
                    this.$remoteUpdate.addClass('disabled');
                    this.$remoteUpdateAvailable.hide();
                }

                if (this.script.remote.visibility === 'public') {
                    this.$remoteRequestPublic.hide();
                    this.$remoteRequestPrivate.show();
                } else {
                    this.$remoteRequestPrivate.hide();
                    this.$remoteRequestPublic.show();
                }

                this.$remoteAdd.hide();
                this.$remoteManage.show();
            } else {
                this.$remoteAdd.show().removeClass('disabled');
                this.$remoteManage.hide();
            }
        } else {
            this.$remove.addClass('disabled');
            this.$edit.addClass('disabled');

            this.$remoteAdd.show().addClass('disabled');
            this.$remoteManage.hide();

            this.$assign.show().addClass('disabled');
            this.$unassign.hide();
        }
    }

    #hasArchivedPreviousVersion () {
        return this.script && this.script.version > 1 && ScriptArchive.find('overwrite', this.script.key, this.script.version - 1);
    }

    remove () {
        Scripts.remove(this.script.key);

        if (Scripts.isAssignedTo(this.target, this.script.key)) {
            Scripts.unassign(this.target);

            if (this.returnTo) {
                this.returnTo();
            } else {
                this.show({ identifier: this.target, blank: true });
            }
        } else {
            this.show({ identifier: this.target, blank: true });
        }
    }

    show ({ origin, identifier, blank, key }) {
        if ([UI.players, UI.groups, UI.groups_grid, UI.group, UI.players_grid, UI.player].includes(origin)) {
            this.returnTo = () => UI.returnTo(origin);
        } else if (typeof origin !== 'undefined') {
            this.returnTo = null;
        }

        this.script = null;

        if (typeof key !== 'undefined') {
            this.#setScript(key);
        } else {
            this.targetExplicit = typeof identifier !== 'undefined';
            this.target = identifier || _dig(origin, 'identifier');

            if (this.target && blank !== true) {
                const script = Scripts.findAssignedScript(this.target) || Scripts.findAssignedScript(this.#getDefaultScript(this.target));
                if (script) {
                    this.#setScript(script.key)
                } else if (this.target) {
                    this.editor.content = DefaultScripts.getContent(this.#getDefaultScript(this.target));
    
                    this.#contentChanged(true);
                } else {
                    this.#contentChanged(false);
                }
            } else {
                this.editor.content = '';
    
                this.#contentChanged(false);
            }
        }

        this.$listSearch.val('');

        this.#updateSidebars();
        this.#updateTarget();
    }

    #updateTarget () {
        const values = [
            { value: '', name: intl('stats.scripts.targets.none'), icon: 'text-gray globe' },
            { type: 'header', name: intl('stats.scripts.targets_category.default') },
            { value: 'players', name: intl('stats.topbar.players'), icon: 'text-gray database' },
            { value: 'groups', name: intl('stats.topbar.groups'), icon: 'text-gray database' },
            { value: 'player', name: intl('stats.topbar.players_grid'), icon: 'text-gray user' },
            { value: 'group', name: intl('stats.topbar.groups_grid'), icon: 'text-gray archive' },
            { type: 'header', name: intl('stats.scripts.targets_category.existing') }
        ]

        if (this.target && !Scripts.RESERVED_SCRIPT_IDENTIFIERS.includes(this.target)) {
            values.push({
                value: this.target,
                name: DatabaseManager.GroupNames[this.target] ?? DatabaseManager.PlayerNames[this.target] ?? this.target,
                icon: DatabaseManager.isPlayer(this.target) ? 'text-gray user' : 'text-gray archive'
            })
        }

        const existingAssignments = Scripts.getAssigns(true).filter((identifier) => !Scripts.RESERVED_SCRIPT_IDENTIFIERS.includes(identifier));
        if (existingAssignments.length > 0) {
            values.push(
                ...existingAssignments.map((identifier) => ({
                    value: identifier,
                    name: DatabaseManager.GroupNames[identifier] ?? DatabaseManager.PlayerNames[identifier] ?? identifier,
                    icon: DatabaseManager.isPlayer(identifier) ? 'text-gray user' : 'text-gray archive'
                })).sort((a, b) => a.name.localeCompare(b.name))
            )
        }

        this.$target.dropdown({ values })
        this.$target.dropdown('set selected', this.target || '');
        this.$target.dropdown('setting', 'onChange', (value) => {
            this.show({ identifier: value, origin: this });
        })
    }

    #getDefaultScript (target) {
        if (target === 'player' || target === 'players' || target === 'group' || target === 'groups') {
            return target;
        } else if (DatabaseManager.isPlayer(target)) {
            return 'player';
        } else {
            return 'group';
        }
    }

    #setScript (key) {
        this.script = Scripts.findScript(key);

        if (this.script) {
            this.editor.content = this.script.content || '';
        } else {
            this.editor.content = '';
        }

        this.#contentChanged(false);
    }

    save () {
        this.script = Scripts.update(this.script.key, {
            content: this.editor.content
        });

        this.#updateSidebars();
        this.#contentChanged(false);
    }

    #contentChanged (changed) {
        if (this.script && changed) {
            this.$reset.removeClass('disabled');
        } else {
            this.$reset.addClass('disabled');
        }

        if (changed) {
            this.$save.removeClass('disabled');
        } else {
            this.$save.addClass('disabled');
        }
    }

    hide () {
        if (this.script) {
            if (this.script.content !== this.editor.content) {
                ScriptArchive.add('discard', this.script.key, this.script.version, this.editor.content);
            }
        } else {
            ScriptArchive.add('discard', null, 1, this.editor.content);
        }
    }

    #updateSearch () {
        const value = this.$listSearch.val().toLowerCase();

        this.$parent.find('[data-script-name]').each((_, element) => {
            if (element.dataset.scriptName.toLowerCase().startsWith(value)) {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        })
    }

    #updateSidebars () {
        let content = `
            <div data-script-add class="!border-radius-1 border-gray border-dashed p-4 background-dark background-light:hover cursor-pointer flex gap-2 items-center">
                <div class="flex gap-2 items-center text-gray">
                    <i class="ui large plus icon"></i>
                    <div>${intl('stats.scripts.list_add')}</div>
                </div>
            </div>
        `;

        for (const { key, name, version, favorite, updated_at, remote, description } of Scripts.sortedList()) {
            const assigned = Scripts.isAssignedTo(this.target, key);

            content += `
                <div data-script-key="${key}" data-script-name="${_escape(name)}" title="${_escape(description || '')}" class="script !border-radius-1 border-gray p-4 background-dark background-light:hover cursor-pointer flex gap-2 items-center ${this.script?.key === key ? 'background-light !border-orange' : ''}">
                    <div style="width: calc(100% - 3em);">
                        <div class="wrap-none overflow-hidden text-overflow-ellipsis" title="${_escape(name)}">${_escape(name)}</div>
                        <div class="text-gray">v${version} - ${_formatDate(updated_at)}</div>
                    </div>
                    <div class="script-icons" data-pinned="${favorite}">
                        <i data-op="icon-pin" class="ui thumbtack icon text-gray text-white:hover" title="${intl(`stats.scripts.tooltip.${favorite ? 'unpin' : 'pin'}`)}"></i>
                    </div>
                    <div class="script-indicators" data-remote="${!!remote}" data-assigned="${assigned}">
                        <i data-op="icon-remote" class="ui satellite dish icon text-gray" title="${intl('stats.scripts.tooltip.remote')}"></i>
                        <i data-op="icon-assigned" class="ui linkify icon text-gray" title="${intl(`stats.scripts.tooltip.assigned`)}"></i>
                    </div>
                </div>
            `;
        }

        this.$list.html(content);

        this.$list.find('[data-script-key]').click((event) => {
            const key = event.currentTarget.dataset.scriptKey;

            if (event.target.classList.contains('thumbtack')) {
                const script = Scripts.findScript(key);

                Scripts.update(key, { favorite: !script.favorite }, false);

                this.#updateSidebars();
            } else {
                this.hide();
                this.#setScript(key);
            }

            this.#updateSidebars();
        });

        this.$list.find('[data-script-add]').click(() => {
            Dialog.open(ScriptEditDialog, { content: this.editor.content }, null).then(([value, script, source]) => {
                if (value) {
                    if (source !== '_current') {
                        this.hide();
                    }
    
                    const { key } = Scripts.create(script);
    
                    if (this.target) {
                        Scripts.assign(this.target, key);
                    }
        
                    this.#setScript(key);
                    this.#updateSidebars();
                }
            })
        })

        if (this.returnTo) {
            this.$close.show();
        } else {
            this.$close.hide();
        }

        if (ScriptArchive.empty()) {
            this.$libraryArchive.addClass('disabled');
        } else {
            this.$libraryArchive.removeClass('disabled');
        }

        this.#updateButtons();
        this.#updateSearch();
        this.#updateScript();
    }
}

class SettingsTab extends Tab {
    constructor (parent) {
        super(parent)

        this.$dropdownTab = this.$parent.find('[data-op="dropdown-tab"]');
        this.$dropdownTab.dropdown();
        this.$dropdownTab.dropdown('set selected', Site.options.tab);
        this.$dropdownTab.dropdown('setting', 'onChange', (value) => {
            Site.options.tab = value;
        });

        this.$dropdownBackupReminders = this.$parent.find('[data-op="dropdown-backup-reminder-frequency"]');
        this.$dropdownBackupReminders.dropdown();
        this.$dropdownBackupReminders.dropdown('set selected', String(Site.options.backup_reminder_frequency));
        this.$dropdownBackupReminders.dropdown('setting', 'onChange', (value) => {
            Site.options.backup_reminder_frequency = parseInt(value);
        });

        this.$inputPreloadRows = this.$parent.find('[data-op="input-load-rows"]');
        this.$inputPreloadRows.val(Site.options.load_rows);
        this.$inputPreloadRows.on('change', () => {
            const value = parseInt(this.$inputPreloadRows.val())
            Site.options.load_rows = isNaN(value) ? Site.options.default('load_rows') : Math.max(1, value);
        });

        this.$inputScriptAuthor = this.$parent.find('[data-op="input-script-author"]');
        this.$inputScriptAuthor.val(Site.options.script_author);
        this.$inputScriptAuthor.on('change', () => {
            Site.options.script_author = this.$inputScriptAuthor.val().trim();
        })

        this.prepareCheckbox('always_prev');
        this.prepareCheckbox('unsafe_delete');
        this.prepareCheckbox('skip_grid_if_single_entry_present');
        this.prepareCheckbox('terms_accepted');
        this.prepareCheckbox('table_sticky_header')

        Site.options.onChange('terms_accepted', (enabled) => {
            if (enabled) {
                this.$parent.find(`[data-op="checkbox-terms-accepted"]`).checkbox('set checked');
            } else {
                Dialog.open(TermsAndConditionsDialog);
            }
        });

        this.$save = this.$parent.find('[data-op="save"]').click(() => {
            Actions.setScript(this.editor.content);

            DatabaseManager.refreshTrackers();

            this.$save.addClass('disabled');
            this.$reset.addClass('disabled');
        });

        this.$reset = this.$parent.find('[data-op="discard"]').click(() => {
            this.editor.content = Actions.getScript();
        });

        this.editor = new ScriptEditor(this.$parent.operator('editor').get(0), ScriptType.Action);
        this.editor.subscribe('change', (val) => {
            if (val === Actions.getScript()) {
                this.$save.addClass('disabled');
                this.$reset.addClass('disabled');
            } else {
                this.$save.removeClass('disabled');
                this.$reset.removeClass('disabled');
            }
        })

        // recovery
        this.$recoveryExport = this.$parent.find('[data-op="export"]');
        this.$recoveryImport = this.$parent.find('[data-op="import"]');

        this.$recoveryExport.click(() => this.exportDumpFile());
        this.$recoveryImport.change((event) => this.importDumpFile(event));

        this.$linksReset = this.$parent.operator('links-reset');
        this.$linksReset.click(() => {
            Dialog.open(
                ConfirmationDialog,
                intl('stats.settings.links.reset_title'),
                ''
            ).then(async ([value]) => {
                if (value) {
                    Loader.toggle(true);

                    await DatabaseManager.resetLinks();
    
                    Loader.toggle(false);
                }
            })
        })

        this.$linksExport = this.$parent.operator('links-export');
        this.$linksExport.click(() => {
            Exporter.json(
                DatabaseManager.exportLinks(),
                `${Exporter.time}.links`
            )
        })

        this.$linksImport = this.$parent.operator('links-import');
        this.$linksImport.change((event) => {
            Dialog.open(
                ConfirmationDialog,
                intl('stats.settings.links.import_title'),
                ''
            ).then(async ([value]) => {
                if (value) {
                    Loader.toggle(true);

                    await DatabaseManager.importLinks(
                        await _dig(event, 'currentTarget', 'files', 0).text().then((fileContent) => JSON.parse(fileContent))
                    )
    
                    Loader.toggle(false);
                }
            })
        })
    }

    async exportDumpFile () {
        Loader.toggle(true);

        Exporter.json(
            await Site.dump(),
            `recovery_dump_${Exporter.time}`
        );

        Loader.toggle(false);
    }

    importDumpFile (fileEvent) {
        Dialog.open(
            ConfirmationDialog,
            intl('stats.settings.recovery.title'),
            intl('stats.settings.recovery.notice'),
            true,
            2
        ).then(async ([value]) => {
            if (value) {
                Loader.toggle(true);

                Toast.info(intl('stats.settings.recovery.title'), intl('stats.settings.recovery.toast'));
    
                let data = await _dig(fileEvent, 'currentTarget', 'files', 0).text().then(fileContent => JSON.parse(fileContent));
                await Site.recover(data);
    
                window.location.href = window.location.href;
            }
        })
    }

    // Prepare checkbox
    prepareCheckbox (property) {
        this.$parent.find(`[data-op="checkbox-${ property.replaceAll('_', '-') }"]`).checkbox({
            onChecked: () => { Site.options[property] = true },
            onUnchecked: () => { Site.options[property] = false }
        }).checkbox(Site.options[property] ? 'set checked' : 'set unchecked');
    }

    show () {
        this.editor.content = Actions.getScript();
    }
}

class ProfilesTab extends Tab {
    static get PLAYER_EXPRESSION_CONFIG () {
        delete this.PLAYER_EXPRESSION_CONFIG;
 
        const config = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'identifier', 'prefix', 'tag', 'version', 'own', 'name', 'identifier', 'group', 'groupname', 'save']) {
            config.register('accessor', 'none', name, (object) => object[name]);
        }

        return (this.PLAYER_EXPRESSION_CONFIG = config);
    }

    static get GROUP_EXPRESSION_CONFIG () {
        delete this.GROUP_EXPRESSION_CONFIG;
 
        const config = DEFAULT_EXPRESSION_CONFIG.clone();
        for (const name of ['timestamp', 'identifier', 'prefix', 'own', 'name', 'identifier', 'save']) {
            config.register('accessor', 'none', name, (object) => object[name]);
        }

        return (this.GROUP_EXPRESSION_CONFIG = config);
    }

    constructor (parent) {
        super(parent);

        this.$list = this.$parent.find('[data-op="list"]')
    }

    show () {
        let content = '';
        for (const [key, profile] of ProfileManager.getProfiles()) {
            const { name, primary, secondary, primary_g, secondary_g } = profile;

            content += `
                <div class="row" style="margin-top: 1em; border: 1px solid grey; border-radius: .25em;">
                    <div class="four wide column">
                        <h3 class="ui inverted ${ key == ProfileManager.getActiveProfileName() ? 'orange' : '' } header">
                            <span data-key="${key}" class="cursor-pointer">${name}</span><br/>
                            ${ profile.slot ? `<span style="font-size: 90%;">Slot ${profile.slot}</span><br>` : '' }
                            <span style="font-size: 90%;">(${key})</span>
                        </h3>
                        ${
                            ProfileManager.isEditable(key) ? `
                                <div style="position: absolute; left: 1em; bottom: 0;">
                                    <i class="cursor-pointer trash alternate outline icon !text-red:hover" data-delete="${key}"></i>
                                    <i class="cursor-pointer wrench icon" style="margin-left: 1em;" data-edit="${key}"></i>
                                </div>
                            ` : ''
                        }
                    </div>
                    <div class="twelve wide column">
                        <table class="ui basic black inverted table" style="table-layout: fixed;">
                            <tr>
                                <td style="width: 20%;"></td>
                                <td style="width: 40%;">${intl('stats.profiles.players')}</td>
                                <td style="width: 40%;">${intl('stats.profiles.groups')}</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.primary')}</td>
                                <td>${ this.showRules(primary) }</td>
                                <td>${ this.showRules(primary_g) }</td>
                            </tr>
                            <tr>
                                <td>${intl('stats.profiles.secondary')}</td>
                                <td>${ secondary ? Highlighter.expression(secondary, undefined, ProfilesTab.PLAYER_EXPRESSION_CONFIG).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                                <td>${ secondary_g ? Highlighter.expression(secondary_g, undefined, ProfilesTab.GROUP_EXPRESSION_CONFIG).text : `<b>${intl('stats.profiles.none')}</b>` }</td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }

        content += `
            <div class="row" style="margin-top: 1em;">
                <div class="sixteen wide column" style="padding: 0;">
                    <div class="ui fluid basic inverted button" data-op="create" style="margin: -1em; padding: 1em; margin-left: 0; line-height: 2em;">${intl('stats.profiles.create')}</div>
                </div>
            </div>
        `

        this.$list.html(content);
        this.$parent.find('[data-key]').click(event => {
            const key = event.currentTarget.dataset.key;
            ProfileManager.setActiveProfile(key);
            window.location.href = window.location.href;
        });

        this.$parent.find('[data-delete]').click((event) => {
            const key = event.currentTarget.dataset.delete;
            ProfileManager.removeProfile(key);
            this.show();
        });

        this.$parent.find('[data-edit]').click((event) => {
            Dialog.open(ProfileCreateDialog, event.currentTarget.dataset.edit).then(([value]) => {
                if (value) this.show();
            })
        });

        this.$parent.find('[data-op="create"]').click(() => {
            this.addProfile();
            this.show();
        });
    }

    addProfile () {
        Dialog.open(ProfileCreateDialog).then(([value]) => {
            if (value) this.show();
        })
    }

    showRules (rule) {
        if (rule) {
            const { name, mode, value } = rule;
            if (mode == 'between') {
                return `<b>${name}</b> ${intl('stats.profiles.between')} ${Highlighter.expression(value[0], undefined, DEFAULT_EXPRESSION_CONFIG).text} ${intl('stats.profiles.and')} ${Highlighter.expression(value[1], undefined, DEFAULT_EXPRESSION_CONFIG).text}`;
            } else {
                return `<b>${name}</b> ${this.stringifyMode(mode)} ${value ? value.map(v => Highlighter.expression(v, undefined, DEFAULT_EXPRESSION_CONFIG).text).join('<br/>') : ''}`;
            }
        } else {
            return `<b>${intl('stats.profiles.none')}</b>`;
        }
    }

    stringifyMode (v) {
        return {
            'above': '>',
            'below': '<',
            'equals': '='
        }[v] || '??';
    }
}

Site.ready({ name: 'stats', requires: ['translations_items'] }, function (urlParams) {
    let profile = ProfileManager.getProfile(urlParams.get('profile'));
    if (urlParams.has('temp')) {
        Store.temporary();

        $('.css-temporary').show();

        profile = {
            temporary: true
        };
    } else if (urlParams.has('slot')) {
        profile['slot'] = urlParams.get('slot');
    }

    Loader.toggle(true);
    DatabaseManager.load(profile).then(function () {
        UI.register([
            {
                tab: new PlayersGridTab('view-players-grid'),
                tabName: 'players_grid',
                buttonId: 'show-players-grid',
                buttonHistory: 'scripts'
            },
            {
                tab: new PlayerTab('view-player'),
                tabName: 'player',
                buttonId: 'show-players-grid',
                buttonHistory: 'scripts',
                buttonClickable: false
            },
            {
                tab: new GroupsGridTab('view-groups-grid'),
                tabName: 'groups_grid',
                buttonId: 'show-groups-grid',
                buttonHistory: 'scripts',
                buttonReturn: {
                    'group': 'groups'
                }
            },
            {
                tab: new GroupTab('view-group'),
                tabName: 'group',
                buttonId: 'show-groups-grid',
                buttonHistory: 'scripts',
                buttonClickable: false
            },
            {
                tab: new PlayersTab('view-players'),
                tabName: 'players',
                buttonId: 'show-players',
                buttonHistory: 'scripts'
            },
            {
                tab: new GroupsTab('view-groups'),
                tabName: 'groups',
                buttonId: 'show-groups-grid',
                buttonHistory: 'scripts',
                buttonClickable: false
            },
            {
                tab: new ScriptsTab('view-scripts'),
                tabName: 'scripts',
                buttonId: 'show-scripts'
            },
            {
                tab: new FilesTab('view-files'),
                tabName: 'files',
                buttonId: 'show-files'
            },
            {
                tab: new SettingsTab('view-settings'),
                tabName: 'settings',
                buttonId: 'show-settings'
            },
            {
                tab: new ProfilesTab('view-profiles'),
                tabName: 'profiles',
                buttonId: 'show-profiles',
                buttonDisabled: urlParams.has('temp')
            }
        ],
        {
            activeTab: urlParams.has('temp') ? 'files' : Store.session.get('activeTab', urlParams.get('tab') || Site.options.tab),
            defaultTab: 'groups_grid',
            onTabChange: (tabName) => {
                Store.session.set('activeTab', tabName);
            }
        });

        Loader.toggle(false);

        // If reminders are enabled, invoke reminder if time expired
        if (!profile.temporary && Site.options.backup_reminder_frequency && Site.options.backup_reminder_timestamp < Date.now()) {
          Dialog.open(
            BackupReminderDialog
          )

          Site.options.backup_reminder_timestamp = Date.now() + [0, 2592000000, 604800000][Site.options.backup_reminder_frequency];
        }
    }).catch(function (e) {
        Loader.toggle(false);
        Dialog.open(ErrorDialog, `<h4 class="ui inverted header text-center">${intl('database.fatal_error#')}</h4><br>${e.message}`);
        Logger.error(e, 'Database could not be opened!');
    });
});