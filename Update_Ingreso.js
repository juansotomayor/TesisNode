var observableDiff = require('deep-diff').observableDiff,
applyChange        = require('deep-diff').applyChange;
var mysql = require('mysql');

var hostRB = '103.224.22.99';
var userRB = 'raidbuue';
var passwordRB = '6V9P%0#0G8hM';
var databaseRB = 'raidbuue_cControl';
/*
var hostRPI = 'localhost';
var userRPI = 'root';
var passwordRPI = '';
var databaseRPI ='raidbuue_cControl';
*/
var hostRPI = 'localhost';
var userRPI = 'root';
var passwordRPI = 'nosewn';
var databaseRPI ='raidbuue_cControl';
var RPI = [];
var RB = [];
var X = [];


setInterval(function(){
    RPI = [];
    RB = [];
    X = [];
    var connection = mysql.createConnection({
        host : hostRPI,
        user: userRPI,
        password: passwordRPI,
        database : databaseRPI
    });
    connection.connect();
    var query = connection.query('SELECT * FROM ingreso', function(err, rows) {
    // Neat!
    if (err) {
        console.log(error.message);
    } else {
   largoRPI = rows.length;
        console.log("Tabla interna de RPI");
        for (var i = 0; i < rows.length; i++) {
            RPI[i] = rows[i];
        };
    }
    });
    connection.end();
    var connection = mysql.createConnection({
        host : hostRB,
        user: userRB,
        password: passwordRB,
        database : databaseRB
    });
    connection.connect();
    var query = connection.query('SELECT * FROM ingreso', function(err, rows) {
    // Neat!
    if (err) {
        console.log(error.message);
    } else {
        console.log("Tabla interna de RB");
        for (var i = 0; i < rows.length; i++) {
            RB[i] = rows[i];
        };
        databaseDiff();
    }
    });
    connection.end();
 },5000);

function databaseDiff(){
    var i = 0;
    observableDiff(RPI, RB, function (d) {
        console.log(d);
        //console.log(d.item);
        if(d.kind){
            X[i] = d;
            i++
        }
    });  // false
    console.log("--------------------------------------------------------");
    for(i = 0; i < X.length; i++){
        if(X[i].kind == 'A'){
            console.log("esta variable tiene la columna adicional");
            if(X[i].item.lhs){
                console.log("RB");
                X[i].item.lhs.fecha = X[i].item.lhs.fecha.toISOString();
                IntoRB(X[i].item.lhs)
            }
        }
    }
}

function IntoRB(data){
    console.log("Into tabla RB");
    var connection = mysql.createConnection({
        host : hostRB,
        user: userRB,
        password: passwordRB,
        database : databaseRB
    });
    connection.connect();
    var query = connection.query("INSERT INTO ingreso SET ?", data, function(error, result) {

        if (error) {
            console.log(error.message);
        } else {
            console.log('insertado');
        }
    });
     console.log(query.sql);
    connection.end();
}

