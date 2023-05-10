Site.ready({ type: 'simulator' }, function () {
    SimulatorUtils.configure({});

    // Handle simulate button validation
    const $simulateButton = $('#simulate');
    const $addButton = $('#add');
    const $saveButton = $('#save');
    const $list = $('#list');

    // Handle list
    let list = [];
    let listLength = 0;
    let listIndex = -1;

    function updateButtons () {
        if (editor.valid()) {
            $addButton.removeClass('disabled');
        } else {
            $addButton.addClass('disabled');
        }
        
        if (listIndex >= 0) {
            $saveButton.removeClass('disabled');
        } else {
            $saveButton.addClass('disabled');
        }

        if (list.length > 0) {
            $simulateButton.removeClass('disabled');
        } else {
            $simulateButton.addClass('disabled');
        }
    }

    // Editor configuration
    const editor = new (class extends EditorBase {
        constructor () {
            super({
                warrior_count: new Field('[data-path="WarriorCount"]', '1', Field.createRange(1, 45)),
                warrior_level: new Field('[data-path="WarriorLevel"]', '0'),
                archer_count: new Field('[data-path="ArcherCount"]', '0', Field.createRange(0, 30)),
                archer_level: new Field('[data-path="ArcherLevel"]', '0'),
                mage_count: new Field('[data-path="MageCount"]', '0', Field.createRange(0, 15)),
                mage_level: new Field('[data-path="MageLevel"]', '0'),
                fortifications_level: new Field('[data-path="FortificationsLevel"]', '0', Field.createRange(0, 20))
            })

            this.fields['warrior_level'].initialize({
                values: Object.entries(FORTRESS_WARRIOR_MAP).map(([id, { level }]) => ({
                    name: level,
                    value: id
                })),
                value: '0'
            });

            this.fields['archer_level'].initialize({
                values: Object.entries(FORTRESS_ARCHER_MAP).map(([id, { level }]) => ({
                    name: level,
                    value: id
                })),
                value: '0'
            });

            this.fields['mage_level'].initialize({
                values: Object.entries(FORTRESS_MAGE_MAP).map(([id, { level }]) => ({
                    name: level,
                    value: id
                })),
                value: '0'
            });
            
            this.fields['fortifications_level'].initialize({
                values: Object.entries(FORTRESS_WALL_MAP).map(([id, { level }]) => ({
                    name: `${id == 0 ? intl('editor.none') : id} - ${intl('editor.level')} ${level}`,
                    value: id
                })),
                value: '0'
            });

            for (const field of this.fieldsArray) {
                field.setListener(() => this.onChangeLister());
                field.triggerAlways = true;
            }
        }

        onChangeLister () {
            updateButtons();
        }
    })('#fortress-editor');

    // Reset editor content
    editor.valid();
    editor.onChangeLister();

    // Captive inputs
    $('#sim-threads').captiveInputField('fortress_sim/threads', 4, v => !isNaN(v) && v >= 1);
    $('#sim-iterations').captiveInputField('fortress_sim/iterations', 2500, v => !isNaN(v) && v >= 1);

    function formatUnit (data, type) {
        const count = data[`${type}Count`];
        const level = data[`${type}Level`];

        if (count > 0) {
            return `${count} x ${FORTRESS_WARRIOR_MAP[level].level}`;
        } else {
            return '';
        }
    }

    // Callbacks
    function listUpdate () {
        updateButtons();

        let content = '';

        for (const { data, index, score } of list) {
            content += `
                <div class="plain row selectable ${index == listIndex ? '' : 'n'}selected" data-index="${index}">
                    <div class="three wide column">${formatUnit(data, 'Warrior')}</div>
                    <div class="three wide column">${data.FortificationsLevel > 0 ? FORTRESS_WALL_MAP[data.FortificationsLevel].level : ''}</div>
                    <div class="three wide column">${formatUnit(data, 'Archer')}</div>
                    <div class="three wide column">${formatUnit(data, 'Mage')}</div>
                    <div class="three wide column">${typeof score === 'number' ? `${(100 * score).toFixed(2)}%` : ''}</div>
                    <div class="one wide column">
                        <i class="trash right aligned alternate cursor-pointer !text-red:hover outline icon" data-trash="${index}"></i>
                    </div>
                </div>
            `;
        }

        $list.html(content);

        $list.find('[data-index]').click(function () {
            listIndex = parseInt($(this).attr('data-index'));

            editor.fill(list.find(it => it.index === listIndex).data);

            listUpdate();
        });

        $list.find('[data-trash]').click(function () {
            const localIndex = parseInt($(this).attr('data-trash'));

            const arrayIndex = list.findIndex(it => it.index == localIndex);
            if (arrayIndex != -1) {
                list.splice(arrayIndex, 1);
            }

            if (localIndex == listIndex) {
                editor.clear();
                listIndex = -1;
            }

            listUpdate();
        });
    }

    function addListItem () {
        list.push({
            data: editor.read(),
            index: (listIndex = listLength++),
            score: null
        });

        listUpdate();
    }

    // Callbacks
    $addButton.click(() => {
        if (editor.valid()) {
            addListItem();
        }
    })

    $saveButton.click(() => {
        if (editor.valid()) {
            if (listIndex >= 0) {
                let item = list.find(it => it.index == listIndex);
                if (item) {
                    item.data = editor.read();
                    item.score = null;
                }

                listUpdate();
            } else {
                addListItem();
            }
        }
    });

    // Run simulation
    $('#simulate').click(function () {
        const instances = Math.max(1, Number($('#sim-threads').val()) || 4);
        const iterations = Math.max(1, Number($('#sim-iterations').val()) || 2500);

        if (list.length > 0) {
            const results = [];

            const batch = new WorkerBatch('fortress');

            for (const { data, index } of list) {
                batch.add(
                    (data) => {
                        results.push(data);
                    },
                    Object.assign({ index, iterations }, FortressUnits.fromEditor(data))
                );
            }

            batch.run(instances).then((duration) => {
                Toast.info(intl('simulator.toast.title'), intl('simulator.toast.message', { duration: _formatDuration(duration) }));
                
                for (const { score, index: _index } of results) {
                    const localIndex = list.findIndex(it => it.index == _index);

                    if (localIndex >= 0) {
                        list[localIndex].score = score;
                    }
                }

                listUpdate();
            })
        }
    })
});