var results = {};

var addNewRow = function(tb) {
  var tbl = $('#'+tb).find('tbody'),
      last = tbl.find('tr:last'),
      trNew = last.clone();

  var idx = trNew[0].cells[0],
      newIdx = parseInt(idx.innerHTML) + 1;

  idx.innerHTML = newIdx;

  $(trNew.find('.fa-remove')[0]).attr("onclick='javascript:removeRow("+newIdx+");'")

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
  var newResults = {
    'dataType': $('#dataTypeSelect').find(':selected').text(),
    'testType': $('#testTypeSelect').find(':selected').text(),
    'measureType': $('#measureTypeSelect').find(':selected').text(),
    'dataType': c,
    'data': [],
  };

  // TODO finish putting these in the thing
  if(c == 'continuousEntry') {
    newResults.data = [ 
      drawBlandAndAltman(c),
      drawLinearRegression(c)
    ];

    $('#categoricalResults').hide();
    $('#continuousResults').show();
  } else {
    newResults.data = [
      drawCategoricalResults(c)
    ];

    $('#continuousResults').hide();
    $('#categoricalResults').show();
  }
  $('#results').show();
  $('#finaliseCa').prop('disabled', false);
  $('#finaliseCo').prop('disabled', false);

  results = newResults;
};

var finaliseResults = function() {
  var c = ($('#dataTypeSelect').find(':selected').text() == 'Continuous') ? 'continuousEntry' : 'categoricalEntry';
  showResults(c);
  c = '#'+c; // stupid TODO fix necessary

  // So, now we will build the PDF.
 var pdfContent = [
    { 'text': 'Echocardiogram Repeatability Analysis', 'style': 'header' },
    { 'text': 'Test Information', 'style': 'subheader' },
    'Data type: ' + results.dataType,
    'Test type: ' + results.testType,
    'Measure: ' + results.measureType, 
    { 'text': 'Data', 'style': 'subheader' }
  ];

  // Add the Data tables

  var table;
  if(c == '#continuousEntry') {
    $(results.data[1].data).each(function(d) {
      results.data[1].data[d].unshift(++d);
    }); // add the observation no 

    results.data[1].data.unshift([
      $(c).find('.noType').text(),
      $(c).find('.m1').text(),
      $(c).find('.m2').text()
    ]); // add the table headings

    table = results.data[1].data;
  } else if('#categoricalEntry') {
    table = [ 
      [
        $(c).find('.noType').text(),
        $(c).find('.m1').text(),
        $(c).find('.m2').text()
      ]
    ];

    $(c).find('tbody').find('tr').each(function() {
      var observations = $(this).find('td');

      table.push([
        $(observations[0]).text(),
        $(observations[1]).find(':checked').text(),
        $(observations[2]).find(':checked').text()
      ]);
    });
  }

  pdfContent.push({ 
    'style': 'table', 
    'table': {
      'body': table // these are the xy pairs
    }
  });

  // Add the results 
  // fucking promises 
  // processresults with a callback
  pdfContent.push({ 'text': 'Results', 'style': 'subheader' });

  var processResults = function(c, cb) {
    if(c == '#continuousEntry') {
      Plotly.toImage($('#bland')[0], { 'format': 'jpeg' }).then(function(img1) {
        Plotly.toImage($('#linear')[0], { 'format': 'jpeg' }).then(function(img2) {
          pdfContent.push({ 
            'table': {
              'headerRows': 0,
              'body': [
                [
                  { 'image': img1, 'width': 250 },
                  { 'image': img2, 'width': 250 }
                ],
                [
                  { 
                    'stack': [
                      "Bias: " + results.data[0].bias,
                      "Upper limit: " + results.data[0].upper,
                      "Lower limit: " + results.data[0].lower,
                    ]
                  },
                  {
                    'stack': [
                      "Equation: " + results.data[1].gradient, 
                      "r² = " + results.data[1].r, 
                      "y = " + results.data[1].y
                    ]
                  }
                ]
              ]
            }
          });
          
          cb();
        });
      });
    } else if(c == '#categoricalEntry') {
      var cr = results.data[0].data; 
      var totalTable = [
        [ 'Judge 1 vs Judge 2', 'Mild', 'Moderate', 'Severe', 'Total (Judge 1)' ],
        [ 'Mild', cr['Mild_Mild'], cr['Moderate_Mild'], cr['Severe_Mild'], cr['Total_Mild'] ],
        [ 'Moderate', cr['Mild_Moderate'], cr['Moderate_Moderate'], cr['Severe_Severe'], cr['Total_Moderate'] ],
        [ 'Severe', cr['Mild_Severe'], cr['Moderate_Severe'], cr['Severe_Severe'], cr['Total_Severe'] ],
        [ 'Total (Judge 2)', cr['Mild_Total'], cr['Moderate_Total'], cr['Severe_Total'], cr['Total_Total'] ],
      ];

      console.log(totalTable);

      pdfContent.push({ 'text': 'Totals', 'style': 'subsubheader' });
      pdfContent.push({ 
        'style': 'table', 
        'table': {
          'body': totalTable // these are the xy pairs
        }
      });

      cb();
    }
  }

  processResults(c, function() {
    console.log(pdfContent);
    var pdfData = {
      'content': pdfContent,
      'defaultStyle': {},
      'styles': {
        'header': {
          'fontSize': 18,
          'bold': true,
          'margin': [0, 0, 0, 10]
        },
        'subheader': {
          'fontSize': 16,
          'bold': true,
          'margin': [0, 10, 0, 5]
        },
        'subsubheader': {
          'fontSize': 14,
          'bold': true,
          'margin': [0, 10, 0, 5]
        },
        'table': {
          'margin': [0, 5, 0, 15]
        }
      }
    };

    pdfMake.createPdf(pdfData).download();
    sendData({ 'results': results, 'pdf': pdfContent });
  });
};

var drawCategoricalResults = function(c) {
  // Basically Mild/Moderate/Severe cross-table between the two judges with totals. Number of agreement for each category. Then agreement due to change. Generate Kappa coefficient
  var o = ['Mild', 'Moderate', 'Severe'];
  $(o).each(function(i,p) { // reset results
    $('#Total_'+p).text(0);
    $('#'+p+'_Total').text(0);
    $('#Agree_'+p).text(0);
    $('#Chance_'+p).text(0);
    $(o).each(function(z,q) {
      $('#'+p+'_'+q).text(0);
    });
  });
  $('#Total_Total').text(0);
  $('#Total_Chance').text(0);
  $('#Total_Agree').text(0);

  $('#'+c).find('tbody').find('tr').each(function() {
    var observations = $(this).find('td');

    var o1 = $(observations[1]).find(':checked').text(),
        o2 = $(observations[2]).find(':checked').text(),
        head = o1 + '_' + o2,
        cell = $('#'+head)[0];

    cell.innerHTML = parseInt(cell.innerHTML) + 1;

    var c = head.split('_'),
        c1 = $('#Total_'+c[0]),
        c2 = $('#'+c[1]+'_Total');

    // totals
    c1.text(parseInt(c1.text()) + 1);
    c2.text(parseInt(c2.text()) + 1);

    // agreements
    if(c[0] == c[1]) {
      $('#Agree_'+c[0]).text(parseInt($('#Agree_'+c[0]).text()) + 1);
      $('#Total_Agree').text(parseInt($('#Total_Agree').text()) + 1);
    }

    $('#Total_Total').text(parseInt($('#Total_Total').text()) + 1);
  });

  var cells = $('#Chance_Row').find('td');
  cells.each(function(i) {
    if(i == cells.length - 1) { return; } // don't want to process the total bit

    var item = this.id.split('_')[1];

    if(parseInt($('#Agree_'+item).text()) == 0) { return; }

    var result = parseInt($('#'+item+'_Total').text()) * 
          parseInt($('#Total_'+item).text()) / parseInt($('#Total_Total').text());

    this.innerHTML = result.toFixed(2);
    $('#Total_Chance').text(parseInt($('#Total_Chance').text()) + result);
  });

  var tChance = parseInt($('#Total_Chance').text());
  var kappa = (parseInt($('#Total_Agree').text()) - tChance) / 
        (parseInt($('#Total_Total').text()) - tChance);
        
  $('#Kappa').text('Kappa: ' + kappa.toFixed(2));

  var results = {
    'type': 'categorical',
    'kappa': kappa.toFixed(2),
    'data': { }
  };
  
  $(o).each(function(i,p) { // reset results
    results.data['Total_'+p] = $('#Total_'+p).text();
    results.data[p+'_Total'] = $('#'+p+'_Total').text();
    results.data['Agree_'+p] = $('#Agree_'+p).text();
    results.data['Chance_'+p] = $('#Chance_'+p).text();
    $(o).each(function(z,q) {
      results.data[p+'_'+q] = $('#'+p+'_'+q).text();
    });
  });
  results.data['Total_Total'] = $('#Total_Total').text();
  results.data['Total_Chance'] = $('#Total_Chance').text();
  results.data['Total_Agree'] = $('#Total_Agree').text();

  return results;
};

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

  var gd = Plotly.newPlot('bland', [trace], layout)

  $('a[data-title="Zoom out"]')[0].click();

  $('#bias').text("Bias: " + bias)
  $('#upper').text("Upper limit: " + upperAgreement)
  $('#lower').text("Lower limit: " + lowerAgreement)

  return {
    'bias': bias,
    'type': 'bland',
    'upper': upperAgreement,
    'lower': lowerAgreement,
    'plot': gd,
    'data': {
      'x': x,
      'y': y
    }
  };
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

  var gd = Plotly.newPlot('linear', [trace, bestFit], layout),
      y = yIntercept.toFixed(2),
      r = result.r2.toFixed(2),
      gradient = result.string;

  $('#y').text("y: " + y);
  $('#r').text("r²: " + r);
  $('#gradient').text("Equation: " + gradient)

  return {
    'y': y,
    'r': r,
    'type': linear,
    'gradient': gradient,
    'plot': gd,
    'data': pairs
  };
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

var sendData = function(data) { 
  $.post('/save', data);
};

var clearTable = function() {
  var c = ($('#dataTypeSelect').find(':selected').text() == 'Continuous') ? '#continuousEntry' : '#categoricalEntry',
      r = $(c).find('tbody tr');

  $(r.slice(1, r.length)).each(function(i, y) {
    y.remove(); 
  });

  if(c == '#continuousEntry') {
    $(r[0].children[1]).find('input').val(0);
    $(r[0].children[2]).find('input').val(0);
  } else if(c == '#categoricalEntry') {
    $('#o1o1d').val('Mild').change();
    $('#o1o2d').val('Mild').change();
  }
}

var removeRow = function(rNum) {
  var c = ($('#dataTypeSelect').find(':selected').text() == 'Continuous') ? '#continuousEntry' : '#categoricalEntry',
      r = $(c).find('tbody tr');
  if(r.length > 1) {
    r[rNum-1].remove();
    r.each(function(ind, el) {
      $(this).children('td').first().text(++ind);
    });
  } else {
    alert('Not removing last row');
  }
}

var changeTestType = function() {
  var tType = $('#testTypeSelect').find(':selected').attr('class'),
      unit = $('#measureTypeSelect').find(':selected').text(),
      c = ($('#dataTypeSelect').find(':selected').text() == 'Continuous') ? '#continuousEntry' : '#categoricalEntry';

  // do you love the descriptive class names?
  switch(tType) {
    case 't1':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Operator 1 Measurement ('+unit+')');
      $(c).find('.m2').text('Operator 2 Measurement ('+unit+')');
      break;
    case 't2':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Attempt 1 ('+unit+')');
      $(c).find('.m2').text('Measurement Attempt 2 ('+unit+')');
      break;
    case 't3':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Method 1 ('+unit+')');
      $(c).find('.m2').text('Measurement Method 2 ('+unit+')');
      break;
    case 't4':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Under Condition 1 ('+unit+')');
      $(c).find('.m2').text('Measurement Under Condition 2 ('+unit+')');
      break;
    case 't5':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement 1 ('+unit+')');
      $(c).find('.m2').text('Measurement 2 ('+unit+')');
      break;
    default: break;
  }

  clearTable();
};

$(document).ready(function() {
  addListeners();
  $('#fileInput').on('change', readTSVFile);

  $('#dataTypeSelect').on('change', changeDataType);
  changeDataType();

  $('#testTypeSelect').on('change', changeTestType);
  changeTestType();
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
