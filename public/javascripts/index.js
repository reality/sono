var addNewRow = function(tb) {
  var tbl = $('#'+tb).find('tbody'),
      last = tbl.find('tr:last'),
      trNew = last.clone();

  var idx = trNew[0].cells[0]
  idx.innerHTML = parseInt(idx.innerHTML) + 1

  last.after(trNew);

  addListeners();

  return trNew[0];
}

var updateAverage = function(tr) {
    val1 = parseInt($(tr.cells[1]).find('input:first').val()),
    val2 = parseInt($(tr.cells[2]).find('input:first').val()),
    avg = $(tr.cells[3]).find('.avg')[0];
    avg.innerHTML = (val1*1 + val2*1) / 2;
};

var addListeners = function() {
  $('.valueInput').keyup(function(e) {
    updateAverage(e.currentTarget.parentElement.parentElement);
  });
}

var readTSVFile = function(e) {
  var file = e.target.files[0];
  if(!file) { return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    var content = $(e.target.result.split('\n'));
    content.each(function(lno, cn) {
      if(lno == content.length-1) { return; }
      if(lno == 0) {
        var newRow = $('#continuousEntry').find('tbody').find('tr:first')[0];
      } else {
        var newRow = addNewRow('continuousEntry'); // we will have to work this out from the tsv format
      }

      var fields = cn.split("\t");
      var val1 = parseInt($(newRow.cells[1]).find('input:first').val(fields[0])),
          val2 = parseInt($(newRow.cells[2]).find('input:first').val(fields[1]));
      updateAverage(newRow);
    });
  };
  reader.readAsText(file, 'utf-8');
};

var showResults = function(c) {
  if(c == 'continuousEntry') {
    drawBlandAndAltman(c);
    drawLinearRegression(c);

    $('#categoricalResults').hide();
    $('#continuousResults').show();
  } else {
    $('#continuousResults').hide();
    $('#categoricalResults').show();
  }
  $('#results').show();
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
}

var drawLinearRegression = function(c) {
  // between pairs of the two measurement sets
  // pipe https://github.com/Tom-Alexander/regression-js into plotly
  var pairs = [];
  
  $('#'+c).find('tbody').find('tr').each(function() { // btw jquery's map sux
    var val1 = parseInt($(this.cells[1]).find('input:first').val()),
        val2 = parseInt($(this.cells[2]).find('input:first').val());

    pairs.push([ val1, val2 ]);
  });

  var result = regression('linear', pairs),
      gradient = result.equation[0],
      yIntercept = result.equation[1];

  var lineX = [], // eh this is a bit awkward but whatever man
      lineY = [],
      x = [],
      y = [];

  $(result.points).each(function(i, v) {
    lineX.push(v[0]);
    lineY.push(v[1]);
  });

  $(pairs).each(function(i, v) {
    x.push(v[0]);
    y.push(v[1]);
  });

  var bestX = [],
      bestY = [];

  bestX.push(Math.min(...lineX));
  bestX.push(Math.max(...lineX));

  bestY.push((bestX[0] * result.equation[0]) + result.equation[1]);
  bestY.push((bestX[1] * result.equation[0]) + result.equation[1]);

  var trace = {
    'x': x,
    'y': y,
    'mode': 'markers',
    'type': 'scatter',
    'name': 'Linear Regression'
  };

  var bestFit = {
    'x': bestX,
    'y': bestY,
    'mode': 'lines',
    'name': 'Line of Best Fit'
  };

  var layout = {
    'title': 'Linear Regression',
    'showLegend': true,
    'width': 500,
    'xaxis': {
      'title': 'x'
    },
    'yaxis': {
      'title': 'y'
    }
  };

  Plotly.newPlot('linear', [trace, bestFit], layout);

  $('#y').text("y: " + yIntercept.toFixed(2))
  $('#r').text("r²: " + result.r2.toFixed(2))
  $('#gradient').text("Equation: " + result.string)
}

var changeDataType = function() {
  var newType = $('#dataTypeSelect').find(':selected').text(); ; // probably can just make this into a global variable, or read from the spinner instead of passing it all over the place, like an idiot
  if(newType == 'Continuous') {
    $('#measureTypeGroup').show();
    $('#continuousEntry').show();
    $('#categoricalEntry').hide();
  } else {
    $('#continuousEntry').hide();
    $('#categoricalEntry').show();
    $('#measureTypeGroup').hide();
  }
}

$(document).ready(function() {
  addListeners();
  $('#fileInput').on('change', readTSVFile);
  $('#dataTypeSelect').on('change', changeDataType);
  changeDataType();
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
