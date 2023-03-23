window.addEventListener('load', function () {
    function getEntryTemplate (version, content) {
        return `
            <div class="row">
                <div class="two wide column"></div>
                <div class="one wide column">
                    <h3 class="ui version header" id="${version}"><a href="#${version}" style="color: var(--color);">${ version }</a></h3>
                </div>
                <div class="thirteen wide column">
                    ${content}
                </div>
            </div>
        `;
    }

    function getChangelogEntry (version) {
        const entries = CHANGELOG[version];

        if (Array.isArray(entries)) {
            return getEntryTemplate(
                version,
                `<ul class="simple-list">
                    ${entries.map(entry => `<li>${entry}</li>`).join('')}
                </ul>`
            );
        } else if (entries) {
            let content = ''
            for (const [ category, changes ] of Object.entries(entries)) {
                const entries = changes.map(entry => `<li>${entry}</li>`).join('')
                content += `
                    <h3 class="ui header" style="color: white !important; margin-left: 1.5em; margin-bottom: 0em; margin-top: ${content.length == 0 ? '0.15' : '1'}em !important;">${category}</h3>
                    <ul>
                        ${entries}
                    </ul>
                `;
            }

            return getEntryTemplate(
                version,
                content
            )
        }
    }

    $('.version-list').html(Object.keys(CHANGELOG).map(version => getChangelogEntry(version)).join(''));
});