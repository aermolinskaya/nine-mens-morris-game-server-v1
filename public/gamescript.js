const cells = document.querySelectorAll('.field-cells .cell');  //клетки поля
const hintMessage = document.querySelector('.hint p');  //окно вывода подсказки хода
const errorMessage = document.querySelector('.error-message p');  //окно вывода сообщения об ошибке хода
const gamesList = document.getElementById('games-list');  //список актуальных игр
const invitesList = document.getElementById('invites-list');  //список приглашений
const usersOnlineList = document.getElementById('users-online-list');  //список онлайн пользователей
const inviteForm = document.forms['invite-form'];  //форма приглашения пользователя в игру
let yourCells;  //собственные клетки
let notYourCells;  //клетки соперника
const emptyCells = document.getElementsByClassName("cell-empty");  //пустые клетки
let numberPlayer = -1;  //сторона игрока, 1 - левая, 2 - правая, -1 - игрок не принимает участие в раунде
let yourIdPlayer = -1;  //id игрока открытого раунда, -1 - отсутствие id в базе, а значит игрок не принимает участие в раунде

document.getElementsByClassName('button-logout')[0].addEventListener("click", function() {document.location='/logout'});  //событие кнопки Выход
inviteForm['button-invite'].addEventListener("click", function() {event.preventDefault(); if (socket.readyState == 1) sendInvite(this);});  //событие кнопки отправления приглашения в форме



function sendInvite(e) {  //отправить приглашение пользователю
    const msg = {
        logInvited: inviteForm['log-invited'].value,  //логин приглашаемого
        rounds: inviteForm.rounds.value,  //количество раундов
    };
    console.log('Invite ' + msg.logInvited + ",   rounds: " + msg.rounds);
    socket.send(JSON.stringify({dataType: "InviteData", data: msg}));
}

function assignInvite(e) {  //принять приглашение пользователя
    const msg = {
        logInvited: e.dataset.login,  //логин приглашающего
        rounds: e.dataset.rounds,  //количество раундов
    };
    console.log('Invite ' + msg.logInvited + ",   rounds: " + msg.rounds);
    socket.send(JSON.stringify({dataType: "InviteData", data: msg}));
}

function rejectInvite(e) {  //отклонить приглашение пользователя
    const msg = {
        logInviter: e.dataset.login,  //логин приглашающего
        rounds: e.dataset.rounds,  //количество раундов
    };
    console.log('Reject Invite from ' + msg.logInviter + ",   rounds: " + msg.rounds);
    socket.send(JSON.stringify({dataType: "RejectInviteData", data: msg}));
}

function isJsonString(str) {  //проверка, возможно ли распарсить строку из JSON формата строки
    try {
        JSON.parse(str);
    }
    catch (e) {
        return false;
    }
    return true;
}



var socket = new WebSocket("ws://localhost:3000/game.html");  //создать подключение
//var socket = new WebSocket("ws://95fb8790.ngrok.io/game.html");  //создать подключение
//var socket = new WebSocket("ws://ninemensmorrisgame.pagekite.me/game.html");  //создать подключение

socket.onopen = function()  //при открытии соединения
{
    console.log('Connected');
};

socket.onmessage = function(event)  //обработчик входящих сообщений
{
    console.log("Message was received");
    console.log(event.data);
    if (isJsonString(event.data) == true)  //полученные данные - строка JSON
    {
        const message = JSON.parse(event.data);  //входящие данные
        const data = message.data;
        if (message.dataType == "GameState") {  //получены данные о поле выбранной игры
            yourIdPlayer = data.yourid;  //id игрока открытого раунда
            document.getElementsByClassName("user-info")[0].setAttribute("class", "user-info player-1");  //заполнение информации об игроках
            document.getElementsByClassName("user-info")[1].setAttribute("class", "user-info player-2");
			document.getElementsByClassName("player-name")[0].textContent = data.players[0].name;
			document.getElementsByClassName("player-login")[0].textContent = data.players[0].login;
			document.getElementsByClassName("player-name")[1].textContent = data.players[1].name;
			document.getElementsByClassName("player-login")[1].textContent = data.players[1].login;
			addFreeCheckers(document.getElementsByClassName("player-free-checkers")[0], data.players[0].free_checkers, 1);
            addFreeCheckers(document.getElementsByClassName("player-free-checkers")[1], data.players[1].free_checkers, 2);
            
            if (data.players[0].id_player == data.state[0].current_player)  //определение ходящего игрока
                document.getElementsByClassName("user-info")[0].classList.add("current-player");
            else
                document.getElementsByClassName("user-info")[1].classList.add("current-player");
            
            if (data.players[0].id_player == yourIdPlayer)  //номер игрока (сторона) в раунде, если тот участвует в нём
                numberPlayer = 1;
            else if (data.players[1].id_player == yourIdPlayer)
                numberPlayer = 2;
            
            
            errorMessage.parentNode.classList.add("message-empty");  //спрятать сообщение об ошибке
            showGameState(data.cells, data.players, data.merellus);  //отобразить состояние поля

            if (numberPlayer != -1) {
                yourCells = document.getElementsByClassName("cell-player-" + numberPlayer);  //собственные клетки
                if (numberPlayer == 1)
                    notYourCells = document.getElementsByClassName("cell-player-" + 2);  //клетки соперника
                else
                    notYourCells = document.getElementsByClassName("cell-player-" + 1);
			}
            removeEventsYourCells();  //очистка всех событий клика мыши по клеткам поля
            removeEventsNotYourCells();
            removeEventsEmptyCells();
            

            if (data.state[0].status == 0) {  //игра окончена
                console.log("Game is over");
                if (yourIdPlayer != data.state[0].current_player)  //определение победителя
                    hintMessage.textContent = "Игра окончена. Вы победили";
                else
                    hintMessage.textContent = "Игра окончена. Соперник победил";
                return;
            }
            else if (yourIdPlayer != data.state[0].current_player) {  //игра продолжается, но ход другого игрока
                console.log(yourIdPlayer + "   " + data.state[0].current_player)
                hintMessage.textContent = "Ожидание хода соперника";
                return;
            }

            //игра продолжается, ход этого игрока
            if (data.state[0].isNewMerellus == 1) {  //нужно убрать мельницу соперника - активны для выбора только фишки соперника
                console.log("New Merellus");
                addEventsNotYourCells();
                hintMessage.textContent = "Вы построили мельницу и сейчас убираете любую фишку второго игрока";
            }
            else {  //игрок делает ход своей фишкой
                if (data.state[0].status == 1) {  //1-ый этап игры, фишки выставляются на поле - активны для выбора только пустые клетки
                    console.log("Add cell");
                    addEventsEmptyCells();
                    hintMessage.textContent = "Вы выставляете свою фишку на любую клетку поля";
                }
                else {  //2-ой или 3-й этап игры, фишки передвигаются на поле - активны для выбора только собственные фишки
                    console.log("Choose cell to move");
                    addEventsYourCells();
                    hintMessage.textContent = "Вы передвигаете свою фишку на один ход вдоль линии";
                }
            }
        }
        else if (message.dataType == "GamesList") {  //отобразить список актуальных игр
            while (gamesList.children.length != 0) {  //очистить предыдущий список игр
                gamesList.children[0].remove();
            }
            for (let i = 0; i < data.length; i++) {  //создать новые записи списка игр
                addGameElem(data[i]);
            }
        }
        else if (message.dataType == "InvitesList") {  //отобразить список актуальных приглашений
            while (invitesList.children.length != 0) {  //очистить предыдущий список приглашений
                invitesList.children[0].remove();
            }
            for (let i = 0; i < data.length; i++) {  //создать новые записи списка приглашений
                addInviteElem(data[i]);
            }
        }
        else if(message.dataType == "UsersOnlineList") {  //отобразить список пользователей онлайн
            while (usersOnlineList.children.length != 0) {  //очистить предыдущий список онлайн пользователей
                usersOnlineList.children[0].remove();
            }
            for (let i = 0; i < data.length; i++) {  //создать новые записи списка онлайн пользователей
                addUsersOnlineElem(data[i]);
            }
        }
        else if (message.dataType == "ErrorMove") {  //ошибочный игровой ход или попытка приглашения в игру
			errorMessage.textContent = data;
			errorMessage.parentNode.classList.remove("message-empty");  //показать сообщение с ошибкой
        }
        else if (message.dataType == "WinnerMove") {  //вывести сообщение о победителе при победном ходе одного из игроков
            addWinnerElem(data);
        }
        else if (message.dataType == "RepeatingConnection") {  //закрыть это сокет соединение пользователя, так как он открыл новое с новой вкладкой
            socket.close();
            addConnectionCloseElem('Disconnected. Код: 1000, причина: ' + data);
        }
        else if (message.dataType == "Error") {  //ошибка базы данных
            console.log("Error");
            console.error(data);
        }
        else if (message.dataType == "HelloUser") {  //получение логина и имени игрока при подключении
            document.querySelector(".user-profile > p > span").textContent = data;
        }
        else {
            console.log("dataType is not defined");
        }
    }
};

function showGameState(fieldElems, players, merellus) {  //отображение состояния поля
    let j = 0;
    for (let i = 0; i < cells.length; i++) {  //проход по клеткам поля и обновление их состояния в соответствии с fieldElems полученными данными
        if (j >= fieldElems.length  ||  fieldElems[j].id_cell != i+1) {  //пустая клетка
            cells[i].setAttribute("class", "cell cell-empty");
            //cells[i].setAttribute("disabled", "disabled");
        }
        else if (fieldElems[j].id_player == players[0].id_player) {  //клетка с фишкой 1-ого игрока
            cells[i].setAttribute("class", "cell cell-player-1");
            //cells[i].removeAttribute("disabled");
            j++;
        }
        else if (fieldElems[j].id_player == players[1].id_player) {  //клетка с фишкой 2-ого игрока
            cells[i].setAttribute("class", "cell cell-player-2");
            //cells[i].removeAttribute("disabled");
            j++;
        }
    }

    let merellusElem;
    j = 0;
    for (let i = 1; i < 17; i++) {  //проход по линиям мельниц поля и обновление их состояния в соответствии с fieldElems полученными данными
        merellusElem = document.getElementsByClassName("line-" + i)[0];  //проверка каждой мельницы по порядковому номеру линии
        if (j >= merellus.length  ||  merellus[j].id_line != i) {  //пустая линия без мельницы
            merellusElem.setAttribute("class", "merellus line-" + i);
        }
        else if (merellus[j].id_player == players[0].id_player) {  //мельница 1-ого игрока
            merellusElem.setAttribute("class", "merellus line-" + i + " line-player-1");
            j++;
        }
        else if (merellus[j].id_player == players[1].id_player) {  //мельница 2-ого игрока
            merellusElem.setAttribute("class", "merellus line-" + i + " line-player-2");
            j++;
        }
    }
}

function addFreeCheckers(freeCheckersField, count, player_number) {  //отображение количества невыставленных фишек игрока
	while (freeCheckersField.children.length != 0) {  //очистка старого поля вывода
		freeCheckersField.children[0].remove();
	}
	for (let i = 0; i < count; i++) {  //заполнение поля вывода фишками по новым данным
		const freeCheckerElem = document.createElement('div');
		freeCheckerElem.setAttribute('class', 'cell cell-player-' + player_number);
		freeCheckersField.appendChild(freeCheckerElem);
	}
}

function addEventsYourCells() {  //добавление события нажатия для собственных фишек игрока
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        for (let i = 0; i < yourCells.length; i++) {  //при клике отправка данных на сервер
            yourCells[i].addEventListener("click", chooseCell);
            yourCells[i].removeAttribute("disabled");
        }
    }
}

function addEventsNotYourCells() {  //добавление события нажатия на фишки соперника
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        for (let i = 0; i < notYourCells.length; i++) {  //при клике отправка данных на сервер
            notYourCells[i].addEventListener("click", sendToRemoveCell);
            notYourCells[i].removeAttribute("disabled");
        }
    }
}

function addEventsEmptyCells() {  //добавление события нажатия на пустые клетки
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        for (let i = 0; i < emptyCells.length; i++) {  //при клике отправка данных на сервер
            emptyCells[i].addEventListener("click", sendToMoveCell);
            emptyCells[i].removeAttribute("disabled");
        }
    }
}

function removeEventsYourCells() {  //удаление события нажатия для собственных фишек игрока
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        console.log("Remove Your Cells");
        for (let i = 0; i < yourCells.length; i++) {  //при клике отправка данных на сервер
            yourCells[i].removeEventListener("click", chooseCell);
            yourCells[i].setAttribute("disabled", "disabled");
        }
    }
}

function removeEventsNotYourCells() {  //удаление события нажатия на фишки соперника
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        console.log("Remove Other Cells");
        for (let i = 0; i < notYourCells.length; i++) {  //при клике отправка данных на сервер
            notYourCells[i].removeEventListener("click", sendToRemoveCell);
            notYourCells[i].setAttribute("disabled", "disabled");
        }
    }
}

function removeEventsEmptyCells() {  //удаление события нажатия на пустые клетки
    if (numberPlayer != -1) {  //если пользователь является игроком этого раунда
        console.log("Remove Empty Cells");
        for (let i = 0; i < emptyCells.length; i++) {  //при клике отправка данных на сервер
            emptyCells[i].removeEventListener("click", sendToMoveCell);
            emptyCells[i].setAttribute("disabled", "disabled");
        }
    }
}

function chooseCell() {  //выбрать собственную передвигаемую фишку
    this.classList.add("selected");  //так как последующий disabled снимает фокус с кнопки, применение стиля через класс
    console.log("Choose Cell");
    removeEventsYourCells();  //удаление события клика на собственных клетках
    addEventsEmptyCells();  //добавление события выбора пустой клетки, куда будет переставлена выбранная фишка
}

function sendToRemoveCell() {  //убрать фишку соперника
    if (socket.readyState == 1) {
        console.log("Remove cell: " + this.classList);
        socket.send(JSON.stringify({dataType: "RemoveChecker", data: {chosenCell: this.dataset.cellId, player: yourIdPlayer} }));
    }
}

function sendToMoveCell() {  //выставить или передвинуть свою фишку
    if (socket.readyState == 1) {
        console.log("Move cell: " + this.classList);
        let prev_cell = null;  //null - фишка не имеет предыдущей клетки, она выставляется на поле
        if (document.getElementsByClassName("selected")[0])  //фишка передвигается
            prev_cell = document.getElementsByClassName("selected")[0].dataset.cellId;
        socket.send(JSON.stringify({dataType: "MoveChecker", data: {prevCell: prev_cell, newCell: this.dataset.cellId, player: yourIdPlayer} }));
    }
}

function addGameElem(message) {  //добавление новой актуальной игры в список игр
    const gameElem = document.createElement('input');  //кнопка radio-button для выбора игры
    let dt = new Date(message.start);  //дата начала игры
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };
	dt = dt.toLocaleString("ru", options);
    
    gameElem.setAttribute('type', 'radio');
    gameElem.setAttribute('name', 'game-elems-list');
    gameElem.setAttribute('value', message.id_round);
    gameElem.setAttribute('id', 'game-elem-' + message.id_round);
    gameElem.setAttribute('class', 'game-elem');
    gameElem.setAttribute('data-start', message.start);
    gameElem.setAttribute('data-login', message.login);
    gameElem.setAttribute('data-name', message.name);
    gameElem.setAttribute('data-actual-round', message.actual_round);
    gameElem.setAttribute('data-rounds', message.rounds_number);
    gamesList.appendChild(gameElem);

    const gameElemLabel = document.createElement('label');
    gameElemLabel.setAttribute('for', 'game-elem-' + message.id_round);
    gameElemLabel.setAttribute('class', 'game-elem-info');
    
    const gameElemLabelElem = document.createElement('p');
    gameElemLabelElem.textContent = message.name + " (" + message.login + "), раунд " + message.actual_round + " из " + message.rounds_number;  //остальная информация об игре
    
    const gameElemDate = document.createElement('span');
    gameElemDate.textContent = dt + ". ";
    gameElemLabelElem.prepend(gameElemDate);  //добавление даты игры перед остальной информацией
    gamesList.appendChild(gameElemLabel);
    gameElemLabel.appendChild(gameElemLabelElem);



    gameElem.addEventListener("click", function() {  //событие клика на блоке игры открывает её
        if (socket.readyState == 1) {
            openRound(message.id_round);  //отобразить состояние раунда
        }
    });
}

function addInviteElem(message) {  //добавление нового приглашения в список приглашений
    const inviteElem = document.createElement('div');
    let dt = new Date(message.dt);  //дата создания приглашения
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };
	dt = dt.toLocaleString("ru", options);
	const inviteElemDate = document.createElement('span');
	inviteElemDate.textContent = dt + ". ";
    inviteElem.textContent = message.name + ' (' + message.login + ') приглашает на ' + message.rounds_number;  //остальная информация о приглашении
    if (message.rounds_number == 1)
        inviteElem.textContent += ' раунд';
    else if (message.rounds_number == 3)
        inviteElem.textContent += ' раунда';
    else
		inviteElem.textContent += ' раундов';
	inviteElem.prepend(inviteElemDate);  //добавление даты приглашения перед остальной информацией 
    inviteElem.setAttribute('data-login', message.login);
    inviteElem.setAttribute('data-name', message.name);
    inviteElem.setAttribute('data-rounds', message.rounds_number);
    inviteElem.setAttribute('class', 'invite-elem');

    const rejectElemBtn = document.createElement('button');  //кнопка отклонения приглашения
    rejectElemBtn.setAttribute('type', 'submit');
    rejectElemBtn.setAttribute('class', 'button-reject');
    rejectElemBtn.textContent = 'Отклонить';
    inviteElem.prepend(rejectElemBtn);
    rejectElemBtn.addEventListener("click", function() {if (socket.readyState == 1) rejectInvite(this.parentElement);});
    invitesList.appendChild(inviteElem);
    
    const inviteElemBtn = document.createElement('button');  //кнопка принятия приглашения
    inviteElemBtn.setAttribute('type', 'submit');
    inviteElemBtn.setAttribute('class', 'button-assign');
	inviteElemBtn.textContent = 'Принять';
    inviteElem.prepend(inviteElemBtn);
    inviteElemBtn.addEventListener("click", function() {if (socket.readyState == 1) assignInvite(this.parentElement);});
    invitesList.appendChild(inviteElem);
}

function addWinnerElem(message) {  //добавление уведомления с выводом победителя
    const winnerElem = document.createElement('div');
    winnerElem.textContent = message.winstatus.winner_name + " (" + message.winstatus.winner + ") побеждает в раунде №" + message.winstatus.actual_round + " из " + message.winstatus.rounds_number + ". ";
    if (message.winstatus.actual_round == message.winstatus.rounds_number)
        winnerElem.textContent += "Со счётом " + message.winscount[0].wins_count + ":" + message.winscount[1].wins_count + " серия раундов завершается в пользу игрока " + message.winscount[0].name + " (" + message.winscount[0].login + ")";
    winnerElem.setAttribute('class', 'winner-elem');
    document.body.appendChild(winnerElem);

    const closeElemBtn = document.createElement('button');  //кнопка закрытия уведомления
    closeElemBtn.setAttribute('type', 'submit');
    closeElemBtn.setAttribute('class', 'button-close');
    closeElemBtn.textContent = 'Закрыть';
    winnerElem.appendChild(closeElemBtn);
    closeElemBtn.addEventListener("click", function() {winnerElem.remove();});
}

function addConnectionCloseElem(message) {  //добавление уведомления об обрывое соединения с сервером по причине открытия новой вкладки с игрой
    const connectionCloseElem = document.createElement('div');
    connectionCloseElem.textContent = message;
    connectionCloseElem.setAttribute('class', 'connection-close-elem');
    document.body.appendChild(connectionCloseElem);

    const closeElemBtn = document.createElement('button');  //кнопка закрытия уведомления
    closeElemBtn.setAttribute('type', 'submit');
    closeElemBtn.setAttribute('class', 'button-close');
    closeElemBtn.textContent = 'Закрыть';
    connectionCloseElem.appendChild(closeElemBtn);
    closeElemBtn.addEventListener("click", function() {connectionCloseElem.remove();});
}

function addUsersOnlineElem(message) {  //добавление нового в онлайне пользователя в список
    const usersElem = document.createElement('div');
    usersElem.textContent = message;
    usersElem.setAttribute('class', 'users-elem');
    usersOnlineList.appendChild(usersElem);
}

function openRound(id_round) {  //запросить показ состояния поля игры для раунда у сервера
    socket.send(JSON.stringify({dataType: "OpenRound", data: id_round}));
}



socket.onerror = function(error)  //при ошибке
{
	if (error.message === undefined)
		error.message = "";
    console.error("Error: " + error + " " + error.message);
};

socket.onclose = function(event)  //при закрытии соединения
{
    let closeStatus = "";
    let closeReason = event.reason;

    if (event.wasClean === true)
        closeStatus = "Соединение закрыто чисто";
    else
        closeStatus = "Обрыв соединения";
    
    if (isJsonString(closeReason) === true)  //полученные данные - строка JSON
        closeReason = JSON.parse(event.data);
    closeStatus += closeReason;
    if (event.reason)
        closeStatus += event.reason;
    console.log('Disconnected. Код: ' + event.code + ', причина: ' + closeStatus);  //сервер был закрыт
};