// Category
class HeaderGroup {
    constructor (name, settings, i) {
        this.name = name;
        this.index = i;

        this.sortKey = `${ settings.name }.${ i }`;

        this.width = 0;
        this.length = 0;
        this.headers = [];
    }

    add (name, settings, generators, sort, bordered, span = 1) {
        const header = Object.assign(settings || {}, {
            name,
            generators,
            sort,
            sortKey: SHA1(`${ this.sortKey }.${ settings.name }.${ this.headers.length }`),
            span,
            bordered
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
    add (current, compare, latest, hidden) {
        super.push({
            current,
            compare: compare || current,
            index: this.length,
            latest,
            hidden: hidden
        });
    }
}

class PlayerTableArray extends TableArray {
    add (current, compare) {
        super.push({
            current,
            compare: compare || current,
            index: this.length
        })
    }
}

// joined, kicked, missing, timestamp, reference
class GroupTableArray extends TableArray {
    add (current, compare) {
        super.push({
            current: current,
            compare: compare || current,
            index: this.length
        });
    }
}

// Table instance
class TableInstance {
    constructor (tableType) {
        this.tableType = tableType;
    }

    createTable () {
        const props = this.#sharedProperties();

        if (this.tableType === TableType.Player) {
            return Object.assign(props, this.#createPlayerTable());
        } else if (this.tableType === TableType.Group) {
            return Object.assign(props, this.#createGroupTable());
        } else if (this.tableType === TableType.Players || this.tableType === TableType.Groups) {
            return Object.assign(props, this.#createBrowseTable());
        }
    }

    #addHeader (name, group, header, showBorder) {
        group.add(
            name,
            header,
            {
                cell: (current, compare) => {
                    const val = this.#safeEval(header.expr, current, compare, this.settings, undefined, header);

                    if (val == undefined) {
                        return this.#getEmptyCell(header, showBorder);
                    } else {
                        const cmp = header.difference ? this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;
                        return this.#getCell(
                            header,
                            this.#getCellDisplayValue(header, val, cmp, current, compare),
                            this.#getCellColor(header, val, current, compare),
                            showBorder
                        );
                    }
                },
                statistics: (currentList, operation) => {
                    let val = currentList.map(({ current, compare }) => this.#safeEval(header.expr, current, compare, this.settings, undefined, header)).filter(v => v != undefined);
                    if (val.length) {
                        // Get value and trunc if necessary
                        val = operation(val);
                        if (!header.decimal) {
                            val = Math.trunc(val);
                        }

                        // Compare value
                        let cmp = undefined;
                        if (header.difference) {
                            cmp = currentList.map(({ compare }) => this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header)).filter(v => v != undefined);
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
                            this.#getStatisticsDisplayValue(header, val, cmp),
                            '',
                            this.#getStatisticsColor(header, val)
                        );
                    } else {
                        return this.#getEmptyCell(header);
                    }
                }
            },
            (current, compare) => this.#safeEval(header.expr, current, compare, this.settings, undefined, header),
            showBorder
        );
    }

    #addGroupedHeader (name, group, header, showBorder) {
        let callWidth = header.width || 100;

        group.add(
            name,
            header,
            {
                cell: (current, compare) => {
                    const vals = this.#safeEval(header.expr, current, compare, this.settings, undefined, header);

                    if (!Array.isArray(vals)) {
                        return this.#getEmptyCell(header, showBorder, header.grouped);
                    } else {
                        const cmps = header.difference ? this.#safeEval(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;

                        return _join(_strictSlice(vals, header.grouped, undefined), (val, index) => {
                            const showEndBorder = showBorder && index == header.grouped - 1;
                            const extra = {
                                index: index
                            };

                            if (val == undefined) {
                                return this.#getEmptyCell(header, showEndBorder);
                            } else {
                                return this.#getCell(
                                    header,
                                    this.#getCellDisplayValue(header, val, header.difference ? cmps[index] : undefined, current, compare, extra),
                                    this.#getCellColor(header, val, current, compare, extra),
                                    showEndBorder,
                                    callWidth
                                );
                            }
                        });
                    }
                }
            },
            (current, compare) => {
                const vals = this.#safeEval(header.expr, current, compare, this.settings, undefined, header);

                if (Array.isArray(vals)) {
                    return _fastSum(_strictSlice(vals, header.grouped, undefined));
                } else {
                    return vals;
                }
            },
            showBorder,
            header.grouped
        );
    }

    #addEmbeddedHeader (name, group, header, showBorder) {
        if (header.columns && !header.width) {
            header.width = _sum(header.columns);
        }

        group.add(
            name,
            header,
            {
                cell: (current, compare) => {
                    let values = [null];

                    if (header.expr) {
                        const value = header.expr.eval(new ExpressionScope(this.settings).with(current, compare).via(header));
                        values = Array.isArray(value) ? value : [value];
                    }

                    const allBlank = _every(header.headers, h => !(h.nameExpression || (h.nameOverride ?? h.name)));
                    const generators = header.headers.map((embedHeader) => {
                        return {
                            name: () => {
                                let embedName = embedHeader.nameOverride ?? embedHeader.name;
                                if (typeof embedHeader.nameExpression !== 'undefined') {
                                    const resolvedName = embedHeader.nameExpression(this.settings, embedHeader);
                                    if (resolvedName != undefined) {
                                        embedName = String(resolvedName);
                                    }
                                }

                                return this.#getCell(
                                    embedHeader,
                                    embedName,
                                    '',
                                    embedHeader.border,
                                    _dig(header, 'columns', 0) || Math.max(100, embedName.length * 12)
                                );
                            },
                            get: (value, i) => {
                                const val = this.#safeEval(
                                    embedHeader.expr,
                                    current,
                                    compare,
                                    this.settings,
                                    new ExpressionScope(this.settings).with(current, compare).addSelf(value).via(embedHeader),
                                    embedHeader
                                );

                                if (val == undefined) {
                                    return this.#getEmptyCell(embedHeader, false, undefined, _dig(header, 'columns', i + 1));
                                } else {
                                    const cmp = embedHeader.difference ? this.#safeEval(
                                        embedHeader.expr,
                                        compare,
                                        compare,
                                        this.settings.getCompareEnvironment(),
                                        new ExpressionScope(this.settings.getCompareEnvironment()).with(compare, compare).addSelf(value).via(embedHeader),
                                        embedHeader
                                    ) : undefined;

                                    return this.#getCell(
                                        embedHeader,
                                        this.#getCellDisplayValue(embedHeader, val, cmp, current, compare, undefined, value),
                                        this.#getCellColor(embedHeader, val, current, compare, undefined, false, value),
                                        embedHeader.border,
                                        _dig(header, 'columns', i + 1)
                                    );
                                }
                            }
                        };
                    });

                    const rowHeight = header.rowHeight ? ` style="height: ${header.rowHeight}px;"` : '';
                    const entries = generators.map(({ name, get }) => {
                        return `<tr${rowHeight}>${ allBlank ? '' : name() }${ values.map((v, i) => get(v, i)).join('') }</tr>`;
                    }).join('');

                    return CellGenerator.EmbedTable(entries, this.#getCellColor(header, values, current, compare).bg, showBorder, header.font);
                }
            },
            null,
            showBorder
        );
    }

    #safeEval (obj, ...args) {
        if (obj instanceof Expression) {
            return obj.eval((args[3] || new ExpressionScope(args[2])).with(args[0], args[1]).via(args[4]));
        } else {
            return obj(args[0]);
        }
    }

    setScript (script, entries) {
        this.settings = new Script(
            script,
            ScriptType.Table,
            {
                table: this.tableType,
                timestamp: entries.timestamp,
                reference: entries.reference,
                entries: Script.createSegmentedArray(entries, entry => [entry.compare, entry.compare])
            }
        );

        // Handle trackers
        Actions.updateFromScript(this.settings.trackers);

        this.config = [];
        this.rowsConfig = [];

        this.sorting = [];

        // Loop over all categories
        this.settings.categories.forEach((category, categoryIndex, categories) => {
            // Add expression alias
            let categoryName = category.nameOverride ?? category.name;
            if (typeof category.nameExpression !== 'undefined') {
                const resolvedName = category.nameExpression(this.settings, category);
                if (resolvedName != undefined) {
                    categoryName = String(resolvedName);
                }
            }

            // Create header group
            let group = new HeaderGroup(categoryName, category, this.config.length);
            let lastCategory = categoryIndex == categories.length - 1;

            // Loop over all headers
            category.headers.forEach((header, headerIndex, headers) => {
                let lastHeader = headerIndex == headers.length - 1;
                let nextHeader = headers[headerIndex + 1];

                let showBorder = (!lastCategory && lastHeader) || (header.border >= 2) || (!lastHeader && (nextHeader.border == 1 || nextHeader.border == 3));

                // Add expression alias
                let headerName = header.nameOverride ?? header.name;
                if (typeof header.nameExpression !== 'undefined') {
                    const resolvedName = header.nameExpression(this.settings, header);
                    if (resolvedName != undefined) {
                        headerName = String(resolvedName);
                    }
                }

                if (header.embedded) {
                    this.#addEmbeddedHeader(headerName, group, header, showBorder);
                } else if (header.grouped) {
                    this.#addGroupedHeader(headerName, group, header, showBorder);
                } else {
                    this.#addHeader(headerName, group, header, showBorder);
                }
            })

            if (group.length) {
                this.config.push(group);
            }
        })

        // Scale everything
        if (this.settings.globals.scale) {
            const factor = this.settings.globals.scale / 100;

            for (const category of this.config) {
                category.width = Math.ceil(category.width * factor);
                for (const header of category.headers) {
                    header.width = Math.ceil(header.width * factor);
                }
            }
        }

        this.flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        this.sortMap = new Map();
        for (const header of this.flat) {
            this.sortMap.set(header.sortKey, header);
        }

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
        this.#createCache();
        this.#createSorting();
    }

    // Set players
    setEntries (array) {
        this.settings.evalBefore(array)

        this.array = array.map((entry) => {
            let { current, compare } = entry;

            current = DatabaseManager.getAny(current.LinkId, current.Timestamp);
            compare = DatabaseManager.getAny(current.LinkId, compare.Timestamp);

            let disc = this.settings.discardRules.some(rule => rule.eval(new ExpressionScope(this.settings).with(current, compare)));
            ExpressionCache.reset();

            if (disc) {
                return null;
            } else {
                entry.current = current;
                entry.compare = compare;

                return entry;
            }
        }).filter(e => e);

        // Copy over lost properties
        if (this.tableType === TableType.Players || this.tableType === TableType.Groups) {
            this.array.entryLimit = array.entryLimit;
            this.array.timestamp = array.timestamp;
            this.array.reference = array.reference;
        } else if (this.tableType === TableType.Group) {
            this.array.joined = array.joined;
            this.array.kicked = array.kicked;
            this.array.missing = array.missing;
            this.array.timestamp = array.timestamp;
            this.array.reference = array.reference;
        }

        // Apply sorting
        this.#applyIndexSorting(array)

        // Evaluate variables
        if (!array.suppressUpdate) {
            if (this.tableType == TableType.Player) {
                this.settings.evalPlayer(this.array, array);
            } else if (this.tableType == TableType.Players) {
                this.settings.evalPlayers(this.array, array);
            } else if (this.tableType == TableType.Group) {
                this.settings.evalGroup(this.array, array);
            } else if (this.tableType == TableType.Groups) {
                this.settings.evalGroups(this.array, array);
            }

            ExpressionCache.reset();
            this.#createCache();
        }

        this.#generateEntries();
    }

    #applyIndexSorting (array) {
        if (array.externalSort) {
            _sortDesc(this.array, ({ current, compare }) => array.externalSort(current, compare));
        } else if (this.settings.globals.orderAllBy) {
            this.array.sort((a, b) => this.#compareItems(
                this.#safeEval(this.settings.globals.orderAllBy, a.current, a.compare, this.settings),
                this.#safeEval(this.settings.globals.orderAllBy, b.current, b.compare, this.settings)
            ));
        } else if (this.flat.some((header) => header.orderDefault)) {
            const sortingList = [];

            for (const header of this.flat) {
                if (header.orderDefault) {
                    const { direction, index } = header.orderDefault;
                    const self = this;

                    sortingList.splice(typeof index === 'undefined' ? sortingList.length : index, 0, {
                        direction: direction === 'asc' ? 2 : 1,
                        flip: header.flip,
                        method: (current, compare) => {
                            const { order, expr, sort } = header;

                            if (order) {
                                const value = self.#safeEval(expr, current, compare, self.settings, undefined, header);

                                return self.#safeEval(order, current, compare, self.settings, new ExpressionScope(self.settings).with(current, compare).addSelf(value));
                            } else {
                                // Return native sorting function
                                return sort ? sort(current, compare) : 0;
                            }
                        }
                    })
                }
            }

            this.array.sort((a, b) => sortingList.reduce((result, { method, flip, direction }) => {
                if (result) return;

                const valueA = method(a.current, a.compare);
                const valueB = method(b.current, b.compare);

                return valueA == undefined ? 1 : (valueB == undefined ? -1 : (((direction == 1 && !flip) || (direction == 2 && flip)) ? this.#compareItems(valueA, valueB) : this.#compareItems(valueB, valueA)));
            }, undefined));
        }

        this.array.forEach((entry, i) => entry.index = i);
    }

    #generateSorting (current, compare, index) {
        const self = this;

        return new Proxy({
            '_index': index
        }, {
            get: function (target, prop) {
                if (target[prop]) {
                    return target[prop];
                } else {
                    const header = self.sortMap.get(prop);
                    if (header) {
                        const { order, expr, sort } = header;

                        let sortValue = undefined;
                        if (order) {
                            let value = self.#safeEval(expr, current, compare, self.settings, undefined, header);
                            sortValue = self.#safeEval(order, current, compare, self.settings, new ExpressionScope(self.settings).with(current, compare).addSelf(value));
                        } else {
                            // Return native sorting function
                            sortValue = sort ? sort(current, compare) : 0;
                        }
    
                        return(target[prop] = sortValue);
                    } else {
                        return index;
                    }
                }
            }
        })
    }

    // Generate entries
    #generateEntries () {
        // Common settings
        const dividerStyle = this.#getCellDividerStyle();
        const rowHeight = this.settings.getRowHeight();

        const hidden = this.tableType === TableType.Players || this.tableType === TableType.Groups;
        const outdated = hidden && this.settings.getOutdatedStyle();

        // Hoist
        const self = this;

        // Generate entries
        this.entries = this.array.map((entry) => ({
            index: entry.index,
            current: entry.current,
            sorting: this.#generateSorting(entry.current, entry.compare, entry.index),
            get node () {
                delete this.node;

                let html = '';
                for (const header of self.flat) {
                    html += self.#getCellContent(header, entry.current, entry.compare);
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
        const index = this.sorting.findIndex(sort => sort.key == key);

        if (index != -1) {
            this.sorting.splice(index, 1);
            this.sort();
        }
    }

    // Add key to sorting queue
    setSorting (key = undefined) {
        const index = this.sorting.findIndex(sort => sort.key == key);

        if (index == -1) {
            const obj = this.flat.find(header => header.sortKey == key);

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
        this.entries.sort((a, b) => this.#sortGlobally(a, b) || this.#sortDefault(a, b));
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

    #compareItems (a, b) {
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

    #sortGlobally (a, b) {
        if (this.sorting) {
            return this.sorting.reduce((result, { key, flip, order }) => result || (a.sorting[key] == undefined ? 1 : (b.sorting[key] == undefined ? -1 : (((order == 1 && !flip) || (order == 2 && flip)) ? this.#compareItems(a.sorting[key], b.sorting[key]) : this.#compareItems(b.sorting[key], a.sorting[key])))), undefined);
        } else {
            return undefined;
        }
    }

    #sortDefault (a, b) {
        return this.globalSortingOrder * (a.sorting[this.globalSortingKey] - b.sorting[this.globalSortingKey]);
    }

    #createCache () {
        this.cache = new Map();
        this.cache.set('spacer', this.#getSpacer());
        this.cache.set('divider', this.#getDivider());
    }

    #createSorting () {
        this.globalSortingKey = '_index';
        this.globalSortingOrder = 1;
    }

    #getCellDividerStyle () {
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

    #getCell (header, value, color, border, cellWidth) {
        return CellGenerator.Cell(
            value,
            color.bg,
            header.visible ? color.fg : false,
            border,
            header.align,
            header.style ? header.style.cssText : undefined,
            cellWidth,
            header.action
        );
    }

    #getEmptyCell (header, border = undefined, span = 0, cellWidth = undefined) {
        if (span) {
            return CellGenerator.PlainSpan(
                span,
                header.formatUndefined,
                border,
                undefined,
                header.colorUndefined,
                header.style ? header.style.cssText : undefined
            );
        } else {
            return CellGenerator.Plain(
                header.formatUndefined,
                border,
                undefined,
                header.colorUndefined,
                header.style ? header.style.cssText : undefined,
                header.cellWidth
            );
        }
    }

    #getCellDisplayValue (header, val, cmp, current = undefined, compare = undefined, extra = undefined, altSelf = undefined) {
        const { difference, ex_difference, flip, differenceBrackets, differencePosition } = header;
        const displayValue = header.getValue(current, compare, this.settings, val, extra, header, altSelf);

        if (!difference || isNaN(cmp)) {
            return displayValue;
        } else {
            const diff = (flip ? -1 : 1) * (val - cmp);
            if ((Object.is(diff, NaN) && !ex_difference) || diff == 0) {
                return displayValue;
            } else {
                return displayValue + CellGenerator.Difference(diff, differenceBrackets, differencePosition, header.getDifferenceValue(current, compare, this.settings, diff, extra));
            }
        }
    }

    #getStatisticsDisplayValue (header, val, cmp) {
        const { difference, ex_difference, flip, differenceBrackets, differencePosition } = header;
        const displayValue = header.getStatisticsValue(this.settings, val);

        if (!difference || isNaN(cmp)) {
            return displayValue;
        } else {
            const diff = (flip ? -1 : 1) * (val - cmp);
            if ((Object.is(diff, NaN) && !ex_difference) || diff == 0) {
                return displayValue;
            } else {
                return displayValue + CellGenerator.Difference(diff, differenceBrackets, differencePosition, header.getDifferenceValue(undefined, undefined, this.settings, diff));
            }
        }
    }

    #getStatisticsColor (header, value) {
        return header.getStatisticsColor(this.settings, value);
    }

    #getCellColor (header, val, current = undefined, compare = undefined, extra = undefined, ignoreBase = false, altSelf = undefined) {
        return header.getColor(current, compare, this.settings, val, extra, ignoreBase, header, altSelf);
    }

    #getTable () {
        return `
            <tr class="headers">
                ${ this.#getCategoryBlock(this.configLeft, this.config.length > 0) }
                ${ this.#getCategoryBlock() }
            </tr>
            <tr class="headers">
                ${ this.#getHeaderBlock(this.configLeft, this.config.length > 0) }
                ${ this.#getHeaderBlock() }
            </tr>
            <tr data-entry-injector>
                <td colspan="${ this.flatSpan }" style="height: 8px;"></td>
            </tr>
        `
    }

    #getDivider () {
        return `
            <tr class="border-bottom-thick"></tr>
        `;
    }

    #getSpacer () {
        return `
            <tr>
                <td colspan="${ this.flatSpan }"></td>
            </tr>
        `;
    }

    #getRow (name, row, val, cmp, current = undefined) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ this.leftFlatSpan }">${name}</td>
                ${ CellGenerator.WideCell(
                    this.#getCellDisplayValue(row, val, cmp, current),
                    this.#getCellColor(row, val, current),
                    this.flatWidth,
                    row.align,
                    row.style ? row.style.cssText : undefined
                ) }
            </tr>
        `;
    }

    #sharedProperties () {
        return {
            theme: this.settings.getTheme(),
            style: [ this.settings.getFontStyle(), this.settings.getBorderColor() ],
            class: [ this.settings.getOpaqueStyle() ],
            width: this.flatWidth,
            widthFixed: this.settings.isStrictWidthPolicy(),
            columnCount: this.flatSpan
        };
    }

    #getContent () {
        this.cache.set('table', this.#getTable());

        let content = this.settings.isStrictWidthPolicy() ? this.#getSizer() : '';
        let layout = this.settings.getLayout(this.cache.get('statistics'), this.cache.get('rows'), this.cache.get('members'));

        for (const block of layout) {
            if (block == '|') {
                content += this.cache.get('divider');
            } else if (block == '_') {
                content += this.cache.get('spacer');
            } else {
                content += this.cache.get(block) || '';
            }
        }

        return content;
    }

    // Renders statistics rows into cache
    #renderStatistics () {
        if (this.cache.has('statistics')) {
            return;
        } else if (this.rightFlat.reduce((a, { statistics }) => a || statistics, false)) {
            if (this.settings.customStatistics.length) {
                this.cache.set('statistics', this.#getStatistics(this.leftFlatSpan, this.settings.customStatistics));
            } else {
                this.cache.set('statistics', this.#getStatistics(this.leftFlatSpan, [
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
                ]));
            }
        } else {
            this.cache.set('statistics', '');
        }
    }

    // Renders members into cache
    #renderMembers () {
        if (this.cache.has('members')) {
            return;
        } else if (this.settings.globals.members) {
            this.cache.set('members', `
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Classes</td>
                    <td colspan="${ this.rightFlatSpan }">${ Object.entries(this.settings.listClasses).map(([ key, count ]) => intl(`general.class${key}`) + ': ' + count).join(', ') }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Joined</td>
                    <td colspan="${ this.rightFlatSpan }">${ this.settings.listJoined.join(', ') }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" colspan=${ this.leftFlatSpan }>Left</td>
                    <td colspan="${ this.rightFlatSpan }">${ this.settings.listKicked.join(', ') }</td>
                </tr>
            `);
        } else {
            this.cache.set('members', '');
        }
    }

    #renderMissing () {
        if (this.cache.has('missing')) {
            return;
        } else if (this.settings.listMissing.length) {
            this.cache.set('missing', `
                <tr class="font-weight: bold;">
                    ${
                        CellGenerator.WideCell(
                            CellGenerator.Small(`${intl('stats.guilds.missing')}<br/>${ this.settings.listMissing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`),
                            undefined,
                            this.flatWidth,
                            'center'
                        )
                    }
                </tr>
            `);
        } else {
            this.cache.set('missing', '');
        }
    }

    #renderRow (row, val, cmp, current) {
        let rowName = row.nameOverride ?? row.name;
        if (typeof row.nameExpression !== 'undefined') {
            const resolvedName = row.nameExpression(this.settings, row);
            if (resolvedName != undefined) {
                rowName = String(resolvedName);
            }
        }

        return this.#getRow(rowName, row, val, cmp, current);
    }

    #renderRows (includePlayer = false) {
        if (this.cache.has('rows')) {
            return;
        } else if (this.settings.customRows.length) {
            if (includePlayer) {
                this.cache.set('rows', _join(this.settings.customRows, row => this.#renderRow(row, row.eval.value, undefined, _dig(this.array, 0, 'current'))));
            } else {
                this.cache.set('rows', _join(this.settings.customRows, row => this.#renderRow(row, row.eval.value, row.eval.compare)));
            }
        } else {
            this.cache.set('rows', '');
        }
    }

    #createPlayerTable () {
        this.#renderRows(true);
        this.#renderStatistics();

        const forcedLimit = this.settings.getEntryLimit();

        // Create table Content
        return {
            entries: forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries,
            content: this.#getContent()
        };
    }

    // Create players table
    #createBrowseTable () {
        this.#renderRows();
        this.#renderStatistics();

        const forcedLimit = this.array.entryLimit || this.settings.getEntryLimit();

        return {
            entries: forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries,
            content: this.#getContent()
        };
    }

    // Create guilds table
    #createGroupTable () {
        this.#renderRows();
        this.#renderMissing();
        this.#renderStatistics();
        this.#renderMembers();

        return {
            entries: this.entries,
            content: this.#getContent()
        };
    }

    #getCellContent ({ action, generators: { cell } }, current, compare) {
        if (action == 'show') {
            return cell(current, compare).replace('{__ACTION__}', `data-id="${ current.LinkId }" data-ts="${ current.Timestamp }"`).replace('{__ACTION_OP__}', `<span class="css-op-select-el"></span>`);
        } else {
            return cell(current, compare);
        }
    }

    #getStatistics (leftSpan, entries) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ leftSpan }"></td>
                ${ _join(this.rightFlat, ({ span, statistics, generators, name }) => `<td colspan="${ span }">${ statistics && generators.statistics ? name : '' }</td>`) }
            </tr>
            ${ this.cache.get('divider') }
            ${ _join(entries, ({ name, ast, expression }) => `
                <tr>
                    <td class="border-right-thin" colspan="${ leftSpan }">${ name }</td>
                    ${ _join(this.rightFlat, ({ span, statistics, generators }) => statistics && generators.statistics ? generators.statistics(this.array, expression ? expression : array => ast.eval(new ExpressionScope(this.settings).addSelf(array))) : `<td colspan="${ span }"></td>`) }
                </tr>
            `) }
        `;
    }

    #getCategoryBlock (config = this.config, alwaysRightBorder = false) {
        const aligned = this.settings.getTitleAlign();

        return _join(config, ({ headers, length, name: categoryName }, categoryIndex, categoryArray) => {
            const notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;
            const emptyCategoryName = categoryName.length === 0;

            if (emptyCategoryName && !aligned) {
                return _join(headers, ({ width, span, sortKey, name: headerName, alignTitle }, headerIndex, headerArray) => {
                    const lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td rowspan="2" colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="border-bottom-thick ${ alignTitle ? alignTitle : '' } ${ lastHeader ? 'border-right-thin' : '' } cursor-pointer" ${ this.#getSortingTag(sortKey) }>${ headerName }</td>`
                });
            } else {
                return `<td colspan="${ length }" class="${ notLastCategory ? 'border-right-thin' : '' }">${ aligned && emptyCategoryName ? '' : categoryName }</td>`;
            }
        });
    }

    #getHeaderBlock (config = this.config, alwaysRightBorder = false) {
        const aligned = this.settings.getTitleAlign();

        return _join(config, ({ headers, name: categoryName }, categoryIndex, categoryArray) => {
            const notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;
            const emptyCategoryName = categoryName.length === 0;

            if (emptyCategoryName && !aligned) {
                return '';
            } else {
                return _join(headers, ({ width, span, name, sortKey, alignTitle }, headerIndex, headerArray) => {
                    const lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="border-bottom-thick ${ alignTitle ? alignTitle : '' } ${ lastHeader ? 'border-right-thin' : '' } cursor-pointer" ${ this.#getSortingTag(sortKey) }>${ name }</td>`
                });
            }
        });
    }

    #getSizer () {
        const content = _join(this.flat, ({ span, width, grouped }) => {
            if (grouped) {
                const sliceWidth = Math.trunc(width / grouped);

                return `<td style="width: ${sliceWidth}px; max-width: ${sliceWidth}px;"></td>`.repeat(grouped);
            } else {
                return `<td colspan="${span}" style="width: ${width}px; max-width: ${width}px;"></td>`
            }
        })

        return `<tr class="headers" style="visibility: collapse;">${content}</tr>`
    }

    #getSortingTag (key) {
        let index = this.sorting.findIndex(s => s.key == key);
        return `data-sortable-key="${ key }" data-sortable="${ this.sorting[index] ? this.sorting[index].order : 0 }" data-sortable-index="${ this.sorting.length == 1 ? '' : (index + 1) }"`;
    }
}

class TableController extends SignalSource {
    constructor ($table, tableType) {
        super();

        this.headElement = document.createElement('thead');
        this.bodyElement = document.createElement('tbody');
        
        this.element = $table.get(0);
        this.element.replaceChildren(
            this.headElement,
            this.bodyElement
        )

        this.tableType = tableType;
        this.table = new TableInstance(this.tableType);

        // Changed by default
        this.scriptChanged = true;
        this.entriesChanged = true;
    }

    async toImage (cloneCallback) {
        return new Promise(async (resolve) => {
            const canvas = await html2canvas(this.element, {
                logging: false,
                allowTaint: true,
                useCORS: true,
                onclone: (document) => {
                    if (cloneCallback) {
                        cloneCallback($(document).find(`table[data-uuid="${this.element.dataset.uuid}"]`));
                    }
                }
            });

            canvas.toBlob(resolve);
        })
    }

    async toCSV () {
        return new Promise((resolve) => {
            const headers = this.table.flat.map((header) => header.name);
            const headersLength = headers.length;

            const data = [
                JSON.stringify(headers).slice(1, -1)
            ];

            for (const entry of this.table.entries) {
                const stack = Array(headersLength);
                const node = entry.node.cloneNode(true);

                for (const diff of node.querySelectorAll('[data-difference]')) {
                    diff.remove();
                }

                const children = node.childNodes;
                for (let i = 0; i < headersLength; i++) {
                    stack[i] = children[i].innerText.replace(/[\s]/m, ' ');
                }

                data.push(JSON.stringify(stack).slice(1, -1));
            }

            resolve(data.join('\n'));
        })
    }

    setScript (code) {
        // If settings have changed
        if (this.script != code) {
            this.script = code;
            this.scriptChanged = true;

            // Clear sorting when settings have changed
            this.clearSorting();
        }
    }

    getEntryLimit () {
        return this.table ? this.table.settings.getEntryLimit() : 0;
    }

    setEntries (entries) {
        this.entries = entries;
        this.entriesChanged = true;
    }

    getArray () {
        return this.table ? this.table.array : [];
    }

    getInternalEntries () {
        return this.table ? this.table.entries : [];
    }

    clearSorting () {
        this.resetSorting = true;
    }

    prepareInjector (entries) {
        if (this.injectorObserver) {
            this.injectorObserver.disconnect();
        }

        this.injectorEntries = entries;
        this.injectorBlockSize = Math.trunc((SiteOptions.load_rows || SiteOptions.default('load_rows')) / 2);
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
            const timestamp = Date.now();

            const blockSize = Math.min(this.injectorEntries.length, size);
            this.injectCount += blockSize;

            const entriesSlice = this.injectorEntries.splice(0, size);
            const fragment = new DocumentFragment();

            for (const entry of entriesSlice) {
                fragment.append(entry.node);
            }

            this.injectorElement.parentElement.insertBefore(fragment, this.injectorElement);

            for (const entry of entriesSlice) {
                const node = entry.node;

                if (!node.injectCalled) {
                    node.injectCalled = true;

                    this.emit('inject', node);
                }
            }

            this.table.reflowIndexes();

            if (this.injectorEntries.length == 0) {
                this.injectorObserver.disconnect();
            }

            Logger.log('TAB_GEN', `Block of size ${blockSize} injected in ${ Date.now() - timestamp }ms!`);
        }
    }

    refresh () {
        // Log some console stuff for fun
        const scriptChanged = this.scriptChanged || false;
        const entriesChanged = this.entriesChanged || false;
        const resetSorting = this.resetSorting || false;

        const timestamp = Date.now();

        // Save sorting if needed
        const sorting = this.resetSorting ? null : this.table.sorting;

        // Create table
        if (this.entriesChanged || this.scriptChanged) {
            this.entries.suppressUpdate = false;

            this.table.setScript(this.script, this.entries);

            this.resetSorting = false;
            this.resetInjector();

            this.table.setEntries(this.entries);
            this.table.sort();
        }

        // Reset sorting
        if (sorting != null) {
            this.table.sorting = sorting;
            this.table.sort();
        }

        // Reset sorting if ignored
        if (this.resetSorting) {
            this.table.clearSorting();
        }

        // Clear flag
        this.resetSorting = false;
        this.scriptChanged = false;
        this.entriesChanged = false;

        // Get table content
        let { content, entries, style, class: klass, theme, width, widthFixed, columnCount } = this.table.createTable();

        entries = [].concat(entries);

        let themeClass = '';
        let themeStyle = '';
        if (typeof theme === 'string') {
            themeClass = `theme-${theme}`;
        } else if (typeof theme === 'object') {
            const { text, background } = theme;
            themeStyle = `--table-foreground: ${text}; --table-background: ${background}`;
        }

        if (widthFixed) {
            this.element.classList.add('sftools-table-fixed');
        } else {
            this.element.classList.remove('sftools-table-fixed');
        }

        this.element.dataset.uuid = randomSHA1();
        this.element.dataset.columnCount = columnCount;

        this.bodyElement.setAttribute('style', `${themeStyle} ${style.join(' ')}`);
        this.bodyElement.setAttribute('class', `${themeClass} ${klass.join(' ')}`);
        this.bodyElement.innerHTML = content;

        this.injectCount = this.injectCount || SiteOptions.load_rows || SiteOptions.default('load_rows');
        this.injectorElement = this.bodyElement.querySelector('[data-entry-injector]');

        if (this.injectorElement) {
            const entriesSlice = entries.splice(0, this.injectCount);
            const fragment = new DocumentFragment();

            for (const entry of entriesSlice) {
                fragment.append(entry.node);
            }

            this.injectorElement.parentElement.insertBefore(fragment, this.injectorElement);

            for (const entry of entriesSlice) {
                const node = entry.node;

                if (!node.injectCalled) {
                    node.injectCalled = true;

                    this.emit('inject', node);
                }
            }

            this.table.reflowIndexes();
        }

        this.element.style.width = `${width}px`;
        this.element.style.left = `max(0px, calc(50vw - 9px - ${ width / 2 }px))`;

        if (SiteOptions.table_sticky_header) {
            let offset = 0

            for (const header of this.element.querySelectorAll('tr.headers')) {
                header.classList.add('sticky')
                header.style.setProperty('--top-offset', `${offset}px`);

                offset += header.getBoundingClientRect().height;
            }
        }

        if (this.injectorElement) {
            if (entries.length > 0) {
                this.prepareInjector(entries);
            } else {
                this.injectorElement.remove();
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
                this.refresh();
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
                    this.refresh();
                }
            })

            sortable.addEventListener('mousedown', (event) => {
                event.preventDefault();
            })
        }

        // Log stuff to console
        if (scriptChanged || entriesChanged || resetSorting) {
            Logger.log('TAB_GEN', `Table generated in ${ Date.now() - timestamp }ms! Instance: ${ scriptChanged }, Entries: ${ entriesChanged }, Unsorted: ${ resetSorting }`);
        } else {
            Logger.log('TAB_GEN', `Table generated in ${ Date.now() - timestamp }ms!`);
        }

        // Call callback when finished
        this.emit('change');
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
    Cell: function (c, b, color, bo, al, style, cellWidth, hasAction) {
        let border = getCSSBorderClass(bo);
        if (color === false) {
            color = getCSSColorFromBackground(b);
        }

        return `<td class="${ border } ${ al ? al : '' } ${ hasAction ? 'cursor-pointer' : '' }" ${ hasAction ? '{__ACTION__}' : '' } style="${ cellWidth ? `width: ${ cellWidth }px;` : '' } ${ color ? `color:${ color };` : '' }${ b ? `background:${ _escape(b) };` : '' }${ style || '' }">${ hasAction ? '{__ACTION_OP__}' : '' }${ c }</td>`;
    },
    // Wide cell
    WideCell: function (text, color, colSpan, alignClass, style) {
        let { fg, bg } = typeof color === 'object' ? color : {};
        return `
            <td class="${ alignClass || '' }" colspan="${ colSpan }" style="${ fg ? `color: ${fg};` : '' }${ bg ? `background:${ _escape(bg) };` : '' }${ style || '' }">${ text }</td>
        `;
    },
    // Plain cell
    Plain: function (c, bo, al, bg, style, cellWidth) {
        let border = getCSSBorderClass(bo);

        return `<td class="${ border } ${ al ? al : '' }" style="${ cellWidth ? `width: ${ cellWidth }px;` : '' } ${ bg ? `background: ${ _escape(bg) };` : '' }${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    PlainSpan: function (s, c, bo, al, bg, style) {
        let border = getCSSBorderClass(bo);

        return `<td class="${ border } ${ al ? al : '' }" colspan="${ s }"  style="${ bg ? `background: ${ _escape(bg) };` : '' }${ style || '' }">${ c }</td>`;
    },
    // Difference
    Difference: function (d, showBrackets, position, c) {
        return `${position === 'below' ? '<br>' : ' '}<span data-difference>${ showBrackets ? showBrackets[0] : '' }${ d > 0 ? '+' : '' }${ c == null ? d : c }${ showBrackets ? showBrackets[1] : '' }</span>`;
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
        let bg = b ? `background:${ _escape(b) };` : '';
        let fr = f ? `font: ${f};` : '';
        return `<td style="padding: 0; vertical-align: top; ${ bg }" class="${bo ? 'border-right-thin' : ''}">
            <table style="width: 100%; border-spacing: 0; border-collapse: collapse; ${ bg } ${fr}">
                ${c}
            </table>
        </td>`
    }
}
