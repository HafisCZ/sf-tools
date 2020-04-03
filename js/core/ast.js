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
    'abs': (a) => Math.abs(a[0]),
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
    'len': (a) => a[0] != undefined ? (Array.isArray(a[0]) ? a[0].length : Object.values(a[0]).length) : undefined
};

const AST_REGEXP = /(\'[^\']*\'|\"[^\"]*\"|\{|\}|\|\||\%|\!\=|\!|\&\&|\>\=|\<\=|\=\=|\(|\)|\+|\-|\/|\*|\>|\<|\?|\:|\[|\]|\,)/;

class AST {
    constructor (string) {
        this.tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(AST_REGEXP).map(token => token.trim()).filter(token => token.length);
        this.root = this.evalExpression();
    }

    static format (string) {
        var content = '';
        var tokens = string.replace(/\\\"/g, '\u2023').replace(/\\\'/g, '\u2043').split(AST_REGEXP);

        for (var i = 0, token, value; i < tokens.length; i++) {
            token = tokens[i];
            if (/\S/.test(token)) {
                var [, prefix, token, suffix] = token.match(/(\s*)(.*\S)(\s*)/);
                token = token.replace(/\u2023/g, '\\\"').replace(/\u2043/g, '\\\'');

                if (token != undefined && token.length > 1 && ['\'', '\"'].includes(token[0]) && ['\'', '\"'].includes(token[token.length - 1])) {
                    value = token[0] + SFormat.Comment(token.slice(1, token.length - 1)) + token[token.length - 1];
                } else if (AST_FUNCTIONS[token] != undefined || ['each', 'map', 'slice', 'this', 'undefined', 'null', 'filter', 'format'].includes(token)) {
                    value = SFormat.Constant(token);
                } else if (SP_KEYWORD_MAPPING_0[token] != undefined) {
                    value = SFormat.Reserved(token);
                } else if (SP_KEYWORD_MAPPING_1[token] != undefined) {
                    value = SFormat.ReservedProtected(token);
                } else if (SP_KEYWORD_MAPPING_2[token] != undefined) {
                    value = SFormat.ReservedPrivate(token);
                } else if (SP_KEYWORD_MAPPING_3[token] != undefined) {
                    value = SFormat.ReservedSpecial(token);
                } else if (SP_KEYWORD_MAPPING_4[token] != undefined) {
                    value = SFormat.ReservedItemized(token);
                } else if (SP_KEYWORD_MAPPING_5[token] != undefined) {
                    value = SFormat.ReservedItemizable(token);
                } else if (token[0] == '@' && Constants.Values[token.slice(1)] != undefined) {
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
        return isNaN(v) ? v : Number(v);
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
        if (val[0] == '\"' || val[0] == '\'') {
            val = {
                args: [ val.slice(1, val.length - 1).replace(/\u2023/g, '\"').replace(/\u2043/g, '\'') ],
                op: AST_OPERATORS['s'],
                noeval: true
            }
        } else if (val == '-') {
            var v;
            if (this.peek() == '(') {
                v = this.evalBracketExpression();
            } else if (AST_FUNCTIONS[this.peek()] || (/\w+/.test(this.peek()) && this.peek(1) == '(')) {
                v = this.getVal();
            } else {
                v = this.get();
            }

            val = {
                args: [ v ],
                op: AST_OPERATORS['u-']
            };
        } else if (val == '!') {
            var v;
            if (this.peek() == '(') {
                v = this.evalBracketExpression();
            } else if (AST_FUNCTIONS[this.peek()] || (/\w+/.test(this.peek()) && this.peek(1) == '(')) {
                v = this.getVal();
            } else {
                v = this.get();
            }

            val = {
                args: [ v ],
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

        while (this.peek() == '[') {
            this.get();

            val = {
                args: [ val, this.evalExpression() ],
                op: '[a'
            };

            this.get();
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
        return this.tokens.length == 0;
    }

    toString (node = this.root) {
        if (typeof(node) == 'object') {
            return `${ typeof(node.op) == 'string' ? node.op : node.op.name }(${ node.args.map(arg => this.toString(arg)).join(', ') })`;
        } else {
            return node;
        }
    }

    eval (player, environment = { func: { }, vars: { }, svars: { } }, scope = undefined, node = this.root) {
        if (typeof(node) == 'object') {
            if (node.noeval) {
                return node.args[0];
            } else if (typeof(node.op) == 'string') {
                if (node.op == 'format' && node.args.length > 0) {
                    var str = this.eval(player, environment, scope, node.args[0]);
                    var arg = node.args.slice(1).map(a => this.eval(player, environment, scope, a));

                    for (key in arg) {
                        str = str.replace(new RegExp(`\\{\\s*${ key }\\s*\\}`, 'gi'), arg[key]);
                    }

                    return str;
                } else if (node.op == 'each' && node.args.length >= 2) {
                    var generated = this.eval(player, environment, scope, node.args[0]) || {};
                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    var mapper = environment.func[node.args[1]];
                    var sum = 0;
                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            for (var j = 0; j < mapper.arg.length; j++) {
                                scope2[mapper.arg[j]] = object[i];
                            }
                            sum += mapper.ast.eval(player, environment, scope2);
                        }
                    } else if (SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum += expr.expr(object[i]);
                        }
                    } else if (SP_KEYWORD_MAPPING_4[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_4[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum += expr.expr(player, environment, object[i]);
                        }
                    } else if (node.args[1].op) {
                        for (var i = 0; i < object.length; i++) {
                            if (this.eval(player, environment, object[i], node.args[1])) {
                                sum.push(object[i]);
                            }
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            scope2[node.args[1].split('.', 1)[0]] = object[i];
                            sum += this.eval(player, environment, scope2, node.args[1]);
                        }
                    }
                    return sum;
                } else if (node.op == 'filter' && node.args.length >= 2) {
                    var generated = this.eval(player, environment, scope, node.args[0]) || {};
                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }
                    var mapper = environment.func[node.args[1]];
                    var sum = [];
                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            for (var j = 0; j < mapper.arg.length; j++) {
                                scope2[mapper.arg[j]] = object[i];
                            }

                            if (mapper.ast.eval(player, environment, scope2)) {
                                sum.push(object[i]);
                            }
                        }
                    } else if (node.args[1].op) {
                        for (var i = 0; i < object.length; i++) {
                            if (this.eval(player, environment, object[i], node.args[1])) {
                                sum.push(object[i]);
                            }
                        }
                    }
                    return sum;
                } else if (node.op == 'map' && node.args.length >= 2) {
                    var generated = this.eval(player, environment, scope, node.args[0]) || {};
                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    var mapper = environment.func[node.args[1]];
                    var sum = [];
                    if (mapper) {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            for (var j = 0; j < mapper.arg.length; j++) {
                                scope2[mapper.arg[j]] = object[i];
                            }
                            sum.push(mapper.ast.eval(player, environment, scope2));
                        }
                    } else if (SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_0[node.args[1]] || SP_KEYWORD_MAPPING_1[node.args[1]] || SP_KEYWORD_MAPPING_2[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum.push(expr.expr(object[i]));
                        }
                    } else if (SP_KEYWORD_MAPPING_4[node.args[1]]) {
                        var expr = SP_KEYWORD_MAPPING_4[node.args[1]];
                        for (var i = 0; i < object.length; i++) {
                            sum.push(expr.expr(player, environment, object[i]));
                        }
                    } else if (node.args[1].op) {
                        for (var i = 0; i < object.length; i++) {
                            if (this.eval(player, environment, object[i], node.args[1])) {
                                sum.push(object[i]);
                            }
                        }
                    } else {
                        for (var i = 0; i < object.length; i++) {
                            var scope2 = {};
                            scope2[node.args[1].split('.', 1)[0]] = object[i];
                            sum.push(this.eval(player, environment, scope2, node.args[1]));
                        }
                    }
                    return sum;
                } else if (node.op == 'slice' && node.args.length >= 3) {
                    var generated = this.eval(player, environment, scope, node.args[0]) || {};
                    var object = Array.isArray(generated) ? generated : Object.values(generated);
                    if (!object.length) {
                        return undefined;
                    }

                    return object.slice(Number(node.args[1]), Number(node.args[2]));
                } else if (environment.func[node.op]) {
                    var mapper = environment.func[node.op];
                    var scope2 = {};
                    for (var i = 0; i < mapper.arg.length; i++) {
                        scope2[mapper.arg[i]] = this.eval(player, environment, scope, node.args[i]);
                    }
                    return mapper.ast.eval(player, environment, scope2);
                } else if (node.op == '{') {
                    var object = { };
                    for (var { key, val } of node.args) {
                        object[this.eval(player, environment, scope, key)] = this.eval(player, environment, scope, val);
                    }
                    return object;
                } else if (node.op == '[a') {
                    var object = this.eval(player, environment, scope, node.args[0]);
                    var key = this.eval(player, environment, scope, node.args[1]);
                    return object[key];
                } else {
                    return undefined;
                }
            } else if (node.op) {
                return node.op(node.args.map(arg => this.eval(player, environment, scope, arg)));
            } else {
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
                // Return nulll
                return null;
            } else if (node == 'true') {
                return true;
            } else if (node == 'false') {
                return false;
            } else if (typeof(scope) == 'object' && (scope[node] != undefined || scope[node.split('.', 1)[0]] != undefined)) {
                // Return scope variable
                if (scope[node] != undefined) {
                    return scope[node];
                } else {
                    var [key, path] = node.split(/\.(.*)/, 2);
                    return getObjectAt(scope[key], path);
                }
            } else if (environment.vars[node] != undefined) {
                // Return variable
                if (environment.vars[node].value != undefined) {
                    return environment.vars[node].value;
                } else if (environment.vars[node].ast) {
                    return environment.vars[node].ast.eval(player, environment);
                } else {
                    return undefined;
                }
            } else if (node[0] == '@') {
                return Constants.Values[node.slice(1)];
            } else if (SP_KEYWORD_MAPPING_0[node] && player) {
                return SP_KEYWORD_MAPPING_0[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_1[node] && player) {
                return SP_KEYWORD_MAPPING_1[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_2[node] && player) {
                return SP_KEYWORD_MAPPING_2[node].expr(player);
            } else if (SP_KEYWORD_MAPPING_3[node] && player) {
                return SP_KEYWORD_MAPPING_3[node].expr(player, environment);
            } else if (SP_KEYWORD_MAPPING_4[node] && player) {
                return SP_KEYWORD_MAPPING_4[node].expr(player, environment, scope);
            } else if (SP_KEYWORD_MAPPING_5[node] && player) {
                return SP_KEYWORD_MAPPING_5[node].expr(player, environment);
            } else {
                return getObjectAt(player, node);
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
    'Role': {
        expr: p => p.Group.Role,
        flip: true,
        format: (p, e, x) => p.hasGuild() ? '?' : GROUP_ROLES[cell.Group.Role],
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
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Strength Cost': {
        expr: p => p.Strength.NextCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Dexterity Cost': {
        expr: p => p.Dexterity.NextCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Intelligence Cost': {
        expr: p => p.Intelligence.NextCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Constitution Cost': {
        expr: p => p.Constitution.NextCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Luck Cost': {
        expr: p => p.Luck.NextCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Base Total Cost': {
        expr: p => p.Primary.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Strength Total Cost': {
        expr: p => p.Strength.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Dexterity Total Cost': {
        expr: p => p.Dexterity.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Intelligence Total Cost': {
        expr: p => p.Intelligence.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Constitution Total Cost': {
        expr: p => p.Constitution.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
    },
    'Luck Total Cost': {
        expr: p => p.Luck.TotalCost,
        format: (p, e, x) => formatAsSpacedNumber(x)
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
        format: (p, e, x) => x ? 'Yes' : 'No'
    },
    'Runes': {
        expr: p => p.Runes.Runes,
        format: (p, e, x) => `e${ x }`,
        width: 100
    },
    'Action Index': {
        expr: p => p.Action.Index,
        difference: false,
        statistics: false
    },
    'Status': {
        expr: p => p.Action.Status,
        format: (p, e, x) => PLAYER_ACTIONS[Math.max(0, x)],
        difference: false,
        statistics: false
    },
    'Action Finish': {
        expr: p => p.Action.Finish,
        format: (p, e, x) => x < 0 ? '' : formatDate(x),
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
    'Fortress': {
        expr: p => p.Fortress.Fortress
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
    'Wood': {
        expr: p => p.Fortress.Wood
    },
    'Stone': {
        expr: p => p.Fortress.Stone
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
    'Class': {
        expr: p => p.Class,
        format: (p, e, x) => PLAYER_CLASS[x],
        difference: false,
        statistics: false
    },
    'Rank': {
        expr: p => p.Rank,
        flip: true
    },
    'Mount': {
        expr: p => p.Mount
    },
    'Awards': {
        expr: p => p.Achievements.Owned
    },
    'Album': {
        expr: p => p.Book
    },
    'Fortress Rank': {
        expr: p => p.Fortress.Rank,
        width: 130
    },
    'Building': {
        expr: p => p.Fortress.Upgrade.Building,
        width: 180,
        format: (p, e, x) => FORTRESS_BUILDINGS[x] || '',
        difference: false,
        statistics: false
    },
    'Building Finish': {
        expr: p => p.Fortress.Upgrade.Finish,
        format: (p, e, x) => x < 0 ? '' : formatDate(x),
        difference: false,
        statistics: false
    },
    'Last Active': {
        expr: p => p.LastOnline,
        difference: false,
        statistics: false
    },
    'Timestamp': {
        expr: p => p.Timestamp,
        format: (p, e, x) => formatDate(x),
        difference: false,
        statistics: false
    },
    'Guild Joined': {
        expr: p => p.Group.Joined,
        format: (p, e, x) => p.hasGuild() ? formatDate(x) : '',
        difference: false,
        statistics: false
    },
    'Gladiator': {
        expr: p => p.Fortress.Gladiator,
        format: (p, e, x) => (x == 0 ? '' : (x == 1 ? '1+' : (x == 5 ? '5+' : (x == 10 ? '10+' : 15))))
    },
    'XP': {
        expr: p => p.XP
    },
    'Level XP': {
        expr: p => p.XPNext
    },
    'Guild Portal Floor': {
        expr: p => p.Group.Group ? p.Group.Group.PortalFloor : undefined
    },
    'Guild Portal Life': {
        expr: p => p.Group.Group ? p.Group.Group.PortalLife : undefined
    },
    'Guild Portal Percent': {
        expr: p => p.Group.Group ? p.Group.Group.PortalPercent : undefined
    },
    '1 Catacombs': {
        expr: p => p.Dungeons.Normal[0]
    },
    '2 Mines': {
        expr: p => p.Dungeons.Normal[1]
    },
    '3 Ruins': {
        expr: p => p.Dungeons.Normal[2]
    },
    '4 Grotto': {
        expr: p => p.Dungeons.Normal[3]
    },
    '5 Altar': {
        expr: p => p.Dungeons.Normal[4]
    },
    '6 Tree': {
        expr: p => p.Dungeons.Normal[5]
    },
    '7 Magma': {
        expr: p => p.Dungeons.Normal[6]
    },
    '8 Temple': {
        expr: p => p.Dungeons.Normal[7]
    },
    '9 Pyramid': {
        expr: p => p.Dungeons.Normal[8]
    },
    '10 Circus': {
        expr: p => p.Dungeons.Normal[9]
    },
    '11 Fortress': {
        expr: p => p.Dungeons.Normal[10]
    },
    '12 Hell': {
        expr: p => p.Dungeons.Normal[11]
    },
    '13 Floor': {
        expr: p => p.Dungeons.Normal[12]
    },
    '14 Easteros': {
        expr: p => p.Dungeons.Normal[13]
    },
    'S1 Catacombs': {
        expr: p => p.Dungeons.Shadow[0]
    },
    'S2 Mines': {
        expr: p => p.Dungeons.Shadow[1]
    },
    'S3 Ruins': {
        expr: p => p.Dungeons.Shadow[2]
    },
    'S4 Grotto': {
        expr: p => p.Dungeons.Shadow[3]
    },
    'S5 Altar': {
        expr: p => p.Dungeons.Shadow[4]
    },
    'S6 Tree': {
        expr: p => p.Dungeons.Shadow[5]
    },
    'S7 Magma': {
        expr: p => p.Dungeons.Shadow[6]
    },
    'S8 Temple': {
        expr: p => p.Dungeons.Shadow[7]
    },
    'S9 Pyramid': {
        expr: p => p.Dungeons.Shadow[8]
    },
    'S10 Circus': {
        expr: p => p.Dungeons.Shadow[9]
    },
    'S11 Fortress': {
        expr: p => p.Dungeons.Shadow[10]
    },
    'S12 Hell': {
        expr: p => p.Dungeons.Shadow[11]
    },
    'S13 Floor': {
        expr: p => p.Dungeons.Shadow[12]
    },
    'S14 Easteros': {
        expr: p => p.Dungeons.Shadow[13]
    }
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
    }
};

// Private
const SP_KEYWORD_MAPPING_2 = {
    'Aura': {
        expr: p => p.Toilet.Aura,
        statistics: false
    },
    'Twister': {
        expr: p => p.Dungeons.Twister,
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
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Youtube : undefined,
        statistics: false,
        width: 120
    },
    'Own Shadow': {
        expr: p => p.Dungeons.Extra ? p.Dungeons.Extra.Shadow.Total : undefined,
        statistics: false,
        width: 120
    },
    'Potion Expire': {
        expr: p => p.Potions[0].Size == 0 ? 0 : Math.min(... (p.Potions.filter(pot => pot.Size > 0).map(pot => pot.Expire))),
        format: (p, e, x) => x == 0 ? '' : formatDate(x),
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
        expr: p => p.Dungeons.Extra.Normal[0]
    },
    '16 Hemorridor': {
        expr: p => p.Dungeons.Extra.Normal[1]
    },
    '17 Nordic': {
        expr: p => p.Dungeons.Extra.Normal[2]
    },
    '18 Greek': {
        expr: p => p.Dungeons.Extra.Normal[3]
    },
    'S15 Academy': {
        expr: p => p.Dungeons.Extra.Shadow[0]
    },
    'S16 Hemorridor': {
        expr: p => p.Dungeons.Extra.Shadow[1]
    },
    'S17 Nordic': {
        expr: p => p.Dungeons.Extra.Shadow[2]
    },
    'S18 Greek': {
        expr: p => p.Dungeons.Extra.Shadow[3]
    }
};

// Special
const SP_KEYWORD_MAPPING_3 = {
    'Simulator Avg': {
        expr: (p, e) => {
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].avg;
            } else {
                return undefined;
            }
        },
        alias: 'Win Avg %',
        width: 120,
        format: (p, e, x) => `${ (x).toFixed(2) }%`
    },
    'Simulator Min': {
        expr: (p, e) => {
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].min;
            } else {
                return undefined;
            }
        },
        alias: 'Win Min %',
        width: 120,
        format: (p, e, x) => `${ (x).toFixed(2) }%`
    },
    'Simulator Max': {
        expr: (p, e) => {
            if (e.vars.Simulator && e.vars.Simulator.value[p.Identifier]) {
                return e.vars.Simulator.value[p.Identifier].max;
            } else {
                return undefined;
            }
        },
        alias: 'Win Max %',
        width: 120,
        format: (p, e, x) => `${ (x).toFixed(2) }%`
    }
}

// Itemized
const SP_KEYWORD_MAPPING_4 = {
    'Item Strength': {
        expr: (p, e, i) => i.Strength.Value,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Dexterity': {
        expr: (p, e, i) => i.Dexterity.Value,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Intelligence': {
        expr: (p, e, i) => i.Intelligence.Value,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Constitution': {
        expr: (p, e, i) => i.Constitution.Value,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Luck': {
        expr: (p, e, i) => i.Luck.Value,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Attribute': {
        expr: (p, e, i) => {
            switch (p.Primary.Type) {
                case 1: return i.Strength.Value;
                case 2: return i.Dexterity.Value;
                case 3: return i.Intelligence.Value;
                default: return 0;
            }
        },
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Upgrades': {
        expr: (p, e, i) => i.Upgrades,
        format: (p, e, x) => x == 0 ? '' : x
    },
    'Item Rune': {
        expr: (p, e, i) => i.RuneType,
        width: 180,
        format: (p, e, x) => RUNETYPES[x],
        difference: false
    },
    'Item Rune Value': {
        expr: (p, e, i) => i.RuneValue,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gem': {
        expr: (p, e, i) => i.GemType,
        format: (p, e, x) => GEMTYPES[x],
        difference: false
    },
    'Item Gem Value': {
        expr: (p, e, i) => i.GemValue,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Gold': {
        expr: (p, e, i) => i.SellPrice.Gold,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Crystal': {
        expr: (p, e, i) => i.SellPrice.Crystal,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Sell Metal': {
        expr: (p, e, i) => i.SellPrice.Metal,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Crystal': {
        expr: (p, e, i) => i.DismantlePrice.Crystal,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Dismantle Metal': {
        expr: (p, e, i) => i.DismantlePrice.Metal,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    },
    'Item Name': {
        expr: (p, e, i) => i.Slot,
        format: (p, e, x) => x == 2 && p.Class == 4 ? ITEM_TYPES[1] : ITEM_TYPES[x],
        difference: false
    },
    'Potion Type': {
        expr: (p, e, i) => i.Type,
        format: (p, e, x) => POTIONS[x],
        difference: false
    },
    'Potion Size': {
        expr: (p, e, i) => i.Size,
        format: (p, e, x) => x == 0 ? '' : x,
        difference: false
    }
};

// itemizable
const SP_KEYWORD_MAPPING_5 = {
    'Items': {
        expr: (p, e, i) => p.Items
    },
    'Potions': {
        expr: (p, e, i) => p.Potions
    }
};
