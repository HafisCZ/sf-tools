class EndpointController {
    constructor ($iframe, callback) {
        this.$iframe = $iframe;
        this.$iframe.attr('src', '/endpoint/index.html');
        this.$iframe.one('load', () => {
            this.window = this.$iframe.get(0).contentWindow;
            this.window.load(() => {
                callback(this);
            });
        });
    }

    destroy () {
        this.window.destroy(() => {
            this.$iframe.attr('src', '');
        });
    }

    login (server, username, password, callback) {
        this.window.callback['login'] = callback;
        this.window.login(server, username, password);
    }

    querry (ids, callback) {
        this.window.callback['querry'] = callback;
        this.window.querry(ids);
    }
}
