const TableType = {
    Player: 0,
    Players: 2,
    Group: 1,
    Groups: 3
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

class ScriptStyle {
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

    has (name) {
        return this.styles[name] !== 'undefined'
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

    empty () {
        return this.rules.length === 0;
    }
}

const FilterTypes = {
    'Guild': TableType.Group,
    'Guilds': TableType.Groups,
    'Player': TableType.Player,
    'Players': TableType.Players
};

class Highlighter {
    static #text = '';

    static #escape (text) {
        return _escape(String(text));
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

    static operator (text) {
        this.#text += `<span class="ta-operator">${this.#escape(text)}</span>`;
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

    static error (text, colorText = false) {
        this.#text += `<span class="${colorText ? 'ta-error-color' : 'ta-error'}">${this.#escape(text)}</span>`;
        return this;
    }

    static floatError (text) {
        this.#text += `<span class="ta-error-float" data-content="${this.#escape(text)}"></span>`;
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
   
    static variable (text, subtype = '') {
        this.#text += `<span class="ta-variable-${subtype}">${this.#escape(text)}</span>`;
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
    #internalEvaluate;
    #internalFormat;
    #internalValidator = null;

    constructor (key, type, syntax, regexp, evaluate, format, metadata = {}) {
        this.key = key;
        this.type = type;
        this.syntax = {
            text: syntax,
            encodedText: syntax.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
            fieldText: wrapFields(syntax, true)
        };
        this.regexp = regexp;
        this.#internalEvaluate = evaluate;
        this.#internalFormat = format;
        this.metadata = metadata;
    }

    is (string) {
        return this.regexp.test(string);
    }

    eval (root, string) {
        return this.#internalEvaluate(root, ... string.match(this.regexp).slice(1));
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

    withValidation (validator) {
        this.#internalValidator = validator;
    }
}

class ScriptCommands {
    static #keys = [];
    static #commands = [];

    static register (key, type, syntax, regexp, parse, format, metadata) {
        const command = new ScriptCommand(key, type, syntax, regexp, parse, format, metadata);

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

    static commands () {
        return this.#commands;
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
    },
    { evalNever: true }
)

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
    },
    { evalNever: true }
)

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
    },
    { evalNever: true }
)

ScriptCommands.register(
    'MACRO_ELSE',
    ScriptType.Table,
    'else',
    /^else$/,
    null,
    (root) => Highlighter.keyword('else').asMacro(),
    { evalNever: true }
)

ScriptCommands.register(
    'MACRO_LOOP',
    ScriptType.Table,
    'loop <params> for <expression>',
    /^loop (\w+(?:\s*\,\s*\w+)*) for (.+)$/,
    null,
    (root, name, array) => Highlighter.keyword('loop ').value(name).keyword(' for ').expression(array, root).asMacro(),
    { evalNever: true }
)

ScriptCommands.register(
    'MACRO_END',
    ScriptType.Table,
    'end',
    /^end$/,
    null,
    (root) => Highlighter.keyword('end').asMacro(),
    { evalNever: true }
)

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
    (root, name, args, expression) => Highlighter.deprecatedKeyword('mset').space().function(name).space().deprecatedKeyword('with').space().join(args.split(','), 'value').space().deprecatedKeyword('as').space().expression(expression, root).asMacro(),
    { evalNever: true, evalOnRender: true, isDeprecated: 'TABLE_FUNCTION' }
)

ScriptCommands.register(
    'MACRO_VARIABLE',
    ScriptType.Table,
    'mset <name> as <expression>',
    /^mset (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        const ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'global');
        }
    },
    (root, name, expression) => Highlighter.deprecatedKeyword('mset').space().constant(name).space().deprecatedKeyword('as').space().expression(expression, root).asMacro(),
    { evalOnRender: true, isDeprecated: 'VARIABLE_GLOBAL' }
)

ScriptCommands.register(
    'MACRO_CONST',
    ScriptType.Table,
    'const <name> <value>',
    /^const (\w+) (.+)$/,
    (root, name, value) => root.constants.add(name, value),
    (root, name, value) => Highlighter.keyword('const ').constant(name).space(1).value(value),
    { evalOnRender: true }
)

ScriptCommands.register(
    'MACRO_CONSTEXPR',
    ScriptType.Table,
    'constexpr <name> <expression>',
    /^constexpr (\w+) (.+)$/,
    (root, name, expression) => {
        const ast = Expression.create(expression);
        if (ast) {
            root.constants.add(name, ast.eval(new ExpressionScope(root)));
        }
    },
    (root, name, expression) => Highlighter.keyword('constexpr ').constant(name).space().expression(expression, root),
    { evalOnRender: true }
)

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
    'width policy <strict|relaxed>',
    /^width policy (strict|relaxed)$/,
    (root, value) => root.addGlobal('widthPolicy', value),
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
            root.addDirectValue('columns', values);
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

        root.addShared('formatUndefined', val);
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

        if (val) {
            root.addShared('colorUndefined', val);
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
            acc.value(value);
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
            root.addNameValue('nameOverride', val);
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
        if (expression === 'on' || expression === 'off') {
            root.addDirectValue('statisticsFormat', expression === 'on');
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDirectValue('statisticsFormat', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDirectValue('statisticsFormat', ast);
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
            root.addDirectValue('differenceFormat', true);
        } else if (expression == 'off') {
            root.addDirectValue('differenceFormat', false);
        } else if (ARG_FORMATTERS.hasOwnProperty(expression)) {
            root.addDirectValue('differenceFormat', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDirectValue('differenceFormat', ast);
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
            root.addShared('colorBackground', val);
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
            root.addDirectValue('format', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDirectValue('format', ast);
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
            root.addDirectValue('format', ARG_FORMATTERS[expression])
        } else {
            let ast = Expression.create(expression, root);
            if (ast) {
                root.addDirectValue('format', ast);
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
    },
    { isDeprecated: 'TABLE_FORMAT' }
)

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
    },
    { isDeprecated: 'TABLE_HEADER_REPEAT' }
)

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
            root.addGlobalEmbedable('rowHeight', Number(value));
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
            root.addRow(name);
            root.addDirectValue('expr', ast);

            if (extensions) {
                root.addExtension(... extensions.slice(0, -1).split(','));
            }
        }
    },
    (root, extensions, name, expression) => Highlighter.constant(extensions || '').deprecatedKeyword('show').space(1).identifier(name).space(1).deprecatedKeyword('as').space(1).expression(expression, root),
    { isDeprecated: 'TABLE_ROW' }
)
      
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
    (root, layout) => root.addGlobal('layout', layout.split(/\s+/).map(v => v.trim())),
    (root, layout) => Highlighter.keyword('layout ').constant(layout)
)

ScriptCommands.register(
    'VARIABLE_TABLE_LONG',
    ScriptType.Table,
    'set <name> with all as <expression>',
    /^set (\w+[\w ]*) with all as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'table');
        }
    },
    (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(name, 'table').space().deprecatedKeyword('with all as').space().expression(expression, root),
    { evalOnRender: true, isDeprecated: 'VARIABLE_TABLE' }
)

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
    (root, name, args, expression) => Highlighter.keyword('set ').function(name).keyword(' with ').join(args.split(','), 'value').keyword(' as ').expression(expression, root),
    { evalOnRender: true }
)

ScriptCommands.register(
    'VARIABLE_TABLE',
    ScriptType.Table,
    'table set <name> as <expression>',
    /^table set (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'table');
        }
    },
    (root, name, expression) => Highlighter.keyword('table set ').variable(`${name}`, 'table').keyword(' as ').expression(expression, root),
    { evalOnRender: true }
)

ScriptCommands.register(
    'VARIABLE_GLOBAL',
    ScriptType.Table,
    'global set <name> as <expression>',
    /^global set (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'global');
        }
    },
    (root, name, expression) => Highlighter.keyword('global set ').variable(`${name}`, 'global').keyword(' as ').expression(expression, root),
    { evalOnRender: true }
)

ScriptCommands.register(
    'VARIABLE_TABLE_SHORT',
    ScriptType.Table,
    'set $<name> as <expression>',
    /^set \$(\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'table');
        }
    },
    (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(`$${name}`, 'table').space().deprecatedKeyword('as').space().expression(expression, root),
    { evalOnRender: true, isDeprecated: 'VARIABLE_TABLE' }
)

ScriptCommands.register(
    'VARIABLE_GLOBAL_SHORT',
    ScriptType.Table,
    'set $$<name> as <expression>',
    /^set \$\$(\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'global');
        }
    },
    (root, name, expression) => Highlighter.deprecatedKeyword('set').space().variable(`$$${name}`, 'global').space().deprecatedKeyword('as').space().expression(expression, root),
    { evalOnRender: true, isDeprecated: 'VARIABLE_GLOBAL' }
)

ScriptCommands.register(
    'VARIABLE_LOCAL',
    ScriptType.Table,
    'set <name> as <expression>',
    /^set (\w+[\w ]*) as (.+)$/,
    (root, name, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addVariable(name, ast, 'local');
        }
    },
    (root, name, expression) => Highlighter.keyword('set ').variable(name, 'local').keyword(' as ').expression(expression, root),
    { evalOnRender: true }
)

ScriptCommands.register(
    'TABLE_GLOBAL_LINED',
    ScriptType.Table,
    'lined <on|off|thin|thick>',
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
    'theme <light|dark>',
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
    'TABLE_GLOBAL_PERFORMANCE',
    ScriptType.Table,
    'performance <value>',
    /^performance (\d+)$/,
    (root, value) => {
        if (value > 0) {
            root.addGlobal('limit', Number(value));
        }
    },
    (root, value) => Highlighter.deprecatedKeyword('performance').space(1)[value > 0 ? 'value' : 'error'](value),
    { isDeprecated: 'TABLE_GLOBAL_LIMIT' }
)

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
    'TABLE_BORDER_COLOR',
    ScriptType.Table,
    'border color <value>',
    /^border color (.+)$/,
    (root, value) => {
        const val = getCSSColor(root.constants.fetch(value));
        if (val != undefined && val) {
            root.addGlobal('borderColor', val);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('border color ');
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
    'TABLE_SHARED_STATISTICS_COLOR',
    ScriptType.Table,
    'statistics color <value>',
    /^statistics color (.+)$/,
    (root, value) => {
        if (value === 'on' || value === 'off') {
            root.addShared('statisticsColor', value === 'on');
        } else {
            const expression = Expression.create(value, root);
            if (expression) {
                root.addShared('statisticsColor', expression);
            }
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('statistics color').space();
        
        if (value === 'on' || value === 'off') {
            return acc.boolean(value, value === 'on');
        } else {
            return acc.expression(value, root);
        }
    }
)

ScriptCommands.register(
    'TABLE_SHARED_BREAKLINE',
    ScriptType.Table,
    'breakline <on|off>',
    /^breakline (on|off)$/,
    (root, value) => root.addStyle('white-space', value === 'on' ? 'normal' : 'nowrap'),
    (root, value) => Highlighter.deprecatedKeyword('breakline').space().boolean(value, value == 'on'),
    { isDeprecated: 'TABLE_STYLE' }
)

ScriptCommands.register(
    'TABLE_SHARED_VISIBLE',
    ScriptType.Table,
    'visible <on|off>',
    /^visible (on|off)$/,
    (root, value) => root.addShared('visible', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('visible').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_DECIMAL',
    ScriptType.Table,
    'decimal <on|off>',
    /^decimal (on|off)$/,
    (root, value) => root.addShared('decimal', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('decimal').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_GRAIL',
    ScriptType.Table,
    'grail <on|off>',
    /^grail (on|off)$/,
    (root, value) => root.addShared('grail', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('grail').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_MAXIMUM',
    ScriptType.Table,
    'maximum <on|off>',
    /^maximum (on|off)$/,
    (root, value) => root.addShared('maximum', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('maximum').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_STATISTICS',
    ScriptType.Table,
    'statistics <on|off>',
    /^statistics (on|off)$/,
    (root, value) => root.addShared('statistics', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('statistics').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_BRACKETS',
    ScriptType.Table,
    'brackets <on|off>',
    /^brackets (on|off)$/,
    (root, value) => root.addShared('differenceBrackets', value === 'on' ? '()' : false),
    (root, value) => Highlighter.deprecatedKeyword('brackets').space().boolean(value, value == 'on'),
    { isDeprecated: 'TABLE_SHARED_DIFFERENCE_BRACKETS' }
)

ScriptCommands.register(
    'TABLE_SHARED_DIFFERENCE_BRACKETS',
    ScriptType.Table,
    'difference brackets <on|off>',
    /^difference brackets (on|off|\S\S)$/,
    (root, value) => {
        if (value === 'on' || value === 'off') {
            root.addShared('differenceBrackets', value === 'on' ? '()' : false);
        } else {
            root.addShared('differenceBrackets', value);
        }
    },
    (root, value) => {
        const acc = Highlighter.keyword('difference brackets').space();
        
        if (value === 'on' || value === 'off') {
            return acc.boolean(value, value === 'on');
        } else {
            return acc.value(value);
        }
    }
)

ScriptCommands.register(
    'TABLE_SHARED_DIFFERENCE_POSITION',
    ScriptType.Table,
    'difference position <below>',
    /^difference position (below)$/,
    (root, value) => root.addShared('differencePosition', 'below'),
    (root, value) => Highlighter.keyword('difference position').space().value(value)
)

ScriptCommands.register(
    'TABLE_SHARED_FLIP',
    ScriptType.Table,
    'flip <on|off>',
    /^flip (on|off)$/,
    (root, value) => root.addShared('flip', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('flip').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_HYDRA',
    ScriptType.Table,
    'hydra <on|off>',
    /^hydra (on|off)$/,
    (root, value) => root.addShared('hydra', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('hydra').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_SHARED_DIFFERENCE',
    ScriptType.Table,
    'difference <on|off>',
    /^difference (on|off)$/,
    (root, value) => root.addShared('difference', ARGUMENT_MAP_ON_OFF[value]),
    (root, value) => Highlighter.keyword('difference').space().boolean(value, value == 'on')
)

ScriptCommands.register(
    'TABLE_CLEAN',
    ScriptType.Table,
    'clean (hard)',
    /^clean( hard)?$/,
    (root, params) => root.addDirectValue('clean', params ? 2 : 1),
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
    'action <none|show>',
    /^action (none|show)$/,
    (root, value) => root.addAction(value),
    (root, value) => Highlighter.keyword('action ').constant(value)
)

ScriptCommands.register(
    'TABLE_INDEXED',
    ScriptType.Table,
    'indexed (on|off|static)',
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
    (root) => root.addGlobal('customIndex', true),
    (root) => Highlighter.keyword('indexed custom header')
)

ScriptCommands.register(
    'TABLE_GLOBAL_MEMBERS',
    ScriptType.Table,
    'members (on|off)',
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
    'outdated (on|off)',
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
    'opaque (on|off)',
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
    'large rows (on|off)',
    /^large rows( (on|off))?$/,
    (root, params, value) => {
        if (params) {
            root.addGlobalEmbedable('rowHeight', value === 'on' ? 56.7 : 0);
        } else {
            root.addGlobalEmbedable('rowHeight', 56.7);
        }
    },
    (root, params, value) => {
        const acc = Highlighter.deprecatedKeyword('large rows');
        if (params) {
            return acc.space(1).boolean(value, value == 'on')
        } else {
            return acc;
        }
    },
    { isDeprecated: 'TABLE_ROW_HEIGHT' }
)

ScriptCommands.register(
    'TABLE_GLOBAL_ALIGN_TITLE',
    ScriptType.Table,
    'align title (on|off)',
    /^align title( (on|off))?$/,
    (root, params, value) => root.addGlobal('alignTitle', params ? ARGUMENT_MAP_ON_OFF[value] : true),
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
        root.addGlobal('customLeftCategory', true);
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
    'extra <value>',
    /^extra (.+)$/,
    (root, value) => root.addDirectValue('displayAfter', () => value),
    (root, value) => Highlighter.deprecatedKeyword('extra').space().value(value),
    { isDeprecated: 'TABLE_DISPLAY_AFTER' }
)

ScriptCommands.register(
    'TABLE_DISPLAY_BEFORE',
    ScriptType.Table,
    'display before <expression>',
    /^display before (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDirectValue('displayBefore', ast);
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
            root.addDirectValue('displayAfter', ast);
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
    'border <none|left|right|both>',
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
            root.addDirectValue('order', ast);
        }
    },
    (root, expression) => Highlighter.keyword('order by ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_GLOBAL_ORDER',
    ScriptType.Table,
    'glob order <asc|des>',
    /^glob order (asc|des)$/,
    (root, value) => root.addSuperDirectValue('orderDefault', { index: undefined, direction: value }),
    (root, value) => Highlighter.keyword('glob order ').constant(value)
)

ScriptCommands.register(
    'TABLE_GLOBAL_ORDER_INDEXED',
    ScriptType.Table,
    'glob order <asc|des> <value>',
    /^glob order (asc|des) (\d+)$/,
    (root, value, index) => root.addSuperDirectValue('orderDefault', { index: parseInt(index), direction: value }),
    (root, value, index) => Highlighter.keyword('glob order ').constant(value).space().constant(index)
)

ScriptCommands.register(
    'TABLE_EXPRESSION',
    ScriptType.Table,
    'expr <expression>',
    /^expr (.+)$/,
    (root, expression) => {
        let ast = Expression.create(expression, root);
        if (ast) {
            root.addDirectValue('expr', ast);
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
            root.addNameValue('nameExpression', (a, b) => ast.eval(new ExpressionScope(a)));
        }
    },
    (root, expression) => Highlighter.keyword('expa ').expression(expression, root)
)

ScriptCommands.register(
    'TABLE_ALIGN',
    ScriptType.Table,
    'align <left|right|center>',
    /^align (left|right|center)$/,
    (root, value) => root.addShared('align', value),
    (root, value) => Highlighter.keyword('align ').constant(value)
)

ScriptCommands.register(
    'TABLE_ALIGN_LONG',
    ScriptType.Table,
    'align <left|right|center> <left|right|center>',
    /^align (left|right|center) (left|right|center)$/,
    (root, value, value2) => {
        root.addShared('align', value);
        root.addShared('alignTitle', value2);
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
            root.addGlobal('orderAllBy', ast);
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
            root.addDirectValue('colorExpr', ast);
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
    (root, value) => root.addStyle('padding-left', value),
    (root, value) => Highlighter.deprecatedKeyword('padding').space().value(value),
    { isDeprecated: 'TABLE_STYLE' }
)

ScriptCommands.register(
    'TABLE_DEFINE',
    ScriptType.Table,
    'define <name>',
    /^define (\w+)$/,
    (root, name) => root.addDefinition(name),
    (root, name) => Highlighter.keyword('define').space().identifier(name)
)

ScriptCommands.register(
    'TABLE_EXTEND',
    ScriptType.Table,
    'extend <value>',
    /^extend (\w+)$/,
    (root, name) => root.addExtension(name),
    (root, name) => Highlighter.keyword('extend').space().constant(name)
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
    'ACTION_TAG_CONDITIONAL',
    ScriptType.Action,
    'tag <player|file> as <expression> if <expression>',
    /^tag (player|file) as (.+) if (.+)$/,
    (root, type, tag, expr) => {
        let ast1 = Expression.create(tag);
        let ast2 = Expression.create(expr);
        if (ast1 && ast2) {
            root.addActionEntry(`tag_${type}`, ast1, ast2);
        }
    },
    (root, type, tag, expr) => Highlighter.keyword('tag ').constant(type).keyword(' as ').expression(tag, undefined, Actions.EXPRESSION_CONFIG).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
    'ACTION_TAG',
    ScriptType.Action,
    'tag <player|group|file> as <expression>',
    /^tag (player|group|file) as (.+)$/,
    (root, type, tag) => {
        let ast1 = Expression.create(tag);
        if (ast1) {
            root.addActionEntry(`tag_${type}`, ast1);
        }
    },
    (root, type, tag) => Highlighter.keyword('tag ').constant(type).keyword(' as ').expression(tag, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
    'ACTION_REMOVE_PLAYER',
    ScriptType.Action,
    'remove player if <expression>',
    /^remove player if (.+)$/,
    (root, expr) => {
        let ast1 = Expression.create(expr);
        if (ast1) {
            root.addActionEntry('reject_player', ast1);
        }
    },
    (root, expr) => Highlighter.keyword('remove ').constant('player').keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG),
    { isDeprecated: 'ACTION_REJECT_IF' }
)

ScriptCommands.register(
    'ACTION_REJECT_IF',
    ScriptType.Action,
    'reject <player|group> if <expression>',
    /^reject (player|group) if (.+)$/,
    (root, target, expr) => {
        let ast1 = Expression.create(expr);
        if (ast1) {
            root.addActionEntry(`reject_${target}`, ast1);
        }
    },
    (root, target, expr) => Highlighter.keyword('reject ').constant(target).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
)

ScriptCommands.register(
    'ACTION_SELECT_IF',
    ScriptType.Action,
    'select <player|group> if <expression>',
    /^select (player|group) if (.+)$/,
    (root, target, expr) => {
        let ast1 = Expression.create(expr);
        if (ast1) {
            root.addActionEntry(`select_${target}`, ast1);
        }
    },
    (root, target, expr) => Highlighter.keyword('select ').constant(target).keyword(' if ').expression(expr, undefined, Actions.EXPRESSION_CONFIG)
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
        const name1 = ScriptCommands[deprecatedKey].syntax.encodedText;
        const name2 = ScriptCommands[deprecatedBy].syntax.encodedText;

        this.#entries.add(`<div class="ta-editor-info-line ta-editor-info-line-deprecated">${line}: ${intl('stats.scripts.info.deprecated', { name1, name2 })}</div>`);
    }

    string () {
        return Array.from(this.#entries).join('')
    }
}

class ScriptParser {
    static handleMacros (string, scriptScope) {
        let lines = string.split('\n').map((line) => this.stripComments(line)[0].trim()).filter(line => line.length);

        // Scope for macros
        const scope = new ExpressionScope().addSelf(scriptScope.entries).add({
            table: scriptScope.table
        }).add(SiteOptions.options);

        // Special constants for macros
        const constants = new Constants();
        constants.add('guild', TableType.Group);
        constants.add('guilds', TableType.Groups);
        constants.add('player', TableType.Player);
        constants.add('players', TableType.Players);

        // Generate initial settings
        let settings = this.handleMacroEnvironment(lines, scriptScope, constants);
        while (lines.some(line => ScriptCommands.MACRO_IF.is(line) || ScriptCommands.MACRO_LOOP.is(line))) {
            lines = this.handleConditionals(lines, scriptScope, scope.environment(settings));
            settings = this.handleMacroEnvironment(lines, scriptScope, constants);
            lines = this.handleLoops(lines, scope.environment(settings));
            settings = this.handleMacroEnvironment(lines, scriptScope, constants);
        }

        return lines;
    }

    static handleConditionals (lines, scriptScope, scope) {
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
                    shouldDiscard = ruleMustBeTrue ? (FilterTypes[cond] == scriptScope.table) : (FilterTypes[cond] != scriptScope.table);
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
                            shouldDiscard = FilterTypes[cond] != scriptScope.table;
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

    static handleMacroEnvironment (lines, scriptScope, constants) {
        let settings = {
            theme: 'light',
            functions: { },
            variables: { },
            constants,
            timestamp: scriptScope.timestamp,
            reference: scriptScope.reference
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
                } else if (command = ScriptCommands.pick(line, ['MACRO_VARIABLE', 'VARIABLE_LOCAL', 'VARIABLE_TABLE', 'VARIABLE_TABLE_SHORT', 'VARIABLE_TABLE_LONG', 'VARIABLE_GLOBAL', 'VARIABLE_GLOBAL_SHORT'])) {
                    let [name, expression] = command.parseParams(line);
                    let ast = Expression.create(expression);
                    if (ast) {
                        settings.variables[name] = {
                            ast: ast,
                            type: command.key === 'VARIABLE_LOCAL' ? 'local' : (
                                ['VARIABLE_TABLE', 'VARIABLE_TABLE_SHORT', 'VARIABLE_TABLE_LONG'].includes(command.key) ? 'table' : 'global'
                            )
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
            } else if (!this.checkEscapeTrail(line, i) && line[i] == '#' && !ignored) {
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
}

class ScriptRenderer {
    static render (string, scriptType = ScriptType.Table) {
        const settings = new Script('', scriptType);
        const validator = new ScriptValidator();

        for (const line of ScriptParser.handleMacros(string, {})) {
            const trimmed = ScriptParser.stripComments(line)[0].trim();
            const command = ScriptCommands.find((command) => !command.metadata.evalNever && command.metadata.evalOnRender && (command.type & scriptType) && command.is(trimmed))

            if (command) {
                command.eval(settings, trimmed);
            }
        }

        let content = '';

        const lines = string.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            let [ commandLine, comment, commentIndex ] = ScriptParser.stripComments(line, false);
            let [ , prefix, trimmed, suffix ] = commandLine.match(/^(\s*)(\S(?:.*\S)?)?(\s*)$/);

            let currentLine = prefix.replace(/ /g, '&nbsp;');

            if (trimmed) {
                const command = ScriptCommands.find((command) => (command.type & scriptType) && command.is(trimmed));

                if (command) {
                    const lineHtml = command.format(settings, trimmed);
                    currentLine += (typeof lineHtml === 'function' ? lineHtml.text : lineHtml);

                    if (command.metadata.isDeprecated) {
                        validator.deprecateCommand(i + 1, command.key, command.metadata.isDeprecated);
                    }

                    command.validate(validator, settings, i + 1, trimmed);
                } else {
                    currentLine += Highlighter.error(trimmed).text;
                }
            }

            currentLine += suffix.replace(/ /g, '&nbsp;');
            if (commentIndex != -1) {
                currentLine += Highlighter.comment(comment).text;
            }

            content += `<div class="ta-editor-overlay-line">${currentLine || '&nbsp;'}</div>`;
        }

        return {
            html: `<div class="ta-editor-overlay-page">${content}</div>`,
            info: validator.string()
        }
    }
}

class ScriptContainer {
    colorRules = new RuleEvaluator();
    formatRules = new RuleEvaluator();

    constructor (name) {
        this.name = name;
    }

    getColor (current, compare, settings, value, extra = undefined, ignoreBase = false, header = undefined, alternateSelf = undefined) {
        // Get color from expression
        const expressionColor = this.colorExpr ? this.colorExpr.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)) : undefined;
        // Get color from color block
        const blockColor = this.colorRules.get(value, ignoreBase || (typeof expressionColor !== 'undefined'));

        // Final background color
        const backgroundColor = (typeof blockColor === 'undefined' ? getCSSBackground(expressionColor) : blockColor) || '';

        // Get color for text
        let textColor = undefined;
        if (this.colorForeground === true) {
            textColor = _invertColor(_parseColor(backgroundColor) || _parseColor(this.colorBackground), true);
        } else if (this.colorForeground) {
            textColor = getCSSColor(this.colorForeground.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header)));
        }

        // Return color or empty string
        return {
            bg: backgroundColor,
            fg: textColor
        };
    }

    getStatisticsColor (settings, value) {
        if (this.statisticsColor === true) {
            return this.getColor(undefined, undefined, settings, value, undefined, true, this, undefined).bg;
        } else if (this.statisticsColor) {
            const colorValue = this.statisticsColor.eval(new ExpressionScope(settings).addSelf(value).via(this));

            if (typeof colorValue === 'undefined') {
                return '';
            } else {
                return getCSSColor(colorValue);
            }
        } else {
            return '';
        }
    }

    getValue (current, compare, settings, value, extra = undefined, header = undefined, alternateSelf = undefined) {
        // Get value from value block
        let output = this.formatRules.get(value);

        // Get value from format expression
        if (typeof output == 'undefined') {
            if (this.format instanceof Expression) {
                output = this.format.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).addSelf(value).add(extra).via(header));
            } else if (typeof this.format === 'function') {
                output = this.format(current, value);
            } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
                output = ARG_FORMATTERS[this.format](current, value);
            }
        }

        // Get value from value itself
        if (typeof output == 'undefined') {
            output = value;
        }

        // Add extras
        if (typeof output != 'undefined' && (this.displayBefore || this.displayAfter)) {
            const before = (
                this.displayBefore ? (
                    this.displayBefore.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).add(extra).via(header))
                ) : (
                    ''
                )
            );

            const after = (
                this.displayAfter instanceof Expression ? (
                    this.displayAfter.eval(new ExpressionScope(settings).with(current, compare).addSelf(alternateSelf).add(extra).via(header))
                ) : (
                    typeof this.displayAfter === 'function' ? this.displayAfter(current) : ''
                )
            );

            output = `${ before }${ output }${ after }`;
        }

        if (typeof output == 'undefined') {
            output = '';
        }

        // Return value
        return output;
    }

    getDifferenceValue (current, compare, settings, value, extra = undefined) {
        let nativeDifference = Number.isInteger(value) ? value : value.toFixed(2);

        if (this.differenceFormat === true) {
            if (this.format instanceof Expression) {
                return this.format.eval(new ExpressionScope(settings).with(current, compare).addSelf(value).add(extra));
            } else if (typeof this.format === 'function') {
                return this.format(current, value);
            } else if (typeof this.format === 'string' && ARG_FORMATTERS.hasOwnProperty(this.format)) {
                return ARG_FORMATTERS[this.format](current, value);
            } else {
                return nativeDifference;
            }
        } else if (this.differenceFormat instanceof Expression) {
            return this.differenceFormat.eval(new ExpressionScope(settings).with(current, compare).addSelf(value).add(extra));
        } else if (typeof this.differenceFormat == 'function') {
            return this.differenceFormat(settings, value);
        } else {
            return nativeDifference;
        }
    }

    getStatisticsValue (settings, value) {
        let nativeFormat = Number.isInteger(value) ? value : value.toFixed(2);

        if (this.statisticsFormat === false) {
            return nativeFormat;
        } else if (this.statisticsFormat) {
            return this.statisticsFormat.eval(new ExpressionScope(settings).addSelf(value));
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

class Script {
    constructor (string, scriptType, scriptScope = {}) {
        this.code = string;
        this.scriptType = scriptType;
        this.scriptScope = scriptScope;

        this.identifier = randomSHA1();

        // Constants
        this.constants = new Constants();

        // Discard rules
        this.discardRules = [];

        // Variables and functions
        this.functions = Object.create(null);
        this.variables = Object.create(null);
        this.variablesReference = Object.create(null);

        this.trackers = {};
        this.rowIndexes = {};

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
            formatUndefined: '?',
            statisticsColor: true,
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
        for (const line of ScriptParser.handleMacros(string, this.scriptScope)) {
            const command = ScriptCommands.find((command) => !command.metadata.evalNever && (command.type & scriptType) && command.is(line));
  
            if (command) {
                command.eval(this, line);
            }
        }

        // Push last embed && category
        this.pushEmbed();
        this.pushCategory();

        if (this.scriptScope.table !== null) {
            this._prepareLeftCategory();            
        }
    }

    _prepareLeftCategory () {
        if (this.globals.customLeftCategory) {
            // Can skip as category should already exist
        } else {
            const type = this.scriptScope.table;
            const headers = [];
            if (type === TableType.Player) {
                const dateHeader = new ScriptContainer('Date');

                this.merge(dateHeader, {
                    expr: (p) => p.Timestamp,
                    format: (p, x) => _formatDate(x),
                    width: 200,
                    action: 'show'
                }, true);

                headers.push(dateHeader);
            } else if (type === TableType.Group) {
                const nameHeader = new ScriptContainer('Name');

                this.merge(nameHeader, {
                    expr: (p) => p.Name,
                    width: this.getNameStyle(),
                    action: 'show'
                }, true);

                headers.push(nameHeader);
            } else if (type === TableType.Players || type === TableType.Groups) {
                const serverWidth = this.getServerStyle();
                if (serverWidth) {
                    const serverHeader = new ScriptContainer('Server');

                    this.merge(serverHeader, {
                        expr: (p) => p.Prefix,
                        width: serverWidth
                    }, true);

                    headers.push(serverHeader);
                }

                const nameHeader = new ScriptContainer('Name');

                this.merge(nameHeader, {
                    expr: (p) => p.Name,
                    width: this.getNameStyle(),
                    action: 'show'
                }, true);

                headers.push(nameHeader);
            }

            for (const header of headers) {
                this.#injectLeftHeaderStyling(header);
            }

            this.categories.unshift({
                name: '',
                headers
            });
        }

        if (this.globals.indexed && !(this.globals.customLeftCategory && this.globals.customIndex)) {
            const indexHeader = new ScriptContainer('#');
            
            this.merge(indexHeader, {
                expr: (p) => 0,
                width: 50
            }, true);

            this.#injectLeftHeaderStyling(indexHeader);

            this.categories[0].headers.unshift(indexHeader);
        }
    }

    #injectLeftHeaderStyling (header) {
        header.visible = true;

        header.colorForeground = this.shared.colorForeground;
        header.colorBackground = this.shared.colorBackground;

        if (header.colorBackground) {
            header.colorRules.addRule('db', 0, header.colorBackground);
        }
    }

    mergeRules (target, source) {
        for (const type of ['colorRules', 'formatRules']) {
            if (target[type].empty()) {
                target[type].rules = source[type].rules
            }
        }
    }

    static MERGEABLE_PROPERTIES_COLOR = ['colorForeground', 'colorBackground'];
    static MERGEABLE_PROPERTIES_BASE = ['colorExpr', 'format', 'differenceFormat', 'statisticsFormat', 'displayBefore', 'displayAfter', 'formatUndefined', 'colorUndefined'];

    mergeProperties (target, source, list) {
        for (const type of list) {
            if (typeof target[type] === 'undefined' && typeof source[type] !== 'undefined') {
                target[type] = source[type];
            }
        }
    }

    // Merge definition to object
    mergeDefinition (target, name) {
        const source = this.customDefinitions[name];
        if (source) {
            this.mergeProperties(target, source, Object.keys(source));
            this.mergeProperties(target, source, Script.MERGEABLE_PROPERTIES_BASE);
            this.mergeRules(target, source);
            this.mergeStyles(target, source);
            this.mergeVariables(target, source);
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

    addActionEntry (type, ...args) {
        this.actions.push({
            type,
            args
        });
    }

    merge (target, source, permitObjects = false) {
        // Merge all non-objects
        for (const key of Object.keys(source)) {
            if (typeof target[key] === 'undefined' && (permitObjects || typeof source[key] !== 'object') && typeof source[key] !== 'undefined') {
                target[key] = source[key];
            }
        }

        this.mergeStyles(target, source);
        this.mergeVariables(target, source);
        this.mergeProperties(target, source, Script.MERGEABLE_PROPERTIES_COLOR)
    }

    mergeStyles (target, source) {
        if (source.style) {
            if (target.style) {
                // Rewrite styles
                for (const [ name, value ] of Object.entries(source.style.styles)) {
                    if (target.style.has(name) == false) {
                        target.style.add(name, value);
                    }
                }
            } else {
                // Add whole style class
                target.style = source.style;
            }
        }
    }

    mergeVariables (target, source) {
        if (source.vars) {
            if (target.vars) {
                // Add vars
                for (const name of Object.keys(source.vars)) {
                    if (typeof target[name] === 'undefined') {
                        target.vars[name] = source.vars[name];
                    }
                }
            } else {
                // Add whole list
                target.vars = source.vars;
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

            if (obj.colorBackground) {
                obj.colorRules.addRule('db', 0, obj.colorBackground);
            }

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
                    this.merge(obj, mapping, true);
                }
            }

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
                        formatUndefined: '?',
                        statisticsColor: true
                    });
                }

                if (obj.colorBackground) {
                    obj.colorRules.addRule('db', 0, obj.colorBackground);
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

    // Create new header
    addHeader (name) {
        this.push();
        this.header = new ScriptContainer(name);
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
            name,
            headers: []
        };

        // Category shared
        this.sharedCategory = { }
    }

    // Create row
    addRow (name) {
        this.push();
        this.row = new ScriptContainer(name);
    }

    // Create definition
    addDefinition (name) {
        this.push();
        this.definition = new ScriptContainer(name);
    }

    // Create statistic
    addStatistics (name, expression) {
        this.customStatistics.push({
            name: name,
            ast: expression
        });
    }

    addNameValue (field, name) {
        let object = (this.row || this.definition || this.header || this.embed || this.category);
        if (object) {
            object[field] = name;
        }
    }

    // Add custom style
    addStyle (name, value) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            if (!object.style) {
                object.style = new ScriptStyle();
            }

            object.style.add(name, value);
        }
    }

    addTextColorExpression (expression) {
        let object = (this.row || this.definition || this.header || this.embed || this.sharedCategory || this.shared);
        if (object) {
            object.colorForeground = expression;
        }
    }

    addAliasExpression (expression) {
        let object = (this.row || this.definition || this.header || this.embed || this.category);
        if (object) {
            object.expa = expression;
        }
    }

    addSuperDirectValue (field, value) {
        const target = (this.header || this.embed);
        if (target) target[field] = value;
    }

    // Can be added only to row, definition, header or embed
    addDirectValue (field, value) {
        const target = (this.row || this.definition || this.header || this.embed);
        if (target) target[field] = value;
    }

    // Add color rule to the header
    addColorRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object.colorRules.addRule(condition, referenceValue, value);
        }
    }

    // Add value rule to the header
    addValueRule (condition, referenceValue, value) {
        let object = (this.row || this.definition || this.header || this.embed);
        if (object) {
            object.formatRules.addRule(condition, referenceValue, value);
        }
    }

    // Add new variable
    addVariable (name, expression, type) {
        this.variables[name] = {
            ast: expression,
            type
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

        this.addDirectValue(`ex_${ name }`, value);
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
        this.embed = new ScriptContainer(name);
        this.embed.embedded = true;
        this.embed.headers = [];
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
                    formatUndefined: '?',
                    statisticsColor: true
                });
            }

            if (obj.colorBackground) {
                obj.colorRules.addRule('db', 0, obj.colorBackground);
            }

            if (this.category) {
                this.category.headers.push(obj);
                this.embed = null;
            }
        }
    }

    // Add discard rule
    addDiscardRule (rule) {
        this.discardRules.push(rule);
    }

    // Get compare environment
    getCompareEnvironment () {
        return {
            theme: this.theme,
            functions: this.functions,
            variables: this.variablesReference,
            tableArrayCurrent: this.tableArrayCompare,
            globalArrayCurrent: this.globalArrayCompare,
            constants: this.constants,
            rowIndexes: this.rowIndexes,
            timestamp: this.reference,
            reference: this.reference,
            identifier: this.identifier
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
            if (this.scriptScope.table == TableType.Players || this.scriptScope.table == TableType.Groups) {
                return [
                    ... (hasStatistics ? [ 'statistics', hasRows ? '|' : '_' ] : []),
                    ... (hasRows ? (hasStatistics ? [ 'rows', '_' ] : [ 'rows', '|', '_' ]) : []),
                    'table'
                ];
            } else if (this.scriptScope.table == TableType.Group) {
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

    getRowHeight () {
        return this.globals.rowHeight || 0;
    }

    getFontStyle () {
        return this.globals.font ? `font: ${ this.globals.font };` : '';
    }

    getBorderColor () {
        return this.globals.borderColor ? `--table-border: ${this.globals.borderColor};` : '';
    }

    getTitleAlign () {
        return this.globals.alignTitle;
    }

    getNameStyle () {
        return Math.max(100, this.globals.name == undefined ? 250 : this.globals.name);
    }

    isStrictWidthPolicy () {
        return (this.globals.widthPolicy || 'relaxed') === 'strict';
    }

    evalRowIndexes (array) {
        for (let i = 0; i < array.length; i++) {
            const current = array[i].current;

            this.rowIndexes[`${current.LinkId}_${current.Timestamp}`] = i;
        }
    }

    evalRules () {
        // For each category
        for (let category of this.categories) {
            // For each header
            for (let header of category.headers) {
                // For each rule block
                for (let rules of [ header.colorRules.rules, header.formatRules.rules ]) {
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

    static createSegmentedArray (array, mapper) {
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

    evalPlayer (tableArray, globalArray) {
        // Evaluate row indexes
        this.evalRowIndexes(tableArray);

        // Purify array
        tableArray = [].concat(tableArray);
        globalArray = [].concat(globalArray);

        // Get shared scope
        this.tableArrayCurrent = Script.createSegmentedArray(tableArray, entry => [entry.current, entry.compare]);
        this.tableArrayCompare = Script.createSegmentedArray(tableArray, entry => [entry.compare, entry.compare]);
        this.globalArrayCurrent = Script.createSegmentedArray(globalArray, entry => [entry.current, entry.compare]);
        this.globalArrayCompare = Script.createSegmentedArray(globalArray, entry => [entry.compare, entry.compare]);

        // Iterate over all variables
        for (const [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                type: variable.type
            }

            // Run only if it is a table variable
            if (variable.type !== 'local') {
                // Get value
                const value = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type == 'global' ? this.globalArrayCurrent : this.tableArrayCurrent));

                // Set value if valid
                if (!isNaN(value) || typeof value === 'object' || typeof value === 'string') {
                    variable.value = value;
                } else {
                    delete variable.value;
                }
            }
        }

        // Evaluate custom rows
        for (const row of this.customRows) {
            const currentValue = row.expr.eval(new ExpressionScope(this).with(tableArray[0]).addSelf(tableArray));

            row.eval = {
                value: currentValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalGroups (tableArray, globalArray) {
        // Evaluate row indexes
        this.evalRowIndexes(tableArray);

        // Variables
        const sameTimestamp = tableArray.timestamp == tableArray.reference;

        // Purify array
        tableArray = [].concat(tableArray);
        globalArray = [].concat(globalArray);

        // Get segmented lists
        this.tableArrayCurrent = Script.createSegmentedArray(tableArray, entry => [entry.current, entry.compare]);
        this.tableArrayCompare = Script.createSegmentedArray(tableArray, entry => [entry.compare, entry.compare]);
        this.globalArrayCurrent = Script.createSegmentedArray(globalArray, entry => [entry.current, entry.compare]);
        this.globalArrayCompare = Script.createSegmentedArray(globalArray, entry => [entry.compare, entry.compare]);

        // Get compare env
        const compareEnvironment = this.getCompareEnvironment();

        // Evaluate variables
        for (const [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                type: variable.type
            }

            if (variable.type !== 'local') {
                // Calculate values of table variable
                const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent));
                const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare));

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
        for (const row of this.customRows) {
            const currentValue = row.expr.eval(new ExpressionScope(this).addSelf(this.tableArrayCurrent));
            const compareValue = sameTimestamp ? currentValue : row.expr.eval(new ExpressionScope(compareEnvironment).addSelf(this.tableArrayCompare));

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalPlayers (tableArray, globalArray) {
        // Evaluate row indexes
        this.evalRowIndexes(tableArray);

        // Variables
        const sameTimestamp = tableArray.timestamp == tableArray.reference;

        // Set lists
        this.listClasses = tableArray.reduce((c, { current }) => {
            c[current.Class]++;
            return c;
        }, _arrayToDefaultHash(CONFIG.indexes(), 0));

        // Purify array
        tableArray = [].concat(tableArray);
        globalArray = [].concat(globalArray);

        // Get segmented lists
        this.tableArrayCurrent = Script.createSegmentedArray(tableArray, entry => [entry.current, entry.compare]);
        this.tableArrayCompare = Script.createSegmentedArray(tableArray, entry => [entry.compare, entry.compare]);
        this.globalArrayCurrent = Script.createSegmentedArray(globalArray, entry => [entry.current, entry.compare]);
        this.globalArrayCompare = Script.createSegmentedArray(globalArray, entry => [entry.compare, entry.compare]);

        // Get compare env
        const compareEnvironment = this.getCompareEnvironment();

        // Evaluate variables
        for (const [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                type: variable.type
            }

            if (variable.type !== 'local') {
                // Calculate values of table variable
                const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent));
                const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare));

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
        for (const row of this.customRows) {
            const currentValue = row.expr.eval(new ExpressionScope(this).addSelf(this.tableArrayCurrent));
            const compareValue = sameTimestamp ? currentValue : row.expr.eval(new ExpressionScope(compareEnvironment).addSelf(this.tableArrayCompare));

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        // Evaluate array constants
        this.evalRules();
    }

    evalGroup (tableArray, globalArray) {
        // Evaluate row indexes
        this.evalRowIndexes(tableArray);

        // Variables
        const sameTimestamp = tableArray.timestamp == tableArray.reference;

        // Set lists
        this.listClasses = tableArray.reduce((c, { current }) => {
            c[current.Class]++;
            return c;
        }, _arrayToDefaultHash(CONFIG.indexes(), 0));

        this.listJoined = tableArray.joined;
        this.listKicked = tableArray.kicked;
        this.listMissing = tableArray.missing;

        // Purify array
        tableArray = [].concat(tableArray);
        globalArray = [].concat(globalArray);

        // Get segmented lists
        this.tableArrayCurrent = Script.createSegmentedArray(tableArray, entry => [entry.current, entry.compare]);
        this.tableArrayCompare = Script.createSegmentedArray(tableArray, entry => [entry.compare, entry.compare]);
        this.globalArrayCurrent = Script.createSegmentedArray(globalArray, entry => [entry.current, entry.compare]);
        this.globalArrayCompare = Script.createSegmentedArray(globalArray, entry => [entry.compare, entry.compare]);

        // Get compare env
        const compareEnvironment = this.getCompareEnvironment();

        // Get own player
        const ownEntry = tableArray.find(entry => entry.current.Own) || tableArray[0];
        const ownPlayer = _dig(ownEntry, 'current');
        const ownCompare = _dig(ownEntry, 'compare');

        // Evaluate variables
        for (const [ name, variable ] of Object.entries(this.variables)) {
            // Copy over to reference variables
            this.variablesReference[name] = {
                ast: variable.ast,
                type: variable.type
            }

            if (variable.type !== 'local') {
                // Calculate values of table variable
                const currentValue = variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCurrent : this.tableArrayCurrent));
                const compareValue = sameTimestamp ? currentValue : variable.ast.eval(new ExpressionScope(this).addSelf(variable.type === 'global' ? this.globalArrayCompare : this.tableArrayCompare));

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
        for (const row of this.customRows) {
            const currentValue = row.expr.eval(new ExpressionScope(this).with(ownPlayer, ownCompare).addSelf(this.tableArrayCurrent));
            const compareValue = sameTimestamp ? currentValue : row.expr.eval(new ExpressionScope(compareEnvironment).with(ownCompare, ownCompare).addSelf(this.tableArrayCompare));

            row.eval = {
                value: currentValue,
                compare: compareValue
            }
        }

        this.evalRules();
    }
};

// Script archive
class ScriptArchive {
    static DATA_LIFETIME = 86_400_000;
    static DATA_QUOTA = 1_024_000;

    static get data () {
        delete this.data;

        this.data = Store.shared.get('archive', []);
        this.#persist();

        return this.data;
    }

    static #persist () {
        this.#truncate();
        Store.shared.set('archive', this.data);
    }

    static #truncate () {
        this.bytes = 0;
        this.data = this.all().filter(({ timestamp }) => timestamp > Date.now() - this.DATA_LIFETIME).slice(0, 200);

        let index = -1;
        for (let i = 0; i < this.data.length; i++) {
            this.bytes += JSON.stringify(this.data[i]).length;

            if (this.bytes > this.DATA_QUOTA) {
                index = i;
                break;
            }
        }

        if (index >= 0) {
            this.data = this.data.slice(0, index);
        }
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

/*
    type Script = {
        key: string
        name: string
        version: number
        content: string
        created_at: number
        updated_at: number
        tables: string[]
        remote: null | {
            created_at: number
            updated_at: number
            key: string
            secret: string
            version: number
        }
        favorite: boolean
    }
*/
class Scripts {
    static LastChange = Date.now();

    static #DEFAULT_DATA = {
        list: [],
        assignments: {},
        remote: []
    };

    static RESERVED_SCRIPT_IDENTIFIERS = ['players', 'groups', 'player', 'group'];

    static get data () {
        delete this.data;

        if (!Store.shared.has('scripts')) {
            this.#migrateLegacyScripts();
        }

        if (Store.isTemporary()) {
            this.data = Store.shared.get('scripts', this.#DEFAULT_DATA);

            // Clear assignments for temporary mode
            this.data.assignments = this.#DEFAULT_DATA.assignments;
        } else {
            this.data = Store.get('scripts', this.#DEFAULT_DATA);
        }

        if (typeof this.data.remote === 'undefined') {
            this.data.remote = Object.create(null);
        }

        return this.data;
    }

    static #migrateLegacyScripts () {
        const scripts = [];
        const scriptsAssignments = {};

        const legacyScripts = Store.shared.get('settings', {});
        for (const [identifier, { content, timestamp, version }] of Object.entries(legacyScripts)) {
            const key = randomSHA1();

            scripts.push({
                key,
                name: `${DatabaseManager.PlayerNames[identifier] || DatabaseManager.GroupNames[identifier] || identifier} (migrated)`,
                description: '',
                content,
                version: isNaN(version) ? 1 : version,
                created_at: timestamp,
                updated_at: timestamp,
                remote: null,
                favorite: false,
                tables: null
            });

            scriptsAssignments[identifier] = key;
        }

        const legacyTemplates = Store.shared.get('templates', {});
        for (const { name, content, version, timestamp, favorite, online } of Object.values(legacyTemplates)) {
            const remote = online ? {
                key: online.key,
                secret: online.secret,
                created_at: online.timestamp,
                updated_at: online.timestamp,
                version: isNaN(online.version) ? 1 : online.version
            } : null;

            scripts.push({
                key: randomSHA1(),
                name: `${name} (migrated)`,
                content,
                description: '',
                version: isNaN(version) ? 1 : version,
                created_at: timestamp,
                updated_at: timestamp,
                remote,
                favorite,
                tables: null
            })
        }

        Store.shared.set('scripts', {
            list: scripts,
            assignments: scriptsAssignments
        });
    }

    static create ({ name, content, description }) {
        const script = {
            key: randomSHA1(),
            name,
            content,
            description,
            version: 1,
            created_at: Date.now(),
            updated_at: Date.now(),
            remote: null,
            favorite: false,
            tables: ['players', 'group', 'player']
        }

        this.data.list.push(script);

        this.#persist();

        ScriptArchive.add('create', script.key, 1, content);

        return script;
    }

    static remove (key) {
        _remove(this.data.list, this.findScript(key));

        this.#persist();
    }

    static markRemote (key, remote = null) {
        return this.update(key, {
            remote: remote ? {
                created_at: Date.parse(remote.created_at),
                updated_at: Date.parse(remote.updated_at),
                version: remote.version,
                key: remote.key,
                secret: remote.secret,
                visibility: remote.visibility,
                verified: remote.verified
            } : null
        }, false);
    }

    static update (key, changes, touch = true) {
        const script = this.findScript(key);

        if (touch) {
            ScriptArchive.add('overwrite', script.key, script.version, script.content);
        }

        Object.assign(script, changes);

        if (touch) {
            script.version += 1;
            script.updated_at = Date.now();
        }

        this.#persist();

        if (touch) {   
            ScriptArchive.add('save', script.key, script.version, script.content);
        }

        return script;
    }

    static list () {
        return this.data.list;
    }

    static remoteList () {
        return Object.keys(this.data.remote);
    }

    static remoteAdd (key, script) {
        this.data.remote[key] = script;

        this.#persist();
    }

    static remoteRemove (key) {
        delete this.data.remote[key];

        this.#persist();
    }

    static remoteGet (key) {
        return this.data.remote[key];
    }

    static sortedList (table = null) {
        let list = this.list();
        if (table) {
            list = list.filter((script) => script.tables ? script.tables.includes(table) : true);
        }

        return _sortDesc(_sortDesc(list, ({ updated_at }) => updated_at), ({ favorite }) => favorite ? 1 : -1);
    }

    static getAssignedContent (targetIdentifier, fallbackIdentifier) {
        return (
            this.findAssignedScript(targetIdentifier)?.content
        ) ?? (
            fallbackIdentifier ? (
                this.findAssignedScript(fallbackIdentifier)?.content ?? DefaultScripts.getContent(fallbackIdentifier)
            ) : (
                DefaultScripts.getContent(targetIdentifier)
            )
        );
    }

    static getContent (key) {
        return this.findScript(key).content;
    }

    static isAssigned (identifier) {
        return identifier in this.data.assignments;
    }

    static isAssignedTo (identifier, key) {
        return this.data.assignments[identifier] === key;
    }

    static assign (targetIdentifier, key) {
        this.data.assignments[targetIdentifier] = key;
        this.#persist();
    }

    static unassign (targetIdentifier) {
        delete this.data.assignments[targetIdentifier];
        this.#persist();
    }

    static getAssigns (key) {
        if (key === true) {
            return Object.keys(this.data.assignments);
        } else {
            return Object.entries(this.data.assignments).filter(([, v]) => v === key).map(([k,]) => k);
        }
    }

    static findAssignedScript (identifier) {
        const assignedKey = this.data.assignments[identifier];

        return assignedKey ? this.data.list.find(({ key }) => key === assignedKey) : null;
    }

    static findScript (key) {
        return this.data.list.find(({ key: _key }) => key === _key);
    }

    static #persist () {
        Store.set('scripts', this.data);

        this.LastChange = Date.now();
    }
}
