

class StateGame extends IState {
    onInit() {
        this.socket = io.connect(Constants.SERVER, { secure: true });

        this.initWorld();
        this.initUis();
        this.time_sent_ping = null; // time last ping was sent
        this.ping_ms = null; // current ping
        this.ups = null // server update per second
        this.last_server_update = null;
        this.average_ping_ms = 1;
        this.self = null;
        this.pos = null;
        this.minimap = this.addUi(new UiMinimap(this));
        //this.chat = this.addUi(new UiChat(this));
        this.perfinfo = this.addUi(new UiPerfInfo(this));
        this.aim = this.addUi(new UiAim(this));

        this.socket.on(Events.CONNECT, this.eventConnect.bind(this));
        this.socket.on(Events.DISCONNECT, this.eventDisconnect.bind(this));
        this.socket.on(Events.SERVER_NEW_ENTITY, this.eventNewEntity.bind(this));
        this.socket.on(Events.SERVER_UPDATE_ENTITIES, this.eventUpdateEntities.bind(this));
        this.socket.on(Events.SERVER_DELETE_ENTITY, this.eventDeleteEntity.bind(this));
        this.socket.on(Events.SERVER_KILL_ENTITY, this.eventKillEntity.bind(this));
        this.socket.on(Events.SERVER_RESET_MAP, this.eventResetMap.bind(this));
        this.socket.on(Events.SERVER_CALL_FUNCTION, this.eventServerCallFunction.bind(this));
        this.socket.on(Events.SERVER_PONG, this.eventServerPong.bind(this));
    }

    eventServerPong() {
        if (!this.time_sent_ping) {
            console.log("eventServerPong: time_sent_ping not set?")
            return;
        }
        this.ping_ms = Math.max(Date.now() - this.time_sent_ping, 1);
        this.average_ping_ms = (this.ping_ms + this.average_ping_ms) / 2;
    }

    eventConnect() {
        this.sendEventPlayerAuth();
        this.initWorld();
        this.id = this.socket.io.engine.id;
        console.log("connected as " + this.id);
    }

    eventDisconnect() {
        console.log("Disconnected");
        if (this.self) {
            this.eventDeleteEntity(this.self.id);
        }
        this.self = null;
    }

    eventNewEntity(entity_info) {
        createEntity(entity_info, this);
    }

    eventDeleteEntity(id) {
        if (id in this.entities) {
            this.entities[id].delete();
        }
    }

    eventKillEntity(id) {
        if (id in this.entities) {
            this.entities[id].killed = true;
            this.entities[id].kill();
        }
    }

    eventServerCallFunction(entity_id, func_name, ...args) {
        if (!(entity_id in this.entities)) {
            console.error("eventServerCallFunction: entity " + entity_id + " not found");
            return;
        }
        var entity = this.entities[entity_id];
        entity[func_name](...args);
    }

    eventUpdateEntities(entities_info) {
        var now = Date.now();
        if (this.last_server_update) {
            var dt = now - this.last_server_update;
            dt = Math.max(dt, 1); // we dont want to see 'infinite' UPS
            this.ups = 1 / (dt / 1000);
        }
        this.last_server_update = now;
        //async >> await sleep(1000);
        for (var x in entities_info) {
            var server_entity = entities_info[x];
            if (!(server_entity.id in this.entities)) {
                //createEntity(server_entity, this);
                console.log("WARNING: Got update on a non-existing entity!");
                console.log(">> entity_id: " + server_entity.id);
            } else {
                this.entities[server_entity.id].onServerUpdate(server_entity);
            }
        }
    }

    eventResetMap() {
        this.initWorld();
    }

    sendEventPlayerPing() {
        this.time_sent_ping = Date.now();
        this.socket.emit(Events.PLAYER_PING);
    }

    sendEventPlayerAuth() {
        // get the token from the url
        var url_params = {}
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            url_params[key] = value;
        });
        // send it to the server
        this.socket.emit(Events.PLAYER_AUTH, url_params['x-access-token']);
        // save user's token
        this.user_token = url_params['x-access-token'];
    }

    initWorld() {
        this.pos = new Position(0, 0);
        this.entities = {};
    }

    initUis() {
        this.uis = {};
    }

    addUi(ui) {
        this.uis[ui.constructor.name] = ui;
        return ui;
    }

    updateUis(time_elapsed) {
        this.runOnUis(function (ui) {
            ui.onUpdate(time_elapsed);
        });
    }

    runOnUis(func) {
        var uis = this.uis;
        for (var key in uis) {
            if (uis.hasOwnProperty(key)) {
                var ui = uis[key];
                if (func(ui)) {
                    // if func is return true, dont call other Uis
                    return;
                }
            }
        }
    }

    runOnEntities(func) {
        var entities = this.entities;
        for (var key in entities) {
            if (entities.hasOwnProperty(key)) {
                var entity = entities[key];
                func(entity);
            }
        }
    }

    onUpdate(time_elapsed) {
        if (Helper.onInterval(this, "ping", 1)) {
            this.sendEventPlayerPing();
        }

        if (this.id in this.entities) {
            this.self = this.entities[this.id];
            this.pos.x = this.self.pos.x; // this.self.pos will be changed during the execution of the code below
            this.pos.y = this.self.pos.y; // this is why I m saving it now, to prevent shifting during the display
            this.updateEntities(time_elapsed);
            this.updateUis(time_elapsed);
            if (mouse.left_click) {
                this.runOnUis(function (ui) {
                    return ui.onMouseLeftClick();
                });
            }
            if (mouse.right_click) {
                this.runOnUis(function (ui) {
                    return ui.onMouseRightClick();
                });
            }
        } else {
            ressources.NO_SIGNAL.drawCenterAt(canvas.width / 2, canvas.height / 2);
        }
    }

    playerCallFunction(func_name, ...args) {
        if (this.self) {
            this.socket.emit(Events.PLAYER_CALL_FUNCTION, func_name, ...args);
        }
    }

    onDestroy() {
        this.socket.disconnect(true);
    }

    addEntity(entity) {
        this.entities[entity.id] = entity;
    }

    deleteEntity(id) {
        if (id in this.entities) {
            delete this.entities[id];
        }
        else {
            console.log("Error eventDeleteEntity " + id + " does not exist");
        }
    }

    updateEntities(time_elapsed) {
        var entities = this.entities;
        var keys = Object.keys(entities);
        // TODO OPTIMIZE?
        keys.sort(function (a, b) {
            var ent_a = entities[a];
            var ent_b = entities[b];
            var priority = ent_a.getPriority() - ent_b.getPriority();
            if (priority != 0) {
                return (priority);
            }
            return ent_a.pos.y - ent_b.pos.y;

        });

        var arrayLength = keys.length;
        for (var x = 0; x < arrayLength; x++) {
            var key = keys[x];
            if (entities.hasOwnProperty(key)) {
                var entity = entities[key];
                if (entity.id != this.self.id) {
                    entity.onUpdate(time_elapsed);
                }
            }
        }
        this.self.onUpdate(time_elapsed);
    }

    relPos(pos) {
        // convert world pos to screen pos
        // Constants.SCREEN_RATIO
        var res = new Position(
            (pos.x - this.pos.x) / Constants.X_VIEW_RANGE * canvas.width + canvas.width / 2,
            (pos.y - this.pos.y) / Constants.X_VIEW_RANGE * (canvas.height * Constants.SCREEN_RATIO) + canvas.height / 2
        );
        return res;
    }

    worldPos(pos) {
        // convert screen pos to world
        var res = new Position(
            (pos.x - canvas.width / 2) * Constants.X_VIEW_RANGE / canvas.width + this.pos.x,
            (pos.y - canvas.height / 2) * Constants.X_VIEW_RANGE / (canvas.height * Constants.SCREEN_RATIO) + this.pos.y
        );
        return res;
    }
}
