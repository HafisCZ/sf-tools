$(document).ready(function() {
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
});

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
      '</h4>' +
      '<a class="btn btn-outline-light btn-sm m-0 py-1 mt-1 mr-2 px-3">Export</a>';
     
    
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
  var storage = window.localStorage;
  
  var DESC_POT = ['', 'Strength', 'Dexterity', 'Intelligence', 'Constitution', 'Luck', 'Life'];
  var DESC_MOUNT = ['None', '10%', '20%', '30%', '50%'];
  
  var mod0 = '';
  var mod1 = '';
  var mod2 = '';
  
  mod0 += `<span class="mr-2 badge ${player.Mount < storage.getItem('mount0') ? 'badge-danger' : (player.Mount >= storage.getItem('mount1') ? 'badge-success' : 'badge-warning')}">${player.Mount > 0 ? '-' + DESC_MOUNT[player.Mount] + ' Travel duration' : 'No mount'}</span>`;
  
  if (player.PotionLen1 > 0) {
    mod0 += `<span class="mr-2 badge ${player.PotionLen1 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen1}% ${DESC_POT[player.Potion1]}</span>`;
  }
  
  if (player.PotionLen2 > 0) {
    mod0 += `<span class="mr-2 badge ${player.PotionLen2 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen2}% ${DESC_POT[player.Potion2]}</span>`;
  }
  
  if (player.PotionLen3 > 0) {
    mod0 += `<span class="mr-2 badge ${player.PotionLen3 === 25 ? 'badge-success' : 'badge-warning'}">+${player.PotionLen3}% ${DESC_POT[player.Potion3]}</span>`;
  }
    
  mod1 += `<span class="mr-2 badge ${player.Book * 100 / 2160 < storage.getItem('scrapbook0') ? 'badge-danger' : (player.Book * 100 / 2160 >= storage.getItem('scrapbook1') ? 'badge-success' : 'badge-warning')}">+${Math.trunc(player.Book * 100 / 2160)}% XP bonus</span>`;
  mod1 += `<span class="mr-2 badge badge-dark">+${player.Achievements * 5} Attribute bonus</span>`;
  
  mod2 += `<span class="mr-2 badge badge-dark">+?% Critical hit damage bonus</span>`;
  mod2 += `<span class="mr-2 badge badge-dark">+?% Damage bonus</span>`;
  mod2 += `<span class="mr-2 badge badge-dark">+?% Life bonus</span>`;
  
  $('#modalDetailHeader').html(`
    <div class="d-flex w-100 justify-content-between">
      <h4 class="modal-title text-white">${player.Name}</h4>
      <h4 class="modal-title text-white">${player.Level}</h4>
    </div>
  `);

  $('#modalDetailBody').html(`
    <div class="progress bg-dark mt-n4 mb-4 mx-n2" style="height: 1px;">
      <div class="progress-bar" style="width: ${Math.trunc(100 * player.XP / player.XPNext)}%" role="progressbar"></div>
    </div>
    <h5>Modifiers</h5>
    <h5>${mod0}<h5>
    <h5>${mod1}<h5>
    <h5>${mod2}<h5>
    <hr/>
    <h5>Attributes</h5>
    <div class="row"> 
      <div class="col">Strength</div>         
      <div class="col text-center text-muted">${player.Strength}</div>
      <div class="col">Constitution</div>       
      <div class="col text-center text-muted">${player.Constitution}</div>     
    </div>     
    <div class="row"> 
      <div class="col">Dexterity</div>         
      <div class="col text-center text-muted">${player.Dexterity}</div>        
      <div class="col">Luck</div>      
      <div class="col text-center text-muted">${player.Luck}</div>     
    </div>    
    <div class="row"> 
      <div class="col">Intelligence</div>         
      <div class="col text-center text-muted">${player.Intelligence}</div>        
      <div class="col">Armor</div>     
      <div class="col text-center text-muted">${player.Armor}</div>       
    </div>
    <hr/>
    <h5>Collection</h5> 
    <div class="row">
      <div class="col">
        <label>Scrapbook</label>
      </div>
      <div class="col text-center text-muted">
        <label>${player.Book} out of 2160</label>
      </div>
      <div class="col text-center text-muted">
        <label>${Math.trunc(100 * player.Book / 2160)}%</label>
      </div>
    </div>
    <div class="progress mt-n2" style="height: 2px;">
      <div class="progress-bar ${100 * player.Book / 2160 < (storage.getItem('scrapbook0') || 70) ? 'bg-danger' : (100 * player.Book / 2160 >= (storage.getItem('scrapbook1') || 90) ? 'bg-success' : 'bg-warning')}" style="width: ${Math.trunc(100 * player.Book / 2260)}%" role="progressbar"></div>
    </div>
    <div class="row mt-2">
      <div class="col">
        <label>Achievements</label>
      </div>
      <div class="col text-center text-muted">
        <label>${player.Achievements} out of 70</label>
      </div>
      <div class="col text-center text-muted">
        <label>${Math.trunc(100 * player.Achievements / 70)}%</label>
      </div>
    </div>
    <div class="progress mt-n2" style="height: 2px;">
      <div class="progress-bar bg-dark" style="width: ${Math.trunc(100 * player.Achievements / 70)}%" role="progressbar"></div>
    </div>        
    <hr/>
    <h5>Fortress</h5>
    <div class="row"> 
      <div class="col">Upgrades</div>         
      <div class="col text-center text-muted">${player.FortressUpgrades}</div>
      <div class="col">Wall</div>       
      <div class="col text-center text-muted">${player.FortressWall}</div>     
    </div>     
    <div class="row"> 
      <div class="col">${player.FortressKnights > 0 ? 'Knights' : ''}</div>              
      <div class="col text-center ${player.FortressKnights < (storage.getItem('knights0') || 13) ? 'text-danger' : (player.FortressKnights >= (storage.getItem('knights1') || 15) ? 'text-success' : 'text-warning')}">${player.FortressKnights > 0 ? player.FortressKnights : ''}</div>                                 
      <div class="col">Warriors</div>      
      <div class="col text-center text-muted">${player.FortressWarriors}</div>     
    </div>
    <div class="row">
      <div class="col"></div>              
      <div class="col"></div>                                 
      <div class="col">Archers</div>      
      <div class="col text-center text-muted">${player.FortressArchers}</div>         
    </div>
    <div class="row">
      <div class="col"></div>              
      <div class="col"></div>                                 
      <div class="col">Mages</div>      
      <div class="col text-center text-muted">${player.FortressMages}</div>        
    </div>
    <hr/>
    <h5>Rankings</h5>
    <div class="row">
      <div class="col"><b>Player</b></div>
      <div class="col"><b>Fortress</b></div>
    </div>
    <div class="row">
      <div class="col">Rank</div>
      <div class="col text-center text-muted">${player.RankPlayer}</div>
      <div class="col">Rank</div>
      <div class="col text-center text-muted">${player.RankFortress}</div>
    </div>
    <div class="row">
      <div class="col">Honor</div>
      <div class="col text-center text-muted">${player.HonorPlayer}</div>      
      <div class="col">Honor</div>
      <div class="col text-center text-muted">${player.HonorFortress}</div>
    </div>
  `);
  
  $('#modalDetail').modal('show');
}

function showGroup(set, id) {
  var group = sftools.data[set].Groups[id];
  
  $('#modalDetailHeader').html('<h4 class="modal-title text-white">' + group.Name + '</h4>');
  $('#modalDetailBody').empty();
  
  $('#modalDetail').modal('show');
}