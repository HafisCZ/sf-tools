class ExpressionConfig {
  #data;

  constructor (data) {
    this.#data = new Map(data);
  }

  clone () {
    return new ExpressionConfig(this.#data);
  }

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

  find (name, type, meta = true) {
      const data = this.#data.get(name);
      if (data && data.type === type && (meta === true || data.meta === meta)) {
          return data;
      }

      return undefined;
  }

  has (name) {
      return this.#data.has(name);
  }

  all (type, meta = true) {
      const keys = [];
      for (const [name, data] of this.#data.entries()) {
          if (data.type === type && (meta === true || data.meta === meta)) {
              keys.push(name);
          }
      }

      return keys;
  }
}

const DEFAULT_EXPRESSION_CONFIG = new ExpressionConfig();

/*
  Scope functions
*/
DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'scope', 'array',
  function (self, scope, node) {
      if (node.args.length !== 1) return undefined;

      return self.evalToArray(scope, node.args[0]);
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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
DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'array', 'distinct',
  function (array) {
      let values = Array.from(new Set(array));
      values.segmented = array.segmented;
      return values;
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'array', 'slice',
  function (array, from, to) {
      let values = array.slice(from, to);
      values.segmented = array.segmented;
      return values;
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'array', 'join',
  function (array, delim) {
      return array.join(delim);
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'array', 'at',
  function (array, index) {
      if (isNaN(index)) {
          return undefined;
      } else {
          return array[Math.min(array.length, Math.max(0, index))];
      }
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
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
DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'now',
  function () {
      return Date.now();
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'random',
  function () {
      return Math.random();
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'log',
  function (value) {
      console.log(value);

      return value;
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'stringify',
  function (value) {
      return String(value);
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'range',
  function (min, max, value) {
      if (isNaN(min) || isNaN(max) || isNaN(value)) {
          return undefined;
      } else {
          return (max - min) * value + min;
      }
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'makearray',
  function (size, def = 0) {
      if (!isNaN(size)) {
          return new Array(size).fill(def);
      } else {
          return undefined;
      }
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
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

DEFAULT_EXPRESSION_CONFIG.register(
  'function', 'value', 'number',
  function (value) {
      return Number(value);
  }
)

DEFAULT_EXPRESSION_CONFIG.register(
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

const TABLE_EXPRESSION_CONFIG = DEFAULT_EXPRESSION_CONFIG.clone();

/*
  Scope constants
*/
TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'player',
  function (scope) {
      return scope.player;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'reference',
  function (scope) {
      return scope.reference;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'database',
  function () {
      return DatabaseManager;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'entries',
  function (scope) {
      if (scope.player) {
          return DatabaseManager.getPlayer(scope.player.Identifier).List;
      } else {
          return undefined;
      }
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'table_array',
  function (scope) {
      return scope.env.array;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'table_array_unfiltered',
  function (scope) {
      return scope.env.array_unfiltered;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'table_timestamp',
  function (scope) {
      return scope.env.timestamp;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'table_reference',
  function (scope) {
      return scope.env.reference;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'header',
  function (scope) {
      return scope.header;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'variable', 'scope', 'row_index',
  function (scope) {
      return scope.env.row_indexes && scope.player ? scope.env.row_indexes[`${ scope.player.Identifier }_${ scope.player.Timestamp }`] : undefined;
  }
)

/*
  Scope functions
*/
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

/*
Public headers
*/
TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Name',
  {
      expr: p => p.Name,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'ID',
  {
      expr: p => p.ID,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Identifier',
  {
      expr: p => p.Identifier,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Prefix',
  {
      expr: p => p.Prefix,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Own',
  {
      expr: p => p.Own,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild ID',
  {
      expr: p => _dig(p, 'Group', 'ID'),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild Identifier',
  {
      expr: p => _dig(p, 'Group', 'Identifier'),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild Rank',
  {
      expr: p => _dig(p, 'Group', 'Rank'),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Role',
  {
      expr: p => (p && p.hasGuild()) ? _dig(p, 'Group', 'Role') : undefined,
      flip: true,
      format: (p, x) => x ? intl(`general.rank${x}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Level',
  {
      expr: p => p.Level
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild',
  {
      expr: p => _dig(p, 'Group', 'Name'),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Items',
  {
      expr: p => p.Items,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength',
  {
      expr: p => p.Strength.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity',
  {
      expr: p => p.Dexterity.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence',
  {
      expr: p => p.Intelligence.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution',
  {
      expr: p => p.Constitution.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck',
  {
      expr: p => p.Luck.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute',
  {
      expr: p => p.Primary.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Size',
  {
      expr: p => p.Strength.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Size',
  {
      expr: p => p.Dexterity.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Size',
  {
      expr: p => p.Intelligence.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Size',
  {
      expr: p => p.Constitution.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Size',
  {
      expr: p => p.Luck.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Size',
  {
      expr: p => p.Primary.PotionSize
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Potion Index',
  {
      expr: p => p.Strength.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Potion Index',
  {
      expr: p => p.Dexterity.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Potion Index',
  {
      expr: p => p.Intelligence.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Potion Index',
  {
      expr: p => p.Constitution.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Potion Index',
  {
      expr: p => p.Luck.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Potion Index',
  {
      expr: p => p.Primary.PotionIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Pet',
  {
      expr: p => p.Strength.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Pet',
  {
      expr: p => p.Dexterity.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Pet',
  {
      expr: p => p.Intelligence.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Pet',
  {
      expr: p => p.Constitution.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Pet',
  {
      expr: p => p.Luck.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Cost',
  {
      expr: p => p.Primary.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Cost',
  {
      expr: p => p.Strength.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Cost',
  {
      expr: p => p.Dexterity.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Cost',
  {
      expr: p => p.Intelligence.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Cost',
  {
      expr: p => p.Constitution.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Cost',
  {
      expr: p => p.Luck.NextCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Total Cost',
  {
      expr: p => p.Primary.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Total Cost',
  {
      expr: p => p.Strength.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Total Cost',
  {
      expr: p => p.Dexterity.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Total Cost',
  {
      expr: p => p.Intelligence.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Total Cost',
  {
      expr: p => p.Constitution.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Total Cost',
  {
      expr: p => p.Luck.TotalCost,
      format: 'spaced_number'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Pet',
  {
      expr: p => p.Primary.Pet,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Equipment',
  {
      expr: p => p.Strength.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Equipment',
  {
      expr: p => p.Dexterity.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Equipment',
  {
      expr: p => p.Intelligence.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Equipment',
  {
      expr: p => p.Constitution.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Equipment',
  {
      expr: p => p.Luck.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Equipment',
  {
      expr: p => p.Primary.Equipment,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Items',
  {
      expr: p => p.Strength.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Items',
  {
      expr: p => p.Dexterity.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Items',
  {
      expr: p => p.Intelligence.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Items',
  {
      expr: p => p.Constitution.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Items',
  {
      expr: p => p.Luck.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Items',
  {
      expr: p => p.Primary.Items,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Base Items',
  {
      expr: p => p.Strength.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Base Items',
  {
      expr: p => p.Dexterity.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Base Items',
  {
      expr: p => p.Intelligence.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Base Items',
  {
      expr: p => p.Constitution.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Base Items',
  {
      expr: p => p.Luck.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Base Items',
  {
      expr: p => p.Primary.ItemsBase,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Upgrades',
  {
      expr: p => p.Strength.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Upgrades',
  {
      expr: p => p.Dexterity.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Upgrades',
  {
      expr: p => p.Intelligence.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Upgrades',
  {
      expr: p => p.Constitution.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Upgrades',
  {
      expr: p => p.Luck.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Upgrades',
  {
      expr: p => p.Primary.Upgrades,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Gems',
  {
      expr: p => p.Strength.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Gems',
  {
      expr: p => p.Dexterity.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Gems',
  {
      expr: p => p.Intelligence.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Gems',
  {
      expr: p => p.Constitution.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Gems',
  {
      expr: p => p.Luck.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Gems',
  {
      expr: p => p.Primary.Gems,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Potion',
  {
      expr: p => p.Strength.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Potion',
  {
      expr: p => p.Dexterity.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Potion',
  {
      expr: p => p.Intelligence.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Potion',
  {
      expr: p => p.Constitution.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Potion',
  {
      expr: p => p.Luck.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Potion',
  {
      expr: p => p.Primary.Potion,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Pet Bonus',
  {
      expr: p => p.Strength.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Pet Bonus',
  {
      expr: p => p.Dexterity.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Pet Bonus',
  {
      expr: p => p.Intelligence.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Pet Bonus',
  {
      expr: p => p.Constitution.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Pet Bonus',
  {
      expr: p => p.Luck.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Pet Bonus',
  {
      expr: p => p.Primary.PetBonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Class',
  {
      expr: p => p.Strength.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Class',
  {
      expr: p => p.Dexterity.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Class',
  {
      expr: p => p.Intelligence.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Class',
  {
      expr: p => p.Constitution.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Class',
  {
      expr: p => p.Luck.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Attribute Class',
  {
      expr: p => p.Primary.Class,
      width: 110
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Strength Bonus',
  {
      expr: p => p.Strength.Bonus,
      alias: 'Str Bonus'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dexterity Bonus',
  {
      expr: p => p.Dexterity.Bonus,
      alias: 'Dex Bonus'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Intelligence Bonus',
  {
      expr: p => p.Intelligence.Bonus,
      alias: 'Int Bonus'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Constitution Bonus',
  {
      expr: p => p.Constitution.Bonus,
      alias: 'Con Bonus'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Luck Bonus',
  {
      expr: p => p.Luck.Bonus,
      alias: 'Lck Bonus'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Bonus',
  {
      expr: p => p.Primary.Bonus
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Strength',
  {
      expr: p => p.Strength.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Dexterity',
  {
      expr: p => p.Dexterity.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Intelligence',
  {
      expr: p => p.Intelligence.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Constitution',
  {
      expr: p => p.Constitution.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base Luck',
  {
      expr: p => p.Luck.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Base',
  {
      expr: p => p.Primary.Base
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Honor',
  {
      expr: p => p.Honor
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Life Potion',
  {
      expr: p => p.Potions.Life == 25,
      format: 'boolean'
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Life Potion Index',
  {
      expr: p => p.Potions.LifeIndex,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Runes',
  {
      expr: p => p.Runes.Runes,
      format: (p, x) => `e${x}`,
      width: 100
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Action Index',
  {
      expr: p => p.Action.Index,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Status',
  {
      expr: p => p.Action.Status,
      format: (p, x) => intl(`general.action${x}`),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Action Finish',
  {
      expr: p => p.Action.Finish,
      format: 'datetime',
      width: 160,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Action Unclaimed',
  {
      expr: p => p.OriginalAction.Status < 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Health',
  {
      expr: p => p.Health,
      width: 120
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Armor',
  {
      expr: p => p.Armor
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Min',
  {
      expr: p => p.Damage.Min
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Max',
  {
      expr: p => p.Damage.Max
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Avg',
  {
      expr: p => p.Damage.Avg
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Min 2',
  {
      expr: p => p.Damage2.Min
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Max 2',
  {
      expr: p => p.Damage2.Max
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Damage Avg 2',
  {
      expr: p => p.Damage2.Avg
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Space',
  {
      expr: p => 5 + p.Fortress.Treasury
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Mirror',
  {
      expr: p => p.Mirror ? 13 : p.MirrorPieces
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Equipment',
  {
      expr: p => Object.values(p.Items).reduce((c, i) => c + (i.Attributes[0] > 0 ? i.getItemLevel() : 0), 0),
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Tower',
  {
      expr: p => Math.max(0, p.Dungeons.Tower)
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Raids',
  {
      expr: p => p.Dungeons.Raid
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Portal',
  {
      expr: p => Math.max(0, p.Dungeons.Player)
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild Portal',
  {
      expr: p => p.Dungeons.Group,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dungeon',
  {
      expr: p => p.Dungeons.Normal.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Shadow Dungeon',
  {
      expr: p => p.Dungeons.Shadow.Total
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Dungeon Unlocked',
  {
      expr: p => p.Dungeons.Normal.Unlocked
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Shadow Unlocked',
  {
      expr: p => p.Dungeons.Shadow.Unlocked
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fortress',
  {
      expr: p => p.Fortress.Fortress
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Upgrades',
  {
      expr: p => p.Fortress.Upgrades
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Warriors',
  {
      expr: p => p.Fortress.Warriors
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Archers',
  {
      expr: p => p.Fortress.Archers
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Mages',
  {
      expr: p => p.Fortress.Mages
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Warrior Count',
  {
      expr: p => p.Fortress.Barracks * 3
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Archer Count',
  {
      expr: p => p.Fortress.ArcheryGuild * 2
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Mage Count',
  {
      expr: p => p.Fortress.MageTower
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Upgrades',
  {
      expr: p => p.Fortress.Upgrades
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Gem Mine',
  {
      expr: p => p.Fortress.GemMine
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fortress Honor',
  {
      expr: p => p.Fortress.Honor,
      width: 150
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Raid Honor',
  {
      expr: p => p.Fortress.RaidHonor,
      width: 120
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Wall',
  {
      expr: p => p.Fortress.Wall
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fortifications',
  {
      expr: p => p.Fortress.Fortifications
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Quarters',
  {
      expr: p => p.Fortress.LaborerQuarters
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Woodcutter',
  {
      expr: p => p.Fortress.WoodcutterGuild
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Quarry',
  {
      expr: p => p.Fortress.Quarry
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Academy',
  {
      expr: p => p.Fortress.Academy
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Archery Guild',
  {
      expr: p => p.Fortress.ArcheryGuild
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Barracks',
  {
      expr: p => p.Fortress.Barracks
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Mage Tower',
  {
      expr: p => p.Fortress.MageTower
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Treasury',
  {
      expr: p => p.Fortress.Treasury
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Smithy',
  {
      expr: p => p.Fortress.Smithy
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Raid Wood',
  {
      expr: p => p.Fortress.RaidWood
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Raid Stone',
  {
      expr: p => p.Fortress.RaidStone
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Shadow',
  {
      expr: p => p.Pets.Shadow
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Light',
  {
      expr: p => p.Pets.Light
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Earth',
  {
      expr: p => p.Pets.Earth
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fire',
  {
      expr: p => p.Pets.Fire
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Water',
  {
      expr: p => p.Pets.Water
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Gold',
  {
      expr: p => p.Runes.Gold
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune XP',
  {
      expr: p => p.Runes.XP
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Chance',
  {
      expr: p => p.Runes.Chance,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Quality',
  {
      expr: p => p.Runes.Quality,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Health',
  {
      expr: p => p.Runes.Health,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Damage',
  {
      expr: p => p.Runes.Damage,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Damage 2',
  {
      expr: p => p.Runes.Damage2,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rune Resist',
  {
      expr: p => p.Runes.Resistance,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fire Resist',
  {
      expr: p => p.Runes.ResistanceFire,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Cold Resist',
  {
      expr: p => p.Runes.ResistanceCold,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Lightning Resist',
  {
      expr: p => p.Runes.ResistanceLightning,
      width: 160
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fire Damage',
  {
      expr: p => p.Runes.DamageFire,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Cold Damage',
  {
      expr: p => p.Runes.DamageCold,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Lightning Damage',
  {
      expr: p => p.Runes.DamageLightning,
      width: 160
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fire Damage 2',
  {
      expr: p => p.Runes.Damage2Fire,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Cold Damage 2',
  {
      expr: p => p.Runes.Damage2Cold,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Lightning Damage 2',
  {
      expr: p => p.Runes.Damage2Lightning,
      width: 160
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Class',
  {
      expr: p => p.Class,
      format: (p, x) => intl(`general.class${x}`),
      flip: true,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Race',
  {
      expr: p => p.Race,
      format: (p, x) => intl(`general.race${x}`),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Gender',
  {
      expr: p => p.Gender,
      format: (p, x) => intl(`general.gender${x}`),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Rank',
  {
      expr: p => p.Rank,
      flip: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Mount',
  {
      expr: p => p.Mount,
      format: (p, x) => x ? `${['', 10, 20, 30, 50][x]}%` : '',
      difference: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Awards',
  {
      expr: p => p.Achievements.Owned,
      decorators: [
          {
              condition: h => h.hydra,
              apply: h => {
                  h.value.extra = p => p && p.Achievements.Dehydration ? CellGenerator.Small(' H') : ''
              }
          }
      ]
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Album',
  {
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
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Album Items',
  {
      expr: p => p.Book,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Fortress Rank',
  {
      expr: p => p.Fortress.Rank,
      flip: true,
      width: 130
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Building',
  {
      expr: p => p.Fortress.Upgrade.Building,
      width: 180,
      format: (p, x) => x >= 0 ? intl(`general.buildings.fortress${x + 1}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Building Finish',
  {
      expr: p => p.Fortress.Upgrade.Finish,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Building Start',
  {
      expr: p => p.Fortress.Upgrade.Start,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Timestamp',
  {
      expr: p => p.Timestamp,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Guild Joined',
  {
      expr: p => (p && p.hasGuild()) ? p.Group.Joined : undefined,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Achievements',
  {
      expr: p => p.Achievements.Owned
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Pets Unlocked',
  {
      expr: p => p.Achievements.PetLover,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Grail Unlocked',
  {
      expr: p => p.Achievements.Grail,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Hydra Dead',
  {
      expr: p => p.Achievements.Dehydration,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'XP',
  {
      expr: p => p.XP,
      format: 'spaced_number',
      format_diff: true,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'XP Required',
  {
      expr: p => p.XPNext,
      format: 'spaced_number',
      format_diff: true,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'XP Total',
  {
      expr: p => p.XPTotal,
      format: 'spaced_number',
      format_diff: true,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Enchantments',
  {
      expr: p => Object.values(p.Items).reduce((col, i) => col + (i.HasEnchantment ? 1 : 0), 0)
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Archeological Aura',
  {
      expr: p => p.Items.Head.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Marios Beard',
  {
      expr: p => p.Items.Body.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Shadow of the Cowboy',
  {
      expr: p => p.Items.Hand.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', '36960 Feet Boots',
  {
      expr: p => p.Items.Feet.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Unholy Acquisitiveness',
  {
      expr: p => p.Items.Neck.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Thirsty Wanderer',
  {
      expr: p => p.Items.Belt.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Grave Robbers Prayer',
  {
      expr: p => p.Items.Ring.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Robber Baron Ritual',
  {
      expr: p => p.Items.Misc.HasEnchantment ? 1 : 0,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Sword of Vengeance',
  {
      expr: p => (p.Items.Wpn1.HasEnchantment ? 1 : 0) + (p.Items.Wpn2.HasEnchantment ? 1 : 0),
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 1 Size',
  {
      expr: p => p.Potions[0].Size,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 2 Size',
  {
      expr: p => p.Potions[1].Size,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 3 Size',
  {
      expr: p => p.Potions[2].Size,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 1 Type',
  {
      expr: p => p.Potions[0].Type,
      format: (p, x) => x ? intl(`general.potion${x}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 2 Type',
  {
      expr: p => p.Potions[1].Type,
      format: (p, x) => x ? intl(`general.potion${x}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potion 3 Type',
  {
      expr: p => p.Potions[2].Type,
      format: (p, x) => x ? intl(`general.potion${x}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Tag',
  {
      expr: p => p.Data.tag,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Gold Frame',
  {
      expr: p => p.Flags.GoldFrame,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Official Creator',
  {
      expr: p => p.Flags.OfficialCreator,
      format: 'boolean',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'GT Background',
  {
      expr: p => p.Flags.GroupTournamentBackground,
      format: (p, x) => x ? intl(`general.gt_background${x}`) : intl('general.none'),
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'public', 'Potions',
  {
      expr: p => p.Potions,
      format: (p, i) => i.Size,
      order: (p) => _fastSum(p.Potions.map((v) => v.Size)),
      visible: false,
      difference: false,
      width: 33,
      grouped: 3
  }
)

/*
  Protected headers
*/
TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Last Active',
  {
      expr: p => p.LastOnline,
      format: 'datetime',
      width: 160,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Inactive Time',
  {
      expr: p => p.Timestamp - p.LastOnline,
      format: 'duration',
      flip: true,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Knights',
  {
      expr: p => p.Fortress.Knights,
      decorators: [
          {
              condition: h => h.maximum,
              apply: h => {
                  h.value.format = (p, x) => p ? `${p.Fortress.Knights}/${p.Fortress.Fortress}` : x
              }
          }
      ]
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Treasure',
  {
      expr: p => p.Group.Treasure
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Instructor',
  {
      expr: p => p.Group.Instructor,
      width: 100
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Pet',
  {
      expr: p => p.Group.Pet
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Portal Floor',
  {
      expr: p => _dig(p, 'Group', 'Group', 'PortalFloor')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Portal Life',
  {
      expr: p => _dig(p, 'Group', 'Group', 'PortalLife')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Portal Percent',
  {
      expr: p => _dig(p, 'Group', 'Group', 'PortalPercent')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Honor',
  {
      expr: p => _dig(p, 'Group', 'Group', 'Honor')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Knights',
  {
      expr: p => _dig(p, 'Group', 'Group', 'TotalKnights')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Treasure',
  {
      expr: p => (_dig(p, 'Group', 'Group', 'TotalTreasure') || 0) + 2 * Math.min(p.Dungeons.Raid, 50)
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'Guild Instructor',
  {
      expr: p => (_dig(p, 'Group', 'Group', 'TotalInstructor') || 0) + 2 * Math.min(p.Dungeons.Raid, 50)
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'GT Tokens',
  {
      expr: p => _dig(p, 'GroupTournament', 'Tokens')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'GT Floor',
  {
      expr: p => _dig(p, 'GroupTournament', 'Floor')
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'protected', 'GT Maximum Floor',
  {
      expr: p => _dig(p, 'GroupTournament', 'FloorMax')
  }
)

/*
  Private headers
*/
TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Webshop ID',
  {
      expr: p => p.WebshopID,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Mount Expire',
  {
      expr: p => p.MountExpire,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Wood',
  {
      expr: p => p.Fortress.Wood
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stone',
  {
      expr: p => p.Fortress.Stone
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Used Beers',
  {
      expr: p => p.UsedBeers,
      statistics: false,
      difference: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Scrapbook Items',
  {
      expr: p => p.Scrapbook
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Scrapbook Legendaries',
  {
      expr: p => p.ScrapbookLegendary
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Aura',
  {
      expr: p => p.Toilet.Aura,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Toilet Fill',
  {
      expr: p => p.Toilet.Fill,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shrooms',
  {
      expr: p => _dig(p, 'Mushrooms', 'Current'),
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Coins',
  {
      expr: p => p.Coins,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shrooms Total',
  {
      expr: p => _dig(p, 'Mushrooms', 'Total'),
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shrooms Free',
  {
      expr: p => _dig(p, 'Mushrooms', 'Free'),
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shrooms Paid',
  {
      expr: p => _dig(p, 'Mushrooms', 'Paid'),
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Hourglass',
  {
      expr: p => p.Hourglass,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Potion Expire',
  {
      expr: p => p.Own ? (p.Potions[0].Size == 0 ? 0 : Math.min(... (p.Potions.filter(pot => pot.Size > 0).map(pot => pot.Expire)))) : undefined,
      format: (p, x) => x == undefined ? '?' : _formatDate(x),
      width: 160,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Crystals',
  {
      expr: p => p.Crystals,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Metal',
  {
      expr: p => p.Metal,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Pet Rank',
  {
      expr: p => p.Pets.Rank <= 0 ? undefined : p.Pets.Rank,
      flip: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Pet Honor',
  {
      expr: p => p.Pets.Honor
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '1 Catacombs',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[0])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '2 Mines',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[1])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '3 Ruins',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[2])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '4 Grotto',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[3])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '5 Altar',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[4])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '6 Tree',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[5])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '7 Magma',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[6])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '8 Temple',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[7])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '9 Pyramid',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[8])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '10 Fortress',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[9])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '11 Circus',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[10])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '12 Hell',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[11])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '13 Floor',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[12])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '14 Easteros',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[13])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '15 Academy',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[14])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '16 Hemorridor',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[15])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '17 Nordic',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[16])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '18 Greek',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[17])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '19 Birthday',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[18])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '20 Dragons',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[19])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '21 Horror',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[20])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '22 Superheroes',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[21])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '23 Anime',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[22])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '24 Giant Monsters',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[23])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '25 City',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[24])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '26 Magic Express',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[25])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '27 Mountain',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[26])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', '28 Playa',
  {
      expr: p => Math.max(0, p.Dungeons.Normal[27])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S1 Catacombs',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[0])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S2 Mines',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[1])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S3 Ruins',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[2])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S4 Grotto',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[3])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S5 Altar',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[4])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S6 Tree',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[5])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S7 Magma',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[6])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S8 Temple',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[7])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S9 Pyramid',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[8])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S10 Fortress',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[9])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S11 Circus',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[10])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S12 Hell',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[11])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S13 Floor',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[12])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S14 Easteros',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[13])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S15 Academy',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[14])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S16 Hemorridor',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[15])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S17 Nordic',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[16])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S18 Greek',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[17])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S19 Birthday',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[18])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S20 Dragons',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[19])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S21 Horror',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[20])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S22 Superheroes',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[21])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S23 Anime',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[22])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S24 Giant Monsters',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[23])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S25 City',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[24])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S26 Magic Express',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[25])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S27 Mountain',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[26])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'S28 Playa',
  {
      expr: p => Math.max(0, p.Dungeons.Shadow[27])
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Youtube',
  {
      expr: p => Math.max(0, p.Dungeons.Youtube),
      statistics: false,
      width: 120
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Twister',
  {
      expr: p => Math.max(0, p.Dungeons.Twister),
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Scrolls',
  {
      expr: p => p.Witch.Stage
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Scroll Finish',
  {
      expr: p => p.Witch.Finish,
      format: 'datetime',
      difference: false,
      statistics: false,
      width: 160
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Witch Item',
  {
      expr: p => p.Witch.Item,
      format: (p, x) => x ? intl(`general.item${x}`) : ''
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Witch Items',
  {
      expr: p => p.Witch.Items
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Witch Items Required',
  {
      expr: p => p.Witch.ItemsNext
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Registered',
  {
      expr: p => p.Registered,
      format: 'datetime',
      width: 160,
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Heart of Darkness',
  {
      expr: p => p.Underworld ? p.Underworld.Heart : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Underworld Gate',
  {
      expr: p => p.Underworld ? p.Underworld.Gate : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Gold Pit',
  {
      expr: p => p.Underworld ? p.Underworld.GoldPit : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Extractor',
  {
      expr: p => p.Underworld ? p.Underworld.Extractor : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Goblin Pit',
  {
      expr: p => p.Underworld ? p.Underworld.GoblinPit : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Goblin Upgrades',
  {
      expr: p => p.Underworld ? p.Underworld.GoblinUpgrades : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Torture Chamber',
  {
      expr: p => p.Underworld ? p.Underworld.Torture : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Gladiator Trainer',
  {
      expr: p => p.Fortress.Gladiator,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Gladiator',
  {
      expr: p => p.Fortress.Gladiator,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Troll Block',
  {
      expr: p => p.Underworld ? p.Underworld.TrollBlock : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Troll Upgrades',
  {
      expr: p => p.Underworld ? p.Underworld.TrollUpgrades : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine',
  {
      expr: p => p.Underworld ? p.Underworld.TimeMachine : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine Shrooms',
  {
      expr: p => p.Underworld ? p.Underworld.TimeMachineMushrooms : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Keeper',
  {
      expr: p => p.Underworld ? p.Underworld.Keeper : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Keeper Upgrades',
  {
      expr: p => p.Underworld ? p.Underworld.KeeperUpgrades : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Souls',
  {
      expr: p => p.Underworld ? p.Underworld.Souls : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Extractor Max',
  {
      expr: p => p.Underworld ? p.Underworld.ExtractorMax : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Max Souls',
  {
      expr: p => p.Underworld ? p.Underworld.MaxSouls : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Extractor Hourly',
  {
      expr: p => p.Underworld ? p.Underworld.ExtractorHourly : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Gold Pit Max',
  {
      expr: p => p.Underworld ? p.Underworld.GoldPitMax : undefined,
      format: 'spaced_number',
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Gold Pit Hourly',
  {
      expr: p => p.Underworld ? p.Underworld.GoldPitHourly : undefined,
      format: 'spaced_number',
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine Thirst',
  {
      expr: p => p.Underworld ? p.Underworld.TimeMachineThirst : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine Max',
  {
      expr: p => p.Underworld ? p.Underworld.TimeMachineMax : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine Daily',
  {
      expr: p => p.Underworld && p.Underworld.TimeMachineDaily ? Math.trunc(p.Underworld.TimeMachineDaily * 0.25) : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Time Machine Daily Max',
  {
      expr: p => p.Underworld ? p.Underworld.TimeMachineDaily : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Underworld Building',
  {
      expr: p => p.Underworld ? p.Underworld.Upgrade.Building : undefined,
      width: 180,
      format: (p, x) => x >= 0 ? intl(`general.buildings.underworld${x + 1}`) : '',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Underworld Building Finish',
  {
      expr: p => p.Underworld ? p.Underworld.Upgrade.Finish : -1,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Underworld Building Start',
  {
      expr: p => p.Underworld ? p.Underworld.Upgrade.Start : -1,
      format: 'datetime',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Woodcutter Max',
  {
      expr: p => p.Fortress.WoodcutterMax,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Quarry Max',
  {
      expr: p => p.Fortress.QuarryMax,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Academy Max',
  {
      expr: p => p.Fortress.AcademyMax,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Wood Capacity',
  {
      expr: p => p.Fortress.MaxWood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stone Capacity',
  {
      expr: p => p.Fortress.MaxStone,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stashed Wood',
  {
      expr: p => p.Fortress.SecretWood
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stashed Stone',
  {
      expr: p => p.Fortress.SecretStone
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stashed Wood Capacity',
  {
      expr: p => p.Fortress.SecretWoodLimit
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Stashed Stone Capacity',
  {
      expr: p => p.Fortress.SecretStoneLimit
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Sacrifices',
  {
      expr: p => p.Idle ? p.Idle.Sacrifices : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Money',
  {
      expr: p => p.Idle ? p.Idle.Money : undefined,
      format: 'exponential_number',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Runes Collected',
  {
      expr: p => p.Idle ? p.Idle.Runes : undefined,
      format: 'exponential_number',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Runes Ready',
  {
      expr: p => p.Idle ? p.Idle.ReadyRunes : undefined,
      format: 'exponential_number',
      difference: false,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Idle Upgrades',
  {
      expr: p => p.Idle ? p.Idle.Upgrades.Total : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Speed Upgrades',
  {
      expr: p => p.Idle ? p.Idle.Upgrades.Speed : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Money Upgrades',
  {
      expr: p => p.Idle ? p.Idle.Upgrades.Money : undefined,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shadow Count',
  {
      expr: p => p.Pets.ShadowCount,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Light Count',
  {
      expr: p => p.Pets.LightCount,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Earth Count',
  {
      expr: p => p.Pets.EarthCount,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Fire Count',
  {
      expr: p => p.Pets.FireCount,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Water Count',
  {
      expr: p => p.Pets.WaterCount,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shadow Level',
  {
      expr: p => p.Pets.ShadowLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Light Level',
  {
      expr: p => p.Pets.LightLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Earth Level',
  {
      expr: p => p.Pets.EarthLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Fire Level',
  {
      expr: p => p.Pets.FireLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Water Level',
  {
      expr: p => p.Pets.WaterLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Total Pet Level',
  {
      expr: p => p.Pets.TotalLevel,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Shadow Food',
  {
      expr: p => p.Pets.ShadowFood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Light Food',
  {
      expr: p => p.Pets.LightFood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Earth Food',
  {
      expr: p => p.Pets.EarthFood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Fire Food',
  {
      expr: p => p.Pets.FireFood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Water Food',
  {
      expr: p => p.Pets.WaterFood,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Summer Score',
  {
      expr: p => p.Summer.TotalPoints,
      statistics: false
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Dummy',
  {
      expr: p => p.Inventory ? p.Inventory.Dummy : undefined,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Backpack',
  {
      expr: p => p.Inventory ? p.Inventory.Backpack : undefined,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Chest',
  {
      expr: p => p.Inventory ? p.Inventory.Chest : undefined,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Bert Items',
  {
      expr: p => p.Inventory ? p.Inventory.Bert : undefined,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Kunigunde Items',
  {
      expr: p => p.Inventory ? p.Inventory.Kunigunde : undefined,
      disabled: true
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'header', 'private', 'Mark Items',
  {
      expr: p => p.Inventory ? p.Inventory.Mark : undefined,
      disabled: true
  }
)

/*
  Accessors
*/
TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Strength',
  function (object) {
      return object.Strength.Value;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Dexterity',
  function (object) {
      return object.Dexterity.Value;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Intelligence',
  function (object) {
      return object.Intelligence.Value;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Constitution',
  function (object) {
      return object.Constitution.Value;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Luck',
  function (object) {
      return object.Luck.Value;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Attribute',
  function (object, player) {
      if (player) {
          switch (player.Primary.Type) {
              case 1: return object.Strength.Value;
              case 2: return object.Dexterity.Value;
              case 3: return object.Intelligence.Value;
              default: return 0;
          }
      } else {
          return 0;
      }
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Type',
  function (object) {
      return object.Type;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Name',
  function (object) {
      return object.Name;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Upgrades',
  function (object) {
      return object.Upgrades;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Rune',
  function (object) {
      return object.RuneType;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Rune Value',
  function (object) {
      return object.RuneValue;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Gem',
  function (object) {
      return object.GemType;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Gem Value',
  function (object) {
      return object.GemValue;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Gold',
  function (object) {
      return object.SellPrice.Gold;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Sell Crystal',
  function (object) {
      return object.SellPrice.Crystal;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Sell Metal',
  function (object) {
      return object.SellPrice.Metal;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Dismantle Crystal',
  function (object) {
      return object.DismantlePrice.Crystal;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Item Dismantle Metal',
  function (object) {
      return object.DismantlePrice.Metal;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Potion Type',
  function (object) {
      return object.Type;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Potion Size',
  function (object) {
      return object.Size;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Inventory Kind',
  function (object) {
      return object.SlotType;
  }
)

TABLE_EXPRESSION_CONFIG.register(
  'accessor', 'none', 'Inventory Slot',
  function (object) {
      return object.SlotIndex;
  }
)
