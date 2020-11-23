// Table Type
const TableType = {
    History: 0,
    Players: 1,
    Group: 2
}

// Category
class HeaderGroup {
    constructor ({ name, empty }, i) {
        this.name = name;
        this.empty = empty;

        this.sortkey = `${ name }.${ i }`;

        this.width = 0;
        this.length = 0;
        this.headers = [];
    }

    add (settings, cellGenerator, statisticsGenerator, sort, border, span = 1) {
        let { expa_eval, alias, name } = settings;
        let header = {
            // Header
            ... settings,

            // Own properties
            name: expa_eval != undefined ? expa_eval : (alias != undefined ? alias : name),
            generators: {
                cell: cellGenerator,
                statistics: statisticsGenerator
            },
            sort: sort,
            sortkey: SHA1(`${ this.sortkey }.${ name }.${ this.headers.length }`),
            span: span,
            bordered: border
        };

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
        this.timestamp = ts;
        this.reference = rs;
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
        this.timestamp = ts;
        this.reference = rs;
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

// Table instance
class TableInstance {
    constructor (settings, type) {
        // Parameters
        this.settings = new Settings(settings, type);

        // Handle trackers
        let trackers = this.settings.trackers;
        if (Object.keys(trackers).length && SiteOptions.tracker) {
            // Get current tracker settings
            let trackerSettings = new Settings(SettingsManager.get('tracker', '', PredefinedTemplates.Tracker));
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
                SettingsManager.save('tracker', trackerCode);
                Database.refreshTrackers();
            }
        }

        this.type = type;

        this.config = [];
        this.sorting = [];

        // Table generator
        this.createTable = [
            () => this.createHistoryTable(),
            () => this.createPlayersTable(),
            () => this.createGroupTable()
        ][ this.type ];

        // Loop over all categories
        for (let { object: category, index: categoryIndex, array: categories } of iterate(this.settings.categories)) {
            // Create header group
            let group = new HeaderGroup(category, this.config.length);
            let lastCategory = categoryIndex == categories.length - 1;

            // Loop over all headers
            for (let { object: header, index: headerIndex, array: headers } of iterate(category.headers)) {
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

                if (header.grouped) {
                    // Create grouped header
                    let callWidth = header.width || 100;
                    group.add(header, (player, compare) => {
                        // Cell
                        let vals = header.expr(player, compare, this.settings, undefined, undefined, header);

                        if (!Array.isArray(vals)) {
                            return this.getEmptyCell(header, showBorder, header.grouped);
                        } else {
                            let cmps = header.difference ? header.expr(compare, compare, this.settings.getCompareEnvironment(), undefined, undefined, header) : undefined;

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
                        let vals = header.expr(player, compare, this.settings, undefined, undefined, header);

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
                        let val = header.expr(player, compare, this.settings, undefined, undefined, header);

                        if (val == undefined) {
                            return this.getEmptyCell(header, showBorder);
                        } else {
                            let cmp = header.difference ? header.expr(compare, compare, this.settings.getCompareEnvironment(), undefined, undefined, header) : undefined;
                            return this.getCell(
                                header,
                                this.getCellDisplayValue(header, val, cmp, player, compare),
                                this.getCellColor(header, val, player, compare),
                                showBorder
                            );
                        }
                    }, (players, operation) => {
                        // Statistics
                        let val = players.map(({ player, compare }) => header.expr(player, compare, this.settings, undefined, undefined, header)).filter(v => v != undefined);
                        if (val.length) {
                            // Get value and trunc if necessary
                            val = operation(val);
                            if (!header.decimal) {
                                val = Math.trunc(val);
                            }

                            // Compare value
                            let cmp = undefined;
                            if (header.difference) {
                                cmp = players.map(({ compare }) => header.expr(compare, compare, this.settings.getCompareEnvironment(), undefined, undefined, header)).filter(v => v != undefined);
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
                                header.statistics_color ? this.getCellColor(header, val, undefined, undefined, undefined, true) : ''
                            );
                        } else {
                            return this.getEmptyCell(header);
                        }
                    }, (player, compare) => {
                        // Sort
                        return header.expr(player, compare, this.settings, undefined, undefined, header);
                    }, showBorder);
                }
            }

            if (group.length) {
                this.config.push(group);
            }
        }

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
    }

    // Set players
    setEntries (array, skipEvaluation = false, simulatorLimit = 0, manualSort = null) {
        let shouldUpdate = false;

        // Filter incoming array if needed
        this.array = this.type != TableType.History ? array : array.map(([ timestamp, e ]) => {
            // Preload character
            let obj = Database.getPlayer(e.Identifier, timestamp);

            // Find if falls under discard rule
            let disc = this.settings.discardRules.some(rule => rule(obj, obj, this.settings));

            // Return stuff
            return disc ? null : [ timestamp, obj ];
        }).filter(e => e);

        // Evaluate variables
        if (this.type == TableType.History) {
            this.settings.evalHistory(this.array.map(p => p[1]));
        } else if (!skipEvaluation) {
            if (this.type == TableType.Players) {
                this.settings.evalPlayers(array, simulatorLimit, array.perf);
            } else {
                this.settings.evalGuilds(array);
            }
        }

        if (!skipEvaluation || this.type == TableType.History) {
            PerformanceTracker.cache_clear();
            this.clearCache();
        }

        if (manualSort && this.type != TableType.History) {
            this.array.sort((a, b) => manualSort(b.player, b.compare) - manualSort(a.player, a.compare)).forEach((entry, i) => entry.index = i);
        }

        this.generateEntries();
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

        if (this.type == TableType.History) {
            // Loop over all items of the array
            for (let i = 0; i < this.array.length; i++) {
                // Get variables
                let [ timestamp, player ] = this.array[i];
                let compare = i < this.array.length - 1 ? this.array[i + 1][1] : player;

                // Add table row start tag
                let content = `<tr class="css-entry ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
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
                        <td class="border-right-thin" ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
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
                    content: content
                })
            }
        } else if (this.type == TableType.Players) {
            // Whether timestamps match
            let noCompare = this.array.reference == this.array.timestamp;

            // Loop over all items of the array
            for (let { player, compare, hidden, index, latest } of this.array) {
                // Add table row start tag
                let content = `<tr class="css-entry ${ hidden ? 'css-entry-hidden' :'' } ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
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
                            <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
                                ${ SiteOptions.obfuscated ? 'server' : player.Prefix }
                            </td>
                        `;
                    }

                    // Add name
                    let showOutdated = this.settings.getOutdatedStyle();
                    content += `
                        <td class="border-right-thin clickable ${ !latest && showOutdated ? 'foreground-red' : '' }" ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' } data-id="${ player.Identifier }">
                            <span class="css-op-select-el"></span>
                            ${ SiteOptions.obfuscated ? '' : getEasterEgg(player.Identifier) }
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
                    content: content,
                    sorting: this.flat.reduce((obj, header) => {
                        let { order, sortkey, flip, expr, sort } = header;
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = expr(player, compare, this.settings, undefined, undefined, header);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - expr(compare, compare, this.settings, undefined, undefined, header));
                            }

                            obj[sortkey] = order(player, compare, this.settings, value, { difference: difference });
                        } else {
                            // Return native sorting function
                            obj[sortkey] = sort(player, compare);
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
        } else if (this.type == TableType.Group) {
            // Whether timestamps match
            let noCompare = this.array.reference == this.array.timestamp;

            // Add missing entries to the entry list
            this.entries.missing = this.array.missing;

            // Loop over all items of the array
            for (let { player, compare, index } of this.array) {
                // Add table row start tag
                let content = `<tr class="css-entry ${ dividerStyle }" ${ rowHeight ? `style="height: ${ rowHeight }px;"` : '' }>`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
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
                        <td class="border-right-thin clickable" ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' } data-id="${ player.Identifier }">
                            ${ SiteOptions.obfuscated ? '' : getEasterEgg(player.Identifier) }
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
                    content: content,
                    sorting: this.flat.reduce((obj, header) => {
                        let { order, sortkey, flip, expr, sort } = header;
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = expr(player, compare, this.settings, undefined, undefined, header);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - expr(compare, compare, this.settings, undefined, undefined, header));
                            }

                            obj[sortkey] = order(player, compare, this.settings, value, { difference: difference });
                        } else {
                            // Return native sorting function
                            obj[sortkey] = sort(player, compare);
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
        if (this.sorting.length) {
            this.entries.sort((a, b) => {
                let result = undefined;

                for (let { key, flip, order } of this.sorting) {
                    result = result || (a.sorting[key] == undefined ? 1 : (b.sorting[key] == undefined ? -1 : (((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key]))));
                }

                return result || (a.sorting['_index'] - b.sorting['_index']);
            });
        } else {
            this.entries.sort((a, b) => a.sorting['_index'] - b.sorting['_index']);
        }
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
            color,
            visible ? '' : color,
            border,
            align,
            padding,
            style ? style.cssText : undefined,
            cellWidth,
            action
        );
    }

    getEmptyCell ({ ndef, ndefc, style }, border = undefined, span = 0) {
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
                style ? style.cssText : undefined
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

    getCellDisplayValue (header, val, cmp, player = undefined, compare = undefined, extra = undefined) {
        let { difference, ex_difference, flip, value, brackets } = header;
        let displayValue = value.get(player, compare, this.settings, val, extra, header);
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

    getCellColor (header, val, player = undefined, compare = undefined, extra = undefined, ignoreBase = false) {
        return header.color.get(player, compare, this.settings, val, extra, ignoreBase, header);
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

    createHistoryTable () {
        // Width of the whole table
        let tableWidth = this.rightFlatWidth + (this.leftFlatWidth || 200) + (this.settings.getIndexStyle() ? 50 : 0);
        let indexStyle = this.settings.getIndexStyle();

        let leftSpan = (this.leftFlatSpan || 1) + (indexStyle ? 1 : 0);

        // Get rows
        if (typeof this.cache.rows == 'undefined' && this.settings.customRows.length) {
            this.cache.rows = join(this.settings.customRows, row => this.getRow(leftSpan, row, row.eval.value, undefined, this.array[0][1])) + this.getDivider(leftSpan, true, false);
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

        // Create table Content
        return {
            width: tableWidth,
            content: `
                <thead></thead>
                <tbody style="${ this.settings.getFontStyle() }" class="${ this.settings.getOpaqueStyle() } ${ this.settings.getRowStyle() }">
                    ${ this.cache.rows }
                    <tr class="headers">
                        ${ categoryTitle }
                        ${ this.getCategoryBlock(false) }
                    </tr>
                    <tr class="headers border-bottom-thick">
                        ${ headerTitle }
                        ${ this.getHeaderBlock(false) }
                    </tr>
                    ${ join(this.entries, (e, ei, ea) => e.content) }
                </tbody>
            `
        };
    }

    // Create players table
    createPlayersTable () {
        // Width of the whole table
        let nameWidth = this.settings.getNameStyle();
        let serverWidth = this.settings.getServerStyle();
        let indexStyle = this.settings.getIndexStyle();

        let tableWidth = this.rightFlatWidth + (this.leftFlatWidth || (nameWidth + serverWidth)) + (indexStyle ? 50 : 0);

        let leftSpan = (this.leftFlatSpan || (1 + (serverWidth ? 1 : 0))) + (indexStyle ? 1 : 0);
        let spacer = this.getSpacer(leftSpan);
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
                    headerTitle = `<td style="width: 50px;" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + headerTitle;
                } else {
                    categoryTitle = `<td style="width: 50px;" rowspan="2" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + categoryTitle;
                }
            }
        } else {
            if (this.settings.getTitleAlign()) {
                categoryTitle = `
                    <td colspan="${ leftSpan }" class="border-right-thin"></td>
                `;

                headerTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    ${ serverWidth ? `<td style="width: ${ serverWidth }px;" class="border-bottom-thick clickable" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                    <td style="width: ${ nameWidth }px;" class="border-bottom-thick border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                `;
            } else {
                categoryTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" rowspan="2" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    ${ serverWidth ? `<td style="width: ${ serverWidth }px;" rowspan="2" class="border-bottom-thick clickable" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                    <td style="width: ${ nameWidth }px;" rowspan="2" class="border-bottom-thick border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
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
            ${ join(this.entries, (e, ei, ea) => e.content.replace('{__INDEX__}', ei + 1), 0, this.array.perf || this.settings.getEntryLimit()) }
        `;

        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, false);

        return {
            width: tableWidth,
            content: `
                <thead></thead>
                <tbody style="${ this.settings.getFontStyle() }" class="${ this.settings.getOpaqueStyle() } ${ this.settings.getRowStyle() }">
                    ${ join(layout, (block, i, array) => {
                        // Counters
                        let first = i == 0;
                        let last = i == array.length - 1;
                        let prev = array[i - 1];
                        let next = array[i + 1];

                        if (block == '|') {
                            return divider;
                        } else if (block == '_') {
                            return spacer;
                        } else {
                            return this.cache[block];
                        }
                    }) }
                </tbody>
            `,
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
                    headerTitle = `<td style="width: 50px;" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + headerTitle;
                } else {
                    categoryTitle = `<td style="width: 50px;" rowspan="2" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` + categoryTitle;
                }
            }
        } else {
            if (this.settings.getTitleAlign()) {
                categoryTitle = `
                    <td colspan="${ leftSpan }" class="border-right-thin"></td>
                `;

                headerTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    <td style="width: ${ nameWidth }px;" class="border-bottom-thick border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                `;
            } else {
                categoryTitle = `
                    ${ indexStyle ? `<td style="width: 50px;" rowspan="2" class="border-bottom-thick clickable" ${ indexStyle == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                    <td style="width: ${ nameWidth }px;" rowspan="2" class="border-bottom-thick border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
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
            ${ join(this.entries, (e, ei, ea) => e.content.replace('{__INDEX__}', ei + 1)) }
            ${ this.entries.missing.length ? `<tr class="css-b-bold">${ CellGenerator.WideCell(CellGenerator.Small(`Player data is missing for following members:<br/>${ this.entries.missing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`), undefined, this.rightFlatSpan + leftSpan, 'center') }</tr>` : '' }
        `;

        let layout = this.settings.getLayout(this.cache.statistics, this.cache.rows, this.cache.members);

        return {
            width: tableWidth,
            content: `
                <thead></thead>
                <tbody style="${ this.settings.getFontStyle() }" class="${ this.settings.getOpaqueStyle() } ${ this.settings.getRowStyle() }">
                    ${ join(layout, (block, i, array) => {
                        // Counters
                        let first = i == 0;
                        let last = i == array.length - 1;
                        let prev = array[i - 1];
                        let next = array[i + 1];

                        if (block == '|') {
                            return divider;
                        } else if (block == '_') {
                            return spacer;
                        } else {
                            return this.cache[block];
                        }
                    }) }
                </tbody>
            `,
        };
    }

    getCellContent ({ action, generators: { cell } }, player, compare) {
        if (action == 'show') {
            return cell(player, compare).replace('{__ACTION__}', `data-id="${ player.Identifier }"`);
        } else {
            return cell(player, compare);
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
                    ${ join(this.rightFlat, ({ span, statistics, generators }) => statistics && generators.statistics ? generators.statistics(this.array, expression ? expression : array => ast.eval(undefined, undefined, this.settings, array)) : `<td colspan="${ span }"></td>`) }
                </tr>
            `) }
        `;
    }

    getMembers (leftSpan) {
        return `
            <tr>
                <td class="border-right-thin" colspan=${ leftSpan }>Classes</td>
                <td colspan="${ this.rightFlatSpan }">${ Object.entries(this.settings.lists.classes).map(([ key, count ]) => PLAYER_CLASS[key] + ': ' + count).join(', ') }</td>
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

                    return `<td rowspan="2" colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="border-bottom-thick ${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } ${ sortable ? 'clickable' : '' }" ${ sortable ? this.getSortingTag(sortkey) : '' }>${ headerName }</td>`
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

                    return `<td colspan="${ span }" style="width: ${ width }px; max-width: ${ width }px;" class="${ align_title ? align_title : '' } ${ lastHeader ? 'border-right-thin' : '' } ${ sortable ? 'clickable' : '' }" ${ sortable ? this.getSortingTag(sortkey) : '' }>${ name }</td>`
                });
            }
        });
    }

    getSortingTag (key) {
        let index = this.sorting.findIndex(s => s.key == key);
        return `data-sortable-key="${ key }" data-sortable="${ this.sorting[index] ? this.sorting[index].order : 0 }" data-sortable-index=${ this.sorting.length == 1 ? '' : (index + 1) }`;
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

    clearSorting () {
        this.ignore = true;
    }

    refresh (onChange = () => { /* Do nothing */ }) {
        // Log some console stuff for fun
        let schanged = this.schanged || false;
        let echanged = this.echanged || false;
        let ignore = this.ignore || false;
        let timestamp = Date.now();

        // Save sorting if needed
        let sorting = !this.ignore && this.table ? this.table.sorting : null;

        // Create table
        if (this.schanged) {
            this.table = new TableInstance(this.settings, this.type);
            this.ignore = false;
        }

        // Fill entries
        if (this.echanged || this.schanged) {
            PerformanceTracker.start();

            this.table.setEntries(... this.entries);

            PerformanceTracker.stop();
        }

        // Reset sorting
        if (sorting != null && this.type != TableType.History) {
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
        let { content, width } = this.table.createTable();
        let $tableContent = $(content);

        // Check table content for unwanted tags
        if (!SiteOptions.insecure && $tableContent.find('script, iframe, img[onerror]').toArray().length) {
            // Show error
            this.$table.html(`
                <div>
                    <b style="font-weight: 1000;">Error in the system:</b>
                    <br/>
                    <br/>
                    This table was not displayed because it contains HTML tags that are prohibited.<br/>
                    Please remove them from your settings and try again.
                </div>
            `).css('width', `50vw`).css('left', `25vw`);
        } else {
            // Setup table element if table is valid
            this.$table.empty().append($tableContent).css('width', `${ width }px`).css('left', `max(0px, calc(50vw - 9px - ${ width / 2 }px))`);
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
            this.refresh(onChange);
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
                this.refresh(onChange);
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

// Cell generators
const CellGenerator = {
    // Simple cell
    Cell: function (c, b, f, bo, al, pad, style, cellWidth, hasAction) {
        let color = getCSSColorFromBackground(f);
        return `<td class="${ bo ? 'border-right-thin' : '' } ${ al ? al : '' } ${ hasAction ? 'clickable' : '' }" ${ hasAction ? '{__ACTION__}' : '' } style="${ cellWidth ? `width: ${ cellWidth }px;` : '' } ${ color ? `color:${ color };` : '' }${ b ? `background:${ b };` : '' }${ pad ? `padding-left: ${ pad } !important;` : '' }${ style || '' }">${ c }</td>`;
    },
    // Wide cell
    WideCell: function (c, b, w, al, pad, style) {
        return `<td class="${ al ? al : '' }" colspan="${ w }" style="${ b ? `background:${ b };` : '' }${ pad ? `padding-left: ${ pad } !important;` : '' }${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo, al, bg, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' } ${ al ? al : '' }" style="${ bg ? `background: ${ bg };` : '' }${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    PlainSpan: function (s, c, bo, al, bg, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' } ${ al ? al : '' }" colspan="${ s }"  style="${ bg ? `background: ${ bg };` : '' }${ style || '' }">${ c }</td>`;
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
    }
}

const ARG_MAP = {
    'off': 0,
    'on': 1,
    'thick': 2,
    'thin': 1,
    'static': 2,
    'above or equal': 'ae',
    'below or equal': 'be',
    'equal or above': 'ae',
    'equal or below': 'be',
    'above': 'a',
    'below': 'b',
    'equal': 'e',
    'default': 'd',
    'left': 1,
    'right': 2,
    'both': 3,
    'none': 0
};

const ARG_MAP_SERVER = {
    'off': 0,
    'on': 100
}

const ARG_FORMATTERS = {
    'number': (p, c, e, x) => isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)),
    'fnumber': (p, c, e, x) => isNaN(x) ? undefined : formatAsSpacedNumber(x),
    'nnumber': (p, c, e, x) => isNaN(x) ? undefined : formatAsNamedNumber(x),
    'date': (p, c, e, x) => isNaN(x) ? undefined : formatDateOnly(x),
    'bool': (p, c, e, x) => x ? 'Yes' : 'No',
    'datetime': (p, c, e, x) => isNaN(x) ? undefined : formatDate(x),
    'duration': (p, c, e, x) => isNaN(x) ? undefined : formatDuration(x),
    'default': (p, c, e, x) => typeof(x) == 'string' ? x : (isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)))
}

class Command {
    constructor (regexp, parse, format, parseAlways = false) {
        this.regexp = regexp;
        this.internalParse = parse;
        this.internalFormat = format;
        this.parseAlways = parseAlways;
    }

    isValid (string) {
        return this.regexp.test(string);
    }

    parse (root, string) {
        return this.internalParse(root, ... string.match(this.regexp).slice(1));
    }

    format (root, string) {
        return this.internalFormat(root, ... string.match(this.regexp).slice(1));
    }
}

class CellStyle {
    constructor () {
        this.styles = {};
        this.content = '';
    }

    add (name, value) {
        let style = new Option().style;
        style[name] = value;

        if (style.cssText) {
            this.styles[name] = style.cssText.slice(0, -1) + ' !important';
        }

        this.content = Object.values(this.styles).join(';');
    }

    get cssText () {
        return this.content;
    }
}

class RuleEvaluator {
    constructor () {
        this.rules = [];
    }

    addRule (condition, referenceValue, value) {
        this.rules.push([ condition, referenceValue, value, isNaN(referenceValue) ? referenceValue : null ]);
    }

    get (value, ignoreBase = false) {
        for (let [ condition, referenceValue, output ] of this.rules) {
            if (condition == 'db') {
                if (ignoreBase) {
                    continue;
                } else {
                    return output;
                }
            } else if (condition == 'd') {
                return output;
            } else if (condition == 'e') {
                if (value == referenceValue) {
                    return output;
                }
            } else if (condition == 'a') {
                if (value > referenceValue) {
                    return output;
                }
            } else if (condition == 'b') {
                if (value < referenceValue) {
                    return output;
                }
            } else if (condition == 'ae') {
                if (value >= referenceValue) {
                    return output;
                }
            } else if (condition == 'be') {
                if (value <= referenceValue) {
                    return output;
                }
            }
        }

        return undefined;
    }
}

const SettingsCommands = [
    /*
        Ignore macro
    */
    new Command(
        /^(?:(if|if not) (Group|Player|Players)|(endif|else))$/,
        (root, key1, arg1, key2) => {
            if (key2) {
                if (key2 == 'endif') {
                    root.setFilter(null);
                } else {
                    root.flipFilter();
                }
            } else {
                root.setFilter({
                    'Group': TableType.Group,
                    'Player': TableType.History,
                    'Players': TableType.Players
                }[arg1], key1 != 'if');
            }
        },
        (root, key1, arg1, key2) => key2 ? SFormat.Macro(key2) : SFormat.Macro(`${ key1 } ${ arg1 }`)
    ),
    /*
        Loop
    */
    new Command(
        /^loop (\w+(?:\s*\,\s*\w+)*) for (.+)$/,
        (root, name, array) => {
            let ast = new Expression(array);
            if (ast.isValid()) {
                return {
                    ast: ast,
                    name: name.split(',').map(x => x.trim())
                }
            }
        },
        (root, name, array) => SFormat.Macro(SFormat.Keyword('loop ') + SFormat.Constant(name) + SFormat.Keyword(' for ') + Expression.format(array), true)
    ),
    new Command(
        /^end$/,
        (root) => { /* DO NOTHING AS THIS IS HANDLED DURING THE PARSING ITSELF */ },
        (root) => SFormat.Macro('end')
    ),
    /*
        Import macro
    */
    new Command(
        /^import (.+)$/,
        (root, name) => { /* DO NOTHING AS THIS IS HANDLED DURING THE PARSING ITSELF */ },
        (root, name) => SFormat.Keyword('import ') + (Templates.exists(name) ? (SFormat.Enum(name) + ' ' + SFormat.Extras(`(${ Templates.get(name).length }c)`)) : SFormat.Error(name))
    ),
    /*
        Server column
    */
    new Command(
        /^server ((@?)(\S+))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined) {
                if (isNaN(val)) {
                    val = ARG_MAP_SERVER[val];
                }

                if (!isNaN(val)) {
                    root.addGlobal('server', Number(val));
                }
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('server ');
            let val = root.constants.getValue(a, b);

            if (ARG_MAP_SERVER.hasOwnProperty(value)) {
                return prefix + SFormat.Bool(value);
            } else if (root.constants.isValid(a, b) && !isNaN(val)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || isNaN(val)) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Name column
    */
    new Command(
        /^name ((@?)(\S+))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined && !isNaN(val)) {
                root.addGlobal('name', Number(val));
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('name ');
            let val = root.constants.getValue(a, b);

            if (root.constants.isValid(a, b) && !isNaN(val)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || isNaN(val)) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Column width
    */
    new Command(
        /^width ((@?)(\S+))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined && !isNaN(val)) {
                root.addShared('width', Number(val));
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('width ');
            let val = root.constants.getValue(a, b);

            if (root.constants.isValid(a, b) && !isNaN(val)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || isNaN(val)) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Not defined value
    */
    new Command(
        /^not defined value ((@?)(.+))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined) {
                root.addShared('ndef', val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('not defined value ');
            let val = root.constants.getValue(a, b);

            if (root.constants.isValid(a, b)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@') {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Not defined color
    */
    new Command(
        /^not defined color ((@?)(.+))$/,
        (root, value, a, b) => {
            let val = getCSSColor(root.constants.getValue(a, b));
            if (val != undefined && val) {
                root.addShared('ndefc', val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('not defined color ');
            let val = getCSSColor(root.constants.getValue(a, b));

            if (root.constants.isValid(a, b) && val) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || !val) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Color(value, val);
            }
        }
    ),
    /*
        Value default rule
    */
    new Command(
        /^value default ((@?)(\S+[\S ]*))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined) {
                root.addValueRule(ARG_MAP['default'], 0, val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('value ') + SFormat.Constant('default ');
            if (root.constants.isValid(a, b)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@') {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Value rules
    */
    new Command(
        /^value (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\S+[\S ]*))$/,
        (root, rule, value, a, b, value2, a2, b2) => {
            let ref = root.constants.getValue(a, b);
            let val = root.constants.getValue(a2, b2);

            if (val != undefined && ref != undefined) {
                root.addValueRule(ARG_MAP[rule], ref, val);
            }
        },
        (root, rule, value, a, b, value2, a2, b2) => {
            let prefix = SFormat.Keyword('value ') + SFormat.Constant(rule) + ' ';

            if (root.constants.isValid(a, b)) {
                value = SFormat.Constant(value);
            } else if (a == '@') {
                value = SFormat.Error(value);
            } else {
                value = SFormat.Normal(value);
            }

            if (root.constants.isValid(a2, b2)) {
                value2 = SFormat.Constant(value2);
            } else if (a2 == '@') {
                value2 = SFormat.Error(value2);
            } else {
                value2 = SFormat.Normal(value2);
            }

            return prefix + value + ' ' + value2;
        }
    ),
    /*
        Color default rule
    */
    new Command(
        /^color default ((@?)(\S+[\S ]*))$/,
        (root, value, a, b) => {
            let val = getCSSColor(root.constants.getValue(a, b));
            if (val != undefined && val) {
                root.addColorRule(ARG_MAP['default'], 0, val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('color ') + SFormat.Constant('default ');
            let val = getCSSColor(root.constants.getValue(a, b));

            if (root.constants.isValid(a, b) && val) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || !val) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Color(value, val);
            }
        }
    ),
    /*
        Color rules
    */
    new Command(
        /^color (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\S+[\S ]*))$/,
        (root, rule, value, a, b, value2, a2, b2) => {
            let ref = root.constants.getValue(a, b);
            let val = getCSSColor(root.constants.getValue(a2, b2));

            if (val != undefined && ref != undefined && val) {
                root.addColorRule(ARG_MAP[rule], ref, val);
            }
        },
        (root, rule, value, a, b, value2, a2, b2) => {
            let prefix = SFormat.Keyword('color ') + SFormat.Constant(rule) + ' ';
            let val = getCSSColor(root.constants.getValue(a2, b2));

            if (root.constants.isValid(a, b)) {
                value = SFormat.Constant(value);
            } else if (a == '@') {
                value = SFormat.Error(value);
            } else {
                value = SFormat.Normal(value);
            }

            if (root.constants.isValid(a2, b2) && val) {
                value2 = SFormat.Constant(value2);
            } else if (a2 == '@' || !val) {
                value2 = SFormat.Error(value2);
            } else {
                value2 = SFormat.Color(value2, val);
            }

            return prefix + value + ' ' + value2;
        }
    ),
    /*
        Alias
    */
    new Command(
        /^alias ((@?)(.+))$/,
        (root, value, a, b) => {
            let val = root.constants.getValue(a, b);
            if (val != undefined) {
                root.addAlias(val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('alias ');
            let val = root.constants.getValue(a, b);

            if (root.constants.isValid(a, b)) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@') {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Normal(value);
            }
        }
    ),
    /*
        Statistics format expression
    */
    new Command(
        /^format statistics (.+)$/,
        (root, expression) => {
            if (expression == 'on') {
                root.addFormatStatisticsExpression(true);
            } else if (expression == 'off') {
                root.addFormatStatisticsExpression(false);
            } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
                root.addFormatStatisticsExpression(ARG_FORMATTERS[expression])
            } else {
                let ast = new Expression(expression, root);
                if (ast.isValid()) {
                    root.addFormatStatisticsExpression((a, b) => ast.eval(undefined, undefined, a, b));
                }
            }
        },
        (root, expression) => SFormat.Keyword('format statistics ') + (expression == 'on' || expression == 'off' ? SFormat.Bool(expression) : (ARG_FORMATTERS.hasOwnProperty(expression) ? SFormat.Constant(expression) : Expression.format(expression, root)))
    ),
    /*
        Difference format expression
    */
    new Command(
        /^format difference (.+)$/,
        (root, expression) => {
            if (expression == 'on') {
                root.addFormatDifferenceExpression(true);
            } else if (expression == 'off') {
                root.addFormatDifferenceExpression(false);
            } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
                root.addFormatDifferenceExpression(ARG_FORMATTERS[expression])
            } else {
                let ast = new Expression(expression, root);
                if (ast.isValid()) {
                    root.addFormatDifferenceExpression((a, b) => ast.eval(undefined, undefined, a, b));
                }
            }
        },
        (root, expression) => SFormat.Keyword('format difference ') + (expression == 'on' || expression == 'off' ? SFormat.Bool(expression) : (ARG_FORMATTERS.hasOwnProperty(expression) ? SFormat.Constant(expression) : Expression.format(expression, root)))
    ),
    /*
        Cell background
    */
    new Command(
        /^background ((@?)(.+))$/,
        (root, value, a, b) => {
            let val = getCSSColor(root.constants.getValue(a, b));
            if (val != undefined && val) {
                root.addShared('background', val);
            }
        },
        (root, value, a, b) => {
            let prefix = SFormat.Keyword('background ');
            let val = getCSSColor(root.constants.getValue(a, b));

            if (root.constants.isValid(a, b) && val) {
                return prefix + SFormat.Constant(value);
            } else if (a == '@' || !val) {
                return prefix + SFormat.Error(value);
            } else {
                return prefix + SFormat.Color(value, val);
            }
        }
    ),
    /*
        Format expression
    */
    new Command(
        /^format (.+)$/,
        (root, expression) => {
            if (ARG_FORMATTERS.hasOwnProperty(expression)) {
                root.addFormatExpression(ARG_FORMATTERS[expression])
            } else {
                let ast = new Expression(expression, root);
                if (ast.isValid()) {
                    root.addFormatExpression((a, b, c, d, e, f) => ast.eval(a, b, c, d, e, undefined, f));
                }
            }
        },
        (root, expression) => SFormat.Keyword('format ') + (ARG_FORMATTERS.hasOwnProperty(expression) ? SFormat.Constant(expression) : Expression.format(expression, root))
    ),
    /*
        Category
    */
    new Command(
        /^((?:\w+)(?:\,\w+)*:|)category(?: (.+))?$/,
        (root, extensions, name) => {
            root.addCategory(name || '', name == undefined);
            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        },
        (root, extensions, name) => (extensions ? SFormat.Constant(extensions) : '') + SFormat.Keyword('category') + (name ? (' ' + SFormat.Normal(name)) : '')
    ),
    /*
        Grouped header
    */
    new Command(
        /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))? as group of (\d+)$/,
        (root, extensions, name, length) => {
            if (length > 0) {
                root.addHeader(name || '', Number(length));
                if (extensions) {
                    root.addExtension(... extensions.slice(0, -1).split(','));
                }
            }
        },
        (root, extensions, name, length) => {
            let prefix = (extensions ? SFormat.Constant(extensions) : '') + SFormat.Keyword('header');
            let suffix = (name ? ' ' : '') + SFormat.Keyword('as group of ') + SFormat.Constant(length);
            if (name != undefined) {
                if (SP_KEYWORD_MAPPING_0.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.Reserved(name) + suffix;
                } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedProtected(name) + suffix;
                } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedPrivate(name) + suffix;
                } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedSpecial(name) + suffix;
                } else if (SP_KEYWORD_MAPPING_5_HO.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedItemizable(name) + suffix;
                } else {
                    return prefix + ' ' + SFormat.Normal(name) + suffix;
                }
            } else {
                return prefix + suffix;
            }
        }
    ),
    /*
        Header
    */
    new Command(
        /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))?$/,
        (root, extensions, name) => {
            root.addHeader(name || '');
            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        },
        (root, extensions, name) => {
            let prefix = (extensions ? SFormat.Constant(extensions) : '') + SFormat.Keyword('header');
            if (name != undefined) {
                if (SP_KEYWORD_MAPPING_0.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.Reserved(name);
                } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedProtected(name);
                } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedPrivate(name);
                } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedSpecial(name);
                } else if (SP_KEYWORD_MAPPING_5_HO.hasOwnProperty(name)) {
                    return prefix + ' ' + SFormat.ReservedItemizable(name);
                } else {
                    return prefix + ' ' + SFormat.Normal(name);
                }
            } else {
                return prefix;
            }
        }
    ),
    /*
        Row
    */
    new Command(
        /^((?:\w+)(?:\,\w+)*:|)show (\S+[\S ]*) as (\S+[\S ]*)$/,
        (root, extensions, name, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addRow(name, ast);
                if (extensions) {
                    root.addExtension(... extensions.slice(0, -1).split(','));
                }
            }
        },
        (root, extensions, name, expression) => (extensions ? SFormat.Constant(extensions) : '') + SFormat.Keyword('show ') + SFormat.Constant(name) + SFormat.Keyword(' as ') + Expression.format(expression, root)
    ),
    /*
        Var
    */
    new Command(
        /^var (\w+) (.+)$/,
        (root, name, value) => {
            root.addHeaderVariable(name, value);
        },
        (root, name, value) => SFormat.Keyword('var ') + SFormat.Constant(name) + ' ' + SFormat.Normal(value)
    ),
    /*
        Layout
    */
    new Command(
        /^layout ((\||\_|table|statistics|rows|members)(\s+(\||\_|table|statistics|rows|members))*)$/,
        (root, layout) => root.addLayout(layout.split(/\s+/).map(v => v.trim())),
        (root, layout) => SFormat.Keyword('layout ') + SFormat.Constant(layout)
    ),
    /*
        Table variable
    */
    new Command(
        /^set (\w+[\w ]*) with all as (.+)$/,
        (root, name, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addVariable(name, ast, true);
            }
        },
        (root, name, expression) => SFormat.Keyword('set ') + SFormat.Constant(name) + SFormat.Keyword(' with all as ') + Expression.format(expression, root),
        true
    ),
    /*
        Function
    */
    new Command(
        /^set (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/,
        (root, name, arguments, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addFunction(name, ast, arguments.split(',').map(v => v.trim()));
            }
        },
        (root, name, arguments, expression) => SFormat.Keyword('set ') + SFormat.Constant(name) + SFormat.Keyword(' with ') + arguments.split(',').map(v => SFormat.Constant(v)).join(',') + SFormat.Keyword(' as ') + Expression.format(expression, root),
        true
    ),
    /*
        Variable
    */
    new Command(
        /^set (\w+[\w ]*) as (.+)$/,
        (root, name, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addVariable(name, ast, false);
            }
        },
        (root, name, expression) => SFormat.Keyword('set ') + SFormat.Constant(name) + SFormat.Keyword(' as ') + Expression.format(expression, root),
        true
    ),
    /*
        Lined
    */
    new Command(
        /^lined$/,
        (root, value) => root.addGlobal('lined', 1),
        (root, value) => SFormat.Keyword('lined')
    ),
    new Command(
        /^lined (on|off|thin|thick)$/,
        (root, value) => root.addGlobal('lined', ARG_MAP[value]),
        (root, value) => SFormat.Keyword('lined ') + SFormat.Bool(value, value == 'thick' || value == 'thin' ? 'on' : value)
    ),
    /*
        Performance (entry cutoff)
    */
    new Command(
        /^performance (\d+)$/,
        (root, value) => {
            if (value > 0) {
                root.addGlobal('performance', Number(value));
            }
        },
        (root, value) => SFormat.Keyword('performance ') + (value > 0 ? SFormat.Normal(value) : SFormat.Error(value))
    ),
    /*
        Scale
    */
    new Command(
        /^scale (\d+)$/,
        (root, value) => {
            if (value > 0) {
                root.addGlobal('scale', Number(value));
            }
        },
        (root, value) => SFormat.Keyword('scale ') + (value > 0 ? SFormat.Normal(value) : SFormat.Error(value))
    ),
    /*
        Row height
    */
    new Command(
        /^row height (\d+)$/,
        (root, value) => {
            if (value > 0) {
                root.addGlobal('row_height', Number(value));
            }
        },
        (root, value) => SFormat.Keyword('row height ') + (value > 0 ? SFormat.Normal(value) : SFormat.Error(value))
    ),
    /*
        Font
    */
    new Command(
        /^font (.+)$/,
        (root, font) => {
            let value = getCSSFont(font);
            if (value) {
                root.addGlobal('font', value);
            }
        },
        (root, font) => SFormat.Keyword('font ') + (getCSSFont(font) ? SFormat.Normal(font) : SFormat.Error(font))
    ),
    /*
        Shared options
    */
    new Command(
        /^(difference|hydra|flip|brackets|statistics|maximum|grail|decimal) (on|off)$/,
        (root, key, value) => root.addShared(key, ARG_MAP[value]),
        (root, key, value) => SFormat.Keyword(key) + ' ' + SFormat.Bool(value)
    ),
    /*
        Clean
    */
    new Command(
        /^clean$/,
        (root) => root.addLocal('clean', 1),
        (root) => SFormat.Keyword('clean')
    ),
    new Command(
        /^clean hard$/,
        (root) => root.addLocal('clean', 2),
        (root) => SFormat.Keyword('clean ') + SFormat.Constant('hard')
    ),
    /*
        Action
    */
    new Command(
        /^action (none|show)$/,
        (root, value) => root.addAction(value),
        (root, value) => SFormat.Keyword('action ') + SFormat.Constant(value)
    ),
    /*
        Indexing
    */
    new Command(
        /^indexed$/,
        (root, value) => root.addGlobal('indexed', 1),
        (root, value) => SFormat.Keyword('indexed')
    ),
    new Command(
        /^indexed (on|off|static)$/,
        (root, value) => root.addGlobal('indexed', ARG_MAP[value]),
        (root, value) => SFormat.Keyword('indexed ') + SFormat.Bool(value, value == 'static' ? 'on' : value)
    ),
    /*
        Global options
    */
    new Command(
        /^(members|outdated|opaque|large rows|align title)$/,
        (root, key) => root.addGlobal(key, true),
        (root, key) => SFormat.Keyword(key)
    ),
    new Command(
        /^(members|outdated|opaque|large rows|align title) (on|off)$/,
        (root, key, value) => root.addGlobal(key, ARG_MAP[value]),
        (root, key, value) => SFormat.Keyword(key) + ' ' + SFormat.Bool(value)
    ),
    /*
        Custom left category
    */
    new Command(
        /^((?:\w+)(?:\,\w+)*:|)left category$/,
        (root, extensions) => {
            root.addGlobal('custom left', true);
            root.addCategory('', true);
            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        },
        (root, extensions) => (extensions ? SFormat.Constant(extensions) : '') + SFormat.Keyword('left category')
    ),
    /*
        Simulator target
    */
    new Command(
        /^simulator (target|source) (\S+)$/,
        (root, mode, identifier) => {
            root.addGlobal('simulator_target', identifier);
            root.addGlobal('simulator_target_source', mode == 'source');
        },
        (root, mode, identifier) => SFormat.Keyword('simulator ') + SFormat.Keyword(mode) + ' ' + (identifier in Database.Players ? SFormat.Constant(identifier) : SFormat.Error(identifier))
    ),
    /*
        Statistics
    */
    new Command(
        /^statistics (\S+[\S ]*) as (\S+[\S ]*)$/,
        (root, name, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addStatistics(name, ast);
            }
        },
        (root, name, expression) => SFormat.Keyword('statistics ') + SFormat.Constant(name) + SFormat.Keyword(' as ') + Expression.format(expression, root)
    ),
    /*
        Simulator cycles
    */
    new Command(
        /^simulator (\d+)$/,
        (root, value) => {
            if (value > 0) {
                root.addGlobal('simulator', Number(value));
            }
        },
        (root, value) => SFormat.Keyword('simulator ') + (value > 0 ? SFormat.Normal(value) : SFormat.Error(value))
    ),
    /*
        Extra expression
    */
    new Command(
        /^extra (.+)$/,
        (root, value) => root.addFormatExtraExpression(a => value),
        (root, value) => SFormat.Keyword('extra ') + SFormat.Normal(value)
    ),
    /*
        Constant
    */
    new Command(
        /^const (\w+) (.+)$/,
        (root, name, value) => root.addConstant(name, value),
        (root, name, value) => SFormat.Keyword('const ') + SFormat.Constant(name) + ' ' + SFormat.Normal(value),
        true
    ),
    /*
        Cell style
    */
    new Command(
        /^style ([a-zA-Z\-]+) (.*)$/,
        (root, style, value) => root.addStyle(style, value),
        (root, style, value) => SFormat.Keyword('style ') + SFormat.Constant(style) + ' ' + SFormat.Normal(value)
    ),
    /*
        Cell content visibility
    */
    new Command(
        /^visible (on|off)$/,
        (root, value) => root.addShared('visible', ARG_MAP[value]),
        (root, value) => SFormat.Keyword('visible ') + SFormat.Bool(value)
    ),
    /*
        Cell border
    */
    new Command(
        /^border (none|left|right|both)$/,
        (root, value) => root.addShared('border', ARG_MAP[value]),
        (root, value) => SFormat.Keyword('border ') + SFormat.Constant(value)
    ),
    /*
        Toggle statistics color
    */
    new Command(
        /^statistics color (on|off)$/,
        (root, value) => root.addShared('statistics_color', ARG_MAP[value]),
        (root, value) => SFormat.Keyword('statistics color ') + SFormat.Bool(value)
    ),
    /*
        Order expression
    */
    new Command(
        /^order by (.+)$/,
        (root, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addLocal('order', (a, b, c, d, e) => ast.eval(a, b, c, d, e));
            }
        },
        (root, expression) => SFormat.Keyword('order by ') + Expression.format(expression, root)
    ),
    /*
        Value expression
    */
    new Command(
        /^expr (.+)$/,
        (root, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addLocal('expr', (a, b, c, d, e, f) => ast.eval(a, b, c, d, e, undefined, f));
            }
        },
        (root, expression) => SFormat.Keyword('expr ') + Expression.format(expression, root)
    ),
    /*
        Alias expression
    */
    new Command(
        /^expa (.+)$/,
        (root, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addLocal('expa', (a, b) => ast.eval(undefined, undefined, a, undefined, undefined, undefined, b));
            }
        },
        (root, expression) => SFormat.Keyword('expa ') + Expression.format(expression, root)
    ),
    /*
        Cell alignment
    */
    new Command(
        /^align (left|right|center)$/,
        (root, value) => root.addShared('align', value),
        (root, value) => SFormat.Keyword('align ') + SFormat.Constant(value)
    ),
    new Command(
        /^align (left|right|center) (left|right|center)$/,
        (root, value, value2) => {
            root.addShared('align', value);
            root.addShared('align_title', value2);
        },
        (root, value, value2) => SFormat.Keyword('align ') + SFormat.Constant(value) + ' ' + SFormat.Constant(value2)
    ),
    /*
        Discard expression
    */
    new Command(
        /^discard (.+)$/,
        (root, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addDiscardRule((a, b, c, d, e) => ast.eval(a, b, c, d, e));
            }
        },
        (root, expression) => SFormat.Keyword('discard ') + Expression.format(expression, root)
    ),
    /*
        Color expression
    */
    new Command(
        /^expc (.+)$/,
        (root, expression) => {
            let ast = new Expression(expression, root);
            if (ast.isValid()) {
                root.addColorExpression((a, b, c, d, e, f) => ast.eval(a, b, c, d, e, undefined, f));
            }
        },
        (root, expression) => SFormat.Keyword('expc ') + Expression.format(expression, root)
    ),
    /*
        Cell padding (left only)
    */
    new Command(
        /^padding (.+)$/,
        (root, value) => root.addLocal('padding', value),
        (root, value) => SFormat.Keyword('padding ') + SFormat.Normal(value)
    ),
    /*
        Define extension
    */
    new Command(
        /^define (\w+)$/,
        (root, name) => root.addDefinition(name),
        (root, name) => SFormat.Keyword('define ') + SFormat.Normal(name),
        true
    ),
    /*
        Apply extension
    */
    new Command(
        /^extend (\w+)$/,
        (root, name) => root.addExtension(name),
        (root, name) => SFormat.Keyword('extend ') + (name in root.customDefinitions ? SFormat.Constant(name) : SFormat.Error(name))
    ),
    /*
        Force push current header / row / statistic
    */
    new Command(
        /^push$/,
        (root) => root.push(),
        (root) => SFormat.Keyword('push'),
        true
    ),
    /*
        Tracker
    */
    new Command(
        /^(track (\w+(?:[ \w]*\w)?) as (.+) when (.+))$/,
        (root, str, name, arg, arg2) => {
            let ast = new Expression(arg);
            let ast2 = new Expression(arg2);
            if (ast.isValid() && ast2.isValid()) {
                root.addTracker(name, str, ast2, ast);
            }
        },
        (root, str, name, arg, arg2) => SFormat.Keyword('track ') + SFormat.Constant(name) + SFormat.Keyword(' as ') + Expression.format(arg) + SFormat.Keyword(' when ') + Expression.format(arg2)
    ),
    new Command(
        /^(track (\w+(?:[ \w]*\w)?) when (.+))$/,
        (root, str, name, arg) => {
            let ast = new Expression(arg);
            if (ast.isValid()) {
                root.addTracker(name, str, ast);
            }
        },
        (root, str, name, arg) => SFormat.Keyword('track ') + SFormat.Constant(name) + SFormat.Keyword(' when ') + Expression.format(arg)
    )
];

class Constants {
    constructor () {
        this.Values = {
            'green': '#00c851',
            'orange': '#ffbb33',
            'red': '#ff3547',
            'blue': '#0064b4',
            '15min': '900000',
            '1hour': '3600000',
            '12hours': '43200000',
            '1day': '86400000',
            '3days': '259200000',
            '7days': '604800000',
            '21days': '1814400000',
            'mount10': '1',
            'mount20': '2',
            'mount30': '3',
            'mount50': '4',
            'none': '0',
            'warrior': '1',
            'mage': '2',
            'scout': '3',
            'assassin': '4',
            'battlemage': '5',
            'berserker': '6',
            'demonhunter': '7',
            'druid': '8',
            'empty': '',
            'tiny': '40',
            'small': '60',
            'normal': '100',
            'large': '160',
            'huge': '200',
            'scrapbook': '2180',
            'max': '-1',
            'weapon': '1',
            'shield': '2',
            'breastplate': '3',
            'shoes': '4',
            'gloves': '5',
            'helmet': '6',
            'belt': '7',
            'necklace': '8',
            'ring': '9',
            'talisman': '10'
        }
    }

    get (key) {
        if (typeof key == 'string' && key.length >= 2 && key[0] == '@') {
            let rkey = key.slice(1);
            if (this.Values.hasOwnProperty(rkey)) {
                return this.Values[rkey];
            } else {
                return key;
            }
        } else {
            return key;
        }
    }

    exists (key) {
        return typeof key == 'string' && key.length >= 2 && key[0] == '@' && this.Values.hasOwnProperty(key.slice(1));
    }

    addConstant (key, value) {
        this.Values[key] = value;
    }

    /*
        Old stuff
    */
    getValue (tag, key) {
        return tag == '@' ? this.Values[key] : key;
    }

    isValid (tag, key) {
        return tag == '@' && this.Values.hasOwnProperty(key);
    }
}

class Settings {
    // Contructor
    constructor (string, type) {
        this.code = string;
        this.type = type;

        // Constants
        this.constants = new Constants();

        // Discard rules
        this.discardRules = [];

        // Variables and functions
        this.functions = [];
        this.variables = [];
        this.variablesReference = [];

        this.trackers = {};

        // Lists
        this.lists = [];
        this.row_indexes = {};

        // Table
        this.categories = [];
        this.customStatistics = [];
        this.customRows = [];

        // Other things
        this.customDefinitions = {};

        // Settings
        this.globals = {};

        // Shared globals
        this.shared = {
            statistics_color: true,
            visible: true
        };

        // Shared category
        this.sharedCategory = null;

        // Temporary objects
        this.category = null;
        this.header = null;
        this.definition = null;
        this.row = null;

        // Reset filter
        this.setFilter(null);

        // Ignore flag
        let ignore = false;

        // Parse settings
        for (let line of Settings.handleImports(string)) {
            // Handle comments
            let commentIndex = -1;
            let ignored = false;

            for (let i = 0; i < line.length; i++) {
                if (line[i] == '\'' || line[i] == '\"') {
                    if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue;
                    else {
                        ignored = ignored ? false : line[i];
                    }
                } else if (line[i] == '#' && !ignored) {
                    commentIndex = i;
                    break;
                }
            }

            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            // Trim command
            let trimmed = line.trim();

            // Find valid command
            let command = SettingsCommands.find(command => command.isValid(trimmed));

            if (command) {
                if (command == SettingsCommands[0]) {
                    // Handle macros
                    command.parse(this, trimmed);

                    // Set up filtering
                    if (this.filter.type != null) {
                        ignore = this.filter.invert ? (this.filter.type == type) : (this.filter.type != type);
                    } else {
                        ignore = false;
                    }
                } else if (command == SettingsCommands[1] || command == SettingsCommands[2]) {
                    // Ignore those
                } else if (!ignore) {
                    // Handle command
                    command.parse(this, trimmed);
                }
            }
        }

        // Push last category
        this.pushCategory();
    }

    // Merge definition to object
    mergeDefinition (obj, name) {
        let definition = this.customDefinitions[name];
        if (definition) {
            // Merge commons
            for (var [ key, value ] of Object.entries(definition)) {
                if (!obj.hasOwnProperty(key)) obj[key] = definition[key];
            }

            // Merge color expression
            if (!obj.color.expression) {
                obj.color.expression = definition.color.expression;
            }

            // Merge color rules
            if (!obj.color.rules.rules.length) {
                obj.color.rules.rules = definition.color.rules.rules;
            }

            // Merge value expression
            if (!obj.value.format) {
                obj.value.format = definition.value.format;
            }

            // Merge difference format expression
            if (!obj.value.format) {
                obj.value.formatDifference = definition.value.formatDifference;
            }

            // Merge statistics format expression
            if (!obj.value.format) {
                obj.value.formatStatistics = definition.value.formatStatistics;
            }

            // Merge value extra
            if (!obj.value.extra) {
                obj.value.extra = definition.value.extra;
            }

            // Merge value rules
            if (!obj.value.rules.rules.length) {
                obj.value.rules.rules = definition.value.rules.rules;
            }

            this.mergeStyles(obj, definition.style);
            this.mergeVariables(obj, definition.vars);
        }
    }

    addTracker (name, str, ast, out) {
        this.trackers[name] = {
            str: str,
            ast: ast,
            out: out,
            hash: ast.rstr + (out ? out.rstr : '0000000000000000')
        };
    }

    // Merge mapping to object
    mergeMapping (obj, mapping) {
        // Merge commons
        for (var [ key, value ] of Object.entries(mapping)) {
            if (!obj.hasOwnProperty(key)) obj[key] = mapping[key];
        }

        // Merge value expression
        if (!obj.value.format) {
            obj.value.format = mapping.format;
        }

        // Merge diff value expression
        if (!obj.value.formatDifference) {
            obj.value.formatDifference = mapping.format_diff;
        }

        // Merge value extra
        if (!obj.value.extra) {
            obj.value.extra = mapping.extra;
        }

        this.mergeStyles(obj, mapping.style);
        this.mergeVariables(obj, mapping.vars);
    }

    merge (obj, mapping) {
        // Merge all non-objects
        for (var [ key, value ] of Object.entries(mapping)) {
            if (!obj.hasOwnProperty(key) && typeof value != 'object') obj[key] = mapping[key];
        }

        this.mergeStyles(obj, mapping.style);
        this.mergeVariables(obj, mapping.vars);
    }

    mergeStyles (obj, sourceStyle) {
        if (sourceStyle) {
            if (obj.style) {
                // Rewrite styles
                for (let [ name, value ] of Object.entries(sourceStyle.styles)) {
                    if (!obj.style.styles.hasOwnProperty(name)) {
                        obj.style.add(name, value);
                    }
                }
            } else {
                // Add whole style class
                obj.style = sourceStyle;
            }
        }
    }

    mergeVariables (obj, sourceVars) {
        if (sourceVars) {
            if (obj.vars) {
                // Add vars
                for (let [ name, value ] of Object.entries(sourceVars)) {
                    if (!obj.vars.hasOwnProperty(name)) {
                        obj.vars[name] = value;
                    }
                }
            } else {
                // Add whole list
                obj.vars = sourceVars;
            }
        }
    }

    // Push all settings
    push () {
        let obj = null;

        // Push definition
        obj = this.definition;
        if (obj) {
            this.customDefinitions[obj.name] = obj;
            this.definition = null;
        }

        // Push row
        obj = this.row;
        if (obj) {
            // Merge definitions
            for (let definitionName of obj.extensions || []) {
                this.mergeDefinition(obj, definitionName);
            }

            // Merge shared
            this.merge(obj, this.shared);

            // Push
            this.customRows.push(obj);
            this.row = null;
        }

        // Push header
        obj = this.header;
        if (obj && this.category) {
            let name = obj.name;

            // Get mapping if exists
            let mapping = SP_KEYWORD_MAPPING_0[name] || SP_KEYWORD_MAPPING_1[name] || SP_KEYWORD_MAPPING_2[name] || SP_KEYWORD_MAPPING_3[name] || SP_KEYWORD_MAPPING_5_HO[name];

            // Merge definitions
            for (let definitionName of obj.extensions || []) {
                this.mergeDefinition(obj, definitionName);
            }

            // Add specials
            let custom = SP_SPECIAL_CONDITIONS[name];
            if (custom && obj.clean != 2) {
                for (let entry of custom) {
                    if (entry.condition(obj)) {
                        entry.apply(obj);
                    }
                }
            }

            // Add mapping or expression
            if (mapping && !obj.expr) {
                if (obj.clean == 2) {
                    obj.expr = mapping.expr;
                } else {
                    this.mergeMapping(obj, mapping);
                }
            }

            // Push header if possible
            if (obj.expr) {
                if (!obj.clean) {
                    this.merge(obj, this.sharedCategory);
                    this.merge(obj, this.shared);
                } else {
                    this.merge(obj, {
                        visible: true,
                        statistics_color: true
                    });
                }

                if (obj.background) {
                    obj.color.rules.addRule('db', 0, obj.background);
                }

                // Push
                this.category.headers.push(obj);
            }

            this.header = null;
        }
    }

    // Push category
    pushCategory () {
        this.push();

        // Push category
        let obj = this.category;
        if (obj) {
            this.categories.push(obj);
            this.category = null;
        }
    }

    // Create color block
    getColorBlock () {
        return {
            expression: undefined,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined, ignoreBase = false, header = undefined) {
                // Get color from expression
                let expressionColor = this.expression ? this.expression(player, compare, settings, value, extra, header) : undefined;

                // Get color from color block
                let blockColor = this.rules.get(value, ignoreBase || (typeof expressionColor !== 'undefined'));

                // Return color or empty string
                return (typeof blockColor === 'undefined' ? getCSSBackground(expressionColor) : blockColor) || '';
            }
        }
    }

    // Create value block
    getValueBlock () {
        return {
            extra: undefined,
            format: undefined,
            formatDifference: undefined,
            formatStatistics: undefined,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined, header = undefined) {
                // Get value from value block
                let output = this.rules.get(value);

                // Get value from format expression
                if (typeof output == 'undefined' && this.format) {
                    output = this.format(player, compare, settings, value, extra, header);
                }

                // Get value from value itself
                if (typeof output == 'undefined') {
                    output = value;
                }

                // Add extra
                if (typeof output == 'undefined' && this.extra) {
                    output = `${ output }${ this.extra(player) }`;
                }

                // Return value
                return output;
            },
            getDifference: function (player, compare, settings, value, extra = undefined) {
                let nativeDifference = Number.isInteger(value) ? value : value.toFixed(2);

                if (this.formatDifference === true) {
                    if (typeof this.format != 'undefined') {
                        return this.format(player, compare, settings, value, extra);
                    } else {
                        return nativeDifference;
                    }
                } else if (this.formatDifference) {
                    return this.formatDifference(settings, value);
                } else {
                    return nativeDifference;
                }
            },
            getStatistics: function (settings, value) {
                let nativeFormat = Number.isInteger(value) ? value : value.toFixed(2);

                if (this.formatStatistics === false) {
                    return nativeFormat;
                } else if (this.formatStatistics) {
                    return this.formatStatistics(settings, value);
                } else if (typeof this.format != 'undefined') {
                    return this.format(undefined, undefined, settings, value);
                } else {
                    return nativeFormat;
                }
            }
        }
    }

    // Create new header
    addHeader (name, grouped = 0) {
        this.push();

        // Header
        this.header = {
            name: name,
            value: this.getValueBlock(),
            color: this.getColorBlock()
        };

        if (grouped) {
            this.header.grouped = grouped;
        }
    }

    // Create new category
    addCategory (name) {
        this.pushCategory();

        // Category
        this.category = {
            name: name,
            empty: name == '',
            headers: []
        };

        // Category shared
        this.sharedCategory = { }
    }

    // Create row
    addRow (name, expression) {
        this.push();

        // Row
        this.row = {
            name: name,
            ast: expression,
            value: this.getValueBlock(),
            color: this.getColorBlock()
        }
    }

    // Create definition
    addDefinition (name) {
        this.push();

        // Definition
        this.definition = {
            name: name,
            value: this.getValueBlock(),
            color: this.getColorBlock()
        }
    }

    // Create statistic
    addStatistics (name, expression) {
        this.customStatistics.push({
            name: name,
            ast: expression
        });
    }

    // Add alias
    addAlias (name) {
        let object = (this.definition || this.header);
        if (object) {
            object.alias = name;
        }
    }

    // Add custom style
    addStyle (name, value) {
        let object = (this.row || this.definition || this.header || this.sharedCategory || this.shared);
        if (object) {
            if (!object.style) {
                object.style = new CellStyle();
            }

            object.style.add(name, value);
        }
    }

    // Add color expression to the header
    addColorExpression (expression) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.color.expression = expression;
        }
    }

    // Add format expression to the header
    addFormatExpression (expression) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.value.format = expression;
        }
    }

    // Add format extra expression to the header
    addFormatExtraExpression (expression) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.value.extra = expression;
        }
    }

    addFormatStatisticsExpression (expression) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.value.formatStatistics = expression;
        }
    }

    addFormatDifferenceExpression (expression) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.value.formatDifference = expression;
        }
    }

    // Add color rule to the header
    addColorRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.color.rules.addRule(condition, referenceValue, value);
        }
    }

    // Add value rule to the header
    addValueRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object.value.rules.addRule(condition, referenceValue, value);
        }
    }

    // Add new variable
    addVariable (name, expression, isTableVariable = false) {
        this.variables[name] = {
            ast: expression,
            tableVariable: isTableVariable
        }
    }

    // Add new function
    addFunction (name, expression, args) {
        this.functions[name] = {
            ast: expression,
            args: args
        }
    }

    // Add global
    addGlobal (name, value) {
        this.globals[name] = value;
    }

    // Add shared variable
    addShared (name, value) {
        let object = (this.row || this.definition || this.header || this.sharedCategory || this.shared);
        if (object) {
            object[name] = value;
        }

        this.addLocal(`ex_${ name }`, value);
    }

    // Add extension
    addExtension (... names) {
        let object = (this.row || this.definition || this.header || this.sharedCategory || this.shared);
        if (object) {
            if (!object.extensions) {
                object.extensions = [];
            }

            object.extensions.push(... names);
        }
    }

    // Add constant
    addConstant (name, value) {
        this.constants.addConstant(name, value);
    }

    // Add local variable
    addLocal (name, value) {
        let object = (this.row || this.definition || this.header);
        if (object) {
            object[name] = value;
        }
    }

    // Add action
    addAction (value) {
        let object = this.header;
        if (object) {
            object['action'] = value;
        }
    }

    addHeaderVariable (name, value) {
        let object = (this.row || this.definition || this.header || this.sharedCategory || this.shared);
        if (object) {
            if (!object.vars) {
                object.vars = {};
            }

            object.vars[name] = value;
        }
    }

    addLayout (layout) {
        this.globals.layout = layout;
    }

    // Add discard rule
    addDiscardRule (rule) {
        this.discardRules.push(rule);
    }

    // Get code
    getCode () {
        return this.code;
    }

    // Get environment
    getEnvironment () {
        return this;
    }

    // Get compare environment
    getCompareEnvironment () {
        return {
            functions: this.functions,
            variables: this.variablesReference,
            lists: {},
            // Constants have to be propagated through the environment
            constants: this.constants,
            row_indexes: this.row_indexes
        }
    }

    // Set line filter
    setFilter (type, invert = false) {
        this.filter = {
            type: type,
            invert: invert
        }
    }

    // Flip filter
    flipFilter () {
        this.filter.invert = !this.filter.invert;
    }

    // Random getters and stuff
    getIndexStyle () {
        return this.globals.indexed;
    }

    getServerStyle () {
        return this.globals.server == undefined ? 100 : this.globals.server;
    }

    getBackgroundStyle () {
        return this.shared.background;
    }

    getOutdatedStyle () {
        return this.globals.outdated;
    }

    getLayout (hasStatistics, hasRows, hasMembers) {
        if (typeof this.globals.layout != 'undefined') {
            return this.globals.layout;
        } else {
            if (this.type == TableType.Players) {
                return [
                    ... (hasStatistics ? [ 'statistics', hasRows ? '|' : '_' ] : []),
                    ... (hasRows ? (hasStatistics ? [ 'rows', '_' ] : [ 'rows', '|', '_' ]) : []),
                    'table'
                ];
            } else if (this.type == TableType.Group) {
                return [
                    'table',
                    ... (hasStatistics || hasRows || hasMembers ? [ '_' ] : []),
                    ... (hasStatistics ? [ 'statistics' ] : []),
                    ... (hasRows ? [ '|', 'rows' ] : []),
                    ... (hasMembers ? [ '|', 'members' ] : [])
                ];
            } else {
                return [
                    ... (hasRows ? [ 'rows', '|', '_' ] : []),
                    'table'
                ];
            }
        }
    }

    getEntryLimit () {
        return this.globals.performance;
    }

    getSimulatorLimit () {
        return this.globals.simulator;
    }

    getOpaqueStyle () {
        return this.globals.opaque ? 'css-entry-opaque' : '';
    }

    getLinedStyle () {
        return this.globals.lined || 0;
    }

    getRowStyle () {
        return this.globals['large rows'] ? 'css-maxi-row' : '';
    }

    getRowHeight () {
        return this.globals['row_height'] || 0;
    }

    getFontStyle () {
        return this.globals.font ? `font: ${ this.globals.font };` : '';
    }

    getTitleAlign () {
        return this.globals['align title'];
    }

    getNameStyle () {
        return Math.max(100, this.globals.name == undefined ? 250 : this.globals.name);
    }

    evalRowIndexes (array, embedded = false) {
        // For every entry
        array.forEach((entry, index) => {
            // Get player from object if embedded
            let player = embedded ? entry.player : entry;

            // Save player index
            this.row_indexes[`${ player.Identifier }_${ player.Timestamp }`] = index;
        });
    }

    evalRules () {
        // For each category
        for (let category of this.categories) {
            // For each header
            for (let header of category.headers) {
                // For each rule block
                for (let rules of [ header.color.rules.rules, header.value.rules.rules ]) {
                    // For each entry
                    for (let i = 0, rule; rule = rules[i]; i++) {
                        let key = rule[3];
                        // Check if key exists
                        if (key && key in this.variables) {
                            // If variable with that name exists then set it
                            if (this.variables[key].value != 'undefined') {
                                // Set value
                                rule[1] = Number(this.variables[key].value);
                            } else {
                                // Remove the rule
                                rules.splice(i--, 1);
                            }
                        }
                    }
                }
            }
        }
    }

    evalHistory (array) {
        // Evaluate row indexes
        this.evalRowIndexes(array);

        // Purify array
        array = [ ... array ];

        // Get shared scope
        let scope = array.map((player, index) => {
            // Create segmented entry
            let entry = [ player, array[index + 1] || player ];
            entry.segmented = true;

            // Return entry
            return entry;
        });

        // Mark scope as segmented as well
        scope.segmented = true;

        // Iterate over all variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Run only if it is a table variable
            if (variable.tableVariable) {
                // Get value
                let value = variable.ast.eval(undefined, undefined, this, scope);

                // Set value if valid
                if (!isNaN(value) || typeof(value) == 'object' || typeof('value') == 'string') {
                    variable.value = value;
                } else {
                    delete variable.value;
                }
            }
        }

        // Evaluate custom rows
        for (let row of this.customRows) {
            let currentValue = row.ast.eval(array[0], undefined, this, array);

            row.eval = {
                value: currentValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalPlayers (array, simulatorLimit, entryLimit) {
        // Evaluate row indexes
        this.evalRowIndexes(array, true);

        // Variables
        let compareEnvironment = this.getCompareEnvironment();
        let sameTimestamp = array.timestamp == array.reference;

        // Set lists
        this.lists = {
            classes: array.reduce((c, { player }) => {
                c[player.Class]++;
                return c;
            }, {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0
            })
        }

        // Run simulator if needed
        this.evalSimulator(array, simulatorLimit, entryLimit);

        // Purify array
        array = [ ... array ];

        // Get segmented lists
        let arrayCurrent = array.map(entry => {
            let obj = [ entry.player, entry.compare ];
            obj.segmented = true;

            return obj;
        });

        let arrayCompare = array.map(entry => {
            let obj = [ entry.compare, entry.compare ];
            obj.segmented = true;

            return obj;
        });

        arrayCurrent.segmented = true;
        arrayCompare.segmented = true;

        // Evaluate variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                tableVariable: variable.tableVariable
            }

            if (variable.tableVariable) {
                // Calculate values of table variable
                let currentValue = variable.ast.eval(undefined, undefined, this, arrayCurrent);
                let compareValue = sameTimestamp ? currentValue : variable.ast.eval(undefined, undefined, this, arrayCompare);

                // Set values if valid
                if (!isNaN(currentValue) || typeof currentValue == 'object' || typeof currentValue == 'string') {
                    variable.value = currentValue;
                } else {
                    delete variable.value;
                }

                if (!isNaN(compareValue) || typeof compareValue == 'object' || typeof compareValue == 'string') {
                    this.variablesReference[name].value = compareValue;
                } else {
                    delete this.variablesReference[name].value;
                }
            }
        }

        // Evaluate custom rows
        for (let row of this.customRows) {
            let currentValue = row.ast.eval(undefined, undefined, this, arrayCurrent);
            let compareValue = sameTimestamp ? currentValue : row.ast.eval(undefined, undefined, compareEnvironment, arrayCompare);

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalGuilds (array) {
        // Evaluate row indexes
        this.evalRowIndexes(array, true);

        // Variables
        let simulatorLimit = this.getSimulatorLimit();
        let entryLimit = array.length;
        let compareEnvironment = this.getCompareEnvironment();
        let sameTimestamp = array.timestamp == array.reference;

        // Set lists
        this.lists = {
            joined: SiteOptions.obfuscated ? array.joined.map((p, i) => `joined_${ i + 1 }`) : array.joined,
            kicked: SiteOptions.obfuscated ? array.kicked.map((p, i) => `kicked_${ i + 1 }`) : array.kicked,
            classes: array.reduce((c, { player }) => {
                c[player.Class]++;
                return c;
            }, {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0
            })
        }

        // Run simulator if needed
        this.evalSimulator(array, simulatorLimit, entryLimit);

        // Purify array
        array = [ ... array ];

        // Get segmented lists
        let arrayCurrent = array.map(entry => {
            let obj = [ entry.player, entry.compare ];
            obj.segmented = true;

            return obj;
        });

        let arrayCompare = array.map(entry => {
            let obj = [ entry.compare, entry.compare ];
            obj.segmented = true;

            return obj;
        });

        arrayCurrent.segmented = true;
        arrayCompare.segmented = true;

        // Get own player
        let ownPlayer = array.find(entry => entry.player.Own) || array[0];

        // Evaluate variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                tableVariable: variable.tableVariable
            }

            if (variable.tableVariable) {
                // Calculate values of table variable
                let currentValue = variable.ast.eval(ownPlayer.player, ownPlayer.compare, this, arrayCurrent);
                let compareValue = sameTimestamp ? currentValue : variable.ast.eval(ownPlayer.compare, ownPlayer.compare, this, arrayCompare);

                // Set values if valid
                if (!isNaN(currentValue) || typeof currentValue == 'object' || typeof currentValue == 'string') {
                    variable.value = currentValue;
                } else {
                    delete variable.value;
                }

                if (!isNaN(compareValue) || typeof compareValue == 'object' || typeof compareValue == 'string') {
                    this.variablesReference[name].value = compareValue;
                } else {
                    delete this.variablesReference[name].value;
                }
            }
        }

        // Evaluate custom rows
        for (let row of this.customRows) {
            let currentValue = row.ast.eval(ownPlayer.player, ownPlayer.compare, this, arrayCurrent);
            let compareValue = sameTimestamp ? currentValue : row.ast.eval(ownPlayer.compare, ownPlayer.compare, compareEnvironment, arrayCompare);

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        this.evalRules();
    }

    evalSimulator (array, cycles = 0, limit = array.length) {
        if (cycles) {
            // Check whether timestamps match
            let sameTimestamp = array.reference == array.timestamp;

            // Slice the array depending on the entry limit
            array = array.slice(0, limit);

            // Preload all players if needed
            Database.loadPlayer(player);
            Database.loadPlayer(compare);

            // Arrays
            let arrayCurrent = null;
            let arrayCompare = null;

            // Simulate
            if (sameTimestamp) {
                // Create arrays
                arrayCurrent = array.map(({ player: { Identifier, Timestamp } }) => {
                    return {
                        player: Database.Players[Identifier][Timestamp].toSimulatorModel()
                    };
                });

                // Set target
                let targetCurrent = this.globals.simulator_target ? arrayCurrent.find(({ player }) => player.Identifier == this.globals.simulator_target) : null;

                // Null the targets if any is not found
                if (targetCurrent == null) {
                    targetCurrent = null;
                } else {
                    targetCurrent = targetCurrent.player;
                }

                // Run fight simulator
                new FightSimulator().simulate(arrayCurrent, cycles, targetCurrent, this.globals.simulator_target_source);
            } else {
                // Create arrays
                arrayCurrent = array.map(({ player: { Identifier, Timestamp } }) => {
                    return {
                        player: Database.Players[Identifier][Timestamp].toSimulatorModel()
                    };
                });

                arrayCompare = array.map(({ compare: { Identifier, Timestamp } }) => {
                    return {
                        player: Database.Players[Identifier][Timestamp].toSimulatorModel()
                    };
                });

                // Set targets
                let targetCurrent = this.globals.simulator_target ? arrayCurrent.find(({ player }) => player.Identifier == this.globals.simulator_target) : null;
                let targetCompare = this.globals.simulator_target ? arrayCurrent.find(({ player }) => player.Identifier == this.globals.simulator_target) : null;

                // Null the targets if any is not found
                if (targetCurrent == null || targetCompare == null) {
                    targetCompare = targetCompare = null;
                } else {
                    targetCurrent = targetCurrent.player;
                    targetCompare = targetCompare.player;
                }

                // Run fight simulator
                new FightSimulator().simulate(arrayCurrent, cycles, targetCurrent, this.globals.simulator_target_source);
                new FightSimulator().simulate(arrayCompare, cycles, targetCompare, this.globals.simulator_target_source);
            }

            // Set second array to first if missing
            if (sameTimestamp) {
                arrayCompare = arrayCurrent;
            }

            // Process results
            let resultsCurrent = {};
            let resultsCompare = {};

            for (let { player, score } of arrayCurrent) {
                resultsCurrent[player.Identifier] = score;
            }

            for (let { player, score } of arrayCompare) {
                resultsCompare[player.Identifier] = score;
            }

            // Save variables
            this.variables['Simulator'] = {
                value: resultsCurrent
            };

            this.variablesReference['Simulator'] = {
                value: resultsCompare
            }
        } else {
            // Delete variables
            delete this.variables['Simulator'];
            delete this.variablesReference['Simulator'];
        }
    }


    /*
        Old shit
    */

    static parseConstants(string) {
        var settings = new Settings('');

        for (var line of Settings.handleImports(string)) {
            var commentIndex = line.indexOf('#');
            if (commentIndex != -1) {
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();

            for (var command of SettingsCommands) {
                if (command.parseAlways && command.isValid(trimmed)) {
                    command.parse(settings, trimmed);
                    break;
                }
            }
        }

        return settings;
    }

    // Format code
    static format (string) {
        var settings = Settings.parseConstants(string);
        var content = '';

        for (var line of string.split('\n')) {
            var comment;
            var commentIndex = -1;
            var ignored = false;

            for (var i = 0; i < line.length; i++) {
                if (line[i] == '\'' || line[i] == '\"') {
                    if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue;
                    else {
                        ignored = ignored ? false : line[i];
                    }
                } else if (line[i] == '#' && !ignored) {
                    commentIndex = i;
                    break;
                }
            }

            if (commentIndex != -1) {
                comment = line.slice(commentIndex);
                line = line.slice(0, commentIndex);
            }

            var trimmed = line.trim();
            var spacing = line.match(/\s+$/);
            var prespace = line.match(/^\s+/);

            if (prespace) {
                content += prespace[0].replace(/ /g, '&nbsp;');
            }

            var command = SettingsCommands.find(command => command.isValid(trimmed));
            content += command ? command.format(settings, trimmed) : SFormat.Error(trimmed);

            if (spacing) {
                content += spacing[0].replace(/ /g, '&nbsp;');
            }

            if (commentIndex != -1) {
                content += SFormat.Comment(comment);
            }

            content += '</br>';
        }

        return content;
    }

    static handleImports (originalString) {
        let processedLines = [];

        let loop = undefined;
        let loopLines = [];

        for (let line of originalString.split('\n')) {
            let ltrim = line.trim();

            if (SettingsCommands[3].isValid(ltrim)) {
                let [, key ] = line.match(/^import (.+)$/);
                if (Templates.exists(key)) {
                    processedLines.push(... Templates.get(key).split('\n'));
                }
            } else if (SettingsCommands[1].isValid(ltrim)) {
                loop = SettingsCommands[1].parse(null, ltrim);
            } else if (SettingsCommands[2].isValid(ltrim)) {
                if (loop) {
                    processedLines.push(... Settings.handleLoop(loop, loopLines));

                    loop = undefined;
                    loopLines = [];
                }
            } else if (loop) {
                loopLines.push(line);
            } else {
                processedLines.push(line);
            }
        }

        return processedLines;
    }

    static handleLoop({ name, ast }, lines) {
        let outputLines = [];

        let array = ast.eval();
        if (array) {
            if (!Array.isArray(array)) {
                array = Object.values(array);
            }

            for (let value of array) {
                if (!Array.isArray(value)) {
                    value = [ value ];
                }

                outputLines.push(
                    ... lines,
                    ... name.map((key, index) => `var ${ key } ${ value[index] }`)
                );
            }
        }

        return outputLines;
    }
};

// Settings manager
const SettingsManager = new (class {
    initialize () {
        if (!this.settings) {
            // Initialize if needed
            this.settings = Preferences.get('settings', { });
            this.keys = Object.keys(this.settings);

            /*
                Convert existing settings in old form into new style
            */
            let keys = Preferences.keys().filter(key => key.includes('settings/')).map(key => key.substring(key.indexOf('/') + 1));
            let backup = {};

            if (keys.length) {
                for (let key of keys) {
                    let content = Preferences.get(`settings/${ key }`, '');
                    backup[key] = content;

                    // Convert existing settings to text
                    if (typeof content == 'string') {
                        // Do nothing
                    } else {
                        content = '';
                    }

                    // Save if valid
                    if (content.length) {
                        this.saveInternal(key, content);
                    }

                    Preferences.remove(`settings/${ key }`);
                }

                this.commit();
                Preferences.set('settingsBackup', backup);
            }
        }
    }

    commit () {
        // Save current settings
        Preferences.set('settings', this.settings);
        this.keys = Object.keys(this.settings);
    }

    saveInternal (name, content, parent = '') {
        // Check if settings exist
        let exists = name in this.settings;
        let settings = exists ? this.settings[name] : null;

        if (exists) {
            settings.content = content;
            settings.version = MODULE_VERSION;
            settings.timestamp = Date.now();
            settings.parent = parent;
        } else {
            settings = {
                name: name,
                content: content,
                parent: parent,
                version: MODULE_VERSION,
                timestamp: Date.now()
            }
        }

        this.settings[name] = settings;
    }

    save (name, content, parent) {
        this.initialize();
        this.saveInternal(name, content, parent);
        this.commit();
    }

    remove (name) {
        this.initialize();
        if (name in this.settings) {
            delete this.settings[name];
            this.commit();
        }
    }

    exists (name) {
        this.initialize();
        return name in this.settings;
    }

    all () {
        this.initialize();
        return this.settings;
    }

    list () {
        this.initialize();
        return Object.values(this.settings);
    }

    getKeys () {
        this.initialize();
        return this.keys;
    }

    get (name, fallback, template) {
        this.initialize();
        let settings = this.settings[name] || this.settings[fallback];
        return settings ? settings.content : template;
    }

    getObj (name, fallback) {
        this.initialize();
        return this.settings[name] || this.settings[fallback];
    }

    /*
        History stuff
    */

    // Get history
    getHistory () {
        return Preferences.get('settings_history', []);
    }

    // Add history
    addHistory (settings, identifier = 'settings') {
        // Get current history
        var history = Preferences.get('settings_history', []);

        // Add new history entry to the beginning
        history.unshift({
            name: identifier,
            content: settings
        });

        // Pop last entry if over 10 entries exist
        if (history.length > 10) {
            history.pop();
        }

        // Save current history
        Preferences.set('settings_history', history);
    }
})()

// Templates
const Templates = new (class {
    initialize () {
        if (!this.templates) {
            // Initialize when needed
            this.templates = SharedPreferences.get('templates', { });

            this.keys = Object.keys(this.templates);
            this.keys.sort((a, b) => a.localeCompare(b));

            /*
                Convert existing templates in old form into new style
            */
            let keys = SharedPreferences.keys().filter(key => key.includes('templates/')).map(key => key.substring(key.indexOf('/') + 1));
            let backup = {};

            if (keys.length) {
                for (let key of keys) {
                    let content = SharedPreferences.get(`templates/${ key }`, '');
                    backup[key] = content;

                    // Convert existing template to text
                    if (typeof(content) == 'string') {
                        // Do nothing
                    } else if (typeof(content) == 'object') {
                        content = content.content;
                    } else {
                        content = '';
                    }

                    // Save if valid
                    if (content.length) {
                        this.saveInternal(key, content);
                    }

                    SharedPreferences.remove(`templates/${ key }`);
                }

                this.commit();
                SharedPreferences.set('templatesBackup', backup);
            }
        }
    }

    commit () {
        // Save current templates
        SharedPreferences.set('templates', this.templates);

        this.keys = Object.keys(this.templates);
        this.keys.sort((a, b) => a.localeCompare(b));
    }

    saveInternal (name, content, compat = { cm: false, cg: false, cp: false }) {
        // Check if a template already exists
        let exists = name in this.templates;
        let template = exists ? this.templates[name] : null;

        if (exists) {
            // Overwrite needed parts
            template.content = content;
            template.compat = compat;
            template.version = MODULE_VERSION;
            template.timestamp = Date.now();
        } else {
            // Create new object
            template = {
                name: name,
                content: content,
                compat: compat,
                version: MODULE_VERSION,
                timestamp: Date.now(),
                online: false
            };
        }

        // Save template
        this.templates[name] = template;
    }

    markAsOnline (name, key, secret) {
        this.initialize();

        // Mark template as online if exists
        if (name in this.templates) {
            // Set timestamp & keys
            this.templates[name].online = {
                timestamp: this.templates[name].timestamp,
                key: key,
                secret: secret
            };

            this.commit();
        }
    }

    markAsOffline (name) {
        this.initialize();

        // Mark template as offline if exists
        if (name in this.templates) {
            // Set online to false
            this.templates[name].online = false;

            this.commit();
        }
    }

    save (name, content, compat) {
        this.initialize();

        // Save template
        this.saveInternal(name, content, compat);

        // Commit changes
        this.commit();
    }

    remove (name) {
        this.initialize();

        // Remove template
        if (name in this.templates) {
            delete this.templates[name];
            this.commit();
        }
    }

    exists (name) {
        this.initialize();

        // Return true if template exists
        return name in this.templates;
    }

    all () {
        this.initialize();

        // Return templates
        return this.templates;
    }

    list () {
        this.initialize();

        // Return list of templates
        return Object.values(this.templates);
    }

    getKeys () {
        this.initialize();

        // Return keys
        return this.keys;
    }

    get (name) {
        this.initialize();

        // Return loaded settings
        return name in this.templates ? this.templates[name].content : '';
    }
})();
