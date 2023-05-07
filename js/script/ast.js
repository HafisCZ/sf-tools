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
    static render (highlighter, string, root = { functions: { }, variables: { }, constants: Constants.DEFAULT }, extras) {
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
                } else if (extras && extras.includes(token)) {
                    highlighter.header(token);
                } else if (TABLE_EXPRESSION_CONFIG.has(token)) {
                    const data = TABLE_EXPRESSION_CONFIG.get(token);

                    switch (data.type) {
                        case 'function': {
                            highlighter.function(token);
                            break;
                        }
                        case 'constant': {
                            highlighter.constant(token);
                            break;
                        }
                        case 'header': {
                            switch (data.meta) {
                                case 'public': {
                                    highlighter.header(token, '-public');
                                    break;
                                }
                                case 'protected': {
                                    highlighter.header(token, '-protected');
                                    break;
                                }
                                case 'private': {
                                    highlighter.header(token, '-private');
                                    break;
                                }
                            }

                            break;
                        }
                        case 'accessor': {
                            highlighter.header(token, '-scoped');
                            break;
                        }
                    }
                } else if (root.functions.hasOwnProperty(token)) {
                    highlighter.function(token);
                } else if (token === 'true' || token === 'false') {
                    highlighter.boolean(token, token === 'true');
                } else if (['undefined', 'null', 'loop_index', 'loop_array'].includes(token)) {
                    // Internal constants
                    highlighter.constant(token);
                } else if ([ 'joined', 'kicked', 'index', 'classes' ].includes(token)) {
                    // List names
                    highlighter.constant(token);
                } else if (root.variables.hasOwnProperty(token)) {
                    if (root.variables[token].tableVariable == 'unfiltered') {
                        highlighter.global(token, '-unfiltered');
                    } else if (root.variables[token].tableVariable) {
                        highlighter.global(token);
                    } else {
                        highlighter.constant(token);
                    }
                } else if (/^(\.*)this$/.test(token)) {
                    highlighter.constant(token);
                } else if (SP_HEADERS_PUBLIC.hasOwnProperty(token)) {
                    highlighter.header(token, '-public');
                } else if (SP_HEADERS_PROTECTED.hasOwnProperty(token)) {
                    highlighter.header(token, '-protected');
                } else if (SP_HEADERS_PRIVATE.hasOwnProperty(token)) {
                    highlighter.header(token, '-private');
                } else if (SP_ACCESSORS.hasOwnProperty(token)) {
                    highlighter.header(token, '-scoped');
                } else if (root.constants.exists(token)) {
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
    constructor (string, settings = null) {
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
            } else if (node.op && TABLE_EXPRESSION_CONFIG.has(node.op)) {
                if (node.op === 'random' && node.op === 'now') return undefined;

                const data = TABLE_EXPRESSION_CONFIG.get(node.op);
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
                } else if (SP_HEADERS_PROTECTED.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple call
                    const obj = this.evalInternal(scope, node.args[0]);
                    return obj && typeof obj === 'object' ? SP_HEADERS_PROTECTED[node.op].expr(obj) : undefined;
                } else if (SP_HEADERS_PUBLIC.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple call
                    const obj = this.evalInternal(scope, node.args[0]);
                    return obj && typeof obj === 'object' ? SP_HEADERS_PUBLIC[node.op].expr(obj) : undefined;
                } else if (SP_HEADERS_PRIVATE.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple call
                    const obj = this.evalInternal(scope, node.args[0]);
                    return obj && typeof obj === 'object' ? SP_HEADERS_PRIVATE[node.op].expr(obj) : undefined;
                } else if (SP_ACCESSORS.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple indirect call
                    const obj = this.evalInternal(scope, node.args[0]);
                    return obj && typeof obj === 'object' ? SP_ACCESSORS[node.op].expr(scope.player, obj) : undefined;
                } else if (TABLE_EXPRESSION_CONFIG.has(node.op)) {
                    const data = TABLE_EXPRESSION_CONFIG.get(node.op);

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
            } else if (TABLE_EXPRESSION_CONFIG.has(node)) {
                const data = TABLE_EXPRESSION_CONFIG.get(node);

                switch (data.type) {
                    case 'constant': {
                        return data.data(scope);
                    }
                }
            } else if (scope.player && SP_HEADERS_PUBLIC.hasOwnProperty(node)) {
                return SP_HEADERS_PUBLIC[node].expr(scope.player);
            } else if (scope.player && SP_HEADERS_PRIVATE.hasOwnProperty(node)) {
                return SP_HEADERS_PRIVATE[node].expr(scope.player);
            } else if (scope.player && SP_HEADERS_PROTECTED.hasOwnProperty(node)) {
                return SP_HEADERS_PROTECTED[node].expr(scope.player);
            } else if (SP_ACCESSORS.hasOwnProperty(node)) {
                const self = scope.getSelf();
                return self && typeof self === 'object' ? SP_ACCESSORS[node].expr(scope.player, self) : undefined;
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
            } else if (scope.env.constants.exists(node)) {
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

class ExpressionConfig {
    #data = new Map();

    register (type, meta, name, data) {
        this.#data.set(name, {
            type,
            meta,
            data
        })
    }

    get (name) {
        return this.#data.get(name);
    }

    has (name) {
        return this.#data.has(name);
    }

    all (type) {
        const keys = [];
        for (const [name, data] of this.#data.entries()) {
            if (data.type === type) {
                keys.push(name);
            }
        }

        return keys;
    }
}

const TABLE_EXPRESSION_CONFIG = new ExpressionConfig();

/*
    Scope constants
*/
TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'player',
    function (scope) {
        return scope.player;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'reference',
    function (scope) {
        return scope.reference;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'database',
    function (scope) {
        return DatabaseManager;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'entries',
    function (scope) {
        if (scope.player) {
            return DatabaseManager.getPlayer(scope.player.Identifier).List;
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'table_array',
    function (scope) {
        return scope.env.array;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'table_array_unfiltered',
    function (scope) {
        return scope.env.array_unfiltered;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'table_timestamp',
    function (scope) {
        return scope.env.timestamp;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'table_reference',
    function (scope) {
        return scope.env.reference;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'header',
    function (scope) {
        return scope.header;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'constant', 'scope', 'row_index',
    function (scope) {
        return scope.env.row_indexes && scope.player ? scope.env.row_indexes[`${ scope.player.Identifier }_${ scope.player.Timestamp }`] : undefined;
    }
)

/*
    Scope functions
*/
TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'difference',
    function (self, scope, node) {
        if (node.args.length !== 1) return undefined;

        const a = self.evalInternal(scope, node.args[0]);
        const b = self.evalInternal(scope.clone().with(scope.reference, scope.reference), node.args[0]);

        if (isNaN(a) || isNaN(b)) {
            return undefined;
        } else {
            return a - b;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'sort',
    function (self, scope, node) {
        if (node.args.length !== 2) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
        let values = new Array(array.length);

        for (let i = 0; i < array.length; i++) {
            values[i] = {
                key: self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope),
                val: array[i]
            };
        }

        values = values.sort((a, b) => b.key - a.key).map((a) => a.val);
        values.segmented = array.segmented;

        return values;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'some',
    function (self, scope, node) {
        if (node.args.length !== 2) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
    
        for (let i = 0; i < array.length; i++) {
            if (self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope)) {
                return true;
            }
        }
    
        return false;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'all',
    function (self, scope, node) {
        if (node.args.length !== 2) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
    
        for (let i = 0; i < array.length; i++) {
            if (!self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope)) {
                return false;
            }
        }
    
        return true;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'format',
    function (self, scope, node) {
        if (node.args.length === 0) return undefined;

        let str = self.evalInternal(scope, node.args[0]);
        if (typeof str === 'string') {
            const arg = node.args.slice(1).map(a => self.evalInternal(scope, a));
    
            for (key in arg) {
                str = str.replace(new RegExp(`\\{\\s*${ key }\\s*\\}`, 'gi'), arg[key]);
            }
    
            return str;
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'var',
    function (self, scope, node) {
        if (node.args.length !== 1) return undefined;

        if (scope.header && scope.header.vars) {
            return scope.header.vars[node.args[0]];
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'tracker',
    function (self, scope, node) {
        if (node.args.length !== 1) return undefined;

        if (scope.player) {
            return DatabaseManager.getTracker(scope.player.Identifier, node.args[0]);
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'array',
    function (self, scope, node) {
        if (node.args.length !== 1) return undefined;

        return self.evalToArray(scope, node.args[0]);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'each',
    function (self, scope, node) {
        if (node.args.length !== 2 && node.args.length !== 3) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
        const values = new Array(array.length);
    
        for (let i = 0; i < array.length; i++) {
            values[i] = self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope);
        }

        const def = typeof node.args[2] === 'undefined' ? 0 : self.evalInternal(scope, node.args[2]);
        return values.reduce((a, b) => a + b, def);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'filter',
    function (self, scope, node) {
        if (node.args.length !== 2) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
        const values = new Array(array.length);
    
        for (let i = 0; i < array.length; i++) {
            values[i] = self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope);
        }

        return array.filter((a, i) => values[i]);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'scope', 'map',
    function (self, scope, node) {
        if (node.args.length !== 2) return undefined;

        const array = self.evalToArray(scope, node.args[0]);
        const mapper = scope.env.functions[node.args[1]];
        const values = new Array(array.length);
    
        for (let i = 0; i < array.length; i++) {
            values[i] = self.evalMappedArray(array[i], node.args[1], i, array, mapper, array.segmented, scope);
        }

        return values;
    }
)

/*
    Array functions
*/
TABLE_EXPRESSION_CONFIG.register(
    'function', 'array', 'distinct',
    function (array) {
        let values = Array.from(new Set(array));
        values.segmented = array.segmented;
        return values;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'array', 'slice',
    function (array, from, to) {
        let values = array.slice(from, to);
        values.segmented = array.segmented;
        return values;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'array', 'join',
    function (array, delim) {
        return array.join(delim);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'array', 'at',
    function (array, index) {
        if (isNaN(index)) {
            return undefined;
        } else {
            return array[Math.min(array.length, Math.max(0, index))];
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'array', 'indexof',
    function (array, obj) {
        for (let i = 0; i < array.length; i++) {
            if (array[i] == obj) {
                return i;
            }
        }

        return -1;
    }
)

/*
    Standard functions
*/
TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'flatten',
    function (... values) {
        return values.flat(Infinity);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'trunc',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.trunc(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'trunc',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.ceil(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'round',
    function (value, div) {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(div)) {
                return Math.round(value);
            } else {
                return Math.round(value / div) * div;
            }
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'abs',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.abs(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'pow',
    function (value, exp) {
        if (isNaN(value) || isNaN(exp)) {
            return undefined;
        } else {
            return Math.pow(value, exp);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'exp',
    function (value) {
        return Math.exp(value);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'sqrt',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.sqrt(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'fixed',
    function (value, decimals) {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(decimals)) {
                decimal = 0;
            }

            return value.toFixed(decimals);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'datetime',
    function (value) {
        if (isNaN(value) || value < 0) {
            return undefined;
        } else {
            return _formatDate(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'time',
    function (value) {
        if (isNaN(value) || value < 0) {
            return undefined;
        } else {
            return _formatDate(value, false, true);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'duration',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return _formatDurationLegacy(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'date',
    function (value) {
        if (isNaN(value) || value < 0) {
            return undefined;
        } else {
            return _formatDate(value, true, false);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'fnumber',
    function (value, delim) {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (delim == undefined) {
                delim = '&nbsp';
            }

            return formatAsSpacedNumber(value, delim);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'enumber',
    function (value, decimals) {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(decimals)) {
                decimals = 0;
            }

            return value.toExponential(decimals);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'nnumber',
    function (value) {
        if (isNaN(value)) {
            return undefined;
        } else {
            return formatAsNamedNumber(value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'small',
    function (value) {
        return CellGenerator.Small(value);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'min',
    function (... values) {
        return _fastMin(values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector.push(... value);
            } else {
                collector.push(value);
            }

            return collector;
        }, []));
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'max',
    function (... values) {
        return _fastMax(values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector.push(... value);
            } else {
                collector.push(value);
            }

            return collector;
        }, []));
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'sum',
    function (... values) {
        return values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector += value.reduce((a, b) => a + b, 0);
            } else {
                collector += value;
            }

            return collector;
        }, 0);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'now',
    function () {
        return Date.now();
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'random',
    function () {
        return Math.random();
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'log',
    function (value) {
        console.log(value);

        return value;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'stringify',
    function (value) {
        return String(value);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'range',
    function (min, max, value) {
        if (isNaN(min) || isNaN(max) || isNaN(value)) {
            return undefined;
        } else {
            return (max - min) * value + min;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'len',
    function (value) {
        if (typeof(value) != 'object') {
            return undefined;
        } else {
            if (Array.isArray(value)) {
                return value.length;
            } else {
                return Object.keys(value).length;
            }
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'average',
    function (... values) {
        let { sum, len } = values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector.sum += value.reduce((a, b) => a + b, 0);
                collector.len += value.length;
            } else {
                collector.sum += value;
                collector.len += 1;
            }

            return collector;
        }, {
            sum: 0,
            len: 0
        });

        if (len) {
            return sum / len;
        } else {
            return 0;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'hsl',
    function (h, s, l, a) {
        if (isNaN(h) || isNaN(s) || isNaN(l)) {
            return undefined;
        } else {
            return getColorFromHSLA(h, s, l, a);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'rgb',
    function (r, g, b) {
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return undefined;
        } else {
            return getColorFromRGBA(r, g, b);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'rgba',
    function (r, g, b, a) {
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
            return undefined;
        } else {
            return getColorFromRGBA(r, g, b, a);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'gradient',
    function (from, to, value) {
        if (typeof(from) == 'object' && !isNaN(to)) {
            return getColorFromGradientObj(from, to);
        } else if (from == undefined || to == undefined || isNaN(value)) {
            return undefined;
        } else {
            return getColorFromGradient(from, to, value);
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'dualcolor',
    function (width, color1, color2) {
        if (!isNaN(width) && typeof(color1) == 'string' && typeof(color2) == 'string') {
            width = parseInt(width);
            width = width > 100 ? 100 : (width < 1 ? 1 : width);

            return `linear-gradient(90deg, ${ getCSSColor(color1) } ${ width }%, ${ getCSSColor(color2) } ${ width }%)`;
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'lingradient',
    function (degrees, ... segments) {
        if (!isNaN(degrees) && segments.length % 2 == 0 && segments.length >= 4) {
            var str = '';
            var colors = [];

            for (var i = 0; i < segments.length; i += 2) {
                var color = getCSSColor(segments[i]);
                var width = parseInt(segments[i + 1]);

                if (color && !isNaN(width)) {
                    width = width > 100 ? 100 : (width < 0 ? 0 : width);
                    colors.push(`${ color } ${ width }%`);
                } else {
                    return undefined;
                }
            }

            return `linear-gradient(${ degrees }deg, ${ colors.join(', ') })`;
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'statsum',
    function (attribute) {
        if (!isNaN(attribute)) {
            return Calculations.goldAttributeTotalCost(parseInt(attribute));
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'statcost',
    function (attribute) {
        if (!isNaN(attribute)) {
            return Calculations.goldAttributeCost(parseInt(attribute));
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'expneeded',
    function (level) {
        if (!isNaN(level)) {
            return Calculations.experienceTotalLevel(level);
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'makearray',
    function (size, def = 0) {
        if (!isNaN(size)) {
            return new Array(size).fill(def);
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'makesequence',
    function (from, to) {
        if (!isNaN(from) && !isNaN(to)) {
            if (to > from) {
                let len = to - from + 1;
                return new Array(len).fill(0).map((x, i) => from + i);
            } else {
                let len = from - to + 1;
                return new Array(len).fill(0).map((x, i) => from - i);
            }
        } else {
            return undefined;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'number',
    function (value) {
        return Number(value);
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'presence',
    function (value) {
        if (value === null) {
            return false;
        } else if (Array.isArray(value)) {
            return value.length > 0
        } else if (typeof value === 'object') {
            for (const i in value) {
                return false;
            }
  
            return true;
        } else {
            return !!value;
        }
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'img',
    function (src, width, height) {
        return `<img src="${src}"${typeof width != 'undefined' ? ` width="${width}"` : ''}${typeof height != 'undefined' ? ` height="${height}"` : ''}/>`;
    }
)

TABLE_EXPRESSION_CONFIG.register(
    'function', 'value', 'class_img',
    function (klass, width, height) {
        return `<img src="${_classImageUrl(klass)}"${typeof width != 'undefined' ? ` width="${width}"` : ''}${typeof height != 'undefined' ? ` height="${height}"` : ''}/>`;
    }
)

const SP_HEADERS_PUBLIC = {
    'Name': {
        expr: p => p.Name,
        difference: false,
        statistics: false
    },
    'ID': {
        expr: p => p.ID,
        difference: false,
        statistics: false
    },
    'Identifier': {
        expr: p => p.Identifier,
        difference: false,
        statistics: false
    },
    'Prefix': {
        expr: p => p.Prefix,
        difference: false,
        statistics: false
    },
    'Own': {
        expr: p => p.Own,
        difference: false,
        statistics: false
    },
    'Guild ID': {
        expr: p => _dig(p, 'Group', 'ID'),
        difference: false,
        statistics: false
    },
    'Guild Identifier': {
        expr: p => _dig(p, 'Group', 'Identifier'),
        difference: false,
        statistics: false
    },
    'Guild Rank': {
        expr: p => _dig(p, 'Group', 'Rank'),
        difference: false,
        statistics: false
    },
    'Role': {
        expr: p => (p && p.hasGuild()) ? _dig(p, 'Group', 'Role') : undefined,
        flip: true,
        format: (p, x) => x ? intl(`general.rank${x}`) : '',
        difference: false,
        statistics: false
    },
    'Level': {
        expr: p => p.Level
    },
    'Guild': {
        expr: p => _dig(p, 'Group', 'Name'),
        difference: false,
        statistics: false
    },
    'Items': {
        expr: p => p.Items,
        disabled: true
    },
    'Strength': {
        expr: p => p.Strength.Total
    },
    'Dexterity': {
        expr: p => p.Dexterity.Total
    },
    'Intelligence': {
        expr: p => p.Intelligence.Total
    },
    'Constitution': {
        expr: p => p.Constitution.Total
    },
    'Luck': {
        expr: p => p.Luck.Total
    },
    'Attribute': {
        expr: p => p.Primary.Total
    },
    'Strength Size': {
        expr: p => p.Strength.PotionSize
    },
    'Dexterity Size': {
        expr: p => p.Dexterity.PotionSize
    },
    'Intelligence Size': {
        expr: p => p.Intelligence.PotionSize
    },
    'Constitution Size': {
        expr: p => p.Constitution.PotionSize
    },
    'Luck Size': {
        expr: p => p.Luck.PotionSize
    },
    'Attribute Size': {
        expr: p => p.Primary.PotionSize
    },
    'Strength Potion Index': {
        expr: p => p.Strength.PotionIndex,
        difference: false,
        statistics: false
    },
    'Dexterity Potion Index': {
        expr: p => p.Dexterity.PotionIndex,
        difference: false,
        statistics: false
    },
    'Intelligence Potion Index': {
        expr: p => p.Intelligence.PotionIndex,
        difference: false,
        statistics: false
    },
    'Constitution Potion Index': {
        expr: p => p.Constitution.PotionIndex,
        difference: false,
        statistics: false
    },
    'Luck Potion Index': {
        expr: p => p.Luck.PotionIndex,
        difference: false,
        statistics: false
    },
    'Attribute Potion Index': {
        expr: p => p.Primary.PotionIndex,
        difference: false,
        statistics: false
    },
    'Strength Pet': {
        expr: p => p.Strength.Pet,
        width: 110
    },
    'Dexterity Pet': {
        expr: p => p.Dexterity.Pet,
        width: 110
    },
    'Intelligence Pet': {
        expr: p => p.Intelligence.Pet,
        width: 110
    },
    'Constitution Pet': {
        expr: p => p.Constitution.Pet,
        width: 110
    },
    'Luck Pet': {
        expr: p => p.Luck.Pet,
        width: 110
    },
    'Base Cost': {
        expr: p => p.Primary.NextCost,
        format: 'spaced_number'
    },
    'Strength Cost': {
        expr: p => p.Strength.NextCost,
        format: 'spaced_number'
    },
    'Dexterity Cost': {
        expr: p => p.Dexterity.NextCost,
        format: 'spaced_number'
    },
    'Intelligence Cost': {
        expr: p => p.Intelligence.NextCost,
        format: 'spaced_number'
    },
    'Constitution Cost': {
        expr: p => p.Constitution.NextCost,
        format: 'spaced_number'
    },
    'Luck Cost': {
        expr: p => p.Luck.NextCost,
        format: 'spaced_number'
    },
    'Base Total Cost': {
        expr: p => p.Primary.TotalCost,
        format: 'spaced_number'
    },
    'Strength Total Cost': {
        expr: p => p.Strength.TotalCost,
        format: 'spaced_number'
    },
    'Dexterity Total Cost': {
        expr: p => p.Dexterity.TotalCost,
        format: 'spaced_number'
    },
    'Intelligence Total Cost': {
        expr: p => p.Intelligence.TotalCost,
        format: 'spaced_number'
    },
    'Constitution Total Cost': {
        expr: p => p.Constitution.TotalCost,
        format: 'spaced_number'
    },
    'Luck Total Cost': {
        expr: p => p.Luck.TotalCost,
        format: 'spaced_number'
    },
    'Attribute Pet': {
        expr: p => p.Primary.Pet,
        width: 110
    },
    'Strength Equipment': {
        expr: p => p.Strength.Equipment,
        width: 110
    },
    'Dexterity Equipment': {
        expr: p => p.Dexterity.Equipment,
        width: 110
    },
    'Intelligence Equipment': {
        expr: p => p.Intelligence.Equipment,
        width: 110
    },
    'Constitution Equipment': {
        expr: p => p.Constitution.Equipment,
        width: 110
    },
    'Luck Equipment': {
        expr: p => p.Luck.Equipment,
        width: 110
    },
    'Attribute Equipment': {
        expr: p => p.Primary.Equipment,
        width: 110
    },
    'Strength Items': {
        expr: p => p.Strength.Items,
        width: 110
    },
    'Dexterity Items': {
        expr: p => p.Dexterity.Items,
        width: 110
    },
    'Intelligence Items': {
        expr: p => p.Intelligence.Items,
        width: 110
    },
    'Constitution Items': {
        expr: p => p.Constitution.Items,
        width: 110
    },
    'Luck Items': {
        expr: p => p.Luck.Items,
        width: 110
    },
    'Attribute Items': {
        expr: p => p.Primary.Items,
        width: 110
    },
    'Strength Base Items': {
        expr: p => p.Strength.ItemsBase,
        width: 110
    },
    'Dexterity Base Items': {
        expr: p => p.Dexterity.ItemsBase,
        width: 110
    },
    'Intelligence Base Items': {
        expr: p => p.Intelligence.ItemsBase,
        width: 110
    },
    'Constitution Base Items': {
        expr: p => p.Constitution.ItemsBase,
        width: 110
    },
    'Luck Base Items': {
        expr: p => p.Luck.ItemsBase,
        width: 110
    },
    'Attribute Base Items': {
        expr: p => p.Primary.ItemsBase,
        width: 110
    },
    'Strength Upgrades': {
        expr: p => p.Strength.Upgrades,
        width: 110
    },
    'Dexterity Upgrades': {
        expr: p => p.Dexterity.Upgrades,
        width: 110
    },
    'Intelligence Upgrades': {
        expr: p => p.Intelligence.Upgrades,
        width: 110
    },
    'Constitution Upgrades': {
        expr: p => p.Constitution.Upgrades,
        width: 110
    },
    'Luck Upgrades': {
        expr: p => p.Luck.Upgrades,
        width: 110
    },
    'Attribute Upgrades': {
        expr: p => p.Primary.Upgrades,
        width: 110
    },
    'Strength Gems': {
        expr: p => p.Strength.Gems,
        width: 110
    },
    'Dexterity Gems': {
        expr: p => p.Dexterity.Gems,
        width: 110
    },
    'Intelligence Gems': {
        expr: p => p.Intelligence.Gems,
        width: 110
    },
    'Constitution Gems': {
        expr: p => p.Constitution.Gems,
        width: 110
    },
    'Luck Gems': {
        expr: p => p.Luck.Gems,
        width: 110
    },
    'Attribute Gems': {
        expr: p => p.Primary.Gems,
        width: 110
    },
    'Strength Potion': {
        expr: p => p.Strength.Potion,
        width: 110
    },
    'Dexterity Potion': {
        expr: p => p.Dexterity.Potion,
        width: 110
    },
    'Intelligence Potion': {
        expr: p => p.Intelligence.Potion,
        width: 110
    },
    'Constitution Potion': {
        expr: p => p.Constitution.Potion,
        width: 110
    },
    'Luck Potion': {
        expr: p => p.Luck.Potion,
        width: 110
    },
    'Attribute Potion': {
        expr: p => p.Primary.Potion,
        width: 110
    },
    'Strength Pet Bonus': {
        expr: p => p.Strength.PetBonus
    },
    'Dexterity Pet Bonus': {
        expr: p => p.Dexterity.PetBonus
    },
    'Intelligence Pet Bonus': {
        expr: p => p.Intelligence.PetBonus
    },
    'Constitution Pet Bonus': {
        expr: p => p.Constitution.PetBonus
    },
    'Luck Pet Bonus': {
        expr: p => p.Luck.PetBonus
    },
    'Attribute Pet Bonus': {
        expr: p => p.Primary.PetBonus
    },
    'Strength Class': {
        expr: p => p.Strength.Class,
        width: 110
    },
    'Dexterity Class': {
        expr: p => p.Dexterity.Class,
        width: 110
    },
    'Intelligence Class': {
        expr: p => p.Intelligence.Class,
        width: 110
    },
    'Constitution Class': {
        expr: p => p.Constitution.Class,
        width: 110
    },
    'Luck Class': {
        expr: p => p.Luck.Class,
        width: 110
    },
    'Attribute Class': {
        expr: p => p.Primary.Class,
        width: 110
    },
    'Strength Bonus': {
        expr: p => p.Strength.Bonus,
        alias: 'Str Bonus'
    },
    'Dexterity Bonus': {
        expr: p => p.Dexterity.Bonus,
        alias: 'Dex Bonus'
    },
    'Intelligence Bonus': {
        expr: p => p.Intelligence.Bonus,
        alias: 'Int Bonus'
    },
    'Constitution Bonus': {
        expr: p => p.Constitution.Bonus,
        alias: 'Con Bonus'
    },
    'Luck Bonus': {
        expr: p => p.Luck.Bonus,
        alias: 'Lck Bonus'
    },
    'Bonus': {
        expr: p => p.Primary.Bonus
    },
    'Base Strength': {
        expr: p => p.Strength.Base
    },
    'Base Dexterity': {
        expr: p => p.Dexterity.Base
    },
    'Base Intelligence': {
        expr: p => p.Intelligence.Base
    },
    'Base Constitution': {
        expr: p => p.Constitution.Base
    },
    'Base Luck': {
        expr: p => p.Luck.Base
    },
    'Base': {
        expr: p => p.Primary.Base
    },
    'Honor': {
        expr: p => p.Honor
    },
    'Life Potion': {
        expr: p => p.Potions.Life == 25,
        format: 'boolean'
    },
    'Life Potion Index': {
        expr: p => p.Potions.LifeIndex,
        difference: false,
        statistics: false
    },
    'Runes': {
        expr: p => p.Runes.Runes,
        format: (p, x) => `e${ x }`,
        width: 100
    },
    'Action Index': {
        expr: p => p.Action.Index,
        difference: false,
        statistics: false
    },
    'Status': {
        expr: p => p.Action.Status,
        format: (p, x) => intl(`general.action${x}`),
        difference: false,
        statistics: false
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: 'datetime',
        width: 160,
        difference: false,
        statistics: false
    },
    'Action Unclaimed': {
        expr: p => p.OriginalAction.Status < 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Health': {
        expr: p => p.Health,
        width: 120
    },
    'Armor': {
        expr: p => p.Armor
    },
    'Damage Min': {
        expr: p => p.Damage.Min
    },
    'Damage Max': {
        expr: p => p.Damage.Max
    },
    'Damage Avg': {
        expr: p => p.Damage.Avg
    },
    'Damage Min 2': {
        expr: p => p.Damage2.Min
    },
    'Damage Max 2': {
        expr: p => p.Damage2.Max
    },
    'Damage Avg 2': {
        expr: p => p.Damage2.Avg
    },
    'Space': {
        expr: p => 5 + p.Fortress.Treasury
    },
    'Mirror': {
        expr: p => p.Mirror ? 13 : p.MirrorPieces
    },
    'Equipment': {
        expr: p => Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0),
        width: 130
    },
    'Tower': {
        expr: p => Math.max(0, p.Dungeons.Tower)
    },
    'Raids': {
        expr: p => p.Dungeons.Raid
    },
    'Portal': {
        expr: p => Math.max(0, p.Dungeons.Player)
    },
    'Guild Portal': {
        expr: p => p.Dungeons.Group,
        width: 130
    },
    'Dungeon': {
        expr: p => p.Dungeons.Normal.Total
    },
    'Shadow Dungeon': {
        expr: p => p.Dungeons.Shadow.Total
    },
    'Dungeon Unlocked': {
        expr: p => p.Dungeons.Normal.Unlocked
    },
    'Shadow Unlocked': {
        expr: p => p.Dungeons.Shadow.Unlocked
    },
    'Fortress': {
        expr: p => p.Fortress.Fortress
    },
    'Upgrades': {
        expr: p => p.Fortress.Upgrades
    },
    'Warriors': {
        expr: p => p.Fortress.Warriors
    },
    'Archers': {
        expr: p => p.Fortress.Archers
    },
    'Mages': {
        expr: p => p.Fortress.Mages
    },
    'Warrior Count': {
        expr: p => p.Fortress.Barracks * 3
    },
    'Archer Count': {
        expr: p => p.Fortress.ArcheryGuild * 2
    },
    'Mage Count': {
        expr: p => p.Fortress.MageTower
    },
    'Upgrades': {
        expr: p => p.Fortress.Upgrades
    },
    'Gem Mine': {
        expr: p => p.Fortress.GemMine
    },
    'Fortress Honor': {
        expr: p => p.Fortress.Honor,
        width: 150
    },
    'Raid Honor': {
        expr: p => p.Fortress.RaidHonor,
        width: 120
    },
    'Wall': {
        expr: p => p.Fortress.Wall
    },
    'Fortifications': {
        expr: p => p.Fortress.Fortifications
    },
    'Quarters': {
        expr: p => p.Fortress.LaborerQuarters
    },
    'Woodcutter': {
        expr: p => p.Fortress.WoodcutterGuild
    },
    'Quarry': {
        expr: p => p.Fortress.Quarry
    },
    'Academy': {
        expr: p => p.Fortress.Academy
    },
    'Archery Guild': {
        expr: p => p.Fortress.ArcheryGuild
    },
    'Barracks': {
        expr: p => p.Fortress.Barracks
    },
    'Mage Tower': {
        expr: p => p.Fortress.MageTower
    },
    'Treasury': {
        expr: p => p.Fortress.Treasury
    },
    'Smithy': {
        expr: p => p.Fortress.Smithy
    },
    'Raid Wood': {
        expr: p => p.Fortress.RaidWood
    },
    'Raid Stone': {
        expr: p => p.Fortress.RaidStone
    },
    'Shadow': {
        expr: p => p.Pets.Shadow
    },
    'Light': {
        expr: p => p.Pets.Light
    },
    'Earth': {
        expr: p => p.Pets.Earth
    },
    'Fire': {
        expr: p => p.Pets.Fire
    },
    'Water': {
        expr: p => p.Pets.Water
    },
    'Rune Gold': {
        expr: p => p.Runes.Gold
    },
    'Rune XP': {
        expr: p => p.Runes.XP
    },
    'Rune Chance': {
        expr: p => p.Runes.Chance,
        width: 130
    },
    'Rune Quality': {
        expr: p => p.Runes.Quality,
        width: 130
    },
    'Rune Health': {
        expr: p => p.Runes.Health,
        width: 130
    },
    'Rune Damage': {
        expr: p => p.Runes.Damage,
        width: 130
    },
    'Rune Damage 2': {
        expr: p => p.Runes.Damage2,
        width: 130
    },
    'Rune Resist': {
        expr: p => p.Runes.Resistance,
        width: 130
    },
    'Fire Resist': {
        expr: p => p.Runes.ResistanceFire,
        width: 130
    },
    'Cold Resist': {
        expr: p => p.Runes.ResistanceCold,
        width: 130
    },
    'Lightning Resist': {
        expr: p => p.Runes.ResistanceLightning,
        width: 160
    },
    'Fire Damage': {
        expr: p => p.Runes.DamageFire,
        width: 130
    },
    'Cold Damage': {
        expr: p => p.Runes.DamageCold,
        width: 130
    },
    'Lightning Damage': {
        expr: p => p.Runes.DamageLightning,
        width: 160
    },
    'Fire Damage 2': {
        expr: p => p.Runes.Damage2Fire,
        width: 130
    },
    'Cold Damage 2': {
        expr: p => p.Runes.Damage2Cold,
        width: 130
    },
    'Lightning Damage 2': {
        expr: p => p.Runes.Damage2Lightning,
        width: 160
    },
    'Class': {
        expr: p => p.Class,
        format: (p, x) => intl(`general.class${x}`),
        flip: true,
        difference: false,
        statistics: false
    },
    'Race': {
        expr: p => p.Race,
        format: (p, x) => intl(`general.race${x}`),
        difference: false,
        statistics: false
    },
    'Gender': {
        expr: p => p.Gender,
        format: (p, x) => intl(`general.gender${x}`),
        difference: false,
        statistics: false
    },
    'Rank': {
        expr: p => p.Rank,
        flip: true
    },
    'Mount': {
        expr: p => p.Mount,
        format: (p, x) => x ? `${['', 10, 20, 30, 50][x]}%` : '',
        difference: false
    },
    'Awards': {
        expr: p => p.Achievements.Owned,
        decorators: [
            {
                condition: h => h.hydra,
                apply: h => {
                    h.value.extra = p => p && p.Achievements.Dehydration ? CellGenerator.Small(' H') : ''
                }
            }
        ]
    },
    'Album': {
        expr: p => Math.ceil(10000 * p.BookPercentage) / 100,
        format: (p, x) => x.toFixed(2) + '%',
        width: 130,
        decimal: true,
        decorators: [
            {
                condition: h => h.grail,
                apply: h => {
                    h.value.extra = p => p && p.Achievements.Grail ? CellGenerator.Small(' G') : ''
                }
            }
        ]
    },
    'Album Items': {
        expr: p => p.Book,
        width: 130
    },
    'Fortress Rank': {
        expr: p => p.Fortress.Rank,
        flip: true,
        width: 130
    },
    'Building': {
        expr: p => p.Fortress.Upgrade.Building,
        width: 180,
        format: (p, x) => x >= 0 ? intl(`general.buildings.fortress${x + 1}`) : '',
        difference: false,
        statistics: false
    },
    'Building Finish': {
        expr: p => p.Fortress.Upgrade.Finish,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Building Start': {
        expr: p => p.Fortress.Upgrade.Start,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Timestamp': {
        expr: p => p.Timestamp,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Guild Joined': {
        expr: p => (p && p.hasGuild()) ? p.Group.Joined : undefined,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Achievements': {
        expr: p => p.Achievements.Owned
    },
    'Pets Unlocked': {
        expr: p => p.Achievements.PetLover,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Grail Unlocked': {
        expr: p => p.Achievements.Grail,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Hydra Dead': {
        expr: p => p.Achievements.Dehydration,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'XP': {
        expr: p => p.XP,
        format: 'spaced_number',
        format_diff: true,
        statistics: false
    },
    'XP Required': {
        expr: p => p.XPNext,
        format: 'spaced_number',
        format_diff: true,
        statistics: false
    },
    'XP Total': {
        expr: p => p.XPTotal,
        format: 'spaced_number',
        format_diff: true,
        statistics: false
    },
    'Enchantments': {
        expr: p => Object.values(p.Items).reduce((col, i) => col + (i.HasEnchantment ? 1 : 0), 0)
    },
    'Archeological Aura': {
        expr: p => p.Items.Head.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Marios Beard': {
        expr: p => p.Items.Body.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Shadow of the Cowboy': {
        expr: p => p.Items.Hand.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    '36960 Feet Boots': {
        expr: p => p.Items.Feet.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Unholy Acquisitiveness': {
        expr: p => p.Items.Neck.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Thirsty Wanderer': {
        expr: p => p.Items.Belt.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Grave Robbers Prayer': {
        expr: p => p.Items.Ring.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Robber Baron Ritual': {
        expr: p => p.Items.Misc.HasEnchantment ? 1 : 0,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Sword of Vengeance': {
        expr: p => (p.Items.Wpn1.HasEnchantment ? 1 : 0) + (p.Items.Wpn2.HasEnchantment ? 1 : 0),
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Potion 1 Size': {
        expr: p => p.Potions[0].Size,
        difference: false,
        statistics: false
    },
    'Potion 2 Size': {
        expr: p => p.Potions[1].Size,
        difference: false,
        statistics: false
    },
    'Potion 3 Size': {
        expr: p => p.Potions[2].Size,
        difference: false,
        statistics: false
    },
    'Potion 1 Type': {
        expr: p => p.Potions[0].Type,
        format: (p, x) => x ? intl(`general.potion${x}`) : '',
        difference: false,
        statistics: false
    },
    'Potion 2 Type': {
        expr: p => p.Potions[1].Type,
        format: (p, x) => x ? intl(`general.potion${x}`) : '',
        difference: false,
        statistics: false
    },
    'Potion 3 Type': {
        expr: p => p.Potions[2].Type,
        format: (p, x) => x ? intl(`general.potion${x}`) : '',
        difference: false,
        statistics: false
    },
    'Tag': {
        expr: p => p.Data.tag,
        difference: false,
        statistics: false
    },
    'Gold Frame': {
        expr: p => p.Flags.GoldFrame,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'Official Creator': {
        expr: p => p.Flags.OfficialCreator,
        format: 'boolean',
        difference: false,
        statistics: false
    },
    'GT Background': {
        expr: p => p.Flags.GroupTournamentBackground,
        format: (p, x) => x ? intl(`general.gt_background${x}`) : intl('general.none'),
        difference: false,
        statistics: false
    },
    'Potions': {
        expr: p => p.Potions,
        format: (p, i) => i.Size,
        order: (p) => _fastSum(p.Potions.map((v) => v.Size)),
        visible: false,
        difference: false,
        width: 33,
        grouped: 3
    }
};

// Protected
const SP_HEADERS_PROTECTED = {
    'Last Active': {
        expr: p => p.LastOnline,
        format: 'datetime',
        width: 160,
        difference: false,
        statistics: false
    },
    'Inactive Time': {
        expr: p => p.Timestamp - p.LastOnline,
        format: 'duration',
        flip: true,
        difference: false,
        statistics: false
    },
    'Knights': {
        expr: p => p.Fortress.Knights,
        decorators: [
            {
                condition: h => h.maximum,
                apply: h => {
                    h.value.format = (p, x) => p ? `${ p.Fortress.Knights }/${ p.Fortress.Fortress }` : x
                }
            }
        ]
    },
    'Treasure': {
        expr: p => p.Group.Treasure
    },
    'Instructor': {
        expr: p => p.Group.Instructor,
        width: 100
    },
    'Pet': {
        expr: p => p.Group.Pet
    },
    'Guild Portal Floor': {
        expr: p => _dig(p, 'Group', 'Group', 'PortalFloor')
    },
    'Guild Portal Life': {
        expr: p => _dig(p, 'Group', 'Group', 'PortalLife')
    },
    'Guild Portal Percent': {
        expr: p => _dig(p, 'Group', 'Group', 'PortalPercent')
    },
    'Guild Honor': {
        expr: p => _dig(p, 'Group', 'Group', 'Honor')
    },
    'Guild Knights': {
        expr: p => _dig(p, 'Group', 'Group', 'TotalKnights')
    },
    'Guild Treasure': {
        expr: p => (_dig(p, 'Group', 'Group', 'TotalTreasure') || 0) + 2 * Math.min(p.Dungeons.Raid, 50)
    },
    'Guild Instructor': {
        expr: p => (_dig(p, 'Group', 'Group', 'TotalInstructor') || 0) + 2 * Math.min(p.Dungeons.Raid, 50)
    },
    'GT Tokens': {
        expr: p => _dig(p, 'GroupTournament', 'Tokens')
    },
    'GT Floor': {
        expr: p => _dig(p, 'GroupTournament', 'Floor')
    },
    'GT Maximum Floor': {
        expr: p => _dig(p, 'GroupTournament', 'FloorMax')
    }
};

// Private
const SP_HEADERS_PRIVATE = {
    'Webshop ID': {
        expr: p => p.WebshopID,
        difference: false,
        statistics: false
    },
    'Mount Expire': {
        expr: p => p.MountExpire,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Wood': {
        expr: p => p.Fortress.Wood
    },
    'Stone': {
        expr: p => p.Fortress.Stone
    },
    'Used Beers': {
        expr: p => p.UsedBeers,
        statistics: false,
        difference: false
    },
    'Scrapbook Items': {
        expr: p => p.Scrapbook
    },
    'Scrapbook Legendaries': {
        expr: p => p.ScrapbookLegendary
    },
    'Aura': {
        expr: p => p.Toilet.Aura,
        statistics: false
    },
    'Toilet Fill': {
        expr: p => p.Toilet.Fill,
        statistics: false
    },
    'Shrooms': {
        expr: p => _dig(p, 'Mushrooms', 'Current'),
        statistics: false
    },
    'Coins': {
        expr: p => p.Coins,
        statistics: false
    },
    'Shrooms Total': {
        expr: p => _dig(p, 'Mushrooms', 'Total'),
        statistics: false
    },
    'Shrooms Free': {
        expr: p => _dig(p, 'Mushrooms', 'Free'),
        statistics: false
    },
    'Shrooms Paid': {
        expr: p => _dig(p, 'Mushrooms', 'Paid'),
        statistics: false
    },
    'Hourglass': {
        expr: p => p.Hourglass,
        statistics: false
    },
    'Potion Expire': {
        expr: p => p.Own ? (p.Potions[0].Size == 0 ? 0 : Math.min(... (p.Potions.filter(pot => pot.Size > 0).map(pot => pot.Expire)))) : undefined,
        format: (p, x) => x == undefined ? '?' : _formatDate(x),
        width: 160,
        difference: false,
        statistics: false
    },
    'Crystals': {
        expr: p => p.Crystals,
        statistics: false
    },
    'Metal': {
        expr: p => p.Metal,
        statistics: false
    },
    'Pet Rank': {
        expr: p => p.Pets.Rank <= 0 ? undefined : p.Pets.Rank,
        flip: true
    },
    'Pet Honor': {
        expr: p => p.Pets.Honor
    },
    '1 Catacombs': {
        expr: p => Math.max(0, p.Dungeons.Normal[0])
    },
    '2 Mines': {
        expr: p => Math.max(0, p.Dungeons.Normal[1])
    },
    '3 Ruins': {
        expr: p => Math.max(0, p.Dungeons.Normal[2])
    },
    '4 Grotto': {
        expr: p => Math.max(0, p.Dungeons.Normal[3])
    },
    '5 Altar': {
        expr: p => Math.max(0, p.Dungeons.Normal[4])
    },
    '6 Tree': {
        expr: p => Math.max(0, p.Dungeons.Normal[5])
    },
    '7 Magma': {
        expr: p => Math.max(0, p.Dungeons.Normal[6])
    },
    '8 Temple': {
        expr: p => Math.max(0, p.Dungeons.Normal[7])
    },
    '9 Pyramid': {
        expr: p => Math.max(0, p.Dungeons.Normal[8])
    },
    '10 Fortress': {
        expr: p => Math.max(0, p.Dungeons.Normal[9])
    },
    '11 Circus': {
        expr: p => Math.max(0, p.Dungeons.Normal[10])
    },
    '12 Hell': {
        expr: p => Math.max(0, p.Dungeons.Normal[11])
    },
    '13 Floor': {
        expr: p => Math.max(0, p.Dungeons.Normal[12])
    },
    '14 Easteros': {
        expr: p => Math.max(0, p.Dungeons.Normal[13])
    },
    '15 Academy': {
        expr: p => Math.max(0, p.Dungeons.Normal[14])
    },
    '16 Hemorridor': {
        expr: p => Math.max(0, p.Dungeons.Normal[15])
    },
    '17 Nordic': {
        expr: p => Math.max(0, p.Dungeons.Normal[16])
    },
    '18 Greek': {
        expr: p => Math.max(0, p.Dungeons.Normal[17])
    },
    '19 Birthday': {
        expr: p => Math.max(0, p.Dungeons.Normal[18])
    },
    '20 Dragons': {
        expr: p => Math.max(0, p.Dungeons.Normal[19])
    },
    '21 Horror': {
        expr: p => Math.max(0, p.Dungeons.Normal[20])
    },
    '22 Superheroes': {
        expr: p => Math.max(0, p.Dungeons.Normal[21])
    },
    '23 Anime': {
        expr: p => Math.max(0, p.Dungeons.Normal[22])
    },
    '24 Giant Monsters': {
        expr: p => Math.max(0, p.Dungeons.Normal[23])
    },
    '25 City': {
        expr: p => Math.max(0, p.Dungeons.Normal[24])
    },
    '26 Magic Express': {
        expr: p => Math.max(0, p.Dungeons.Normal[25])
    },
    '27 Mountain': {
        expr: p => Math.max(0, p.Dungeons.Normal[26])
    },
    '28 Playa': {
        expr: p => Math.max(0, p.Dungeons.Normal[27])
    },
    'S1 Catacombs': {
        expr: p => Math.max(0, p.Dungeons.Shadow[0])
    },
    'S2 Mines': {
        expr: p => Math.max(0, p.Dungeons.Shadow[1])
    },
    'S3 Ruins': {
        expr: p => Math.max(0, p.Dungeons.Shadow[2])
    },
    'S4 Grotto': {
        expr: p => Math.max(0, p.Dungeons.Shadow[3])
    },
    'S5 Altar': {
        expr: p => Math.max(0, p.Dungeons.Shadow[4])
    },
    'S6 Tree': {
        expr: p => Math.max(0, p.Dungeons.Shadow[5])
    },
    'S7 Magma': {
        expr: p => Math.max(0, p.Dungeons.Shadow[6])
    },
    'S8 Temple': {
        expr: p => Math.max(0, p.Dungeons.Shadow[7])
    },
    'S9 Pyramid': {
        expr: p => Math.max(0, p.Dungeons.Shadow[8])
    },
    'S10 Fortress': {
        expr: p => Math.max(0, p.Dungeons.Shadow[9])
    },
    'S11 Circus': {
        expr: p => Math.max(0, p.Dungeons.Shadow[10])
    },
    'S12 Hell': {
        expr: p => Math.max(0, p.Dungeons.Shadow[11])
    },
    'S13 Floor': {
        expr: p => Math.max(0, p.Dungeons.Shadow[12])
    },
    'S14 Easteros': {
        expr: p => Math.max(0, p.Dungeons.Shadow[13])
    },
    'S15 Academy': {
        expr: p => Math.max(0, p.Dungeons.Shadow[14])
    },
    'S16 Hemorridor': {
        expr: p => Math.max(0, p.Dungeons.Shadow[15])
    },
    'S17 Nordic': {
        expr: p => Math.max(0, p.Dungeons.Shadow[16])
    },
    'S18 Greek': {
        expr: p => Math.max(0, p.Dungeons.Shadow[17])
    },
    'S19 Birthday': {
        expr: p => Math.max(0, p.Dungeons.Shadow[18])
    },
    'S20 Dragons': {
        expr: p => Math.max(0, p.Dungeons.Shadow[19])
    },
    'S21 Horror': {
        expr: p => Math.max(0, p.Dungeons.Shadow[20])
    },
    'S22 Superheroes': {
        expr: p => Math.max(0, p.Dungeons.Shadow[21])
    },
    'S23 Anime': {
        expr: p => Math.max(0, p.Dungeons.Shadow[22])
    },
    'S24 Giant Monsters': {
        expr: p => Math.max(0, p.Dungeons.Shadow[23])
    },
    'S25 City': {
        expr: p => Math.max(0, p.Dungeons.Shadow[24])
    },
    'S26 Magic Express': {
        expr: p => Math.max(0, p.Dungeons.Shadow[25])
    },
    'S27 Mountain': {
        expr: p => Math.max(0, p.Dungeons.Shadow[26])
    },
    'S28 Playa': {
        expr: p => Math.max(0, p.Dungeons.Shadow[27])
    },
    'Youtube': {
        expr: p => Math.max(0, p.Dungeons.Youtube),
        statistics: false,
        width: 120
    },
    'Twister': {
        expr: p => Math.max(0, p.Dungeons.Twister),
        statistics: false
    },
    'Scrolls': {
        expr: p => p.Witch.Stage
    },
    'Scroll Finish' : {
        expr: p => p.Witch.Finish,
        format: 'datetime',
        difference: false,
        statistics: false,
        width: 160
    },
    'Witch Item': {
        expr: p => p.Witch.Item,
        format: (p, x) => x ? intl(`general.item${x}`) : ''
    },
    'Witch Items': {
        expr: p => p.Witch.Items
    },
    'Witch Items Required': {
        expr: p => p.Witch.ItemsNext
    },
    'Registered': {
        expr: p => p.Registered,
        format: 'datetime',
        width: 160,
        difference: false,
        statistics: false
    },
    'Heart of Darkness': {
        expr: p => p.Underworld ? p.Underworld.Heart : undefined,
        statistics: false
    },
    'Underworld Gate': {
        expr: p => p.Underworld ? p.Underworld.Gate : undefined,
        statistics: false
    },
    'Gold Pit': {
        expr: p => p.Underworld ? p.Underworld.GoldPit : undefined,
        statistics: false
    },
    'Extractor': {
        expr: p => p.Underworld ? p.Underworld.Extractor : undefined,
        statistics: false
    },
    'Goblin Pit': {
        expr: p => p.Underworld ? p.Underworld.GoblinPit : undefined,
        statistics: false
    },
    'Goblin Upgrades': {
        expr: p => p.Underworld ? p.Underworld.GoblinUpgrades : undefined,
        statistics: false
    },
    'Torture Chamber': {
        expr: p => p.Underworld ? p.Underworld.Torture : undefined,
        statistics: false
    },
    'Gladiator Trainer': {
        expr: p => p.Fortress.Gladiator,
        statistics: false
    },
    'Gladiator': {
        expr: p => p.Fortress.Gladiator,
        statistics: false
    },
    'Troll Block': {
        expr: p => p.Underworld ? p.Underworld.TrollBlock : undefined,
        statistics: false
    },
    'Troll Upgrades': {
        expr: p => p.Underworld ? p.Underworld.TrollUpgrades : undefined,
        statistics: false
    },
    'Time Machine': {
        expr: p => p.Underworld ? p.Underworld.TimeMachine : undefined,
        statistics: false
    },
    'Time Machine Shrooms': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineMushrooms : undefined,
        statistics: false
    },
    'Keeper': {
        expr: p => p.Underworld ? p.Underworld.Keeper : undefined,
        statistics: false
    },
    'Keeper Upgrades': {
        expr: p => p.Underworld ? p.Underworld.KeeperUpgrades : undefined,
        statistics: false
    },
    'Souls': {
        expr: p => p.Underworld ? p.Underworld.Souls : undefined,
        statistics: false
    },
    'Extractor Max': {
        expr: p => p.Underworld ? p.Underworld.ExtractorMax : undefined,
        statistics: false
    },
    'Max Souls': {
        expr: p => p.Underworld ? p.Underworld.MaxSouls : undefined,
        statistics: false
    },
    'Extractor Hourly': {
        expr: p => p.Underworld ? p.Underworld.ExtractorHourly : undefined,
        statistics: false
    },
    'Gold Pit Max': {
        expr: p => p.Underworld ? p.Underworld.GoldPitMax : undefined,
        format: 'spaced_number',
        statistics: false
    },
    'Gold Pit Hourly': {
        expr: p => p.Underworld ? p.Underworld.GoldPitHourly : undefined,
        format: 'spaced_number',
        statistics: false
    },
    'Time Machine Thirst': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineThirst : undefined,
        statistics: false
    },
    'Time Machine Max': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineMax : undefined,
        statistics: false
    },
    'Time Machine Daily': {
        expr: p => p.Underworld && p.Underworld.TimeMachineDaily ? Math.trunc(p.Underworld.TimeMachineDaily * 0.25) : undefined,
        statistics: false
    },
    'Time Machine Daily Max': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineDaily : undefined,
        statistics: false
    },
    'Underworld Building': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Building : undefined,
        width: 180,
        format: (p, x) => x >= 0 ? intl(`general.buildings.underworld${x + 1}`) : '',
        difference: false,
        statistics: false
    },
    'Underworld Building Finish': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Finish : -1,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Underworld Building Start': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Start : -1,
        format: 'datetime',
        difference: false,
        statistics: false
    },
    'Woodcutter Max': {
        expr: p => p.Fortress.WoodcutterMax,
        statistics: false
    },
    'Quarry Max': {
        expr: p => p.Fortress.QuarryMax,
        statistics: false
    },
    'Academy Max': {
        expr: p => p.Fortress.AcademyMax,
        statistics: false
    },
    'Wood Capacity': {
        expr: p => p.Fortress.MaxWood,
        statistics: false
    },
    'Stone Capacity': {
        expr: p => p.Fortress.MaxStone,
        statistics: false
    },
    'Stashed Wood': {
        expr: p => p.Fortress.SecretWood
    },
    'Stashed Stone': {
        expr: p => p.Fortress.SecretStone
    },
    'Stashed Wood Capacity': {
        expr: p => p.Fortress.SecretWoodLimit
    },
    'Stashed Stone Capacity': {
        expr: p => p.Fortress.SecretStoneLimit
    },
    'Sacrifices': {
        expr: p => p.Idle ? p.Idle.Sacrifices : undefined,
        statistics: false
    },
    'Money': {
        expr: p => p.Idle ? p.Idle.Money : undefined,
        format: 'exponential_number',
        difference: false,
        statistics: false
    },
    'Runes Collected': {
        expr: p => p.Idle ? p.Idle.Runes : undefined,
        format: 'exponential_number',
        difference: false,
        statistics: false
    },
    'Runes Ready': {
        expr: p => p.Idle ? p.Idle.ReadyRunes : undefined,
        format: 'exponential_number',
        difference: false,
        statistics: false
    },
    'Idle Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Total : undefined,
        statistics: false
    },
    'Speed Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Speed : undefined,
        statistics: false
    },
    'Money Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Money : undefined,
        statistics: false
    },
    'Shadow Count': {
        expr: p => p.Pets.ShadowCount,
        statistics: false
    },
    'Light Count': {
        expr: p => p.Pets.LightCount,
        statistics: false
    },
    'Earth Count': {
        expr: p => p.Pets.EarthCount,
        statistics: false
    },
    'Fire Count': {
        expr: p => p.Pets.FireCount,
        statistics: false
    },
    'Water Count': {
        expr: p => p.Pets.WaterCount,
        statistics: false
    },
    'Shadow Level': {
        expr: p => p.Pets.ShadowLevel,
        statistics: false
    },
    'Light Level': {
        expr: p => p.Pets.LightLevel,
        statistics: false
    },
    'Earth Level': {
        expr: p => p.Pets.EarthLevel,
        statistics: false
    },
    'Fire Level': {
        expr: p => p.Pets.FireLevel,
        statistics: false
    },
    'Water Level': {
        expr: p => p.Pets.WaterLevel,
        statistics: false
    },
    'Total Pet Level': {
        expr: p => p.Pets.TotalLevel,
        statistics: false
    },
    'Shadow Food': {
        expr: p => p.Pets.ShadowFood,
        statistics: false
    },
    'Light Food': {
        expr: p => p.Pets.LightFood,
        statistics: false
    },
    'Earth Food': {
        expr: p => p.Pets.EarthFood,
        statistics: false
    },
    'Fire Food': {
        expr: p => p.Pets.FireFood,
        statistics: false
    },
    'Water Food': {
        expr: p => p.Pets.WaterFood,
        statistics: false
    },
    'Summer Score': {
        expr: p => p.Summer.TotalPoints,
        statistics: false
    },
    'Dummy': {
        expr: p => p.Inventory ? p.Inventory.Dummy : undefined,
        disabled: true
    },
    'Backpack': {
        expr: p => p.Inventory ? p.Inventory.Backpack : undefined,
        disabled: true
    },
    'Chest': {
        expr: p => p.Inventory ? p.Inventory.Chest : undefined,
        disabled: true
    },
    'Bert Items': {
        expr: p => p.Inventory ? p.Inventory.Bert : undefined,
        disabled: true
    },
    'Kunigunde Items': {
        expr: p => p.Inventory ? p.Inventory.Kunigunde : undefined,
        disabled: true
    },
    'Mark Items': {
        expr: p => p.Inventory ? p.Inventory.Mark : undefined,
        disabled: true
    }
};

// Itemized
const SP_ACCESSORS = {
    'Item Strength': {
        expr: (p, i) => i.Strength.Value
    },
    'Item Dexterity': {
        expr: (p, i) => i.Dexterity.Value
    },
    'Item Intelligence': {
        expr: (p, i) => i.Intelligence.Value
    },
    'Item Constitution': {
        expr: (p, i) => i.Constitution.Value
    },
    'Item Luck': {
        expr: (p, i) => i.Luck.Value
    },
    'Item Attribute': {
        expr: (p, i) => {
            if (p) {
                switch (p.Primary.Type) {
                    case 1: return i.Strength.Value;
                    case 2: return i.Dexterity.Value;
                    case 3: return i.Intelligence.Value;
                    default: return 0;
                }
            } else {
                return 0;
            }
        }
    },
    'Item Type': {
        expr: (p, i) => i.Type,
        format: (p, x) => x ? intl(`general.item${x}`) : '',
        difference: false
    },
    'Item Name': {
        expr: (p, i) => i.Name,
        difference: false
    },
    'Item Upgrades': {
        expr: (p, i) => i.Upgrades
    },
    'Item Rune': {
        expr: (p, i) => i.RuneType,
        width: 180,
        format: (p, x) => x ? intl(`general.rune${x}`) : '',
        difference: false
    },
    'Item Rune Value': {
        expr: (p, i) => i.RuneValue,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gem': {
        expr: (p, i) => i.GemType,
        format: (p, x) => x ? intl(`general.gem${x}`) : '',
        difference: false
    },
    'Item Gem Value': {
        expr: (p, i) => i.GemValue,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gold': {
        expr: (p, i) => i.SellPrice.Gold,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Crystal': {
        expr: (p, i) => i.SellPrice.Crystal,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Metal': {
        expr: (p, i) => i.SellPrice.Metal,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Crystal': {
        expr: (p, i) => i.DismantlePrice.Crystal,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Metal': {
        expr: (p, i) => i.DismantlePrice.Metal,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Potion Type': {
        expr: (p, i) => i.Type,
        format: (p, x) => x ? intl(`general.potion${x}`) : '',
        difference: false
    },
    'Potion Size': {
        expr: (p, i) => i.Size,
        format: (p, x) => x == 0 ? '' : x,
        difference: false
    },
    'Inventory Kind': {
        expr: (p, i) => i.SlotType,
        difference: false
    },
    'Inventory Slot': {
        expr: (p, i) => i.SlotIndex,
        difference: false
    }
};
