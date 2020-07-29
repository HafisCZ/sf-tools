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

    login (server, username, password, callback, error) {
        this.window.callback['login'] = callback;
        this.window.error['login'] = error;

        this.window.login(server, username, password);
    }

    querry (ids, callback, error) {
        this.window.callback['querry'] = callback;
        this.window.error['querry'] = error;

        this.window.querry(ids);
    }

    querry_single (id, callback, error) {
        this.window.callback['querry_single'] = callback;
        this.window.error['querry'] = callback;

        this.window.querry_single(id);
    }

    querry_collect (callback) {
        this.window.callback['querry'] = callback;

        this.window.querry_collect();
    }
}
