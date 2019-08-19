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
  load: file => sftools.import(file),
  remove: id => sftools.remove(id),
  loadman: files => {
    for (var i in files) {;
       fileHandler(files[i]);
    }
  }
};

$(document).ready(() => {
	sftools.init();
});

/*
  Control
*/
function showSet(id) {
  var set = sftools.data[id];
  
  if (set) {
    var header = '';
    var content = '';
    var content2 = '';
    
    // Header
    header +=
      '<h4 class="modal-title text-white">' +
      set.Label + 
      '<a class="btn btn-outline-light btn-sm ml-3 mt-1" style="font-size: .5rem;">Export</a>' +
      '<h6 class="mt-2"><span class="badge badge-light">' + 
      set.Groups.length + 
      ' groups</span><span class="badge badge-light ml-2">' + 
      set.Players.length + 
      ' players</span></h6>' +
      '</h4>'
    
    // Content
    for (var i in set.Players) {
      content += '<a onclick="showPlayer(' + id + ',' + i + ');" class="list-group-item list-group-item-action">' + set.Players[i].Name + '</a>';
    }
    
    for (var i in set.Groups) {
      content2 += '<a onclick="showGroup(' + id + ',' + i + ');" class="list-group-item list-group-item-action">' + set.Groups[i].Name + '</a>';
    }
    
    // Set & show
    $('#modalSetHeader').html(header);
    
    $('#setlist').html(content);
    $('#setlist2').html(content2);
    
    $('#setsearch').val('');
    $('#setsearch2').val('');
    
    $('#modalSet').modal('show');
  }
}
  
function showPlayer(set, id) {
  var player = sftools.data[set].Players[id];
  
  $('#modalDetailHeader').html(
    '<div class="d-flex w-100 justify-content-between">' +
    '<h4 class="modal-title text-white">' + player.Name + '</h4>' + 
    '<h4 class="modal-title text-white">' + player.Level + '</h4>' +
    '</div>'
  );
  
  $('#modalDetailBody').html(
    '<div class="progress bg-dark mt-n4 mb-2 mx-n2" style="height: 1px;">' +
    '<div class="progress-bar" style="width: ' + Math.trunc(100.0 * player.XP / player.XPNext) + '%" role="progressbar"></div>' +
    '</div>' +
     
    '<div class="row pt-3">' +
    '<div class="col">Strength</div>' +        
    '<div class="col text-center text-muted">' +
    player.Strength +
    '</div>' +       
    '<div class="col">Constitution</div>' +      
    '<div class="col text-center text-muted">' +
    player.Constitution +
    '</div>' +    
    '</div>' +    
    '<div class="row">' +
    '<div class="col">Dexterity</div>' +        
    '<div class="col text-center text-muted">' +
    player.Dexterity +
    '</div>' +       
    '<div class="col">Luck</div>' +     
    '<div class="col text-center text-muted">' +
    player.Luck +
    '</div>' +    
    '</div>' +   
    '<div class="row">' +
    '<div class="col">Intelligence</div>' +        
    '<div class="col text-center text-muted">' +
    player.Intelligence +
    '</div>' +       
    '<div class="col">Armor</div>' +    
    '<div class="col text-center text-muted">' +
    player.Armor +
    '</div>' +      
    '</div>'
  );
  
  $('#modalDetail').modal('show');
}

function showGroup(set, id) {
  var group = sftools.data[set].Groups[id];
  
  $('#modalDetailHeader').html('<h4 class="modal-title text-white">' + group.Name + '</h4>');
  $('#modalDetailBody').empty();
  
  $('#modalDetail').modal('show');
}

window.addEventListener("sftools.updatelist", function(e) {	
  var content = '';
	
	for (var i = sftools.data.length - 1, item; item = sftools.data[i]; i--) {
		content +=   
			'<a onclick="showSet(' + i + ');" class="list-group-item list-group-item-action mb-2">' +
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
			'<button type="button" class="btn btn-outline-danger" onclick="dragdrop.remove(' + i + ');">Remove</button>' +
			'</div>' +
			'</a>'
	}
  
  $('#list').html(content);
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