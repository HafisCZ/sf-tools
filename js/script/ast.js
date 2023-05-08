const EXPRESSION_REGEXP = (function () {
    try {
        return new RegExp("(\\'[^\\']*\\'|\\\"[^\\\"]*\\\"|\\~\\d+|\\`[^\\`]*\\`|\\;|\\$\\$|\\$\\!|\\$|\\{|\\}|\\|\\||\\%|\\^|\\!\\=|\\!|\\&\\&|\\>\\=|\\<\\=|\\=\\=|\\(|\\)|\\+|\\-|\\/|\\*|\\>|\\<|\\?|\\:|\\.+this|(?<!\\.)\\d+(?:.\\d+)?e\\d+|(?<!\\.)\\d+\\.\\d+|\\.|\\[|\\]|\\,)");
    } catch (e) {
        return new RegExp("(\\'[^\\']*\\'|\\\"[^\\\"]*\\\"|\\~\\d+|\\`[^\\`]*\\`|\\;|\\$\\$|\\$\\!|\\$|\\{|\\}|\\|\\||\\%|\\^|\\!\\=|\\!|\\&\\&|\\>\\=|\\<\\=|\\=\\=|\\(|\\)|\\+|\\-|\\/|\\*|\\>|\\<|\\?|\\:|\\.+this|\\d+(?:.\\d+)?e\\d+|\\d+\\.\\d+|\\.|\\[|\\]|\\,)");
    }
})();

const ExpressionCache = class {
    static #cache = new Map();

    static reset () {
        this.#cache = new Map();
    }

    static set (scope, node, value) {
        if (!scope) {
            return;
        }

        const block = this.#cache.get(scope) || new Map();
        
        this.#cache.set(scope, block);

        block.set(String(node), value);
    }

    static get (scope, node) {
        const block = this.#cache.get(scope);
 
        if (typeof block !== 'undefined') {
            return block.get(String(node));
        } else {
            return undefined;
        }
    }

    static has (scope, node) {
        if (typeof scope === 'undefined') {
            return false;
        }

        const block = this.#cache.get(scope);
        if (block) {
            return block.has(String(node));
        } else {
            return false;
        }
    }
};

const ExpressionEnum = class {
    static keys = [
        'GoldCurve',
        'AchievementCount',
        'AchievementNames',
        'ItemTypes',
        'GroupRoles',
        'Classes',
        'FortressBuildings',
        'PlayerActions',
        'PotionTypes',
        'GemTypes',
        'AttributeTypes',
        'RuneTypes',
        'UnderworldBuildings',
        'ExperienceCurve',
        'ExperienceTotal',
        'SoulsCurve',
        'ScrapbookSize',
        'MountSizes'
    ]

    static get values () {
        delete this.values;

        return (this.values = {
            'GoldCurve': Calculations.goldCurve(),
            'AchievementCount': PlayerModel.ACHIEVEMENTS_COUNT,
            'AchievementNames': _sequence(PlayerModel.ACHIEVEMENTS_COUNT).map(i => intl(`achievements.${i}`)),
            'ItemTypes': _sequence(20).map(i => i > 0 ? intl(`general.item${i}`) : ''),
            'GroupRoles': _sequence(5).map(i => i > 0 ? intl(`general.rank${i}`) : ''),
            'Classes': _arrayFromIndexes(CONFIG.indexes(), (i) => intl(`general.class${i}`), ['']),
            'FortressBuildings': _sequence(12, 1).map(i => intl(`general.buildings.fortress${i}`)),
            'PlayerActions': _sequence(4).map(i => intl(`general.action${i}`)),
            'PotionTypes': _sequence(7).map(i => i > 0 ? intl(`general.potion${i}`) : ''),
            'GemTypes': _sequence(8).map(i => i > 0 ? intl(`general.gem${i}`) : ''),
            'AttributeTypes': _sequence(6).map(i => i > 0 ? intl(`general.attribute${i}`) : ''),
            'RuneTypes': _sequence(13).map(i => i > 0 ? intl(`general.rune${i}`) : ''),
            'UnderworldBuildings': _sequence(10, 1).map(i => intl(`general.buildings.underworld${i}`)),
            'ExperienceCurve': Calculations.experienceNextLevelCurve(),
            'ExperienceTotal': Calculations.experienceTotalLevelCurve(),
            'SoulsCurve': Calculations.soulsCurve(),
            'ScrapbookSize': PlayerModel.SCRAPBOOK_COUNT,
            'MountSizes': ['', 10, 20, 30, 50]
        })
    }

    static get (key) {
        return this.values[key];
    }

    static has (key) {
        return this.keys.includes(key);
    }
}

class ExpressionScope {
    clone () {
        let _copy = new ExpressionScope(this.env);
        _copy.self = [ ... this.self ];
        _copy.indirect = [ ... this.indirect ];
        _copy.player = this.player;
        _copy.reference = this.reference;
        _copy.header = this.header;

        return _copy;
    }

    empty () {
        return !(this.self.length + this.indirect.length);
    }

    alwaysEval () {
        return !this.empty() || !this.player || !this.reference;
    }

    constructor (env) {
        this.self = [];
        this.indirect = [];
        this.env = env || { functions: { }, variables: { }, constants: Constants.DEFAULT, lists: { }, env_id: randomSHA1() };
    }

    addSelf (obj) {
        this.self.unshift(obj);
        return this;
    }

    with (player, reference) {
        this.player = player;
        this.reference = reference;

        if (player && reference) {
            this.token = `${this.env.env_id}.${player.Identifier}.${player.Timestamp}.${reference.Timestamp}`;
        }
        
        return this;
    }

    environment (env) {
        this.env = env;
        return this;
    }

    via (header) {
        this.header = header;
        return this;
    }

    add (obj) {
        if (obj != undefined) {
            this.indirect.unshift(obj);
        }
        return this;
    }

    getSelf (offset = 0) {
        return this.self[offset];
    }

    has (key) {
        if (this.self.length && typeof this.self[0] === 'object' && this.self[0] !== null && key in this.self[0]) {
            return true;
        }

        for (let i = 0; i < this.indirect.length; i++) {
            if (typeof this.indirect[i] === 'object' && this.indirect[i] !== null && key in this.indirect[i]) {
                return true;
            }
        }

        return false;
    }

    get (key) {
        if (this.self.length && typeof this.self[0] === 'object' && this.self[0] !== null && key in this.self[0]) {
            return this.self[0][key];
        }

        for (let i = 0; i < this.indirect.length; i++) {
            if (typeof this.indirect[i] === 'object' && this.indirect[0] !== null && key in this.indirect[i]) {
                return this.indirect[i][key];
            }
        }

        return undefined;
    }

    static get DEFAULT () {
        delete this.DEFAULT;

        return (this.DEFAULT = new this());
    }
}

class ExpressionRenderer {
    static render (highlighter, string, root = { constants: Constants.DEFAULT }, config = TABLE_EXPRESSION_CONFIG) {
        let tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(EXPRESSION_REGEXP);
        let nextName = false;

        // Go through all tokens
        for (let i = 0, token, prefix, suffix; i < tokens.length; i++) {
            token = tokens[i];
            if (/\S/.test(token)) {
                // Prepare token
                [, prefix, token, suffix] = token.match(/(\s*)(.*\S)(\s*)/);
                token = token.replace(/\u2023/g, '\\\"').replace(/\u2043/g, '\\\'');

                // Format token
                if (token == undefined) {
                    continue;
                }

                highlighter.normal(prefix);

                if (token.length > 1 && ['\'', '\"'].includes(token[0]) && ['\'', '\"'].includes(token[token.length - 1])) {
                    highlighter.comment(token);
                } else if (token.length > 1 && token[0] == '`' && token[token.length - 1] == '`') {
                    highlighter.string('`');
                    highlighter.join(token.slice(1, token.length - 1).split(/(\{\d+\})/g), (item) => /(\{\d+\})/.test(item) ? 'function' : 'string', '');
                    highlighter.string('`');
                } else if (config.has(token)) {
                    const data = config.get(token);

                    switch (data.type) {
                        case 'function': {
                            highlighter.function(token);
                            break;
                        }
                        case 'variable': {
                            highlighter.constant(token);
                            break;
                        }
                        case 'header': {
                            highlighter.header(token, data.meta);
                            break;
                        }
                        case 'accessor': {
                            highlighter.header(token, 'scoped');
                            break;
                        }
                    }
                } else if (root.functions && root.functions.hasOwnProperty(token)) {
                    highlighter.function(token);
                } else if (token === 'true' || token === 'false') {
                    highlighter.boolean(token, token === 'true');
                } else if (['undefined', 'null', 'loop_index', 'loop_array'].includes(token)) {
                    highlighter.constant(token);
                } else if (root.lists && root.lists.hasOwnProperty(token)) {
                    highlighter.constant(token);
                } else if (root.variables && root.variables.hasOwnProperty(token)) {
                    if (root.variables[token].tableVariable == 'unfiltered') {
                        highlighter.global(token, '-unfiltered');
                    } else if (root.variables[token].tableVariable) {
                        highlighter.global(token);
                    } else {
                        highlighter.constant(token);
                    }
                } else if (/^(\.*)this$/.test(token)) {
                    highlighter.constant(token);
                } else if (root.constants.has(token)) {
                    highlighter.constant(token);
                } else if (/\~\d+/.test(token)) {
                    highlighter.enum(token);
                } else if (ExpressionEnum.has(token)) {
                    highlighter.enum(token);
                } else if (token == '$' || token == '$!' || token == '$$') {
                    highlighter.keyword(token);
                    nextName = true;
                } else if (nextName) {
                    nextName = false;
                    if (/[a-zA-Z0-9\-\_]+/.test(token)) {
                        highlighter.constant(token);
                    } else {
                        highlighter.normal(token);
                    }
                } else {
                    highlighter.normal(token);
                }

                highlighter.normal(suffix);
            } else {
                highlighter.normal(token);
            }
        }
    }
}

class Expression {
    constructor (string, settings = null, config = TABLE_EXPRESSION_CONFIG) {
        this.config = config;
        this.tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(EXPRESSION_REGEXP).map(token => token.trim()).filter(token => token.length);
        this.root = false;

        if (this.tokens.length == 0) {
            this.empty = true;
        } else {
            var count = 0;
            for (var token of this.tokens) {
                if (token == '(') {
                    count++;
                } else if (token == ')') {
                    count--;
                }
            }

            if (count == 0) {
                this.rstr = SHA1(this.tokens.join(''));

                this.cacheable = true;
                this.subexpressions = [];

                // Get settings variable array
                let tableVariables = (settings ? settings.variables : undefined) || {};
                this.#evalEmbeddedVariables(tableVariables);

                // Generate tree
                this.root = this.#evalExpression();
                while (this.tokens[0] == ';') {
                    let sub_root = this.#postProcess(tableVariables, this.root);
                    this.cacheable = this.cacheable && this.#checkCacheableNode(sub_root);
                    this.subexpressions.push(sub_root);

                    this.tokens.shift();
                    while (this.tokens[0] == ';') {
                        this.subexpressions.push(undefined);
                        this.tokens.shift();
                    }

                    this.root = this.#evalExpression();
                }

                // Clean tree
                this.root = this.#postProcess(tableVariables, this.root);

                // Check if tree is cacheable or not
                this.cacheable = this.cacheable && this.#checkCacheableNode(this.root);

                // Check if expression was resolved by post process and unwrap string if necessary
                if (typeof this.root === 'number' || (typeof this.root === 'object' && this.root.op === 'string')) {
                    this.resolved = true;
                    this.root = this.#unwrap(this.root);
                }
            } else {
                this.empty = true;
            }
        }
    }

    // Outside eval function (always call this from outside of the Expression class)
    eval (scope = ExpressionScope.DEFAULT) {
        this.subexpressions_cache_indexes = [];
        this.subexpressions_cache = [];

        let value = undefined;
        if (this.resolved) {
            value = this.root;
        } else if (scope.alwaysEval() || !this.cacheable) {
            value = this.evalInternal(scope, this.root);
        } else if (ExpressionCache.has(scope.token, this.rstr)) {
            value = ExpressionCache.get(scope.token, this.rstr);
        } else {
            value = this.evalInternal(scope, this.root);
            ExpressionCache.set(scope.token, this.rstr, value);
        }

        return typeof value == 'number' && isNaN(value) ? undefined : value;
    }

    // Check if the expression is valid (no tokens left)
    isValid () {
        return this.tokens.length == 0 && !this.empty;
    }

    // Eval embedded variables
    #evalEmbeddedVariables (tableVariables) {
        // All variables in the token string
        let variables = [];

        // Current variable
        let brackets = 0;
        let index = null;
        let manualName = null;
        let table = true;

        // Iterate over all tokens
        for (let i = 0; i < this.tokens.length; i++) {
            // Current token
            let token = this.tokens[i];

            // Start new variable if current token matches ${
            if (token == '$') {
                if (this.tokens[i + 1] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    table = true;
                } else if (this.tokens[i + 2] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    manualName = this.tokens[i++];
                    table = true;
                }
            } else if (token == '$$') {
                if (this.tokens[i + 1] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    table = 'unfiltered';
                } else if (this.tokens[i + 2] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    manualName = this.tokens[i++];
                    table = 'unfiltered';
                }
            } else if (token == '$!') {
                if (this.tokens[i + 2] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    manualName = this.tokens[i++];
                    table = false;
                }
            } else if (index != null) {
                // If there is a variable
                if (token == '{') {
                    // Increment bracket counter
                    brackets++;
                } else if (token == '}') {
                    // Decrement bracket counter
                    brackets--;
                    if (brackets == 0) {
                        // Push new variable if brackets are 0
                        variables.push({
                            start: index,
                            length: i - index + 1,
                            name: manualName,
                            table: table
                        });

                        // Reset temporary vars
                        index = null;
                        manualName = null;
                        brackets = 0;
                        table = true;
                    }
                }
            }
        }

        // Replace variables with placeholders and save expression
        for (let i = variables.length - 1; i >= 0; i--) {
            let variable = variables[i];

            // Get tokens and strip first 2 and last 1 token (control characters)
            let tokens = this.tokens.splice(variable.start, variable.length);
            tokens = tokens.slice(2 + (variable.name ? 1 : 0), tokens.length - 1);

            // Get expression from tokens
            let expression = new Expression(tokens.join(''));

            // Get placeholder name
            let name = variable.name;
            if (!name) {
                name = `__${expression.rstr}__${variable.table}`;
            }

            // Add variable name to the token list
            this.tokens.splice(variable.start, 0, isNaN(expression.root) ? name : expression.root);

            // Add variable to settings
            tableVariables[name] = {
                ast: expression,
                tableVariable: variable.table
            };
        }
    }

    // Peek at next token
    #peek (i = 0) {
        return this.tokens[i];
    }

    // Get next token
    #get () {
        var v = this.tokens.shift();
        return isNaN(v) ? v : Number(v);
    }

    // Is token a string
    #isString (token) {
        if (token == undefined) {
            return false;
        } else {
            return (token[0] == '\'' && token[token.length - 1] == '\'') || (token[0] == '\"' && token[token.length - 1] == '\"');
        }
    }

    // Get next token as string
    #getString (cast = false) {
        var token = this.#get();
        if (this.#isString(token)) {
            return this.#wrapString(token.slice(1, token.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\''));
        } else {
            return cast ? this.#wrapString(token) : token;
        }
    }

    #unwrap (obj) {
        if (typeof obj === 'object' && obj.op === 'string') {
            return obj.args;
        } else {
            return obj;
        }
    }

    #wrapString (str) {
        return {
            op: 'string',
            args: str
        }
    }

    // Is token a unary operation
    #isUnaryOperator (token) {
        return token == '-' || token == '!';
    }

    // Get next token as unary operator
    #getUnaryOperator () {
        return {
            op: Expression.#OPERATORS[this.#get() == '-' ? 'u-' : '!'],
            args: [ this.#getVal() ]
        }
    }

    // Is global function
    #isFunction (token, follow) {
        return /[_a-zA-Z]\w*/.test(token) && follow == '(';
    }

    #isTemplate (token, follow) {
        return /^\`.*\`$/.test(token) && follow == '(';
    }

    #evalRepeatedExpression (terminator, separator, generator, emptyGenerator) {
        const args = [];

        if (this.#peek() == terminator) {
            this.#get();
            return args;
        }

        do {
            const pk = this.#peek();
            if (pk == separator || pk == terminator) {
                if (emptyGenerator) {
                    args.push(emptyGenerator(args.length));
                }
            } else {
                args.push(generator(args.length));
            }
        } while (this.#get() == separator);
        return args;
    }

    // Get global function
    #getFunction () {
        const name = this.#get();
        this.#get();

        return {
            op: name,
            args: this.#evalRepeatedExpression(')', ',', () => this.#evalExpression(), () => 'undefined')
        };
    }

    #getTemplate () {
        const val = this.#get();
        this.#get();

        return {
            op: 'format',
            args: [
                {
                    op: 'string',
                    args: val.slice(1, val.length - 1)
                },
                ... this.#evalRepeatedExpression(')', ',', () => this.#evalExpression(), () => 'undefined')
            ]
        };
    }

    // Is array
    #isArray (token) {
        return token == '[';
    }

    // Get array
    #getArray () {
        this.#get();

        return {
            op: '[',
            args: this.#evalRepeatedExpression(']', ',', (key) => {
                return {
                    key,
                    val: this.#evalExpression()
                };
            }, (key) => {
                return {
                    key,
                    val: 'undefined'
                };
            })
        };
    }

    // Is object
    #isObject (token) {
        return token == '{';
    }

    #getObjectItem () {
        const key = this.#peek(1) == ':' ? this.#getString() : this.#evalExpression();
        this.#get();

        return {
            key: key,
            val: this.#evalExpression()
        };
    }

    // Get array
    #getObject () {
        this.#get();

        return {
            op: '{',
            args: this.#evalRepeatedExpression('}', ',', () => this.#getObjectItem(), false)
        };
    }

    // Is object access
    #isObjectAccess () {
        var token = this.#peek();
        return token == '.' || token == '[';
    }

    // Get object access
    #getObjectAccess (node) {
        var type = this.#get();

        var name = undefined;
        if (type == '.') {
            name = this.#getString(true);
        } else {
            name = this.#evalExpression();
            this.#get();
        }

        if (this.#peek() == '(') {
            this.#get();

            var args = [];

            if (this.#peek() == ')') {
                this.#get();
            } else {
                do {
                    args.push(this.#evalExpression());
                } while (this.#get() == ',');
            }

            return {
                op: '(a',
                args: [ node, name, args ]
            }
        } else {
            return {
                op: '[a',
                args: [ node, name ]
            }
        }
    }

    #getVal () {
        var node = undefined;

        var token = this.#peek();
        var follow = this.#peek(1);

        if (token == undefined) {
            // Ignore undefined value
        } else if (token == '(') {
            node = this.#getSubExpression();

        } else if (this.#isString(token)) {
            // Get string
            node = this.#getString();
        } else if (this.#isTemplate(token, follow)) {
            // Get template
            node = this.#getTemplate();
        } else if (this.#isUnaryOperator(token)) {
            // Get unary operator
            node = this.#getUnaryOperator();
        } else if (this.#isFunction(token, follow)) {
            // Get function
            node = this.#getFunction();
        } else if (this.#isArray(token)) {
            // Get array
            node = this.#getArray();
        } else if (this.#isObject(token)) {
            // Get object
            node = this.#getObject();
        } else {
            // Get node
            node = this.#get();
        }

        while (this.#isObjectAccess()) {
            // Get object access
            node = this.#getObjectAccess(node);
        }

        return node;
    }

    #getHighPriority () {
        let node = this.#getVal();
        while (this.#peek() == '^') {
            node = {
                op: Expression.#OPERATORS[this.#get()],
                args: [node, this.#getVal()]
            }
        }

        return node;
    }

    #getMediumPriority () {
        let node = this.#getHighPriority();
        while (['*', '/', '%'].includes(this.#peek())) {
            node = {
                op: Expression.#OPERATORS[this.#get()],
                args: [node, this.#getHighPriority()]
            }
        }

        return node;
    }

    #getLowPriority () {
        let node = this.#getMediumPriority();
        while (['+', '-'].includes(this.#peek())) {
            node = {
                op: Expression.#OPERATORS[this.#get()],
                args: [node, this.#getMediumPriority()]
            };
        }

        return node;
    }

    #getBool () {
        let node = this.#getLowPriority();
        while (['>', '<', '<=', '>=', '==', '!='].includes(this.#peek())) {
            node = {
                op: Expression.#OPERATORS[this.#get()],
                args: [node, this.#getLowPriority()]
            }
        }

        return node;
    }

    #getBoolMerge () {
        let node = this.#getBool();
        while (['||', '&&'].includes(this.#peek())) {
            let operator = this.#get();
            node = {
                op: operator,
                args: [node, this.#getBool()]
            };
        }

        return node;
    }

    #getSubExpression () {
        this.#get();
        let node = this.#evalExpression();
        this.#get();

        return node;
    }

    #evalExpression () {
        let node = this.#getBoolMerge();
        if (this.#peek() == '?') {
            this.#get();

            // First argument
            let arg1 = this.#evalExpression();
            this.#get();

            // Second argument
            let arg2 = this.#evalExpression();

            // Create node
            node = {
                args: [node, arg1, arg2],
                op: '?:'
            };
        }

        return node;
    }

    #checkCacheableNode (node) {
        if (typeof node == 'object') {
            if (node.op == 'var') {
                return false;
            } else if (node.op == '[a' && node.args && node.args[0] == 'header') {
                return false;
            } else if (node.op == 'random' || node.op == 'now') {
                return false;
            } else {
                if (node.args && node.op !== 'string') {
                    for (let arg of node.args) {
                        if (!this.#checkCacheableNode(arg)) {
                            return false;
                        }
                    }
                }

                return true;
            }
        } else {
            return true;
        }
    }

    // Evaluate all simple nodes (simple string joining / math calculation with compile time results)
    #postProcess (tableVariables, node) {
        if (typeof(node) == 'object' && node.op !== 'string') {
            if (node.args) {
                for (var i = 0; i < node.args.length; i++) {
                    node.args[i] = this.#postProcess(tableVariables, node.args[i]);
                }
            }

            if (node.op && Expression.#OPERATORS.hasOwnProperty(node.op.name) && node.args && node.args.filter(a => !isNaN(a) || (a != undefined && a.op === 'string')).length == node.args.length) {
                const res = node.op(... node.args.map(a => a.op === 'string' ? a.args : a));
                return typeof res === 'string' ? this.#wrapString(res) : res;
            } else if (node.op && this.config.has(node.op)) {
                if (node.op === 'random' && node.op === 'now') return undefined;

                const data = this.config.get(node.op);
                if (data && data.type === 'function' && data.meta === 'value' && node.args && node.args.filter(a => !isNaN(a) || (a != undefined && a.op === 'string')).length == node.args.length) {
                    const res = data.data(... node.args.map(a => a.op === 'string' ? a.args : a));
                    return typeof res === 'string' ? this.#wrapString(res) : res;
                }
            }
        } else if (typeof node === 'string' && node in tableVariables && !isNaN(tableVariables[node].ast.root)) {
            return tableVariables[node].ast.root;
        } else if (typeof node == 'string' && /\~\d+/.test(node)) {
            let index = parseInt(node.slice(1));
            if (index < this.subexpressions.length) {
                let subnode = this.subexpressions[index];
                if (typeof subnode == 'number' || (typeof subnode == 'object' && subnode.op === 'string')) {
                    return subnode;
                } else if (typeof subnode == 'string' && subnode in tableVariables && !isNaN(tableVariables[subnode].ast.root)) {
                    return tableVariables[subnode].ast.root;
                }
            }
        }

        return node;
    }

    // Evaluate a node into array, used for array functions
    evalToArray (scope, node) {
        var generated = this.evalInternal(scope, node);
        if (!generated || typeof(generated) != 'object') {
            return [];
        } else {
            return Array.isArray(generated) ? generated : Object.values(generated);
        }
    }

    evalMappedArray (obj, arg, loop_index, loop_array, mapper, segmented, scope) {
        if (mapper) {
            if (segmented) {
                return mapper.ast.eval(scope.clone().with(obj[0], obj[1]).addSelf(obj[0]).add(mapper.args.reduce((c, a, i) => { c[a] = obj[i]; return c; }, {})).add({ loop_index, loop_array }));
            } else {
                return mapper.ast.eval(scope.clone().addSelf(obj).add(mapper.args.reduce((c, a) => { c[a] = obj; return c; }, {})).add({ loop_index, loop_array }));
            }
        } else {
            if (segmented) {
                return this.evalInternal(scope.clone().with(obj[0], obj[1]).addSelf(obj[0]).add({ loop_index, loop_array }), arg);
            } else {
                return this.evalInternal(scope.clone().addSelf(obj).add({ loop_index, loop_array }), arg);
            }
        }
    }

    evalInternal (scope, node) {
        if (typeof node === 'object') {
            if (typeof node.op === 'string') {
                if (node.op === 'string') {
                    return node.args;
                } else if (node.op == '{' || node.op == '[') {
                    // Simple object or array constructor
                    const obj = node.op == '{' ? {} : [];

                    for (const { key, val } of node.args) {
                        obj[this.evalInternal(scope, key)] = this.evalInternal(scope, val);
                    }

                    return obj;
                } else if (node.op == '?:') {
                    const condition = node.args[0];
                    const branch1 = node.args[1];
                    const branch2 = node.args[2];

                    if (this.evalInternal(scope, condition)) {
                        return this.evalInternal(scope, branch1);
                    } else {
                        return this.evalInternal(scope, branch2);
                    }
                } else if (node.op == '||') {
                    const branch1 = node.args[0];
                    const branch2 = node.args[1];

                    const resolved1 = this.evalInternal(scope, branch1);
                    if (resolved1) {
                        return resolved1;
                    } else {
                        return this.evalInternal(scope, branch2);
                    }
                } else if (node.op == '&&') {
                    const branch1 = node.args[0];
                    const branch2 = node.args[1];

                    const resolved1 = this.evalInternal(scope, branch1);
                    if (resolved1) {
                        return this.evalInternal(scope, branch2);
                    } else {
                        return false;
                    }
                } else if (scope.env.functions[node.op]) {
                    const mapper = scope.env.functions[node.op];
                    const scope2 = {};
                    for (let i = 0; i < mapper.args.length; i++) {
                        scope2[mapper.args[i]] = this.evalInternal(scope, node.args[i]);
                    }

                    return mapper.ast.eval(scope.clone().add(scope2));
                } else if (node.op == '[a') {
                    const object = this.evalInternal(scope, node.args[0]);
                    if (object) {
                        return object[this.evalInternal(scope, node.args[1])];
                    } else {
                        return undefined;
                    }
                } else if (node.op == '(a') {
                    const object = this.evalInternal(scope, node.args[0]);
                    const func = this.evalInternal(scope, node.args[1]);

                    if (object != undefined && object[func] && typeof object[func] === 'function') {
                        return object[func](... node.args[2].map(param => this.evalInternal(scope, param)));
                    } else {
                        return undefined;
                    }
                } else if (this.config.has(node.op)) {
                    const data = this.config.get(node.op);

                    switch (data.type) {
                        case 'function': {
                            // Function
                            if (data.meta === 'scope') {
                                return data.data(this, scope, node);
                            } else if (data.meta === 'array') {
                                return data.data(
                                    this.evalToArray(scope, node.args[0]),
                                    ... node.args.slice(1).map(arg => this.evalInternal(scope, arg))
                                )
                            } else {
                                return data.data(
                                    ... node.args.map(arg => this.evalInternal(scope, arg))
                                );
                            }
                        }
                        case 'header': {
                            const obj = this.evalInternal(scope, node.args[0]);
                            return obj && typeof obj === 'object' ? data.data.expr(obj) : undefined;
                        }
                        case 'accessor': {
                            if (node.args.length == 1) {
                                const obj = this.evalInternal(scope, node.args[0]);
                                return obj && typeof obj === 'object' ? data.data(obj, scope.player) : undefined;
                            } else {
                                return undefined;
                            }
                        }
                    }
                } else {
                    // Return undefined
                    return undefined;
                }
            } else if (node.op) {
                // Return processed node
                const value = node.op(... node.args.map(arg => this.evalInternal(scope, arg)));
                if (value == NaN) {
                    return undefined;
                } else {
                    return value;
                }
            } else {
                // Return node in case something does not work :(
                return node;
            }
        } else if (typeof node === 'string') {
            let scopeValue = undefined;
            if (scopeValue = node.match(/(\.*)this/)) {
                return scope ? scope.getSelf(scopeValue[1].length) : undefined;
            } else if (node === 'undefined') {
                return undefined;
            } else if (node === 'null') {
                return null;
            } else if (node === 'true') {
                return true;
            } else if (node === 'false') {
                return false;
            } else if (node.startsWith('~')) {
                // Return sub expressions
                let sub_index = parseInt(node.slice(1));
                if (sub_index < this.subexpressions.length) {
                    if (!this.subexpressions_cache_indexes.includes(sub_index)) {
                        this.subexpressions_cache_indexes.push(sub_index);
                        this.subexpressions_cache[sub_index] = this.evalInternal(scope, this.subexpressions[sub_index]);
                    }
                    return this.subexpressions_cache[sub_index];
                } else {
                    return undefined;
                }
            } else if (this.config.has(node)) {
                const data = this.config.get(node);

                switch (data.type) {
                    case 'variable': {
                        return data.data(scope);
                    }
                    case 'header': {
                        return scope.player ? data.data.expr(scope.player) : undefined;
                    }
                    case 'accessor': {
                        const self = scope.getSelf();
                        return self && typeof self === 'object' ? data.data(self, scope.player) : undefined;
                    }
                }
            } else if (scope && scope.has(node)) {
                return scope.get(node);
            } else if (node in scope.env.variables) {
                let variable = scope.env.variables[node];
                if (typeof variable.value != 'undefined') {
                    return variable.value;
                } else if (ExpressionCache.has(scope.token, node)) {
                    return ExpressionCache.get(scope.token, node);
                } else {
                    ExpressionCache.set(scope.token, node, undefined);
                    let value = variable.ast.eval(new ExpressionScope(scope.env).with(scope.player, scope.reference).via(scope.header));
                    ExpressionCache.set(scope.token, node, value);
                    return value;
                }
            } else if (scope.env.lists && scope.env.lists.hasOwnProperty(node)) {
                return scope.env.lists[node];
            } else if (scope.env.constants.has(node)) {
                // Return constant
                return scope.env.constants.get(node);
            } else {
                // Return enum or undefined if everything fails
                return ExpressionEnum.get(node);
            }
        } else {
            return node;
        }
    }

    static #OPERATORS = {
        '*': (a, b) => a * b,
        '/': (a, b) => b == 0 ? 0 : (a / b),
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '>': (a, b) => a > b,
        '<': (a, b) => a < b,
        '^': (a, b) => Math.pow(a, b),
        '==': (a, b) => a == b,
        '===': (a, b) => a === b,
        '!=': (a, b) => a != b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
        '||': (a, b) => a || b,
        '&&': (a, b) => a && b,
        '%': (a, b) => a % b,
        '?': (a, b, c) => a ? b : c,
        'u-': (a) => -a,
        's': (a) => a,
        '!': (a) => a ? false : true
    }
}
