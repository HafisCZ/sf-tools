const TableType = {
    Player: 0,
    Group: 1,
    Browse: 2
}

const ScriptType = {
    Table: 0x1,
    Action: 0x2
}

const ARGUMENT_MAP_ON_OFF = {
    'off': 0,
    'on': 1
}

const ARGUMENT_MAP_BORDER = {
    'none': 0,
    'left': 1,
    'right': 2,
    'both': 3,
    'top': 4,
    'bottom': 5
}

const ARGUMENT_MAP_LINED = {
    'off': 0,
    'on': 1,
    'thick': 2,
    'thin': 1
}

const ARGUMENT_MAP_RULE = {
    'above or equal': 'ae',
    'below or equal': 'be',
    'equal or above': 'ae',
    'equal or below': 'be',
    'above': 'a',
    'below': 'b',
    'equal': 'e',
    'default': 'd'
};

const ARG_FORMATTERS = {
    'number': (p, x) => isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)),
    'fnumber': (p, x) => isNaN(x) ? undefined : formatAsSpacedNumber(x),
    'spaced_number': (p, x) => isNaN(x) ? undefined : formatAsSpacedNumber(x),
    'nnumber': (p, x) => isNaN(x) ? undefined : formatAsNamedNumber(x),
    'exponential_number': (p, x) => isNaN(x) ? undefined : x.toExponential(3),
    'date': (p, x) => isNaN(x) ? '' : _formatDate(x, true, false),
    'bool': (p, x) => x ? intl('general.yes') : intl('general.no'),
    'boolean': (p, x) => x ? intl('general.yes') : intl('general.no'),
    'datetime': (p, x) => isNaN(x) || x <= 0 ? '' : _formatDate(x),
    'time': (p, x) => isNaN(x) ? '' : _formatDate(x, false, true),
    'duration': (p, x) => isNaN(x) ? '' : _formatDurationLegacy(x),
    'default': (p, x) => typeof(x) == 'string' ? x : (isNaN(x) ? undefined : (Number.isInteger(x) ? x : x.toFixed(2)))
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

const FilterTypes = {
    'Guild': TableType.Group,
    'Player': TableType.Player,
    'Players': TableType.Browse
};

class Highlighter {
    static #text = '';

    static #escape (text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/ /g, "&nbsp;");
    }

    static keyword (text) {
        this.#text += `<span class="ta-keyword">${this.#escape(text)}</span>`;
        return this;
    }

    static deprecatedKeyword (text) {
        this.#text += `<span class="ta-keyword ta-deprecated">${this.#escape(text)}</span>`;
        return this;
    }

    static constant (text) {
        this.#text += `<span class="ta-constant">${this.#escape(text)}</span>`;
        return this;
    }

    static function (text) {
        this.#text += `<span class="ta-function">${this.#escape(text)}</span>`;
        return this;
    }

    static value (text) {
        this.#text += `<span class="ta-value">${this.#escape(text)}</span>`;
        return this;
    }

    static identifier (text) {
        this.#text += `<span class="ta-identifier">${this.#escape(text)}</span>`;
        return this;
    }

    static error (text) {
        this.#text += `<span class="ta-error">${this.#escape(text)}</span>`;
        return this;
    }

    static comment (text) {
        this.#text += `<span class="ta-comment">${this.#escape(text)}</span>`;
        return this;
    }

    static string (text) {
        this.#text += `<span class="ta-string">${this.#escape(text)}</span>`;
        return this;
    }

    static enum (text) {
        this.#text += `<span class="ta-enum">${this.#escape(text)}</span>`;
        return this;
    }
   
    static global (text, subtype = '') {
        this.#text += `<span class="ta-global${subtype}">${this.#escape(text)}</span>`;
        return this;
    }

    static header (text, subtype = 'public') {
        this.#text += `<span class="ta-reserved-${subtype}">${this.#escape(text)}</span>`;
        return this;
    }

    static asMacro () {
        this.#text = `<span class="ta-macro">${this.#text}</span>`;
        return this;
    }

    static expression (text, root, config) {
        ExpressionRenderer.render(this, text, root, config);
        return this;
    }

    static join (array, method, delimiter = ',') {
        for (let i = 0; i < array.length; i++) {
            if (typeof method === 'function') {
                this[method(array[i])](array[i]);
            } else {
                this[method](array[i]);
            }

            if (i < array.length - 1) {
                this.#text += delimiter;
            }
        }

        return this;
    }

    static color (text, color) {
        this.#text += `<span class="ta-color" style="color: ${color};">${this.#escape(text)}</span>`;
        return this;
    }

    static boolean (text, isTrue) {
        this.#text += `<span class="ta-${isTrue ? 'true' : 'false'}">${this.#escape(text)}</span>`;
        return this;
    }

    static normal (text) {
        this.#text += this.#escape(text);
        return this;
    }

    static space (size = 1) {
        this.#text += ' '.repeat(size);
        return this;
    }

    static get text () {
        const text = this.#text;
        this.#text = '';
        return text;
    }
};

class ScriptCommand {
    #internalParse;
    #internalFormat;
    #internalValidator = null;

    constructor (key, type, syntax, regexp, parse, format) {
        this.key = key;
        this.type = type;
        this.syntax = syntax.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        this.regexp = regexp;
        this.#internalParse = parse;
        this.#internalFormat = format;

        this.canParseAsConstant = false;
        this.canParse = true;
    }

    is (string) {
        return this.regexp.test(string);
    }

    parse (root, string) {
        return this.#internalParse(root, ... string.match(this.regexp).slice(1));
    }

    parseParams (string) {
        return string.match(this.regexp).slice(1);
    }

    format (root, string) {
        return this.#internalFormat(root, ... string.match(this.regexp).slice(1));
    }

    validate (validator, root, line, string) {
        this.#internalValidator?.(validator, line, root, ... string.match(this.regexp).slice(1))
    }

    parseAsConstant () {
        this.canParseAsConstant = true;
        return this;
    }

    parseNever () {
        this.canParse = false;
        return this;
    }

    withValidation (validator) {
        this.#internalValidator = validator;
    }
}

class ScriptCommands {
    static #keys = [];
    static #commands = [];

    static register (key, type, syntax, regexp, parse, format) {
        const command = new ScriptCommand(key, type, syntax, regexp, parse, format);

        this[key] = command;

        this.#keys.push(key);
        this.#commands.push(command);

        return command;
    }

    static find (predicate) {
        return this.#commands.find(predicate);
    }

    static keys () {
        return this.#keys;
    }

    static pick (text, keys) {
        return keys.map((key) => this[key]).find((command) => command && command.is(text));
    }
}

/*
    Command registrations
*/
ScriptCommands.register(
    'MACRO_IFNOT',
    ScriptType.Table,
    'if not <expression>',
    /^if not (.+)$/,
    null,
    (root, arg) => {
        const acc = Highlighter.keyword('if not ');

        if (arg in FilterTypes) {
            return acc.value(arg).asMacro();
        } else {
            return acc.expression(arg, root).asMacro()
        }
    }
).parseNever()

ScriptCommands.register(
    'MACRO_IF',
    ScriptType.Table,
    'if <expression>',
    /^if (.+)$/,
    null,
    (root, arg) => {
        const acc = Highlighter.keyword('if ');

        if (arg in FilterTypes) {
            return acc.value(arg).asMacro();
        } else {
            return acc.expression(arg, root).asMacro()
        }
    }
).parseNever()

ScriptCommands.register(
    'MACRO_ELSEIF',
    ScriptType.Table,
    'else if <expression>',
    /^else if (.+)$/,
    null,
    (root, arg) => {
        const acc = Highlighter.keyword('else if ');

        if (arg in FilterTypes) {
            return acc.value(arg).asMacro();
        } else {
            return acc.expression(arg, root).asMacro()
        }
    }
).parseNever()

ScriptCommands.register(
    'MACRO_ELSE',
    ScriptType.Table,
    'else',
    /^else$/,
    null,
    (root) => Highlighter.keyword('else').asMacro()
).parseNever()

ScriptCommands.register(
    'MACRO_LOOP',
    ScriptType.Table,
    'loop <params> for <expression>',
    /^loop (\w+(?:\s*\,\s*\w+)*) for (.+)$/,
    null,
    (root, name, array) => Highlighter.keyword('loop ').value(name).keyword(' for ').expression(array, root).asMacro()
).parseNever()

ScriptCommands.register(
    'MACRO_END',
    ScriptType.Table,
    'end',
    /^end$/,
    null,
    (root) => Highlighter.keyword('end').asMacro()
).parseNever()

ScriptCommands.register(
    'MACRO_FUNCTION',
    ScriptType.Table,
    'mset <name> with <params> as <expression>',
    /^mset (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/,
    (root, name, args, expression) => {
        const ast = Expression.create(expression, root);
        if (ast) {
            root.addFunction(name, ast, args.split(',').map(v => v.trim()));
        }
    },
    (root, name, args, expression) => Highlighter.keyword('mset ').function(name).keyword(' with ').join(args.split(','), 'value').keyword(' as ').expression(expression, root).asMacro()
).parseAsConstant().withValidation((validator, line) => {
    validator.deprecateCommand(line, 'MACRO_FUNCTION', 'TABLE_FUNCTION');
})

ScriptCommands.register(
    'MACRO_VARIABLE',
    ScriptType.Table,
    'mset <name> as <expression>',
    /^mset (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        const ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, false);
        }
    },
    (root, name, expression) => Highlighter.keyword('mset ').constant(name).keyword(' as ').expression(expression, root).asMacro()
).parseAsConstant().withValidation((validator, line) => {
    validator.deprecateCommand(line, 'MACRO_VARIABLE', 'TABLE_VARIABLE');
})

ScriptCommands.register(
    'MACRO_CONST',
    ScriptType.Table,
    'const <name> <value>',
    /^const (\w+) (.+)$/,
    (root, name, value) => root.addConstant(name, value),
    (root, name, value) => Highlighter.keyword('const ').constant(name).space(1).value(value)
).parseAsConstant()

ScriptCommands.register(
    'MACRO_CONSTEXPR',
    ScriptType.Table,
    'constexpr <name> <expression>',
    /^constexpr (\w+) (.+)$/,
    (root, name, expression) => {
        const ast = Expression.create(expression);
        if (ast) {
            root.addConstant(name, ast.eval(new ExpressionScope(root)));
        }
    },
    (root, name, expression) => Highlighter.keyword('constexpr ').constant(name).space().expression(expression, root)
).parseAsConstant()

ScriptCommands.register(
    'TABLE_SERVER',
    ScriptType.Table,
    'server <value>',
    /^server (\S+)$/,
    (root, value) => {
        if (value === 'on') {
            root.addGlobal('server', 100);
        } else if (value === 'off') {
            root.addGlobal('server', 0);
        } else {
            const val = root.constants.fetch(value);

            if (!isNaN(val)) {
                root.addGlobal('server', Number(val));
            }
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('server ');

        if (value === 'on') {
            return acc.boolean(value, true);
        } else if (value === 'off') {
            return acc.boolean(value, false);
        } else if (root.constants.has(value)) {
            const val = root.constants.get(value);

            if (isNaN(val)) {
                return acc.error(value);
            } else {
                return acc.constant(value);
            }
        } else if (isNaN(value)) {
            return acc.error(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_NAME',
    ScriptType.Table,
    'name <value>',
    /^name (\S+)$/,
    (root, value) => {
        const val = root.constants.fetch(value);

        if (!isNaN(val)) {
            root.addGlobal('name', Number(val));
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('name ');

        if (root.constants.has(value)) {
            const val = root.constants.get(value);

            if (isNaN(val)) {
                return acc.error(value);
            } else {
                return acc.constant(value);
            }
        } else if (isNaN(value)) {
            return acc.error(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_WIDTH_POLICY',
    ScriptType.Table,
    'width policy <value>',
    /^width policy (strict|relaxed)$/,
    (root, value) => root.addGlobal('width_policy', value),
    (root, value) => Highlighter.keyword('width policy').space(1).boolean(value, value === 'strict')
)

ScriptCommands.register(
    'TABLE_WIDTH',
    ScriptType.Table,
    'width <value>',
    /^width (\S+)$/,
    (root, value) => {
        const val = root.constants.fetch(value);

        if (!isNaN(val)) {
            root.addShared('width', Number(val));
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('width ');

        if (root.constants.has(value)) {
            const val = root.constants.get(value);

            if (isNaN(val)) {
                return acc.error(value);
            } else {
                return acc.constant(value);
            }
        } else if (isNaN(value)) {
            return acc.error(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_COLUMNS',
    ScriptType.Table,
    'columns <value>',
    /^columns (\w+[\w ]*(?:,\s*\w+[\w ]*)*)$/,
    (root, parts) => {
        const values = parts.split(',').map((p) => root.constants.fetch(p.trim())).map(v => isNaN(v) ? 0 : parseInt(v));
        if (values.length > 0) {
            root.addLocal('columns', values);
        }
    },
    (root, parts) => {
        return Highlighter.keyword('columns ').join(
            parts.split(','),
            (part) => {
                const value = part.trim();

                if (root.constants.has(value)) {
                    const val = root.constants.get(value);
        
                    if (isNaN(val)) {
                        return 'error';
                    } else {
                        return 'constant';
                    }
                } else if (isNaN(value)) {
                    return 'error';
                } else {
                    return 'value';
                }
            }
        )
    }
)

ScriptCommands.register(
    'TABLE_NOT_DEFINED_VALUE',
    ScriptType.Table,
    'not defined value <value>',
    /^not defined value (.+)$/,
    (root, value) => {
        const val = root.constants.fetch(value);

        if (!isNaN(val)) {
            root.addShared('ndef', val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('not defined value ');

        if (root.constants.has(value)) {
            return acc.constant(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_NOT_DEFINED_COLOR',
    ScriptType.Table,
    'not defined color <value>',
    /^not defined color (.+)$/,
    (root, value) => {
        const val = getCSSColor(root.constants.fetch(value));

        if (val != undefined && val) {
            root.addShared('ndefc', val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('not defined color ');
        const val = getCSSColor(root.constants.fetch(value));

        if (val) {
            if (root.constants.has(value)) {
                return acc.constant(value);
            } else {
                return acc.color(value, val);
            }
        } else {
            return acc.error(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_VALUE_DEFAULT',
    ScriptType.Table,
    'value default <value>',
    /^value default (\S+[\S ]*)$/,
    (root, value) => {
        const val = root.constants.fetch(value);

        if (val != undefined) {
            root.addValueRule('d', 0, val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('value ').constant('default ');

        if (root.constants.has(value)) {
            return acc.constant(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_VALUE_RULE',
    ScriptType.Table,
    'value <operator> <reference> <value>',
    /^value (equal or above|above or equal|below or equal|equal or below|equal|above|below) (.+) (\S+[\S ]*)$/,
    (root, rule, value, value2) => {
        const ref = root.constants.fetch(value);
        const val = root.constants.fetch(value2);

        if (val != undefined && ref != undefined) {
            root.addValueRule(ARGUMENT_MAP_RULE[rule], ref, val);
        }
    },
    (root, rule, value, value2) => {
        const acc = Highlighter.keyword('value ').constant(rule).space();

        if (root.constants.has(value)) {
            acc.constant(value);
        } else {
            acc.value(value);
        }

        acc.space();

        if (root.constants.has(value2)) {
            acc.constant(value2);
        } else {
            acc.value(value2);
        }

        return acc;
    }
)

ScriptCommands.register(
    'TABLE_COLOR_DEFAULT',
    ScriptType.Table,
    'color default <color>',
    /^color default (\S+[\S ]*)$/,
    (root, value) => {
        const val = getCSSColor(root.constants.fetch(value));

        if (val != undefined && val) {
            root.addColorRule('d', 0, val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('color ').constant('default ');
        const val = getCSSColor(root.constants.fetch(value));
        
        if (val) {
            if (root.constants.has(value)) {
                return acc.constant(value);
            } else {
                return acc.color(value, val);
            }
        } else {
            return acc.error(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_COLOR_RULE',
    ScriptType.Table,
    'color <operator> <reference> <color>',
    /^color (equal or above|above or equal|below or equal|equal or below|equal|above|below) (.+) (\S+[\S ]*)$/,
    (root, rule, value, value2) => {
        const ref = root.constants.fetch(value);
        const val = getCSSColor(root.constants.fetch(value2));

        if (val != undefined && ref != undefined && val) {
            root.addColorRule(ARGUMENT_MAP_RULE[rule], ref, val);
        }
    },
    (root, rule, value, value2) => {
        const acc = Highlighter.keyword('color ').constant(rule).space();
        const val = getCSSColor(root.constants.fetch(value2));

        if (root.constants.has(value)) {
            acc.constant(value);
        } else {
            acc.color(value, val);
        }

        acc.space();

        if (val) {
            if (root.constants.has(value2)) {
                acc.constant(value2);
            } else {
                acc.color(value2, val);
            }
        } else {
            acc.error(value2);
        }

        return acc;
    }
)

ScriptCommands.register(
    'TABLE_ALIAS',
    ScriptType.Table,
    'alias <value>',
    /^alias (.+)$/,
    (root, value) => {
        const val = root.constants.fetch(value);

        if (val != undefined) {
            root.addAlias(val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('alias ');
        
        if (root.constants.has(value)) {
            return acc.constant(value);
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_FORMAT_STATISTICS',
    ScriptType.Table,
    'format statistics <expression>',
    /^format statistics (.+)$/,
    (root, expression) => {
        if (expression == 'on') {
            root.addDisplayValue('formatStatistics', true);
        } else if (expression == 'off') {
            root.addDisplayValue('formatStatistics', false);
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDisplayValue('formatStatistics', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDisplayValue('formatStatistics', ast);
            }
        }
    },
    (root, expression) => {
        const acc = Highlighter.keyword('format statistics ');

        if (expression === 'on' || expression == 'off') {
            return acc.boolean(expression, expression === 'on');
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            return acc.constant(expression);
        } else {
            return acc.expression(expression, root);
        }
    }
)

ScriptCommands.register(
    'TABLE_FORMAT_DIFFERENCE',
    ScriptType.Table,
    'format difference <expression>',
    /^format difference (.+)$/,
    (root, expression) => {
        if (expression == 'on') {
            root.addDisplayValue('formatDifference', true);
        } else if (expression == 'off') {
            root.addDisplayValue('formatDifference', false);
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDisplayValue('formatDifference', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDisplayValue('formatDifference', ast);
            }
        }
    },
    (root, expression) => {
        const acc = Highlighter.keyword('format difference ');

        if (expression === 'on' || expression == 'off') {
            return acc.boolean(expression, expression === 'on');
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            return acc.constant(expression);
        } else {
            return acc.expression(expression, root);
        }
    }
)

ScriptCommands.register(
    'TABLE_BACKGROUND',
    ScriptType.Table,
    'background <color>',
    /^background (.+)$/,
    (root, value) => {
        const val = getCSSColor(root.constants.fetch(value));

        if (val != undefined && val) {
            root.addShared('background', val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('background ');
        const val = getCSSColor(root.constants.fetch(value));

        if (val) {
            if (root.constants.has(value)) {
                return acc.constant(value);
            } else {
                return acc.color(value, val);
            }
        } else {
            return acc.error(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_FORMAT',
    ScriptType.Table,
    'expf <expression>',
    /^expf (.+)$/,
    (root, expression) => {
        if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDisplayValue('format', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDisplayValue('format', ast);
            }
        }
    },
    (root, expression) => {
        const acc = Highlighter.keyword('expf').space();

        if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            return acc.constant(expression);
        } else {
            return acc.expression(expression, root);
        }
    }
)

ScriptCommands.register(
    'TABLE_FORMAT_LONG',
    ScriptType.Table,
    'format <expression>',
    /^format (.+)$/,
    (root, expression) => {
        if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDisplayValue('format', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDisplayValue('format', ast);
            }
        }
    },
    (root, expression) => {
        const acc = Highlighter.deprecatedKeyword('format').space();

        if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            return acc.constant(expression);
        } else {
            return acc.expression(expression, root);
        }
    }
).withValidation((validator, line) => {
    validator.deprecateCommand(line, 'TABLE_FORMAT_LONG', 'TABLE_FORMAT')
})

ScriptCommands.register(
    'TABLE_CATEGORY',
    ScriptType.Table,
    'category (name)',
    /^((?:\w+)(?:\,\w+)*:|)category(?: (.+))?$/,
    (root, extensions, name) => {
        root.addCategory(name || '', name == undefined);
        if (extensions) {
            root.addExtension(... extensions.slice(0, -1).split(','));
        }
    },
    (root, extensions, name) => {
        const acc = Highlighter.constant(extensions || '').keyword('category');

        if (name) {
            return acc.space().identifier(name);
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_HEADER_REPEAT',
    ScriptType.Table,
    'repeat <value>',
    /^repeat (\d+)$/,
    (root, count) => {
        if (count > 0) {
            root.addHeaderLocal('grouped', Number(count));
        }
    },
    (root, count) => Highlighter.keyword('repeat ').identifier(count)
)

ScriptCommands.register(
    'TABLE_GROUPED_HEADER',
    ScriptType.Table,
    'header (name) as group of <value>',
    /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))? as group of (\d+)$/,
    (root, extensions, name, length) => {
        if (length > 0) {
            root.addHeader(name || '');
            root.addHeaderLocal('grouped', Number(length))
            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        }
    },
    (root, extensions, name, length) => {
        const acc = Highlighter.constant(extensions || '').deprecatedKeyword('header');

        if (name != undefined) {
            acc.space();

            const data = TABLE_EXPRESSION_CONFIG.find(name, 'header');
            if (data && !data.data.disabled) {
                acc.header(name, data.meta);
            } else {
                acc.identifier(name);
            }
        }
        
        return acc.space(1).deprecatedKeyword('as group of').space(1).value(length);
    }
).withValidation((validator, line) => {
    validator.deprecateCommand(line, 'TABLE_GROUPED_HEADER', 'TABLE_HEADER_REPEAT')
})

ScriptCommands.register(
    'TABLE_HEADER',
    ScriptType.Table,
    'header (name)',
    /^((?:\w+)(?:\,\w+)*:|)header(?: (.+))?$/,
    (root, extensions, name) => {
        root.addHeader(name || '');
        if (extensions) {
            root.addExtension(... extensions.slice(0, -1).split(','));
        }
    },
    (root, extensions, name) => {
        const acc = Highlighter.constant(extensions || '').keyword('header');
        
        if (name != undefined) {
            acc.space();

            const data = TABLE_EXPRESSION_CONFIG.find(name, 'header');
            if (data && !data.data.disabled) {
                acc.header(name, data.meta);
            } else {
                acc.identifier(name);
            }
        }
        
        return acc;
    }
)

ScriptCommands.register(
    'TABLE_ROW_HEIGHT',
    ScriptType.Table,
    'row height <value>',
    /^row height (\d+)$/,
    (root, value) => {
        if (value > 0) {
            root.addGlobalEmbedable('row_height', Number(value));
        }
    },
    (root, value) => Highlighter.keyword('row height ')[value > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
    'TABLE_ROW',
    ScriptType.Table,
    'row (name)',
    /^((?:\w+)(?:\,\w+)*:|)row(?: (.+))?$/,
    (root, extensions, name) => {
        root.addRow(name || '');
        if (extensions) {
            root.addExtension(... extensions.slice(0, -1).split(','));
        }
    },
    (root, extensions, name) => {
        const acc = Highlighter.constant(extensions || '').keyword('row')
        
        if (name != undefined) {
            return acc.space().identifier(name);
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_ROW_COMPACT',
    ScriptType.Table,
    'show <name> as <expression>',
    /^((?:\w+)(?:\,\w+)*:|)show (\S+[\S ]*) as (\S+[\S ]*)$/,
    (root, extensions, name, expression) => {
        const ast = Expression.create(expression, root);
        if (ast) {
            root.addRow(name, ast);
            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        }
    },
    (root, extensions, name, expression) => Highlighter.constant(extensions || '').deprecatedKeyword('show').space(1).identifier(name).space(1).deprecatedKeyword('as').space(1).expression(expression, root)
).withValidation((validator, line) => {
    validator.deprecateCommand(line, 'TABLE_ROW_COMPACT', 'TABLE_ROW');
})
      
ScriptCommands.register(
    'TABLE_VAR',
    ScriptType.Table,
    'var <name> <value>',
    /^var (\w+) (.+)$/,
    (root, name, value) => root.addHeaderVariable(name, value),
    (root, name, value) => Highlighter.keyword('var ').constant(name).space().value(value)
)
    
ScriptCommands.register(
    'TABLE_EMBED_END',
    ScriptType.Table,
    'embed end',
    /^embed end$/,
    (root) => root.pushEmbed(),
    (root) => Highlighter.keyword('embed end')
)
      
ScriptCommands.register(
    'TABLE_EMBED',
    ScriptType.Table,
    'embed (name)',
    /^((?:\w+)(?:\,\w+)*:|)embed(?: (.+))?$/,
    (root, extensions, name) => {
        root.embedBlock(name || '');
        if (extensions) {
            root.addExtension(... extensions.slice(0, -1).split(','));
        }
    },
    (root, extensions, name) => {
        const acc = Highlighter.constant(extensions || '').keyword('embed');
        if (name) {
            return acc.space().identifier(name);
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_LAYOUT',
    ScriptType.Table,
    'layout <value>',
    /^layout ((\||\_|table|missing|statistics|rows|members)(\s+(\||\_|table|missing|statistics|rows|members))*)$/,
    (root, layout) => root.addLayout(layout.split(/\s+/).map(v => v.trim())),
    (root, layout) => Highlighter.keyword('layout ').constant(layout)
)

ScriptCommands.register(
    'TABLE_VARIABLE_GLOBAL_LONG',
    ScriptType.Table,
    'set <name> with all as <expression>',
    /^set (\w+[\w ]*) with all as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, true);
        }
    },
    (root, name, expression) => Highlighter.keyword('set ').global(name).keyword(' with all as ').expression(expression, root),
).parseAsConstant().withValidation((validator, line) => {
    validator.deprecateCommand(line, 'TABLE_VARIABLE_GLOBAL_LONG', 'TABLE_VARIABLE_GLOBAL');
})

ScriptCommands.register(
    'TABLE_FUNCTION',
    ScriptType.Table,
    'set <name> with <params> as <expression>',
    /^set (\w+[\w ]*) with (\w+[\w ]*(?:,\s*\w+[\w ]*)*) as (.+)$/,
    (root, name, args, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addFunction(name, ast, args.split(',').map(v => v.trim()));
        }
    },
    (root, name, args, expression) => Highlighter.keyword('set ').function(name).keyword(' with ').join(args.split(','), 'value').keyword(' as ').expression(expression, root)
).parseAsConstant()

ScriptCommands.register(
    'TABLE_VARIABLE_GLOBAL',
    ScriptType.Table,
    'set $<name> as <expression>',
    /^set \$(\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, true);
        }
    },
    (root, name, expression) => Highlighter.keyword('set ').global(`$${name}`).keyword(' as ').expression(expression, root)
).parseAsConstant()

ScriptCommands.register(
    'TABLE_VARIABLE_UNFILTERED',
    ScriptType.Table,
    'set $$<name> as <expression>',
    /^set \$\$(\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'unfiltered');
        }
    },
    (root, name, expression) => Highlighter.keyword('set ').global(`$$${name}`, '-unfiltered').keyword(' as ').expression(expression, root)
).parseAsConstant()

ScriptCommands.register(
    'TABLE_VARIABLE',
    ScriptType.Table,
    'set <name> as <expression>',
    /^set (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, false);
        }
    },
    (root, name, expression) => Highlighter.keyword('set ').constant(name).keyword(' as ').expression(expression, root)
).parseAsConstant()

ScriptCommands.register(
    'TABLE_GLOBAL_LINED',
    ScriptType.Table,
    'lined <value>',
    /^lined( (on|off|thin|thick))?$/,
    (root, params, value) => root.addGlobal('lined', params ? ARGUMENT_MAP_LINED[value] : 1),
    (root, params, value) => {
        const acc = Highlighter.keyword('lined');
        if (params) {
            return acc.space(1).boolean(value, value !== 'off')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_GLOBAL_THEME',
    ScriptType.Table,
    'theme <value>',
    /^theme (light|dark)$/,
    (root, value) => root.setTheme(value),
    (root, value) => Highlighter.keyword('theme ').boolean(value, true)
)

ScriptCommands.register(
    'TABLE_GLOBAL_THEME_CUSTOM',
    ScriptType.Table,
    'theme text:<value> background:<value>',
    /^theme text:(\S+) background:(\S+)$/,
    (root, textColor, backgroundColor) => {
        root.setTheme({
            text: getCSSColor(textColor),
            background: getCSSBackground(backgroundColor)
        });
    },
    (root, textColor, backgroundColor) => Highlighter.keyword('theme ').constant('text:').color(textColor, getCSSColor(textColor)).constant(' background:').color(backgroundColor, getCSSColor(backgroundColor))
)

ScriptCommands.register(
    'TABLE_GLOBAL_LIMIT',
    ScriptType.Table,
    'limit <value>',
    /^limit (\d+)$/,
    (root, value) => {
        if (value > 0) {
            root.addGlobal('limit', Number(value));
        }
    },
    (root, value) => Highlighter.keyword('limit ')[value > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
    'TABLE_GLOBAL_LIMIT',
    ScriptType.Table,
    'performance <value>',
    /^performance (\d+)$/,
    (root, value) => {
        if (value > 0) {
            root.addGlobal('limit', Number(value));
        }
    },
    (root, value) => Highlighter.deprecatedKeyword('performance').space(1)[value > 0 ? 'value' : 'error'](value)
).withValidation((validator, line) => {
    validator.deprecateCommand(line, 'TABLE_GLOBAL_PERFORMANCE', 'TABLE_GLOBAL_LIMIT');
})

ScriptCommands.register(
    'TABLE_GLOBAL_SCALE',
    ScriptType.Table,
    'scale <value>',
    /^scale (\d+)$/,
    (root, value) => {
        if (value > 0) {
            root.addGlobal('scale', Number(value));
        }
    },
    (root, value) => Highlighter.keyword('scale ')[value > 0 ? 'value' : 'error'](value)
)

ScriptCommands.register(
    'TABLE_FONT',
    ScriptType.Table,
    'font <value>',
    /^font (.+)$/,
    (root, font) => {
        let value = getCSSFont(font);
        if (value) {
            root.addGlobalEmbedable('font', value);
        }
    },
    (root, font) => Highlighter.keyword('font ')[getCSSFont(font) ? 'value' : 'error'](font)
)

ScriptCommands.register(
    'TABLE_SHARED_STATISTICS_COLOR',
    ScriptType.Table,
    'statistics color <value>',
    /^statistics color (on|off)$/,
    (root, value) => root.addShared('statistics_color', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('statistics color').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_BREAKLINE',
    ScriptType.Table,
    'breakline <value>',
    /^breakline (on|off)$/,
    (root, value) => root.addDisplayValue('breakline', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('breakline').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_VISIBLE',
    ScriptType.Table,
    'visible <value>',
    /^visible (on|off)$/,
    (root, value) => root.addShared('visible', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('visible').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_DECIMAL',
    ScriptType.Table,
    'decimal <value>',
    /^decimal (on|off)$/,
    (root, value) => root.addShared('decimal', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('decimal').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_GRAIL',
    ScriptType.Table,
    'grail <value>',
    /^grail (on|off)$/,
    (root, value) => root.addShared('grail', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('grail').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_MAXIMUM',
    ScriptType.Table,
    'maximum <value>',
    /^maximum (on|off)$/,
    (root, value) => root.addShared('maximum', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('maximum').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_STATISTICS',
    ScriptType.Table,
    'statistics <value>',
    /^statistics (on|off)$/,
    (root, value) => root.addShared('statistics', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('statistics').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_BRACKETS',
    ScriptType.Table,
    'brackets <value>',
    /^brackets (on|off)$/,
    (root, value) => root.addShared('brackets', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('brackets').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_FLIP',
    ScriptType.Table,
    'flip <value>',
    /^flip (on|off)$/,
    (root, value) => root.addShared('flip', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('flip').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_HYDRA',
    ScriptType.Table,
    'hydra <value>',
    /^hydra (on|off)$/,
    (root, value) => root.addShared('hydra', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('hydra').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_DIFFERENCE',
    ScriptType.Table,
    'difference <value>',
    /^difference (on|off)$/,
    (root, value) => root.addShared('difference', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('difference').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_CLEAN',
    ScriptType.Table,
    'clean',
    /^clean( hard)?$/,
    (root, params) => root.addLocal('clean', params ? 2 : 1),
    (root, params) => {
        const acc = Highlighter.keyword('clean');

        if (params) {
            return acc.space().constant('hard');
        } else {
            return acc
        }
    }
)

ScriptCommands.register(
    'TABLE_ACTION',
    ScriptType.Table,
    'action <value>',
    /^action (none|show)$/,
    (root, value) => root.addAction(value),
    (root, value) => Highlighter.keyword('action ').constant(value)
)

ScriptCommands.register(
    'TABLE_INDEXED',
    ScriptType.Table,
    'indexed <value>',
    /^indexed( (on|off|static))?$/,
    (root, params, value) => {
        if (value === 'static') {
            root.addGlobal('indexed', 2);
        } else {
            root.addGlobal('indexed', params ? ARGUMENT_MAP_ON_OFF[value] : 1)
        }
    },
    (root, params, value) => {
        const acc = Highlighter.keyword('indexed');

        if (params) {
            return acc.space().boolean(value, value != 'off');
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_INDEXED_CUSTOM',
    ScriptType.Table,
    'indexed custom header',
    /^indexed custom header$/,
    (root) => root.addGlobal('indexed_custom', true),
    (root) => Highlighter.keyword('indexed custom header')
)

ScriptCommands.register(
    'TABLE_GLOBAL_MEMBERS',
    ScriptType.Table,
    'members <value>',
    /^members( (on|off))?$/,
    (root, params, value) => root.addGlobal('members', params ? ARGUMENT_MAP_ON_OFF[value] : true),
    (root, params, value) => {
        const acc = Highlighter.keyword('members');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_GLOBAL_OUTDATED',
    ScriptType.Table,
    'outdated <value>',
    /^outdated( (on|off))?$/,
    (root, params, value) => root.addGlobal('outdated', params ? ARGUMENT_MAP_ON_OFF[value] : true),
    (root, params, value) => {
        const acc = Highlighter.keyword('outdated');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_GLOBAL_OPAQUE',
    ScriptType.Table,
    'opaque <value>',
    /^opaque( (on|off))?$/,
    (root, params, value) => root.addGlobal('opaque', params ? ARGUMENT_MAP_ON_OFF[value] : true),
    (root, params, value) => {
        const acc = Highlighter.keyword('opaque');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_GLOBAL_LARGE_ROWS',
    ScriptType.Table,
    'large rows <value>',
    /^large rows( (on|off))?$/,
    (root, params, value) => root.addGlobal('large_rows', params ? ARGUMENT_MAP_ON_OFF[value] : true),
    (root, params, value) => {
        const acc = Highlighter.keyword('large rows');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_GLOBAL_ALIGN_TITLE',
    ScriptType.Table,
    'align title <value>',
    /^align title( (on|off))?$/,
    (root, params, value) => root.addGlobal('align_title', params ? ARGUMENT_MAP_ON_OFF[value] : true),
    (root, params, value) => {
        const acc = Highlighter.keyword('align title');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    }
)

ScriptCommands.register(
    'TABLE_LEFT_CATEGORY',
    ScriptType.Table,
    'left category',
    /^((?:\w+)(?:\,\w+)*:|)left category$/,
    (root, extensions) => {
        root.addGlobal('custom_left', true);
        root.addCategory('', true);
        if (extensions) {
            root.addExtension(... extensions.slice(0, -1).split(','));
        }
    },
    (root, extensions) => Highlighter.constant(extensions || '').keyword('left category')
)

ScriptCommands.register(
    'TABLE_STATISTICS',
    ScriptType.Table,
    'statistics <name> as <expression>',
    /^statistics (\S+[\S ]*) as (\S+[\S ]*)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addStatistics(name, ast);
        }
    },
    (root, name, expression) => Highlighter.keyword('statistics ').constant(name).keyword(' as ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_EXTRA',
    ScriptType.Table,
    'extra <expression>',
    /^extra (.+)$/,
    (root, value) => root.addDisplayValue('extra', () => value),
    (root, value) => Highlighter.keyword('extra ').value(value)
)

ScriptCommands.register(
    'TABLE_DISPLAY_BEFORE',
    ScriptType.Table,
    'display before <expression>',
    /^display before (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDisplayValue('displayBefore', ast);
        }
    },
    (root, expression) => Highlighter.keyword('display before ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_DISPLAY_AFTER',
    ScriptType.Table,
    'display after <expression>',
    /^display after (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDisplayValue('displayAfter', ast);
        }
    },
    (root, expression) => Highlighter.keyword('display after ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_STYLE',
    ScriptType.Table,
    'style <name> <value>',
    /^style ([a-zA-Z\-]+) (.*)$/,
    (root, style, value) => root.addStyle(style, value),
    (root, style, value) => Highlighter.keyword('style ').constant(style).space().value(value)
)

ScriptCommands.register(
    'TABLE_BORDER',
    ScriptType.Table,
    'border <value>',
    /^border (none|left|right|both|top|bottom)$/,
    (root, value) => root.addShared('border', ARGUMENT_MAP_BORDER[value]),
    (root, value) => Highlighter.keyword('border ').constant(value)
)

ScriptCommands.register(
    'TABLE_ORDER',
    ScriptType.Table,
    'order by <expression>',
    /^order by (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addLocal('order', ast);
        }
    },
    (root, expression) => Highlighter.keyword('order by ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_GLOBAL_ORDER',
    ScriptType.Table,
    'glob order <value>',
    /^glob order (asc|des)$/,
    (root, value) => root.addGlobOrder(undefined, value == 'asc'),
    (root, value) => Highlighter.keyword('glob order ').constant(value)
)

ScriptCommands.register(
    'TABLE_GLOBAL_ORDER_INDEXED',
    ScriptType.Table,
    'glob order <value> <value>',
    /^glob order (asc|des) (\d+)$/,
    (root, value, index) => root.addGlobOrder(parseInt(index), value == 'asc'),
    (root, value, index) => Highlighter.keyword('glob order ').constant(value).constant(index)
)

ScriptCommands.register(
    'TABLE_EXPRESSION',
    ScriptType.Table,
    'expr <expression>',
    /^expr (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addLocal('expr', ast);
        }
    },
    (root, expression) => Highlighter.keyword('expr ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_ALIAS_EXPRESSION',
    ScriptType.Table,
    'expa <expression>',
    /^expa (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addAliasExpression((a, b) => ast.eval(new ExpressionScope(a)));
        }
    },
    (root, expression) => Highlighter.keyword('expa ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_ALIGN',
    ScriptType.Table,
    'align <value>',
    /^align (left|right|center)$/,
    (root, value) => root.addShared('align', value),
    (root, value) => Highlighter.keyword('align ').constant(value)
)

ScriptCommands.register(
    'TABLE_ALIGN_LONG',
    ScriptType.Table,
    'align <value> <value>',
    /^align (left|right|center) (left|right|center)$/,
    (root, value, value2) => {
        root.addShared('align', value);
        root.addShared('align_title', value2);
    },
    (root, value, value2) => Highlighter.keyword('align ').constant(value).space().constant(value2)
)

ScriptCommands.register(
    'TABLE_DISCARD',
    ScriptType.Table,
    'discard <expression>',
    /^discard (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDiscardRule(ast);
        }
    },
    (root, expression) => Highlighter.keyword('discard ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_ORDER_ALL',
    ScriptType.Table,
    'order all by <expression>',
    /^order all by (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDefaultOrder(ast);
        }
    },
    (root, expression) => Highlighter.keyword('order all by ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_COLOR_EXPRESSION',
    ScriptType.Table,
    'expc <expression>',
    /^expc (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addColorExpression(ast);
        }
    },
    (root, expression) => Highlighter.keyword('expc ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_TEXT',
    ScriptType.Table,
    'text <expression>',
    /^text (.+)$/,
    (root, value) => {
        if (value === 'auto') {
            root.addTextColorExpression(true);
        } else {
            const ast = Expression.create(value, root);
            if (ast) {
                root.addTextColorExpression(ast);
            }
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('text ');
        if (value === 'auto') {
            return acc.boolean(value, true);
        } else {
            return acc.expression(value, root);
        }
    }
)

ScriptCommands.register(
    'TABLE_PADDING',
    ScriptType.Table,
    'padding <value>',
    /^padding (.+)$/,
    (root, value) => root.addLocal('padding', value),
    (root, value) => Highlighter.keyword('padding ').value(value)
)

ScriptCommands.register(
    'TABLE_DEFINE',
    ScriptType.Table,
    'define <name>',
    /^define (\w+)$/,
    (root, name) => root.addDefinition(name),
    (root, name) => Highlighter.keyword('define ').identifier(name)
)

ScriptCommands.register(
    'TABLE_EXTEND',
    ScriptType.Table,
    'extend <value>',
    /^extend (\w+)$/,
    (root, name) => root.addExtension(name),
    (root, name) => Highlighter.keyword('extend ').constant(name)
)

ScriptCommands.register(
    'TABLE_PUSH',
    ScriptType.Table,
    'push',
    /^push$/,
    (root) => root.push(),
    (root) => Highlighter.keyword('push')
)

ScriptCommands.register(
    'ACTION_TAG',
    ScriptType.Action,
    'tag <scope> as <expression> if <expression>',
    /^tag (player|file) as (.+) if (.+)$/,
    (root, type, tag, expr) => {
        let ast1 = Expression.create(tag);
        let ast2 = Expression.create(expr);
        if (ast1 && ast2) {
            root.addActionEntry('tag', type, ast1, ast2);
        }
    },
    (root, type, tag, expr) => Highlighter.keyword('tag ').constant(type).keyword(' as ').expression(tag, undefined, Actions.EXPRESSION_CONFIG).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
    'ACTION_REMOVE_PLAYER',
    ScriptType.Action,
    'remove player if <expression>',
    /^remove player if (.+)$/,
    (root, expr) => {
        let ast1 = Expression.create(expr);
        if (ast1) {
            root.addActionEntry('remove', 'player', ast1);
        }
    },
    (root, expr) => Highlighter.keyword('remove ').constant('player').keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
    'ACTION_TRACK_MAPPED',
    ScriptType.Table | ScriptType.Action,
    'track <name> as <expression> when <expression>',
    /^(track (\w+(?:[ \w]*\w)?) as (.+) when (.+))$/,
    (root, str, name, arg1, arg2) => {
        let ast1 = Expression.create(arg1);
        let ast2 = Expression.create(arg2);
        if (ast1 && ast2) {
            root.addTracker(name, str, ast2, ast1);
        }
    },
    (root, str, name, arg1, arg2) => Highlighter.keyword('track ').constant(name).keyword(' as ').expression(arg1).keyword(' when ').expression(arg2)
)

ScriptCommands.register(
    'ACTION_TRACK',
    ScriptType.Table | ScriptType.Action,
    'track <name> when <expression>',
    /^(track (\w+(?:[ \w]*\w)?) when (.+))$/,
    (root, str, name, arg) => {
        let ast = Expression.create(arg);
        if (ast) {
            root.addTracker(name, str, ast);
        }
    },
    (root, str, name, arg) => Highlighter.keyword('track ').constant(name).keyword(' when ').expression(arg)
)

class ScriptValidator {
    #entries = new Set();

    deprecateCommand (line, deprecatedKey, deprecatedBy) {
        const name1 = ScriptCommands[deprecatedKey].syntax;
        const name2 = ScriptCommands[deprecatedBy].syntax;

        this.#entries.add(`<div class="ta-info ta-info-deprecated">${line}: ${intl('stats.scripts.info.deprecated', { name1, name2 })}</div>`);
    }

    string () {
        return Array.from(this.#entries).join('')
    }
}

class Script {
    constructor (string, scriptType, tableType) {
        this.code = string;
        this.scriptType = scriptType;
        this.tableType = tableType;

        this.env_id = randomSHA1();

        // Constants
        this.constants = new Constants();

        // Discard rules
        this.discardRules = [];

        // Variables and functions
        this.functions = Object.create(null);
        this.variables = Object.create(null);
        this.variablesReference = Object.create(null);

        this.trackers = {};
        this.row_indexes = {};

        // Table
        this.categories = [];
        this.customStatistics = [];
        this.customRows = [];

        // Other things
        this.customDefinitions = {};
        this.actions = [];

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
        this.embed = null;

        this.theme = 'light';

        // Parse settings
        for (const line of Script.handleMacros(string, tableType)) {
            const command = ScriptCommands.find((command) => command.canParse && (command.type & scriptType) && command.is(line));
  
            if (command) {
                command.parse(this, line);
            }
        }

        // Push last embed && category
        this.pushEmbed();
        this.pushCategory();

        if (this.tableType !== null) {
            this._prepareLeftCategory();            
        }
    }

    _prepareLeftCategory () {
        if (this.globals.custom_left) {
            // Can skip as category should already exist
        } else {
            const headers = [];
            if (this.tableType === TableType.Player) {
                const dateHeader = this.createHeader('Date');

                this.mergeMapping(dateHeader, {
                    expr: (p) => p.Timestamp,
                    format: (p, x) => _formatDate(x),
                    width: 200,
                    action: 'show'
                });

                headers.push(dateHeader);
            } else if (this.tableType === TableType.Group) {
                const nameHeader = this.createHeader('Name');

                this.mergeMapping(nameHeader, {
                    expr: (p) => p.Name,
                    width: this.getNameStyle(),
                    action: 'show'
                });

                headers.push(nameHeader);
            } else if (this.tableType === TableType.Browse) {
                const serverWidth = this.getServerStyle();
                if (serverWidth) {
                    const serverHeader = this.createHeader('Server');

                    this.mergeMapping(serverHeader, {
                        expr: (p) => p.Prefix,
                        width: serverWidth
                    });

                    headers.push(serverHeader);
                }

                const nameHeader = this.createHeader('Name');

                this.mergeMapping(nameHeader, {
                    expr: (p) => p.Name,
                    width: this.getNameStyle(),
                    action: 'show'
                });

                headers.push(nameHeader);
            }

            for (const header of headers) {
                this._injectLeftHeaderStyling(header);
            }

            this.categories.unshift({
                name: '',
                empty: true,
                headers
            });
        }

        if (this.globals.indexed && !(this.globals.custom_left && this.globals.indexed_custom)) {
            const indexHeader = this.createHeader('#');
            
            this.mergeMapping(indexHeader, {
                expr: (p) => 0,
                width: 50
            });

            this._injectLeftHeaderStyling(indexHeader);

            this.categories[0].headers.unshift(indexHeader);
        }
    }

    _injectLeftHeaderStyling (header) {
        header.visible = true;

        header.color.text = this.shared.text;
        header.color.background = this.shared.background;

        if (header.color.background) {
            header.color.rules.addRule('db', 0, header.color.background);
        }

        this.mergeTextColor(header, header);
    }

    static handleConditionals (lines, tableType, scope) {
        let output = [];

        let condition = false;
        let shouldDiscard = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (ScriptCommands.MACRO_IF.is(line)) {
                let rule = null;
                let ruleMustBeTrue = false;

                if (ScriptCommands.MACRO_IFNOT.is(line)) {
                    rule = ScriptCommands.MACRO_IFNOT;
                    ruleMustBeTrue = true;
                } else {
                    rule = ScriptCommands.MACRO_IF;
                }

                let cond = rule.parseParams(line)[0].trim();
                if (cond in FilterTypes) {
                    shouldDiscard = ruleMustBeTrue ? (FilterTypes[cond] == tableType) : (FilterTypes[cond] != tableType);
                    condition = true;
                } else {
                    let condExpression = Expression.create(cond);
                    if (condExpression) {
                        let result = condExpression.eval(scope);
                        shouldDiscard = ruleMustBeTrue ? result : !result;
                        condition = true;
                    }
                }
            } else if (ScriptCommands.MACRO_ELSEIF.is(line)) {
                if (condition) {
                    if (shouldDiscard) {
                        let cond = ScriptCommands.MACRO_ELSEIF.parseParams(line)[0].trim();
                        if (cond in FilterTypes) {
                            shouldDiscard = FilterTypes[cond] != tableType;
                        } else {
                            let condExpression = Expression.create(cond);
                            if (condExpression) {
                                let result = condExpression.eval(scope);
                                shouldDiscard = !result;
                            }
                        }
                    } else {
                        shouldDiscard = true;
                    }
                }
            } else if (ScriptCommands.MACRO_ELSE.is(line)) {
                if (condition) {
                    shouldDiscard = !shouldDiscard;
                }
            } else if (ScriptCommands.MACRO_LOOP.is(line)) {
                let endsRequired = 1;
                if (!shouldDiscard) {
                    output.push(line);
                }

                while (++i < lines.length) {
                    line = lines[i];

                    if (ScriptCommands.MACRO_IF.is(line) || ScriptCommands.MACRO_LOOP.is(line)) {
                        endsRequired++;
                        if (!shouldDiscard) {
                            output.push(line);
                        }
                    } else if (ScriptCommands.MACRO_END.is(line)) {
                        if (!shouldDiscard) {
                            output.push(line);
                        }

                        if (--endsRequired == 0) break;
                    } else if (!shouldDiscard) {
                        output.push(line);
                    }
                }
            } else if (ScriptCommands.MACRO_END.is(line)) {
                shouldDiscard = false;
                condition = false;
            } else if (!shouldDiscard) {
                output.push(line);
            }
        }

        return output;
    }

    static handleLoops (lines, scope) {
        let output = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (ScriptCommands.MACRO_LOOP.is(line)) {
                let [ names, values ] = ScriptCommands.MACRO_LOOP.parseParams(line);

                let variableNames = names.split(',').map(name => name.trim());
                let variableValues = [];

                let valuesExpression = Expression.create(values);
                if (valuesExpression) {
                    variableValues = valuesExpression.eval(scope);
                    if (!variableValues) {
                        variableValues = [];
                    } else if (!Array.isArray(variableValues)) {
                        if (typeof variableValues == 'object') {
                            variableValues = Object.values(variableValues);
                        } else {
                            variableValues = [ variableValues ];
                        }
                    }
                }

                let loop = [];

                let endsRequired = 1;
                while (++i < lines.length) {
                    line = lines[i];

                    if (ScriptCommands.MACRO_END.is(line)) {
                        if (--endsRequired == 0) break;
                    } else if (ScriptCommands.MACRO_IF.is(line) || ScriptCommands.MACRO_LOOP.is(line)) {
                        endsRequired++;
                    }

                    loop.push(line);
                }

                if (endsRequired != 0) {
                    output.push(... loop);
                } else {
                    for (let block of variableValues) {
                        if (!Array.isArray(block)) {
                            block = [ block ];
                        }

                        let varArray = variableNames.map((key, index) => `var ${ key } ${ block[index] }`);
                        let replacementArray = variableNames.map((key, index) => {
                            return {
                                regexp: new RegExp(`__${ key }__`, 'g'),
                                value: block[index]
                            }
                        });

                        for (let loopLine of loop) {
                            for (let { regexp, value } of replacementArray) {
                                loopLine = loopLine.replace(regexp, value)
                            }

                            output.push(loopLine);

                            if (/^(?:\w+(?:\,\w+)*:|)(?:header|embed|show|category)(?: .+)?$/.test(loopLine)) {
                                output.push(... varArray);
                            }
                        }
                    }
                }
            } else {
                output.push(line);
            }
        }

        return output;
    }

    static handleMacroVariables (lines, constants) {
        let settings = {
            theme: 'light',
            functions: { },
            variables: { },
            constants: constants
        };

        let is_unsafe = 0;
        for (let line of lines) {
            if (ScriptCommands.MACRO_IF.is(line) || ScriptCommands.MACRO_LOOP.is(line)) {
                is_unsafe++;
            } else if (ScriptCommands.MACRO_END.is(line)) {
                if (is_unsafe > 0) {
                    is_unsafe--;
                }
            } else if (is_unsafe == 0) {
                let command = null;
                if (command = ScriptCommands.pick(line, ['MACRO_FUNCTION', 'TABLE_FUNCTION'])) {
                    let [name, variables, expression] = command.parseParams(line);
                    let ast = Expression.create(expression);
                    if (ast) {
                        settings.functions[name] = {
                            ast: ast,
                            args: variables.split(',').map(v => v.trim())
                        };
                    }
                } else if (command = ScriptCommands.pick(line, ['MACRO_VARIABLE', 'TABLE_VARIABLE', 'TABLE_VARIABLE_GLOBAL', 'TABLE_VARIABLE_GLOBAL_LONG', 'TABLE_VARIABLE_UNFILTERED'])) {
                    let [name, expression] = command.parseParams(line);
                    let ast = Expression.create(expression);
                    if (ast) {
                        settings.variables[name] = {
                            ast: ast,
                            tableVariable: false
                        };
                    }
                } else if (ScriptCommands.TABLE_GLOBAL_THEME.is(line)) {
                    let [value] = ScriptCommands.TABLE_GLOBAL_THEME.parseParams(line);
                    settings.theme = value;
                } else if (ScriptCommands.MACRO_CONST.is(line)) {
                    let [name, value] = ScriptCommands.MACRO_CONST.parseParams(line);
                    settings.constants.add(name, value);
                } else if (ScriptCommands.MACRO_CONSTEXPR.is(line)) {
                    let [name, expression] = ScriptCommands.MACRO_CONSTEXPR.parseParams(line);

                    let ast = Expression.create(expression);
                    if (ast) {
                        settings.constants.add(name, ast.eval(new ExpressionScope(settings)));
                    }
                }
            }
        }

        return settings;
    }

    static handleMacros (string, tableType) {
        let lines = string.split('\n').map(line => Script.stripComments(line)[0].trim()).filter(line => line.length);

        // Scope for macros
        let scope = new ExpressionScope().add({
            table: tableType
        }).add(SiteOptions.options);

        // Special constants for macros
        let constants = new Constants();
        constants.add('guild', TableType.Group);
        constants.add('player', TableType.Player);
        constants.add('players', TableType.Browse);

        // Generate initial settings
        let settings = Script.handleMacroVariables(lines, constants);
        while (lines.some(line => ScriptCommands.MACRO_IF.is(line) || ScriptCommands.MACRO_LOOP.is(line))) {
            lines = Script.handleConditionals(lines, tableType, scope.environment(settings));
            settings = Script.handleMacroVariables(lines, constants);
            lines = Script.handleLoops(lines, scope.environment(settings));
            settings = Script.handleMacroVariables(lines, constants);
        }

        return lines;
    }

    // Merge definition to object
    mergeDefinition (obj, name) {
        let definition = this.customDefinitions[name];
        if (definition) {
            // Merge commons
            for (const key of Object.keys(definition)) {
                if (!obj.hasOwnProperty(key)) obj[key] = definition[key];
            }

            // Merge color expression
            if (!obj.color.expr) {
                obj.color.expr = definition.color.expr;
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
            if (!obj.value.formatDifference) {
                obj.value.formatDifference = definition.value.formatDifference;
            }

            // Merge statistics format expression
            if (!obj.value.formatStatistics) {
                obj.value.formatStatistics = definition.value.formatStatistics;
            }

            // Merge breakline
            if (typeof obj.value.breakline === 'undefined') {
                obj.value.breakline = definition.value.breakline;
            }

            // Merge value extra
            if (!obj.value.extra) {
                obj.value.extra = definition.value.extra;
            }

            if (!obj.value.displayBefore) {
                obj.value.displayBefore = definition.value.displayBefore;
            }

            if (!obj.value.displayAfter) {
                obj.value.displayAfter = definition.value.displayAfter;
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

    addActionEntry (action, type, ...args) {
        this.actions.push({
            action,
            type,
            args
        });
    }

    // Merge mapping to object
    mergeMapping (obj, mapping) {
        // Merge commons
        for (const key of Object.keys(mapping)) {
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
  
        if (!obj.value.displayBefore) {
            obj.value.displayBefore = mapping.displayBefore;
        }
  
        if (!obj.value.displayAfter) {
            obj.value.displayAfter = mapping.displayAfter;
        }

        this.mergeStyles(obj, mapping.style);
        this.mergeVariables(obj, mapping.vars);
    }

    mergeTextColor (obj, mapping) {
        if (obj.color && typeof obj.color.text === 'undefined') {
            obj.color.text = mapping.text;
            obj.color.background = mapping.ndefc;
        }
    }

    merge (obj, mapping) {
        // Merge all non-objects
        for (const key of Object.keys(mapping)) {
            if (!obj.hasOwnProperty(key) && typeof mapping[key] != 'object') obj[key] = mapping[key];
        }

        this.mergeStyles(obj, mapping.style);
        this.mergeVariables(obj, mapping.vars);
        this.mergeTextColor(obj, mapping);
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
                for (const name of Object.keys(sourceVars)) {
                    if (!obj.vars.hasOwnProperty(name)) {
                        obj.vars[name] = sourceVars[name];
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
            for (const definitionName of obj.extensions || []) {
                this.mergeDefinition(obj, definitionName);
            }

            // Merge shared
            this.merge(obj, this.shared);

            if (obj.background) {
                obj.color.rules.addRule('db', 0, obj.background);
            }

            this.mergeTextColor(obj, obj);

            // Push
            if (obj.expr) {
                this.customRows.push(obj);
            }

            this.row = null;
        }

        // Push header
        obj = this.header;
        if (obj && (this.embed || this.category)) {
            const name = obj.name;

            // Get mapping if exists
            const config = TABLE_EXPRESSION_CONFIG.find(name, 'header');
            const mapping = config && !config.data.disabled ? config.data : undefined;

            // Merge definitions
            for (const definitionName of obj.extensions || []) {
                this.mergeDefinition(obj, definitionName);
            }

            // Add decorators
            if (mapping && mapping.decorators && obj.clean != 2) {
                for (const entry of mapping.decorators) {
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

            this.mergeTextColor(obj, obj);

            // Push header if possible
            if (obj.expr) {
                if (!obj.clean) {
                    if (this.category) {
                        this.merge(obj, this.sharedCategory);
                    }

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
                (this.embed || this.category).headers.push(obj);
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
            this.merge(obj, this.sharedCategory);

            this.categories.push(obj);
            this.category = null;
        }
    }

    // Create color block
    getColorBlock () {
        return {
            expr: undefined,
            text: undefined,
            background: undefined,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined, ignoreBase = false, header = undefined, alternateSelf = undefined) {
                // Get color from expression
                const expressionColor = this.expr ? this.expr.eval(new ExpressionScope(settings).with(player, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)) : undefined;
                // Get color from color block
                const blockColor = this.rules.get(value, ignoreBase || (typeof expressionColor !== 'undefined'));

                // Final background color
                const backgroundColor = (typeof blockColor === 'undefined' ? getCSSBackground(expressionColor) : blockColor) || '';

                // Get color for text
                let textColor = undefined;
                if (this.text === true) {
                    textColor = _invertColor(_parseColor(backgroundColor) || _parseColor(this.background), true);
                } else if (this.text) {
                    textColor = getCSSColor(this.text.eval(new ExpressionScope(settings).with(player, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)));
                }

                // Return color or empty string
                return {
                    bg: backgroundColor,
                    fg: textColor
                };
            }
        }
    }

    // Create value block
    getValueBlock () {
        return {
            extra: undefined,
            displayBefore: undefined,
            displayAfter: undefined,
            format: undefined,
            breakline: undefined,
            formatDifference: undefined,
            formatStatistics: undefined,
            rules: new RuleEvaluator(),
            get: function (player, compare, settings, value, extra = undefined, header = undefined, alternateSelf = undefined) {
                // Get value from value block
                let output = this.rules.get(value);

                // Get value from format expression
                if (typeof output == 'undefined') {
                    if (this.format instanceof Expression) {
                        output = this.format.eval(new ExpressionScope(settings).with(player, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header));
                    } else if (typeof this.format === 'function') {
                        output = this.format(player, value);
                    } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
                        output = ARG_FORMATTERS[this.format](player, value);
                    }
                }

                // Get value from value itself
                if (typeof output == 'undefined') {
                    output = value;
                }

                // Add extras
                if (typeof output != 'undefined' && (this.extra || this.displayBefore || this.displayAfter)) {
                    const before = (
                        this.displayBefore ? (
                            this.displayBefore.eval(new ExpressionScope(settings).with(player, compare).addSelf(alternateSelf).add(extra).via(header))
                        ) : (
                            ''
                        )
                    );

                    const after = (
                        this.displayAfter ? (
                            this.displayAfter.eval(new ExpressionScope(settings).with(player, compare).addSelf(alternateSelf).add(extra).via(header))
                        ) : (
                            this.extra ? this.extra(player) : ''
                        )
                    );

                    output = `${ before }${ output }${ after }`;
                }

                if (typeof output == 'undefined') {
                    output = '';
                }

                // Replace spaces with unbreakable ones
                if (typeof this.breakline !== 'undefined' && !this.breakline) {
                    output = output.replace(/\ /g, '&nbsp;')
                }

                // Return value
                return output;
            },
            getDifference: function (player, compare, settings, value, extra = undefined) {
                let nativeDifference = Number.isInteger(value) ? value : value.toFixed(2);

                if (this.formatDifference === true) {
                    if (this.format instanceof Expression) {
                        return this.format.eval(new ExpressionScope(settings).with(player, compare).addSelf(value).add(extra));
                    } else if (typeof this.format === 'function') {
                        return this.format(player, value);
                    } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
                        return ARG_FORMATTERS[this.format](player, value);
                    } else {
                        return nativeDifference;
                    }
                } else if (this.formatDifference instanceof Expression) {
                    return this.formatDifference.eval(new ExpressionScope(settings).with(player, compare).addSelf(value).add(extra));
                } else if (typeof this.formatDifference == 'function') {
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
                    return this.formatStatistics.eval(new ExpressionScope(settings).addSelf(value));
                } else if (this.format instanceof Expression) {
                    return this.format.eval(new ExpressionScope(settings).addSelf(value));
                } else if (typeof this.format == 'function') {
                    return this.format(undefined, value);
                } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
                    return ARG_FORMATTERS[this.format](undefined, value);
                } else {
                    return nativeFormat;
                }
            }
        }
    }

    createHeader (name) {
        return {
            name,
            value: this.getValueBlock(),
            color: this.getColorBlock()
        };
    }

    // Create new header
    addHeader (name) {
        this.push();
        this.header = this.createHeader(name);
    }

    addHeaderLocal (name, value) {
        let object = this.header;
        if (object) {
            object[name] = value;
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
    addRow (name, expression = null) {
        this.push();

        this.row = this.createHeader(name);
        if (expression) {
            this.row.expr = expression;
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
        let object = (this.definition || this.header || this.embed);
        if (object) {
            object.alias = name;
        }
    }

    // Add custom style
    addStyle (name, value) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            if (!object.style) {
                object.style = new CellStyle();
            }

            object.style.add(name, value);
        }
    }

    // Add color expression to the header
    addColorExpression (expression) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object.color.expr = expression;
        }
    }

    addTextColorExpression (expression) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            object.text = expression;
        }
    }

    addAliasExpression (expression) {
        let object = (this.row || this.definition || this.header || this.embed || this.category);
        if (object) {
            object['expa'] = expression;
        }
    }

    addGlobOrder (index, order) {
        let object = (this.header || this.embed);
        if (object) {
            object['glob_order'] = {
                ord: order,
                index: index
            }
        }
    }

    addDisplayValue (field, value) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object.value[field] = value
        }
    }

    // Add color rule to the header
    addColorRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object.color.rules.addRule(condition, referenceValue, value);
        }
    }

    // Add value rule to the header
    addValueRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header || this.embed);
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

    addGlobalEmbedable (name, value) {
        (this.embed || this.definition || this.globals)[name] = value;
    }

    // Add shared variable
    addShared (name, value) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            object[name] = value;
        }

        this.addLocal(`ex_${ name }`, value);
    }

    // Add extension
    addExtension (... names) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            if (!object.extensions) {
                object.extensions = [];
            }

            object.extensions.push(... names);
        }
    }

    // Add constant
    addConstant (name, value) {
        this.constants.add(name, value);
    }

    // Add local variable
    addLocal (name, value) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object[name] = value;
        }
    }

    // Add action
    addAction (value) {
        let object = (this.header || this.embed);
        if (object) {
            object['action'] = value;
        }
    }

    addHeaderVariable (name, value) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            if (!object.vars) {
                object.vars = {};
            }

            object.vars[name] = value;
        }
    }

    embedBlock (name) {
        this.push();

        this.embed = {
            name,
            embedded: true,
            headers: [],
            value: this.getValueBlock(),
            color: this.getColorBlock()
        }
    }

    pushEmbed () {
        let obj = this.embed;
        if (obj && this.category) {
            this.push();

            for (let definitionName of obj.extensions || []) {
                this.mergeDefinition(obj, definitionName);
            }

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

            if (this.category) {
                this.category.headers.push(obj);
                this.embed = null;
            }
        }
    }

    addLayout (layout) {
        this.globals.layout = layout;
    }

    // Add discard rule
    addDiscardRule (rule) {
        this.discardRules.push(rule);
    }

    addDefaultOrder (order) {
        this.globals.order_by = order;
    }

    // Get compare environment
    getCompareEnvironment () {
        return {
            theme: this.theme,
            functions: this.functions,
            variables: this.variablesReference,
            array: [],
            array_unfiltered: [],
            // Constants have to be propagated through the environment
            constants: this.constants,
            row_indexes: this.row_indexes,
            timestamp: this.reference,
            reference: this.reference,
            env_id: this.env_id
        }
    }

    getServerStyle () {
        return this.globals.server == undefined ? 100 : this.globals.server;
    }

    getTheme () {
        return this.theme;
    }

    setTheme (theme) {
        this.theme = theme;
    }

    getOutdatedStyle () {
        return this.globals.outdated;
    }

    getLayout (hasStatistics, hasRows, hasMembers) {
        if (typeof this.globals.layout != 'undefined') {
            return this.globals.layout;
        } else {
            if (this.tableType == TableType.Browse) {
                return [
                    ... (hasStatistics ? [ 'statistics', hasRows ? '|' : '_' ] : []),
                    ... (hasRows ? (hasStatistics ? [ 'rows', '_' ] : [ 'rows', '|', '_' ]) : []),
                    'table'
                ];
            } else if (this.tableType == TableType.Group) {
                return [
                    'table',
                    'missing',
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
        return this.globals.limit;
    }

    getOpaqueStyle () {
        return this.globals.opaque ? 'css-entry-opaque' : '';
    }

    getLinedStyle () {
        return this.globals.lined || 0;
    }

    getRowStyle () {
        return this.globals.large_rows ? 'css-maxi-row' : '';
    }

    getRowHeight () {
        return this.globals.row_height || 0;
    }

    getFontStyle () {
        return this.globals.font ? `font: ${ this.globals.font };` : '';
    }

    getTitleAlign () {
        return this.globals.align_title;
    }

    getNameStyle () {
        return Math.max(100, this.globals.name == undefined ? 250 : this.globals.name);
    }

    isStrictWidthPolicy () {
        return (this.globals.width_policy || 'relaxed') === 'strict';
    }

    evalRowIndexes (array) {
        for (let i = 0; i < array.length; i++) {
            const player = array[i].player;

            this.row_indexes[`${player.Identifier}_${player.Timestamp}`] = i;
        }
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

    createSegmentedArray (array, mapper) {
        let segmentedArray = array.map((entry, index, arr) => {
            let obj = mapper(entry, index, arr);
            obj.segmented = true;
            return obj;
        });

        segmentedArray.segmented = true;

        return segmentedArray;
    }

    evalBefore (array) {
        this.timestamp = array.timestamp;
        this.reference = array.reference;
    }

    evalPlayer (array, unfilteredArray) {
        // Evaluate row indexes
        this.evalRowIndexes(array);

        // Purify array
        array = [].concat(array);

        // Get shared scope
        let scope = this.createSegmentedArray(array, entry => [entry.player, entry.compare]);
        let unfilteredScope = this.createSegmentedArray(unfilteredArray, entry => [entry.compare, entry.compare]);

        this.array = array;
        this.array_unfiltered = unfilteredArray;

        // Iterate over all variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                tableVariable: variable.tableVariable
            }

            // Run only if it is a table variable
            if (variable.tableVariable) {
                // Get value
                let value = variable.ast.eval(new ExpressionScope(this).addSelf(variable.tableVariable == 'unfiltered' ? unfilteredScope : scope));

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
            let currentValue = row.expr.eval(new ExpressionScope(this).with(array[0]).addSelf(array));

            row.eval = {
                value: currentValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalBrowse (array, unfilteredArray) {
        // Evaluate row indexes
        this.evalRowIndexes(array);

        // Variables
        let compareEnvironment = this.getCompareEnvironment();
        let sameTimestamp = array.timestamp == array.reference;

        // Set lists
        this.list_classes = array.reduce((c, { player }) => {
            c[player.Class]++;
            return c;
        }, _arrayToDefaultHash(CONFIG.indexes(), 0));

        this.array = array;
        this.array_unfiltered = unfilteredArray;

        // Get segmented lists
        let arrayCurrent = this.createSegmentedArray(array, entry => [entry.player, entry.compare]);
        let arrayCompare = this.createSegmentedArray(array, entry => [entry.compare, entry.compare]);
        let unfilteredArrayCurrent = this.createSegmentedArray(unfilteredArray, entry => [entry.player, entry.compare]);
        let unfilteredArrayCompare = this.createSegmentedArray(unfilteredArray, entry => [entry.compare, entry.compare]);

        // Evaluate variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                tableVariable: variable.tableVariable
            }

            if (variable.tableVariable) {
                // Calculate values of table variable
                let currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.tableVariable == 'unfiltered' ? unfilteredArrayCurrent : arrayCurrent));
                let compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.tableVariable == 'unfiltered' ? unfilteredArrayCompare : arrayCompare));

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
            let currentValue = row.expr.eval(new ExpressionScope(this).addSelf(arrayCurrent));
            let compareValue = sameTimestamp ? currentValue : row.expr.eval(new ExpressionScope(compareEnvironment).addSelf(arrayCompare));

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalGuild (array, unfilteredArray) {
        // Evaluate row indexes
        this.evalRowIndexes(array);

        // Variables
        let compareEnvironment = this.getCompareEnvironment();
        let sameTimestamp = array.timestamp == array.reference;

        // Set lists
        this.list_classes = array.reduce((c, { player }) => {
            c[player.Class]++;
            return c;
        }, _arrayToDefaultHash(CONFIG.indexes(), 0));

        this.list_joined = SiteOptions.obfuscated ? array.joined.map((p, i) => `joined_${ i + 1 }`) : array.joined;
        this.list_kicked = SiteOptions.obfuscated ? array.kicked.map((p, i) => `kicked_${ i + 1 }`) : array.kicked;

        this.array = array;
        this.array_unfiltered = unfilteredArray;

        array = [].concat(array);
        unfilteredArray = [].concat(unfilteredArray);

        // Get segmented lists
        let arrayCurrent = this.createSegmentedArray(array, entry => [entry.player, entry.compare]);
        let arrayCompare = this.createSegmentedArray(array, entry => [entry.compare, entry.compare]);
        let unfilteredArrayCurrent = this.createSegmentedArray(unfilteredArray, entry => [entry.player, entry.compare]);
        let unfilteredArrayCompare = this.createSegmentedArray(unfilteredArray, entry => [entry.compare, entry.compare]);

        // Get own player
        let ownEntry = array.find(entry => entry.player.Own) || array[0];
        let ownPlayer = _dig(ownEntry, 'player');
        let ownCompare = _dig(ownEntry, 'compare');

        // Evaluate variables
        for (let [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                tableVariable: variable.tableVariable
            }

            if (variable.tableVariable) {
                // Calculate values of table variable
                let currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.tableVariable == 'unfiltered' ? unfilteredArrayCurrent : arrayCurrent));
                let compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.tableVariable == 'unfiltered' ? unfilteredArrayCompare : arrayCompare));

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
            let currentValue = row.expr.eval(new ExpressionScope(this).with(ownPlayer, ownCompare).addSelf(arrayCurrent));
            let compareValue = sameTimestamp ? currentValue : row.expr.eval(new ExpressionScope(compareEnvironment).with(ownCompare, ownCompare).addSelf(arrayCompare));

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        this.evalRules();
    }

    static checkEscapeTrail (line, index) {
        if (line[index - 1] != '\\') {
            return false;
        } else {
            let escape = true;
            for (let i = index - 2; i >= 0 && line[i] == '\\'; i--) {
                escape = !escape;
            }

            return escape;
        }
    }

    static stripComments (line, escape = true) {
        let comment;
        let commentIndex = -1;

        let ignored = false;
        for (var i = 0; i < line.length; i++) {
            if (line[i] == '\'' || line[i] == '\"' || line[i] == '\`') {
                if (line[i - 1] == '\\' || (ignored && line[i] != ignored)) continue;
                else {
                    ignored = ignored ? false : line[i];
                }
            } else if (!Script.checkEscapeTrail(line, i) && line[i] == '#' && !ignored) {
                commentIndex = i;
                break;
            }
        }

        if (commentIndex != -1) {
            comment = line.slice(commentIndex);
            line = line.slice(0, commentIndex);

            if (escape) {
                line = line.replaceAll(/\\(\\|#)/g, (_, capture) => {
                    commentIndex -= 1;
                    return capture;
                });
            }
        } else if (escape) {
            line = line.replaceAll(/\\(\\|#)/g, (_, capture) => capture);
        }

        return [ line, comment, commentIndex ];
    }

    static render (string, scriptType = ScriptType.Table) {
        const settings = new Script('', scriptType, null);
        const validator = new ScriptValidator();

        for (const line of Script.handleMacros(string)) {
            const trimmed = Script.stripComments(line)[0].trim();
            const command = ScriptCommands.find((command) => command.canParse && command.canParseAsConstant && (command.type & scriptType) && command.is(trimmed))

            if (command) {
                command.parse(settings, trimmed);
            }
        }

        let content = '';

        const lines = string.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            let [ commandLine, comment, commentIndex ] = Script.stripComments(line, false);
            let [ , prefix, trimmed, suffix ] = commandLine.match(/^(\s*)(\S(?:.*\S)?)?(\s*)$/);

            let currentLine = prefix.replace(/ /g, '&nbsp;');

            if (trimmed) {
                const command = ScriptCommands.find((command) => (command.type & scriptType) && command.is(trimmed));

                if (command) {
                    const lineHtml = command.format(settings, trimmed);
                    currentLine += (typeof lineHtml === 'function' ? lineHtml.text : lineHtml);

                    command.validate(validator, settings, i + 1, trimmed);
                } else {
                    currentLine += Highlighter.error(trimmed).text;
                }
            }

            currentLine += suffix.replace(/ /g, '&nbsp;');
            if (commentIndex != -1) {
                currentLine += Highlighter.comment(comment).text;
            }

            content += `<div class="ta-line">${currentLine || '&nbsp;'}</div>`;
        }

        return {
            html: `<div class="ta-block">${content}</div>`,
            info: validator.string()
        }
    }
};

// Script archive
class ScriptArchive {
    static dataExpiry = 86400000;

    static get data () {
        delete this.data;

        this.data = Store.shared.get('archive', []).filter(({ timestamp }) => timestamp > Date.now() - this.dataExpiry);
        this.#persist();

        return this.data;
    }

    static #persist () {
        Store.shared.set('archive', this.data);
    }

    static clear () {
        this.data = [];
        this.#persist();
    }

    static empty () {
        return this.data.length === 0;
    }

    static all () {
        return _sortDesc(this.data, ({ timestamp }) => timestamp);
    }

    static get (timestamp) {
        return this.data.find(({ timestamp: _timestamp }) => _timestamp == timestamp).content;
    }

    static find (type, name, version) {
        return this.data.find(({ type: _type, name: _name, version: _version }) => _type === type && _name === name && _version === version);
    }

    static has (type, name, version) {
        return this.data.findIndex(({ type: _type, name: _name, version: _version }) => _type === type && _name === name && _version === version) !== -1;
    }

    static add (type, name, version, content) {
        this.data.push({
            type,
            name,
            version,
            content,
            timestamp: Date.now(),
            temporary: Store.isTemporary()
        });

        this.#persist();
    }
}

// Settings manager
class ScriptManager {
    static LastChange = Date.now()

    static get scripts () {
        delete this.scripts

        return (this.scripts = Store.get('settings', {}));
    }

    static #persist () {
        Store.set('settings', this.scripts);

        this.LastChange = Date.now();
    }

    static save (name, content, parent) {
        let script = this.scripts[name];
        if (script) {
            ScriptArchive.add('overwrite_script', name, this.scripts[name].version, this.scripts[name].content);
            
            script.content = content;
            script.version = (isNaN(script.version) ? 1 : script.version) + 1;
            script.timestamp = Date.now();
            script.parent = parent;

            ScriptArchive.add('save_script', name, script.version, script.content);
        } else {
            ScriptArchive.add('create_script', name, 1, content);

            script = {
                name: name,
                content: content,
                parent: parent,
                version: 1,
                timestamp: Date.now()
            }
        }

        this.scripts[name] = script;

        this.#persist();

        return script.version;
    }

    static remove (name) {
        if (this.scripts[name]) {
            ScriptArchive.add('remove_script', name, this.scripts[name].version, this.scripts[name].content);

            delete this.scripts[name];
            this.#persist();
        }
    }

    static exists (name) {
        return name in this.scripts;
    }

    static all () {
        return this.scripts;
    }

    static list () {
        return Object.values(this.scripts);
    }

    static keys () {
        return Object.keys(this.scripts);
    }

    static getContent (name, fallback, template) {
        const script = this.scripts[name] || this.scripts[fallback];
        return script ? script.content : template;
    }

    static get (name, fallback) {
        return this.scripts[name] || this.scripts[fallback];
    }
}

// Templates
class TemplateManager {
    static get templates () {
        delete this.templates;

        return (this.templates = Store.shared.get('templates', {}));
    }

    static #persist () {
        Store.shared.set('templates', this.templates);
    }

    static toggleFavorite (name) {
        this.templates[name].favorite = !this.templates[name].favorite;
        this.#persist();
    }

    static setOnline (name, key, secret, version) {
        if (this.templates[name]) {
            this.templates[name].online = {
                timestamp: this.templates[name].timestamp,
                key,
                secret,
                version: isNaN(version) ? 1 : version
            };

            this.#persist();
        }
    }

    static setOffline (name) {
        if (this.templates[name]) {
            this.templates[name].online = false;

            this.#persist();
        }
    }

    static save (name, content) {
        let template = this.templates[name];
        if (template) {
            ScriptArchive.add('overwrite_template', name, template.version, template.content);

            // Overwrite needed parts
            template.content = content;
            template.version = (isNaN(template.version) ? 1 : template.version) + 1;
            template.timestamp = Date.now();

            ScriptArchive.add('save_template', name, template.version, template.content);
        } else {
            ScriptArchive.add('create_template', name, 1, content);

            // Create new object
            template = {
                name: name,
                content: content,
                version: 1,
                timestamp: Date.now(),
                online: false
            };
        }

        this.templates[name] = template;

        this.#persist();
    }

    static remove (name) {
        if (this.templates[name]) {
            ScriptArchive.add('remove_template', name, this.templates[name].version, this.templates[name].content);

            delete this.templates[name];
            this.#persist();
        }
    }

    static exists (name) {
        return name in this.templates;
    }

    static all () {
        return this.templates;
    }

    static list () {
        return Object.values(this.templates);
    }

    static sortedList () {
        return _sortDesc(_sortDesc(this.list(), (template) => template.timestamp), (template) => template.favorite ? 1 : -1);
    }

    static get (name) {
        return this.templates[name];
    }

    static getContent (name) {
        return this.templates[name] ? this.templates[name].content : '';
    }
}

class ScriptEditor {
    constructor (parent, scriptType, changeCallback) {
        this.parent = parent.get(0);
        
        this.changeCallback = changeCallback;
        this.scriptType = scriptType;

        this.area = this.parent.querySelector('textarea');
        this.wrapper = this.parent.querySelector('.ta-wrapper');
        this.mask = this.parent.querySelector('.ta-content');

        this.info = document.createElement('div');
        this.info.classList.add('ta-info-wrapper');
        this.info.style.display = 'none';

        this.wrapper.appendChild(this.info);

        const baseStyle = getComputedStyle(this.area);
        this.mask.style.top = baseStyle.paddingTop;
        this.mask.style.left = baseStyle.paddingLeft;
        this.mask.style.font = baseStyle.font;
        this.mask.style.fontFamily = baseStyle.fontFamily;
        this.mask.style.lineHeight = baseStyle.lineHeight;

        const maskClone = this.mask.cloneNode(true);

        this.area.addEventListener('input', (event) => {
            let value = event.currentTarget.value;
            if (this.pasted) {
                value = value.replace(/\t/g, ' ');

                const ob = this.area;

                const ob1 = ob.selectionStart;
                const ob2 = ob.selectionEnd;
                const ob3 = ob.selectionDirection;

                ob.value = value;

                ob.selectionStart = ob1;
                ob.selectionEnd = ob2;
                ob.selectionDirection = ob3;

                this.pasted = false;
            }

            const scrollTransform = getComputedStyle(this.mask).transform;

            this.mask.remove();
            this.mask = maskClone.cloneNode(true);

            const data = Script.render(value, this.scriptType);

            this.mask.innerHTML = data.html;
            this.mask.style.transform = scrollTransform;

            this.wrapper.insertAdjacentElement('beforeend', this.mask);

            // Display info if needed
            if (data.info) {
                this.info.innerHTML = data.info;
                this.info.style.display = 'block';
            } else {
                this.info.style.display = 'none';
            }

            if (typeof this.changeCallback === 'function') {
                this.changeCallback(value);
            }
        });

        this.area.dispatchEvent(new Event('input'));

        this.area.addEventListener('scroll', (event) => {
            const sy = event.currentTarget.scrollTop;
            const sx = event.currentTarget.scrollLeft;
            this.mask.style.transform = `translate(${ -sx }px, ${ -sy }px)`;
        });

        this.area.addEventListener('keydown', (event) => {
            if (event.key == 'Tab') {
                event.preventDefault();

                let a = this.area;
                let v = this.area.value;
                let s = a.selectionStart;
                let d = a.selectionEnd;

                if (s == d) {
                    this.area.value = v.substring(0, s) + '  ' + v.substring(s);
                    a.selectionStart = s + 2;
                    a.selectionEnd = d + 2;
                } else {
                    let o = 0, oo = 0, i;
                    for (i = d - 1; i > s; i--) {
                        if (v[i] == '\n') {
                            v = v.substring(0, i + 1) + '  ' + v.substring(i + 1);
                            oo++;
                        }
                    }

                    while (i >= 0) {
                        if (v[i] == '\n') {
                            v = v.substring(0, i + 1) + '  ' + v.substring(i + 1);
                            o++;
                            break;
                        } else {
                            i--;
                        }
                    }

                    this.area.value = v;
                    a.selectionStart = s + o * 2;
                    a.selectionEnd = d + (oo + o) * 2;
                }

                this.area.dispatchEvent(new Event('input'));
                this.area.dispatchEvent(new Event('scroll'));
            }
        });

        this.area.addEventListener('paste', () => {
            this.pasted = true;
        });

        this.area.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        this.area.addEventListener('dragenter', (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        this.area.addEventListener('drop', (event) => {
            const contentType = _dig(event, 'dataTransfer', 'files', 0, 'type')
            if (!contentType || contentType === 'text/plain') {
                event.preventDefault();
                event.stopPropagation();

                const reader = new FileReader();
                reader.readAsText(event.dataTransfer.files[0], 'UTF-8');
                reader.onload = (file) => {
                    this.content = file.target.result;
                }
            }
        });
    }

    focus () {
        this.area.focus();
    }

    get selection () {
        return {
            start: this.area.selectionStart,
            end: this.area.selectionEnd
        };
    }

    set selection ({ start, end }) {
        this.area.selectionStart = start;
        this.area.selectionEnd = end;
    }

    get content () {
        return this.area.value;
    }

    set content (text) {
        const previousText = this.area.value;
        const previousSelection = this.selection;

        this.area.value = text;
        this.area.dispatchEvent(new Event('input'));

        this.scrollTop();
        this.focus();

        this.selection = previousText === text ? previousSelection : { start: 0, end: 0 };
    }

    scrollTop () {
        this.area.scrollTo(0, 0);
        this.area.dispatchEvent(new Event('scroll'));
    }
}
