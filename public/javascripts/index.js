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

  var stdDev = standardDeviation(y);
  var bias = y.reduce((a, b) => a + b, 0) / y.length;
  var upperAgreement = (bias+1.96*stdDev).toFixed(2);
  var lowerAgreement = (bias-1.96*stdDev).toFixed(2);
  var lineLength = Math.max(...x);

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
    'width': 500,
    'xaxis': {
      'title': 'Mean',
      'zeroline': true,
      'showline': true,
      'rangemode': 'tozero',
      'autorange': true
    },
    'yaxis': {
      'title': 'Difference',
      'zeroline': true,
      'showline': true
    },
    'shapes': [
      {
        'type': 'line',
        'xref': 'paper',
        'x0': 0,
        'y0': parseInt(upperAgreement),
        'x1': lineLength,
        'y1': parseInt(upperAgreement),
        'line': {
          'color': 'rgb(0, 155, 0)',
          'width': 2,
          'dash': 'dashdot'
        }
      },
      {
        'type': 'line',
        'xref': 'paper',
        'x0': 0,
        'y0': parseInt(lowerAgreement),
        'x1': lineLength,
        'y1': parseInt(lowerAgreement),
        'line': {
          'color': 'rgb(155, 0, 0)',
          'width': 2,
          'dash': 'dashdot'
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
          'color': 'rgb(0, 0, 155)',
          'width': 2,
          'dash': 'dashdot'
        }
      }
    ]
  };

  Plotly.newPlot('bland', [trace], layout)

  $('#bias').text("Bias: " + bias)
  $('#upper').text("Upper limit: " + upperAgreement)
  $('#lower').text("Lower limit: " + lowerAgreement)
  $('#results').show()
}

var drawLinearRegression = function() {
  // between pairs of the two measurement sets
  // pipe https://github.com/Tom-Alexander/regression-js into plotly
}

$(document).ready(function() {
  addListeners();
});

// borrowed from https://derickbailey.com/2014/09/21/calculating-standard-deviation-with-array-map-and-array-reduce-in-javascript/
function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
