/*****************************
Aaron Becker's Help Library V7
Contains some stuff that I always use in my programs but that I want externally for cleanliness of code
*****************************/

var helpLib = []; //you can do try{helpLib} to check if helplib is active

function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

console.typeable = function(type,eval,evalontype) {
	eval = eval || "";
	evalontype = evalontype || "";
	Object.defineProperty(window, type, {
        get: function() {
        console.eval(evalontype);
    }}),console.eval(eval);
}

console.eval = function(evalu) {
	eval(evalu);
}

function getParameterByName(name, url) {
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
				results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
}

//document.write("<p id=\"example\">example</p>")
var num = 0;
var intervals = [];
var mov = [];
//struct ID("example").move([[[1,2],1],[[1,3],2]],1)
Element.prototype.move = function(amount,dat) {
	var amount = amount || "stopMov";
	mov = dat || undefined;
	if (mov === undefined) {
		console.warn("movement undefined, nothing will happen");
	} else {
		mov = mov[0];
	}
	var el = this;

	if (amount == "stopMov") {

		window.addEventListener(("stopMov"+num),function(){
			clearInterval(intervals[num]);
		});
		num++;
		return "stopMov"+(num-1);
	} else {
		var i = 0;
		var curTime = 0;
		for (var j=amount; j>0; j--) {
			for (i=0; i<mov.length; i++) {
				setTimeout(function(){
					console.info(mov.length,i,mov,mov[i]);//,mov[i][0][0],mov[i][0][1]);
					el.setPos(mov[i][0][0],mov[i][0][1]);
					console.log("timeout for anim set success: j cycle: "+j+"time: "+(curTime+mov[i][1])+", x: "+mov[i][0][0]+", y: "+mov[i][0][1]);
				},(curTime+mov[i][1]));
				curTime += mov[i][1];
			}
		}
	}

}

//ID("example").move([[[1,2],1],[[1,3],2]],1)

Node.prototype.fire=function(type,options){
		 var event=new CustomEvent(type);
		 for(var p in options){
				 event[p]=options[p];
		 }
		 this.dispatchEvent(event);
}

Element.prototype.hide = function() {
		this.style.display = 'none';
	};

Element.prototype.show = function() {
		this.style.display = 'inline';
	};

Element.prototype.fade = function (type, ms, callback) {
	var callback = callback || undefined;
	var el = this;
	var origdisp = el.style.display;
	if (origdisp == "none") {
		origdisp = "block";
		el.style.display = "block";
	}
	var isIn = type === 'in',
		opacity = isIn ? 0 : 1,
		interval = 50,
		duration = ms,
		gap = interval / duration;

	if(isIn) {
		//el.style.display = 'inline';
		el.style.opacity = opacity;
	}

	function func() {
		opacity = isIn ? opacity + gap : opacity - gap;
		el.style.opacity = opacity;

		if(opacity <= 0 || opacity >= 1) {
			window.clearInterval(fading);
		}
	}

	var fading = window.setInterval(func, interval);
	var done = window.setTimeout(function(){
		el.style.display = origdisp;
		//var fixcallback = String(callback).replace("\"","\\\"");
		eval(callback);
	},ms);
return ms;
}

document.getClass = function(classL) {
		document.getElementsByClassName(classL);
	};
document.getID = function(idL) {
		document.getElementById(idL);
	};

String.prototype.isBlank = Number.prototype.isBlank = Function.prototype.isBlank = Object.prototype.isBlank = function() {
		try{
					if (this == undefined || this == null || this == "" || this == "undefined" || this == "null") {
					return true;
				} else {
					return false;
				}
				} catch(e) {return true;}
	};

document.getID = function(idL) {
		document.getElementById(idL);
	};

String.prototype.isPartOf = function(array) {
	if (typeof array == "object") {
		for (i=0; i<array.length; i++) {
			if (array[i].contains(this)) {
				return true;
			}
		}
		return false;
	} else {
		return false;
	}
}

String.prototype.contains = function(it) {
	return this.indexOf(it) != -1; 
};

if (Array.prototype.equals)
		console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function(array) {
				// if the other array is a falsy value, return
				if (!array)
						return false;

				// compare lengths - can save a lot of time 
				if (this.length != array.length)
						return false;

				for (var i = 0, l = this.length; i < l; i++) {
						// Check if we have nested arrays
						if (this[i] instanceof Array && array[i] instanceof Array) {
								// recurse into the nested arrays
								if (!this[i].equals(array[i]))
										return false;
						} else if (this[i] != array[i]) {
								// Warning - two different object instances will never be equal: {x:20} != {x:20}
								return false;
						}
				}
				return true;
		}
		// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

Number.prototype.isNaN = Number.isNaN || function(value) {
    return typeof value === "number" && isNaN(value);
}

Number.prototype.between = function(a, b, inclusive) {
	inclusive = inclusive || true;
  var min = Math.min.apply(Math, [a, b]),
    max = Math.max.apply(Math, [a, b]);
  return inclusive ? this >= min && this <= max : this > min && this < max;
};

var getAllCombinations = function(a, min) {
		var fn = function(n, src, got, all) {
				if (n == 0) {
						if (got.length > 0) {
								all[all.length] = got;
						}
						return;
				}
				for (var j = 0; j < src.length; j++) {
						fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
				}
				return;
		}
		var all = [];
		for (var i = min; i < a.length; i++) {
				fn(i, a, [], all);
		}
		all.push(a);
		return all;
}

Array.prototype.containsP = function(tocheck, propertynum) {
		for (i in this) {
				if (this[i][propertynum] == tocheck) return Number(i);
		}
		return false;
}

Array.prototype.contains = function(tocheck) {
		for (i in this) {
				if (this[i] == tocheck) return Number(i);
		}
		return false;
}

Array.prototype.uniqueify = function() {
		var u = {},
				a = [];
		for (var i = 0, l = this.length; i < l; ++i) {
				if (u.hasOwnProperty(this[i])) {
						continue;
				}
				a.push(this[i]);
				u[this[i]] = 1;
		}
		return a;
}

Array.prototype.removeBlanks = function() {
		var u = {},
				a = [];
		for (var i = 0, l = this.length; i < l; ++i) {
				if (this[i] == "") {
						continue;
				}
				a.push(this[i]);
				u[this[i]] = 1;
		}
		return a;
}
Object.prototype.removeBlanks = function() {
		var u = {},
				a = [];
		for (var i = 0, l = this.length; i < l; ++i) {
				if (this[i] == "") {
						continue;
				}
				a.push(this[i]);
				u[this[i]] = 1;
		}
		return a;
}

Array.prototype.uniqueifyProperty = function(property) {
		var u = {},
				a = [];
		for (var i = 0, l = this.length; i < l; ++i) {
			try {
					if (u.hasOwnProperty(this[property][i])) {
						continue;
					}
					a.push(this[i]);
					u[this[i]] = 1;
				} catch(e) {
					continue;
					console.warn("Err uniquify property, i val "+i+", property "+property);
				}
			}
		return a;
}

function map(number, in_min, in_max, out_min, out_max) {
		var val = (number - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
		return val > out_max ? out_max : val < out_min ? out_min : val;
}

function constrain(number, min, max) {
	return number > max ? max : number < min ? min : number;
}

String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

Object.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

String.prototype.compare = function( s2, splitChar ){
	var s1 = this;
    if ( typeof splitChar == "undefined" ){
        splitChar = " ";
    }
    var string1 = new Array();
    var string2 = new Array();

    string1 = s1.split( splitChar );
    string2 = s2.split( splitChar );
    var diff = new Array();

    if(s1.length>s2.length){
        var long = string1;
    }
    else {
        var long = string2;
    }
    for(x=0;x<long.length;x++){
        if(string1[x]!=string2[x]){
            diff.push(string2[x]);
        }
    }

    return diff;    
}

String.prototype.removeCharacters = function(character) {
	var ret = "";
	for (var i=0; i<this.length; i++) {
		if (this[i] != character) {
			ret+=this[i];
		}
	}
	return ret;
}

Array.prototype.clone = function() {
	return JSON.parse(JSON.stringify(this));
}

Array.prototype.closest = function(number) {
				var current = this[0];
				var difference = Math.abs(number - current);
				var index = this.length;
				while (index--) {
						var newDifference = Math.abs(number - this[index]);
						if (newDifference < difference) {
								difference = newDifference;
								current = this[index];
						}
				}
				return current;
		};

Array.prototype.contains = function(it) {
	return this.indexOf(it) != -1; 
};

function isTrue(exp) {
	if (exp && typeof exp != "string") {
		return true;
	}
	if (exp == "true") {
		return true;
	}
	if (exp == "True") {
		return true;
	}
	if (exp == "TRUE") {
		return true;
	}
	return false;
}

String.prototype.titleize = function(blacklist) {
	var str = String(this).toLowerCase().split(" ");
	console.log("str = "+str);
	try {
		if (blacklist == "" || blacklist == undefined || blacklist == "undefined" || blacklist == null || blacklist == "null") {
			var blacklist = ["and","or","of","nor","but","so"];
		}
	} catch(e) {
		var blacklist = ["and","or","of","nor","but","so"];
	}
	var curWork = str[0].substring(0,1).toUpperCase();
	str[0] = curWork+str[0].substring(1);
	for (i=1; i<str.length-1; i++) {
		console.log("Str[i] = "+str[i]);
		console.log("IPOB?="+str[i].isPartOf(blacklist))
		if (str[i].isPartOf(blacklist) == false) {
			console.log("POB");
			curWork = str[i].substring(0,1);
			str[i] = curWork.toUpperCase()+str[i].substring(1);
		} else {
			console.log("NPOB");
			str[i] = str[i].toLowerCase();
		}
	}
	var toReturn = "";
	for (i=0; i<str.length; i++) {
		toReturn = toReturn+" "+str[i];
	}
	toReturn = toReturn.substring(1);
	return toReturn;
}

Array.prototype.removeAll = function(toRemove) {
	var index;
	if (null == this) {throw new TypeError('"this" is null or not defined');} else {
		if (typeof toRemove == "string" || typeof toRemove == "number") {
			for (i=0; i<this.length; i++) {
				if (this[i] == toRemove) {
					this.splice(i, 1);
				}

			}
			return this;
		} else {
			return this;
		}
	}
}

Element.prototype.remove = function() {
		this.parentElement.removeChild(this);
}


NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
		for(var i = this.length - 1; i >= 0; i--) {
				if(this[i] && this[i].parentElement) {
						this[i].parentElement.removeChild(this[i]);
				}
		}
}

function drawPoint(x,y,r,g,b,a){//Not in HTML5, so had to add it
	if (typeof x == "number" && typeof y == "number" && typeof r == "number" && typeof g == "number" && typeof b == "number" && typeof a == "number") {
		var canvas = this;
		var ctx = canvas.getContext("2d");
		var id = ctx.createImageData(2,2);
		var d  = id.data;
		d[0]   = r;
		d[1]   = g;
		d[2]   = b;
		d[3]   = a;
		ctx.putImageData( id, x, y );
	} else {
		throw new TypeError('One or more parameters is null or not defined, or not a number');
	}
}
HTMLCanvasElement.prototype.drawPoint = drawPoint;

Element.prototype.setPos = function(x,y) {
	if (typeof x == "number" && typeof y == "number") {
		this.style.position = "absolute";
		this.style.left = x+'px';
		this.style.top = y+'px';
	} else {
		throw new TypeError('One or more parameters is null or not defined, or not a number');
	}
}

Function.prototype.delay = function(time) {
	if (typeof this == "function") {
	setTimeout(this,time);
} else {
	throw new TypeError("You must pass in a function");
}
}

Function.prototype.runOnResize = function() {
	if (this.length >= 2) {
	var toCall = this.toString().split(" ")[1];
	toCall = toCall.substring(0, toCall.indexOf("("));
	window.onresize = function(){console.log("window resize detected"); eval(String(toCall)+"("+window.innerWidth+","+window.innerHeight+")")}
	} else {
		throw new TypeError("Function does not have at least two arguments, height and width");
}
}

Function.prototype.runOnResizeNoArgs = function() {
	var toCall = this.toString().split(" ")[1];
	toCall = toCall.substring(0, toCall.indexOf("("));
		alert(String(toCall)+"();")
	window.onresize = function(){console.log("window resize detected"); eval(String(toCall)+"();")}
}

Function.prototype.runOnKeydown = function() {
	var toCall = this.toString().split(" ")[1];
	toCall = toCall.substring(0, toCall.indexOf("("));
	window.onkeydown = function(){eval(String(toCall)+"()")}
}

Function.prototype.runOnKeyup = function() {
	var toCall = this.toString().split(" ")[1];
	toCall = toCall.substring(0, toCall.indexOf("("));
	window.onkeyup = function(){eval(String(toCall)+"()")}
}

String.prototype.delay = function(time) {
	setTimeout(function(){eval(this)},time);
}

String.prototype.copyToClipboard = function() {
	var text = this;
	var textArea = document.createElement("textarea");
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = 0;
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	textArea.style.background = 'transparent';
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	textArea.id = "txtarea";

	try {
		var successful = document.execCommand('copy');
		ID("txtarea").remove();
		return successful;
	} catch (err) {
		ID("txtarea").remove();
		return false;
	}
}

Object.prototype.getType = function() {
	return ({}).toString.call(this).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
}

String.prototype.dispatchEvent = function(context) {
	if (context == null || context == undefined || context == "" || context == " ") {
		try{context = window;}catch(e){context = document;}
	}
		context.dispatchEvent(new CustomEvent(this));
}

function keydownHandler(e) {
						if (e.keyCode == 13) { //enter key
								"keyenter".dispatchEvent(window);
						} else if (e.keyCode == 32) { //space key
							"keyspace".dispatchEvent(window);
						} else if (e.keyCode == 16) { //shift key
							"keyshift".dispatchEvent(window);
						} else if (e.keyCode == 17) { //ctrl key
							"keyctrl".dispatchEvent(window);
						} else if (e.keyCode == 18 ) { //alt key
							"keyalt".dispatchEvent(window);
						} else if (e.keyCode == 27) { //escape key
							"keyescape".dispatchEvent(window);
						}
				}
				// register your handler method for the keydown event
						if (document.addEventListener) {
								document.addEventListener('keydown', keydownHandler, false);
						} else if (document.attachEvent) {
								document.attachEvent('onkeydown', keydownHandler);
}

function ID(val) {
		return document.getElementById(val);
}

function checkMeta(meta) {
    var metas = document.getElementsByTagName('meta'); 

    for (var i=0; i<metas.length; i++) { 
      	if (metas[i].getAttribute("property") == meta) { 
        	return metas[i].getAttribute("content"); 
      	}
    }
}

var defaultvoice = "en-GB";

var greeting = function(name) {
    var utterance = new SpeechSynthesisUtterance();
    utterance.text = 'Hello, '+name+"!";
    utterance.lang = defaultvoice;
    utterance.rate = 1.2; 
    speechSynthesis.speak(utterance);
 }

var say = function(text,voice) { //DO NOT DELETE this function, all of the talking depends on it
	if (voice == "" || voice == "undefined" || voice == "null") {voice = defaultvoice;}
	var utterance = new SpeechSynthesisUtterance();
	utterance.text = text;
	utterance.lang = voice;
	utterance.rate = 1.2; 
	speechSynthesis.speak(utterance);
}

var slowersay = function(text,voice) { //DO NOT DELETE this function, time talking depends on it
	if (voice == "" || voice == "undefined" || voice == "null") {voice = defaultvoice;}
	var utterance = new SpeechSynthesisUtterance();
	utterance.text = text;
	utterance.lang = voice;
	utterance.rate = 0.9; 
	speechSynthesis.speak(utterance);
}

var deactivate = false;

