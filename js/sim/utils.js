const SimulatorDebugDialog = new (class SimulatorDebugDialog extends Dialog {
    constructor () {
        super({
            key: 'simulator_debug',
            dismissable: true,
            opacity: 0,
            containerClass: 'debug-dialog'
        })
    }

    _createModal () {
        return `
            <div class="bordered inverted dialog">
                <div class="overflow-y-scroll overflow-x-hidden pr-4">
                    <div class="ui small inverted form" data-op="content"></div>
                </div>
                <div class="ui three fluid buttons">
                    <button class="ui black button" data-op="cancel">${this.intl('cancel')}</button>
                    <button class="ui button" data-op="reset">${this.intl('reset')}</button>
                    <button class="ui button !text-black !background-orange" data-op="ok">${this.intl('ok')}</button>
                </div>
            </div>
        `;
    }

    _createBindings () {
        this.$cancelButton = this.$parent.find('[data-op="cancel"]');
        this.$cancelButton.click(() => {
            this.close();
        });

        this.$okButton = this.$parent.find('[data-op="ok"]');
        this.$okButton.click(() => {
            this.callback(this._readData());
            this.close();
        })

        this.$resetButton = this.$parent.find('[data-op="reset"]');
        this.$resetButton.click(() => {
            this._setData();
        })

        this.$content = this.$parent.find('[data-op="content"]');
    }

    _getValue (path, defaultValue) {
        const field = this.$parent.find(`[data-path="${path}"]`).get(0);

        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'text') {
            return field.value;
        } else if (field.type === 'number') {
            return parseFloat(field.value || defaultValue);
        } else {
            return defaultValue;
        }
    }

    _readGroup (value, path) {
        if (Array.isArray(value)) {
            const arr = [];

            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'object') {
                    arr[i] = this._readGroup(value[i], [...path, i]);
                } else {
                    arr[i] = this._getValue(`${path.join('.')}.${i}`, value[i]);
                }
            }

            return arr;
        } else if (typeof value === 'object') {
            const obj = {};
            for (const [k, v] of Object.entries(value)) {
                obj[k] = this._readGroup(v, [...path, k]);
            }

            return obj;
        } else {
            return this._getValue(path.join('.'), value);
        }
    }

    _readData () {
        return this._readGroup(this.defaultConfig, []);
    }

    _formatKey (path) {
        return path.slice(1).map((key) => key.replace(/([A-Z])/g, ' $1').trim()).join(' - ')
    }

    _inputType (value) {
        if (typeof value === 'string') {
            return 'text';
        } else if (typeof value === 'boolean') {
            return 'checkbox';
        } else {
            return 'number';
        }
    }

    _inputValue (value) {
        if (typeof value === 'boolean') {
            return `style="margin-top: 0.5em; flex: 0;" ${value ? 'checked' : ''}`;
        } else {
            return `value="${value}"`;
        }
    }

    _renderGroup (group, path) {
        let content = ''

        for (const [key, value] of Object.entries(group)) {
            const prettyKey = this._formatKey([...path, key]);

            if (Array.isArray(value) && typeof value[0] !== 'object') {
                content += '<div class="equal width fields">';
                for (let i = 0; i < value.length; i++) {
                    content += `
                        <div class="field">
                            <label>${prettyKey} - ${i + 1}</label>
                            <div class="ui inverted input">
                                <input type="${this._inputType(value[i])}" data-path="${[...path, key, i].join('.')}" ${this._inputValue(value[i])}>
                            </div>
                        </div>
                    `;
                }

                content += '</div>';
            } else if (typeof value === 'object') {
                content += this._renderGroup(value, [...path, key]);
            } else {
                content += `
                    <div class="field">
                        <label>${prettyKey}</label>
                        <div class="ui inverted input">
                            <input type="${this._inputType(value)}" data-path="${[...path, key].join('.')}" ${this._inputValue(value)}>
                        </div>
                    </div>
                `;
            }
        }

        return content
    }

    _setData (currentConfig) {
        this.currentConfig = currentConfig || this.defaultConfig;

        let content = '';
        for (const [group, groupItems] of Object.entries(this.currentConfig)) {
            content += `
                <details class="ui accordion">
                    <summary class="title">
                        <h2 class="ui dividing inverted header text-orange:hover">${group}</h2>
                    </summary>
                    <div class="content mb-4">
                        ${this._renderGroup(groupItems, [group])}
                    </div>
                </details>
            `;
        }

        this.$content.html(content);
    }

    _applyArguments (currentConfig, defaultConfig, callback) {
        this.callback = callback;

        this.currentConfig = null;
        this.defaultConfig = defaultConfig;

        this._setData(currentConfig);
    }
})();

const SimulatorInformationDialog = new (class SimulatorInformationDialog extends Dialog {
    #entries = [
        // EMPTY
    ];

    constructor () {
        super({
            dismissable: true
        })
    }

    get #unresolvedEntries () {
        return this.#entries.filter((entry) => !entry.resolved);
    }

    hasInformation () {
        return this.#unresolvedEntries.length > 0;
    }

    hasUnread () {
        return this.#unresolvedEntries[0].id !== SiteOptions.simulator_info_id;
    }

    _createModal () {
        let html = '';

        for (const { title, text } of this.#unresolvedEntries) {
            html += `
                <div>
                    <h2 class="ui orange centered header">${title}</h2>
                    <p class="text-center">${text}</p>
                </div>
            `;
        }

        return `
            <div class="small bordered inverted dialog">
                <div class="header">${intl('simulator.information')}</div>
                <div class="overflow-y-auto flex flex-col justify-content-center" style="height: 30vh; gap: 5em;">
                    ${html}
                </div>
                <button class="ui black fluid button" data-op="close">${intl('dialog.shared.close')}</button>
            </div>
        `;
    }

    _createBindings () {
        this.$closeButton = this.$parent.find('[data-op="close"]');
        this.$closeButton.click(() => {
            this.close();
        });
    }

    _applyArguments () {
        // Mark as viewed
        SiteOptions.simulator_info_id = this.#unresolvedEntries[0].id;
    }
})

const SimulatorUtils = class {
    static #currentConfig;
    static #defaultConfig;

    static #display;
    static #debug;

    static #callbacks = new Map();

    static configure ({ params, onCopy, onChange, onInsert, onLog }) {
        // Updated config
        this.#currentConfig = null;
        this.#defaultConfig = mergeDeep({}, CONFIG);

        // Callbacks
        if (onCopy) this.#callbacks.set('copy', onCopy);
        if (onChange) this.#callbacks.set('change', onChange);
        if (onInsert) this.#callbacks.set('insert', onInsert);
        if (onLog) this.#callbacks.set('log', onLog);

        // Debug elements
        this.#debug = params && params.has('debug');
        if (this.#debug) {
            this.#insertDebugElements();
        }

        if (SimulatorInformationDialog.hasInformation()) {
            this.#insertInfoElement();
        }
    }

    static #insertInfoElement () {
        const $infoButton = $(`
            <div class="item !p-0">
                <button class="ui basic inverted icon button !box-shadow-none" data-position="bottom center" data-tooltip="${intl('simulator.information')}" data-inverted="">
                    <i class="${SimulatorInformationDialog.hasUnread() ? 'text-orange ' : ''}exclamation triangle icon"></i>
                </button>
            </div>
        `);

        $infoButton.click(() => {
            DialogController.open(SimulatorInformationDialog);

            $infoButton.find('i').removeClass('text-orange');
        });

        $infoButton.insertAfter($('.ui.huge.menu .header.item'));
    }

    static #insertDebugElements () {
        const $dialogButton = $(`
            <div class="item !p-0">
                <button class="ui basic inverted icon button !box-shadow-none" data-position="bottom center" data-tooltip="${intl('simulator.configure')}" data-inverted="">
                    <i class="wrench icon"></i>
                </button>
            </div>
        `);

        $dialogButton.click(() => {
            DialogController.open(
                SimulatorDebugDialog,
                this.#currentConfig,
                this.#defaultConfig,
                (config) => {
                    this.#currentConfig = config;
                    this.#renderConfig();

                    if (this.#callbacks.has('change')) {
                        const method = this.#callbacks.get('change');
                        
                        method(this.#currentConfig);
                    }
                }
            );
        });

        $dialogButton.insertAfter($('.ui.huge.menu .header.item'))

        if (this.#callbacks.has('copy')) {
            // Display copy only if callback is enabled
            const $copyButton = $(`
                <div class="item !p-0">
                    <button class="ui basic inverted icon button !box-shadow-none" data-position="bottom center" data-tooltip="${intl('simulator.configure_copy')}" data-inverted="">
                        <i class="copy icon"></i>
                    </button>
                </div>
            `);

            $copyButton.click(() => {
                const method = this.#callbacks.get('copy');

                copyJSON({
                    config: this.#currentConfig,
                    data: method(),
                    type: 'custom'
                });
            });

            $copyButton.insertAfter($dialogButton);
        }

        if (this.#callbacks.has('log')) {
            // Display log button if enabled
            const $logButton = $(`
                <div class="ui dropdown inverted item !p-0">
                    <button class="ui basic inverted icon button !box-shadow-none">
                        <i class="file archive icon"></i>
                    </button>
                    <div class="menu" style="width: 350px; font-size: 1rem;"></div>
                </div>
            `);

            $logButton.dropdown({
                values: [
                    {
                        name: intl('simulator.configure_log'),
                        type: 'header',
                        class: 'header text-center'
                    },
                    {
                        value: 'file',
                        name: intl('simulator.configure_log_file'),
                        icon: 'download'
                    },
                    {
                        value: 'broadcast',
                        name: intl('simulator.configure_log_broadcast'),
                        icon: 'rss'
                    },
                ],
                on: 'hover',
                action: 'hide',
                delay : {
                    hide: 100,
                    show: 0
                }
            }).dropdown('setting', 'onChange', (value) => {
                const method = this.#callbacks.get('log');
                
                method((json) => {
                    if (value === 'file') {
                        Exporter.json(
                            json,
                            `simulator_log_${Exporter.time}`
                        );
                    } else if (value === 'broadcast') {
                        const broadcast = new Broadcast();

                        broadcast.on('token', () => {
                            broadcast.send('data', json);
                            broadcast.close();
                        })

                        window.open(`${window.location.origin}/analyzer.html?debug&broadcast=${broadcast.token}`, '_blank');
                    }
                });
            })

            $logButton.insertAfter($dialogButton);
        }

        if (this.#callbacks.has('insert')) {
            fetch('js/sim/presets.json').then((response) => response.json()).then((presets) => {
                const $insertButton = $(`
                    <div class="ui mini dropdown inverted item !p-0">
                        <button class="ui basic inverted icon button !box-shadow-none">
                            <i class="tasks icon"></i>
                        </button>
                        <div class="menu" style="width: 300px; font-size: 1rem;"></div>
                    </div>
                `);

                $insertButton.dropdown({
                    action: 'hide',
                    values: [
                        {
                            name: intl('simulator.configure_insert'),
                            type: 'header',
                            class: 'header text-center'
                        },
                        ...presets.map((sample, index) => ({ name: sample.name, value: index })),
                        {
                            name: intl('simulator.configure_insert_custom'),
                            icon: 'pencil',
                            value: 'custom'
                        }
                    ],
                    on: 'hover',
                    delay : {
                        hide: 100,
                        show: 0
                    }
                }).dropdown('setting', 'onChange', (value) => {
                    const method = this.#callbacks.get('insert');

                    if (value === 'custom') {
                        DialogController.open(
                            SimulatorCustomPresetDialog,
                            (data) => {
                                method(CONFIG.indexes().map((index) => this.#generatePlayerFromSample(data, index)));
                            }
                        )
                    } else {
                        const { data, suffix } = presets[parseInt(value)];
    
                        method(CONFIG.indexes().map((index) => this.#generatePlayerFromSample(data, index, suffix)));
                    }
                });

                $insertButton.insertAfter($dialogButton);
            })
        }
    }

    static #generatePlayerFromSample (sample, newClass, suffix) {
        const oldDefinition = CONFIG.fromIndex(WARRIOR);
        const newDefinition = CONFIG.fromIndex(newClass);

        // Helper methods
        const getAttributeList = function (attribute) {
            return {
                'Strength': ['Strength', 'Dexterity', 'Intelligence'],
                'Dexterity': ['Dexterity', 'Strength', 'Intelligence'],
                'Intelligence': ['Intelligence', 'Strength', 'Dexterity']
            }[attribute]
        }

        const swapAttributes = function (obj) {
            const oldattributes = getAttributeList(oldDefinition.Attribute).map((kind) => _dig(obj, kind)).map((att) => ({ Base: att.Base, Total: att.Total }));
            const newAttributes = getAttributeList(newDefinition.Attribute);

            for (let i = 0; i < 3; i++) {
                for (const type of ['Base', 'Total']) {
                    obj[newAttributes[i]][type] = oldattributes[i][type];
                }
            }
        }

        const scaleValue = function (value, oldValue, newValue) {
            return Math.ceil(value / oldValue * newValue);
        }

        // Convert data
        const data = _clone(sample);

        swapAttributes(data);

        data.Armor = scaleValue(data.Armor, oldDefinition.MaximumDamageReduction, newDefinition.MaximumDamageReduction);
        data.Items.Wpn1.DamageMin = scaleValue(data.Items.Wpn1.DamageMin, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier);
        data.Items.Wpn1.DamageMax = scaleValue(data.Items.Wpn1.DamageMax, oldDefinition.WeaponMultiplier, newDefinition.WeaponMultiplier);

        if (newClass == WARRIOR) {
            data.BlockChance = newDefinition.SkipChance * 100;

            data.Items.Wpn2 = ItemModel.empty();
            data.Items.Wpn2.DamageMin = newDefinition.SkipChance * 100;
        } else if (newClass == ASSASSIN) {
            data.Items.Wpn2 = data.Items.Wpn1;
        }

        data.Class = newClass;
        data.Name = `${intl(`general.class${newClass}`)}${suffix ? ` - ${suffix}` : ''}`;

        return data;
    }

    static #computeConfigDiff(differences, path) {
        const defaultValue = _dig(this.#defaultConfig, ...path);
        if (Array.isArray(defaultValue) && typeof defaultValue[0] !== 'object') {
            // Array value
            const customValue = _dig(this.#currentConfig, ...path);
            if (typeof customValue !== 'undefined' && customValue.some((v, i) => v != defaultValue[i])) {
                differences.push(`<div>${SimulatorDebugDialog._formatKey(path)}: <span class="text-red">${defaultValue.join(', ')}</span> -&gt; <span class="text-greenyellow">${customValue.join(', ')}</span></div>`)
            }
        } else if (typeof defaultValue === 'object') {
            for (const key of Object.keys(defaultValue)) {
                this.#computeConfigDiff(differences, [...path, key]);
            }
        } else {
            // Value
            const customValue = _dig(this.#currentConfig, ...path);
            if (typeof customValue !== 'undefined' && customValue != defaultValue) {
                differences.push(`<div>${SimulatorDebugDialog._formatKey(path)}: <span class="text-red">${defaultValue}</span> -&gt; <span class="text-greenyellow">${customValue}</span></div>`)
            }
        }
    }

    static #renderConfig () {
        if (typeof this.#display === 'undefined') {
            this.#display = document.createElement('div');
            this.#display.setAttribute('class', 'text-white position-fixed left-8 bottom-8');
            this.#display.setAttribute('style', 'font-size: 90%;');

            document.body.appendChild(this.#display);
        }

        let content = '';
        if (this.#currentConfig) {
            for (const klass of Object.keys(this.#defaultConfig)) {
                const differences = [];

                this.#computeConfigDiff(differences, [klass]);

                if (differences.length > 0) {
                    content += `
                        <div>
                            <h4 class="!mt-2 !mb-0">${klass}</h4>
                            ${differences.join('')}
                        </div>
                    `;
                }
            }
        }

        this.#display.innerHTML = content;
    }

    static handlePaste (json) {
        if (typeof json === 'object' && json.type === 'custom') {
            const { data, config } = json;

            if (this.#debug) {
                this.#currentConfig = config;
                this.#renderConfig();
            }

            return data;
        } else {
            return json;
        }
    }

    static get config () {
        return this.#currentConfig;
    }

    static set config (data) {
        this.#currentConfig = data;
        this.#renderConfig();
    }
}