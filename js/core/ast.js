const AST_OPERATORS = {
    '*': a => a[0] * a[1],
    '/': a => a[0] / a[1],
    '+': a => a[0] + a[1],
    '-': a => a[0] - a[1],
    '>': a => a[0] > a[1],
    '<': a => a[0] < a[1],
    '==': a => a[0] == a[1],
    '!=': a => a[0] != a[1],
    '>=': a => a[0] >= a[1],
    '<=': a => a[0] <= a[1],
    '||': a => a[0] || a[1],
    '&&': a => a[0] && a[1],
    '%': a => a[0] % a[1],
    '?': a => a[0] ? a[1] : a[2],
    'u-': a => -a[0],
    's': a => a[0],
    '!': a => a[0] ? false : true
};

const AST_FUNCTIONS = {
    'trunc': (a) => Math.trunc(a[0]),
    'ceil': (a) => Math.ceil(a[0]),
    'floor': (a) => Math.floor(a[0]),
    'round': (a) => isNaN(a[1]) ? Math.round(a[0]) : (Math.round(a[0] / a[1]) * a[1]),
    'abs': (a) => Math.abs(a[0]),
    'fixed': (a) => a[0].toFixed(a[1]),
    'datetime': (a) => formatDate(a[0]),
    'number': (a) => Number.isInteger(a[0]) ? a[0] : a[0].toFixed(2),
    'duration': (a) => formatDuration(a[0]),
    'date': (a) => formatDateOnly(a[0]),
    'fnumber': (a) => formatAsSpacedNumber(a[0], a[1] != undefined ? a[1] : '&nbsp'),
    'small': (a) => CellGenerator.Small(a[0]),
    'min': (a) => Array.isArray(a[0]) ? Math.min(... a[0]) : Math.min(... a),
    'max': (a) => Array.isArray(a[0]) ? Math.max(... a[0]) : Math.max(... a),
    'sum': (a) => Array.isArray(a[0]) ? a[0].reduce((t, a) => t + a, 0) : a.reduce((t, a) => t + a, 0),
    'now': (a) => Date.now(),
    'len': (a) => a[0] != undefined ? (Array.isArray(a[0]) ? a[0].length : Object.values(a[0]).length) : undefined,
    'rgb': (a) => getColorFromRGBA(a[0], a[1], a[2]),
    'rgba': (a) => getColorFromRGBA(a[0], a[1], a[2], a[3]),
    'range': (a) => (a[1] - a[0]) * a[2] + a[0],
    'stringify': (a) => String(a[0]),
    'gradient': (a) => (a[2] == undefined && typeof(a[0]) == 'object') ? getColorFromGradientObj(a[0], a[1]) : getColorFromGradient(a[0], a[1], a[2]),
    'random': (a) => Math.random(),
    'log': (a) => {
        console.log(a[0]);
        return a[0];
    }
};

const AST_REGEXP = /(\'[^\']*\'|\"[^\"]*\"|\{|\}|\|\||\%|\!\=|\!|\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|(?<!\.)\d+\.\d+|\.|\[|\]|\,)/;

class AST {
    constructor (string) {
        this.tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(AST_REGEXP).map(token => token.trim()).filter(token => token.length);
        if (this.tokens.length == 0) {
            this.root = false;
            this.empty = true;
        } else {
            this.root = this.evalExpression();
        }
    }

    static format (string, constants = new Constants(), vars = []) {
        var content = '';
        var tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(AST_REGEXP);

        for (var i = 0, token, value; i < tokens.length; i++) {
            token = tokens[i];
            if (/\S/.test(token)) {
                var [, prefix, token, suffix] = token.match(/(\s*)(.*\S)(\s*)/);
                token = token.replace(/\u2023/g, '\\\"').replace(/\u2043/g, '\\\'');

                if (token != undefined && token.length > 1 && ['\'', '\"'].includes(token[0]) && ['\'', '\"'].includes(token[token.length - 1])) {
                    value = token[0] + SFormat.Comment(token.slice(1, token.length - 1)) + token[token.length - 1];
                } else if (AST_FUNCTIONS.hasOwnProperty(token) || ['each', 'map', 'slice', 'this', 'undefined', 'null', 'filter', 'format', 'difference'].includes(token)) {
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
                } else if (constants.isValid(token[0], token.slice(1))) {
                    value = SFormat.Constant(token);
                } else if (SP_ENUMS.hasOwnProperty(token)) {
                    value = SFormat.Enum(token);
                } else if (token == 'reference') {
                    value = SFormat.Constant('reference');
                } else if (token == 'player') {
                    value = SFormat.Constant('player');
                } else if (vars.includes(token)) {
                    value = SFormat.Constant(token);
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

    peek (i) {
        return this.tokens[i || 0];
    }

    get () {
        var v = this.tokens.shift();
        if (isNaN(v)) {
            return v;
        } else {
            return Number(v);
        }
    }

    getRoot () {
        return this.root;
    }

    getSingle () {
        var val = this.get();
        if (val[0] == '\"' || val[0] == '\'') {
            val = {
                args: [ val.slice(1, val.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\'') ],
                op: AST_OPERATORS['s'],
                noeval: true
            }
        }

        return val;
    }

    getVal () {
        var val = this.get();
        if ((val[0] == '\"' && val[val.length - 1] == '\"') || (val[0] == '\'' && val[val.length - 1] == '\'')) {
            val = {
                args: [ val.slice(1, val.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\'') ],
                op: AST_OPERATORS['s'],
                noeval: true
            }
        } else if (val == '-') {
            val = {
                args: [ this.peek() == '(' ? this.evalBracketExpression() : this.getVal() ],
                op: AST_OPERATORS['u-']
            }
        } else if (val == '!') {
            val = {
                args: [ this.peek() == '(' ? this.evalBracketExpression() : this.getVal() ],
                op: AST_OPERATORS['!']
            };
        } else if (AST_FUNCTIONS[val] || (/\w+/.test(val) && this.peek() == '(')) {
            var a = [];
            this.get();

            if (this.peek() == ')') {
                this.get();
                val = {
                    args: a,
                    op: AST_FUNCTIONS[val] ? AST_FUNCTIONS[val] : val
                };
            } else {
                a.push(this.evalExpression());
                while (this.peek() == ',') {
                    this.get();
                    a.push(this.evalExpression());
                }

                this.get();
                val = {
                    args: a,
                    op: AST_FUNCTIONS[val] ? AST_FUNCTIONS[val] : val
                };
            }
        } else if (val == '{') {
            var a = [];

            if (this.peek(1) == ':') {
                var o = {
                    key: this.getSingle()
                };
                this.get();
                o.val = this.evalExpression();
                a.push(o);
            } else {
                a.push({
                    key: a.length,
                    val: this.evalExpression()
                });
            }

            while (this.peek() == ',') {
                this.get();

                if (this.peek(1) == ':') {
                    var o = {
                        key: this.getSingle()
                    };
                    this.get();
                    o.val = this.evalExpression();
                    a.push(o);
                } else {
                    a.push({
                        key: a.length,
                        val: this.evalExpression()
                    });
                }
            }

            this.get();

            val = {
                args: a,
                op: '{'
            };
        }

        while (this.peek() == '.' || this.peek() == '[') {
            if (this.get() == '.') {
                var name = this.get();

                if (this.peek() == '(') {
                    this.get();

                    var a = [];

                    if (this.peek() == ')') {
                        this.get();
                        val = {
                            args: [ val, name ],
                            op: '(a'
                        };
                    } else {
                        a.push(this.evalExpression());

                        while (this.peek() == ',') {
                            this.get();
                            a.push(this.evalExpression());
                        }

                        this.get();
                        val = {
                            args: [ val, name, a ],
                            op: '(a'
                        };
                    }
                } else {
                    val = {
                        args: [ val, {
                            args: [ name ],
                            op: AST_OPERATORS['s'],
                            noeval: true
                        }],
                        op: '[a'
                    }
                }
            } else {
                val = {
                    args: [ val, this.evalExpression() ],
                    op: '[a'
                };

                this.get();
            }
        }

        return val;
    }

    evalBracketExpression () {
        this.get();
        var v = this.evalExpression();
        this.get();
        return v;
    }

    evalRankedExpression () {
        var left, right, op;
        if (this.peek() == '(') {
            left = this.evalBracketExpression();
        } else {
            left = this.getVal();
        }

        while (['*', '/'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.getVal();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalSimpleExpression () {
        var left, right, op;

        left = this.evalRankedExpression();

        while (['+', '-', '%'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalRankedExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolExpression () {
        var left, right, op;

        left = this.evalSimpleExpression();

        while (['>', '<', '<=', '>=', '==', '!='].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalSimpleExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalBoolMergeExpression () {
        var left, right, op;

        left = this.evalBoolExpression();

        while (['||', '&&'].includes(this.peek())) {
            op = this.get();

            if (this.peek() == '(') {
                right = this.evalBracketExpression();
            } else {
                right = this.evalBoolExpression();
            }

            left = {
                args: [ left, right ],
                op: AST_OPERATORS[op]
            }
        }

        return left;
    }

    evalExpression () {
        var left, tr, fl;

        left = this.evalBoolMergeExpression();

        if (this.peek() == '?') {
            this.get();

            if (this.peek() == '(') {
                tr = this.evalBracketExpression();
            } else {
                tr = this.evalBoolMergeExpression();
            }

            if (this.peek() == ':') {
                this.get();

                if (this.peek() == '(') {
                    fl = this.evalBracketExpression();
                } else {
                    fl = this.evalBoolMergeExpression();
                }

                left = {
                    args: [ left, tr, fl ],
                    op: AST_OPERATORS['?']
                }
            }
        }

        return left;
    }

    isValid () {
        return this.tokens.length == 0 && !this.empty;
    }

    toString (node = this.root) {
        if (typeof(node) == 'object') {
            return `${ typeof(node.op) == 'string' ? node.op : node.op.name }(${ node.args.map(arg => this.toString(arg)).join(', ') })`;
        } else {
            return node;
        }
    }

    eval (player, reference = undefined, environment = { func: { }, vars: { }, constants: new Constants() }, scope = undefined, extra = undefined, node = this.root) {
        if (typeof(node) == 'object') {
            if (node.noeval) {
                return node.args[0];
            } else if (typeof(node.op) == 'string') {
                if (node.op == 'format' && node.args.length > 0) {
                    var str = this.eval(player, reference, environment, scope, extra, node.args[0]);
                    var arg = node.args.slice(1).map(a => this.eval(player, reference, environment, scope, extra, a));

                    for (key in arg) {
                        str = str.replace(new RegExp(`\\{\\s*${ key }\\s*\\}`, 'gi'), arg[key]);
                    }

                    return str;
                } else if (node.op == 'each' && node.args.length >= 2) {
                    var generated = this.eval(player, reference, environment, scope, extra, node.args[0]) || {};

                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    var sum = 0;

                    if (environment.func[node.args[1]]) {
                        var mapper = environment.func[node.args[1]];

                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};

                            if (object[i].segmented) {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i][j];
                                }
                            } else {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i];
                                }
                            }

                            sum += mapper.ast.eval(player, reference, environment, scope2, extra);
                        }
                    } else if (SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum += expr.expr(object[i] && object[i].segmented ? object[i][0] : object[i]);
                        }
                    } else if (SP_KEYWORD_MAPPING_3[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_3[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum += expr.expr(object[i] && object[i].segmented ? object[i][0] : object[i], null, environment);
                        }
                    } else if (SP_KEYWORD_MAPPING_4[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_4[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum += expr.expr(player, reference, environment, object[i] && object[i].segmented ? object[i][0] : object[i]);
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            sum += this.eval(player, reference, environment, object[i] && object[i].segmented ? object[i][0] : object[i], extra, node.args[1]);
                        }
                    }

                    return sum;
                } else if (node.op == 'filter' && node.args.length >= 2) {
                    var generated = this.eval(player, reference, environment, scope, extra, node.args[0]) || {};

                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    var mapper = environment.func[node.args[1]];
                    var sum = [];

                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};

                            if (object[i].segmented) {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i][j];
                                }
                            } else {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i];
                                }
                            }

                            if (mapper.ast.eval(player, reference, environment, scope2, extra)) {
                                sum.push(object[i]);
                            }
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            if (this.eval(player, reference, environment, object[i], extra, node.args[1])) {
                                sum.push(object[i]);
                            }
                        }
                    }

                    return sum;
                } else if (node.op == 'map' && node.args.length >= 2) {
                    var generated = this.eval(player, reference, environment, scope, extra, node.args[0]) || {};

                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    var mapper = environment.func[node.args[1]];
                    var sum = [];

                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};

                            if (object[i].segmented) {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i][j];
                                }
                            } else {
                                for (var j = 0; j < mapper.arg.length; j++) {
                                    scope2[mapper.arg[j]] = object[i];
                                }
                            }

                            sum.push(mapper.ast.eval(player, reference, environment, scope2, extra));
                        }
                    } else if (SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum.push(expr.expr(object[i] && object[i].segmented ? object[i][0] : object[i]));
                        }
                    } else if (SP_KEYWORD_MAPPING_3[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_3[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum.push(expr.expr(object[i] && object[i].segmented ? object[i][0] : object[i], null, environment));
                        }
                    } else if (SP_KEYWORD_MAPPING_4[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_4[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum.push(expr.expr(player, reference, environment, object[i] && object[i].segmented ? object[i][0] : object[i]));
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            sum.push(this.eval(player, reference, environment, object[i] && object[i].segmented ? object[i][0] : object[i], extra, node.args[1]));
                        }
                    }

                    return sum;
                } else if (node.op == 'slice' && node.args.length >= 3) {
                    var generated = this.eval(player, reference, environment, scope, extra, node.args[0]) || {};

                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    return object.slice(Number(node.args[1]), Number(node.args[2]));
                } else if (environment.func[node.op]) {
                    var mapper = environment.func[node.op];
                    var scope2 = {};
                    for (var i = 0; i < mapper.arg.length; i++) {
                        scope2[mapper.arg[i]] = this.eval(player, reference, environment, scope, extra, node.args[i]);
                    }

                    return mapper.ast.eval(player, reference, environment, scope2, extra);
                } else if (node.op == '{') {
                    var object = { };
                    for (var { key, val } of node.args) {
                        object[this.eval(player, reference, environment, scope, extra, key)] = this.eval(player, reference, environment, scope, extra, val);
                    }

                    return object;
                } else if (node.op == '[a') {
                    var object = this.eval(player, reference, environment, scope, extra, node.args[0]);
                    if (object) {
                        return object[this.eval(player, reference, environment, scope, extra, node.args[1])];
                    } else {
                        return undefined;
                    }
                } else if (node.op == '(a') {
                    var object = this.eval(player, reference, environment, scope, extra, node.args[0]);
                    var func = node.args[1];

                    if (object != undefined && object[func]) {
                        return object[func](... node.args[2].map(param => this.eval(player, reference, environment, scope, extra, param)));
                    } else {
                        return undefined;
                    }
                } else if (SP_KEYWORD_MAPPING_0[node.op] || SP_KEYWORD_MAPPING_1[node.op] || SP_KEYWORD_MAPPING_2[node.op]) {
                    var expr = SP_KEYWORD_MAPPING_0[node.op] || SP_KEYWORD_MAPPING_1[node.op] || SP_KEYWORD_MAPPING_2[node.op];
                    var params = node.args.map(arg => this.eval(player, reference, environment, scope, extra, arg));

                    if (params.length > 0 && params[0] != undefined) {
                        return expr.expr(params[0]);
                    } else {
                        return undefined;
                    }
                } else if (SP_KEYWORD_MAPPING_3[node.op]) {
                    var expr = SP_KEYWORD_MAPPING_3[node.op];
                    var params = node.args.map(arg => this.eval(player, reference, environment, scope, extra, arg));

                    if (params.length > 0 && params[0] != undefined) {
                        return expr.expr(params[0], null, environment);
                    } else {
                        return undefined;
                    }
                } else if (SP_KEYWORD_MAPPING_4[node.op]) {
                    var expr = SP_KEYWORD_MAPPING_4[node.op];
                    var params = node.args.map(arg => this.eval(player, reference, environment, scope, extra, arg));

                    if (params.length > 0 && params[0] != undefined) {
                        return expr.expr(player, null, environment, params[0]);
                    } else {
                        return undefined;
                    }
                } else if (SP_KEYWORD_MAPPING_5[node.op]) {
                    var expr = SP_KEYWORD_MAPPING_5[node.op];
                    var params = node.args.map(arg => this.eval(player, reference, environment, scope, extra, arg));

                    if (params.length > 0 && params[0] != undefined) {
                        return expr.expr(params[0], null, environment);
                    } else {
                        return undefined;
                    }
                } else {
                    // Return undefined
                    return undefined;
                }
            } else if (node.op) {
                // Return processed node
                return node.op(node.args.map(arg => this.eval(player, reference, environment, scope, extra, arg)));
            } else {
                // Return node in case something does not work :(
                return node;
            }
        } else if (typeof(node) == 'string') {
            if (node == 'this') {
                // Return current scope
                return scope;
            } else if (node == 'undefined') {
                // Return undefined
                return undefined;
            } else if (node == 'null') {
                // Return null
                return null;
            } else if (node == 'true') {
                // Return logical true
                return true;
            } else if (node == 'false') {
                // Return logical false
                return false;
            } else if (node == 'player') {
                // Return current player
                return player;
            } else if (node == 'reference') {
                // Return reference player
                return reference;
            } else if (typeof(extra) == 'object' && extra[node] != undefined) {
                // Return extra variable (only if it exists)
                return extra[node];
            } else if (typeof(scope) == 'object' && scope[node] != undefined) {
                // Return scope variable (only if it exists)
                return scope[node];
            } else if (environment.vars[node] != undefined) {
                // Return environment variable
                if (environment.vars[node].value != undefined) {
                    return environment.vars[node].value;
                } else if (environment.vars[node].ast) {
                    return environment.vars[node].ast.eval(player, reference, environment);
                } else {
                    return undefined;
                }
            } else if (node[0] == '@') {
                // Return constant
                return environment.constants.Values[node.slice(1)];
            } else if (SP_KEYWORD_MAPPING_0[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_0[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_1[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_1[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_2[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_2[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_3[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_3[node].expr(player, reference, environment);
            } else if (SP_KEYWORD_MAPPING_4[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_4[node].expr(player, reference, environment, scope);
            } else if (SP_KEYWORD_MAPPING_5[node] && player) {
                // Return mapper
                return SP_KEYWORD_MAPPING_5[node].expr(player, reference, environment);
            } else {
                // Return object or undefined if everything fails
                return SP_ENUMS[node];
            }
        } else {
            return node;
        }
    }
}

const SP_KEYWORD_MAPPING_0 = {
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
        format: (p, c, e, x) => PLAYER_ACTIONS[Math.max(0, x)],
        difference: false,
        statistics: false
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: (p, c, e, x) => x < 0 ? '' : formatDate(x),
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
        expr: p => Math.trunc(10000 * p.Book / SCRAPBOOK_COUNT) / 100,
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
    'Last Active': {
        expr: p => p.LastOnline,
        format: (p, c, e, x) => formatDate(x),
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
    'Gladiator': {
        expr: p => p.Fortress.Gladiator,
        format: (p, c, e, x) => (x == 0 ? '' : (x == 1 ? '1+' : (x == 5 ? '5+' : (x == 10 ? '10+' : 15))))
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
        expr: p => p.Achievements[36].Owned
    },
    'Grail Unlocked': {
        expr: p => p.Achievements[76].Owned
    },
    'Hydra Dead': {
        expr: p => p.Achievements[63].Owned
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
    }
};

const SP_SPECIAL_CONDITIONS = {
    'Knights': [
        {
            condition: h => h.maximum,
            content: {
                format: (p, c, e, x) => p ? `${ p.Fortress.Knights }/${ p.Fortress.Fortress }` : x
            }
        }
    ],
    'Awards': [
        {
            condition: h => h.hydra,
            content: {
                extra: p => p && p.Achievements.Dehydration ? CellGenerator.Small(' H') : ''
            }
        }
    ],
    'Album': [
        {
            condition: h => h.grail,
            content: {
                extra: p => p && p.Achievements.Grail ? CellGenerator.Small(' G') : ''
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
    'Twister': {
        expr: p => p.Dungeons.Twister ? Math.max(0, p.Dungeons.Twister - 2) : undefined,
        statistics: false
    },
    'Shrooms': {
        expr: p => p.Mushrooms ? p.Mushrooms.Current : undefined,
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
        difference: false,
        statistics: false
    },
    'Underworld Gate': {
        expr: p => p.Underworld ? p.Underworld.Gate : undefined,
        difference: false,
        statistics: false
    },
    'Gold Pit': {
        expr: p => p.Underworld ? p.Underworld.GoldPit : undefined,
        difference: false,
        statistics: false
    },
    'Extractor': {
        expr: p => p.Underworld ? p.Underworld.Extractor : undefined,
        difference: false,
        statistics: false
    },
    'Goblin Pit': {
        expr: p => p.Underworld ? p.Underworld.GoblinPit : undefined,
        difference: false,
        statistics: false
    },
    'Torture Chamber': {
        expr: p => p.Underworld ? p.Underworld.Torture : undefined,
        difference: false,
        statistics: false
    },
    'Gladiator Trainer': {
        expr: p => p.Underworld ? p.Underworld.Gladiator : undefined,
        difference: false,
        statistics: false
    },
    'Troll Block': {
        expr: p => p.Underworld ? p.Underworld.TrollBlock : undefined,
        difference: false,
        statistics: false
    },
    'Time Machine': {
        expr: p => p.Underworld ? p.Underworld.TimeMachine : undefined,
        difference: false,
        statistics: false
    },
    'Keeper': {
        expr: p => p.Underworld ? p.Underworld.Keeper : undefined,
        difference: false,
        statistics: false
    },
    'Souls': {
        expr: p => p.Underworld ? p.Underworld.Souls : undefined,
        difference: false,
        statistics: false
    },
    'Extractor Max': {
        expr: p => p.Underworld ? p.Underworld.ExtractorMax : undefined,
        difference: false,
        statistics: false
    },
    'Max Souls': {
        expr: p => p.Underworld ? p.Underworld.MaxSouls : undefined,
        difference: false,
        statistics: false
    },
    'Extractor Hourly': {
        expr: p => p.Underworld ? p.Underworld.ExtractorHourly : undefined,
        difference: false,
        statistics: false
    },
    'Gold Pit Max': {
        expr: p => p.Underworld ? p.Underworld.GoldPitMax : undefined,
        format: (p, c, e, x) => x ? formatAsSpacedNumber(x) : undefined,
        difference: false,
        statistics: false
    },
    'Gold Pit Hourly': {
        expr: p => p.Underworld ? p.Underworld.GoldPitHourly : undefined,
        format: (p, c, e, x) => x ? formatAsSpacedNumber(x) : undefined,
        difference: false,
        statistics: false
    },
    'Time Machine Thirst': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineThirst : undefined,
        difference: false,
        statistics: false
    },
    'Time Machine Max': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineMax : undefined,
        difference: false,
        statistics: false
    },
    'Time Machine Daily': {
        expr: p => p.Underworld ? p.Underworld.TimeMachineDaily : undefined,
        difference: false,
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
    'Woodcutter Max': {
        expr: p => p.Fortress.WoodcutterMax,
        difference: false,
        statistics: false
    },
    'Quarry Max': {
        expr: p => p.Fortress.QuarryMax,
        difference: false,
        statistics: false
    },
    'Academy Max': {
        expr: p => p.Fortress.AcademyMax,
        difference: false,
        statistics: false
    },
    'Wood Capacity': {
        expr: p => p.Fortress.MaxWood,
        difference: false,
        statistics: false
    },
    'Stone Capacity': {
        expr: p => p.Fortress.MaxStone,
        difference: false,
        statistics: false
    },
    'Sacrifices': {
        expr: p => p.Idle ? p.Idle.Sacrifices : undefined,
        difference: false,
        statistics: false
    },
    'Money': {
        expr: p => p.Idle ? p.Idle.Money : undefined,
        difference: false,
        statistics: false
    },
    'Runes Collected': {
        expr: p => p.Idle ? p.Idle.Runes : undefined,
        difference: false,
        statistics: false
    },
    'Runes Ready': {
        expr: p => p.Idle ? p.Idle.ReadyRunes : undefined,
        difference: false,
        statistics: false
    },
    'Idle Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Total : undefined,
        difference: false,
        statistics: false
    },
    'Speed Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Speed : undefined,
        difference: false,
        statistics: false
    },
    'Money Upgrades': {
        expr: p => p.Idle ? p.Idle.Upgrades.Money : undefined,
        difference: false,
        statistics: false
    }
};

// Special
const SP_KEYWORD_MAPPING_3 = {
    'Simulator Avg': {
        expr: (p, c, e) => {
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].avg;
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
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].min;
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
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].max;
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
        expr: (p, c, e, i) => p.Items
    },
    'Potions': {
        expr: (p, c, e, i) => p.Potions
    }
};
