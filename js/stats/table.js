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

// Special array for players only
class PlayersTableArray extends Array {
    constructor (perf, ts, rs) {
        super();

        this.perf = perf;
        this.timestamp = _safe_int(ts);
        this.reference = _safe_int(rs);
    }

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

// Special array for group only
class GroupTableArray extends Array {
    constructor (joined, kicked, ts, rs, missing) {
        super();

        this.joined = joined;
        this.kicked = kicked;
        this.timestamp = _safe_int(ts);
        this.reference = _safe_int(rs);
        this.missing = missing;
    }

    add (player, compare) {
        super.push({
            player: player,
            compare: compare || player,
            index: this.length
        });
    }
}

function getSafeExpr (obj, ...args) {
    if (obj instanceof Expression) {
        return (args[3] || new ExpressionScope(args[2])).with(args[0], args[1]).via(args[4]).eval(obj);
    } else {
        return obj(args[0]);
    }
}

// Table instance
class TableInstance {
    constructor (settings, type, filteredCategories = null) {
        // Parameters
        this.type = type;
        this.settings = new Settings(settings, type);

        // Handle trackers
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
                    trackerCode += `${ trackerCode ? '\n' : '' }${ tracker.str } # Automatic entry from ${ formatDate(Date.now()) }`;
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

                        let allBlank = _all_true(header.headers, h => !(h.expa || h.alias || h.name));
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
                                    let val = getSafeExpr(
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
                                        let cmp = embedHeader.difference ? getSafeExpr(
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
                        let vals = getSafeExpr(header.expr, player, compare, this.settings, undefined, header);

                        if (!Array.isArray(vals)) {
                            return this.getEmptyCell(header, showBorder, header.grouped);
                        } else {
                            let cmps = header.difference ? getSafeExpr(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;

                            return join(vals, (val, index) => {
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
                        let vals = getSafeExpr(header.expr, player, compare, this.settings, undefined, header);

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
                        let val = getSafeExpr(header.expr, player, compare, this.settings, undefined, header);

                        if (val == undefined) {
                            return this.getEmptyCell(header, showBorder);
                        } else {
                            let cmp = header.difference ? getSafeExpr(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header) : undefined;
                            return this.getCell(
                                header,
                                this.getCellDisplayValue(header, val, cmp, player, compare),
                                this.getCellColor(header, val, player, compare),
                                showBorder
                            );
                        }
                    }, (players, operation) => {
                        // Statistics
                        let val = players.map(({ player, compare }) => getSafeExpr(header.expr, player, compare, this.settings, undefined, header)).filter(v => v != undefined);
                        if (val.length) {
                            // Get value and trunc if necessary
                            val = operation(val);
                            if (!header.decimal) {
                                val = Math.trunc(val);
                            }

                            // Compare value
                            let cmp = undefined;
                            if (header.difference) {
                                cmp = players.map(({ compare }) => getSafeExpr(header.expr, compare, compare, this.settings.getCompareEnvironment(), undefined, header)).filter(v => v != undefined);
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
                        return getSafeExpr(header.expr, player, compare, this.settings, undefined, header);
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

        if (this.settings.globals['custom left']) {
            this.configLeft = this.config.splice(0, 1);
            if (this.configLeft.length == 0) {
                this.configLeft = this.leftFlat = this.leftFlatSpan = this.leftFlatWidth = undefined;
            } else {
                this.leftFlat = this.configLeft[0].headers;
                this.leftFlatSpan = this.leftFlat.reduce((a, b) => a + b.span, 0);
                this.leftFlatWidth = this.leftFlat.reduce((a, b) => a + b.width, 0);
            }
        }

        // Generate flat list
        this.rightFlat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);

        this.rightFlatWidth = this.config.reduce((a, b) => a + b.width, 0);
        this.rightFlatSpan = this.rightFlat.reduce((t, h) => t + h.span, 0);

        this.cellDivider = this.getCellDivider();

        this.clearCache();

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

    // Set players
    setEntries (array, skipEvaluation = false, manualSort = null) {
        if (this.type == ScriptType.Player) {
            this.array = array.map(([ timestamp, e ]) => {
                let obj = DatabaseManager.getPlayer(e.Identifier, timestamp);
                let disc = this.settings.discardRules.some(rule => new ExpressionScope(this.settings).with(obj, obj).eval(rule));
                ExpressionCache.reset();

                return disc ? null : [ timestamp, obj ];
            }).filter(e => e);
        } else if (this.type == ScriptType.Browse) {
            this.array = array.map(obj => {
                let { player, compare } = obj;

                let p = DatabaseManager.getPlayer(player.Identifier, player.Timestamp);
                let c = DatabaseManager.getPlayer(player.Identifier, compare.Timestamp);

                let disc = this.settings.discardRules.some(rule => new ExpressionScope(this.settings).with(p, c).eval(rule));
                ExpressionCache.reset();

                return disc ? null : obj;
            }).filter(e => e);

            this.array.perf = array.perf;
            this.array.timestamp = array.timestamp;
            this.array.reference = array.reference;
        } else {
            this.array = array;
        }

        // Evaluate variables
        if (this.type == ScriptType.Player) {
            this.settings.evalHistory(this.array.map(p => p[1]), array.map(p => p[1]));
        } else if (!skipEvaluation) {
            if (this.type == ScriptType.Browse) {
                this.settings.evalPlayers(this.array, array);
            } else {
                this.settings.evalGuilds(this.array, array);
            }
        }

        if (!skipEvaluation || this.type == ScriptType.Player) {
            ExpressionCache.reset();
            this.clearCache();
        }

        if (manualSort && this.type != ScriptType.Player) {
            this.array.sort((a, b) => manualSort(b.player, b.compare) - manualSort(a.player, a.compare)).forEach((entry, i) => entry.index = i);
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

    // Generate entries
    generateEntries () {
        // Clear current entries
        this.entries = [];

        // Common settings
        let backgroundColor = this.settings.getBackgroundStyle();
        let indexStyle = this.settings.getIndexStyle();
        let dividerStyle = this.getCellDividerStyle();
        let rowHeight = this.settings.getRowHeight();

        if (this.type == ScriptType.Player) {
            // Loop over all items of the array
            for (let i = 0; i < this.array.length; i++) {
                // Get variables
                let [ timestamp, player ] = this.array[i];
                let compare = i < this.array.length - 1 ? this.array[i + 1][1] : player;

                // Add table row start tag
                let content = `<tr class="css-entry ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;
                let color = this.getForegroundColor(backgroundColor, player, compare);

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}">
                            ${ i + 1 }
                        </td>
                    `;
                }

                if (this.leftFlat) {
                    for (let header of this.leftFlat) {
                        content += this.getCellContent(header, player, compare);
                    }
                } else {
                    // Add date
                    content += `
                        <td class="border-right-thin" style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}">
                            ${ formatDate(timestamp) }
                        </td>
                    `;
                }

                // Add columns
                for (let header of this.rightFlat) {
                    content += this.getCellContent(header, player, compare);
                }

                // Create new entry and push it to the list
                this.entries.push({
                    player: player,
                    content: content
                })
            }
        } else if (this.type == ScriptType.Browse) {
            // Whether timestamps match
            let noCompare = this.array.reference == this.array.timestamp;

            // Loop over all items of the array
            for (let { player, compare, hidden, index, latest } of this.array) {
                // Add table row start tag
                let content = `<tr class="css-entry ${ hidden ? 'opacity-50' :'' } ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;
                let color = this.getForegroundColor(backgroundColor, player, compare);

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}">
                            ${ indexStyle == 1 ? (index + 1) : '{__INDEX__}' }
                        </td>
                    `;
                }

                if (this.leftFlat) {
                    for (let header of this.leftFlat) {
                        content += this.getCellContent(header, player, compare);
                    }
                } else {
                    // Add server if enabled
                    let serverStyle = this.settings.getServerStyle();
                    if (serverStyle === undefined || serverStyle > 0) {
                        content += `
                            <td style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}">
                                ${ SiteOptions.obfuscated ? 'server' : player.Prefix }
                            </td>
                        `;
                    }

                    // Add name
                    let showOutdated = this.settings.getOutdatedStyle();
                    content += `
                        <td class="border-right-thin cursor-pointer ${ !latest && showOutdated ? '!text-red' : '' }" style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}" data-id="${ player.Identifier }" data-ts="${ player.Timestamp }">
                            <span class="css-op-select-el"></span>
                            ${ SiteOptions.obfuscated ? `player_${ index + 1 }` : player.Name }
                        </td>
                    `;
                }

                // Add columns
                for (let header of this.rightFlat) {
                    content += this.getCellContent(header, player, compare);
                }

                // Add table row end tag
                content += `</tr>`;

                // Create new entry and push it to the list
                this.entries.push({
                    player: player,
                    content: content,
                    sorting: this.flat.reduce((obj, header) => {
                        let { order, sortkey, flip, expr, sort } = header;
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = getSafeExpr(expr, player, compare, this.settings, undefined, header);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - getSafeExpr(expr, compare, compare, this.settings, undefined, header));
                            }

                            obj[sortkey] = getSafeExpr(order, player, compare, this.settings, new ExpressionScope(this.settings).with(player, compare).addSelf(value).add({ difference: difference }));
                        } else {
                            // Return native sorting function
                            obj[sortkey] = sort(player, compare);
                        }

                        if (this.settings.globals.order_by) {
                            obj['_order_by'] = getSafeExpr(this.settings.globals.order_by, player, compare, this.settings)
                        }

                        // Return sorting object
                        return obj;
                    }, {
                        // Default sorting keys
                        '_name': player.Name,
                        '_index': index,
                        '_server': player.Prefix
                    })
                });
            }
        } else if (this.type == ScriptType.Group) {
            // Whether timestamps match
            let noCompare = this.array.reference == this.array.timestamp;

            // Add missing entries to the entry list
            this.entries.missing = this.array.missing;

            // Loop over all items of the array
            for (let { player, compare, index } of this.array) {
                // Add table row start tag
                let content = `<tr class="css-entry ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;
                let color = this.getForegroundColor(backgroundColor, player, compare);

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}">
                            ${ indexStyle == 1 ? (index + 1) : '{__INDEX__}' }
                        </td>
                    `;
                }

                if (this.leftFlat) {
                    for (let header of this.leftFlat) {
                        content += this.getCellContent(header, player, compare);
                    }
                } else {
                    // Add name
                    content += `
                        <td class="border-right-thin cursor-pointer" style="${ backgroundColor ? `background: ${ backgroundColor };` : '' }${color}" data-id="${ player.Identifier }" data-ts="${ player.Timestamp }">
                            ${ SiteOptions.obfuscated ? `player_${ index + 1 }` : player.Name }
                        </td>
                    `;
                }

                // Add columns
                for (let header of this.rightFlat) {
                    content += this.getCellContent(header, player, compare);
                }

                // Add table row end tag
                content += `</tr>`;

                // Create new entry and push it to the list
                this.entries.push({
                    player: player,
                    content: content,
                    sorting: this.flat.reduce((obj, header) => {
                        let { order, sortkey, flip, expr, sort } = header;
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = getSafeExpr(expr, player, compare, this.settings, undefined, header);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - getSafeExpr(expr, compare, compare, this.settings, undefined, header));
                            }

                            obj[sortkey] = getSafeExpr(order, player, compare, this.settings, new ExpressionScope(this.settings).with(player, compare).addSelf(value).add({ difference: difference }));
                        } else {
                            // Return native sorting function
                            obj[sortkey] = sort(player, compare);
                        }

                        if (this.settings.globals.order_by) {
                            obj['_order_by'] = getSafeExpr(this.settings.globals.order_by, player, compare, this.settings)
                        }

                        // Return sorting object
                        return obj;
                    }, {
                        // Default sorting keys
                        '_name': player.Name,
                        '_index': index
                    })
                });
            }
        }
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

    setDefaultSorting () {
        this.sorting = [ ...this.global_sorting ];
    }

    _sort_globally (a, b, sort_list) {
        if (sort_list) {
            return sort_list.reduce((result, { key, flip, order }) => result || (a.sorting[key] == undefined ? 1 : (b.sorting[key] == undefined ? -1 : (((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key])))), undefined);
        } else {
            return undefined;
        }
    }

    _sort_default (a, b) {
        return this.global_ord * (a.sorting[this.global_key] - b.sorting[this.global_key]);
    }

    clearCache () {
        // Reset
        this.cache = { };
    }

    getCellDivider () {
        let lineType = this.settings.getLinedStyle();
        if (lineType == 2) {
            // Thick
            return `<tr class="border-bottom-thick"></tr>`;
        } else if (lineType == 1) {
            // Thin
            return `<tr class="border-bottom-thin"></tr>`;
        } else {
            // None
            return '';
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

    getCell ({ visible, align, padding, style, action }, value, color, border, cellWidth) {
        return CellGenerator.Cell(
            value,
            color.bg,
            visible ? color.fg : false,
            border,
            align,
            padding,
            style ? style.cssText : undefined,
            cellWidth,
            action
        );
    }

    getEmptyCell ({ ndef, ndefc, style }, border = undefined, span = 0, cellWidth = undefined) {
        if (span) {
            return CellGenerator.PlainSpan(
                span,
                ndef == undefined ? '?' : ndef,
                border,
                undefined,
                ndefc,
                style ? style.cssText : undefined
            );
        } else {
            return CellGenerator.Plain(
                ndef == undefined ? '?' : ndef,
                border,
                undefined,
                ndefc,
                style ? style.cssText : undefined,
                cellWidth
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

    getDivider (leftSpan, bottomSpacer, topSpacer) {
        return `
            ${ topSpacer ? `
                <tr>
                    <td colspan="${ this.rightFlatSpan + leftSpan }"></td>
                </tr>
            ` : '' }
            <tr class="border-bottom-thick"></tr>
            ${ bottomSpacer ? `
                <tr>
                    <td colspan="${ this.rightFlatSpan + leftSpan }"></td>
                </tr>
            ` : '' }
        `;
    }

    getSpacer (leftSpan) {
        return `
            <tr>
                <td colspan="${ this.rightFlatSpan + leftSpan }"></td>
            </tr>
        `;
    }

    getInjector (leftSpan) {
        return `
            <tr data-entry-injector>
                <td colspan="${ this.rightFlatSpan + leftSpan }" style="height: 8px;"></td>
            </tr>
        `;
    }

    getRow (leftSpan, row, val, cmp = undefined, player = undefined, compare = undefined, extra = undefined, ignoreBase = false) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ leftSpan }">${ row.name }</td>
                ${ CellGenerator.WideCell(
                    this.getCellDisplayValue(row, val, cmp, player, compare, extra),
                    this.getCellColor(row, val, player, compare, extra, ignoreBase),
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
            class: [ this.settings.getOpaqueStyle(), this.settings.getRowStyle() ]
        }
    }

    createPlayerTable () {
        // Width of the whole table
        let tableWidth = this.rightFlatWidth + (this.leftFlatWidth || 200) + (this.settings.getIndexStyle() ? 50 : 0);
        let indexStyle = this.settings.getIndexStyle();

        let leftSpan = (this.leftFlatSpan || 1) + (indexStyle ? 1 : 0);
        let spacer = this.getSpacer(leftSpan);
        let injector = this.getInjector(leftSpan);
        let divider = this.cache.divider = this.getDivider(leftSpan, false, false);

        // Get rows
        if (typeof this.cache.rows == 'undefined' && this.settings.customRows.length) {
            this.cache.rows = join(this.settings.customRows, row => this.getRow(leftSpan, row, row.eval.value, undefined, _dig(this.array, 0, 1))) + this.getDivider(leftSpan, true, false);
        }

        // Create left headers
        let headerTitle, categoryTitle;

        if (this.configLeft) {
            categoryTitle = this.getCategoryBlock(false, this.configLeft, true);
            headerTitle = this.getHeaderBlock(false, this.configLeft, true);

            if (indexStyle) {
                if (this.settings.getTitleAlign()) {
                    categoryTitle = `<td></td>` + categoryTitle;
                    headerTitle = `<td style="width: 50px;" colspan="1" class="border-bottom-thick">#</td>` + headerTitle;
                } else {
                    categoryTitle = `<td style="width: 50px;" colspan="1" rowspan="2" class="border-bottom-thick">#</td>` + categoryTitle;
                }
            }
        } else {
            if (this.settings.getTitleAlign()) {
                categoryTitle = `
                    <td colspan="${ indexStyle ? 2 : 1 }" class="border-right-thin"></td>
                `;

                headerTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" colspan="1" class="border-bottom-thick">#</td>` : '' }
                    <td style="width: 200px;" colspan="1" class="border-bottom-thick border-right-thin">Date</td>
                `;
            } else {
                categoryTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" colspan="1" rowspan="2" class="border-bottom-thick">#</td>` : '' }
                    <td style="width: 200px;" colspan="1" rowspan="2" class="border-bottom-thick border-right-thin">Date</td>
                `;

                headerTitle = '';
            }
        }

        // Get statistics
        if (typeof this.cache.statistics == 'undefined') {
            if (this.rightFlat.reduce((a, { statistics }) => a || statistics, false)) {
                if (this.settings.customStatistics.length) {
                    this.cache.statistics = this.getStatistics(leftSpan, this.settings.customStatistics);
                } else {
                    this.cache.statistics = this.getStatistics(leftSpan, [
                        {
                            name: 'Minimum',
                            expression: array => Math.min(... array)
                        },
                        {
                            name: 'Average',
                            expression: array => array.reduce((a, b) => a + b, 0) / array.length
                        },
                        {
                            name: 'Maximum',
                            expression: array => Math.max(... array)
                        }
                    ]);
                }
            } else {
                this.cache.statistics = '';
            }
        }

        this.cache.table = `
            <tr class="headers">
                ${ categoryTitle }
                ${ this.getCategoryBlock(false) }
            </tr>
            <tr class="headers border-bottom-thick">
                ${ headerTitle }
                ${ this.getHeaderBlock(false) }
            </tr>
            ${ injector }
        `;

        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, false);

        // Create table Content
        return {
            width: tableWidth,
            entries: this.entries.map(e => e.content),
            content: join(layout, (block) => {
                if (block == '|') {
                    return divider;
                } else if (block == '_') {
                    return spacer;
                } else {
                    return this.cache[block];
                }
            })
        };
    }

    // Create players table
    createBrowseTable () {
        // Width of the whole table
        let nameWidth = this.settings.getNameStyle();
        let serverWidth = this.settings.getServerStyle();
        let indexStyle = this.settings.getIndexStyle();

        let tableWidth = this.rightFlatWidth + (this.leftFlatWidth || (nameWidth + serverWidth)) + (indexStyle ? 50 : 0);

        let leftSpan = (this.leftFlatSpan || (1 + (serverWidth ? 1 : 0))) + (indexStyle ? 1 : 0);
        let spacer = this.getSpacer(leftSpan);
        let injector = this.getInjector(leftSpan);
        let divider = this.cache.divider = this.getDivider(leftSpan, false, false);

        // Get rows
        if (typeof this.cache.rows == 'undefined' && this.settings.customRows.length) {
            this.cache.rows = join(this.settings.customRows, row => this.getRow(leftSpan, row, row.eval.value, row.eval.compare));
        }

        // Create left headers
        let headerTitle, categoryTitle;

        if (this.configLeft) {
            categoryTitle = this.getCategoryBlock(true, this.configLeft, true);
            headerTitle = this.getHeaderBlock(true, this.configLeft, true);

            if (indexStyle) {
                if (this.settings.getTitleAlign()) {
                    categoryTitle = `<td></td>` + categoryTitle;
                    headerTitle = `<td style="width: 50px;" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + headerTitle;
                } else {
                    categoryTitle = `<td style="width: 50px;" rowspan="2" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + categoryTitle;
                }
            }
        } else {
            if (this.settings.getTitleAlign()) {
                categoryTitle = `
                    <td colspan="${ leftSpan }" class="border-right-thin"></td>
                `;

                headerTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    ${ serverWidth ? `<td style="width: ${ serverWidth }px;" class="border-bottom-thick cursor-pointer" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                    <td style="width: ${ nameWidth }px;" class="border-bottom-thick border-right-thin cursor-pointer" ${ this.getSortingTag('_name') }>Name</td>
                `;
            } else {
                categoryTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" rowspan="2" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    ${ serverWidth ? `<td style="width: ${ serverWidth }px;" rowspan="2" class="border-bottom-thick cursor-pointer" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                    <td style="width: ${ nameWidth }px;" rowspan="2" class="border-bottom-thick border-right-thin cursor-pointer" ${ this.getSortingTag('_name') }>Name</td>
                `;

                headerTitle = '';
            }
        }

        // Get statistics
        if (typeof this.cache.statistics == 'undefined') {
            if (this.rightFlat.reduce((a, { statistics }) => a || statistics, false)) {
                if (this.settings.customStatistics.length) {
                    this.cache.statistics = this.getStatistics(leftSpan, this.settings.customStatistics);
                } else {
                    this.cache.statistics = this.getStatistics(leftSpan, [
                        {
                            name: 'Minimum',
                            expression: array => Math.min(... array)
                        },
                        {
                            name: 'Average',
                            expression: array => array.reduce((a, b) => a + b, 0) / array.length
                        },
                        {
                            name: 'Maximum',
                            expression: array => Math.max(... array)
                        }
                    ]);
                }
            } else {
                this.cache.statistics = '';
            }
        }

        this.cache.table = `
            <tr class="headers">
                ${ categoryTitle }
                ${ this.getCategoryBlock(true) }
            <tr class="headers border-bottom-thick">
                ${ headerTitle }
                ${ this.getHeaderBlock(true) }
            </tr>
            ${ injector }
        `;

        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, false);
        let forcedLimit = this.array.perf || this.settings.getEntryLimit();

        return {
            width: tableWidth,
            entries: (forcedLimit ? this.entries.slice(0, forcedLimit) : this.entries).map((e, ei) => e.content.replace('{__INDEX__}', ei + 1)),
            content: join(layout, (block) => {
                if (block == '|') {
                    return divider;
                } else if (block == '_') {
                    return spacer;
                } else {
                    return this.cache[block];
                }
            })
        };
    }

    // Create guilds table
    createGroupTable () {
        // Width of the whole table
        let nameWidth = this.settings.getNameStyle();
        let indexStyle = this.settings.getIndexStyle();

        let tableWidth = this.rightFlatWidth + (this.leftFlatWidth || nameWidth) + (indexStyle ? 50 : 0);

        let leftSpan = (this.leftFlatSpan || 1) + (indexStyle ? 1 : 0);
        let spacer = this.getSpacer(leftSpan);
        let injector = this.getInjector(leftSpan);
        let divider = this.cache.divider = this.getDivider(leftSpan, false, false);

        // Get rows
        if (typeof this.cache.rows == 'undefined' && this.settings.customRows.length) {
            this.cache.rows = join(this.settings.customRows, row => this.getRow(leftSpan, row, row.eval.value, row.eval.compare));
        }

        // Get statistics
        if (typeof this.cache.statistics == 'undefined') {
            if (this.rightFlat.reduce((a, { statistics }) => a || statistics, false)) {
                if (this.settings.customStatistics.length) {
                    this.cache.statistics = this.getStatistics(leftSpan, this.settings.customStatistics);
                } else {
                    this.cache.statistics = this.getStatistics(leftSpan, [
                        {
                            name: 'Minimum',
                            expression: array => Math.min(... array)
                        },
                        {
                            name: 'Average',
                            expression: array => array.reduce((a, b) => a + b, 0) / array.length
                        },
                        {
                            name: 'Maximum',
                            expression: array => Math.max(... array)
                        }
                    ]);
                }
            } else {
                this.cache.statistics = '';
            }
        }

        // Get member list
        if (typeof this.cache.members == 'undefined') {
            if (this.settings.globals.members) {
                this.cache.members = this.getMembers(leftSpan);
            } else {
                this.cache.members = '';
            }
        }

        // Create left headers
        let headerTitle, categoryTitle;

        if (this.configLeft) {
            categoryTitle = this.getCategoryBlock(true, this.configLeft, true);
            headerTitle = this.getHeaderBlock(true, this.configLeft, true);

            if (indexStyle) {
                if (this.settings.getTitleAlign()) {
                    categoryTitle = `<td></td>` + categoryTitle;
                    headerTitle = `<td style="width: 50px;" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + headerTitle;
                } else {
                    categoryTitle = `<td style="width: 50px;" rowspan="2" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + categoryTitle;
                }
            }
        } else {
            if (this.settings.getTitleAlign()) {
                categoryTitle = `
                    <td colspan="${ leftSpan }" class="border-right-thin"></td>
                `;

                headerTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    <td style="width: ${ nameWidth }px;" class="border-bottom-thick border-right-thin cursor-pointer" ${ this.getSortingTag('_name') }>Name</td>
                `;
            } else {
                categoryTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" rowspan="2" class="border-bottom-thick cursor-pointer" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    <td style="width: ${ nameWidth }px;" rowspan="2" class="border-bottom-thick border-right-thin cursor-pointer" ${ this.getSortingTag('_name') }>Name</td>
                `;

                headerTitle = '';
            }
        }

        this.cache.table = `
            <tr class="headers">
                ${ categoryTitle }
                ${ this.getCategoryBlock(true) }
            <tr class="headers border-bottom-thick">
                ${ headerTitle }
                ${ this.getHeaderBlock(true) }
            </tr>
            ${ injector }
            ${ this.entries.missing.length ? `<tr class="font-weight: bold;">${ CellGenerator.WideCell(CellGenerator.Small(`${intl('stats.guilds.missing')}<br/>${ this.entries.missing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`), undefined, this.rightFlatSpan + leftSpan, 'center') }</tr>` : '' }
        `;

        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, this.cache.members);

        return {
            width: tableWidth,
            entries: this.entries.map((e, ei) => e.content.replace('{__INDEX__}', ei + 1)),
            content: join(layout, (block) => {
                if (block == '|') {
                    return divider;
                } else if (block == '_') {
                    return spacer;
                } else {
                    return this.cache[block];
                }
            })
        };
    }

    getCellContent ({ action, generators: { cell } }, player, compare) {
        if (action == 'show') {
            return cell(player, compare).replace('{__ACTION__}', `data-id="${ player.Identifier }" data-ts="${ player.Timestamp }"`).replace('{__ACTION_OP__}', `<span class="css-op-select-el"></span>`);
        } else {
            return cell(player, compare);
        }
    }

    getArrayForStatistics () {
        if (this.type == ScriptType.Player) {
            return this.array.map(([timestamp, player], index, array) => {
                return {
                    player: player,
                    compare: array[index + 1] ? array[index + 1][1] : player
                };
            });
        } else {
            return this.array;
        }
    }

    getStatistics (leftSpan, entries) {
        return `
            <tr>
                <td class="border-right-thin" colspan="${ leftSpan }"></td>
                ${ join(this.rightFlat, ({ span, statistics, generators, name }) => `<td colspan="${ span }">${ statistics && generators.statistics ? name : '' }</td>`) }
            </tr>
            ${ this.cache.divider }
            ${ join(entries, ({ name, ast, expression }) => `
                <tr>
                    <td class="border-right-thin" colspan="${ leftSpan }">${ name }</td>
                    ${ join(this.rightFlat, ({ span, statistics, generators }) => statistics && generators.statistics ? generators.statistics(this.getArrayForStatistics(), expression ? expression : array => new ExpressionScope(this.settings).addSelf(array).eval(ast)) : `<td colspan="${ span }"></td>`) }
                </tr>
            `) }
        `;
    }

    getMembers (leftSpan) {
        return `
            <tr>
                <td class="border-right-thin" colspan=${ leftSpan }>Classes</td>
                <td colspan="${ this.rightFlatSpan }">${ Object.entries(this.settings.lists.classes).map(([ key, count ]) => intl(`general.class${key}`) + ': ' + count).join(', ') }</td>
            </tr>
            <tr>
                <td class="border-right-thin" colspan=${ leftSpan }>Joined</td>
                <td colspan="${ this.rightFlatSpan }">${ this.settings.lists.joined.join(', ') }</td>
            </tr>
            <tr>
                <td class="border-right-thin" colspan=${ leftSpan }>Left</td>
                <td colspan="${ this.rightFlatSpan }">${ this.settings.lists.kicked.join(', ') }</td>
            </tr>
        `;
    }

    getCategoryBlock (sortable, config = this.config, alwaysRightBorder = false) {
        let aligned = this.settings.getTitleAlign();
        return join(config, ({ headers, empty, length, name: categoryName }, categoryIndex, categoryArray) => {
            let notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;

            if (empty && !aligned) {
                return join(headers, ({ width, span, sortkey, name: headerName, align_title }, headerIndex, headerArray) => {
                    let lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td rowspan="2" colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="border-bottom-thick ${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } ${ sortable ? 'cursor-pointer' : '' }" ${ sortable ? this.getSortingTag(sortkey) : '' }>${ headerName }</td>`
                });
            } else {
                return `<td colspan="${ length }" class="${ notLastCategory ? 'border-right-thin' : '' }">${ aligned && empty ? '' : categoryName }</td>`;
            }
        });
    }

    getHeaderBlock (sortable, config = this.config, alwaysRightBorder = false) {
        let aligned = this.settings.getTitleAlign();
        return join(config, ({ headers, empty }, categoryIndex, categoryArray) => {
            let notLastCategory = alwaysRightBorder || categoryIndex != categoryArray.length - 1;

            if (empty && !aligned) {
                return '';
            } else {
                return join(headers, ({ width, span, name, sortkey, align_title }, headerIndex, headerArray) => {
                    let lastHeader = notLastCategory && headerIndex == headerArray.length - 1;

                    return `<td colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } ${ sortable ? 'cursor-pointer' : '' }" ${ sortable ? this.getSortingTag(sortkey) : '' }>${ name }</td>`
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
        this.$table = $table;
        this.type = type;

        // Changed by default
        this.schanged = true;
        this.echanged = true;
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

    setEntries (... args) {
        this.entries = args;
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
        this.injectorObserver.observe(this.injectorElement.get(0));
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

            let entries = $(this.injectorEntries.splice(0, size).join(''));
            this.injectorCallback(entries);

            this.injectorElement.before(entries);

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

            this.table.setEntries(... this.entries);
            if (this.type != ScriptType.Player) {
                this.table.sort();
            }

            ExpressionCache.stop();
        }

        // Reset sorting
        if (sorting != null && this.type != ScriptType.Player) {
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

        let themeClass = 'theme-light';
        let themeStyle = '';
        if (typeof theme === 'string') {
            themeClass = `theme-${theme}`;
        } else if (typeof theme === 'object') {
            const { text, background } = theme;
            themeStyle = `--table-foreground: ${text}; --table-background: ${background}`;
        }

        let $body = $(`
            <thead></thead>
            <tbody style="${themeStyle} ${style.join(' ')}" class="${themeClass} ${klass.join(' ')}">
                ${content}
            </tbody>
        `);

        this.injectorElement = $body.find('[data-entry-injector]');
        this.injectCount = this.injectCount || SiteOptions.load_rows || 50;

        onInject($(entries.splice(0, this.injectCount).join('')).insertBefore(this.injectorElement));

        // Check table content for unwanted tags
        if (!SiteOptions.insecure && $body.find('script, iframe, img[onerror]').toArray().length) {
            // Show error
            this.$table.html(`<div>${intl('stats.settings.insecure_error#')}</div>`).css('width', `50vw`).css('left', `25vw`);
        } else {
            this.$table.empty().append($body).css('width', `${ width }px`).css('left', `max(0px, calc(50vw - 9px - ${ width / 2 }px))`);

            if (entries.length > 0 && this.injectorElement.get(0)) {
                this.prepareInjector(entries, onInject);
            } else {
                this.injectorElement.remove();
            }
        }

        // Bind sorting
        this.$table.find('[data-sortable]').click(event => {
            let sortKey = $(event.target).attr('data-sortable-key');
            if (event.originalEvent.ctrlKey) {
                // Remove all sorting except current key if CTRL is held down
                this.table.sorting = this.table.sorting.filter(s => s.key == sortKey)
            }

            // Sort by key
            this.table.setSorting(sortKey);

            // Redraw table
            this.refresh(onChange, onInject);
        }).contextmenu(event => {
            event.preventDefault();

            if (this.table.sorting && this.table.sorting.length) {
                // Do only if any sorting exists
                if (event.originalEvent.ctrlKey) {
                    // Clear sorting if CTRL is held down
                    this.table.clearSorting();
                } else {
                    // Remove current key
                    this.table.removeSorting($(event.target).attr('data-sortable-key'));
                }

                // Redraw table
                this.refresh(onChange, onInject);
            } else if (this.table.global_sorting) {
                this.table.setDefaultSorting();
                this.refresh(onChange, onInject);
            }
        }).mousedown(event => {
            event.preventDefault();
        });

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
