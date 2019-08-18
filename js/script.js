function dropHandler(ev) {
	ev.preventDefault();
	
	if (ev.dataTransfer.items) {
		for (var i = 0; i < ev.dataTransfer.items.length; i++) {
			if (ev.dataTransfer.items[i].kind === 'file') {
				fileHandler(ev.dataTransfer.items[i].getAsFile());
			}
		}
	} else {
		for (var i = 0; i < ev.dataTransfer.files.length; i++) {
			fileHandler(ev.dataTransfer.files[i]);
		}
	}
	
	document.querySelector("#dragtest").style.visibility = "hidden";
}

function dragoverHandler(ev) {
	ev.preventDefault();
}

function fileHandler(file) {
	sftools.import(file);
}

function removeHandler(index) {
	sftools.remove(index);
}

function manualFileHandler(files) {
  for (let i = 0, numFiles = files.length; i < numFiles; i++) {
  const file = files[i];
    fileHandler(file);
  }
}

var lastTarget = null;

$(document).ready(() => {
	sftools.init();
});

window.addEventListener("sftools.updatelist", function(e) {	
	$('#list').empty();
	
	for (var i = sftools.data.length - 1, item; item = sftools.data[i]; i--) {
		$('#list').append(
			'<a href="#" class="list-group-item list-group-item-action mb-2">' +
			'<div class="d-flex w-100 justify-content-between"><div>' +
			'<h5 class="mb-1">' +
			item.Label +
			'</h5>' +
      '<span class="badge badge-dark mr-2">' +
			item.Groups.length +
			' groups</span>' +
			'<span class="badge badge-dark">' +
			item.Players.length + 
			' players</span></div>' +
			'<button type="button" class="btn btn-outline-danger" onclick="removeHandler(' + i + ');">Remove</button>' +
			'</div>' +
			'</a>'
		)
	}
});

window.addEventListener("dragenter", function(e) {
	lastTarget = e.target;

	document.querySelector("#dragtest").style.visibility = "";
});

window.addEventListener("dragleave", function(e) {
	if(e.target === lastTarget || e.target === document)
	{
		document.querySelector("#dragtest").style.visibility = "hidden";
	}
});

// Settings handlers
$('#range1').on('input', () => $('#label1').text($('#range1').val() + '%'));
$('#range2').on('input', () => $('#label2').text($('#range2').val() + '%'));
$('#range3').on('input', () => $('#label3').text($('#range3').val()));
$('#range4').on('input', () => $('#label4').text($('#range4').val()));
$('#range5').on('input', () => $('#label5').text($('#range5').val()));
$('#range6').on('input', () => $('#label6').text($('#range6').val()));
$('#range7').on('input', () => $('#label7').text($('#range7').val() + '%'));
$('#range8').on('input', () => $('#label8').text($('#range8').val() + '%'));
$('#range9').on('input', () => $('#label9').text($('#range9').val()));

$('#modalSettings').on('show.bs.modal', e => {
  var storage = window.localStorage;
  
  $('#range1').val(storage.getItem('scrapbook0') || 70);
  $('#range2').val(storage.getItem('scrapbook1') || 90); 
  $('#range3').val(storage.getItem('pet0') || 150);
  $('#range4').val(storage.getItem('pet1') || 300);
  $('#range5').val(storage.getItem('knights0') || 13);
  $('#range6').val(storage.getItem('knights1') || 15);
  $('#range7').val(storage.getItem('mount0') || 1);
  $('#range8').val(storage.getItem('mount1') || 4);  
  $('#range9').val(storage.getItem('upgrades0') || 5);
  
  $('#check1').prop('checked', storage.getItem('highlight0') === 'true' || true);
  $('#check2').prop('checked', storage.getItem('gear0') === 'true' || false);
  $('#check3').prop('checked', storage.getItem('gear1') === 'true' || false);
  $('#check4').prop('checked', storage.getItem('gear2') === 'true' || false);
  
  $('input[id^="range"]').trigger('input');
});

$('#settingsSave').on('click', e => {  
  var storage = window.localStorage;
  
  storage.setItem('scrapbook0', $('#range1').val());
  storage.setItem('scrapbook1', $('#range2').val());
  storage.setItem('pet0', $('#range3').val());
  storage.setItem('pet1', $('#range4').val());
  storage.setItem('knights0', $('#range5').val());
  storage.setItem('knights1', $('#range6').val());
  storage.setItem('mount0', $('#range7').val());
  storage.setItem('mount1', $('#range8').val());
  storage.setItem('upgrades0', $('#range9').val());
  storage.setItem('highlight0', $('#check1').prop('checked'));
  storage.setItem('gear0', $('#check2').prop('checked'));
  storage.setItem('gear1', $('#check3').prop('checked'));
  storage.setItem('gear2', $('#check4').prop('checked'));
});