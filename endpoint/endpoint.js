class EndpointController {
    constructor ($iframe, callback) {
        this.$iframe = $iframe;
        this.$iframe.attr('src', '/endpoint/index.html');
        this.$iframe.one('load', () => {
            this.window = this.$iframe.get(0).contentWindow;
            this.window.load(() => {
                Logger.log('ECLIENT', 'Client started');
                callback(this);
            });
        });
    }

    destroy () {
        this.window.destroy(() => {
            Logger.log('ECLIENT', 'Client stopped');
            this.$iframe.attr('src', '');
        });
    }

    login (server, username, password, callback, error) {
        this.window.callback['login'] = callback;
        this.window.error['login'] = error;

        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
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
            Logger.log('ECLIENT', `Collecting data`);
            this.window.querry_collect();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    login_querry_all (server, username, password, callback, error) {
        // Bind error callbacks
        this.window.error['login'] = error;
        this.window.error['querry'] = error;

        // Bind success callbacks
        this.window.callback['querry'] = callback;
        this.window.callback['login'] = (text) => {
            // Querry all
            Logger.log('ECLIENT', `Querry all`);
            this.window.querry_all();
        }

        // Login
        Logger.log('ECLIENT', `Logging in as ${ username }@${ server }`);
        this.window.login(server, username, password);
    }

    querry_single (id, callback, error) {
        this.window.callback['querry_single'] = callback;
        this.window.error['querry'] = callback;

        Logger.log('ECLIENT', `Querrying character: ${ id }`);
        this.window.querry_single(id);
    }

    querry_collect (callback) {
        this.window.callback['querry'] = callback;

        Logger.log('ECLIENT', `Collecting data`);
        this.window.querry_collect();
    }
}
