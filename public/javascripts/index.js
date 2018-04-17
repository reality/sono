var addNewRow = function(tb) {
  var tbl = $('#'+tb).find('tbody'),
      last = tbl.find('tr:last'),
      trNew = last.clone();

console.log(trNew);
  var idx = trNew[0].cells[0]
  idx.innerHTML = parseInt(idx.innerHTML) + 1

  last.after(trNew);
}
