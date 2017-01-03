//var gpio = require('rpi-gpio');

var SerialPort = require("serialport").SerialPort;
var serialport = new SerialPort(process.argv[2]);
var mysql      = require('mysql');

var host  = 'localhost';  //RPI
var user = 'root';
var password = 'adminCIAL2016';
var database = 'passctrl';
/*
var host  = '103.224.22.99';  //raidbotics.com
var user = 'raidbuue';
var password = '6V9P%0#0G8hM';
var database = 'raidbuue_cControl';
*/
var Type = '';
var Code = '';
var DataArduino = "";
//gpio.setup(7, gpio.DIR_OUT);

serialport.on('open', function(){
    console.log('Serial Port Opend');
});
/********************************************Lectura_Serial***********************************************************/
serialport.on('data', function(data){
    DataArduino = DataArduino + data;
    var posicion = DataArduino.lastIndexOf('*');
    if(posicion > 0){
        Controlador(DataArduino.substring(0, posicion));
        DataArduino = DataArduino.substring(posicion+1)
    }
});
serialport.on('close', function(){
    console.log("puerto cerrado... reconectando");
    serialport = new SerialPort(process.argv[2]);
});

function Controlador(data){
    var receivedData = data.toString();
    var Data = receivedData.split("-");
    dataSize = Data.length;
    console.log(Data);
    if(Data[0] == "BIOMETRIA"){
        if(Data[1] == "ADMIN"){
            Code = Data[2]; //id bio 
            AddUser("biometria", Code, Data[3], Data[4]); //data3 = modulo  data4= iduser
        }else{
            Acceso(Data[0], Data[2], Data[3]);
        }
    }else if(Data[0] == "RFID"){ //Si Data[0] = "RFID" significa que se esta ejecutando una acción por medio de RFID
        if(Data[1] == "ADMIN"){  //Si Data[1] = "USER" significa que hay un usuario solicitando acceso.
            Acceso(Data[0], Data[2], Data[3]); //Envia a la función Access() 
        }else { // el caso que Data[1] = "ADMIN" significa que el admin va a verifiar o agregar usuario RFID 
           Code = Data[2]; //id bio 
           if(Data[2] == "ADD"){
               CheckRFID(Data[3], Data[4], Data[5]);
           }else{
               AddUser("rfid", Code, Data[3], Data[4]); //data3 = modulo  data4= iduser
           }
        }
    }
    else if(Data[0] == "USER"){
        console.log("RBA");
        Acceso("KEYPAD", Data[1]);
    }else if(Data[0] == "ADMIN"){
        console.log("Acceso de administrado");
        CheckAdmin(Data[1], Data[2], Data[3]);

    }else if(Data[0] == "CHECK"){
        serialport.write("*CHECK-");
        console.log("Chequeo comunición con módulo");
    }
    else if(Data[0] == "ADDUSER"){
        console.log("ADDUSER");
        CheckUser(Data[1], Data[2]);
    }    
}
/********************************************Abrir_puerta***********************************************************/
function Open(x, y, z) {
    serialport.write("*OPEN_DOOR*"+x+"*"+y+"*"+z+"-")
    //rpi
    /*gpio.write(7, true);
    setTimeout(function () {
        gpio.write(7, false);
    }, 1000);
    */
}
/********************************************Adicionar_Usuario***********************************************************/
function CheckRFID(codigo, modulo, idUser) {
    console.log("Chequea tarjeta RFID "+codigo+" modulo: "+modulo+" iduser= "+idUser);
    var connection = mysql.createConnection({
    host : host,
    user: user,
    password: password,
    database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE rfid = "1" AND code_rfid = "'+codigo+'" AND idModulo = "'+modulo+'"', function(err, rows) {
        if (err) {
            console.log(error.message);
        } else {
            if( rows.length == 0){
                serialport.write("*RFID_OK*"+codigo+"*"+modulo+"*"+idUser+"-");
                console.log("usuario RFID Valido");
                //AddUser("rfid", codigo, modulo, idUser)
            }else{
            //var id = rows[0].code_rfid;
            //if(id == codigo){
                serialport.write("*USER_EXISTING-");
                console.log("usuario RFID existente");
            //}else{
                
            }
        }
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'   
    connection.end();
}
function AddUser(tipo, codigo, modulo, idUser) {
    console.log("Agregar usuarios por "+tipo);
    var etiqueta = 0;
    var connection = mysql.createConnection({
    host : host,
    user: user,
    password: password,
    database : database
    });
    serialport.write("*-");
    connection.connect();
    var query = connection.query('UPDATE usuarios_modulos SET '+tipo+' = "1", code_'+tipo+' = "'+codigo+'" WHERE id_code = '+idUser+' AND idModulo='+modulo+'', function(error, result) {
    if (error) {
        console.log(error.message);
    } else {
        serialport.write("*USER_ADDED-");
        console.log('Usuario adicionado!!');
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
            serialport.write("*ADMIN*OK-");
        }else{
            serialport.write("*ADMIN*FAIL-");
            console.log("usuario existente");
        }
    }
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
    connection.end();
}
/********************************************Access***********************************************************/
function Acceso(x, y, z){
    console.log("Acceso");
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
            serialport.write("*USER_NONEXIST-");
            if(x == "BIOMETRIA"){
                console.log("borrar user bio");
                serialport.write("*FP_DELETE*"+y+"-");
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
                serialport.write("*USER_DENIED*"+nombre+"*"+apellido +"-");
                History(id, nombre, apellido, x, estado, idModulo);
            }else{
                serialport.write("*USER_NONEXIST-");
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
  console.log("Estado del módulo");
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
function CheckUser(idModulo, idUser){
    var mysql      = require('mysql');
    var id_bio = 0;
    var connection = mysql.createConnection({
        host : host,
        user: user,
        password: password,
        database : database
    });
    connection.connect();
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE idModulo ="'+idModulo+'" ORDER BY code_biometria', function(err, rows) {
        if (err) {
            console.log(error.message);
        } else {
            console.log("Lista de usuarios de biometria");
            var bio_detec = "";
            /***********************************aqui verificar el add user************* WHERE biometria ="1" */
            for(var a = 0; a<=125; a++){
                var codigo = 0;
                for (var i = 0; i < rows.length; i++) {
                    bio_detec = bio_detec+"*"+rows[i].code_biometria;
                    if(rows[i].code_biometria){
                        if(rows[i].code_biometria == a){
                            codigo = 1;
                        }
                    }
                }
                //serialport.write("USERSBIO*"+bio_detec+"-");
                //console.log("USERSBIO"+bio_detec+"-");
                if(codigo == 0){
                    id_bio = a; //proximo usuario biometrico disponible
                    break;
                }
            }
        }
    });
    
    var query = connection.query('SELECT * FROM usuarios_modulos WHERE idModulo="'+idModulo+'" AND id_code = "'+idUser+'" ', function(err, rows) {
    if (err) {
        console.log(error.message);
    } else {
        if( rows.length == 0){
            console.log("usuario no existe");
            serialport.write("*USER_NONEXIST-");
        }else{
            var biometria =0;
            var rfid = 0;
            var id = rows[0].id;
            var code_biometria = rows[0].code_biometria;
            var code_rfid = rows[0].code_rfid;
            var user = rows[0].user;
            
            if(user == "ON"){
                console.log("Usuario "+idUser+" Confirmado!");
                if(code_biometria){
                     biometria=1;
                }
                if(code_rfid){
                    rfid=1;
                }
                console.log("USER_ADD*"+idUser+"*"+id_bio+"-");
                serialport.write("*USER_ADD*"+idUser+"*"+id_bio+"-");
            }else{
                serialport.write("*USER_DELETED-");
            }
        }
    }
  });
  console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'
  connection.end();
}
