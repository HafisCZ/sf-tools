(function (w) {
    const LOCA = {
        en: {
            index: {
                admin: 'Someone with a lot of free time',
                helper: 'Helpers - Research, Testing, Feedback, etc.',
                tester: 'Testers',
                cwm: 'Chief Wiki Manager',
                others: 'Other mentions',
                toggle: 'Toggle credits',
                stats: {
                    title: 'Statistics',
                    desc: 'Track progress of yourself and your guild'
                },
                temp: {
                    title: 'Playground',
                    desc: 'Create temporary instance of Statistics'
                },
                wiki: {
                    title: 'Wiki',
                    desc: 'How to do magic with tables and much more'
                },
                runes: {
                    title: 'Rune Bonuses',
                    desc: 'Zorago\'s rune bonus table'
                },
                inventory: {
                    title: 'Inventory Manager',
                    desc: 'Compare items, calculate upgrades & more'
                },
                idle: {
                    title: 'Arena Manager',
                    desc: 'Check the production of your Arena Manager'
                },
                calendar: {
                    title: 'Pet Calendar',
                    desc: 'Look at when you can catch pets'
                },
                compare: {
                    title: 'Item Comparison',
                    desc: 'Look at what changes if you equip the new item'
                },
                players: {
                    title: 'Fight Simulator',
                    desc: 'Simulate the probable outcome of a PvP battle'
                },
                guild: {
                    title: 'Guild Simulator',
                    desc: 'Simulate the probable outcome of a guild battle'
                },
                pets: {
                    title: 'Pet Simulator',
                    desc: 'Simulate the probable outcome of a pet battle'
                },
                dungeons: {
                    title: 'Dungeon Simulator',
                    desc: 'Simulate the probable outcome of a dungeon battle'
                },
                underworld: {
                    title: 'Underworld',
                    desc: 'Simulate the probably outcome of an underworld battle'
                },
                fights: {
                    title: 'Fight viewer',
                    desc: 'Display all PVP fights stored within archive file'
                },
                digest: {
                    title: 'Boss viewer',
                    desc: 'Display all PVE fights stored within archive file'
                },
                atts: {
                    title: 'Gold & Experience',
                    desc: 'Curves & calculators'
                },
                smith: {
                    title: 'Blacksmith Upgrades',
                    desc: 'What it costs and what gets lost'
                },
                hydra: {
                    title: 'Hydra Simulator',
                    desc: 'Simulate which guild pet class is best against current hydra.'
                }
            },
            temporary: 'Temporary'
        }
    }

    function _dig (obj, ... path) {
        for (let i = 0; obj && i < path.length; i++) obj = obj[path[i]];
        return obj;
    }

    window.l = (() => {
        const lo = window.location.href.split(/[\?\&]/).find(v => /lang=(.+)/.test(v));
        return lo ? lo.match(/lang=(.+)/)[1] : 'en';
    })();

    window._t = function (l, o = window.l || 'en') {
        return LOCA[o][l];
    }

    window.localizeAll = function (o = window.l || 'en') {
        for (const t of document.querySelectorAll('[data-loca]')) {
            const p = t.dataset.loca.split('.');
            t.innerText = _dig(LOCA, o, ...p) || `[${ t.dataset.loca }]`;
        }
    }
})(window)
