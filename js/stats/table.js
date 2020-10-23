class HeaderGroup {
    constructor (name, empty) {
        this.name = name;
        this.empty = empty;
        this.sortkey = SHA1(name);

        this.width = 0;
        this.length = 0;

        this.headers = [];
    }

    add (name, settings, defaults, cellgen, statgen, sort, last, span = 1) {
        var header = {
            name: name,
            generators: {
                cell: cellgen,
                statistics: statgen
            },
            sort: sort,
            sortkey: `${ this.sortkey }.${ name }.${ this.length }`,
            span: span,
            bordered: last
        };

        merge(header, settings);
        merge(header, defaults);

        this.headers.push(header);
        this.width += header.width;
        this.length += span;
    }
}

// Helper function
function merge (a, b) {
    for (var [k, v] of Object.entries(b)) {
        if (!a.hasOwnProperty(k) && typeof(v) != 'object') a[k] = b[k];
    }
    return a;
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
        super.push({ player: player, compare: compare || player, latest: latest, index: this.length, hidden: hidden });
    }
}

// Special array for group only
class GroupTableArray extends Array {
    constructor (joined, kicked, ts, rs, missing) {
        super();

        this.joined = joined;
        this.kicked = kicked;
        this.missing = missing;

        this.timestamp = ts;
        this.reference = rs;
    }

    add (player, compare) {
        super.push({ player: player, compare: compare || player, index: this.length });
    }
}

// Table Type
const TableType = {
    History: 0,
    Players: 1,
    Group: 2
}

// Easter eggs :)
function getEasterEgg (id) {
    if (id == 'w27_net_p268175' || id == 'w39_net_p321948') {
        // #1 THE QUEEN
        return '<i class="chess queen icon"></i>';
    } else if (id == 'w27_net_p287170' || id == 'w39_net_p329544' || id == 'w42_net_p2' || id == 'w40_net_p1230') {
        return '<img src="res/icon_sft.png" style="margin-bottom: 1px; width: 24px;"/> ';
    } else {
        return '';
    }
}

// Table instance
class TableInstance {
    constructor (settings, type) {
        // Parameters
        this.settings = settings;
        this.type = type;

        this.sorting = [];

        // Column configuration
        this.config = [];
        this.settings.categories.forEach((category, ci, ca) => {
            var group = new HeaderGroup(category.name, category.empty);
            var glast = ci == ca.length - 1;

            category.headers.forEach((header, hi, ha) => {
                var hlast = (!glast && hi == ha.length - 1) || header.border >= 2 || (hi != ha.length - 1 && (ha[hi + 1].border == 1 || ha[hi + 1].border == 3));

                if (header.grouped) {
                    if (header.width) {
                        header.width = header.grouped * (header.width + 3);
                    }

                    group.add((header.alias != undefined ? header.alias : header.name), header, {
                        width: Math.max(100, (header.alias || header.name).length * 12)
                    }, (player, compare) => {
                        var values = header.expr(player, compare, this.settings);
                        var references = header.expr(compare, compare, this.settings.getCompareEnvironment());

                        if (values == undefined || !Array.isArray(values)) {
                            return CellGenerator.PlainSpan(header.grouped, header.ndef == undefined ? '?' : header.ndef, hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        } else {
                            var content = '';

                            for (var i = 0; i < header.grouped; i++) {
                                var value = values[i];
                                var reference = references[i] == undefined ? value : references[i];
                                let extra = {
                                    index: i
                                };

                                if (value == undefined) {
                                    content += CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, i == header.grouped - 1 && hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                                } else {
                                    reference = (header.difference && compare) ? reference : undefined;
                                    if (!isNaN(reference)) {
                                        reference = header.flip ? (reference - value) : (value - reference);

                                        var freference = reference;
                                        if (header.format_diff === undefined) {
                                            freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                                        } else if (header.format_diff === true) {
                                            if (header.format) {
                                                freference = header.format(player, compare, this.settings, reference, extra);
                                            }
                                        } else if (header.format_diff !== false) {
                                            freference = header.format_diff(this.settings, reference);
                                        }

                                        reference = CellGenerator.Difference(reference, header.brackets, freference);
                                    } else {
                                        reference = '';
                                    }

                                    let color = header.color.get(player, compare, this.settings, value, extra);
                                    let shown = header.value.get(player, compare, this.settings, value, extra);

                                    content += CellGenerator.Cell(shown + reference, color, header.visible ? '' : color, i == header.grouped - 1 && hlast, header.align, header.padding, header.style ? header.style.cssText : undefined);
                                }
                            }

                            return content;
                        }
                    }, null, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return -1;
                        } else if (Array.isArray(value)) {
                            return value.reduce((a, b) => a + b, 0);
                        } else {
                            return value;
                        }
                    }, hlast, header.grouped);
                } else {
                    group.add((header.alias != undefined ? header.alias : header.name), header, {
                        width: Math.max(100, (header.alias || header.name).length * 12)
                    }, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, hlast, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        }

                        var reference = (header.difference && compare) ? header.expr(compare, compare, this.settings.getCompareEnvironment()) : undefined;
                        if (!isNaN(reference)) {
                            reference = header.flip ? (reference - value) : (value - reference);

                            var freference = reference;
                            if (header.format_diff === undefined) {
                                freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                            } else if (header.format_diff === true) {
                                if (header.format) {
                                    freference = header.format(player, compare, this.settings, reference);
                                }
                            } else if (header.format_diff !== false) {
                                freference = header.format_diff(this.settings, reference);
                            }

                            reference = CellGenerator.Difference(reference, header.brackets, freference);
                        } else {
                            reference = '';
                        }

                        let color = header.color.get(player, compare, this.settings, value);
                        let shown = header.value.get(player, compare, this.settings, value);

                        return CellGenerator.Cell(shown + reference, color, header.visible ? '' : color, hlast, header.align, header.padding, header.style ? header.style.cssText : undefined);
                    }, (players, operation) => {
                        var value = players.map(p => header.expr(p.player, p.compare, this.settings)).filter(x => x != undefined);
                        if (value.length == 0) {
                            return CellGenerator.Plain(header.ndef == undefined ? '?' : header.ndef, undefined, undefined, header.ndefc, header.style ? header.style.cssText : undefined);
                        }

                        value = operation(value);
                        if (!header.decimal) {
                            value = Math.trunc(value);
                        }

                        var reference = header.difference ? players.map(p => header.expr(p.compare, p.compare, this.settings.getCompareEnvironment())).filter(x => x != undefined) : undefined;

                        if (reference && reference.length) {
                            reference = operation(reference);

                            if (!isNaN(reference)) {
                                if (!header.decimal) {
                                    reference = Math.trunc(reference);
                                }

                                reference = header.flip ? (reference - value) : (value - reference);

                                var freference = reference;
                                if (header.format_diff === undefined) {
                                    freference = Number.isInteger(reference) ? reference : reference.toFixed(2);
                                } else if (header.format_diff === true) {
                                    if (header.format) {
                                        freference = header.format(undefined, undefined, this.settings, reference);
                                    }
                                } else if (header.format_diff !== false) {
                                    freference = header.format_diff(this.settings, reference);
                                }

                                reference = CellGenerator.Difference(reference, header.brackets, freference);
                            } else {
                                reference = '';
                            }
                        } else {
                            reference = '';
                        }

                        var color = undefined;
                        if (header.statistics_color) {
                            color = header.color.get(null, null, this.settings, value, undefined, true);
                        }

                        if (header.format_stat === undefined || header.format_stat === true) {
                            value = header.value.get(null, null, this.settings, value);
                        } else if (header.format_stat !== false) {
                            value = header.format_stat(this.settings, value);
                        }

                        return CellGenerator.Cell(value + reference, '', color);
                    }, (player, compare) => {
                        var value = header.expr(player, compare, this.settings);
                        if (value == undefined) {
                            return -1;
                        } else {
                            return value;
                        }
                    }, hlast);
                }
            });

            if (group.headers.length) {
                this.config.push(group);
            }
        });

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

        // Generate flat list
        this.flat = this.config.reduce((array, group) => {
            array.push(... group.headers);
            return array;
        }, []);
    }

    // Get current table content
    getTableContent () {
        var content, size;

        if (this.type == TableType.History) {
            [content, size] = this.createHistoryTable();
        } else if (this.type == TableType.Players) {
            [content, size] =  this.createPlayersTable();
        } else if (this.type == TableType.Group) {
            [content, size] =  this.createGroupTable();
        }

        var node = $(content);
        if (!SiteOptions.insecure && node.find('script, iframe, img[onerror]').toArray().length) {
            return [ $('<div><b style="font-weight: 1000;">Error in the system:</b><br/><br/>This table was not displayed because it contains HTML tags that are prohibited.<br/>Please remove them from your settings and try again.</div>'), size];
        }

        return [node, size];
    }

    // Set players
    setEntries (array, skipeval, sim, sort = undefined) {
        if (this.type == TableType.History) {
            array = array.map(([ timestamp, e ]) => {
                // Preload character
                Database.preload(e.Identifier, timestamp);
                let obj = Database.Players[e.Identifier][timestamp];

                // Find if falls under discard rule
                let disc = this.settings.discardRules.some(rule => rule(obj, obj, this.settings));

                // Return stuff
                return disc ? null : [ timestamp, obj ];
            }).filter(e => e);
        }

        // Entry array
        this.array = array;

        // Calculate constants
        if (this.type != TableType.History && !skipeval) {
            var players = [ ... array ];
            players.timestamp = array.timestamp;
            players.reference = array.reference;
            players.map_player = players.map(p => p.player);
            players.map_compare = players.map(p => p.compare);

            if (this.type == TableType.Players) {
                this.settings.evaluateConstants(players, sim, array.perf || this.settings.globals.performance, this.type);
            } else {
                players.joined = array.joined;
                players.kicked = array.kicked;
                this.settings.evaluateConstants(players, this.settings.globals.simulator, array.length, this.type);
            }
        } else if (this.type == TableType.History) {
            this.settings.evaluateConstantsHistory(array.map(p => p[1]));
        }

        // Calculate player indexes
        if (sort && (this.type == TableType.Players || this.type == TableType.Group)) {
            this.array.sort((a, b) => sort(b.player, b.compare) - sort(a.player, a.compare));
            for (var i = 0; i < this.array.length; i++) {
                this.array[i].index = i;
            }
        }

        // Generate table entries
        this.generateEntries();
    }

    // Generate entries
    generateEntries () {
        // Clear current entries
        this.entries = [];

        // Common settings
        let backgroundColor = this.settings.getBackgroundStyle();
        let indexStyle = this.settings.getIndexStyle();

        if (this.type == TableType.History) {
            // Loop over all items of the array
            for (let i = 0; i < this.array.length; i++) {
                // Get variables
                let [ timestamp, player ] = this.array[i];
                let compare = i < this.array.length - 1 ? this.array[i + 1][1] : player;

                // Add table row start tag
                let content = `<tr class="css-entry">`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
                            ${ i + 1 }
                        </td>
                    `;
                }

                // Add date
                content += `
                    <td class="border-right-thin" ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
                        ${ formatDate(timestamp) }
                    </td>
                `;

                // Add columns
                for (let header of this.flat) {
                    content += header.generators.cell(player, compare);
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
                let content = `<tr class="css-entry ${ hidden ? 'css-entry-hidden' :'' }">`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
                            ${ indexStyle == 1 ? (index + 1) : '{__INDEX__}' }
                        </td>
                    `;
                }

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

                // Add columns
                for (let header of this.flat) {
                    content += header.generators.cell(player, compare);
                }

                // Add table row end tag
                content += `</tr>`;

                // Create new entry and push it to the list
                this.entries.push({
                    content: content,
                    sorting: this.flat.reduce((obj, { order, sortkey, flip, expr, sort }) => {
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = expr(player, compare, this.settings);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - expr(compare, compare, this.settings));
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
                let content = `<tr class="css-entry">`;

                // Add row index if enabled
                if (indexStyle) {
                    content += `
                        <td ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' }>
                            ${ indexStyle == 1 ? (index + 1) : '{__INDEX__}' }
                        </td>
                    `;
                }

                // Add name
                content += `
                    <td class="border-right-thin clickable" ${ backgroundColor ? `style="background: ${ backgroundColor }"` : '' } data-id="${ player.Identifier }">
                        ${ SiteOptions.obfuscated ? '' : getEasterEgg(player.Identifier) }
                        ${ SiteOptions.obfuscated ? `player_${ index + 1 }` : player.Name }
                    </td>
                `;

                // Add columns
                for (let header of this.flat) {
                    content += header.generators.cell(player, compare);
                }

                // Add table row end tag
                content += `</tr>`;

                // Create new entry and push it to the list
                this.entries.push({
                    content: content,
                    sorting: this.flat.reduce((obj, { order, sortkey, flip, expr, sort }) => {
                        if (order) {
                            // Use special order expression if supplied
                            let difference = undefined;
                            let value = expr(player, compare, this.settings);

                            if (!noCompare) {
                                // Get difference
                                difference = (flip ? -1 : 1) * (value - expr(compare, compare, this.settings));
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
                var { key, flip, order } = this.sorting[0];
                var result = ((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key]);

                for (var i = 1; i < this.sorting.length; i++) {
                    var { key, flip, order } = this.sorting[i];
                    result = result || (((order == 1 && !flip) || (order == 2 && flip)) ? compareItems(a.sorting[key], b.sorting[key]) : compareItems(b.sorting[key], a.sorting[key]));
                }

                return result || (a.sorting['_index'] - b.sorting['_index']);
            });
        } else {
            this.entries.sort((a, b) => a.sorting['_index'] - b.sorting['_index']);
        }
    }

    // Sorting attributes for HTML
    getSortingTag (key) {
        var index = this.sorting.findIndex(s => s.key == key);
        return `data-sortable-key="${ key }" data-sortable="${ this.sorting[index] ? this.sorting[index].order : 0 }" data-sortable-index=${ this.sorting.length == 1 ? '' : (index + 1) }`;
    }

    // Create history table
    createHistoryTable () {
        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);
        var size = 200 + (this.settings.globals.indexed ? 50 : 0) + sizeDynamic;

        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        var details = '';
        if (this.settings.customRows.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.customRows) {
                var lw = widskip;
                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;;
                        } else {
                            break;
                        }
                    }
                }

                var player = this.array[0][1];
                var value = extra.ast.eval(player, player, this.settings, player);

                var color = extra.color.get(player, player, this.settings, value);
                let shown = extra.value.get(player, player, this.settings, value);

                var cell = CellGenerator.WideCell(shown, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }

            details += `
                <tr>
                    <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                    <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                </tr>
                <tr>
                    <td colspan="${ dividerSpan + 1 + (this.settings.globals.indexed ? 1 : 0) }"></td>
                </tr>
            `;
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ details }
                    <tr>
                        ${ this.settings.globals.indexed ? `<td style="width: 50px;" colspan="1" rowspan="2">#</td>` : '' }
                        <td style="width: 200px;" colspan="1" rowspan="2" class="border-right-thin">Date</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    </tr>
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }">${ h.name }</td>`)) }
                    </tr>
                    <tr>
                        ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                        <td class="border-bottom-thick border-right-thin"></td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
                    </tr>
                    ${ join(this.entries, e => e.content) }
                </tbody>
            `,
            size
        ];
    }

    // Create players table
    createPlayersTable () {
        var sizeServer = this.settings.globals.server == undefined ? 100 : this.settings.globals.server;
        var sizeName = this.settings.globals.name == undefined ? 250 : this.settings.globals.name;
        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);

        var size = sizeName + sizeServer + (this.settings.globals.indexed ? 50 : 0) + sizeDynamic;

        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        var details = '';
        if (this.settings.customRows.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.customRows) {
                var lw = widskip;

                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;;
                        } else {
                            break;
                        }
                    }
                }

                var value = extra.eval.value;
                var reference = extra.difference && !isNaN(extra.eval.compare) ? extra.eval.compare : '';

                if (reference && !isNaN(reference)) {
                    reference = extra.flip ? (reference - value) : (value - reference);
                    reference = CellGenerator.Difference(reference, extra.brackets, extra.format_diff ? extra.format(null, undefined, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                } else {
                    reference = '';
                }

                var color = extra.color.get(null, null, this.settings, value);
                let shown = extra.value.get(null, null, this.settings, value);

                var cell = CellGenerator.WideCell(shown + reference, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }">${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }

            details += `
                <tr>
                    <td class="border-right-thin border-bottom-thick" colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }"></td>
                    <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                </tr>
                <tr>
                    <td colspan="${ 1 + (this.settings.globals.indexed ? 1 : 0) + (sizeServer ? 1 : 0) }"></td>
                </tr>
            `;
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ details }
                    <tr>
                        ${ this.settings.globals.indexed ? `<td style="width: 50px;" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                        ${ sizeServer ? `<td style="width: ${ sizeServer }px;" rowspan="2" class="clickable" ${ this.getSortingTag('_server') }>Server</td>` : '' }
                        <td style="width: ${ sizeName }px;" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
                    <tr>
                        ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
                    </tr>
                    <tr>
                        ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                        <td class="border-bottom-thick border-right-thin" colspan="${ sizeServer ? 2 : 1 }"></td>
                        ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
                    </tr>
                    ${ join(this.entries, (e, ei) => e.content.replace('{__INDEX__}', ei + 1), 0, this.array.perf || this.settings.globals.performance) }
                </tbody>
            `,
            size
        ];
    }

    // Create group table
    createGroupTable () {
        var name = this.settings.globals.name == undefined ? 250 : this.settings.globals.name;

        var sizeDynamic = this.config.reduce((a, b) => a + b.width, 0);
        var size = name + (this.settings.globals.indexed ? 50 : 0) + Math.max(400, sizeDynamic);

        var showMembers = this.settings.globals.members;
        var showSummary = this.flat.reduce((a, b) => a || b.statistics, false);
        var dividerSpan = this.flat.reduce((t, h) => t + h.span, 0);

        // Table block
        var table = `
            <tr>
                ${ this.settings.globals.indexed ? `<td style="width: 50px;" rowspan="2" class="clickable" ${ this.settings.globals.indexed == 1 ? this.getSortingTag('_index') : '' }>#</td>` : '' }
                <td style="width: ${ name }px;" rowspan="2" class="border-right-thin clickable" ${ this.getSortingTag('_name') }>Name</td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td rowspan="2" colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" data-sortable-key="${ h.sortkey }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`) : `<td colspan="${ g.length }" class="${ index != array.length - 1 ? 'border-right-thin' : '' }">${ g.name }</td>`)}
            <tr>
                ${ join(this.config, (g, index, array) => g.empty ? '' : join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" style="width: ${ h.width }px;" class="clickable ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }" ${ this.getSortingTag(h.sortkey) }>${ h.name }</td>`)) }
            </tr>
            <tr>
                ${ this.settings.globals.indexed ? '<td class="border-bottom-thick"></td>' : '' }
                <td class="border-bottom-thick border-right-thin"></td>
                ${ join(this.config, (g, index, array) => g.empty ? join(g.headers, (h, hindex, harray) => `<td colspan="${ h.span }" class="border-bottom-thick ${ index != array.length - 1 && hindex == harray.length - 1 ? 'border-right-thin' : '' }"></td>`) : `<td colspan="${ g.length }" class="border-bottom-thick ${ index != array.length - 1 ? 'border-right-thin' : '' }"></td>`)}
            </tr>
                ${ join(this.entries, (e, ei) => e.content.replace('{__INDEX__}', ei + 1)) }
                ${ this.entries.missing.length ? `<tr class="css-b-bold">${ CellGenerator.WideCell(CellGenerator.Small(`Player data is missing for following members:<br/>${ this.entries.missing.map((n, i) => `${ i != 0 && i % 10 == 0 ? '<br/>' : '' }<b>${ n }</b>`).join(', ') }!`), undefined, this.flat.length + (this.settings.globals.indexed ? 1 : 0) + 1, 'center') }</tr>` : '' }
        `;

        // Statistics block
        var statistics = '';
        if (showSummary) {
            if (this.settings.customStatistics.length > 0) {
                statistics += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        ${ join(this.flat, (h, i) => `<td colspan="${ h.span }">${ h.statistics && h.generators.statistics ? h.name : '' }</td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                    </tr>
                `;

                for (var stat of this.settings.customStatistics) {
                    statistics += `
                        <tr>
                            <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ stat.name }</td>
                            ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => stat.ast.eval(null, null, this.settings, ar)) : `<td colspan=${ h.span }></td>`) }
                        </tr>
                    `;
                }
            } else {
                statistics += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        ${ join(this.flat, (h, i) => `<td colspan="${ h.span }">${ h.statistics && h.generators.statistics ? h.name : '' }</td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                        <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Minimum</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.min(... ar)) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Average</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => ar.reduce((a, b) => a + b, 0) / ar.length) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Maximum</td>
                        ${ join(this.flat, (h, index, array) => (h.statistics && h.generators.statistics) ? h.generators.statistics(this.array, ar => Math.max(... ar)) : `<td colspan=${ h.span }></td>`) }
                    </tr>
                `;
            }
        }

        // Content spacers
        var linedSpacer = `
            <tr>
                <td class="border-right-thin border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
            </tr>
        `;

        var linedSpacerTop = `
            <tr>
                <td class="border-bottom-thick" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }></td>
                <td class="border-bottom-thick" colspan=${ dividerSpan }></td>
            </tr>
        `;

        var spacer = `
            <tr>
                <td colspan="${ dividerSpan + 1 + (this.settings.globals.indexed ? 1 : 0) }"></td>
            </tr>
        `;

        var details = '';
        if (this.settings.customRows.length) {
            var widskip = 1;
            for (var i = 0, wid = 100; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            for (var extra of this.settings.customRows) {
                var lw = widskip;
                if (extra.width) {
                    var lw = 1;
                    for (var i = 0, wid = (extra.width == -1 ? sizeDynamic : extra.width); wid > 0 && i < this.flat.length; i++) {
                        wid -= this.flat[i].width;
                        if (wid > 0) {
                            lw += this.flat[i].span;
                        } else {
                            break;
                        }
                    }
                }

                var value = extra.eval.value;
                var reference = extra.difference && !isNaN(extra.eval.compare) ? extra.eval.compare : '';

                if (reference && !isNaN(reference)) {
                    reference = extra.flip ? (reference - value) : (value - reference);
                    reference = CellGenerator.Difference(reference, extra.brackets, extra.format_diff ? extra.format(null, undefined, this.settings, reference) : (Number.isInteger(reference) ? reference : reference.toFixed(2)));
                } else {
                    reference = '';
                }

                var color = extra.color.get(null, null, this.settings, value);
                let shown = extra.value.get(null, null, this.settings, value);

                var cell = CellGenerator.WideCell(shown + reference, color, lw, extra.align, extra.padding, extra.style ? extra.style.cssText : undefined);
                details += `
                    <tr>
                        <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>${ extra.name }</td>
                        ${ cell }
                    </tr>
                `;
            }
        }

        // Members block
        var members = '';
        if (showMembers) {
            var classes = this.array.reduce((c, p) => {
                c[p.player.Class - 1]++;
                return c;
            }, [0, 0, 0, 0, 0, 0, 0, 0]);

            var widskip = 1;
            for (var i = 0, wid = 60; wid > 0 && i < this.flat.length; i++) {
                wid -= this.flat[i].width;
                if (wid > 0) {
                    widskip += this.flat[i].span;
                } else {
                    break;
                }
            }

            var colcount = this.flat.reduce((c, x) => c + x.span, 0);

            members += `
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Warrior</td>
                    <td colspan="${ widskip }">${ classes[0] }</td>
                    ${ this.array.joined.length > 0 ? `
                        <td class="border-right-thin" rowspan="4" colspan="1">Joined</td>
                        <td colspan="${ Math.max(1, colcount - 1 - widskip) }" rowspan="3">${ this.array.joined.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Mage</td>
                    <td colspan="${ widskip }">${ classes[1] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Scout</td>
                    <td colspan="${ widskip }">${ classes[2] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Assassin</td>
                    <td colspan="${ widskip }">${ classes[3] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Battle Mage</td>
                    <td colspan="${ widskip }">${ classes[4] }</td>
                    ${ this.array.kicked.length > 0 ? `
                        <td class="border-right-thin" rowspan="4" colspan="1">Left</td>
                        <td colspan="${ Math.max(1, colcount - 1 - widskip) }" rowspan="4">${ this.array.kicked.join(', ') }</td>
                    ` : '' }
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Berserker</td>
                    <td colspan="${ widskip }">${ classes[5] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Demon Hunter</td>
                    <td colspan="${ widskip }">${ classes[6] }</td>
                </tr>
                <tr>
                    <td class="border-right-thin" ${ this.settings.globals.indexed ? 'colspan="2"' : '' }>Druid</td>
                    <td colspan="${ widskip }">${ classes[7] }</td>
                </tr>
            `;
        }

        var layout = this.settings.globals.layout.filter(block => {
            if (block == 1) {
                return true;
            } else if (block == 2) {
                return showSummary;
            } else if (block == 3) {
                return this.settings.customRows.length;
            } else if (block == 4) {
                return showMembers;
            }
        });

        var content = '';
        for (var i = 0; i < layout.length; i++) {
            var block = layout[i];
            var prev = i == 0 ? 0 : layout[i - 1];

            if (i == 1 && block == 1 && prev >= 3) {
                content += linedSpacer + spacer;
            } else if (i > 0 && block != 1 && prev >= 2) {
                content += linedSpacer;
            } else if (prev == 1 && i == layout.length - 1 && block != 2) {
                content += spacer + linedSpacerTop;
            } else if (i != 0 && block != 1) {
                content += spacer;
            }

            if (block == 1) {
                content += table;
            } else if (block == 2) {
                content += statistics;
            } else if (block == 3) {
                content += details;
            } else if (block == 4) {
                content += members;
            }
        }

        return [
            `
                <thead>

                </thead>
                <tbody style="${ this.settings.globals.font ? `font: ${ this.settings.globals.font };` : '' }" class="${ this.settings.globals.lined ? (this.settings.globals.lined == 1 ? 'css-entry-lined' : 'css-entry-thicklined') : '' } ${ this.settings.globals.opaque ? 'css-entry-opaque' : '' } ${ this.settings.globals['large rows'] ? 'css-maxi-row' : '' }">
                    ${ content }
                </tbody>
            `,
            size
        ];
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

    setSettings (settings) {
        if (this.settings && settings && this.settings.code == settings.code) {
            // Do nothing if settings did not change
        } else {
            this.settings = settings;
            this.schanged = true;

            // Clear sorting when settings have changed
            this.clearSorting();
        }
    }

    getSettings () {
        return this.settings ? this.settings : new Settings('', this.type);
    }

    getSettingsCode () {
        return this.settings ? this.settings.code : '';
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
            this.table = new TableInstance(new Settings(this.settings.code, this.type), this.type);
            this.ignore = false;
        }

        // Fill entries
        if (this.echanged || this.schanged) {
            this.table.setEntries(... this.entries);
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
        let [ content, width ] = this.table.getTableContent();

        // Setup table element
        this.$table.empty();
        this.$table.append(content);
        this.$table.css('position', 'absolute').css('width', `${ width }px`).css('left', `max(0px, calc(50vw - 9px - ${ width / 2 }px))`);

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
    Cell: function (c, b, f, bo, al, pad, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="color: ${ getCSSColorFromBackground(f) }; background: ${ b }; ${ al ? `text-align: ${ al };` : '' } ${ pad ? `padding-left: ${ pad } !important;` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Wide cell
    WideCell: function (c, b, w, al, pad, style) {
        return `<td colspan="${ w }" style="background: ${ b }; ${ al ? `text-align: ${ al };` : '' } ${ pad ? `padding-left: ${ pad } !important;` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    Plain: function (c, bo, al, bg, style) {
        return `<td class="${ bo ? 'border-right-thin' : '' }" style="${ al ? `text-align: ${ al };` : '' } ${ bg ? `background: ${ bg };` : '' } ${ style || '' }">${ c }</td>`;
    },
    // Plain cell
    PlainSpan: function (s, c, bo, al, bg, style) {
        return `<td colspan="${ s }" class="${ bo ? 'border-right-thin' : '' }" style="${ al ? `text-align: ${ al };` : '' } ${ bg ? `background: ${ bg };` : '' } ${ style || '' }">${ c }</td>`;
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

class SettingsCommand {
    constructor (regexp, parse, format, parseAlways = false) {
        this.regexp = regexp;
        this.match = string => string.match(this.regexp);
        this.parse = parse;
        this.format = format;
        this.parseAlways = parseAlways;
    }

    isValid (string) {
        return this.regexp.test(string);
    }
};

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

const ARG_LAYOUT = {
    'table': 1,
    'statistics': 2,
    'details': 3,
    'members': 4
}

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

class RuleEvaluator {
    constructor () {
        this.rules = [];
    }

    addRule (condition, referenceValue, value) {
        this.rules.push([ condition, referenceValue, value ]);
    }

    get (value, ignoreBase = false) {
        for (let [ condition, referenceValue, output] of this.rules) {
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
    // if / endif
    new SettingsCommand(/^(?:(if|if not) (Group|Player|Players)|(endif|else))$/, function (root, string) {
        var [ , key1, arg, key2 ] = this.match(string);
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
            }[arg], key1 != 'if');
        }
    }, function (root, string) {
        var [ , key1, arg, key2 ] = this.match(string);
        if (key2) {
            return SFormat.Macro(key2);
        } else {
            return SFormat.Macro(`${ key1 } ${ arg }`);
        }
    }),
    // Include another template
    new SettingsCommand(/^import (.+)$/, function (root, string) {
        var [ , arg ] = this.match(string);
        /*
            Do nothing since this keyword is handled before the actual parsing process
        */
    }, function (root, string) {
        var [ , arg ] = this.match(string);
        if (Templates.exists(arg)) {
            return `${ SFormat.Keyword('import') } ${ SFormat.Enum(arg) } ${ SFormat.Extras(`(${ Templates.get()[arg].content.length }c)`) }`;
        } else {
            return `${ SFormat.Keyword('import') } ${ SFormat.Error(arg) }`;
        }
    }),
    // Global
    // set static
    new SettingsCommand(/^(layout) ((table|statistics|members|details)\s*(\,\s*(table|statistics|members|details))*)$/, function (root, string) {
        var [ , key, order ] = this.match(string);
        root.addGlobal('layout', order.split(',').map(o => ARG_LAYOUT[o.trim()]));
    }, function (root, string) {
        var [ , key, order ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ order.split(',').map(o => SFormat.Constant(o)).join(',') }`;
    }),
    // Global
    // set static
    new SettingsCommand(/^(set) (\w+[\w ]*) with all as (.+)$/, function (root, string) {
        var [ , key, name, asts ] = this.match(string);
        var ast = new Expression(asts, root);
        if (ast.isValid()) {
            root.addVariable(name, ast, true);
        }
    }, function (root, string) {
        var [ , key, name, asts ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('with all as') } ${ Expression.format(asts, root) }`;
    }, true),
    // Global
    // set with - Create a function
    new SettingsCommand(/^(set) (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addFunction(name, ast, args.split(',').map(arg => arg.trim()));
        }
    }, function (root, string) {
        var [ , key, name, args, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Function(name) } ${ SFormat.Keyword('with') } ${ args.split(',').map(arg => SFormat.Constant(arg)).join(',') } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }, true),
    // Global
    // set - Create a variable
    new SettingsCommand(/^(set) (\w+[\w ]*) as (.+)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addVariable(name, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }, true),
    // Global
    // server - show, hide or set width
    new SettingsCommand(/^(server) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);
        if (val != undefined) {
            if (isNaN(val)) {
                val = ARG_MAP_SERVER[value];
            }
            if (!isNaN(val)) {
                root.addGlobal(key, Number(val));
            }
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);
        if (val != undefined && !isNaN(value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        } else if (ARG_MAP_SERVER[val] != undefined) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else if (!isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        }
    }),
    // Global
    // name - set width of the name column
    new SettingsCommand(/^(name) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.addGlobal(key, Number(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (root.constants.isValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Create new category
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(category)(?: (.+))?$/, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        root.addCategory(a || '', a == undefined);
        if (extend) {
            root.addExtension(... extend.slice(0, -1).split(','));
        }
    }, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        if (a != undefined) {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) }`;
        }
    }),
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(header)(?: (.+))? (as group of) (\d+)$/, function (root, string) {
        var [ , extend, key, a, gr, w ] = this.match(string);

        if (!isNaN(w) && Number(w) > 0) {
            root.addHeader(a || '', Number(w));
            if (extend) {
                root.addExtension(... extend.slice(0, -1).split(','));
            }
        }
    }, function (root, string) {
        var [ , extend, key, a, gr, w ] = this.match(string);
        if (a != undefined) {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) } ${ SFormat.Keyword(gr) } ${ SFormat.Constant(w) }`;
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Keyword(gr) } ${ SFormat.Constant(w) }`;
        }
    }),
    // Create new header
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(header)(?: (.+))?$/, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        root.addHeader(a || '');
        if (extend) {
            root.addExtension(... extend.slice(0, -1).split(','));
        }
    }, function (root, string) {
        var [ , extend, key, a ] = this.match(string);
        if (a != undefined) {
            if (SP_KEYWORD_MAPPING_0.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Reserved(a) }`;
            } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedProtected(a) }`;
            } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedPrivate(a) }`;
            } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedSpecial(a) }`;
            } else if (SP_KEYWORD_MAPPING_5_HO.hasOwnProperty(a)) {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.ReservedItemizable(a) }`;
            } else {
                return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
            }
        } else {
            return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) }`;
        }
    }),
    // Create new statistics row
    new SettingsCommand(/^((?:\w+)(?:\,\w+)*:|)(show) (\S+[\S ]*) as (\S+[\S ]*)$/, function (root, string) {
        var [ , extend, key, name, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addRow(name, ast);
            if (extend) {
                root.addExtension(... extend.slice(0, -1).split(','));
            }
        }
    }, function (root, string) {
        var [ , extend, key, name, a ] = this.match(string);
        return `${ extend ? `${ SFormat.Constant(extend) }` : '' }${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }),
    // Global
    // indexed - Show indexes in first column of the table
    new SettingsCommand(/^(indexed) (on|off|static)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addGlobal(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a, a == 'static' ? 'on' : a) }`;
    }),
    // Global
    // lined - Show lines between players
    new SettingsCommand(/^(lined) (on|off|thin|thick)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addGlobal(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a, a == 'thick' || a == 'thin' ? 'on' : a) }`;
    }),
    // Global
    // performance - Set the amount of entries displayed
    new SettingsCommand(/^(performance) (\d+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addGlobal(key, Number(a));
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Global
    // scale - Set font scale value
    new SettingsCommand(/^(scale) (\d+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        if (!isNaN(a) && Number(a) > 0) {
            root.addGlobal(key, Number(a));
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ !isNaN(a) && Number(a) > 0 ? SFormat.Normal(a) : SFormat.Error(a) }`;
    }),
    // Global
    // font - Set font size
    new SettingsCommand(/^(font) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var f = getCSSFont(a);
        if (f) {
            root.addGlobal(key, f);
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ getCSSFont(a) ? SFormat.Normal(a) : SFormat.Error(a) }`;
    }),
    // Global
    // members - Show member classes and changes
    // outdated - Mark outdated entries with red text
    new SettingsCommand(/^(members|outdated|opaque|large rows) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addGlobal(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    // Local Shared
    // difference - Show difference between two points in time
    // hydra - Show hydra achievement
    // flip - Treat lower value as better
    // brackets - Show difference within brackets
    // statistics - Show statistics of a column
    // maximum - Show maximum knights based on fortress level
    // grail - Show grail achievement
    new SettingsCommand(/^(difference|hydra|flip|brackets|statistics|maximum|grail|decimal) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addShared(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    new SettingsCommand(/^(clean)$/, function (root, string) {
        var [ , key ] = this.match(string);
        root.addLocal(key, true);
    }, function (root, string) {
        var [ , key ] = this.match(string);
        return `${ SFormat.Keyword(key) }`;
    }),
    new SettingsCommand(/^(clean) (hard)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addLocal(key, 2);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Create new statistics row
    new SettingsCommand(/^(statistics) (\S+[\S ]*) as (\S+[\S ]*)$/, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addStatistics(name, ast);
        }
    }, function (root, string) {
        var [ , key, name, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Keyword('as') } ${ Expression.format(a, root) }`;
    }),
    // Local Shared
    // width - Width of a column
    new SettingsCommand(/^(width) ((@?)(\S+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined && !isNaN(val)) {
            root.addShared('width', Number(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (root.constants.isValid(prefix, value) && !isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || isNaN(val)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Global
    // simulator - Amount of simulator fights per duo
    new SettingsCommand(/^(simulator target|simulator source) (\S+)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);

        root.addGlobal('simulator_target', arg);
        if (key == 'simulator source') {
            root.addGlobal('simulator_target_source', true);
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);

        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
    }),
    // Global
    // simulator - Amount of simulator fights per duo
    new SettingsCommand(/^(simulator) (\d+)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);

        if (!isNaN(arg) && arg > 0) {
            root.addGlobal(key, Number(arg));
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);

        if (!isNaN(arg) && arg > 0) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        }
    }),
    // Local
    // extra - Ending characters for each cell (example %)
    new SettingsCommand(/^(extra) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addFormatExtraExpression(p => a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    new SettingsCommand(/^(const) (\w+) (.+)$/, function (root, string) {
        var [ , key, name, value ] = this.match(string);
        root.addConstant(name, value);
    }, function (root, string) {
        var [ , key, name, value ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(name) } ${ SFormat.Normal(value) }`;
    }, true),
    // Local
    // visible - Show text on the background
    new SettingsCommand(/^(visible) (on|off)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addShared(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(a) }`;
    }),
    new SettingsCommand(/^(style) ([a-zA-Z\-]+) (.*)$/, function (root, string) {
        var [ , key, a, b ] = this.match(string);
        root.addStyle(a, b);
    }, function (root, string) {
        var [ , key, a, b ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) } ${ SFormat.Normal(b) }`;
    }),
    new SettingsCommand(/^(not defined value) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.addShared('ndef', val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    new SettingsCommand(/^(not defined color) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.addShared('ndefc', getCSSBackground(val));
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local Shared
    // border - Show border around columns
    new SettingsCommand(/^(border) (none|left|right|both)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addShared(key, ARG_MAP[a]);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Local Shared
    // align - Align column content
    new SettingsCommand(/^(align) (left|right|center)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addShared(key, a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(a) }`;
    }),
    // Local
    // format - Specifies formatter for the field
    new SettingsCommand(/^(format difference|fd) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on') {
            root.addLocal('format_diff', true);
        } else if (arg == 'off') {
            root.addLocal('format_diff', false);
        } else {
            var ast = new Expression(arg, root);
            if (ast.isValid()) {
                root.addLocal('format_diff', (env, val) => {
                    return ast.eval(undefined, undefined, env, val);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on' || arg == 'off') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    new SettingsCommand(/^(format statistics|fs) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on') {
            root.addLocal('format_stat', true);
        } else if (arg == 'off') {
            root.addLocal('format_stat', false);
        } else {
            var ast = new Expression(arg, root);
            if (ast.isValid()) {
                root.addLocal('format_stat', (env, val) => {
                    return ast.eval(undefined, undefined, env, val);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (arg == 'on' || arg == 'off') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    new SettingsCommand(/^(statistics color) (on|off)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        root.addShared('statistics_color', ARG_MAP[arg]);
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Bool(arg) }`;
    }),
    // Local
    // format - Specifies formatter for the field
    new SettingsCommand(/^(format|f) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            root.addFormatExpression(ARG_FORMATTERS[arg]);
        } else {
            var ast = new Expression(arg, root);
            if (ast.isValid()) {
                root.addFormatExpression((player, reference, env, val, extra) => {
                    return ast.eval(player, reference, env, val, extra);
                });
            }
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        if (ARG_FORMATTERS[arg]) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
        }
    }),
    // Local
    // order by
    new SettingsCommand(/^(order by) (.*)$/, function (root, string) {
        var [ , key, arg ] = this.match(string);
        var ast = new Expression(arg, root);
        if (ast.isValid()) {
            root.addLocal('order', (player, reference, env, val, extra) => {
                return ast.eval(player, reference, env, val, extra);
            });
        }
    }, function (root, string) {
        var [ , key, arg ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(arg, root) }`;
    }),
    // Local
    // alias - Override name of the column
    new SettingsCommand(/^(alias) ((@?)(.*))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.addAlias(val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // expr - Set expression to the column
    new SettingsCommand(/^(expr|e) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addLocal('expr', (player, reference, env, scope, extra) => {
                return ast.eval(player, reference, env, scope, extra);
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(a, root) }`;
    }),
    new SettingsCommand(/^discard (.*)$/, function (root, string) {
        let [ , a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addDiscardRule((player, reference, env, scope, extra) => {
                return ast.eval(player, reference, env, scope, extra);
            });
        }
    }, function (root, string) {
        let [ , a ] = this.match(string);
        return `${ SFormat.Keyword('discard') } ${ Expression.format(a, root) }`;
    }),
    // Local
    // expc - Set color expression to the column
    new SettingsCommand(/^(expc|c) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        var ast = new Expression(a, root);
        if (ast.isValid()) {
            root.addColorExpression((player, reference, env, val, extra) => {
                return ast.eval(player, reference, env, val, extra);
            });
        }
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ Expression.format(a, root) }`;
    }),
    // Local
    // value - Add default value
    new SettingsCommand(/^(value) (default) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = root.constants.getValue(prefix, value);

        if (val != undefined) {
            root.addValueRule(ARG_MAP[condition], 0, val);
        }
    }, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(prefix, value)) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@') {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Normal(arg) }`;
        }
    }),
    // Local
    // color - Add default color
    new SettingsCommand(/^(color) (default) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.addColorRule(ARG_MAP[condition], 0, val);
        }
    }, function (root, string) {
        var [ , key, condition, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    new SettingsCommand(/^(background) ((@?)(\w+))$/, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (val != undefined && val) {
            root.addShared(key, val);
        }
    }, function (root, string) {
        var [ , key, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(prefix, value) && val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Constant(arg) }`;
        } else if (prefix == '@' || !val) {
            return `${ SFormat.Keyword(key) } ${ SFormat.Error(arg) }`;
        } else {
            return `${ SFormat.Keyword(key) } ${ SFormat.Color(arg, val) }`;
        }
    }),
    // Local
    // value - Add value based on condition
    new SettingsCommand(/^(value) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\S+[\S ]*))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = root.constants.getValue(rprefix, rvalue);
        var val = root.constants.getValue(prefix, value);

        if (reference != undefined && val != undefined) {
            root.addValueRule(ARG_MAP[condition], reference, val);
        }
    }, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);

        if (root.constants.isValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (root.constants.isValid(prefix, value)) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@') {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Normal(arg);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    }),
    // local
    // color - Add color based on condition
    new SettingsCommand(/^(color) (equal or above|above or equal|below or equal|equal or below|equal|above|below) ((@?)(.+)) ((@?)(\w+))$/, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var reference = root.constants.getValue(rprefix, rvalue);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (reference != undefined && val != undefined) {
            root.addColorRule(ARG_MAP[condition], reference, val);
        }
    }, function (root, string) {
        var [ , key, condition, rarg, rprefix, rvalue, arg, prefix, value ] = this.match(string);
        var val = getCSSColor(root.constants.getValue(prefix, value));

        if (root.constants.isValid(rprefix, rvalue)) {
            rarg = SFormat.Constant(rarg);
        } else if (rprefix == '@') {
            rarg = SFormat.Error(rarg);
        } else {
            rarg = SFormat.Normal(rarg);
        }

        if (root.constants.isValid(prefix, value) && val) {
            arg = SFormat.Constant(arg);
        } else if (prefix == '@' || !val) {
            arg = SFormat.Error(arg);
        } else {
            arg = SFormat.Color(arg, val);
        }

        return `${ SFormat.Keyword(key) } ${ SFormat.Constant(condition) } ${ rarg } ${ arg }`;
    }),
    // padding
    new SettingsCommand(/^(padding) (.+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addLocal(key, a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Create new type
    new SettingsCommand(/^(define) (\w+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addDefinition(a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    }),
    // Extend
    new SettingsCommand(/^(extend) (\w+)$/, function (root, string) {
        var [ , key, a ] = this.match(string);
        root.addExtension(a);
    }, function (root, string) {
        var [ , key, a ] = this.match(string);
        return `${ SFormat.Keyword(key) } ${ SFormat.Normal(a) }`;
    })
];

const SP_ENUMS = {
    'GoldCurve': GOLD_CURVE,
    'MountSizes': PLAYER_MOUNT,
    'AchievementNames': ACHIEVEMENTS,
    'ItemTypes': ITEM_TYPES,
    'GroupRoles': GROUP_ROLES,
    'Classes': PLAYER_CLASS,
    'FortressBuildings': FORTRESS_BUILDINGS,
    'PlayerActions': PLAYER_ACTIONS,
    'PotionTypes': POTIONS,
    'GemTypes': GEMTYPES,
    'AttributeTypes': GEMATTRIBUTES,
    'RuneTypes': RUNETYPES,
    'UnderworldBuildings': UNDERWORLD_BUILDINGS,
    'ExperienceCurve': ExperienceRequired,
    'ExperienceTotal': ExperienceTotal
};

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
            'tiny': '15',
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

    getValue (tag, key) {
        return tag == '@' ? this.Values[key] : key;
    }

    isValid (tag, key) {
        return tag == '@' && this.Values.hasOwnProperty(key);
    }

    addConstant (key, value) {
        this.Values[key] = value;
    }

    hasConstant (key) {
        return this.Values.hasOwnProperty(key);
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
        this.globals = {
            layout: [ 1, 2, 3, 4 ]
        };

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

            // Merge value extra
            if (!obj.value.extra) {
                obj.value.extra = definition.value.extra;
            }

            // Merge value rules
            if (!obj.value.rules.rules.length) {
                obj.value.rules.rules = definition.value.rules.rules;
            }
        }
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

        // Merge value extra
        if (!obj.value.extra) {
            obj.value.extra = mapping.extra;
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
            merge(obj, this.shared);

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
                    merge(obj, this.sharedCategory);
                    merge(obj, this.shared);
                } else {
                    merge(obj, {
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
            expression: null,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined, ignoreBase = false) {
                // Get color from expression
                let expressionColor = this.expression ? this.expression(player, compare, settings, value, extra) : undefined;

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
            extra: null,
            format: null,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined) {
                // Get value from value block
                let output = this.rules.get(value);

                // Get value from format expression
                if (typeof output == 'undefined' && this.format) {
                    output = this.format(player, compare, settings, value, extra);
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
            }
        }
    }

    // Create new header
    addHeader (name, grouped = 0) {
        this.push();

        // Header
        this.header = {
            name: name,
            grouped: grouped,
            value: this.getValueBlock(),
            color: this.getColorBlock()
        };
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
                object.style = new Option().style;
            }

            object.style[name] = value;
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
        return this.globals.server;
    }

    getBackgroundStyle () {
        return getCSSColor(this.shared.background);
    }

    getOutdatedStyle () {
        return this.globals.outdated;
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
        for (let line of originalString.split('\n')) {
            if (/^import (.+)$/.test(line)) {
                let [, key ] = line.match(/^import (.+)$/);
                if (Templates.exists(key)) {
                    processedLines.push(... Templates.get()[key].content.split('\n'));
                }
            } else {
                processedLines.push(line);
            }
        }

        return processedLines;
    }

    // Evaluate constants
    evaluateConstants (players, sim, perf, tabletype) {
        this.evalRowIndexes(players, true);

        if (tabletype == TableType.Group) {
            if (SiteOptions.obfuscated) {
                this.lists.joined = players.joined.map((player, i) => `joined_${ i + 1 }`);
                this.lists.kicked = players.kicked.map((player, i) => `kicked_${ i + 1 }`);
            } else {
                this.lists.joined = players.joined;
                this.lists.kicked = players.kicked;
            }
        }

        // Add simulator output
        if (sim) {
            var array = players.slice(0, perf);
            var array1 = [];
            var array2 = [];

            var updated = false;
            for (var entry of array) {
                updated |= Database.preload(entry.player.Identifier, entry.player.Timestamp);
                updated |= Database.preload(entry.compare.Identifier, entry.compare.Timestamp);
            }

            if (updated) {
                Database.update();
            }

            if (players.reference != players.timestamp) {
                for (var player of array) {
                    array1.push({
                        player: Database.Players[player.player.Identifier][player.player.Timestamp].toSimulatorModel()
                    });

                    array2.push({
                        player: Database.Players[player.compare.Identifier][player.compare.Timestamp].toSimulatorModel()
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                var target2 = this.globals.simulator_target ? array2.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1 == null || target2 == null) {
                    target1 = target2 = null;
                } else {
                    target1 = target1.player;
                    target2 = target2.player;
                }

                new FightSimulator().simulate(array1, sim, target1, this.globals.simulator_target_source);
                new FightSimulator().simulate(array2, sim, target2, this.globals.simulator_target_source);
            } else {
                for (var player of array) {
                    array1.push({
                        player: Database.Players[player.player.Identifier][player.player.Timestamp].toSimulatorModel()
                    });
                }

                var target1 = this.globals.simulator_target ? array1.find(p => p.player.Identifier == this.globals.simulator_target) : null;
                if (target1) {
                    target1 = target1.player;
                } else {
                    target1 = null;
                }

                new FightSimulator().simulate(array1, sim, target1, this.globals.simulator_target_source);
            }

            var results = {};
            for (var result of array1) {
                results[result.player.Identifier] = result.score;
            }

            this.variables['Simulator'] = {
                value: results
            }

            if (players.reference != players.timestamp) {
                var cresults = { };

                for (var result of array2) {
                    cresults[result.player.Identifier] = result.score;
                }

                this.variablesReference['Simulator'] = {
                    value: cresults
                }
            } else {
                this.variablesReference['Simulator'] = {
                    value: results
                }
            }
        } else {
            delete this.variables['Simulator'];
            delete this.variablesReference['Simulator'];
        }

        var segmentedPlayers = players.map(p => {
            var ar = [ p.player, p.compare ];
            ar.segmented = true;

            return ar;
        });

        segmentedPlayers.segmented = true;

        var segmentedCompare = players.map(p => {
            var ar = [ p.compare, p.compare ];
            ar.segmented = true;

            return ar;
        });

        segmentedCompare.segmented = true;

        // Evaluate constants
        for (var [name, data] of Object.entries(this.variables)) {
            if (data.ast) {
                var scope = {};
                var scope2 = {};

                if (data.tableVariable) {
                    scope = segmentedPlayers;
                    scope2 = segmentedCompare;
                }

                if (!data.tableVariable) {
                    this.variablesReference[name] = {
                        ast: data.ast,
                        tableVariable: false
                    };
                } else if (tabletype == TableType.Group) {
                    data.value = data.ast.eval(players[0].player, undefined, this, scope);
                    if (isNaN(data.value) && typeof(data.value) != 'object') {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(players[0].compare, undefined, this, scope2);
                    if (isNaN(val) && typeof(val) != 'object') {
                        val = undefined;
                    }

                    this.variablesReference[name] = {
                        value: val,
                        ast: data.ast,
                        tableVariable: data.tableVariable
                    };
                } else {
                    data.value = data.ast.eval(undefined, undefined, this, scope);
                    if (isNaN(data.value) && typeof(data.value) != 'object') {
                        data.value = undefined;
                    }

                    var val = data.ast.eval(undefined, undefined, this, scope2);
                    if (isNaN(val) && typeof(val) != 'object') {
                        val = undefined;
                    }

                    this.variablesReference[name] = {
                        value: val,
                        ast: data.ast,
                        tableVariable: data.tableVariable
                    };
                }
            }
        }

        // Extra statistics rows
        if (tabletype == TableType.Group) {
            var param = players.find(p => p.player.Own) || players[0];
            for (var data of this.customRows) {
                if (data.ast) {
                    data.eval = {
                        value: data.ast.eval(param.player, undefined, this, segmentedPlayers),
                        compare: data.ast.eval(param.compare, undefined, this.getCompareEnvironment(), segmentedCompare)
                    };
                }
            }
        } else if (tabletype == TableType.Players) {
            for (var data of this.customRows) {
                if (data.ast) {
                    data.eval = {
                        value: data.ast.eval(null, null, this, segmentedPlayers),
                        compare: data.ast.eval(null, null, this.getCompareEnvironment(), segmentedCompare)
                    }
                }
            }
        }

        // Push constants into color / value options
        for (var category of this.categories) {
            for (var header of category.headers) {
                this.evaluateArrayConstants(header.value.rules);
                this.evaluateArrayConstants(header.color.rules);
            }
        }
    }

    evalRowIndexes (playerArray, embed = false) {
        for (let i = 0, player; i < playerArray.length; i++) {
            player = embed ? playerArray[i].player : playerArray[i];
            this.row_indexes[`${ player.Identifier }_${ player.Timestamp }`] = i;
        }
    }

    evaluateConstantsHistory (players) {
        this.evalRowIndexes(players);

        // Evaluate constants
        for (var [name, data] of Object.entries(this.variables)) {
            if (data.ast && data.tableVariable) {
                var scope = players.map((p, i) => {
                    var ar = [ p, players[i + 1] || p ];
                    ar.segmented = true;

                    return ar;
                });

                scope.segmented = true;

                data.value = data.ast.eval(undefined, undefined, this, scope);
                if (isNaN(data.value) && typeof(data.value) != 'object') {
                    data.value = undefined;
                }
            }
        }

        // Push constants into color / value options
        for (var category of this.categories) {
            for (var header of category.headers) {
                this.evaluateArrayConstants(header.value.rules);
                this.evaluateArrayConstants(header.color.rules);
            }
        }
    }

    evaluateArrayConstants (rules) {
        let array = rules.rules;
        for (var i = 0; array && i < array.length; i++) {
            var key = array[i][3];
            if (isNaN(key) && this.variables[key]) {
                if (this.variables[key].value != undefined) {
                    array[i][1] = Number(this.variables[key].value);
                } else {
                    array.splice(i--, 1);
                }
            }
        }
    }
};

// Settings manager
const SettingsManager = new (class {
    // Save settings
    save (settings, identifier) {
        Preferences.set(identifier ? `settings/${ identifier }` : 'settings', settings);
    }

    // Remove
    remove (identifier) {
        Preferences.remove(identifier ? `settings/${ identifier }` : 'settings');
    }

    // Exists
    exists (identifier) {
        return Preferences.exists(identifier ? `settings/${ identifier }` : 'settings');
    }

    // Keys
    get () {
        return Preferences.keys().filter(key => key.includes('settings/')).map(key => key.substring(key.indexOf('/') + 1));
    }

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

    // Create empty settings
    empty () {
        return new Settings('');
    }

    // Load settings
    load (identifier, def, template = '', type = undefined) {
        return new Settings(Preferences.get(`settings/${ identifier }`, Preferences.get(`settings/${ def }`, template)), type);
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

    get () {
        this.initialize();

        // Return templates
        return this.templates;
    }

    getKeys () {
        this.initialize();

        // Return keys
        return this.keys;
    }

    load (name) {
        this.initialize();

        // Return loaded settings
        return new Settings(name in this.templates ? this.templates[name].content : '');
    }
})();
