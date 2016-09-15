/******
*
* $Id: click2tick.js 1268 2011-01-28 08:17:57Z klaus $
* Click to tick! game library
*
******/

// global variable to collect setup data from datafiles
window.gamedata = [];

(function () {
  var GameLib = function () {
    var elem = {};
    var image, canvas, context;
    var game = {
      idx : 0,          // option-index from pulldown for current game (0-n)
      dat : null,       // shortcut to gamedata for the current game
      loc : -1,         // current location to be found in location-array (0-n)
      locs : [],        // shortcut to current location-array
      radius : 15,      // tolerance-radius in pixel for matches
      store : {},       // object with gamestats for each game
      restart : false   // flag to indicate restart on next click
    };

    /* helper functions */
    var _get = function(id) {
      // return existing or newly created reference to node with ID=id
      if (typeof elem[id] == 'undefined') {
        elem[id] = document.getElementById(id);
      }
      return elem[id];
    };
    var addOpt = function(val,lab) {
      return '<option value='+val+'>'+lab+'</option>';
    };
    var setQ = function(loc) {
      return loc[0]+' '+loc[1]+'?';
    };
    var px2int = function(px) {
      return parseInt(px.replace('px',''));
    };
    var hsl2color = function(hsl,alpha) {
      if (alpha) {
        return  'hsla('+hsl.h+','+hsl.s+'%,'+hsl.l+'%,'+alpha+')';
      }
      else {
        return  'hsl('+hsl.h+','+hsl.s+'%,'+hsl.l+'%)';
      }
    };
    var flag = function(cx,cy,hsl) {
      var h = 50;
      context.save();
      context.translate(cx,cy);
      context.beginPath();
      context.moveTo(0,0);
      context.lineTo(0,-h);
      context.lineTo(25,-h+8);
      context.lineTo(0,-h+16);
      context.closePath();
      context.fillStyle = hsl2color(hsl,0.5);
      context.fill();
      context.strokeStyle = 'white';
      context.lineWidth = 2.0;
      context.stroke();
      context.restore()
    };
    var circ = function(cx,cy,hsl) {
      var r0 = 2;
      var r1 = game.radius;
      // surrounding
      context.save();
      context.beginPath();
      context.moveTo(cx+r1,cy);
      context.arc(cx,cy,r1,0,Math.PI*2.0,0);
      context.fillStyle = hsl2color(hsl,0.25);
      context.fill();
      context.strokeStyle = 'white';
      context.stroke();
      // center
      context.beginPath();
      context.moveTo(cx+r0,cy);
      context.arc(cx,cy,r0,0,Math.PI*2.0,0);
      context.fillStyle = 'white';
      context.fill();
      context.restore();
    };

    var startGame = function(idx) {
      // (re)set game variables and results
      game.idx = idx;
      game.dat = gamedata[idx];
      game.loc = -1;
      game.locs = gamedata[idx].locations;
      game.store = {
        gid : game.dat.gid,
        game : game.dat.title,
        questions : game.locs.length,
        correct : 0,
      };
      game.restart = false;

      // reset result list
      _get('gameResults').innerHTML = '';

      // set map-title
      _get('gameTitle').innerHTML = game.dat.title;

      // define map-URL
      var url  = 'http://maps.google.com/maps/api/staticmap?sensor=false&maptype=satellite';
      url += '&size='+px2int(game.dat.width) + 'x' + px2int(game.dat.height);
      url += '&center='+game.dat.center.lat+','+game.dat.center.lng;
      url += '&zoom='+game.dat.zoom;

      // get collected data
      var games_done = [];
      var max_percent = 0;
      for (var i=0;i<localStorage.length;i++) {
        var key = localStorage.key(i);
        if (key.substring(0, 10) == "click2tick") {
          var item = JSON.parse(localStorage.getItem(key));
          if (item.gid == game.store.gid) {
            games_done.push(item);
            max_percent = Math.max(max_percent, item.percent);
          }
        }
      }

      // show collected data
      var s = '';
      if (games_done.length == 0) {
        s += 'You have not played this game before.';
      }
      else {
        s += 'You have played this game '+
          (games_done.length+1)+' times.<br>';
        s += 'Your best hit rate till now: '+
          max_percent+"%\n";
      }
      _get('localStorage').innerHTML = s;

      // set canvas width and height
      canvas.width = px2int(game.dat.width);
      canvas.height = px2int(game.dat.height);

      // report URL in debug-mode to enable inclusion in Manifest
      if (location.search == "?debug=1") {
        _get('mapUrl').innerHTML = url;
      }

      // load new image if needed and ask question when loaded
      if (image.src != url) {
        // repaint and ask question when loaded
        image.src = url;
        image.onload = function() {
          context.drawImage(image,0,0);
          askQuestion();
        };
      }
      else {
        // same image, ask immediatly
        context.drawImage(image,0,0);
        askQuestion();
      }
    };

    var askQuestion = function() {
      game.loc += 1;
      if (game.loc >= game.locs.length) {
        // give feedback
        game.store.percent = Math.round(100/game.store.questions*game.store.correct);
        var thresh = [90,80,60,40,0];
        var msg = ['Excellent','Very good','Not bad','Moderate','Disappointing'];
        var i = 0;
        for (i=0; i<thresh.length; i++) {
          if (game.store.percent >= thresh[i]) {
            break;
          }
        }
        _get('curQuestion').innerHTML = msg[i]+'! Your hit rate is '+game.store.percent+'%';

        // deactivate map, add continue button
        context.save();
        context.font = '64px sans-serif';
        context.textAlign = 'right';
        context.textBaseline = 'alphabetic';
        context.strokeStyle = 'black';
        context.fillStyle = 'white';
        context.fillText(String.fromCharCode('0x27A1'),canvas.width,canvas.height);
        context.strokeText(String.fromCharCode('0x27A1'),canvas.width,canvas.height);
        context.restore();

        // store basic data in localstorage, add hostname and timestamp
        var ts = new Date().getTime();
        var id = "click2tick_"+game.store.gid+"_"+ts;
        game.store.hostname = location.hostname;
        game.store.ts = ts;
        localStorage.setItem(id, JSON.stringify(game.store));

        // shedule restart
        game.restart = true;
      }
      else {
        _get('curQuestion').innerHTML = setQ(game.locs[game.loc]);
      }
    };

    var checkPosition = function(evt) {
      // restart if needed
      if (game.restart) {
        startGame(game.idx);
        return;
      }

      // set current color
      var hsl = {
        h : 0 + (game.loc * (360.0/game.locs.length)),
        s : 100,
        l : 38
      };

      // show clicked position with a flag
      var pt = {
        x : evt.clientX - evt.target.offsetLeft,
        y : evt.clientY - evt.target.offsetTop
      };
      flag(pt.x,pt.y,hsl);

      // show relation to actual position as circle
      var cx = {
        x : game.locs[game.loc][2],
        y : game.locs[game.loc][3]
      };
      circ(cx.x,cx.y,hsl);

      // compute distance
      var dst = Math.round(
        Math.sqrt(
          Math.pow(pt.x-cx.x,2)+Math.pow(pt.y-cx.y,2)
        )
      );

      // store results
      var correct = (dst < game.radius) ? true : false;
      if (correct) {
        game.store.correct += 1;
      }

      // give feedback
      _get('gameResults').innerHTML += giveFeedback(game.locs[game.loc][1],correct,hsl);

      // next question
      askQuestion();
    };

    var giveFeedback = function(loc,cor,hsl) {
      var bul = String.fromCharCode('0x272A');
      var col = 'color:'+hsl2color(hsl);
      var sym = (cor == true) ? 2713 : 2717;
      return '<li><span style="'+col+'">'+bul+'</span> '+loc+' '+String.fromCharCode('0x'+sym)+'</li>';
    };

    var setOnlineStatus = function() {
      if (navigator.onLine) {
        _get('onlineStatus').innerHTML = 'Online';
        _get('onlineStatus').className = 'online';
        _get('updateButton').style.visibility = 'visible';
      }
      else {
        _get('onlineStatus').innerHTML = 'Offline';
        _get('onlineStatus').className = 'offline';
        _get('updateButton').style.visibility = 'hidden';
      }
    }

    this.init = function() {
      // build game-selection pulldown
      var o = ''
      for (var i=0; i<gamedata.length; i++) {
         o += addOpt(i,gamedata[i].title);
      }
      _get('selGame').innerHTML = o;
      _get('selGame').options.selectedIndex = 0;
      _get('selGame').onchange = function() {
        startGame(this.value);
      };

      // define empty image used for map later
      image = new Image();

      // get reference to canvas, define context, activate eventListener
      canvas = document.querySelector("CANVAS");
      context = canvas.getContext('2d');
      canvas.onclick = function(evt) {
        checkPosition(evt);
      };

      // add event listener for updated Cache:
      window.applicationCache.addEventListener("updateready", 
        function(e) { 
          window.applicationCache.swapCache(); 
          _get('updateButton').innerHTML += ' Update installiert.';
        }, false);
      setOnlineStatus();

      // control online-status
      window.addEventListener("online", function() {
        setOnlineStatus();
      }, false);
      window.addEventListener("offline", function() {
        setOnlineStatus();
      }, false);

      // start first game
      startGame(0);
    };
  };
  // expose object
  window.click2tick = GameLib;
}());
