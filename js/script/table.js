// Category
class HeaderGroup {
    constructor ({ name, empty, expa_eval }, i) {
        this.name = expa_eval != undefined ? expa_eval : name;
        this.empty =  expa_eval != undefined ? expa_eval.length == 0 : empty;
        this.index = i;

        this.sortkey = `${ name }.${ i }`;

        this.width = 0;
        this.length = 0;
        this.headers = [];
    }

    add (settings, cellGenerator, statisticsGenerator, sort, border, span = 1) {
        let { expa_eval, alias, name } = settings;
        let header = Object.assign(settings || {}, {
            name: expa_eval != undefined ? expa_eval : (alias != undefined ? alias : name),
            generators: {
                cell: cellGenerator,
                statistics: statisticsGenerator
            },
            sort: sort,
            sortkey: SHA1(`${ this.sortkey }.${ name }.${ this.headers.length }`),
            span: span,
            bordered: border
        });

        // Set approximate sizes
        if (typeof header.width == 'undefined') {
            header.width = Math.max(100, header.name.length * 12);
        } else if (header.width && header.grouped) {
            header.width = header.grouped * header.width;
        }

        // Sum width and push the header
        this.width += header.width;
        this.length += span;

        this.headers.push(header);
    }
}

class TableArray extends Array {
    constructor (data) {
        super();

        if (data) {
            Object.assign(this, data);
        }
    }
}

// entryLimit, externalSort, suppressUpdate, timestamp, reference
class BrowseTableArray extends TableArray {
    add (player, compare, latest, hidden) {
        super.push({
            player: player,
            compare: compare || player,
            latest: latest,
            index: this.length,
            hidden: hidden
        });
    }
}

class PlayerTableArray extends TableArray {
    add (player, compare) {
        super.push({
            player,
            compare: compare || player,
            index: this.length
        })
    }
}

// joined, kicked, missing, timestamp, reference
class GroupTableArray extends TableArray {
    add (player, compare) {
        super.push({
            player: player,
            compare: compare || player,
            index: this.length
        });
    }
}

// Table instance
class TableInstance {
    constructor (settings, type, filteredCategories = null) {
        // Parameters
        this.type = type;
        this.settings = new Settings(settings, type);

        // Handle trackers
        this._updateTrackers();

        this.config = [];
        this.sorting = [];

        // Table generator
        const createMethods = {
            [ScriptType.Player]: 'createPlayerTable',
            [ScriptType.Group]: 'createGroupTable',
            [ScriptType.Browse]: 'createBrowseTable'
        }

        this.createTable = () => Object.assign(this.sharedProperties(), this[createMethods[this.type]]())

        // Loop over all categories
        this.settings.categories.forEach((category, categoryIndex, categories) => {
            // Add expression alias
            if (category.expa) {
                category.expa_eval = category.expa(this.settings, category);
                if (category.expa_eval != undefined) {
                    category.expa_eval = String(category.expa_eval);
                }
            }

            // Create header group
            let group = new HeaderGroup(category, this.config.length);
            let lastCategory = categoryIndex == categories.length - 1;

            // Loop over all headers
            category.headers.forEach((header, headerIndex, headers) => {
                let lastHeader = headerIndex == headers.length - 1;
                let nextHeader = headers[headerIndex + 1];

                let showBorder = (!lastCategory && lastHeader) || (header.border >= 2) || (!lastHeader && (nextHeader.border == 1 || nextHeader.border == 3));

                // Add expression alias
                if (header.expa) {
                    header.expa_eval = header.expa(this.settings, header);
                    if (header.expa_eval != undefined) {
                        header.expa_eval = String(header.expa_eval);
                    }
                }

                if (header.embedded) {
                    if (header.columns && !header.width) {
                        header.width = _sum(header.columns);
                    }

                    group.add(header, (player, compare) => {
                        let values = [null];
                        if (header.expr) {
                            let value = new ExpressionScope(this.settings).with(player, compare).via(header).eval(header.expr);
                            values = Array.isArray(value) ? value : [value];
                        }

                        let allBlank = _every(header.headers, h => !(h.expa || h.alias || h.name));
                        let generators = header.headers.map((embedHeader) => {
                            return {
                                name: () => {
                                    let expa_eval = undefined;
                                    if (embedHeader.expa) {
                                        expa_eval = embedHeader.expa(this.settings, category);
                                        if (expa_eval != undefined) {
                                            expa_eval = String(expa_eval);
                                        }
                                    }

                                    let name = expa_eval || embedHeader.alias || embedHeader.name || '';

                                    return this.getCell(
                                        embedHeader,
                                        name,
                                        '',
                                        embedHeader.border,
                                         _dig(header, 'columns', 0) || Math.max(100, name.length * 12)
                                    );
                                },
                                get: (value, i) => {
                                    let val = this.safeEval(
                                        embedHeader.expr,
                                        player,
                                        compare,
                                        this.settings,
                                        new ExpressionScope(this.settings).with(player, compare).addSelf(value).via(embedHeader),
                                        embedHeader
                                    );

                                    if (val == undefined) {
                                        return this.getEmptyCell(embedHeader, false, undefined, _dig(header, 'columns', i + 1));
                                    } else {
                                        let cmp = embedHeader.difference ? this.safeEval(
                                            embedHeader.expr,
                                            compare,
                                            compare,
                                            this.settings.getCompareEnvironment(),
                                            new ExpressionScope(this.settings.getCompareEnvironment()).with(compare, compare).addSelf(value).via(embedHeader),
                                            embedHeader
                                        ) : undefined;

                                        return this.getCell(
                                            embedHeader,
                                            this.getCellDisplayValue(embedHeader, val, cmp, player, compare, undefined, value),
                                            this.getCellColor(embedHeader, val, player, compare, undefined, false, value),
                                            embedHeader.border,
                                            _dig(header, 'columns', i + 1)
                                        );
                                    }
                                }
                            };
                        });

                        let rowHeight = header.row_height ? ` style="height: ${header.row_height}px;"` : '';
                        let entries = generators.map(({ name, get }) => {
                            return `<tr${rowHeight}>${ allBlank ? '' : name() }${ values.map((v, i) => get(v, i)).join('') }</tr>`;
                        }).join('');

                        return CellGenerator.EmbedTable(entries, this.getCellColor(header, values, player, compare).bg, showBorder, header.font);
                    }, null, (player, compare) => 0 /* TODO: Implement native sorting */, showBorder);
                } else if (header.grouped) {
                    // Create grouped header
                    let callWidth = header.width || 100;
                    group.add(header, (player, compare) => {
                        // Cell
                        let vals = this.safeEval(header.expr, player, compare, this.settings, undefined, header);

                        if (!Array.isArray(vals)) {
                            return this.getEmptyCell(header, showBorder, header.grouped);
                        } else {
                            let cmps = header.difference ? this.safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;

                            return _join(vals, (val, index) => {
                                let showEndBorder = showBorder && index == header.grouped - 1;
                                let extra = {
                                    index: index
                                };

                                if (val == undefined) {
                                    return this.getEmptyCell(header, showEndBorder);
                                } else {
                                    return this.getCell(
                                        header,
                                        this.getCellDisplayValue(header, val, header.difference ? cmps[index] : undefined, player, compare, extra),
                                        this.getCellColor(header, val, player, compare, extra),
                                        showEndBorder,
                                        callWidth
                                    );
                                }
                            });
                        }
                    }, null, (player, compare) => {
                        // Sort
                        let vals = this.safeEval(header.expr, player, compare, this.settings, undefined, header);

                        if (Array.isArray(vals)) {
                            return vals.reduce((a, b) => a + b, 0);
                        } else {
                            return vals;
                        }
                    }, showBorder, header.grouped);
                } else {
                    // Create normal header
                    group.add(header, (player, compare) => {
                        // Cell
                        let val = this.safeEval(header.expr, player, compare, this.settings, undefined, header);

                        if (val == undefined) {
                            return this.getEmptyCell(header, showBorder);
                        } else {
                            let cmp = header.difference ? this.safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;
                            return this.getCell(
                                header,
                                this.getCellDisplayValue(header, val, cmp, player, compare),
                                this.getCellColor(header, val, player, compare),
                                showBorder
                            );
                        }
                    }, (players, operation) => {
                        // Statistics
                        let val = players.map(({ player, compare }) => this.safeEval(header.expr, player, compare, this.settings, undefined, header)).filter(v => v != undefined);
                        if (val.length) {
                            // Get value and trunc if necessary
                            val = operation(val);
                            if (!header.decimal) {
                                val = Math.trunc(val);
                            }

                            // Compare value
                            let cmp = undefined;
                            if (header.difference) {
                                cmp = players.map(({ compare }) => this.safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header)).filter(v => v != undefined);
                                if (cmp.length) {
                                    cmp = operation(cmp);

                                    if (!header.decimal) {
                                        cmp = Math.trunc(cmp);
                                    }
                                } else {
                                    cmp = undefined;
                                }
                            }

                            return CellGenerator.Cell(
                                this.getStatisticsDisplayValue(header, val, cmp),
                                '',
                                header.statistics_color ? this.getCellColor(header, val, undefined, undefined, undefined, true).bg : ''
                            );
                        } else {
                            return this.getEmptyCell(header);
                        }
                    }, (player, compare) => {
                        // Sort
                        return this.safeEval(header.expr, player, compare, this.settings, undefined, header);
                    }, showBorder);
                }
            })

            if (filteredCategories ? (filteredCategories.includes(group.name) || filteredCategories.find(filterKey => filterKey == `$${ categoryIndex + 1 }`)) : group.length) {
                this.config.push(group);
            }
        })

        // Scale everything
        if (this.settings.globals.scale) {
            var factor = this.settings.globals.scale / 100;
            for (var category of this.config) {
                category.width = Math.ceil(category.width * factor);
                for (var header of category.headers) {
                    header.width = Math.ceil(header.width * factor);
                }
            }
        }

        this.flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        this.configLeft = this.config.splice(0, 1);
        this.leftFlat = this.configLeft[0].headers;
        this.leftFlatSpan = this.leftFlat.reduce((a, b) => a + b.span, 0);
        this.leftFlatWidth = this.leftFlat.reduce((a, b) => a + b.width, 0);

        // Generate flat list
        this.rightFlat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        this.rightFlatWidth = this.config.reduce((a, b) => a + b.width, 0);
        this.rightFlatSpan = this.rightFlat.reduce((t, h) => t + h.span, 0);

        this.flatWidth = this.leftFlatWidth + this.rightFlatWidth;
        this.flatSpan = this.leftFlatSpan + this.rightFlatSpan;

        // Caching
        this._recreateCache();

        this.global_key = '_index';
        this.global_ord = 1;

        if (this.settings.globals.order_by) {
            this.global_key = '_order_by';
        } else if (this.flat.some(x => 'glob_order' in x)) {
            let sorting = [];

            for (let { sortkey, glob_order } of this.flat) {
                if (typeof glob_order != 'undefined') {
                    sorting.splice(typeof glob_order.index === 'undefined' ? sorting.length : glob_order.index, 0, {
                        key: sortkey,
                        flip: undefined,
                        order: glob_order.ord ? 2 : 1
                    });
                }
            }

            this.global_sorting = sorting;
            this.setDefaultSorting();
        }
    }

    _updateTrackers () {
        let trackers = this.settings.trackers;

        if (Object.keys(trackers).length > 0) {
            // Get current tracker settings
            let trackerSettings = Actions.getInstance();
            let trackerCode = trackerSettings.code;

            // Go through all required trackers
            let isset = false;
            for (let [ trackerName, tracker ] of Object.entries(trackers)) {
                if (trackerName in trackerSettings.trackers) {
                    if (tracker.hash != trackerSettings.trackers[trackerName].hash) {
                        Logger.log('TRACKER', `Tracker ${ trackerName } with hash ${ tracker.hash } found but overwritten by ${ trackerSettings.trackers[trackerName].hash }!`);
                    }
                } else {
                    trackerCode += `${ trackerCode ? '\n' : '' }${ tracker.str } # Automatic entry from ${ _formatDate(Date.now()) }`;
                    isset |= true;

                    Logger.log('TRACKER', `Tracker ${ trackerName } with hash ${ tracker.hash } added automatically!`);
                }
            }

            // Save settings
            if (isset) {
                Actions.setScript(trackerCode);
                DatabaseManager.refreshTrackers();
            }
        }
    }

    safeEval (obj, ...args) {
        if (obj instanceof Expression) {
            return (args[3] || new ExpressionScope(args[2])).with(args[0], args[1]).via(args[4]).eval(obj);
        } else {
            return obj(args[0]);
        }
    }

    // Set players
    setEntries (array) {
        if (this.type === ScriptType.Group) {
            this.array = array;
        } else {
            this.array = array.map(obj => {
                let { player, compare } = obj;

                let p = DatabaseManager.getPlayer(player.Identifier, player.Timestamp);
                let c = DatabaseManager.getPlayer(player.Identifier, compare.Timestamp);

                let disc = this.settings.discardRules.some(rule => new ExpressionScope(this.settings).with(p, c).eval(rule));
                ExpressionCache.reset();

                return disc ? null : obj;
            }).filter(e => e);

            // Copy over lost properties
            if (this.type == ScriptType.Browse) {
                this.array.entryLimit = array.entryLimit;
                this.array.timestamp = array.timestamp;
                this.array.reference = array.reference;
            }
        }

        // Evaluate variables
        if (this.type == ScriptType.Player) {
            this.settings.evalPlayer(this.array, array);
        } else if (!array.suppressUpdate) {
            if (this.type == ScriptType.Browse) {
                this.settings.evalBrowse(this.array, array);
            } else {
                this.settings.evalGuild(this.array, array);
            }
        }

        if (!array.suppressUpdate) {
            ExpressionCache.reset();
            this._recreateCache();
        }

        if (array.externalSort) {
            this.array.sort((a, b) => array.externalSort(b.player, b.compare) - array.externalSort(a.player, a.compare)).forEach((entry, i) => entry.index = i);
        }

        this.generateEntries();
    }

    getForegroundColor (backgroundColor, player, compare) {
        let textColor = '';
        if (this.settings.shared.text === true) {
            textColor = _invertColor(_parseColor(backgroundColor), true)
        } else if (this.settings.shared.text) {
            textColor = getCSSColor(new ExpressionScope(this.settings).with(player, compare).eval(this.settings.shared.text))
        }

        if (textColor) {
            return `color: ${textColor};`;
        } else {
            return '';
        }
    }

    _generateSorting (player, compare, index, comparable) {
        const sorting = {
            '_index': index
        };

        for (const header of this.flat) {
            let { order, sortkey, flip, expr, sort } = header;
            if (order) {
                // Use special order expression if supplied
                let difference = undefined;
                let value = this.safeEval(expr, player, compare, this.settings, undefined, header);

                if (comparable) {
                    // Get difference
                    difference = (flip ? -1 : 1) * (value - this.safeEval(expr, compare, compare, this.settings, undefined, header));
                }

                sorting[sortkey] = this.safeEval(order, player, compare, this.settings, new ExpressionScope(this.settings).with(player, compare).addSelf(value).add({ difference: difference }));
            } else {
                // Return native sorting function
                sorting[sortkey] = sort(player, compare);
            }
        }

        if (this.settings.globals.order_by) {
            sorting['_order_by'] = this.safeEval(this.settings.globals.order_by, player, compare, this.settings)
        }

        return sorting;
    }

    // Generate entries
    generateEntries () {
        // Common settings
        const dividerStyle = this.getCellDividerStyle();
        const rowHeight = this.settings.getRowHeight();
        const comparable = this.type === ScriptType.Player || this.array.reference != this.array.timestamp;
        const outdated = this.type === ScriptType.Browse && this.settings.getOutdatedStyle();
        const hidden = this.type === ScriptType.Browse;

        // Hoist
        const self = this;

        // Generate entries
        this.entries = this.array.map((entry) => ({
            index: entry.index,
            player: entry.player,
            sorting: this._generateSorting(entry.player, entry.compare, entry.index, comparable),
            get node () {
                delete this.node;

                let html = '';
                for (const header of self.flat) {
                    html += self.getCellContent(header, entry.player, entry.compare);
                }

                const node = document.createElement('tr');
                node.classList.add('css-entry');

                if (hidden && entry.hidden) {
                    node.classList.add('opacity-50');
                }

                if (dividerStyle) {
                    node.classList.add(dividerStyle);
                }

                if (rowHeight) {
                    node.style.height = `${rowHeight}px`;
                }

                node.innerHTML = html;

                if (outdated && !entry.latest) {
                    node.querySelectorAll('[data-id]').forEach((element) => {
                        element.classList.add('!text-red');
                    })
                }

                this.rendered = true;

                return (this.node = node);
            }
        }));

        // Cache length
        this.entriesLength = this.entries.length;
    }

    // Remove key from sorting queue
    removeSorting (key) {
        var index = this.sorting.findIndex(sort => sort.key == key);
        if (index != -1) {
            this.sorting.splice(index, 1);
            this.sort();
        }
    }

    // Add key to sorting queue
    setSorting (key = undefined) {
        var index = this.sorting.findIndex(sort => sort.key == key);
        if (index == -1) {
            var obj = this.flat.find(header => header.sortkey == key);
            this.sorting.push({
                key: key,
                flip: obj == undefined ? (key == '_index') : obj.flip,
                order: 1
            });
        } else {
            this.sorting[index].order = this.sorting[index].order == 1 ? 2 : 1;
        }

        this.sort();
    }

    // Clear sort
    clearSorting () {
        this.sorting = [];
        this.sort();
    }

    // Execute sort
    sort () {
        this.entries.sort((a, b) => this._sort_globally(a, b, this.sorting) || this._sort_default(a, b));
    }

    reflowIndexes () {
        const indexedStyle = this.settings.globals.indexed;
        if (indexedStyle === 1) {
            for (let i = 0; i < this.entriesLength; i++) {
                const entry = this.entries[i];
                if (entry.rendered) {
                    entry.node.querySelector('td').innerText = this.entries[i].index + 1;
                }
            }
        } else if (indexedStyle === 2) {
            for (let i = 0; i < this.entriesLength; i++) {
                const entry = this.entries[i];
                if (entry.rendered) {
                    entry.node.querySelector('td').innerText = i + 1;
                }
            }
        }
    }

    setDefaultSorting () {
        this.sorting = [ ...this.global_sorting ];
    }

    _compareItems (a, b) {
        if (typeof(a) == 'string' && typeof(b) == 'string') {
            if (a == '') return 1;
            else if (b == '') return -1;
            else return a.localeCompare(b);
        } else if (a == undefined) {
            return 1;
        } else if (b == undefined) {
            return -1;
        } else {
            return b - a;
        }
    }

    _sort_globally (a, b, sort_list) {
        if (sort_list) {
            return sort_list.reduce((result, { key, flip, order }) => result || (a.sorting[key] == undefined ? 1 : (b.sorting[key] == undefined ? -1 : (((order == 1 && !flip) || (order == 2 && flip)) ? this._compareItems(a.sorting[key], b.sorting[key]) : this._compareItems(b.sorting[key], a.sorting[key])))), undefined);
        } else {
            return undefined;
        }
    }

    _sort_default (a, b) {
        return this.global_ord * (a.sorting[this.global_key] - b.sorting[this.global_key]);
    }

    _recreateCache () {
        this.cache = {
            spacer: this.getSpacer(),
            divider: this.getDivider()
        }
    }

    getCellDividerStyle () {
        let lineType = this.settings.getLinedStyle();
        if (lineType == 2) {
            // Thick
            return 'border-bottom-thick';
        } else if (lineType == 1) {
            // Thin
            return 'border-bottom-thin';
        } else {
            // None
            return '';
        }
    }

    getCell (header, value, color, border, cellWidth) {
        return CellGenerator.Cell(
            value,
            color.bg,
            header.visible ? color.fg : false,
            border,
            header.align,
            header.padding,
            header.style ? header.style.cssText : undefined,
            cellWidth,
            header.action
        );
    }

    getEmptyCell (header, border = undefined, span = 0, cellWidth = undefined) {
        if (span) {
            return CellGenerator.PlainSpan(
                span,
                header.ndef == undefined ? '?' : header.ndef,
                border,
                undefined,
                header.ndefc,
                header.style ? header.style.cssText : undefined
            );
        } else {
            return CellGenerator.Plain(
                header.ndef == undefined ? '?' : header.ndef,
                border,
                undefined,
                header.ndefc,
                header.style ? header.style.cssText : undefined,
                header.cellWidth
            );
        }
    }

    getRowSpan (width) {
        if (width == -1) {
            // Return maximum span when set to -1
            return this.rightFlatSpan;
        } else if (width) {
            // Calculate span from requested width
            let span = 0;
            for (let { width: headerWidth, span: headerSpan } of this.rightFlat) {
                width -= headerWidth;
                span += headerSpan;

                if (width <= 0) {
                    break;
                }
            }

            return Math.max(1, Math.min(span, this.rightFlatSpan));
        } else {
            // Return 1 by default
            return 1;
        }
    }

    getCellDisplayValue (header, val, cmp, player = undefined, compare = undefined, extra = undefined, altSelf = undefined) {
        let { difference, ex_difference, flip, value, brackets } = header;
        let displayValue = value.get(player, compare, this.settings, val, extra, header, altSelf);
        if (!difference || isNaN(cmp)) {
            return displayValue;
        } else {
            let diff = (flip ? -1 : 1) * (val - cmp);
            if (Object.is(diff, NaN) && !ex_difference) {
                return displayValue;
            } else {
                return displayValue + CellGenerator.Difference(diff, brackets, value.getDifference(player, compare, this.settings, diff, extra));
            }
        }
    }

    getStatisticsDisplayValue ({ difference, ex_difference, flip, value, brackets }, val, cmp) {
        let displayValue = value.getStatistics(this.settings, val);
        if (!difference || isNaN(cmp)) {
            return displayValue;
        } else {
            let diff = (flip ? -1 : 1) * (val - cmp);
            if (Object.is(diff, NaN) && !ex_difference) {
                return displayValue;
            } else {
                return displayValue + CellGenerator.Difference(diff, brackets, value.getDifference(undefined, undefined, this.settings, diff));
            }
        }
    }

    getCellColor (header, val, player = undefined, compare = undefined, extra = undefined, ignoreBase = false, altSelf = undefined) {
        return header.color.get(player, compare, this.settings, val, extra, ignoreBase, header, altSelf);
    }

    getTable () {
        return `
            <tr class="headers">
                ${ this.getCategoryBlock(this.configLeft, true) }
                ${ this.getCategoryBlock() }
            </tr>
            <tr class="headers border-bottom-thick">
                ${ this.getHeaderBlock(this.configLeft, true) }
                ${ this.getHeaderBlock() }
            </tr>
            <tr data-entry-injector>
                <td colspan="${ this.flatSpan }" style="height: 8px;"></td>
            </tr>
        `
    }

    getDivider () {
        return `
            <tr class="border-bottom-thick"></tr>
        `;
    }

    getSpacer () {
        return `
            <tr>
                <td colspan="${ this.flatSpan }"></td>
            </tr>
        `;
    }

    getRow (row, val, cmp, player = undefined) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ this.leftFlatSpan }">${ row.name }</td>
                ${ CellGenerator.WideCell(
                    this.getCellDisplayValue(row, val, cmp, player),
                    this.getCellColor(row, val, player),
                    this.getRowSpan(row.width),
                    row.align,
                    row.padding,
                    row.style ? row.style.cssText : undefined
                ) }
            </tr>
        `;
    }

    sharedProperties () {
        return {
            theme: this.settings.getTheme(),
            style: [ this.settings.getFontStyle() ],
            class: [ this.settings.getOpaqueStyle(), this.settings.getRowStyle() ],
            width: this.flatWidth
        };
    }

    getContent () {
        this.cache.table = this.getTable();

        let content = '';
        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, this.cache.members);

        for (const block of layout) {
            if (block == '|') {
                content += this.cache.divider;
            } else if (block == '_') {
                content += this.cache.spacer;
            } else {
                content += this.cache[block] || '';
            }
        }

        return content;
    }

    // Renders statistics rows into cache
    _renderStatistics () {
        if (typeof this.cache.statistics !== 'undefined') return;

        if (this.rightFlat.reduce((a, { statistics }) => a || statistics, false)) {
            if (this.settings.customStatistics.length) {
                this.cache.statistics = this.getStatistics(this.leftFlatSpan, this.settings.customStatistics);
            } else {
                this.cache.statistics = this.getStatistics(this.leftFlatSpan, [
                    {
                        name: 'Minimum',
                        expression: array => _fastMin(array)
                    },
                    {
                        name: 'Average',
                        expression: array => _fastAvg(array)
                    },
                    {
                        name: 'Maximum',
                        expression: array => _fastMax(array)
                    }
                ]);
            }
        } else {
            this.cache.statistics = '';
        }
    }

    // Renders members into cache
    _renderMembers () {
        if (typeof this.cache.members !== 'undefined') return;

        if (this.settings.globals.members) {
            this.cache.members = `
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Classes</td>
                    <td colspan="${ this.rightFlatSpan }">${ Object.entries(this.settings.lists.classes).map(([ key, count ]) => intl(`general.class${key}`) + ': ' + count).join(', ') }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Joined</td>
                    <td colspan="${ this.rightFlatSpan }">${ this.settings.lists.joined.join(', ') }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Left</td>
                    <td colspan="${ this.rightFlatSpan }">${ this.settings.lists.kicked.join(', ') }</td>
                </tr>
            `;
        } else {
            this.cache.members = '';
        }
    }

    _renderMissing () {
        if (typeof this.cache.missing !== 'undefined') return;

        if (this.array.missing.length) {
            this.cache.missing = `
                <tr class="font-weight: bold;">
                    ${
                        CellGenerator.WideCell(
                            CellGenerator.Small(`${intl('stats.guilds.missing')}<br/>${ this.array.missing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`),
                            undefined,
                            this.flatSpan,
                            'center'
                        )
                    }
                </tr>`;
        } else {
            this.cache.missing = '';
        }
    }

    _renderRows (includePlayer = false) {
        if (typeof this.cache.rows !== 'undefined') return;

        if (this.settings.customRows.length) {
            if (includePlayer) {
                this.cache.rows = _join(this.settings.customRows, row => this.getRow(row, row.eval.value, undefined, _dig(this.array, 0, 'player')));
            } else {
                this.cache.rows = _join(this.settings.customRows, row => this.getRow(row, row.eval.value, row.eval.compare));
            }
        } else {
            this.cache.rows = '';
        }
    }

    createPlayerTable () {
        this._renderRows(true);
        this._renderStatistics();

        // Create table Content
        return {
            entries: this.entries,
            content: this.getContent()
        };
    }

    // Create players table
    createBrowseTable () {
        this._renderRows();
        this._renderStatistics();

        let forcedLimit = this.array.entryLimit || this.settings.getEntryLimit();

        return {
            entries: forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries,
            content: this.getContent()
        };
    }

    // Create guilds table
    createGroupTable () {
        this._renderRows();
        this._renderMissing();
        this._renderStatistics();
        this._renderMembers();

        return {
            entries: this.entries,
            content: this.getContent()
        };
    }

    getCellContent ({ action, generators: { cell } }, player, compare) {
        if (action == 'show') {
            return cell(player, compare).replace('{__ACTION__}', `data-id="${ player.Identifier }" data-ts="${ player.Timestamp }"`).replace('{__ACTION_OP__}', `<span class="css-op-select-el"></span>`);
        } else {
            return cell(player, compare);
        }
    }

    getStatistics (leftSpan, entries) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ leftSpan }"></td>
                ${ _join(this.rightFlat, ({ span, statistics, generators, name }) => `<td colspan="${ span }">${ statistics && generators.statistics ? name : '' }</td>`) }
            </tr>
            ${ this.cache.divider }
            ${ _join(entries, ({ name, ast, expression }) => `
                <tr>
                    <td class="border-right-thin" colspan="${ leftSpan }">${ name }</td>
                    ${ _join(this.rightFlat, ({ span, statistics, generators }) => statistics && generators.statistics ? generators.statistics(this.array, expression ? expression : array => new ExpressionScope(this.settings).addSelf(array).eval(ast)) : `<td colspan="${ span }"></td>`) }
                </tr>
            `) }
        `;
    }

    getCategoryBlock (config = this.config, alwaysRightBorder = false) {
        let aligned = this.settings.getTitleAlign();
        return _join(config, ({ headers, empty, length, name: categoryName }, categoryIndex, categoryArray) => {
            let notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;

            if (empty && !aligned) {
                return _join(headers, ({ width, span, sortkey, name: headerName, align_title }, headerIndex, headerArray) => {
                    let lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td rowspan="2" colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="border-bottom-thick ${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } cursor-pointer" ${ this.getSortingTag(sortkey) }>${ headerName }</td>`
                });
            } else {
                return `<td colspan="${ length }" class="${ notLastCategory ? 'border-right-thin' : '' }">${ aligned && empty ? '' : categoryName }</td>`;
            }
        });
    }

    getHeaderBlock (config = this.config, alwaysRightBorder = false) {
        let aligned = this.settings.getTitleAlign();
        return _join(config, ({ headers, empty }, categoryIndex, categoryArray) => {
            let notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;

            if (empty && !aligned) {
                return '';
            } else {
                return _join(headers, ({ width, span, name, sortkey, align_title }, headerIndex, headerArray) => {
                    let lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } cursor-pointer" ${ this.getSortingTag(sortkey) }>${ name }</td>`
                });
            }
        });
    }

    getSortingTag (key) {
        let index = this.sorting.findIndex(s => s.key == key);
        return `data-sortable-key="${ key }" data-sortable="${ this.sorting[index] ? this.sorting[index].order : 0 }" data-sortable-index="${ this.sorting.length == 1 ? '' : (index + 1) }"`;
    }
}

class TableController {
    constructor ($table, type) {        
        this.headElement = document.createElement('thead');
        this.bodyElement = document.createElement('tbody');
        
        this.element = $table.get(0);
        this.element.replaceChildren(
            this.headElement,
            this.bodyElement
        )

        this.type = type;

        // Changed by default
        this.schanged = true;
        this.echanged = true;
    }

    async toImage (cloneCallback) {
        return new Promise(async (resolve) => {
            const canvas = await html2canvas(this.element, {
                logging: false,
                allowTaint: true,
                useCORS: true,
                onclone: (document) => {
                    const $document = $(document);
    
                    const $tableBody = $document.find('table.sftools-table tbody').first();
                    if ($tableBody.find('tr.css-entry.border-bottom-thick, tr.css-entry.border-bottom-thin').length && $tableBody.hasClass('css-entry-opaque')) {
                        $tableBody.removeClass('css-entry-opaque').addClass('css-entry-opaque-image');
                    }
    
                    $('<tr class="border-bottom-thick"></tr>').insertAfter($document.find('tr.css-entry.border-bottom-thick'));
                    $('<tr class="border-bottom-thin"></tr>').insertAfter($document.find('tr.css-entry.border-bottom-thin'));
        
                    if (cloneCallback) {
                        cloneCallback($document);
                    }
                }
            });

            canvas.toBlob(resolve);
        });
    }

    setSettings (code) {
        // If settings have changed
        if (this.settings != code) {
            this.settings = code;
            this.schanged = true;

            // Clear sorting when settings have changed
            this.clearSorting();
        }
    }

    getSettings () {
        return this.settings;
    }

    getEntryLimit () {
        return this.table ? this.table.settings.getEntryLimit() : 0;
    }

    setEntries (entries) {
        this.entries = entries;
        this.echanged = true;
    }

    getArray () {
        return this.table ? this.table.array : [];
    }

    getInternalEntries () {
        return this.table ? this.table.entries : [];
    }

    clearSorting () {
        this.ignore = true;
    }

    selectCategories (categories) {
        this.categories = categories;
    }

    prepareInjector (entries, callback) {
        if (this.injectorObserver) {
            this.injectorObserver.disconnect();
        }

        this.injectorCallback = callback;
        this.injectorEntries = entries;
        this.injectorBlockSize = 25;
        this.injectorCounter = 0;

        this.injectorObserver = new IntersectionObserver(() => this.inject(), { threshold: 0.75 });
        this.injectorObserver.observe(this.injectorElement);
    }

    forceInject () {
        if (this.injectorEntries && this.injectorEntries.length > 0) {
            this.inject(10000);
        }
    }

    resetInjector () {
        this.injectCount = 0;
    }

    inject (size = this.injectorBlockSize) {
        if (this.injectorCounter++ > 0) {
            let timestamp = Date.now();

            let blockSize = Math.min(this.injectorEntries.length, size);
            this.injectCount += blockSize;

            let entriesSlice = this.injectorEntries.splice(0, size);
            for (const entry of entriesSlice) {
                this.injectorElement.insertAdjacentElement('beforebegin', entry.node);
                this.injectorCallback(entry.node);
            }

            this.table.reflowIndexes();

            if (this.injectorEntries.length == 0) {
                this.injectorObserver.disconnect();
            }

            Logger.log('TAB_GEN', `Block of size ${blockSize} injected in ${ Date.now() - timestamp }ms!`);
        }
    }

    refresh (onChange = () => { /* Do nothing */ }, onInject = () => { /* Do nothing */ }) {
        if (this.categories) {
            this.schanged = true;
            this.echanged = true;
        }

        // Log some console stuff for fun
        let schanged = this.schanged || false;
        let echanged = this.echanged || false;
        let ignore = this.ignore || false;
        let timestamp = Date.now();

        // Save sorting if needed
        let sorting = !this.ignore && this.table ? this.table.sorting : null;

        // Create table
        if (this.schanged) {
            if (this.categories == -1) {
                this.categories = undefined;
            }

            this.table = new TableInstance(this.settings, this.type, this.categories);
            this.ignore = false;

            if (this.categories) {
                this.categories = -1;
            }

            this.resetInjector();
        }

        // Fill entries
        if (this.echanged || this.schanged) {
            ExpressionCache.start();

            this.table.setEntries(this.entries);
            this.table.sort();

            ExpressionCache.stop();
        }

        // Reset sorting
        if (sorting != null) {
            this.table.sorting = sorting;
            this.table.sort();
        }

        // Reset sorting if ignored
        if (this.ignore) {
            this.table.clearSorting();
        }

        // Clear flag
        this.ignore = false;
        this.echanged = this.schanged = false;

        // Get table content
        let { content, entries, style, class: klass, theme, width } = this.table.createTable();

        entries = [].concat(entries);

        let themeClass = 'theme-light';
        let themeStyle = '';
        if (typeof theme === 'string') {
            themeClass = `theme-${theme}`;
        } else if (typeof theme === 'object') {
            const { text, background } = theme;
            themeStyle = `--table-foreground: ${text}; --table-background: ${background}`;
        }

        this.bodyElement.setAttribute('style', `${themeStyle} ${style.join(' ')}`);
        this.bodyElement.setAttribute('class', `${themeClass} ${klass.join(' ')}`);
        this.bodyElement.innerHTML = content;

        this.injectCount = this.injectCount || SiteOptions.load_rows || 50;
        this.injectorElement = this.bodyElement.querySelector('[data-entry-injector]');

        if (this.injectorElement) {
            const entriesSlice = entries.splice(0, this.injectCount);
            for (const entry of entriesSlice) {
                this.injectorElement.insertAdjacentElement('beforebegin', entry.node);
                onInject(entry.node);
            }

            this.table.reflowIndexes();
        }

        // Check table content for unwanted tags
        if (!SiteOptions.insecure && this.bodyElement.querySelector('script, iframe, img[onerror]')) {
            // Show insecure error
            this.element.style.width = '50vw';
            this.element.style.left = '25vw';

            this.bodyElement.innerHTML = `<div>${intl('stats.settings.insecure_error#')}</div>`;
        } else {
            this.element.style.width = `${width}px`;
            this.element.style.left = `max(0px, calc(50vw - 9px - ${ width / 2 }px))`;

            if (this.injectorElement) {
                if (entries.length > 0) {
                    this.prepareInjector(entries, onInject);
                } else {
                    this.injectorElement.remove();
                }
            }
        }

        // Bind sorting
        const sortables = Array.from(this.bodyElement.querySelectorAll('[data-sortable]'));
        for (const sortable of sortables) {
            sortable.addEventListener('click', (event) => {
                let sortKey = event.target.dataset.sortableKey;
                if (event.ctrlKey) {
                    // Remove all sorting except current key if CTRL is held down
                    this.table.sorting = this.table.sorting.filter(s => s.key == sortKey)
                }
    
                // Sort by key
                this.table.setSorting(sortKey);
    
                // Redraw table
                this.refresh(onChange, onInject);
            })

            sortable.addEventListener('contextmenu', (event) => {
                event.preventDefault();

                if (this.table.sorting && this.table.sorting.length) {
                    // Do only if any sorting exists
                    if (event.ctrlKey) {
                        // Clear sorting if CTRL is held down
                        this.table.clearSorting();
                    } else {
                        // Remove current key
                        this.table.removeSorting(event.target.dataset.sortableKey);
                    }
    
                    // Redraw table
                    this.refresh(onChange, onInject);
                } else if (this.table.global_sorting) {
                    this.table.setDefaultSorting();
                    this.refresh(onChange, onInject);
                }
            })

            sortable.addEventListener('mousedown', (event) => {
                event.preventDefault();
            })
        }

        // Log stuff to console
        if (schanged || echanged || ignore) {
            Logger.log('TAB_GEN', `Table generated in ${ Date.now() - timestamp }ms! Instance: ${ schanged }, Entries: ${ echanged }, Unsorted: ${ ignore }`);
        } else {
            Logger.log('TAB_GEN', `Table generated in ${ Date.now() - timestamp }ms!`);
        }

        // Call callback when finished
        onChange();
    }
}

function getCSSBorderClass (border) {
    if (typeof border === 'number') {
        switch (border) {
            case 4: return 'border-top-thin';
            case 5: return 'border-bottom-thin';
            default: return '';
        }
    } else if (border) {
        return 'border-right-thin';
    } else {
        return '';
    }
}

// Cell generators
const CellGenerator = {
    // Simple cell
    Cell: function (c, b, color, bo, al, pad, style, cellWidth, hasAction) {
        let border = getCSSBorderClass(bo);
        if (color === false) {
            color = getCSSColorFromBackground(b);
        }

        return `<td class="${ border } ${ al ? al : '' } ${ hasAction ? 'cursor-pointer' : '' }" ${ hasAction ? '{__ACTION__}' : '' } style="${ cellWidth ? `width: ${ cellWidth }px;` : '' } ${ color ? `color:${ color };` : '' }${ b ? `background:${ b };` : '' }${ pad ? `padding-left: ${ pad } !important;` : '' }${ style || '' }">${ hasAction ? '{__ACTION_OP__}' : '' }${ c }</td>`;
    },
    // Wide cell
    WideCell: function (c, b, w, al, pad, style) {
        let { fg, bg } = typeof b === 'object' ? b : {};
        return `<td class="${ al ? al : '' }" colspan="${ w }" style="${ fg ? `color: ${fg};` : '' }${ bg ? `background:${ bg };` : '' }${ pad ? `padding-left: ${ pad } !important;` : '' }${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo, al, bg, style, cellWidth) {
        let border = getCSSBorderClass(bo);

        return `<td class="${ border } ${ al ? al : '' }" style="${ cellWidth ? `width: ${ cellWidth }px;` : '' } ${ bg ? `background: ${ bg };` : '' }${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    PlainSpan: function (s, c, bo, al, bg, style) {
        let border = getCSSBorderClass(bo);

        return `<td class="${ border } ${ al ? al : '' }" colspan="${ s }"  style="${ bg ? `background: ${ bg };` : '' }${ style || '' }">${ c }</td>`;
    },
    // Difference
    Difference: function (d, b, c) {
        return d != 0 ? ` <span>${ b ? '(' : '' }${ d > 0 ? '+' : '' }${ c == null ? d : c }${ b ? ')' : '' }</span>` : '';
    },
    // Empty cell
    Empty: function (b) {
        return `<td ${ b ? 'class="border-right-thin"' : '' }></td>`;
    },
    // Small text,
    Small: function (c) {
        return `<span>${ c }</span>`;
    },
    // Embed table
    EmbedTable: function (c, b, bo, f) {
        let bg = b ? `background:${ b };` : '';
        let fr = f ? `font: ${f};` : '';
        return `<td style="padding: 0; vertical-align: top; ${ bg }" class="${bo ? 'border-right-thin' : ''}">
            <table style="width: 100%; border-spacing: 0; border-collapse: collapse; ${ bg } ${fr}">
                ${c}
            </table>
        </td>`
    }
}
