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

    login_querry_only (server, username, password, callback, error) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['querry'] = error;

        // Bind success callbacks
        this.window.callback['querry'] = callback;
        this.window.callback['login'] = () => {
            // Fire collect on login success
            this.window.querry_collect();
        }

        // Login
        this.window.login(server, username, password);
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
