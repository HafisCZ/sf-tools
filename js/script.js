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