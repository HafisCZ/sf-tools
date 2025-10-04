Site.ready({ name: 'index' }, function () {
    $('[data-op="report"]').click(() => Dialog.open(ReportDialog))

    const $drvcs = $('.drvcs');
    if (Site.isEvent('winter')) {
        $drvcs.attr('src', 'res/drvcs_winter.png');
    } else if (Site.isEvent('halloween')) {
        $drvcs.attr('src', 'res/drvcs_halloween.png');
    }

    function formatDate (date) {
        if (typeof date !== 'object') {
            date = new Date(date);
        }

        return date.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }).replace(' at', '');
    }

    function formatMessage (message) {
        return message.split('\n')[0]
    }

    const branch = window.location.hostname.startsWith('beta.') ? 'beta' : ''

    const item = Store.shared.get('version', { expire: 0 });
    if (item.expire < Date.now()) {
        $.ajax(
            "https://api.github.com/repos/hafiscz/sf-tools/commits",
            {
                data: {
                    per_page: 1,
                    sha: branch
                },
                dataType: 'jsonp',
                type: 'get'
            }
        ).then(function (response) {
            const date = new Date(response.data[0].commit.author.date);
            const message = response.data[0].commit.message;
            const sha = response.data[0].sha;

            $.ajax(
                `https://api.github.com/repos/hafiscz/sf-tools/compare/88b32f42210cb848c77b7891f6e47a0000876ed4...${ sha }`,
                {
                    data: {
                        per_page: 1
                    },
                    dataType: 'jsonp',
                    type: 'get'
                }
            ).then(function (response2) {
                const version = parseInt(response2.data.total_commits) + 1;

                Store.shared.set('version', {
                    timestamp: date.getTime(),
                    message: message,
                    version: version,
                    expire: Date.now() + 1800000
                })

                $(".footer-item").first().html(`v${ MODULE_VERSION_MAJOR }.${ version }<br/>Last updated on ${ formatDate(date) } - ${ formatMessage(message) }`);
            })
        });
    } else {
        $(".footer-item").first().html(`v${ MODULE_VERSION_MAJOR }.${ item.version }<br/>Last updated on ${ formatDate(item.timestamp) } - ${ formatMessage(item.message) }`);
    }

    document.getElementById('credits-toggle').addEventListener('click', function () {
        $('[data-tab="menu"]').toggle();
        $('[data-tab="about"]').toggle();
    })
})