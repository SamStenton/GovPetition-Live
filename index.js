//Lets require/import the HTTP module
var app = require('express')();
var http = require('http').Server(app);

const https = require('https');
var io = require('socket.io')(http);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./database.sql');
var fs = require('fs');

io.on('connection', function(socket){
    getVotes();
    getData();
  socket.on('event', function(data){});
  socket.on('disconnect', function(){});
});

app.get('/', function(req, res){
    res.sendfile('index.html');
});

http.listen(8080, function(){
  console.log('listening on *:3000');
});

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS remain (votes integer, time datetime)");
});

var minutes = 0.1, the_interval = minutes * 60 * 1000;
setInterval(function() {
    var url = 'https://petition.parliament.uk/petitions/131215.json';

    https.get(url, function(res){
        var body = '';

        res.on('data', function(chunk){
            body += chunk;
        });

        res.on('end', function(){
            var response = JSON.parse(body);
            db.serialize(function() {
                var stmt = db.prepare("INSERT INTO remain VALUES (?, ?)");

                stmt.run(response['data']['attributes']['signature_count'], new Date());
                //console.log(response['data']['attributes']['signature_count']);
                stmt.finalize();
            });

        });

        getVotes();
    }).on('error', function(e){
          console.log("Got an error: ", e);
    });

}, the_interval);

function getVotes()
{
    db.get("SELECT votes FROM remain ORDER BY time DESC LIMIT 1", function(err, row) {
        //Io Emit
        if(row)
        {
            io.emit('votes', row.votes);
        }

    }).on('error', function(e){
          console.log("Got an error: ", e);
    });

}

function getData()
{
    db.all("SELECT votes, time FROM remain WHERE rowid%700 = 0 ORDER BY time DESC LIMIT 1000", function(err, object) {
        var votes = [];
        var time = [];
        for( var obj in object ) {
            votes.push(object[obj].votes);
            time.push(new Date(object[obj].time).toISOString().replace(/T/, ' ').replace(/\..+/, ''));
        }

        io.emit('array', votes, time);
        //console.log(object);
    }).on('error', function(e){
          console.log("Got an error: ", e);
    });
}

//db.close();
