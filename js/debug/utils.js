const SimulatorDebugDialog = new (class extends Dialog {
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

    _getValue (path, def) {
        const value = this.$parent.find(`[data-path="${path}"]`).val()

        if (typeof def === 'string') {
            return value;
        } else if (typeof def === 'boolean') {
            return value !== '0'
        } else {
            return parseFloat(value || def);
        }
    }

    _convertValue (val) {
        if (typeof val === 'boolean') {
            return val ? '1' : '0';
        } else {
            return val;
        }
    }

    _readData () {
        const data = {};

        for (const [group, groupItems] of Object.entries(this.defaultConfig)) {
            data[group] = {}

            for (const [key, value] of Object.entries(groupItems)) {
                if (Array.isArray(value)) {
                    data[group][key] = [];

                    for (let i = 0; i < value.length; i++) {
                        data[group][key][i] = this._getValue(`${group}.${key}.${i}`, value[i]);
                    }
                } else {
                    data[group][key] = this._getValue(`${group}.${key}`, value);
                }
            }
        }

        return data;
    }

    _formatKey (key) {
        return key.replace(/([A-Z])/g, ' $1').trim();
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
            `;

            for (const [key, value] of Object.entries(groupItems)) {
                const prettyKey = this._formatKey(key);

                if (Array.isArray(value)) {
                    content += '<div class="equal width fields">';
                    for (let i = 0; i < value.length; i++) {
                        content += `
                            <div class="field">
                                <label>${prettyKey} - ${i + 1}</label>
                                <div class="ui inverted input">
                                    <input type="${typeof value[i] === 'string' ? 'text' : 'number'}" data-path="${group}.${key}.${i}" value="${this._convertValue(value[i])}">
                                </div>
                            </div>
                        `;
                    }

                    content += '</div>';
                } else {
                    content += `
                        <div class="field">
                            <label>${prettyKey}</label>
                            <div class="ui inverted input">
                                <input type="${typeof value === 'string' ? 'text' : 'number'}" data-path="${group}.${key}" value="${this._convertValue(value)}">
                            </div>
                        </div>
                    `;
                }
            }

            content += `
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

const SimulatorUtils = class {
    static #currentConfig;
    static #defaultConfig;

    static #insertType;
    static #display;
    static #debug;

    static #callbacks = new Map();

    static configure ({ params, onCopy, onChange, onInsert, onLog, insertType }) {
        // Updated config
        this.#currentConfig = null;
        this.#defaultConfig = mergeDeep({}, CONFIG);

        // Callbacks
        if (onCopy) this.#callbacks.set('copy', onCopy);
        if (onChange) this.#callbacks.set('change', onChange);
        if (onInsert) this.#callbacks.set('insert', onInsert);
        if (onLog) this.#callbacks.set('log', onLog);

        // Data
        this.#insertType = insertType;

        // Debug elements
        this.#debug = params.has('debug');
        if (this.#debug) {
            this.#insertDebugElements();
        }
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

        if (this.#callbacks.has('insert') && typeof this.#insertType === 'string') {
            fetch('js/debug/data.json').then((response) => response.json()).then((data) => {
                const sampleData = data[this.#insertType];

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
                        ...sampleData.map((sample, index) => ({ name: sample.name, value: index }))
                    ],
                    on: 'hover',
                    delay : {
                        hide: 100,
                        show: 0
                    }
                }).dropdown('setting', 'onChange', (value) => {
                    const { data } = sampleData[parseInt(value)];
                    const method = this.#callbacks.get('insert');

                    method(data);
                });

                $insertButton.insertAfter($dialogButton);
            })
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
            for (const [type, value] of Object.entries(this.#defaultConfig)) {
                const differences = [];
                for (const [subtype, subvalue] of Object.entries(value)) {
                    const customValue = _dig(this.#currentConfig, type, subtype);

                    if (typeof customValue !== 'undefined' && (Array.isArray(subvalue) ? customValue.some((v, i) => v != subvalue[i]) : customValue != subvalue)) {
                        differences.push(`<div>${subtype}: <span class="text-red">${subvalue}</span> -&gt; <span class="text-greenyellow">${customValue}</span></div>`)
                    }
                }

                if (differences.length > 0) {
                    content += `
                        <div>
                            <h4 class="!mt-2 !mb-0">${type}</h4>
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