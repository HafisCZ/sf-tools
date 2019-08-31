class JSONScanner
{
    static* iterate(o, p = [])
    {
        for (var i in o)
        {
            const pp = p.concat(i);
            yield [i, o[i]];

            if (o[i] !== null && typeof(o[i]) == 'object')
            {
                yield* JSONScanner.iterate(o[i], pp);
            }
        }
    }
}

class DateFormatter
{
    static format(d)
    {
        return DateFormatter.trail(d.getDate(), 2) + '.' + DateFormatter.trail(d.getMonth() + 1, 2) + '.' + d.getFullYear() + ' ' + DateFormatter.trail(d.getHours(), 2) + ':' + DateFormatter.trail(d.getMinutes(), 2);
    }

    static trail(c, n)
    {
        var r = '' + c;

        while (r.length < n)
        {
            r = '0' + r;
        }

        return r;
    }
}

class LocalStorageProperty
{
    constructor(key, def)
    {
        this.key = key;
        this.def = def;
    }

    get value()
    {
        return window.localStorage.getItem(this.key) || this.def;
    }

    set value(val)
    {
        window.localStorage.setItem(this.key, val);
    }
}

class LocalStorageBoolProperty extends LocalStorageProperty
{
    constructor(key, def)
    {
        super(key, def);
    }

    get value()
    {
        return window.localStorage.getItem(this.key) === 'true' || this.def;
    }

    set value(val)
    {
        super.value = val;
    }
}

class LocalStorageObjectProperty extends LocalStorageProperty
{
    constructor(key, def)
    {
        super(key, JSON.stringify(def));
    }

    get value()
    {
        return JSON.parse(super.value);
    }

    set value(val)
    {
        super.value = JSON.stringify(val);
    }
}

class SFUtil
{
    static itemMods()
    {
        return {
            weapon: {
                warrior: 2,
                scout: 2.5,
                mage: 4.5
            },
            armor: {
                warrior: 15,
                scout: 7.5,
                mage: 3
            },
            item: {
                normal: 2,
                epic3: 1.2,
                epic5: 1,
                epic1: 5
            }
        };
    }

    static* parse(m)
    {
        var o = m.split('&');

        for (var i in o)
        {
            yield o[i].split(':', 2);
        }
    }

    static itemAttr(player)
    {
        return player.Level + 4 + player.Aura * (player.Witch >= 3 ? 2 + Math.max(0, player.Witch - 3) / 6 : 1);
    }

    static gem(factor, player, group)
    {
        return player.Level * factor * (1 + 0.15 * (player.Fortress.GemMine - 1)) + (group && group.Knights) ? (group.Knights.reduce((a, b) => a + b, 0) / 3) : 0;
    }

    static gemSmall(player, group)
    {
        return gem(0.23, player, group);
    }

    static gemMedium(player, group)
    {
        return gem(0.23, player, group);
    }

    static gemLarge(player, group)
    {
        return gem(0.36, player, group);
    }

    static nor216(v)
    {
        const n = v % Math.pow(2, 16);
        return [n, (v - n) / Math.pow(2, 16)];
    }

    static nor28(v)
    {
        const n = v % Math.pow(2, 8);
        return [n, (v - n) / Math.pow(2, 8)];
    }

    static nor26(v)
    {
        const n = v % Math.pow(2, 6);
        return [n, (v - n) / Math.pow(2, 6)];
    }

    static split(s, d = '/')
    {
        return s.split(d).map(v => Number(v));
    }
}

class MD
{
    static badge(l, ...c)
    {
        return `<span class="badge ${c.join(' ')}">${l}</span>`;
    }

    static nl()
    {
        return '<br>';
    }

    static rif(r, s)
    {
        return r ? s : null;
    }
}

class UIUtil
{
    static dif2(p, cp, f, f1)
    {
        if (cp)
        {
            return UIUtil.dif(p[f], cp[f], f1);
        }

        return ``;
    }

    static dif(p, cp, f)
    {
        if (cp)
        {
            if (p[f] > cp[f])
            {
                return ` <xsm>+${p[f] - cp[f]}</xsm>`;
            }
            else if (p[f] < cp[f])
            {
                return ` <xsm>${p[f] - cp[f]}</xsm>`;
            }
        }

        return ``;
    }

    static difbook(p, c)
    {
        if (c) {
            var v = Math.trunc((p.Book / 21.6 - c.Book / 21.6) * 100) / 100;

            if (v > 0)
            {
                return ` <xsm>+${v.toFixed(2)}%</xsm>`;
            }
            else if (v < 0)
            {
                return ` <xsm>${v.toFixed(2)}%</xsm>`;
            }
        }

        return '';
    }
}

class Str
{
    static split(str, delims, ignore='')
    {
        var delimiters = delims.split('');
        var chars = str.split('');
        var ign = ignore.split('');
        var out = [];
        var word = [];

        for (var i = 0, c; c = chars[i]; i++)
        {
            if (ign.includes(c)) continue;

            if (delimiters.includes(c))
            {
                out.push(word.join(''), c);
                word = [];
            }
            else
            {
                word.push(c);
            }
        }

        out.push(word.join(''));

        return out;
    }
}

class Mat
{
    static normalize(v, base)
    {
        return v % base;
    }

    static pack2(a, b, base)
    {
        return a * base + b;
    }

    static unpack2(v, base)
    {
        let b = v % base;
        let a = (v - b) / base;

        return [a, b];
    }

    static pack3(a, b, c, base)
    {
        return (a * base + b) * base + c;
    }

    static unpack3(v, base)
    {
        let c = v % base;
        let b = ((v - c) / base) % base;
        let a = (((v - c) / base) - b) / base;

        return [a, b, c];
    }
}
