var addNewRow = function(tb) {
  var tbl = $('#'+tb).find('tbody'),
      last = tbl.find('tr:last'),
      trNew = last.clone();

  var idx = trNew[0].cells[0]
  idx.innerHTML = parseInt(idx.innerHTML) + 1

  last.after(trNew);

  addListeners();
}

var addListeners = function() {
  $('.valueInput').keyup(function(e) {
    var tr = e.currentTarget.parentElement.parentElement,
        val1 = parseInt($(tr.cells[1]).find('input:first').val()),
        val2 = parseInt($(tr.cells[2]).find('input:first').val()),
        avg = $(tr.cells[3]).find('.avg')[0];

    avg.innerHTML = (val1*1 + val2*1) / 2;
  });
}


$(document).ready(function() {
  addListeners();
});
