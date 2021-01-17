const ExpressionRegExp = /(\'[^\']*\'|\"[^\"]*\"|\~\d+|\;|\$\!|\$|\{|\}|\|\||\%|\!\=|\!|\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|(?<!\.)\d+(?:.\d+)?e\d+|(?<!\.)\d+\.\d+|\.|\[|\]|\,)/;

const PerformanceTracker = new (class {
    constructor () {
        this.calls = 0;
        this.hits = 0;
        this.cache = { };

        this.expressions = 0;
        this.expressionCache = { };

        if (typeof SiteOptions !== 'undefined') {
            this.allowClears = SiteOptions.cache_policy != CACHE_DONT_CLEAR;
            this.allowCaching = SiteOptions.cache_policy != CACHE_DISABLE;
        }
    }

    start () {
        this.calls = 0;
        this.hits = 0;

        this.time = Date.now();
    }

    tick () {
        this.calls++;
    }

    hit () {
        this.hits++;
    }

    stop () {
        Logger.log('PERFLOG', `${ this.hits } hits (${ this.calls - this.hits } missed) in ${ Date.now() - this.time } ms. ${ this.expressions } expression${ this.expressions > 1 ? 's' : '' } indexed.`);
    }

    getIndex (tokens) {
        if (!(tokens in this.expressionCache)) {
            this.expressionCache[tokens] = this.expressions++;;
        }

        return this.expressionCache[tokens];
    }

    cache_clear () {
        if (this.allowClears) {
            this.cache = {};
        }
    }

    cache_add (id, player, compare, value) {
        if (player && compare && this.allowCaching) {
            this.cache[`${ player.Identifier }-${ player.Timestamp }-${ compare.Timestamp }-${ id }`] = value;
        }
    }

    cache_querry (id, player, compare) {
        if (!this.allowCaching || !player || !compare) {
            return undefined;
        } else {
            return this.cache[`${ player.Identifier }-${ player.Timestamp }-${ compare.Timestamp }-${ id }`];
        }
    }
})();

class Expression {
    constructor (string, settings = null) {
        this.tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(ExpressionRegExp).map(token => token.trim()).filter(token => token.length);
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
                this.evalEmbeddedVariables(tableVariables);

                // Generate tree
                this.root = this.evalExpression();
                while (this.tokens[0] == ';') {
                    let sub_root = this.postProcess(tableVariables, this.root);
                    this.cacheable &&= this.checkCacheableNode(sub_root);
                    this.subexpressions.push(sub_root);

                    this.tokens.shift();
                    while (this.tokens[0] == ';') {
                        this.subexpressions.push(undefined);
                        this.tokens.shift();
                    }

                    this.root = this.evalExpression();
                }

                // Clean tree
                this.root = this.postProcess(tableVariables, this.root);

                // Check if tree is cacheable or not
                this.cacheable &&= this.checkCacheableNode(this.root);
            } else {
                this.empty = true;
            }
        }
    }

    // Format
    static format (string, root = { functions: { }, variables: { }, constants: new Constants() }) {
        var content = '';
        var tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(ExpressionRegExp);
        let nextName = false;

        // Go through all tokens
        for (var i = 0, token, value; i < tokens.length; i++) {
            token = tokens[i];
            if (/\S/.test(token)) {
                // Prepare token
                var [, prefix, token, suffix] = token.match(/(\s*)(.*\S)(\s*)/);
                token = token.replace(/\u2023/g, '\\\"').replace(/\u2043/g, '\\\'');

                // Format token
                if (token == undefined) {
                    continue;
                } else if (token.length > 1 && ['\'', '\"'].includes(token[0]) && ['\'', '\"'].includes(token[token.length - 1])) {
                    value = token[0] + SFormat.Comment(token.slice(1, token.length - 1)) + token[token.length - 1];
                } else if (SP_FUNCTIONS.hasOwnProperty(token) || ['each', 'map', 'slice', 'filter', 'format', 'difference', 'at', 'array', 'difference', 'join', 'sort', 'distinct', 'indexof', 'var', 'tracker' ].includes(token) || root.functions.hasOwnProperty(token)) {
                    value = SFormat.Function(token);
                } else if (['this', 'undefined', 'null', 'player', 'reference', 'joined', 'kicked', 'true', 'false', 'index', 'database', 'row_index', 'classes', 'header', 'entries' ].includes(token) || root.variables.hasOwnProperty(token)) {
                    value = SFormat.Constant(token);
                } else if (SP_KEYWORD_MAPPING_0.hasOwnProperty(token)) {
                    value = SFormat.Reserved(token);
                } else if (SP_KEYWORD_MAPPING_1.hasOwnProperty(token)) {
                    value = SFormat.ReservedProtected(token);
                } else if (SP_KEYWORD_MAPPING_2.hasOwnProperty(token)) {
                    value = SFormat.ReservedPrivate(token);
                } else if (SP_KEYWORD_MAPPING_3.hasOwnProperty(token)) {
                    value = SFormat.ReservedSpecial(token);
                } else if (SP_KEYWORD_MAPPING_4.hasOwnProperty(token)) {
                    value = SFormat.ReservedItemized(token);
                } else if (SP_KEYWORD_MAPPING_5.hasOwnProperty(token)) {
                    value = SFormat.ReservedItemizable(token);
                } else if (root.constants.exists(token)) {
                    value = SFormat.Constant(token);
                } else if (SP_ENUMS.hasOwnProperty(token)) {
                    value = SFormat.Enum(token);
                } else if (token == '$' || token == '$!') {
                    value = SFormat.Keyword(token);
                    nextName = true;
                } else if (nextName) {
                    nextName = false;
                    if (/[a-zA-Z0-9\-\_]+/.test(token)) {
                        value = SFormat.Constant(token);
                    } else {
                        value = SFormat.Normal(token);
                    }
                } else {
                    value = SFormat.Normal(token);
                }

                content += SFormat.Normal(prefix) + value + SFormat.Normal(suffix);
            } else {
                content += SFormat.Normal(token);
            }
        }

        return content;
    }

    // Eval embedded variables
    evalEmbeddedVariables (tableVariables) {
        // All variables in the token string
        let variables = [];
        let locals = [];

        // Current variable
        let brackets = 0;
        let index = null;
        let manualName = null;
        let local = false;

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
                    local = false;
                } else if (this.tokens[i + 2] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    manualName = this.tokens[i++];
                    local = false;
                }
            } else if (token == '$!') {
                if (this.tokens[i + 2] == '{') {
                    // Save current index and skip next bracket
                    index = i++;
                    brackets++;
                    manualName = this.tokens[i++];
                    local = true;
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
                            local: local
                        });

                        // Reset temporary vars
                        index = null;
                        manualName = null;
                        brackets = 0;
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
            if (!(name || name in tableVariables)) {
                name = `__${ expression.rstr }`;
            }

            // Add variable name to the token list
            this.tokens.splice(variable.start, 0, isNaN(expression.root) ? name : expression.root);

            // Add variable to settings
            tableVariables[name] = {
                ast: expression,
                tableVariable: !variable.local
            };
        }
    }

    // Peek at next token
    peek (i = 0) {
        return this.tokens[i];
    }

    // Get next token
    get () {
        var v = this.tokens.shift();
        return isNaN(v) ? v : Number(v);
    }

    // Is token a string
    isString (token) {
        if (token == undefined) {
            return false;
        } else {
            return (token[0] == '\'' && token[token.length - 1] == '\'') || (token[0] == '\"' && token[token.length - 1] == '\"');
        }
    }

    // Get next token as string
    getString (cast = false) {
        var token = this.get();
        if (this.isString(token)) {
            return this.wrapString(token.slice(1, token.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\''));
        } else {
            return cast ? this.wrapString(token) : token;
        }
    }

    wrapString (str) {
        return {
            raw: true,
            args: str
        }
    }

    // Is token a unary operation
    isUnaryOperator (token) {
        return token == '-' || token == '!';
    }

    // Get next token as unary operator
    getUnaryOperator () {
        return {
            op: SP_OPERATORS[this.get() == '-' ? 'u-' : '!'],
            args: [ this.getBlock() ]
        }
    }

    // Get token block
    getBlock () {
        return this.peek() == '(' ? this.getSubExpression() : this.getVal();
    }

    // Is global function
    isFunction (token, follow) {
        return /[_a-zA-Z]\w*/.test(token) && follow == '(';
    }

    // Get global function
    getFunction () {
        var name = this.get();
        this.get();

        var args = [];

        if (this.peek() == ')') {
            this.get();
            return {
                op: name,
                args: args
            };
        } else {
            do {
                args.push(this.evalExpression());
            } while (this.get() == ',');

            return {
                op: name,
                args: args
            }
        }
    }

    // Is array
    isArray (token) {
        return token == '[';
    }

    // Get array
    getArray () {
        this.get();

        var args = [];

        if (this.peek() == ']') {
            this.get();
            return {
                op: '[',
                args: args
            }
        }

        do {
            args.push({
                key: args.length,
                val: this.evalExpression()
            });
        } while (this.get() == ',');

        return {
            op: '[',
            args: args
        }
    }

    // Is object
    isObject (token) {
        return token == '{';
    }

    // Get array
    getObject () {
        this.get();

        var args = [];

        if (this.peek() == '}') {
            this.get();
            return {
                op: '{',
                args: args
            }
        }

        do {
            let key = this.peek(1) == ':' ? this.getString() : this.evalExpression();
            this.get();
            args.push({
                key: key,
                val: this.evalExpression()
            });
        } while (this.get() == ',');

        return {
            op: '{',
            args: args
        }
    }

    // Is object access
    isObjectAccess () {
        var token = this.peek();
        return token == '.' || token == '[';
    }

    // Get object access
    getObjectAccess (node) {
        var type = this.get();

        var name = undefined;
        if (type == '.') {
            name = this.getString(true);
        } else {
            name = this.evalExpression();
            this.get();
        }

        if (this.peek() == '(') {
            this.get();

            var args = [];

            if (this.peek() == ')') {
                this.get();
            } else {
                do {
                    args.push(this.evalExpression());
                } while (this.get() == ',');
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

    getVal () {
        var node = undefined;

        var token = this.peek();
        var follow = this.peek(1);

        if (token == undefined) {
            // Ignore undefined value
        } else if (this.isString(token)) {
            // Get string
            node = this.getString();
        } else if (this.isUnaryOperator(token)) {
            // Get unary operator
            node = this.getUnaryOperator();
        } else if (this.isFunction(token, follow)) {
            // Get function
            node = this.getFunction();
        } else if (this.isArray(token)) {
            // Get array
            node = this.getArray();
        } else if (this.isObject(token)) {
            // Get object
            node = this.getObject();
        } else {
            // Get node
            node = this.get();
        }

        while (this.isObjectAccess()) {
            // Get object access
            node = this.getObjectAccess(node);
        }

        return node;
    }

    getHighPriority () {
        let node = this.getBlock();
        while (['*', '/'].includes(this.peek())) {
            node = {
                op: SP_OPERATORS[this.get()],
                args: [node, this.getBlock()]
            }
        }

        return node;
    }

    getLowPriority () {
        let node = this.getHighPriority();
        while (['+', '-', '%'].includes(this.peek())) {
            node = {
                op: SP_OPERATORS[this.get()],
                args: [node, this.getHighPriority()]
            };
        }

        return node;
    }

    getBool () {
        let node = this.getLowPriority();
        while (['>', '<', '<=', '>=', '==', '!='].includes(this.peek())) {
            node = {
                op: SP_OPERATORS[this.get()],
                args: [node, this.getLowPriority()]
            }
        }

        return node;
    }

    getBoolMerge () {
        let node = this.getBool();
        while (['||', '&&'].includes(this.peek())) {
            node = {
                op: SP_OPERATORS[this.get()],
                args: [node, this.getBool()]
            };
        }

        return node;
    }

    getSubExpression () {
        this.get();
        let node = this.evalExpression();
        this.get();

        return node;
    }

    evalExpression () {
        let node = this.getBoolMerge();
        if (this.peek() == '?') {
            this.get();

            // First argument
            let arg1 = this.evalExpression();
            this.get();

            // Second argument
            let arg2 = this.evalExpression();

            // Create node
            node = {
                args: [node, arg1, arg2],
                op: SP_OPERATORS['?']
            };
        }

        return node;
    }

    // Check if the expression is valid (no tokens left)
    isValid () {
        return this.tokens.length == 0 && !this.empty;
    }

    // Stringify the expression
    toString (node = this.root) {
        if (typeof(node) == 'object') {
            if (node.raw) {
                return `str(${ node.args })`;
            } else if (node.op) {
                return `${ typeof(node.op) == 'string' ? node.op : node.op.name }(${ node.args.map(arg => typeof arg == 'undefined' ? 'undefined' : this.toString(arg)).join(', ') })`;
            } else {
                return `item(${ node.key }, ${ node.val })`;
            }
        } else {
            return node;
        }
    }

    checkCacheableNode (node) {
        if (typeof node == 'object') {
            if (node.op == 'var') {
                return false;
            } else if (node.op == '[a' && node.args && node.args[0] == 'header') {
                return false;
            } else {
                if (node.args && !node.raw) {
                    for (let arg of node.args) {
                        if (!this.checkCacheableNode(arg)) {
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
    postProcess (tableVariables, node) {
        if (typeof(node) == 'object' && !node.raw) {
            if (node.args) {
                for (var i = 0; i < node.args.length; i++) {
                    node.args[i] = this.postProcess(tableVariables, node.args[i]);
                }
            }

            if (node.op && SP_OPERATORS.hasOwnProperty(node.op.name) && node.args && node.args.filter(a => !isNaN(a) || (a != undefined && a.raw)).length == node.args.length) {
                return node.op(... node.args.map(a => a.raw ? a.args : a));
            } else if (node.op && SP_FUNCTIONS.hasOwnProperty(node.op) && node.args && node.args.filter(a => !isNaN(a) || (a != undefined && a.raw)).length == node.args.length) {
                let res = SP_FUNCTIONS[node.op](... node.args.map(a => a.raw ? a.args : a));
                return typeof res === 'string' ? this.wrapString(res) : res;
            }
        } else if (typeof node === 'string' && node in tableVariables && !isNaN(tableVariables[node].ast.root)) {
            return tableVariables[node].ast.root;
        }

        return node;
    }

    // Outside eval function (always call this from outside of the Expression class)
    eval (player, reference = undefined, environment = { functions: { }, variables: { }, constants: new Constants(), lists: { } }, scope = undefined, extra = undefined, functionScope = undefined, header = undefined) {
        /* PERFORMANCE THINGY */ PerformanceTracker.tick();
        this.subexpressions_cache_indexes = [];
        this.subexpressions_cache = [];
        if (functionScope || extra || scope || !this.cacheable) {
            return this.evalInternal(player, reference, environment, scope, extra, functionScope, header, this.root);
        } else {
            if (typeof this.index == 'undefined') {
                this.index = PerformanceTracker.getIndex(this.rstr);
            }

            let value = PerformanceTracker.cache_querry(this.index, player, reference);
            if (typeof value == 'undefined') {
                value = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, this.root);
                PerformanceTracker.cache_add(this.index, player, reference, value);
            } else {
                PerformanceTracker.hit();
            }

            return value;
        }
    }

    // Evaluate a node into array, used for array functions
    evalToArray (player, reference, environment, scope, extra, functionScope, header, node) {
        var generated = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node);
        if (!generated || typeof(generated) != 'object') {
            return [];
        } else {
            return Array.isArray(generated) ? generated : Object.values(generated);
        }
    }

    // Evaluate a node (beta)
    evalInternal (player, reference, environment, scope, extra, functionScope, header, node) {
        if (typeof(node) == 'object') {
            if (node.raw) {
                return node.args;
            } else if (typeof(node.op) == 'string') {
                if (node.op == 'format' && node.args.length > 0) {
                    var str = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var arg = node.args.slice(1).map(a => this.evalInternal(player, reference, environment, scope, extra, functionScope, header, a));

                    for (key in arg) {
                        str = str.replace(new RegExp(`\\{\\s*${ key }\\s*\\}`, 'gi'), arg[key]);
                    }

                    return str;
                } else if (node.op == 'at' && node.args.length == 2) {
                    var array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var arg = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[1]);

                    if (isNaN(arg)) {
                        return undefined;
                    } else {
                        if (arg < 0) arg = 0;
                        else if (arg > array.length - 1) {
                            arg = array.length - 1;
                        }

                        return array[arg];
                    }
                } else if (node.op == 'join' && node.args.length == 2) {
                    var array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var arg = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[1]);

                    return array.join(arg);
                } else if (node.op == 'indexof' && node.args.length == 2) {
                    let array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    let item = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[1]);

                    for (let i = 0; i < array.length; i++) {
                        if (array[i] == item) {
                            return i;
                        }
                    }

                    return -1;
                } else if (node.op == 'distinct' && node.args.length == 1) {
                    let array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    let values = Array.from(new Set(array));
                    values.segmented = array.segmented;

                    return values;
                } else if (node.op == 'sort' && node.args.length == 2) {
                    // Multiple array functions condensed
                    var array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var mapper = environment.functions[node.args[1]];
                    var values = [];

                    if (mapper) {
                        if (array.segmented) {
                            values = array.map(obj => {
                                return {
                                    key: mapper.ast.eval(obj[0], obj[1], environment, obj[0], mapper.args.reduce((c, a, i) => {
                                        c[a] = obj[i];
                                        return c;
                                    }, {}), functionScope, header),
                                    val: obj
                                };
                            });
                        } else {
                            values = array.map(obj => {
                                return {
                                    key: mapper.ast.eval(player, reference, environment, obj, mapper.args.reduce((c, a) => {
                                        c[a] = obj;
                                        return c;
                                    }, {}), functionScope, header),
                                    val: obj
                                };
                            });
                        }
                    } else {
                        if (array.segmented) {
                            values = array.map(obj => {
                                return {
                                    key: this.evalInternal(obj[0], obj[1], environment, obj[0], undefined, functionScope, header, node.args[1]),
                                    val: obj
                                };
                            });
                        } else {
                            values = array.map(obj => {
                                return {
                                    key: this.evalInternal(player, reference, environment, obj, obj, functionScope, header, node.args[1]),
                                    val: obj
                                };
                            });
                        }
                    }

                    values = values.sort((a, b) => b.key - a.key).map((a) => a.val);
                    values.segmented = array.segmented;

                    return values;
                } else if (['each', 'filter', 'map'].includes(node.op) && node.args.length == 2) {
                    // Multiple array functions condensed
                    var array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var mapper = environment.functions[node.args[1]];
                    var values = [];

                    // Does not allow 'this' in any scenario
                    if (mapper) {
                        if (array.segmented) {
                            values = array.map(obj => mapper.ast.eval(obj[0], obj[1], environment, obj[0], mapper.args.reduce((c, a, i) => {
                                c[a] = obj[i];
                                return c;
                            }, {})), functionScope, header);
                        } else {
                            values = array.map(obj => mapper.ast.eval(player, reference, environment, obj, mapper.args.reduce((c, a) => {
                                c[a] = obj;
                                return c;
                            }, {})), functionScope, header);
                        }
                    } else {
                        if (array.segmented) {
                            values = array.map(obj => this.evalInternal(obj[0], obj[1], environment, obj[0], undefined, functionScope, header, node.args[1]));
                        } else {
                            values = array.map(obj => this.evalInternal(player, reference, environment, obj, obj, functionScope, header, node.args[1]));
                        }
                    }

                    // Return correct result
                    switch (node.op) {
                        case 'each': return values.reduce((a, b) => a + b, 0);
                        case 'filter': return array.filter((a, i) => values[i]);
                        case 'map': return values;
                    }
                } else if (node.op == 'slice' && (node.args.length == 2 || node.args.length == 3)) {
                    // Simple slice
                    var array = this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var sliced = array.slice(node.args[1], node.args[2]);
                    sliced.segmented = array.segmented;
                    return sliced;
                } else if (node.op == 'array') {
                    // Simple toArray function
                    return this.evalToArray(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                } else if (node.op == '{' || node.op == '[') {
                    // Simple object or array constructor
                    var obj = node.op == '{' ? {} : [];

                    for (var { key, val } of node.args) {
                        obj[this.evalInternal(player, reference, environment, scope, extra, functionScope, header, key)] = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, val);
                    }

                    return obj;
                } else if (environment.functions[node.op]) {
                    var mapper = environment.functions[node.op];
                    var scope2 = {};
                    for (var i = 0; i < mapper.args.length; i++) {
                        scope2[mapper.args[i]] = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[i]);
                    }

                    return mapper.ast.eval(player, reference, environment, scope2, extra, scope2, header);
                } else if (node.op == 'difference' && node.args.length == 1) {
                    var a = this.evalInternal(player, reference, environment, player, extra, functionScope, header, node.args[0]);
                    var b = this.evalInternal(reference, reference, environment, reference, extra, functionScope, header, node.args[0]);

                    if (isNaN(a) || isNaN(b)) {
                        return undefined;
                    } else {
                        return a - b;
                    }
                } else if (node.op == '[a') {
                    var object = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    if (object) {
                        return object[this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[1])];
                    } else {
                        return undefined;
                    }
                } else if (node.op == '(a') {
                    var object = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    var func = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[1]);

                    if (object != undefined && object[func]) {
                        return object[func](... node.args[2].map(param => this.evalInternal(player, reference, environment, scope, extra, functionScope, header, param)));
                    } else {
                        return undefined;
                    }
                } else if (node.op == 'var' && node.args.length == 1) {
                    if (header && header.vars) {
                        return header.vars[node.args[0]];
                    } else {
                        return undefined;
                    }
                } else if (node.op == 'tracker' && node.args.length == 1) {
                    // Player tracker
                    if (player && Database.Profiles[player.Identifier] && Database.Profiles[player.Identifier][node.args[0]]) {
                        return Database.Profiles[player.Identifier][node.args[0]].out;
                    } else {
                        return undefined;
                    }
                } else if (SP_KEYWORDS.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple call
                    var obj = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    return obj ? SP_KEYWORDS[node.op].expr(obj, null, environment) : undefined;
                } else if (SP_KEYWORDS_INDIRECT.hasOwnProperty(node.op) && node.args.length == 1) {
                    // Simple indirect call
                    var obj = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, node.args[0]);
                    return obj ? SP_KEYWORDS_INDIRECT[node.op].expr(player, null, environment, obj) : undefined;
                } else if (SP_FUNCTIONS.hasOwnProperty(node.op)) {
                    // Predefined function
                    return SP_FUNCTIONS[node.op](... node.args.map(arg => this.evalInternal(player, reference, environment, scope, extra, functionScope, header, arg)));
                } else {
                    // Return undefined
                    return undefined;
                }
            } else if (node.op) {
                // Return processed node
                var value = node.op(... node.args.map(arg => this.evalInternal(player, reference, environment, scope, extra, functionScope, header, arg)));
                if (value == NaN) {
                    return undefined;
                } else {
                    return value;
                }
            } else {
                // Return node in case something does not work :(
                return node;
            }
        } else if (typeof(node) == 'string') {
            if (node == 'this') {
                // Return current scope
                return scope;
            } else if (node == 'player') {
                // Return current player
                return player;
            } else if (node == 'reference') {
                // Return reference player
                return reference;
            } else if (node == 'database') {
                // Return database
                return Database;
            } else if (node == 'entries') {
                if (player) {
                    return Database.getPlayer(player.Identifier).List.map(([ t, e ]) => e);
                } else {
                    return undefined;
                }
            } else if (node == 'header') {
                // Return current header
                return header;
            } else if (typeof node != 'undefined' && node.startsWith('~')) {
                // Return sub expressions
                let sub_index = parseInt(node.slice(1));
                if (sub_index < this.subexpressions.length) {
                    if (!this.subexpressions_cache_indexes.includes(sub_index)) {
                        this.subexpressions_cache_indexes.push(sub_index);
                        this.subexpressions_cache[sub_index] = this.evalInternal(player, reference, environment, scope, extra, functionScope, header, this.subexpressions[sub_index]);
                    }
                    return this.subexpressions_cache[sub_index];
                } else {
                    return undefined;
                }
            } else if (node == 'row_index') {
                // Return row index
                return environment && environment.row_indexes && player ? environment.row_indexes[`${ player.Identifier }_${ player.Timestamp }`] : undefined;
            } else if (SP_KEYWORDS_DEFAULT.hasOwnProperty(node)) {
                // Return default values
                return SP_KEYWORDS_DEFAULT[node];
            } else if (player && SP_KEYWORDS.hasOwnProperty(node)) {
                return SP_KEYWORDS[node].expr(player, reference, environment);
            } else if (player && SP_KEYWORDS_INDIRECT.hasOwnProperty(node)) {
                return SP_KEYWORDS_INDIRECT[node].expr(player, reference, environment, extra);
            } else if (extra && typeof(extra) == 'object' && extra[node] != undefined) {
                // Return extra variable (only if it exists)
                return extra[node];
            } else if (scope && typeof(scope) == 'object' && scope[node] != undefined) {
                // Return scope variable (only if it exists)
                return scope[node];
            } else if (functionScope && typeof(functionScope) == 'object' && functionScope[node] != undefined) {
                // Return function scope variable (only if exists)
                return functionScope[node];
            } else if (environment.variables[node] != undefined) {
                // Return environment variable
                if (environment.variables[node].value != undefined) {
                    return environment.variables[node].value;
                } else if (environment.variables[node].ast) {
                    return environment.variables[node].ast.eval(player, reference, environment);
                } else {
                    return undefined;
                }
            } else if (environment.lists.hasOwnProperty(node)) {
                return environment.lists[node];
            } else if (environment.constants.exists(node)) {
                // Return constant
                return environment.constants.get(node);
            } else {
                // Return enum or undefined if everything fails
                return SP_ENUMS[node];
            }
        } else {
            return node;
        }
    }
}

const SP_FUNCTIONS = {
    // Truncate number
    'trunc': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.trunc(value);
        }
    },
    // Ceiling
    'ceil': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.ceil(value);
        }
    },
    // Floor
    'floor': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.floor(value);
        }
    },
    // Round default or round to a number
    'round': (value, div) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(div)) {
                return Math.round(value);
            } else {
                return Math.round(value / div) * div;
            }
        }
    },
    // Abs
    'abs': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return Math.abs(value);
        }
    },
    // Fixed format
    'fixed': (value, decimals) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(decimals)) {
                decimal = 0;
            }

            return value.toFixed(decimals);
        }
    },
    // DateTime string
    'datetime': (value) => {
        if (isNaN(value) || value < 0) {
            return undefined;
        } else {
            return formatDate(value);
        }
    },
    // Duration string
    'duration': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return formatDuration(value);
        }
    },
    // Date string
    'date': (value) => {
        if (isNaN(value) || value < 0) {
            return undefined;
        } else {
            return formatDateOnly(value);
        }
    },
    // Spaced number
    'fnumber': (value, delim) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (delim == undefined) {
                delim = '&nbsp';
            }

            return formatAsSpacedNumber(value, delim);
        }
    },
    // Exponential number
    'enumber': (value, decimals) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            if (isNaN(decimals)) {
                decimals = 0;
            }

            return value.toExponential(decimals);
        }
    },
    // Named number
    'nnumber': (value) => {
        if (isNaN(value)) {
            return undefined;
        } else {
            return formatAsNamedNumber(value);
        }
    },
    // Small
    'small': (value) => {
        return CellGenerator.Small(value);
    },
    // Minimum
    'min': (... values) => {
        return Math.min(... values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector.push(... value);
            } else {
                collector.push(value);
            }

            return collector;
        }, []));
    },
    // Maximum
    'max': (... values) => {
        return Math.max(... values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector.push(... value);
            } else {
                collector.push(value);
            }

            return collector;
        }, []));
    },
    // Sum
    'sum': (... values) => {
        return values.reduce((collector, value) => {
            if (Array.isArray(value)) {
                collector += value.reduce((a, b) => a + b, 0);
            } else {
                collector += value;
            }

            return collector;
        }, 0);
    },
    // Current timestamp
    'now': () => {
        return Date.now();
    },
    // Random
    'random': () => {
        return Math.random();
    },
    // Debug Log
    'log': (value) => {
        console.log(value);

        return value;
    },
    // Strigify
    'stringify': (value) => {
        return String(value);
    },
    // Range
    'range': (min, max, value) => {
        if (isNaN(min) || isNaN(max) || isNaN(value)) {
            return undefined;
        } else {
            return (max - min) * value + min;
        }
    },
    // Len or Size of array/object
    'len': (value) => {
        if (typeof(value) != 'object') {
            return undefined;
        } else {
            if (Array.isArray(value)) {
                return value.length;
            } else {
                return Object.keys(value).length;
            }
        }
    },
    'average': (... values) => {
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
    },
    // RGB
    'rgb': (r, g, b) => {
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return undefined;
        } else {
            return getColorFromRGBA(r, g, b);
        }
    },
    // RGB
    'rgba': (r, g, b, a) => {
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
            return undefined;
        } else {
            return getColorFromRGBA(r, g, b, a);
        }
    },
    // Gradient
    'gradient': (from, to, value) => {
        if (typeof(from) == 'object' && !isNaN(to)) {
            return getColorFromGradientObj(from, to);
        } else if (from == undefined || to == undefined || isNaN(value)) {
            return undefined;
        } else {
            return getColorFromGradient(from, to, value);
        }
    },
    // Dual background
    'dualcolor': (width, color1, color2) => {
        if (!isNaN(width) && typeof(color1) == 'string' && typeof(color2) == 'string') {
            width = parseInt(width);
            width = width > 100 ? 100 : (width < 1 ? 1 : width);

            return `linear-gradient(90deg, ${ getCSSColor(color1) } ${ width }%, ${ getCSSColor(color2) } ${ width }%)`;
        } else {
            return undefined;
        }
    },
    // Linear css gradient
    'lingradient': (degrees, ... segments) => {
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
    },
    // Total attribute price
    'statsum': (attribute) => {
        if (!isNaN(attribute)) {
            return calculateTotalAttributePrice(parseInt(attribute));
        } else {
            return undefined;
        }
    },
    // Attribute price
    'statcost': (attribute) => {
        if (!isNaN(attribute)) {
            return calculateAttributePrice(parseInt(attribute));
        } else {
            return undefined;
        }
    },
    // Experience needed
    'expneeded': (level) => {
        if (!isNaN(level)) {
            return ExperienceTotal[Math.min(393, level)] + Math.max(0, level - 393) * 1500000000;
        } else {
            return undefined;
        }
    },
    // Create empty array
    'makearray': (size, def = 0) => {
        if (!isNaN(size)) {
            return new Array(size).fill(def);
        } else {
            return undefined;
        }
    },
    // Create array with sequence
    'makesequence': (from, to) => {
        if (!isNaN(from) && !isNaN(to)) {
            let len = to - from + 1;
            return new Array(len).fill(0).map((x, i) => from + i);
        } else {
            return undefined;
        }
    },
    // Parse number
    'number': (value) => {
        return Number(value);
    }
}

const SP_OPERATORS = {
    '*': (a, b) => a * b,
    '/': (a, b) => b == 0 ? 0 : (a / b),
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
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
};

const SP_KEYWORD_MAPPING_0 = {
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
        expr: p => p.Group ? p.Group.ID : '',
        difference: false,
        statistics: false
    },
    'Guild Identifier': {
        expr: p => p.Group ? p.Group.Identifier : '',
        difference: false,
        statistics: false
    },
    'Guild Rank': {
        expr: p => p.Group ? p.Group.Rank : '',
        difference: false,
        statistics: false
    },
    'Role': {
        expr: p => p.Group.Role,
        flip: true,
        format: (p, c, e, x) => p.hasGuild() ? GROUP_ROLES[p.Group.Role] : '',
        difference: false,
        statistics: false
    },
    'Level': {
        expr: p => p.Level
    },
    'Guild': {
        expr: p => p.Group.Name || '',
        difference: false,
        statistics: false
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
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Strength Cost': {
        expr: p => p.Strength.NextCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Dexterity Cost': {
        expr: p => p.Dexterity.NextCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Intelligence Cost': {
        expr: p => p.Intelligence.NextCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Constitution Cost': {
        expr: p => p.Constitution.NextCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Luck Cost': {
        expr: p => p.Luck.NextCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Base Total Cost': {
        expr: p => p.Primary.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Strength Total Cost': {
        expr: p => p.Strength.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Dexterity Total Cost': {
        expr: p => p.Dexterity.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Intelligence Total Cost': {
        expr: p => p.Intelligence.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Constitution Total Cost': {
        expr: p => p.Constitution.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
    },
    'Luck Total Cost': {
        expr: p => p.Luck.TotalCost,
        format: (p, c, e, x) => formatAsSpacedNumber(x)
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
        format: (p, c, e, x) => x ? 'Yes' : 'No'
    },
    'Life Potion Index': {
        expr: p => p.Potions.LifeIndex,
        difference: false,
        statistics: false
    },
    'Runes': {
        expr: p => p.Runes.Runes,
        format: (p, c, e, x) => `e${ x }`,
        width: 100
    },
    'Action Index': {
        expr: p => p.Action.Index,
        difference: false,
        statistics: false
    },
    'Status': {
        expr: p => p.Action.Status,
        format: (p, c, e, x) => PLAYER_ACTIONS[x],
        difference: false,
        statistics: false
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: (p, c, e, x) => x <= 0 ? '' : formatDate(x),
        width: 160,
        difference: false,
        statistics: false
    },
    'Action Unclaimed': {
        expr: p => p.OriginalAction.Status < 0,
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
        expr: p => p.Dungeons.Tower
    },
    'Raids': {
        expr: p => p.Dungeons.Raid
    },
    'Portal': {
        expr: p => p.Dungeons.Player
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
        format: (p, c, e, x) => PLAYER_CLASS[x],
        difference: false,
        flip: true,
        statistics: false
    },
    'Rank': {
        expr: p => p.Rank,
        flip: true
    },
    'Mount': {
        expr: p => p.Mount,
        format: (p, c, e, x) => x ? (PLAYER_MOUNT[x] + '%') : '',
        difference: false
    },
    'Awards': {
        expr: p => p.Achievements.Owned
    },
    'Album': {
        expr: p => Math.ceil(10000 * p.Book / SCRAPBOOK_COUNT) / 100,
        format: (p, c, e, x) => x.toFixed(2) + '%',
        width: 130,
        decimal: true
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
        format: (p, c, e, x) => FORTRESS_BUILDINGS[x] || '',
        difference: false,
        statistics: false
    },
    'Building Finish': {
        expr: p => p.Fortress.Upgrade.Finish,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
        difference: false,
        statistics: false
    },
    'Building Start': {
        expr: p => p.Fortress.Upgrade.Start,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
        difference: false,
        statistics: false
    },
    'Last Active': {
        expr: p => p.LastOnline,
        format: (p, c, e, x) => formatDate(x),
        width: 160,
        difference: false,
        statistics: false
    },
    'Inactive Time': {
        expr: p => p.Timestamp - p.LastOnline,
        format: (p, c, e, x) => formatDuration(x),
        flip: true,
        difference: false,
        statistics: false
    },
    'Timestamp': {
        expr: p => p.Timestamp,
        format: (p, c, e, x) => formatDate(x),
        difference: false,
        statistics: false
    },
    'Guild Joined': {
        expr: p => p.Group.Joined,
        format: (p, c, e, x) => p.hasGuild() ? formatDate(x) : '',
        difference: false,
        statistics: false
    },
    '1 Catacombs': {
        expr: p => Math.max(0, p.Dungeons.Normal[0] - 2)
    },
    '2 Mines': {
        expr: p => Math.max(0, p.Dungeons.Normal[1] - 2)
    },
    '3 Ruins': {
        expr: p => Math.max(0, p.Dungeons.Normal[2] - 2)
    },
    '4 Grotto': {
        expr: p => Math.max(0, p.Dungeons.Normal[3] - 2)
    },
    '5 Altar': {
        expr: p => Math.max(0, p.Dungeons.Normal[4] - 2)
    },
    '6 Tree': {
        expr: p => Math.max(0, p.Dungeons.Normal[5] - 2)
    },
    '7 Magma': {
        expr: p => Math.max(0, p.Dungeons.Normal[6] - 2)
    },
    '8 Temple': {
        expr: p => Math.max(0, p.Dungeons.Normal[7] - 2)
    },
    '9 Pyramid': {
        expr: p => Math.max(0, p.Dungeons.Normal[8] - 2)
    },
    '10 Circus': {
        expr: p => Math.max(0, p.Dungeons.Normal[9] - 2)
    },
    '11 Fortress': {
        expr: p => Math.max(0, p.Dungeons.Normal[10] - 2)
    },
    '12 Hell': {
        expr: p => Math.max(0, p.Dungeons.Normal[11] - 2)
    },
    '13 Floor': {
        expr: p => Math.max(0, p.Dungeons.Normal[12] - 2)
    },
    '14 Easteros': {
        expr: p => Math.max(0, p.Dungeons.Normal[13] - 2)
    },
    'S1 Catacombs': {
        expr: p => Math.max(0, p.Dungeons.Shadow[0] - 2)
    },
    'S2 Mines': {
        expr: p => Math.max(0, p.Dungeons.Shadow[1] - 2)
    },
    'S3 Ruins': {
        expr: p => Math.max(0, p.Dungeons.Shadow[2] - 2)
    },
    'S4 Grotto': {
        expr: p => Math.max(0, p.Dungeons.Shadow[3] - 2)
    },
    'S5 Altar': {
        expr: p => Math.max(0, p.Dungeons.Shadow[4] - 2)
    },
    'S6 Tree': {
        expr: p => Math.max(0, p.Dungeons.Shadow[5] - 2)
    },
    'S7 Magma': {
        expr: p => Math.max(0, p.Dungeons.Shadow[6] - 2)
    },
    'S8 Temple': {
        expr: p => Math.max(0, p.Dungeons.Shadow[7] - 2)
    },
    'S9 Pyramid': {
        expr: p => Math.max(0, p.Dungeons.Shadow[8] - 2)
    },
    'S10 Circus': {
        expr: p => Math.max(0, p.Dungeons.Shadow[9] - 2)
    },
    'S11 Fortress': {
        expr: p => Math.max(0, p.Dungeons.Shadow[10] - 2)
    },
    'S12 Hell': {
        expr: p => Math.max(0, p.Dungeons.Shadow[11] - 2)
    },
    'S13 Floor': {
        expr: p => Math.max(0, p.Dungeons.Shadow[12] - 2)
    },
    'S14 Easteros': {
        expr: p => Math.max(0, p.Dungeons.Shadow[13] - 2)
    },
    'Achievements': {
        expr: p => p.Achievements.Owned
    },
    'Pets Unlocked': {
        expr: p => p.Achievements[36].Owned,
        format: (p, c, e, x) => x ? 'Yes' : 'No',
        difference: false,
        statistics: false
    },
    'Grail Unlocked': {
        expr: p => p.Achievements[76].Owned,
        format: (p, c, e, x) => x ? 'Yes' : 'No',
        difference: false,
        statistics: false
    },
    'Hydra Dead': {
        expr: p => p.Achievements[63].Owned,
        format: (p, c, e, x) => x ? 'Yes' : 'No',
        difference: false,
        statistics: false
    },
    'XP': {
        expr: p => p.XP,
        format: (p, c, e, x) => formatAsSpacedNumber(x),
        format_diff: true,
        statistics: false
    },
    'XP Required': {
        expr: p => p.XPNext,
        format: (p, c, e, x) => formatAsSpacedNumber(x),
        format_diff: true,
        statistics: false
    },
    'XP Total': {
        expr: p => p.XPTotal,
        format: (p, c, e, x) => formatAsSpacedNumber(x),
        format_diff: true,
        statistics: false
    },
    'Enchantments': {
        expr: p => Object.values(p.Items).reduce((col, i) => col + (i.HasEnchantment ? 1 : 0), 0)
    },
    'Archeological Aura': {
        expr: p => p.Items.Head.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Marios Beard': {
        expr: p => p.Items.Body.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Shadow of the Cowboy': {
        expr: p => p.Items.Hand.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    '36960 Feet Boots': {
        expr: p => p.Items.Feet.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Unholy Acquisitiveness': {
        expr: p => p.Items.Neck.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Thirsty Wanderer': {
        expr: p => p.Items.Belt.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Grave Robbers Prayer': {
        expr: p => p.Items.Ring.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Robber Baron Ritual': {
        expr: p => p.Items.Misc.HasEnchantment ? 1 : 0,
        difference: false,
        statistics: false
    },
    'Sword of Vengeance': {
        expr: p => (p.Items.Wpn1.HasEnchantment ? 1 : 0) + (p.Items.Wpn2.HasEnchantment ? 1 : 0),
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
        format: (p, c, e, x) => POTIONS[x],
        difference: false,
        statistics: false
    },
    'Potion 2 Type': {
        expr: p => p.Potions[1].Type,
        format: (p, c, e, x) => POTIONS[x],
        difference: false,
        statistics: false
    },
    'Potion 3 Type': {
        expr: p => p.Potions[2].Type,
        format: (p, c, e, x) => POTIONS[x],
        difference: false,
        statistics: false
    },
    'Mask': {
        expr: p => p.Mask,
        format: (p, c, e, x) => MASK_TYPES[x],
        difference: false,
        statistics: false
    }
};

const SP_SPECIAL_CONDITIONS = {
    'Knights': [
        {
            condition: h => h.maximum,
            apply: h => {
                h.value.format = (p, c, e, x) => p ? `${ p.Fortress.Knights }/${ p.Fortress.Fortress }` : x
            }
        }
    ],
    'Awards': [
        {
            condition: h => h.hydra,
            apply: h => {
                h.value.extra = p => p && p.Achievements.Dehydration ? CellGenerator.Small(' H') : ''
            }
        }
    ],
    'Album': [
        {
            condition: h => h.grail,
            apply: h => {
                h.value.extra = p => p && p.Achievements.Grail ? CellGenerator.Small(' G') : ''
            }
        }
    ]
};

// Protected
const SP_KEYWORD_MAPPING_1 = {
    'Knights': {
        expr: p => p.Fortress.Knights
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
        expr: p => p.Group.Group ? p.Group.Group.PortalFloor : undefined
    },
    'Guild Portal Life': {
        expr: p => p.Group.Group ? p.Group.Group.PortalLife : undefined
    },
    'Guild Portal Percent': {
        expr: p => p.Group.Group ? p.Group.Group.PortalPercent : undefined
    }
};

// Private
const SP_KEYWORD_MAPPING_2 = {
    'Mount Expire': {
        expr: p => p.MountExpire,
        format: (p, c, e, x) => x ? formatDate(x) : '?',
        difference: false,
        statistics: false
    },
    'Wood': {
        expr: p => p.Fortress.Wood
    },
    'Stone': {
        expr: p => p.Fortress.Stone
    },
    'Aura': {
        expr: p => p.Toilet.Aura,
        statistics: false
    },
    'Toilet Fill': {
        expr: p => p.Toilet.Fill,
        statistics: false
    },
    'Twister': {
        expr: p => p.Dungeons.Twister ? Math.max(0, p.Dungeons.Twister - 2) : undefined,
        statistics: false
    },
    'Shrooms': {
        expr: p => p.Mushrooms ? p.Mushrooms.Current : undefined,
        statistics: false
    },
    'Coins': {
        expr: p => p.Coins,
        statistics: false
    },
    'Shrooms Total': {
        expr: p => p.Mushrooms ? p.Mushrooms.Total : undefined,
        statistics: false
    },
    'Shrooms Free': {
        expr: p => p.Mushrooms ? p.Mushrooms.Free : undefined,
        statistics: false
    },
    'Shrooms Paid': {
        expr: p => p.Mushrooms ? p.Mushrooms.Paid : undefined,
        statistics: false
    },
    'Hourglass': {
        expr: p => p.Hourglass,
        statistics: false
    },
    'Own Dungeon': {
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Normal.Total : undefined,
        statistics: false,
        width: 120
    },
    'Youtube': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Youtube - 2) : undefined,
        statistics: false,
        width: 120
    },
    'Own Shadow': {
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Shadow.Total : undefined,
        statistics: false,
        width: 120
    },
    'Own Dungeon Unlocked': {
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Normal.Unlocked : undefined,
        statistics: false,
        width: 120
    },
    'Own Shadow Unlocked': {
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Shadow.Unlocked : undefined,
        statistics: false,
        width: 120
    },
    'Potion Expire': {
        expr: p => p.Own ? (p.Potions[0].Size == 0 ? 0 : Math.min(... (p.Potions.filter(pot => pot.Size > 0).map(pot => pot.Expire)))) : undefined,
        format: (p, c, e, x) => x == undefined ? '?' : formatDate(x),
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
    '15 Academy': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Normal[0] - 2) : undefined
    },
    '16 Hemorridor': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Normal[1] - 2) : undefined
    },
    '17 Nordic': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Normal[2] - 2) : undefined
    },
    '18 Greek': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Normal[3] - 2) : undefined
    },
    'S15 Academy': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Shadow[0] - 2) : undefined
    },
    'S16 Hemorridor': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Shadow[1] - 2) : undefined
    },
    'S17 Nordic': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Shadow[2] - 2) : undefined
    },
    'S18 Greek': {
        expr: p => p.Dungeons.Extra ? Math.max(0, p.Dungeons.Extra.Shadow[3] - 2) : undefined
    },
    'Scrolls': {
        expr: p => p.Witch.Stage
    },
    'Scroll Finish' : {
        expr: p => p.Witch.Finish,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
        difference: false,
        statistics: false,
        width: 160
    },
    'Witch Items': {
        expr: p => p.Witch.Items
    },
    'Witch Items Required': {
        expr: p => p.Witch.ItemsNext
    },
    'Registered': {
        expr: p => p.Registered,
        format: (p, c, e, x) => x ? formatDate(x) : '',
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
    'Torture Chamber': {
        expr: p => p.Underworld ? p.Underworld.Torture : undefined,
        statistics: false
    },
    'Gladiator Trainer': {
        expr: p => p.Underworld ? p.Underworld.Gladiator : undefined,
        statistics: false
    },
    'Gladiator': {
        expr: p => p.Underworld ? p.Underworld.Gladiator : undefined,
        statistics: false
    },
    'Troll Block': {
        expr: p => p.Underworld ? p.Underworld.TrollBlock : undefined,
        statistics: false
    },
    'Time Machine': {
        expr: p => p.Underworld ? p.Underworld.TimeMachine : undefined,
        statistics: false
    },
    'Keeper': {
        expr: p => p.Underworld ? p.Underworld.Keeper : undefined,
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
        format: (p, c, e, x) => x ? formatAsSpacedNumber(x) : undefined,
        statistics: false
    },
    'Gold Pit Hourly': {
        expr: p => p.Underworld ? p.Underworld.GoldPitHourly : undefined,
        format: (p, c, e, x) => x ? formatAsSpacedNumber(x) : undefined,
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
        expr: p => p.Underworld ? p.Underworld.TimeMachineDaily : undefined,
        statistics: false
    },
    'Underworld Building': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Building : 0,
        width: 180,
        format: (p, c, e, x) => UNDERWORLD_BUILDINGS[x] || '',
        difference: false,
        statistics: false
    },
    'Underworld Building Finish': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Finish : -1,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
        difference: false,
        statistics: false
    },
    'Underworld Building Start': {
        expr: p => p.Underworld ? p.Underworld.Upgrade.Start : -1,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
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
    'Sacrifices': {
        expr: p => p.Idle ? p.Idle.Sacrifices : undefined,
        statistics: false
    },
    'Money': {
        expr: p => p.Idle ? p.Idle.Money : undefined,
        format: (p, c, e, x) => x.toExponential(3),
        difference: false,
        statistics: false
    },
    'Runes Collected': {
        expr: p => p.Idle ? p.Idle.Runes : undefined,
        format: (p, c, e, x) => x.toExponential(3),
        difference: false,
        statistics: false
    },
    'Runes Ready': {
        expr: p => p.Idle ? p.Idle.ReadyRunes : undefined,
        format: (p, c, e, x) => x.toExponential(3),
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
    }
};

// Special
const SP_KEYWORD_MAPPING_3 = {
    'Simulator Avg': {
        expr: (p, c, e) => {
            if (e.variables.Simulator && e.variables.Simulator.value[p.Identifier]) {
                return e.variables.Simulator.value[p.Identifier].avg;
            } else {
                return undefined;
            }
        },
        alias: 'Win Avg %',
        width: 120,
        format: (p, c, e, x) => `${ (x).toFixed(2) }%`
    },
    'Simulator Min': {
        expr: (p, c, e) => {
            if (e.variables.Simulator && e.variables.Simulator.value[p.Identifier]) {
                return e.variables.Simulator.value[p.Identifier].min;
            } else {
                return undefined;
            }
        },
        alias: 'Win Min %',
        width: 120,
        format: (p, c, e, x) => `${ (x).toFixed(2) }%`
    },
    'Simulator Max': {
        expr: (p, c, e) => {
            if (e.variables.Simulator && e.variables.Simulator.value[p.Identifier]) {
                return e.variables.Simulator.value[p.Identifier].max;
            } else {
                return undefined;
            }
        },
        alias: 'Win Max %',
        width: 120,
        format: (p, c, e, x) => `${ (x).toFixed(2) }%`
    }
}

// Itemized
const SP_KEYWORD_MAPPING_4 = {
    'Item Strength': {
        expr: (p, c, e, i) => i.Strength.Value,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Dexterity': {
        expr: (p, c, e, i) => i.Dexterity.Value,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Intelligence': {
        expr: (p, c, e, i) => i.Intelligence.Value,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Constitution': {
        expr: (p, c, e, i) => i.Constitution.Value,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Luck': {
        expr: (p, c, e, i) => i.Luck.Value,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Attribute': {
        expr: (p, c, e, i) => {
            switch (p.Primary.Type) {
                case 1: return i.Strength.Value;
                case 2: return i.Dexterity.Value;
                case 3: return i.Intelligence.Value;
                default: return 0;
            }
        },
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Type': {
        expr: (p, c, e, i) => i.Type,
        format: (p, c, e, x) => ITEM_TYPES[x],
        difference: false
    },
    'Item Upgrades': {
        expr: (p, c, e, i) => i.Upgrades,
        format: (p, c, e, x) => x == 0 ? '' : x
    },
    'Item Rune': {
        expr: (p, c, e, i) => i.RuneType,
        width: 180,
        format: (p, c, e, x) => RUNETYPES[x],
        difference: false
    },
    'Item Rune Value': {
        expr: (p, c, e, i) => i.RuneValue,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gem': {
        expr: (p, c, e, i) => i.GemType,
        format: (p, c, e, x) => GEMTYPES[x],
        difference: false
    },
    'Item Gem Value': {
        expr: (p, c, e, i) => i.GemValue,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gold': {
        expr: (p, c, e, i) => i.SellPrice.Gold,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Crystal': {
        expr: (p, c, e, i) => i.SellPrice.Crystal,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Metal': {
        expr: (p, c, e, i) => i.SellPrice.Metal,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Crystal': {
        expr: (p, c, e, i) => i.DismantlePrice.Crystal,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Metal': {
        expr: (p, c, e, i) => i.DismantlePrice.Metal,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Name': {
        expr: (p, c, e, i) => i.Slot,
        format: (p, c, e, x) => x == 2 && p.Class == 4 ? ITEM_TYPES[1] : ITEM_TYPES[x],
        difference: false
    },
    'Potion Type': {
        expr: (p, c, e, i) => i.Type,
        format: (p, c, e, x) => POTIONS[x],
        difference: false
    },
    'Potion Size': {
        expr: (p, c, e, i) => i.Size,
        format: (p, c, e, x) => x == 0 ? '' : x,
        difference: false
    }
};

// itemizable
const SP_KEYWORD_MAPPING_5 = {
    'Items': {
        expr: p => p.Items
    },
    'Potions': {
        expr: p => p.Potions
    },
    'Dummy': {
        expr: p => p.Inventory ? p.Inventory.Dummy : undefined
    },
    'Backpack': {
        expr: p => p.Inventory ? p.Inventory.Backpack : undefined
    },
    'Chest': {
        expr: p => p.Inventory ? p.Inventory.Chest : undefined
    },
    'Bert Items': {
        expr: p => p.Inventory ? p.Inventory.Bert : undefined
    },
    'Kunigunde Items': {
        expr: p => p.Inventory ? p.Inventory.Kunigunde : undefined
    },
    'Mark Items': {
        expr: p => p.Inventory ? p.Inventory.Mark : undefined
    }
};

const SP_KEYWORD_MAPPING_5_HO = {
    'Potions': {
        expr: p => p.Potions.map(x => x.Size),
        visible: false,
        difference: false,
        width: 33,
        grouped: 3
    }
}

const SP_KEYWORDS = {};
mergeSoft(SP_KEYWORDS, SP_KEYWORD_MAPPING_0);
mergeSoft(SP_KEYWORDS, SP_KEYWORD_MAPPING_1);
mergeSoft(SP_KEYWORDS, SP_KEYWORD_MAPPING_2);
mergeSoft(SP_KEYWORDS, SP_KEYWORD_MAPPING_3);
mergeSoft(SP_KEYWORDS, SP_KEYWORD_MAPPING_5);

const SP_KEYWORDS_INDIRECT = {};
mergeSoft(SP_KEYWORDS_INDIRECT, SP_KEYWORD_MAPPING_4);

const SP_KEYWORDS_DEFAULT = {
    'undefined': undefined,
    'null': null,
    'true': true,
    'false': false
};
