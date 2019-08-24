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

$("#setsearch").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#setlist a").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

$("#setsearch2").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#setlist2 a").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
});

$('#modalDetail').on('show.bs.modal', function() {
    $('#modalSet').modal('hide');
});

$('#modalDetail').on('hidden.bs.modal', function() {
    $('#modalSet').modal('show');
});

SettingsController.bind('#range1', '#label1', 'input', (input, label) => label.text(`${input.val()}%`));
SettingsController.bind('#range2', '#label2', 'input', (input, label) => label.text(`${input.val()}%`));
SettingsController.bind('#range3', '#label3', 'input', (input, label) => label.text(`${input.val() * 5}`));
SettingsController.bind('#range4', '#label4', 'input', (input, label) => label.text(`${input.val() * 5}`));
SettingsController.bind('#range5', '#label5', 'input', (input, label) => label.text(input.val()));
SettingsController.bind('#range6', '#label6', 'input', (input, label) => label.text(input.val()));
SettingsController.bind('#range7', '#label7', 'input', (input, label) => label.text(Enum.Mount[input.val()]));
SettingsController.bind('#range8', '#label8', 'input', (input, label) => label.text(Enum.Mount[input.val()]));
SettingsController.bind('#range9', '#label9', 'input', (input, label) => label.text(input.val()));

SettingsController.bind('#modalSettings', null, 'show.bs.modal', (modal, nl) => SettingsController.loadSettings());
SettingsController.bind('#modalSettingsSave', null, 'click', (button, nl) => SettingsController.saveSettings());

// Initialize
window.nf = new Notificator('notifyblock');
window.sl = new Logger();
window.st = new LocalStorage(15);
window.sf = new SFCore();

MainController.show();
