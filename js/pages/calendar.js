Site.ready(null, function () {
    const $petGrid = $('#pet-grid');
    const $buttonClear = $('#button-clear');

    const PET_COLORS = [
        '#A596CE',
        '#E9D067',
        '#ADC35A',
        '#FDA700',
        '#60CDEF'
    ];

    const PET_TIME_ICONS = {
        'day': 'sun',
        'night': 'moon',
        'witch': 'stopwatch'
    };
    
    const now = new Date();

    let currentPlayer = null;
    let currentPets = Array.from({ length: 100 }).fill(false);

    $buttonClear.click(() => {
        currentPlayer = null;
        currentPets.fill(false);

        render();
    })

    function generateTitle (availableNow, availableIn, petOwned, petLocked) {
        if (petOwned) {
            return `<i class="ui check icon"></i> ${intl('pets.calendar.collected')}`;
        } else if (petLocked) {
            return `<i class="ui lock icon"></i> ${intl('pets.calendar.locked')}`;
        } else if (availableNow) {
            return `<i class="ui exclamation icon"></i> ${intl('pets.calendar.available')}`;
        } else {
            return `<i class="ui clock outline icon"></i> ${availableIn}`;
        }
    }

    function render () {
        const entries = [];

        for (let index = 0; index < 100; index++) {
            const { location, next: [start, end], time, condition } = PetData[index];

            const petType = Math.trunc(index / 20);
            const petIndex = index % 20;

            const availableNow = start <= now && now <= end;
            const availableInMs = Math.trunc(Math.max(0, start - now) / 1000) * 1000;
            const availableIn = _formatDuration(availableInMs, 2);

            const petOwned = currentPets[index];
            const petLocked = currentPlayer && (Math.max(currentPlayer.Pets.Dungeons[petType] || 0, 2) < petIndex || (typeof condition === 'function' && !condition(currentPlayer)));

            const title = generateTitle(availableNow, availableIn, petOwned, petLocked);

            const content = `
                <div class="ui column">
                    <div data-pet="${index}" style="opacity: ${petOwned ? '60' : '100'}%; height: 240px; background: ${PET_COLORS[petType]}; color: black; border-radius: 0.25em;" class="p-4 flex flex-col items-center justify-content-between text-center pet-hoverable cursor-pointer">
                        <b>${title}</b>
                        <img class="ui centered image" style="margin: 0.5em; width: 100px; height: 100px;" src="res/pets/monster${index + 800}.png">
                        <h2 class="ui header" style="margin: 0;">${intl(`pets.names.${index}`)}</h2>
                        <span>${time !== 'any' ? `<i class="ui ${PET_TIME_ICONS[time]} icon"></i> ` : ''}${intl(`pets.locations.${location}`)}</span>
                        <div class="pet-hover flex flex-col justify-content-center items-center">
                            <div>${intl(`pets.descriptions.${index}`)}</div>
                        </div>
                    </div>
                </div>
            `;

            entries.push({
                availableInMs: petOwned ? (3156000000000 + index) : (petLocked ? (315600000000 + index) : availableInMs),
                content
            });
        }

        $petGrid.html(_sortAsc(entries, (entry) => entry.availableInMs).map((entry) => entry.content).join(''));
        $petGrid.find('[data-pet]').click((event) => {
            const index = parseInt(event.currentTarget.dataset.pet);

            currentPets[index] = !currentPets[index];

            render();
        })
    }

    render();

    StatisticsIntegration.configure({
        profile: SELF_PROFILE_WITH_GROUP,
        type: 'players',
        scope: (dm) => dm.getLatestPlayers(true).filter((player) => _dig(player, 'Pets', 'Levels')),
        callback: (player) => {
            currentPlayer = player;

            for (let i = 0; i < 100; i++) {
                currentPets[i] = _dig(player, 'Pets', 'Levels', i) > 0;
            }

            render()
        }
    });
});