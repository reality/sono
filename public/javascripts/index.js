var results = {};
var c = '#continuousEntry';
var dType = 'Continuous';
var corExps = {
  "high": "The correlation between the two operators is very strong, suggesting a very high level of reproducibility.",
  "strong": "The correlation between the two operators is strong, suggesting a good level of reproducibility.",
  "moderate": "The correlation between the two operators is moderate, suggesting a moderate level of reproducibility.",
  "weak": "The correlation between the two operators is weak, suggesting a poor level of reproducibility."
};

var getCorExp = function(value) {
  var exp = corExps['high'];

  if(value < 0.8 && value >= 0.6) {
    exp = corExps['strong'];
  } else if(value < 0.6 && value >= 0.4) {
    exp = corExps['moderate'];
  } else if(value < 0.4) {
    exp = corExps['weak'];
  }

  return exp;
}

var addNewRow = function() {
  var tbl = $(c).find('tbody'),
      last = tbl.find('tr:last'),
      trNew = last.clone();

  var idx = trNew[0].cells[0],
      newIdx = parseInt(idx.innerHTML) + 1;

  idx.innerHTML = newIdx;

  $(trNew.find('.fa-remove')[0]).attr('onclick', 'javascript:removeRow('+newIdx+');');
  $(trNew.find('.valueInput')).val(0);
  $(trNew.find('.form-control')).val(0);

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
    if(c == '#continuousEntry') {
      updateAverage(e.currentTarget.parentElement.parentElement);
    }
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

var drawICC = function() {
  ocpu.seturl("//lokero.xyz:8004/ocpu/library/base/R");

  $('#icc').html('Intra-class correlation: Loading');

  var table = [];
  $(c).find('tbody').find('tr').each(function() { // btw jquery's map sux
    var val1 = parseInt($(this.cells[1]).find('input:first').val()),
        val2 = parseInt($(this.cells[2]).find('input:first').val());

    table.push([val1, val2]);
  });

  console.log(table);

  var code = new ocpu.Snippet("function(data) { library('jsonlite') ; library('psych') ; d <- ICC(data, FALSE) ; return(d$results); }");
  //var code = new ocpu.Snippet("function(data) { return(data); }");
  var req = ocpu.rpc("do.call", {
    what: code, 
    args: {
      data: table
    }
  }, function(output) {
    var icc3 = output[2];
    $('#icc').html('Intra-class correlation: ' + icc3.ICC);
    results.data[1].icc = icc3.ICC; // hmm
  });
}

var showResults = function() {
  var newResults = {
    'testType': $('button.ts.btn-primary').text(),
    'dataType': c,
    'data': [],
    'date': new Date()
  };

  if(newResults.dataType == '#categoricalEntry') {
    newResults.measureType = $('#measureTargetSelect').find(':selected').text();
  } else {
    newResults.measureType = $('#measureTypeSelect').find(':selected').text();
  }

  if(c == '#continuousEntry') {
    newResults.data = [ 
      drawBlandAndAltman(),
      drawLinearRegression()
    ];
    drawICC();

    $('#categoricalResults').hide();
    $('#sequentialResults').hide();
    $('#continuousResults').show();
  } else if(c == '#categoricalEntry') {
    newResults.data = [
      drawCategoricalResults()
    ];

    $('#continuousResults').hide();
    $('#sequentialResults').hide();
    $('#categoricalResults').show();
  } else { // Sequential entry
    newResults.data = [
      drawSequentialResults()
    ];

    newResults['testType'] = 'N/A';

    $('#continuousResults').hide();
    $('#sequentialResults').show();
    $('#categoricalResults').hide();
  }
  $('[data-toggle="popover"]').popover();
  $('#results').show();

  // not perfect, you know what i mean
  $('#finaliseCa').prop('disabled', false);
  $('#finaliseCo').prop('disabled', false);
  $('#finaliseSe').prop('disabled', false);

  results = newResults;
};

var finaliseResults = function(skip) {
  if(!skip) {
    showResults(c);
    return finaliseResults(true);
  } else {
    if(c == '#continuousEntry' && !results.data[1].icc) {
      return setTimeout(function() { finaliseResults(true); console.log('waiting for icc'); }, 1000);
    }
  }

  // So, now we will build the PDF.

  var dataOut;
  if(results.dataType == '#continuousEntry') {
    dataOut = 'Continuous';
  } else if(results.dataType == '#categoricalEntry') {
    dataOut = 'Categorical';
  } else { // sequential
    dataOut = 'Sequential (repeatability)';
  }

  results.metadata = {
    'country': $('#countryInput').find(':selected').text(),
    'yearly': $('#yearlyInput').find(':selected').text(),
    'accreditation': $('#creditInput').find(':selected').text()
  };

  var pdfContent = [
    { 'text': 'Echocardiogram Repeatability Analysis', 'style': 'header' },
    { 'text': 'Test Information', 'style': 'subheader' },
    'Data type: ' + dataOut,
    'Test type: ' + results.testType,
    'Measure: ' + results.measureType, 
    'Date/Time: ' + results.date,
    { 'text': 'Metadata', 'style': 'subheader' },
    'Country: ' + results.metadata.country,
    'Centre Accreditation: ' + results.metadata.accreditation,
    'Echos performed per-year at centre: ' + results.metadata.yearly,
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
      $(c).find('.mh1').text(),
      $(c).find('.mh2').text()
    ]); // add the table headings

    table = results.data[1].data;
  } else if(c == '#sequentialEntry') {
    table = [
      [ $(c).find('.noType').text(), $(c).find('.mh').text() ]
    ];
    $(results.data[0].data).each(function(a, b) {
      table.push([ a+1, b ]);
    });
  } else if(c == '#categoricalEntry') {
    table = [ 
      [
        $(c).find('.noType').text(),
        $(c).find('.mh1').text(),
        $(c).find('.mh2').text()
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
  pdfContent.push({ 'text': 'Results', 'style': 'subheader' });

  var processResults = function(cb) {
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
                      "y = " + results.data[1].y,
                      "Spearman correlation: " + results.data[1].spearman,
                      "Intra-class Correlation: " + results.data[1].icc
                    ]
                  }
                ]
              ]
            }
          });
          
          cb();
        });
      });
    } else if(c == '#sequentialEntry') {
      Plotly.toImage($('#line')[0], { 'format': 'jpeg' }).then(function(img) {
        pdfContent.push({ 'image': img, 'width': 500 });
        pdfContent.push('Coefficient of Variation: ' + results.data[0].varCoef);
        pdfContent.push('MDC: ' + results.data[0].mdc);
        pdfContent.push('Repeatability Coefficient: ' + results.data[0].rCoef);

        cb();
      });
    } else if(c == '#categoricalEntry') {
      var cr = results.data[0].data; 

      var totalTable = [
        [ 'Judge 1 vs Judge 2', 'None', 'Trivial', 'Mild', 'Moderate', 'Severe', 'Total (Judge 1)' ],
        [ 'None', cr['None_None'], cr['None_Trivial'], cr['None_Mild'], cr['None_Moderate'], cr['None_Severe'], cr['Total_None'] ],
        [ 'Trivial', cr['Trivial_None'], cr['Trivial_Trivial'], cr['Trivial_Mild'], cr['Trivial_Moderate'], cr['Trivial_Severe'], cr['Total_Trivial'] ],
        [ 'Mild', cr['Mild_None'], cr['Mild_Trivial'], cr['Mild_Mild'], cr['Mild_Moderate'], cr['Mild_Severe'], cr['Total_Mild'] ],
        [ 'Moderate', cr['Moderate_None'], cr['Moderate_Trivial'], cr['Moderate_Mild'], cr['Moderate_Moderate'], cr['Moderate_Severe'], cr['Total_Moderate'] ],
        [ 'Severe', cr['Severe_None'], cr['Severe_Trivial'], cr['Severe_Mild'], cr['Severe_Moderate'], cr['Severe_Severe'], cr['Total_Severe'] ],
        [ 'Total (Judge 2)', cr['None_Total'], cr['Trivial_Total'], cr['Mild_Total'], cr['Moderate_Total'], cr['Severe_Total'], cr['Total_Total'] ]
      ];

      pdfContent.push({ 'text': 'Totals', 'style': 'subsubheader' });
      pdfContent.push({ 
        'style': 'table', 
        'table': {
          'body': totalTable
        }
      });

      var agreementsTable = [
        [ '', 'None', 'Trivial', 'Mild', 'Moderate', 'Severe', 'Total' ],
        [ 'Number of agreements', cr['Agree_None'], cr['Agree_Trivial'], cr['Agree_Mild'], cr['Agree_Moderate'], cr['Agree_Severe'], cr['Total_Agree'] ],
        [ 'Agreements due to chance', cr['Chance_None'], cr['Chance_Trivial'], cr['Chance_Mild'], cr['Chance_Moderate'], cr['Chance_Severe'], cr['Total_Chance'] ]
      ];
      pdfContent.push({ 'text': 'Agreements', 'style': 'subsubheader' });
      pdfContent.push({ 
        'style': 'table', 
        'table': {
          'body': agreementsTable 
        }
      });
      pdfContent.push('Kappa: ' + results.data[0].kappa);

      cb();
    }
  }

  processResults(function() {
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

    var pdf = pdfMake.createPdf(pdfData);
    pdf.getBase64((base => {
      delete results.data[0]['plot'];
      delete results.data[1]['plot'];
      delete results.data[1]['type'];
      sendData({ 'results': results, 'pdf': base });
    })); 
    pdf.download('results.pdf', () => {});

    console.log(results);
  });
};

var drawCategoricalResults = function() {
  // Basically Mild/Moderate/Severe cross-table between the two judges with totals. Number of agreement for each category. Then agreement due to change. Generate Kappa coefficient
  var o = ['None', 'Trivial', 'Mild', 'Moderate', 'Severe'];
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

  $(c).find('tbody').find('tr').each(function() {
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
    $('#Total_Chance').text((parseInt($('#Total_Chance').text()) + result).toFixed(2));
  });

  var tChance = parseInt($('#Total_Chance').text()).toFixed(2);
  var kappa = ((parseInt($('#Total_Agree').text()) - tChance) / 
        (parseInt($('#Total_Total').text()) - tChance)).toFixed(2);
  
  var kapExp = getCorExp(kappa);
  var kapPop = '<a href="#" title="Kappa Result Explanation" data-toggle="popover" data-trigger="hover" data-content="'+kapExp+'">'+kappa+'</a>';
  $('#Kappa').html('Kappa: ' + kapPop);

  var results = {
    'type': 'categorical',
    'kappa': kappa,
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

var drawBlandAndAltman = function() {
  var x = [], // Mean 
      y = []; // Difference
  
  $(c).find('tbody').find('tr').each(function() { // btw jquery's map sux
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

  var biasExp = getCorExp(bias);
  var biasPop = '<a href="#" title="Bias Result Explanation" data-toggle="popover" data-trigger="hover" data-content="'+biasExp+'">'+bias+'</a>';

  var limitPop = '<a href="#" title="Limits Explanation" data-toggle="popover" data-trigger="hover" data-content="This represents where 95% of future measurements will lie. Narrower limits of agreement suggest higher reproducibility.">';
  var lLimitPop = limitPop + 'Lower Limit:</a>';
  var uLimitPop = limitPop + 'Upper Limit:</a>';

  $('#bias').html("Bias: " + biasPop)
  $('#upper').html(uLimitPop + " " + upperAgreement)
  $('#lower').html(lLimitPop + " " + lowerAgreement)

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

var drawSequentialResults = function() {
  var x = [],
      y = [];

  $(c).find('tbody').find('tr').each(function(i) {
    x.push(i+1);
    y.push(parseInt($(this.cells[1]).find('input:first').val()));
  });

  var trace = {
    'x': x,
    'y': y,
    'mode': 'lines+markers',
    'type': 'scatter'
  };

  var layout = {
    'title': 'Repeatability Line Graph',
    'showLegend': true,
    'width': 500,
    'xaxis': {
      'title': 'Test Number',
      'dtick': 1
    },
    'yaxis': {
      'title': 'Measurement (' + $('#measureTypeSelect').find(':selected').text() + ')'
    }
  };

  var gd = Plotly.newPlot('line', [trace], layout);

  var avg = average(y),
      stdDev = standardDeviation(y),
      varCoef = ((stdDev / avg) * 100).toFixed(2),
      sem = stdDev / Math.sqrt(y.length),
      mdc = (1.96 * Math.sqrt(2) * sem).toFixed(2),
      rCoef = (stdDev * Math.sqrt(2) * 1.96).toFixed(2);

  var vPop = '<a href="#" title="Coefficient of Variation Explanation" data-toggle="popover" data-trigger="hover" data-content="This is the ratio of the standard deviation to the mean. The lower the value, the more reproducible the measurement.">Coefficient of Variation:</a>';
  var mdcPop = '<a href="#" title="Minimal Detectable Change Explanation" data-toggle="popover" data-trigger="hover" data-content="This represents the minimal change required to be sure that the difference observed reflect a real change rather than measurement error. A lower percentage suggests a more reproducible measurement.">MDC:</a>';
  var rCoefPop = '<a href="#" title="Repeability Coefficient Explanation" data-toggle="popover" data-trigger="hover" data-content="This represents the maximal predicted difference in measurement for all future measurements taken, i.e. the lower the repeatability coefficient the more reproducible the measurement.">Repeatability Coefficient:</a>';

  $('#variation').html(vPop + ' ' + varCoef);
  $('#mdc').html(mdcPop + ' ' + mdc);
  $('#rcoef').html(rCoefPop + ' ' + rCoef);

  return {
    'plot': gd,
    'data': y,
    'varCoef': varCoef,
    'mdc': mdc,
    'rCoef': rCoef
  };
};

var drawLinearRegression = function() {
  // between pairs of the two measurement sets
  var pairs = [];
  
  $(c).find('tbody').find('tr').each(function() { // btw jquery's map sux
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
      'title': 'x (' + $('#measureTypeSelect').find(':selected').text() + ')'
    },
    'yaxis': {
      'title': 'y (' + $('#measureTypeSelect').find(':selected').text() + ')'
    }
  };

  var gd = Plotly.newPlot('linear', [trace, bestFit], layout),
      yEquation = yIntercept.toFixed(2),
      r = result.r2.toFixed(2),
      gradient = result.string;

  var r2Exp = getCorExp(r);
  var rPop = '<a href="#" title="r² Result Explanation" data-toggle="popover" data-trigger="hover" data-content="'+r2Exp+'">'+r+'</a>';

  $('#y').text("y: " + yEquation);
  $('#r').html("r²: " + rPop);
  $('#gradient').text("Equation: " + gradient)

  var spear = spearson.correlation.spearman(x, y, true).toFixed(2);
  var spearExp = getCorExp(spear);
  var spearPop = '<a href="#" title="Spearson Result Explanation" data-toggle="popover" data-trigger="hover" data-content="'+spearExp+'">'+spear+'</a>';
  $('#spearman').html('Spearman correlation: ' + spearPop);

  return {
    'y': yEquation,
    'r': r,
    'type': linear,
    'gradient': gradient,
    'plot': gd,
    'spearman': spear,
    'data': pairs
  };
}

var changeDataType = function(reject, value) {
  if(!value) {
    value = $('#dataTypeSelect').find(':selected').text();
  }
  if(reject) {
    $('#dataTypeSelect').val(dType);
  } else {
    dType = value

    if(dType == 'Continuous') {
      c = '#continuousEntry';
      $('#measureTypeGroup').show();
      $('#measureTargetGroup').hide();
      $('#categoricalEntry').hide();
      $('#sequentialEntry').hide();
      $('#dataTypeGroup').show();
      $(c).show();
    } else if(dType == 'Categorical') {
      c = '#categoricalEntry';
      $('#continuousEntry').hide();
      $('#measureTypeGroup').hide();
      $('#measureTargetGroup').show();
      $('#sequentialEntry').hide();
      $('#dataTypeGroup').show();
      $(c).show();
    } else { // Sequential
      c = '#sequentialEntry';
      $('#categoricalEntry').hide();
      $('#continuousEntry').hide();
      $('#measureTypeGroup').show();
      $('#measureTargetGroup').hide();
      $('#dataTypeGroup').hide();
      $(c).show();
    }

    changeUnitType();

    $('#results').hide();
  }
}

var sendData = function(data) { 
  console.log('sending');
  $.post('/save', data);
};

var clearTable = function() {
  var r = $(c).find('tbody tr');

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
  var r = $(c).find('tbody tr');
  if(r.length > 1) {
    r[rNum-1].remove();
    r.each(function(ind, el) {
      $(this).children('td').first().text(++ind);
    });
  } else {
    alert('Not removing last row');
  }
}

var changeUnitType = function() { 
  var unit = $('#measureTypeSelect').find(':selected').text();
  $(c).find('.noType').text('Patient No.');
  $(c).find('.u').text(' ('+unit+')');
  $('#results').hide(); // only works for categorical, obviously
}

var changeTestType = function(tType) {
  var unit = $('#measureTypeSelect').find(':selected').text();
  //var tType = $('#testTypeSelect').find(':selected').attr('class'),

  //if(!$('#testTypeGroup').is(':visible')) { tType = null; }

  if(dType == 'Sequential' && tType != 't5') {
    changeDataType(false, 'Continuous');
  }

  // do you love the descriptive class names?
  switch(tType) {
    case 't1':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Operator 1 Measurement');
      $(c).find('.m2').text('Operator 2 Measurement');
      break;
    case 't2':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Attempt 1');
      $(c).find('.m2').text('Measurement Attempt 2');
      break;
    case 't3':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Method 1');
      $(c).find('.m2').text('Measurement Method 2');
      break;
    case 't4':
      $(c).find('.noType').text('Patient No.');
      $(c).find('.m1').text('Measurement Under Condition 1');
      $(c).find('.m2').text('Measurement Under Condition 2');
      break;
    case 't5':
      console.log('caught t5');
      changeDataType(false, 'Sequential');
      break;
  }

  $('.ts').removeClass('btn-primary');
  $('#'+tType).addClass('btn-primary');

  $('#results').hide();
  clearTable();
};

$(document).ready(function() {
  addListeners();
  $('#fileInput').on('change', readTSVFile);

  var showChangeModal = function() { $('#changeModal').modal('show'); };

  $('#dataTypeSelect').on('change', showChangeModal);
  changeDataType(false, dType);

  $('#testTypeSelect').on('change', changeTestType);
  $('#measureTypeSelect').on('change', changeUnitType);
  changeTestType('t1');

  $('[data-toggle="popover"]').popover();
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
