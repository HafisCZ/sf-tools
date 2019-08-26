/*
    Bindings
*/
$('.dragzone').on({
    'drop': function(event) {
        $('.dragzone').css('visibility', 'hidden');

        event.preventDefault();

        for (var i in event.originalEvent.dataTransfer.items) {
            if (event.originalEvent.dataTransfer.items[i].kind === 'file') {
                MainController.import(event.originalEvent.dataTransfer.items[i].getAsFile());
            }
        }
    },
    'dragover' : function(event) {
        event.preventDefault();
    }
});

$('#filebrowser').on({
    'change': function(event) {
        if (this.files[0]) {
            MainController.import(this.files[0]);
        }
    }
});

$(window).on({
    'dragenter': function(event) {
        window.target = event.target;

        $('.dragzone').css('visibility', '');
    },
    'dragleave': function(event) {
        if (event.target === window.target || event.target === document)
        {
            $('.dragzone').css('visibility', 'hidden');
        }
    }
});

// Initialize
window.nf = new Notificator('notifyblock');
window.st = new LocalStorage();
window.sf = new SFCore();

window.m = new MainController('m');
window.mc = {
    settings: new SettingsModalController(),
    help: new ModalController('m-help'),
    set: new SetModalController(),
    player: new PlayerModalController(),
    group: new GroupModalController()
};

window.mc.player.parent(window.mc.set);
window.mc.group.parent(window.mc.set);

MainController.show();
