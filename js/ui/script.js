/*
  SFTools IO
*/
$(window).on('dragenter', e => {
  window.lasttarget = e.target;
  $('#dragtest').css('visibility', '');
});

$(window).on('dragleave', e => {
  if (e.target === window.lasttarget || e.target === document) {
    $('#dragtest').css('visibility', 'hidden');
  }
});

var dragdrop = {
  drop: ev => {
    ev.preventDefault();

    if (ev.dataTransfer.items) {
      for (var i in ev.dataTransfer.items) {
        if (ev.dataTransfer.items[i].kind === 'file') {
          dragdrop.load(ev.dataTransfer.items[i].getAsFile());
        }
      }
    } else {
      for (var i in ev.dataTransfer.files) {
        dragdrop.load(ev.dataTransfer.files[i]);
      }
    }

    $('#dragtest').css('visibility', 'hidden');
  },
  dragover: ev => ev.preventDefault(),
  loadFile: file => {
      if (file) {
          var reader = new FileReader();

          reader.readAsText(file, 'UTF-8');
          reader.onload = (event) => {
              sf.add(SFImporter.import(DateFormatter.format(new Date(file.lastModified)), JSON.parse(event.target.result)));
              window.dispatchEvent(new Event('sftools.updatelist'));
          };
      }},
  load: file =>  dragdrop.loadFile(file),
  remove: id => { sf.remove(id);  window.dispatchEvent(new Event('sftools.updatelist'));},
  loadman: files => {
    for (var i in files) {
       dragdrop.loadFile(files[i]);
    }
  }
};

window.addEventListener("sftools.updatelist", function(e) {
  var content = '';

	for (var i = sf.data.length - 1, item; item = sf.data[i]; i--) {
		content += `
      <a onclick="SetController.show(${i});" class="list-group-item list-group-item-action mb-2"><div class="d-flex w-100 justify-content-between">
        <div>
    			<h5 class="mb-1">${item.Label}</h5>
          <span class="badge badge-dark mr-1">${item.Groups.length} groups</span>
    			<span class="badge badge-dark">${item.Players.length} players</span>
        </div>
  			   <button type="button" class="btn btn-link p-0 mr-2" onclick="dragdrop.remove(${i});"><i class="fas fa-trash fa-lg text-dark"></i></button>
  			</div>
			</a>
    `;
	}

  $('#list').html(content);
});
