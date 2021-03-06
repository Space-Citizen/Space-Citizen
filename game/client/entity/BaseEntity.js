class BaseEntity {

  constructor(server_entity, game) {
    this.game = game;
    this._audios = [];
    this.onServerUpdate(server_entity);
    this.onInit();
    this.pos = this.s_pos;
    this.type = this.s_type;
    this.game.addEntity(this);
    this.killed = false; // var set in listener >> StateGame
    this.smooth_multiplier = 8;
  }

  isAlive() {
    if (this.killed) {
      return false;
    }
    return true;
  }

  onServerUpdate(server_entity) {
    Helper.updateDict(this, server_entity);
  }

  getAudio(audio) {
    var res = audio.clone();
    this._audios.push(res);
    return res;
  }

  _updateAudios() {
    // update audio volumes
    if (Helper.onInterval(this, "updateAudio", 0.2)) {
      var dist = Helper.dist(this.pos, this.game.self.pos);

      for (var x = 0; x < this._audios.length; x += 1) {
        var audio = this._audios[x];
        if (dist > Constants.SOUND_RANGE) {
          audio.setVolume(0);
        } else {
          audio.setVolume(Helper.map(dist, 0, Constants.SOUND_RANGE, 0.3, 0));
        }
        //console.log("volume: " + audio._audio.volume);
      }
    }
  }

  onInit() {
    throw new Error("Method 'onInit()' must be implemented.");
  }

  getHitCircle() {
    // just like hit box, but its a circle
    // it will be used for mouse targeting
    throw new Error("Method 'hitCircle()' must be implemented.");
  }

  getPriority() {
    // higher the priority, sooner it will be displayed
    throw new Error("Method 'getPriority()' must be implemented.");
  }

  onUpdate(time_elapsed) {
    var bearing = Helper.getDirection(this.pos, this.s_pos);
    if (bearing) {
      var dist = Helper.dist(this.pos, this.s_pos);
      if (dist > 0.1) {
        var speed = Helper.regul(this, dist, 0.0, 0.1, 0.8);
        //console.log(speed);
        Helper.moveInDirection(
          this.pos,
          bearing,
          speed,
          time_elapsed * this.smooth_multiplier
        );
      }
    }

    //var bearing_diff = (this.s_bearing - this.bearing);
    // TODO: smooth bearing
    // TODO: _onUpdate ?
    if (Helper.onInterval(this, "updateAudio", 0.1)) {
      this._updateAudios();
    }
  }

  delete() {
    this.game.deleteEntity(this.id);
  }

  kill() {
    this.delete();
  }
}
