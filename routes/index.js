var express = require('express'),
    router = express.Router(),
    uuid = require('uuid/v1'),
    fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Echocardiogram Reproducibility Testing' });
});

router.post('/save', function(req, res, next) { // we will just dump everything in a results dir for now
  var fName = 'results/'+uuid();
  fs.writeFileSync(fName+'.json', JSON.stringify(req.body.results));
  fs.writeFileSync(fName+'.pdf', req.body.pdf, 'base64');
  console.log(fName);
  res.send('cheers for the data m a ŧ e');
});

module.exports = router;
