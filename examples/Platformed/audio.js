//audio.js by Aaron Becker
//Manages audio loops in "groups" and a queue for easier playback

var gameAudio = {
    audio: {
        /*title: {
            audioelement: "a",
            group: ""
        }*/
    },
    queue: {
        //sound1: "audio"
    },
    queueposition: 0,
    init: function() {
        gameAudio.queue = {};
        gameAudio.queueposition = 0;
        gameAudio.audio = {};
        console.log("[AUDIOMANAGER] Audio initialized");
    },
    track: function(src, name, queue, group) {
        name = name||"untitled";
        this[name] = {};
        this.name = name;
        this[name].name = name;
        //this[name].ended = false;
        if (typeof group === "undefined") {
            this[name].group = "";
        } else {
            this[name].group = group;
        }
        
        this[name].audioelement = document.createElement('audio');
        this[name].audioelement.src = src;

        /*this[name].audioelement.addEventListener("ended", function(){
             this.currentTime = 0;
             //this[name].ended = true;
             gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].ended = true;
             console.log("[AUDIOMANAGER] track '"+gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].name+"' ended");
        });*/

        if (queue) {
            gameAudio.queue[name] = new Object(this[name].audioelement);
        }

        gameAudio.audio[name] = new Object({audioelement: this[name].audioelement, name: this.name, group: this[name].group});
    },
    group: function(newgroup) {
        newgroup = newgroup||"untitled";
        //console.log("[AUDIOMANAGER] group args: "+JSON.stringify(arguments));
        for (var i=0; i<arguments.length; i++) {
            if (arguments[i] != newgroup && typeof arguments[i] !== "undefined") {
                arguments[i].group = newgroup;
            }
        }
    },
    queueGroup: function(clear, group) {
        if (typeof clear === "undefined") {
            clear = true;
        }
        if (clear) {
            gameAudio.queue = {};
        }
        var found = false;
        for (var i=0; i<Object.keys(gameAudio.audio).length; i++) {
            //console.log(JSON.stringify(gameAudio.audio[Object.keys(gameAudio.audio)[i]]))
            if (gameAudio.audio[Object.keys(gameAudio.audio)[i]].group == group) {
                found = true;
                gameAudio.queue[Object.keys(gameAudio.audio)[i]] = gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement;
            }
        }
        if (found == false) {
            console.error("[AUDIOMANAGER] No tracks found in group '"+group+"'");
        }
    },
    queueTrack: function(clear, track) {
        if (typeof clear === "undefined") {
            clear = true;
        }
        if (clear) {
            gameAudio.queue = {};
        }
        console.log(JSON.stringify(track));
        gameAudio.queue[track.name] = track[track.name];
    },
    update: function() {
        if (Object.keys(gameAudio.queue).length > 0) {
            if (gameAudio.queueposition == Object.keys(gameAudio.queue).length-1) { //end of queue, loop
                gameAudio.queueposition = 0;
                console.log("[AUDIOMANAGER] Track or track group '"+Object.keys(gameAudio.queue)[gameAudio.queueposition]+"' ended, moving back to beginning of queue");
            } else {
                gameAudio.queueposition++;
                console.log("[AUDIOMANAGER] Track '"+Object.keys(gameAudio.queue)[gameAudio.queueposition]+"' ended, moving to next track");
            }
            if (Object.keys(gameAudio.queue).length > 1) {
                if (gameAudio.queueposition != 0) {
                    if (Object.keys(gameAudio.queue)[gameAudio.queueposition].src != Object.keys(gameAudio.queue)[gameAudio.queueposition-1].src) {
                        gameAudio.fade("in",3000,"");
                    }
                } else {
                    gameAudio.fade("in",3000,"");
                }
            }
            try{
                gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].play();
            } catch(e) {
                console.error("[AUDIOMANAGER] Error playing next track in queue");
            }
            gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].onended = function(){
                gameAudio.update();
            }
        }
    },
    play: function() {
        gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].play();
        gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].onended = function(){
            gameAudio.update();
        }
    },
    pause: function() {
        gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].pause();
        gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].onended = function(){
            gameAudio.update();
        }
    },
    stop: function() {
        for (var i=0; i<Object.keys(gameAudio.audio).length; i++) {
            gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.pause();
        }
    },
    /*fadeout: function(time,callback) {
        var vol = gameAudio.queue[Object.keys(gameAudio.queue)[gameAudio.queueposition]].volume*100;
        var interval = 100;
        var gap = interval/time;
        var interv = setInterval(function() {
            if (vol != 0) {
                gameAudio.setVolume(vol);
                vol-=gap;
            } else {
                gameAudio.setVolume(vol);
                clearInterval(interv);
                try{eval(callback);}catch(e){try{callback();}catch(e){}}
            }
        },interval);
    },*/
    fade: function (type, ms, callback) {
        var callback = callback || undefined;
        var isIn = type === 'in',
            volume = isIn ? 0 : 1,
            interval = 20,
            duration = ms,
            gap = interval / duration;

        if(isIn) {
            for (var i=0; i<Object.keys(gameAudio.audio).length; i++) {
                if (typeof gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume === "undefined") {
                    gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume = 1;
                }
                if (volume < gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume) {
                    gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume = volume;
                }
            }
        }

        function func() {
            volume = isIn ? volume + gap : volume - gap;
            for (var i=0; i<Object.keys(gameAudio.audio).length; i++) {
                if (volume < gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume) {
                    gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume = volume;
                }
            }
            volume = Math.round(volume*100)/100;
            if(volume <= 0 || volume >= 1) {
                window.clearInterval(fading);
            }
        }

        var fading = window.setInterval(func, interval);
        var done = window.setTimeout(function(){
            try{eval(callback);}catch(e){try{callback();}catch(e){}}
        },ms);
        return ms;
    },
    setVolume: function(volume) {
        console.log("[AUDIOMANAGER] Game audio set to "+volume+"%");
        for (var i=0; i<Object.keys(gameAudio.audio).length; i++) {
            gameAudio.audio[Object.keys(gameAudio.audio)[i]].audioelement.volume = volume/100;
        }
    }
}