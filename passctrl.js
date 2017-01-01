var gpio = require('rpi-gpio');

var SerialPort = require("serialport").SerialPort;
var serialport = new SerialPort(process.argv[2]);
var mysql      = require('mysql');

var host  = 'localhost';  //RPI
var user = 'root';
var password = 'nosewn';
var database = 'passctrl';
/*
var host  = '103.224.22.99';  //raidbotics.com
var user = 'raidbuue';
var password = '6V9P%0#0G8hM';
var database = 'raidbuue_cControl';
*/
var Type = '';
var Code = '';
gpio.setup(7, gpio.DIR_OUT);

serialport.on('open', function(){
    console.log('Serial Port Opend');
});
/********************************************Lectura_Serial***********************************************************/
serialport.on('data', function(data){
    var receivedData = data.toString();
    var Data = receivedData.split("-");
    dataSize = Data.length;
    if(Data[0] == "FP"){
        if(Data[1] == "USER"){
            Access("biometria", Data[2], Data[3]);
        }else if(Data[1] == "A"){
            if(Data[2] == "ENROLL"){
                CheckBiometric(Data[3], Data[4]);
            }else if(Data[2] == "FAIL"){

            }else{
                Code = Data[2];
                AddUser("biometria", Code, Data[3], Data[4]);
            }
        }
    }else if(Data[0] == "RFID"){ //Si Data[0] = "RFID" significa que se esta ejecutando una acción por medio de RFID
        if(Data[1] == "USER"){   //Si Data[1] = "USER" significa que hay un usuario solicitando acceso.
            Access("rfid", Data[2], Data[3]); //Envia a la función Access() 
        }else if(Data[1] == "ADMIN"){ // el caso que Data[1] = "ADMIN" significa que el admin va a verifiar o agregar usuario RFID 
           //Entra a la función CheckRFID() en donde verifica al usuario y lo registra 
           CheckUser(Data[0], Data[2], Data[3], Data[4]);                
           //Data[2] Corresponde al serial unico del usuario para identificarlos
           //Data[3] Corresponde al ID de la etiqueta RFID, en hexadecimal
           //Data[4] Corresponde al numero del módulo de control de acceso en este caso al 1            
        }
    }
    else if(Data[0] == "USER"){
        console.log("RBA");
        Access("KEYPAD", Data[1]);
    }else if(Data[0] == "ADMIN"){
        console.log("Admin");
        CheckAdmin(Data[1], Data[2], Data[3]);

    }else if(Data[0] == "CHECK"){
        serialport.write("CHECK-");
        console.log("CHECK");
        user_biometria('1');
        //EstadoModulo(Data[1], Data[2]);
    }
    else if(Data[0] == "ADDUSER"){
        console.log("ADDUSER");
        //EstadoModulo(Data[1], Data[2]);
        CheckUser(Data[1], Data[2]);
    }
    console.log(Data);
});

serialport.on('close', function(){
    console.log("puerto cerrado... reconectando");
    serialport = new SerialPort(process.argv[2]);
});
/********************************************Abrir_puerta***********************************************************/
function Open(x, y, z) {
    serialport.write("OPEN_DOOR*"+x+"*"+y+"*"+z+"-")
    //rpi
    gpio.write(7, true);
    setTimeout(function () {
        gpio.write(7, false);
    }, 1000);
}
/********************************************Adicionar_Usuario***********************************************************/
function AddUser(x, y, z, w) {
    console.log("AddUser");
    var connection = mysql.createConnection({
    host : host,
    user: user,
    password: password,
    database : database
    });
    connection.connect();
    //var post  = {x: '1', code_y: y, user:'ON'};
    var query = connection.query('UPDATE usuarios_modulos SET '+x+' = "1", code_'+x+' = "'+y+'" WHERE id = '+w+' AND idModulo='+z+'', function(error, result) {
    if (error) {
        console.log(error.message);
    } else {
        serialport.write("USER_ADDED-");
        console.log('success');
    }
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
    connection.end();
}
/*******************************************Chequeo usuario Biometrico*******************************************************/
function CheckBiometric(x, y){
    console.log("ChecBiometricr");
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE idModulo ="'+x+'" ORDER BY code_biometria', function(err, rows) {
        if (err) {
            console.log(error.message);
        } else {
            console.log("Lista de usuarios de biometria");
            /***********************************aqui verificar el add user************* WHERE biometria ="1" */
            for(var a = 0; a<=125; a++){
                var codigo = 0;
                for (var i = 0; i < rows.length; i++) {
                    if(rows[i].code_biometria){
                        if(rows[i].code_biometria == a){
                            codigo = 1;
                        }
                    }
                }
                if(codigo == 0){
                    serialport.write("FP_ENROLL*"+a+"*"+y+"-");
                    console.log("agregar a "+a);
                    break;
                }
            }

        }
    });
    connection.end();
}
function user_biometria(x){
    console.log("usuario biometria");
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });

    connection.connect();
    var query = connection.query('SELECT code_biometria FROM usuarios_modulos WHERE idModulo ="'+x+'"', function(err, rows) {
        if (err) {
            console.log(error.message);
        } else {
            console.log("Lista de usuarios de biometria");
            var bio_detec = "";
            for (var i = 0; i < rows.length; i++) {
                if(rows[i].code_biometria){
                    bio_detec = bio_detec+"*"+rows[i].code_biometria;
                }
            }
            //serialport.write("FP_USERS*"+bio_detec+"-");
            console.log("FP_USERS"+bio_detec+"-");
        }
    });
    connection.end();
}
/********************************************Chequear usuario RFID***********************************************************/
function CheckRFID(x, y, z, w){
    console.log("ChecRFID");
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE rfid = "'+x+'" AND code_rfid = "'+y+'" AND idModulo = "'+z+'"', function(err, rows) {
    if (err) {
        console.log(error.message);
    } else {
        for (var i = 0; i < rows.length; i++) {
            console.log(rows[i]);
        };
        if( rows.length == 0){
            console.log("agregar usuario");
            serialport.write("RFID_ENROLL*"+w+"-");
        }else{
            serialport.write("USER_EXISTING-");
            console.log("usuario existente");
        }
    }
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
    connection.end();
}
/********************************************Chequear Administrador***********************************************************/
function CheckAdmin(x, y, z){
    console.log("CheckAdmin ");
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM modulos WHERE modulo = "'+x+'" AND codigo = "'+y+'" AND pass_admin = "'+z+'"', function(err, rows) {
    if (err) {
        console.log(error.message);
    } else {
        if( rows.length != 0 ){
        console.log("admin ok");
        serialport.write("ADMIN*OK-");
        }else{
        serialport.write("ADMIN*FAIL-");
        console.log("usuario existente");
        }
    }
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
    connection.end();
}
/********************************************Access***********************************************************/
function Access(x, y, z){
    console.log("Access");
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE '+x+'="1" AND code_'+x+' = "'+y+'" ', function(err, rows) {
    if (err) {
        console.log(error.message);
    } else {
        if( rows.length == 0){
            console.log("usuario no existe");
            serialport.write("USER_NONEXIST-");
            if(x == "biometria"){
                serialport.write("FP_DELETE*"+y);
            }
        }else{
            console.log("usuario existente");
            var id = rows[0].id;
            var nombre = rows[0].nombre;
            var apellido = rows[0].apellido;
            var sexo = rows[0].sexo;
            var estado = rows[0].acceso;
            var user = rows[0].user;
            var idModulo = rows[0].idModulo;
            nombre = nombre.toUpperCase();
            apellido = apellido.toUpperCase();
            console.log(nombre);
            console.log(estado);
            console.log(user);
            if(estado == "1" && user == "ON"){
                Open(nombre, apellido, sexo);
                History(id, nombre, apellido, x, estado, idModulo);
            }else if(estado == "0" || user == "OFF"){
                serialport.write("USER_DENIED*"+nombre+"*"+apellido +"-");
                History(id, nombre, apellido, x, estado, idModulo);
            }else{
                serialport.write("USER_NONEXIST-");
            }
        }
    }
  });
  console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'

  connection.end();
}
/*****************************************Almacenar el historial de ingreso***************************************************/
function History(a, b, c, d, e, f) {
  console.log("History");
  var connection = mysql.createConnection({
    host : host,
    user: user,
    password: password,
    database : database
  });
  connection.connect();
  var post  = {id: a, nombre: b, apellido: c, tipo: d, estado: e, idModulo: f};
  var query = connection.query('INSERT INTO ingreso SET ?', post, function(error, result) {
    if (error) {
        console.log(error.message);
    } else {
        console.log('History ok');
    }
  });
  console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
  connection.end();
}
/********************************************Estado Modulo***********************************************************/
function EstadoModulo(x, y) {
  console.log("Estade_module");
  var connection = mysql.createConnection({
    host : host,
    user: user,
    password: password,
    database : database
  });
  connection.connect();
  var query = connection.query('UPDATE modulos SET estado = "ON" WHERE modulo = "'+x+'" AND codigo = "'+y+'"', function(error, result) {
    if (error) {
        console.log(error.message);
    } else {
        console.log('History ok');
    }
  });
  console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
  connection.end();
}
/***************************************************check user */
function CheckUser(x,y){
    var mysql      = require('mysql');
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE idModulo="'+x+'" AND id_code = "'+y+'" ', function(err, rows) {
    if (err) {
        console.log(error.message);
    } else {
        if( rows.length == 0){
            console.log("usuario no existe");
            serialport.write("USER_NON-");
        }else{
            console.log("usuario existente");
            var biometria =0;
            var rfid = 0;
            var id = rows[0].id;
            var code_biometria = rows[0].code_biometria;
            var code_rfid = rows[0].code_rfid;
            var user = rows[0].user;
            if(user == "ON"){
                if(code_biometria && code_rfid){
                    console.log("USER_ADDALL-");
                    serialport.write("USER_ADDSITE-");
                }else if(code_biometria){
                     biometria=1;
                    console.log("USER_ADDBIOMETRIA-");
                    serialport.write("USER_ADD*"+biometria+"*"+rfid+"*"+id+"-");
                }else if(code_rfid){
                    rfid=1;
                    console.log("USER_ADDRFID-");
                    serialport.write("USER_ADD*"+biometria+"*"+rfid+"*"+id+"-");
                }else{
                    serialport.write("USER_ADD*"+biometria+"*"+rfid+"*"+id+"-");
                }

            }else{
                serialport.write("USER_DELETED-");
            }
        }
    }
  });
  console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
  connection.end();
}
