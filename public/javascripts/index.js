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

var showResults = function(c) {
  drawBlandAndAltman(c);
}

var drawBlandAndAltman = function(c) {
  var x = [], // Mean 
      y = []; // Difference
  
  $('#'+c).find('tbody').find('tr').each(function() { // btw jquery's map sux
    var val1 = parseInt($(this.cells[1]).find('input:first').val()),
        val2 = parseInt($(this.cells[2]).find('input:first').val());

    x.push(parseInt($(this.cells[3]).find('.avg')[0].innerHTML));
    y.push(parseInt(val1) - parseInt(val2));
  });

  var upperAgreement = Math.max(...y);
  var lowerAgreement = Math.min(...y);
  var lineLength = Math.max(...x);
  var bias = y.reduce((a, b) => a + b, 0) / y.length;

  var trace = {
    'x': x,
    'y': y,
    'mode': 'markers',
    'type': 'scatter',
    'name': 'Measurements'
  };

  var layout = {
    'title': 'Bland and Altman Plot',
    'showLegend': true,
    'xaxis': {
      'title': 'Mean'
    },
    'yaxis': {
      'title': 'Difference'
    },
    'shapes': [
      {
        'type': 'line',
        'xref': 'paper',
        'x0': 0,
        'y0': upperAgreement,
        'x1': lineLength,
        'y1': upperAgreement,
        'line': {
          'color': 'rgb(0, 0, 155)',
          'width': 2
        }
      },
      {
        'type': 'line',
        'xref': 'paper',
        'x0': 0,
        'y0': lowerAgreement,
        'x1': lineLength,
        'y1': lowerAgreement,
        'line': {
          'color': 'rgb(155, 0, 0)',
          'width': 2
        }
      },
      {
        'type': 'line',
        'xref': 'paper',
        'x0': 0,
        'y0': bias,
        'x1': lineLength,
        'y1': bias,
        'line': {
          'color': 'rgb(0, 155, 0)',
          'width': 2
        }
      }
    ]
  };

  Plotly.newPlot('bland', [trace], layout)
}

$(document).ready(function() {
  addListeners();
});
