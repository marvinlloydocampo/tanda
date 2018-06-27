const express = require('express');
const router = express.Router();
const pg = require('pg');
const path = require('path');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/tanda';

router.post('/clear_data', (req, res, next) => {
  const results = [];
  // Grab data from http request
  const data = {text: req.body.text, complete: false};
  // Get a Postgres client from the connection pool
  pg.connect(connectionString, (err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    // SQL Query > DELETE DATA FROM DEVICES
    client.query('DELETE FROM epochs');
    // SQL Query > DELETE DATA FROM EPOCHS
    const query = client.query('DELETE FROM devices');
    // After all data is returned, close connection and return results
    query.on('end', () => {
      console.log('DATA DELETED!')
      done();
    });
    res.status(200)
    res.end();
  });
});

router.get('/devices', (req, res, next) => {
  const results = [];
  // Get a Postgres client from the connection pool
  pg.connect(connectionString, (err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    // SQL Query > Select Data
    const query = client.query('SELECT * FROM devices ORDER BY id ASC');
    // Stream results back one row at a time
    query.on('row', (row) => {
      results.push(row);
    });
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      return res.json(results);
    });
  });
});


router.post('/:device_id/:epoch_time', (req, res, next) => {
  const results = [];
  // Grab data from http request
  // Grab data from the URL parameters
  const device_id = req.params.device_id;
  const epoch_time = req.params.epoch_time;
  // Get a Postgres client from the connection pool
  pg.connect(connectionString, (err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var utc_date = new Date(parseInt(epoch_time)*1000).toUTCString();
    // SQL Query > Insert Data
    client.query("INSERT INTO devices(id, name) SELECT $1, 'Device Name' WHERE NOT EXISTS ( SELECT id FROM devices WHERE id = $1 )",
    [device_id]);
    query = client.query('INSERT INTO epochs(device_id, unix_timestamp, utc_date) values($1, $2, $3)',
    [device_id, epoch_time, utc_date]);
    // After all data is returned, close connection and return results
    query.on('end', () => {
      console.log('INSERTED DATA')
      done();
    });
    res.status(200)
    res.end();
  });
});


router.get('/:device_id/:date', (req, res, next) => {
  const results = [];
  const obj = {};
  // Get a Postgres client from the connection pool
  // Grab data from the URL parameters
  const device_id = req.params.device_id;
  const date_string = req.params.date;
  pg.connect(connectionString, (err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }

    if(isNaN(date_string)){
      var date = new Date(date_string).toUTCString();
    } else {
      var date = new Date(parseInt(date_string)*1000).toUTCString();
    }
    console.log(date);

    // SQL Query > Select Data
    if (device_id == 'all') {
      var sql_query = 'SELECT d.id, e.unix_timestamp FROM devices d INNER JOIN epochs e ON d.id = e.device_id WHERE DATE(e.utc_date) = $1'
      var params = [date]
    } else {
      var sql_query = 'SELECT e.unix_timestamp FROM devices d INNER JOIN epochs e ON d.id = e.device_id WHERE d.id = $1 AND DATE(e.utc_date) = $2'
      var params = [device_id, date]
    }

    const query = client.query(
      sql_query,params
    ); 
    // Stream results back one row at a time
    query.on('row', (row) => {
      if (device_id == 'all') {
        obj[row.id] = obj[row.id] || [];
        obj[row.id].push(row.unix_timestamp);

      }
      results.push(row.unix_timestamp);
    });
    // After all data is returned, close connection and return results
    query.on('end', () => {
      done();
      if (device_id == 'all') {
        return res.json(obj)
      } else {
        return res.json(results);
      }
      
    });
  });
});


router.get('/:device_id/:from/:to', (req, res, next) => {
  const results = [];
  const obj = {};
  // Get a Postgres client from the connection pool
  // Grab data from the URL parameters
  const device_id = req.params.device_id;
  const date_from = req.params.from;
  const date_to = req.params.to;
  pg.connect(connectionString, (err, client, done) => {
    // Handle connection errors
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(device_id) || device_id == 'all') {
      if(isNaN(date_from)){
        var from = new Date(date_from).toUTCString();
      } else {
        var from = new Date(parseInt(date_from)*1000).toUTCString();
      }

      if(isNaN(date_to)){
        var to = new Date(date_to).toUTCString();
      } else {
        var to = new Date((parseInt(date_to)-1)*1000).toUTCString();
      }
      // SQL Query > Select Data

      if (device_id == 'all') {
        var sql_query = 'SELECT d.id, e.unix_timestamp FROM devices d INNER JOIN epochs e ON d.id = e.device_id WHERE e.utc_date BETWEEN $1 AND $2'
        var params = [from, to]
      } else {
        var sql_query = 'SELECT e.unix_timestamp FROM devices d INNER JOIN epochs e ON d.id = e.device_id WHERE d.id = $1 AND e.utc_date BETWEEN $2 AND $3'
        var params = [device_id, from, to]
      }
      const query = client.query(
        sql_query, params
      );
      // Stream results back one row at a time
      query.on('row', (row) => {
        if (device_id == 'all') {
          obj[row.id] = obj[row.id] || [];
          obj[row.id].push(row.unix_timestamp);
        } else {
          results.push(row.unix_timestamp);  
        }
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        done();
        if (device_id == 'all') {
          return res.json(obj);
        } else {
          return res.json(results);
        }
      });
    } else {
      return res.json([]);
    }
  });
});



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
