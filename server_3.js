//подключение библиотек
const http = require('http');
const static = require('node-static');
const {parse} = require('querystring');
const session = require('express-session');
const mysql = require('mysql');
const bodyParser = require("body-parser");
const express = require('express');  //использование framework
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const WebSocket = require('ws');

const port = 3000;  //сервер на порту 3000
const app = express();  //создание объекта приложения
const server = http.createServer(app);  //создание http сервера
const wss = new WebSocket.Server({ noServer: true });

//подключение Базы Данных
/*const db = mysql.createConnection( {
                host     : 'localhost',
                port     : '3306',
                user     : 'root',
                password : '',
                database : 'nine_mens_morris_game'
            });

db.connect(function(err) {
    if (err) {
        return console.error("Ошибка: " + err.message);
    }
    else {
        console.log("Подключение к серверу MySQL успешно установлено");
    }
});*/

function checkAuth() {
    return function (req, res, next) {
        console.log("CheckAuth Middleware");
        if (req.session.userId)
            return next();
        else
            res.redirect('/main');
    }
}

function checkNotAuth() {
    return function (req, res, next) {
        console.log("CheckNotAuth Middleware");
        if (!req.session.userId)
            return next();
        else
            res.redirect('/game');
    }
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const sessionParser = session( {
    secret: 'secret keyboard',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 900000 }
} );
app.use(sessionParser);

app.use(function(req, res, next) {  //поддержка вечных сессий
    var err = req.session.error,
        msg = req.session.notice,
        success = req.session.success;
  
    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;
  
    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;
    console.log("Middleware   " + req.sessionID + "   " + req.session.userId);
    next();
});
app.use(express.static(__dirname + "/public"));  //статический файловый сервер


app.get("*/api", function (req, res)
{
    res.send('API is running');
});
app.get("/main", checkNotAuth(), function (req, res)  //главная
{
    console.log("Подключение к Main");
    console.log(req.sessionID + '   ' + req.session.userId);
    res.redirect('/main.html');
});
app.post("/login", function (req, res)  //аутентификация
{
    var sess = req.session;
    var name = req.body.login;
    var pass = req.body.pw;
    console.log(name + '   ' + pass);

    var req2 = new XMLHttpRequest();  //создание запроса
    req2.open("POST", "http://lavro.ru/225364/sendfuncsql.php", true);  //true - асинхронный запрос
    req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
    req2.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (isJsonString(this.responseText) == true) {
                var results = JSON.parse(this.responseText);
                
                if (results[0]["checkPassword('" + name + "','" + pass + "')"]) {
                    console.log("User is correct");
                    req.session.userId = name;
                    req.session.user = name + name;
                    req.session.userPassword = pass;
                    req.session.save();
                    console.log(req.sessionId + '   ' + req.session.userId);
                    res.redirect('/game');
                }
                else {
                    console.log("Error: user is incorrect");
                    console.log(results);
                    console.log(req.sessionID + '   ' + req.session.userId);
                    res.redirect('/main');
                }
            }
            else {
                console.log("Error: " + results);  //если ошибка, возвращённая БД
            }
        }
    };
    req2.send("0=checkPassword&1=" + name + "&2=" + pass);

    /*sql = "SELECT checkPassword(?, ?)";                           
    db.query(sql, [name, pass], function(err, results) {
        console.log(err);
        if (!err) {
            if (results[0]["checkPassword('" + name + "', '" + pass + "')"]) {
                console.log("User is correct");
                req.session.userId = name;
                req.session.user = name + name;
                req.session.userPassword = pass;
                req.session.save();
                console.log(req.sessionId + '   ' + req.session.userId);
                res.redirect('/game');
            }
            else {
                console.log("Error: user is incorrect");
                console.log(results[0]);
                console.log(req.sessionID + '   ' + req.session.userId);
                res.redirect('/main');
            }
        }
        /*else {
            message = 'Wrong Credentials';
            console.log(message);
            res.redirect('/main');
        }
    });*/
});
app.post("/signup", function (req, res)  //регистрация нового пользователя
{
    var sess = req.session;
    var name = req.body.login;
    var pass = req.body.pw;
    console.log(name + '   ' + pass);

    var req2 = new XMLHttpRequest();  //создание запроса
    req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
    req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
    req2.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (isJsonString(this.responseText) == true) {
                var results = JSON.parse(this.responseText);
                if (results != undefined  &&  results.length) {
                    if (results[0][0].error) {
                        console.log("Error Signup: " + results[0][0].error);
                        console.log(req.sessionID + '   ' + req.session.userId);
                        res.redirect('/main');
                    }
                    else {
                        console.log("New user is created: " + name);
                        req.session.userId = name;
                        req.session.user = name + name;
                        req.session.userPassword = pass;
                        req.session.save();
                        console.log(req.sessionId + '   ' + req.session.userId);
                        res.redirect('/game');
                    }
                }
                else {
                    console.log(results);
                    res.redirect('/main');
                }
            }
            else {
                console.log("Error: " + results);  //если ошибка, возвращённая БД
            }
        }
    };
    req2.send("0=newuser&1=" + req.body.name + "&2=" + name + "&3=" + pass);

    /*sql = "CALL newuser(?, ?, ?)";                           
    db.query(sql, [req.body.name, name, pass], function(err, results) {
        if (results != undefined  &&  results.length) {
            if (results[0][0].error) {
                console.log("Error Signup: " + results[0][0].error);
                console.log(req.sessionID + '   ' + req.session.userId);
                res.redirect('/main');
            }
            else {
                console.log("New user is created: " + name);
                req.session.userId = name;
                req.session.user = name + name;
                req.session.userPassword = pass;
                req.session.save();
                console.log(req.sessionId + '   ' + req.session.userId);
                res.redirect('/game');
            }
        }
        else {
            console.log(results);
            res.redirect('/main');
        }
    });*/
});
app.get("/logout", function (req, res)  //выход из аккаунта
{
    console.log("Log Out");
    req.session.destroy(function(err) {
        res.redirect("/main");
    });
    console.log(req.sessionID);
});
app.get("/invitesandgames", function (req, res)
{
    console.log("Подключение к Invites and Games");
    console.log(req.sessionID + '   ' + req.session.userId);
    res.redirect('/invitesandgames.html');
});
app.get("/game.html", checkAuth(), function (req, res)  //игры
{
    console.log("Подключение к Game 2");
    console.log(req.sessionID + '   ' + req.session.userId);
});
app.get("/game", checkAuth(), function (req, res)  //игры
{
    console.log("Подключение к Game");
    console.log(req.sessionID + '   ' + req.session.userId);
    res.redirect('/game.html');
});

server.on('upgrade', function upgrade(request, socket, head) {
    if (request.url === '/game.html') {  //при подключении к странице игр с выполненным входом - открытие веб-сокет соединения
        //console.log('Parsing session from request...');
        sessionParser(request, {}, () => {
            if (!request.session.userId) {
                socket.destroy();
                return;
            }
            //console.log('Session is parsed!');

            wss.handleUpgrade(request, socket, head, function done(ws) {
                wss.emit('connection', ws, request);
            });
        });
    }
    else {
        socket.destroy();
    }
});

server.listen(port, function ()
{
   console.log("Server listening on port " + port);  //прослушивание подключения на порту 3000
});



var clients = {};  //подключенные пользователи

wss.on('connection', function connection(ws, req)  //при соединении клиента с сервером
{
    function sendGameState(id_ws, login, id_round) {
        if (clients[login] != undefined  &&  clients[login][1] != id_round)  //обновить состояние поля раунда только если он открыт у пользователя
            return;

        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                if (isJsonString(this.responseText) == true) {
                    var results = JSON.parse(this.responseText);
                    if (results != undefined) {
                        var req3 = new XMLHttpRequest();  //создание запроса
                        req3.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
                        req3.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
                        req3.onreadystatechange = function () {
                            if (this.readyState == 4 && this.status == 200) {
                                if (isJsonString(this.responseText) == true) {
                                    var roundPlayers = JSON.parse(this.responseText);
                                    var req4 = new XMLHttpRequest();  //создание запроса
                                    req4.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
                                    req4.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
                                    req4.onreadystatechange = function () {
                                        if (this.readyState == 4 && this.status == 200) {
                                            if (isJsonString(this.responseText) == true) {
                                                var roundMerellus = JSON.parse(this.responseText);
                                                var req5 = new XMLHttpRequest();  //создание запроса
                                                req5.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
                                                req5.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
                                                req5.onreadystatechange = function () {
                                                    if (this.readyState == 4 && this.status == 200) {
                                                        if (isJsonString(this.responseText) == true) {
                                                            var roundState = JSON.parse(this.responseText);
                                                            var your_id = -1;
                                                            if (roundPlayers[0].login == login)
                                                                your_id = roundPlayers[0].id_player;
                                                            else if (roundPlayers[1].login == login)
                                                                your_id = roundPlayers[1].id_player;
                                                            id_ws.send(JSON.stringify({dataType: "GameState", data: {players: roundPlayers, yourid: your_id, state: roundState, merellus: roundMerellus, cells: results} }));
                                                        }
                                                    }
                                                };
                                                req5.send("0=getroundstatus&1=" + id_round);
                                            }
                                        }
                                    };
                                    req4.send("0=getroundmerellus&1=" + id_round);
                                }
                            }
                        };
                        req3.send("0=getroundplayers&1=" + id_round);
                    }
                }
                else {
                    console.log("Error: " + results);  //если ошибка, возвращённая БД
                }
            }
        };
        req2.send("0=getround&1=" + id_round);

        /*sql = "CALL getround(?)";  //отправить состояние поля для раунда id_round
        db.query(sql, id_round, function(err, results) {
            if (results != undefined) {
                db.query("CALL getroundplayers(?)", id_round, function(err2, roundPlayers) {  //игроки раунда
                    db.query("CALL getroundmerellus(?)", id_round, function(err3, roundMerellus) {  //мельницы раунда
                        db.query("CALL getroundstatus(?)", id_round, function(err4, roundState) {  //статус раунда
                            var your_id = -1;
                            if (roundPlayers[0][0].login == login)
                                your_id = roundPlayers[0][0].id_player;
                            else if (roundPlayers[0][1].login == login)
                                your_id = roundPlayers[0][1].id_player;
                            id_ws.send(JSON.stringify({dataType: "GameState", data: {players: roundPlayers[0], yourid: your_id, state: roundState[0], merellus: roundMerellus[0], cells: results[0]} }));
                        });
                    });
                });
            }
            else {
                console.error(err);
            }
        });*/
    }

    function sendGamesList(id_ws, login) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                if (isJsonString(this.responseText) == true) {
                    var results = JSON.parse(this.responseText);
                    id_ws.send(JSON.stringify({dataType: "GamesList", data: results}));
                }
                else {
                    console.log("Error: " + this.responseText);  //если ошибка, возвращённая БД
                }
            }
        };
        req2.send("0=getactualgames&1=" + login);

        /*sql = "CALL getactualgames(?)";  //отправить список незавершённых игр клиента
        db.query(sql, login, function(err, results) {
            if (results != undefined) {
                id_ws.send(JSON.stringify({dataType: "GamesList", data: results[0]}));
            }
            else {
                console.error(err);
            }
        });*/
    }

    function sendInvitesList(id_ws, login) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                if (isJsonString(this.responseText) == true) {
                    var results = JSON.parse(this.responseText);
                    id_ws.send(JSON.stringify({dataType: "InvitesList", data: results}));
                }
                else {
                    console.log("Error: " + this.responseText);  //если ошибка, возвращённая БД
                }
            }
        };
        req2.send("0=getinviteslist&1=" + login);

        /*sql = "CALL getinviteslist(?)";  //отправить список незавершённых игр клиента
        db.query(sql, login, function(err, results) {
            if (results != undefined) {
                id_ws.send(JSON.stringify({dataType: "InvitesList", data: results[0]}));
            }
            else {
                console.error(err);
            }
        });*/
    }

    function sendUsersOnlineList(id_ws, login) {
        var usersList = [];  //отправить список пользователей, которые онлайн
        for (var key in clients) {
            if (key != login)
                usersList.push(key);
        }
        id_ws.send(JSON.stringify({dataType: "UsersOnlineList", data: usersList}));
    }

    function newInvitation(id_ws, msg) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var results = this.responseText;
                if (isJsonString(this.responseText) == true) {
                    results = JSON.parse(this.responseText);
                }
                if (results != undefined  &&  results[0].error) {  //ошибочные данные в запросе
                    console.log(results[0].error);
                    id_ws.send("Error invitation: " + results[0].error);
                }
                else {
                    if (results != undefined  &&  results[0]["game"]) {  //была создана новая игра
                        id_ws.send(JSON.stringify({dataType: "NewGame", data: results[0]}));
                        sendInvitesList(id_ws, id);
                        sendGamesList(id_ws, id);
                        if (clients[msg.logInvited])  //приглашаемый в сети, отобразить новую игру у него в списке
                            sendGamesList(clients[msg.logInvited][0], msg.logInvited);
                    }
                    else if (clients[msg.logInvited]) {  //приглашаемый в сети, отобразить приглашение у него в списке
                        sendInvitesList(clients[msg.logInvited][0], msg.logInvited);
                    }
                }
            }
        };
        req2.send("0=invite&1=" + id + "&2=" + msg.logInvited + "&3=" + req.session.userPassword + "&4=" + msg.rounds);

        /*sql = "CALL invite(?, ?, ?, ?)";  //создать новое приглашение в игру
        db.query(sql, [id, msg.log_invited, req.session.userPassword, msg.rounds], function(err, results) {
            if (results != undefined) {
                if (results[0] != undefined  &&  results[0][0].error) {  //ошибочные данные в запросе
                    console.log(results[0][0].error);
                    id_ws.send("Error invitation: " + results[0][0].error);
                }
                else {
                    if (results[0] != undefined  &&  results[0][0]["game"]) {  //была создана новая игра
                        id_ws.send(JSON.stringify({dataType: "NewGame", data: results[0][0]}));
                        sendInvitesList(id_ws, id);
                        sendGamesList(id_ws, id);
                        if (clients[msg.log_invited])  //приглашаемый в сети, отобразить новую игру у него в списке
                            sendGamesList(clients[msg.log_invited][0], msg.log_invited);
                    }
                    else if (clients[msg.log_invited]) {  //приглашаемый в сети, отобразить приглашение у него в списке
                        sendInvitesList(clients[msg.log_invited][0], msg.log_invited);
                    }
                }
            }
            else
                console.error(err);
        });*/
    }

    function deleteInvitation(id_ws, msg) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var results = this.responseText;
                if (isJsonString(this.responseText) == true) {
                    results = JSON.parse(this.responseText);
                }
                if (results != undefined  &&  results[0].error) {  //ошибочные данные в запросе
                    console.log(results[0].error);
                    id_ws.send("Error delete invitation: " + results[0].error);
                }
                else {
                    sendInvitesList(id_ws, id);  //обновить список приглашений у пользователя
                }
            }
        };
        req2.send("0=rejectinvite&1=" + id + "&2=" + msg.logInviter + "&3=" + req.session.userPassword + "&4=" + msg.rounds);
        
        /*sql = "CALL rejectinvite(?, ?, ?, ?)";  //отклонить приглашение в игру
        db.query(sql, [id, msg.log_inviter, req.session.userPassword, msg.rounds], function(err, results) {
            if (results != undefined) {
                if (results[0] != undefined  &&  results[0][0].error) {  //ошибочные данные в запросе
                    console.log(results[0][0].error);
                    id_ws.send("Error delete invitation: " + results[0][0].error);
                }
                else {
                    sendInvitesList(id_ws, id);  //обновить список приглашений у пользователя
                }
            }
            else
                console.error(err);
        });*/
    }

    function removeChecker(id_ws, msg) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var results = this.responseText;
                if (isJsonString(this.responseText) == true) {
                    results = JSON.parse(this.responseText);
                }
                if (results != undefined) {
                    if (results != undefined  &&  results[0].error) {  //ошибочный ход
                        id_ws.send(JSON.stringify({dataType: "ErrorMove", data: results[0].error}));
                    }
                    else {
                        sendGameState(id_ws, id, results[0].id_round);
                        if (clients[results[0].player2])  //второй игрок в сети, также отобразить ему состояние игры
                            sendGameState(clients[ results[0].player2 ][0], results[0].player2, results[0].id_round);
                        
                        if (results != undefined  &&  results[0].advice) {
                            id_ws.send(JSON.stringify({dataType: "AdviceMove", data: results[0].advice}));
                            if (clients[results[0].player2]  &&  clients[ results[0].player2 ][1] == results[0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                clients[results[0].player2][0].send(JSON.stringify({dataType: "AdviceMove", data: results[0].advice}));
                        }
                        else if (results != undefined  &&  results[0].winner) {
                            var req3 = new XMLHttpRequest();  //создание запроса
                            req3.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
                            req3.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
                            req3.onreadystatechange = function () {
                                if (this.readyState == 4 && this.status == 200) {
                                    var winsCount = this.responseText;
                                    if (isJsonString(this.responseText) == true) {
                                        winsCount = JSON.parse(this.responseText);
                                    }
                                    if (winsCount != undefined) {
                                        id_ws.send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0], winscount: winsCount} }));
                                        if (clients[results[0].player2]  &&  clients[ results[0].player2 ][1] == results[0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                            clients[results[0].player2][0].send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0], winscount: winsCount} }));
                                    }
                                }
                            };
                            req3.send("0=getwinscount&1=" + results[0].id_game);
                            sendGamesList(id_ws, results[0].winner);
                            if (clients[results[0].player2])  //приглашаемый в сети, отобразить у него обновлённый список игр
                                sendGamesList(clients[results[0].player2][0], results[0].player2);
                        }
                    }
                }
            }
        };
        req2.send("0=removechecker&1=" + msg.chosenCell + "&2=" + msg.player + "&3=" + req.session.userPassword);

        /*sql = "CALL removechecker(?, ?, ?)";  //убрать фишку соперника с поля
        db.query(sql, [msg.chosenCell, msg.player, req.session.userPassword], function(err, results) {
            if (results != undefined) {
                if (results[0] != undefined  &&  results[0][0].error) {  //ошибочный ход
                    id_ws.send(JSON.stringify({dataType: "ErrorMove", data: results[0][0].error}));
                }
                else {
                    sendGameState(id_ws, id, results[0][0].id_round);
                    if (clients[results[0][0].player2])  //второй игрок в сети, также отобразить ему состояние игры
                        sendGameState(clients[ results[0][0].player2 ][0], results[0][0].player2, results[0][0].id_round);
                    
                    if (results[0] != undefined  &&  results[0][0].advice) {
                        id_ws.send(JSON.stringify({dataType: "AdviceMove", data: results[0][0].advice}));
                        if (clients[results[0][0].player2]  &&  clients[ results[0][0].player2 ][1] == results[0][0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                            clients[results[0][0].player2][0].send(JSON.stringify({dataType: "AdviceMove", data: results[0][0].advice}));
                    }
                    else if (results[0] != undefined  &&  results[0][0].winner) {
                        db.query("CALL getwinscount(?)", results[0][0].id_game, function(err2, winsCount) {
                            if (winsCount != undefined) {
                                id_ws.send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0][0], winscount: winsCount[0]} }));
                                if (clients[results[0][0].player2]  &&  clients[ results[0][0].player2 ][1] == results[0][0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                    clients[results[0][0].player2][0].send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0][0], winscount: winsCount[0]} }));
                            }
                        });
                        sendGamesList(id_ws, results[0][0].winner);
                        if (clients[results[0][0].player2])  //приглашаемый в сети, отобразить у него обновлённый список игр
                            sendGamesList(clients[results[0][0].player2][0], results[0][0].player2);
                    }
                }
            }
            else {
                console.error(err);
            }
        });*/
    }

    function moveChecker(id_ws, msg) {
        var req2 = new XMLHttpRequest();  //создание запроса
        req2.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
        req2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
        req2.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var results = this.responseText;
                if (isJsonString(this.responseText) == true) {
                    results = JSON.parse(this.responseText);
                }
                if (results != undefined) {
                    if (results != undefined  &&  results[0].error) {  //ошибочный ход
                        id_ws.send(JSON.stringify({dataType: "ErrorMove", data: results[0].error}));
                    }
                    else {
                        sendGameState(id_ws, id, results[0].id_round);
                        if (clients[results[0].player2])  //второй игрок в сети, также отобразить ему состояние игры
                            sendGameState(clients[ results[0].player2 ][0], results[0].player2, results[0].id_round);
                        
                        if (results != undefined  &&  results[0].advice) {
                            id_ws.send(JSON.stringify({dataType: "AdviceMove", data: results[0].advice}));
                            if (clients[results[0].player2]  &&  clients[ results[0].player2 ][1] == results[0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                clients[results[0].player2][0].send(JSON.stringify({dataType: "AdviceMove", data: results[0].advice}));
                        }
                        else if (results != undefined  &&  results[0].winner) {
                            var req3 = new XMLHttpRequest();  //создание запроса
                            req3.open("POST", "http://lavro.ru/225364/sendsql.php", true);  //true - асинхронный запрос
                            req3.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');  //тип отправляемых данных
                            req3.onreadystatechange = function () {
                                if (this.readyState == 4 && this.status == 200) {
                                    var winsCount = this.responseText;
                                    if (isJsonString(this.responseText) == true) {
                                        winsCount = JSON.parse(this.responseText);
                                    }
                                    if (winsCount != undefined) {
                                        id_ws.send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0], winscount: winsCount} }));
                                        if (clients[results[0].player2]  &&  clients[ results[0].player2 ][1] == results[0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                            clients[results[0].player2][0].send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0], winscount: winsCount} }));
                                    }
                                }
                            };
                            req3.send("0=getwinscount&1=" + results[0].id_game);
                            sendGamesList(id_ws, results[0].winner);
                            if (clients[results[0].player2])  //приглашаемый в сети, отобразить у него обновлённый список игр
                                sendGamesList(clients[results[0].player2][0], results[0].player2);
                        }
                    }
                }
            }
        };
        req2.send("0=makemove&1=" + msg.prevCell + "&2=" + msg.newCell + "&3=" + msg.player + "&4=" + req.session.userPassword);

        /*sql = "CALL makemove(?, ?, ?, ?)";  //выставить или передвинуть фишку игрока на поле
        db.query(sql, [msg.prevCell, msg.newCell, msg.player, req.session.userPassword], function(err, results) {
            if (results != undefined) {
                if (results[0] != undefined  &&  results[0][0].error) {  //ошибочный ход
                    id_ws.send(JSON.stringify({dataType: "ErrorMove", data: results[0][0].error}));
                }
                else {
                    sendGameState(id_ws, id, results[0][0].id_round);
                    if (clients[results[0][0].player2])  //второй игрок в сети, также отобразить ему состояние игры
                        sendGameState(clients[ results[0][0].player2 ][0], results[0][0].player2, results[0][0].id_round);
                    
                    if (results[0] != undefined  &&  results[0][0].advice) {
                        id_ws.send(JSON.stringify({dataType: "AdviceMove", data: results[0][0].advice}));
                        if (clients[results[0][0].player2]  &&  clients[ results[0][0].player2 ][1] == results[0][0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                            clients[results[0][0].player2][0].send(JSON.stringify({dataType: "AdviceMove", data: results[0][0].advice}));
                    }
                    else if (results[0] != undefined  &&  results[0][0].winner) {
                        db.query("CALL getwinscount(?)", results[0][0].id_game, function(err2, winsCount) {
                            if (winsCount != undefined) {
                                id_ws.send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0][0], winscount: winsCount[0]} }));
                                if (clients[results[0][0].player2]  &&  clients[ results[0][0].player2 ][1] == results[0][0].id_round)  //второй игрок в сети и у него открыт этот раунд - отобразить ему состояние игры
                                    clients[results[0][0].player2][0].send(JSON.stringify({dataType: "WinnerMove", data: {winstatus: results[0][0], winscount: winsCount[0]} }));
                            }
                        });
                        sendGamesList(id_ws, results[0][0].winner);
                        if (clients[results[0][0].player2])  //приглашаемый в сети, отобразить у него обновлённый список игр
                            sendGamesList(clients[results[0][0].player2][0], results[0][0].player2);
                    }
                }
            }
            else {
                console.error(err);
            }
        });*/
    }

    var id = req.session.userId;  //id подключенного пользователя
    if (clients[id] != undefined) {  //если пользователь открывает страницу игры ещё раз, уже имея открытое соединение
        clients[id][2]++;  //номер заново установленного соединения
        clients[id][0].send(JSON.stringify({dataType: "RepeatingConnection", data: "Эта же страница была открыта в новой вкладке."}));  //отправка сообщения с сервера при подключении
    }
    else {
        clients[id] = [];
        clients[id][2] = 1;  //порядковый номер установленного соединения пользователя
    }
    clients[id][0] = ws;  //id сокета
    clients[id][1] = 9;  //id раунда, открытого у пользователя
    
    console.log("New connection: " + id + "   , number " + clients[id][2]);
    ws.send('Loading Data from server');  //отправка сообщения с сервера при подключении
    ws.send(JSON.stringify({dataType: "HelloUser", data: id}));  //отправка сообщения с сервера при подключении

    sendGameState(ws, id, 9);  //отправить состояние поля игры
    sendGamesList(ws, id);  //отправить список актуальных игр
    sendInvitesList(ws, id);  //отправить список приглашений
    sendUsersOnlineList(ws, id);  //отправить список онлайн пользователей
    for (var key in clients) {
        sendUsersOnlineList(clients[key][0], key);
    }



    ws.on('message', function incoming(event)  //при получении сообщения от клиента
    {
        console.log('Message was received: %s', event);
        if (isJsonString(event) == true)  //получены данные в виде JSON строки для удаления или записи и синхронизации
        {
            var message = JSON.parse(event);  //входящие данные
            var msg = message.data;
            if (message.dataType == "OpenRound"  &&  clients[id] != undefined)  //запрос на получение состояния раунда игры
            {
                clients[id][1] = msg;  //открытая на данный момент игра у пользователя
                sendGameState(ws, id, msg);
            }
            else if (message.dataType == "InviteData")  //запрос на создание приглашения
            {
                newInvitation(ws, msg);
            }
            else if (message.dataType == "RejectInviteData")  //запрос на удаление приглашения
            {
                deleteInvitation(ws, msg);
            }
            else if(message.dataType == "RemoveChecker")  //запрос на удаление фишки соперника с поля
            {
                console.log(msg);
                removeChecker(ws, msg);
            }
            else if(message.dataType == "MoveChecker")  //запрос на ход своей фишки
            {
                console.log(msg);
                moveChecker(ws, msg);
            }
        }
    });

    ws.on('close', function()  //при закрытии клиента
    {
        if (clients[id][2] != 1) {  //по причине открытия нового повторяющегося окна клиентом
            console.log('Connection is closed by server, because of the same new one: ' + id + "   , number " + clients[id][2]);
            clients[id][2]--;
        }
        else {  //по причине закрытия соединения клиентом
            clients[id].length = 0;
			delete clients[id];
			for (var key in clients) {  //обновление списка онлайн пользователей
				sendUsersOnlineList(clients[key][0], key);
			}
            console.log('Connection is closed by client: ' + id);
        }
    });
});

function isJsonString(str) {  //проверка, возможно ли распарсить строку из JSON формата строки
    try {
        JSON.parse(str);
    }
    catch (e) {
        return false;
    }
    return true;
}