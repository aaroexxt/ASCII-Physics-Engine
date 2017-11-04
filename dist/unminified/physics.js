/*
physics.js by Aaron Becker
A complete ASCII physics engine written in JavaScript
*/

var Physics = {
    element: null,
    defaultSpaceChar: " ",
    defaultShapeChar: "*",
    defaultNewlineChar: "<br>",
    startString: "PHYV5:<br><br>",
    //CONSTANTS
    gravitationalConstant: 0.2,
    frictionConstant: 0.7,
    terminalVelocity: 7,
    ticksPerSecond: 60, //limit number of physics calls per second
    updatesPerSecond: 40, //limit number of gravity updates per second
    renderPerSecond: 50, //limit renders performed per second
    renderInColor: false,
    //TIMING VARIABLES
    now: Date.now(),
    nextTick: Date.now(),
    nextUpdate: Date.now(),
    nextRender: Date.now(), //currently disabled because of problems with timing, go to line 279 to change this (line may change as I remove/add code)
    lastUpdate: Date.now(),
    oldDelta: 0,
    //PHYSICS CONSTANTS
    enableDeltaTimeCalculations: true, //can help mitigate low framerate by helping to keep jumps consistent
    simpleDeltaCalculations: true,
    forceAverageDelta: false,
    moreEfficientPhysics: false, //beta and doesn't work yet
    //weightPerCharacter: 0.1, //to be implemented
    //GENERAL CONSTANTS
    debugMode: false,
    allGravity: false,
    width: window.innerWidth,
    height: window.innerHeight,
    lineHeight: 0.65,
    initialLineHeight: 0.83,
    collisionAccuracy: 0.5,
    //MISC
    collisionEfficiency: -1,
    inefficientArr: [],
    bodyFontSize: 16,
    renderBuffer: [],
    renderString: [],
    charsPerFrame: 0,
    //RENDER LOOP STUFF
    renderLoopPasts: [],
    renderLoopNext: 0,
    renderLoopShapes: [],
    //MAIN FUNCTIONS
    shape: function(type, options) {
        if (type === undefined || options === undefined) {
            throw new Error("Type or options incomplete when constructing shape");
            return new Error("");
        } else {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.mesh = [];
            this.colorMesh = [];
            this.shapeArrayNum = Physics.renderLoopShapes.length;
            Physics.renderLoopShapes[Physics.renderLoopShapes.length] = this;
            this.color = options.color || "black";
            if (typeof this.color === "undefined") {
                this.color = "black";
            }

            this.UUID = generateUUID();
            this.gravity = options.gravity || false;
            if (typeof this.gravity === "undefined" || typeof options.gravity === "undefined") {
                this.gravity = false;
            }
            this.momentumX = 0;
            this.momentumY = 0;
            this.collide = options.collide;
            if (typeof this.collide === "undefined") {
                this.collide = true;
            }
            this.overrideRenderLimit = options.overrideRenderLimit || false;
            if (typeof this.overrideRenderLimit === "undefined") {
                this.overrideRenderLimit = false;
            }

            this.pointTable = [];
            this.updPointTable = [];
            this.collisionBottom = false;
            this.collisionTop = false;
            this.collisionRight = false;
            this.collisionLeft = false;

            this.character = options.character || Physics.defaultShapeChar;
            if (this.character.length > 1) {
                this.character = this.character.substring(0,1);
            }

            this.type = type;
            if (type == "box") {
                this.height = options.height || 10;
                this.width = options.width || 10;
                this.filled = options.filled;
                if (typeof this.filled === "undefined") {
                    this.filled = true;
                }
                if (this.filled) {
                    for (var i=0; i<this.height; i++) {
                        this.mesh[i] = "";
                        this.colorMesh[i] = "";
                        for (var j=0; j<this.width; j++) {
                            this.mesh[i]+=this.character;
                            this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                } else {
                    for (var i=0; i<this.height; i++) {
                        this.mesh[i] = "";
                        this.colorMesh[i] = "";
                        for (var j=0; j<this.width; j++) {
                            if ((i == 0 || i == (this.height-1)) || (j == 0 || j == (this.width-1))) {
                                this.mesh[i]+=this.character;
                                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i]+= Physics.defaultSpaceChar;
                            }
                        }
                    }
                }
            } else if (type == "line") {
                this.length = options.length || 10;
                this.mesh[0] = "";
                for (var i=0; i<this.length; i++) {
                    this.mesh[0]+=this.character;
                    this.colorMesh[0]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                    this.pointTable[this.pointTable.length] = [i,0];
                }
            } else if (type == "triangle") {
                this.height = options.height || options.width/2;
                this.width = options.width || options.height*2;

                for (var i=0; i<this.height; i++) { //generate blank mask as a square
                    this.mesh[i] = "";
                    this.colorMesh[i] = "";
                    for (var j=0; j<this.width; j++) {
                        this.mesh[i]+=Physics.defaultSpaceChar;
                        this.colorMesh[i]+= Physics.defaultSpaceChar;
                    }
                }
                var start = this.width/2;
                var amount = 1;
                for (var i=0; i<this.height; i++) {
                    for (var j=0; j<amount; j++) {
                        this.mesh[i] = this.mesh[i].replaceAt((start+j),this.character);
                        this.colorMesh[i] = this.mesh[i].replaceAt((start+j),"<span style='color: "+this.color+";'>"+this.character+"</span>");
                        this.pointTable[this.pointTable.length] = [i,j];
                    }
                    start-=1;
                    amount+=2;
                }
            } else if (type == "custom") {
                if (typeof options.mesh === "undefined" || typeof options.mesh !== "object") {
                    console.error("Mesh for custom object is undefined");
                } else {
                    this.width = 0;
                    this.height = options.mesh.length;
                    for (var i=0; i<options.mesh.length; i++) {
                        this.mesh[i] = [];
                        this.colorMesh[i] = [];
                        if (options.mesh[i].length > this.width) {
                            this.width = options.mesh[i].length;
                        }
                        for (var j=0; j<options.mesh[i].length; j++) {
                            this.mesh[i] += options.mesh[i][j];
                            if (options.mesh[i][j] == " ") {
                                this.colorMesh[i] += " ";
                            } else {
                                this.colorMesh[i] += "<span style='color: "+this.color+";'>"+options.mesh[i][j]+"</span>";
                            }
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                }
            } else if (type == "circle") {
                this.radius = options.radius || 10;
                this.filled = options.filled || false;

                if (this.filled == true) {
                    var centerx = this.radius;
                    var centery = this.radius;

                    for (var i=0; i<=2*this.radius; i++) { //draw unfilled circle
                        this.mesh[i] = "";
                        this.colorMesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {

                            var offsetx = j;
                            var offsety = i;

                            var dx=centerx-offsetx;
                            var dy=centery-offsety;
                            if ((dx*dx + dy*dy) <= (this.radius*this.radius)) {
                                this.mesh[i]+=this.character;
                                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i]+= Physics.defaultSpaceChar;
                            }
                        }
                    }
                } else if (this.filled == "cool") {
                    for (var i=0; i<=2*this.radius; i++) { //draw unfilled circle
                        this.mesh[i] = "";
                        this.colorMesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.pointTable[this.pointTable.length] = [i,j];
                                this.mesh[i]+=this.character;
                                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i]+= Physics.defaultSpaceChar;
                            }
                        }
                    }

                    var xoff = 0;
                    var yoff = 0;

                    var range = this.radius*Math.sin(45);
                    for (var i=xoff-range+1; i<xoff+range; i++) {
                        for (var j=yoff-range+1; j<yoff+range; j++) {
                            var roux = Math.round(i)+this.radius;
                            var rouy = Math.round(j)+this.radius;
                            //console.log("x: "+roux+", y: "+rouy)
                            this.pointTable[this.pointTable.length] = [i,j];
                            this.mesh[rouy] = this.mesh[rouy].replaceAt(roux,this.character);
                            this.colorMesh[rouy] = this.colorMesh[rouy].replaceAt(roux,"<span style='color: "+this.color+";'>"+this.character+"</span>");
                        }
                    }
                } else {
                    for (var i=0; i<=2*this.radius; i++) {
                        this.mesh[i] = "";
                        this.colorMesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.mesh[i]+=this.character;
                                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i]+= Physics.defaultSpaceChar;
                            }
                        }
                    }
                }
            } else {
                console.error("Shape not found. There may be errors rendering.");
            }
            this.pointTable.uniqueify(); //remove calls for multiple points
            this.update(); //update to start gravity and set updated point table
        }
    },
    render: function(clearScreen) { //todo fix slow replaceat functions
        if (typeof clearScreen === "undefined") {
            clearScreen = false;
        }

        Physics.now = Date.now();
        var elapsed = Physics.now-Physics.nextRender;
        var nextFrameReached = (elapsed > (1000/Physics.renderPerSecond))? true : false;
        if (nextFrameReached) {
            Physics.nextRender = Physics.now - (elapsed % (1000/Physics.renderPerSecond));
        }

        var elapsedupd = Physics.now-Physics.nextUpdate;
        var nextUpdateReached = (elapsedupd > (1000/Physics.updatesPerSecond))? true : false;
        if (nextUpdateReached) {
            Physics.nextUpdate = Physics.now - (elapsedupd % (1000/Physics.updatesPerSecond));
        }

        Physics.charsPerFrame = 0;

        if (clearScreen) {
            Physics.renderBuffer = [];
            for (var j=0; j<Physics.height; j++) { //generate blank screen
                Physics.renderBuffer[j] = "";
                for (var i=0; i<Physics.width; i++) {
                    Physics.renderBuffer[j] += Physics.defaultSpaceChar;
                }
            }
        }
        //console.info(JSON.stringify(Physics.renderBuffer))
        var colorXOffset = [];
        var rtolRender = [];
        if (Physics.renderInColor) {
            for (var i=0; i<arguments.length; i++) {

            }
        }
        for (var i=0; i<arguments.length; i++) { //add meshes to screen
            if (arguments[i] != true && arguments[i] != false && typeof arguments[i] !== "undefined") {
                //alert(JSON.stringify(arguments[i]))
                try {
                    if ((arguments[i].gravity == true || Physics.allGravity) && (nextUpdateReached || true)) { //calculate gravity
                        if (Physics.debugMode) {console.log("Updating velocity for shape: "+arguments[i].type+", UUID: "+arguments[i].UUID+" (velX: "+arguments[i].momentumX+", velY: "+arguments[i].momentumY+")")}
                            arguments[i].update(false);
                    }
                } catch(e) {
                    console.error("Error updating gravity for shape. Shape: "+arguments[i]+", e: "+e);
                    //console.log(JSON.stringify(arguments))
                }
                if (arguments[i].UUID === undefined) { //sanity check!!
                    if (!(i == 0 && (arguments[i] == true || arguments[i] == false))) {
                        console.error("Error drawing: argument "+i+" does not exist or doesn't have a UUID");
                    }
                } else {
                    var bad = false;
                    try {
                        arguments[i].width = arguments[i].mesh[0].length;
                        arguments[i].height = arguments[i].mesh.length;
                    } catch(e) {
                        bad = true;
                        console.error("Error rendering: argument "+i+" doesn't have a width or height property")
                    }
                    if ((arguments[i].width > Physics.width || arguments[i].height > Physics.height) && arguments[i].type != "colorbox") {
                        bad = true;
                        console.error("Error rendering: argument "+i+"'s mesh is too large to fit on screen");
                    }
                    if (bad == false) {
                        var x = constrain(arguments[i].x,0,(Physics.width-arguments[i].width)); //constrain x
                        var y = constrain(arguments[i].y,0,(Physics.height-arguments[i].height)); //constrain y
                        arguments[i].x = x; //fix bug where y position keeps changing
                        arguments[i].y = y;
                        x = Math.round(x);
                        y = Math.round(y);
                        //console.info("x: "+arguments[i].x+", y: "+arguments[i].y+", CONSTx: "+x+", CONSTy: "+y)
                        if (Physics.debugMode){console.info("Shape to be placed at x: "+x+", y: "+y);}
                        if (arguments[i].mesh.length == 0 || arguments[i].colorMesh.length == 0) {
                            console.error("Error rendering: shape has no mesh (or colorMesh) to render!");
                        } else {
                            if (nextFrameReached || clearScreen == false || arguments[i].overrideRenderLimit || true) { //I'll fix the render timing later, it doesn't work
                                var mesh = (Physics.renderInColor) ? arguments[i].colorMesh : arguments[i].mesh;
                                //console.log((Physics.renderInColor || arguments[i].UUID == titleplayer.UUID) ? "Color mesh selected" : "");
                                for (var j=0; j<mesh.length; j++) { //for every line of mesh
                                    if (Physics.renderInColor) {
                                        //Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y][x] += arguments[i].colorMesh[j];
                                        /*if (Physics.renderBuffer[j+y].substr(x, x+1) != " ") {
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, x) + arguments[i].colorMesh[j] + Physics.renderBuffer[j+y].slice(x);
                                        } else {
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(x,arguments[i].colorMesh[j]); //MAKE IT SLICE IN CHARS NOT REPLACE
                                        }*/
                                        Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, x) + arguments[i].colorMesh[j] + Physics.renderBuffer[j+y].slice(x);
                                        //CHANGE SO REMOVES NUMBER OF CHARACTERS THAT WERE REPLACED: Ex. inserts player at certain x, then adds playerx+playerwidth and removes (playerwidth) characters
                                        var endX = arguments[i].x+arguments[i].colorMesh[j].length;
                                        //loop
                                        /*for (var z=0; z<(arguments[i].width || arguments[i].length); z++) {
                                            if (Physics.renderBuffer[j+y].substring(endX+z,endX+z+1) == " ") {
                                                //break;
                                            }
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, endX+z) + Physics.renderBuffer[j+y].slice(endX+z+1);
                                        }*/
                                        // oneliner: Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, endX) + Physics.renderBuffer[j+y].slice(endX+(arguments[i].width || arguments[i].length));
                                        Physics.charsPerFrame+=arguments[i].colorMesh[j].length;
                                        if (Physics.debugMode){console.log("Adding to buffer (COLOR) at x: "+(x)+", y: "+(j+y)+", offset: "+JSON.stringify(colorXOffset)+", j val: "+j+", chars: "+arguments[i].colorMesh[j])}
                                    } else {
                                        for (var b=0; b<mesh[j].length; b++) { //for every character in mesh
                                            try {
                                                Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x,arguments[i].mesh[j][b]);
                                                Physics.charsPerFrame++;
                                            } catch(e) {
                                                console.error("Error while rendering physics buffer for shape "+arguments[i].type+", UUID "+arguments[i].UUID+", x: "+(b+x)+", y: "+(j+y)+", error: "+e);
                                            }
                                            if (Physics.debugMode){console.log("Adding to buffer (non-color) at x: "+(b+x)+", offset: "+JSON.stringify(colorXOffset)+", j val: "+j+", y: "+(j+y)+", char: "+mesh[j][b])}
                                        }
                                    }
                                    
                                }
                            }
                        }
                    }
                }
            }
        }

        var temp = Physics.startString;
        for (var i=0; i<Physics.renderBuffer.length; i++) {
            temp+=Physics.renderBuffer[i]+Physics.defaultNewlineChar;
        }
        if (Physics.charsPerFrame > 0) {
            if (Physics.element.innerHTML != temp) { //only draw if different optimization
                Physics.renderString = Physics.startString;
                for (var i=0; i<Physics.renderBuffer.length; i++) { //write it to string to optimize writing calls
                    Physics.renderString+=Physics.renderBuffer[i]+Physics.defaultNewlineChar;
                }
                Physics.element.innerHTML = Physics.renderString; //draw it!
            }
        }
    },
    /*
    Ideas for making collision more efficient:
        -SPRITE XY TABLES WITH POINTS, ADD X AND Y TO POINTS AND SEE IF THEY INTERSECT done
        -broad phase/narrow phase collision detection to save computing power
    */
    calculate_collisions: function() {
        if (arguments.length < 2) {
            console.error("Error while calculating collisions: there is only one (or none) shape passed into function. COLL_MAIN");
        } else {
            Physics.now = Date.now();
            var elapsed = Physics.now-Physics.nextTick;
            var nextTickReached = (elapsed > (1000/Physics.ticksPerSecond))? true : false;
            if (nextTickReached) {
                Physics.nextTick = Physics.now - (elapsed % (1000/Physics.ticksPerSecond));
            }
            if (nextTickReached) {
                var inefficient = 0;
                Physics.inefficientArr = [];
                for (var i=0; i<arguments.length; i++) {
                    arguments[i].collisionBottom = false;
                    arguments[i].collisionTop = false;
                    arguments[i].collisionRight = false;
                    arguments[i].collisionLeft = false;
                }
                for (var i=0; i<arguments.length; i++) {
                    /*if (arguments[i].updPointTable === undefined || arguments[i].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                        arguments[i].update(); //calculate gravity and updPointTable, as well as center point
                    }*/
                    arguments[i].calculate();
                    for (var j=1; j<arguments.length-1; j++) {
                        /*if (arguments[i].updPointTable === undefined || arguments[j].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                            arguments[j].update(); //calculate gravity and updPointTable
                        }*/
                        if (j==1) {
                            arguments[j].calculate();
                        } //only need to do this for one iteration of j to save computational power
                        if (typeof arguments[i] != "undefined" && typeof arguments[j] != "undefined") {
                            if (arguments[i] !== arguments[j]) {
                                if (Physics.debugMode) {
                                    console.log("Arguments evaluating for collision type: "+arguments[i].type+" "+arguments[j].type);
                                }
                                switch((Physics.moreEfficientPhysics) ? (arguments[i].type+" "+arguments[j].type) : ("nomatch")) { //first try broad methods to simplify computation time by matching against preset scenarios
                                    case "box box":
                                        if (arguments[i].x < arguments[j].x + arguments[j].width && arguments[i].x + arguments[i].width > arguments[j].x && arguments[i].y < arguments[j].y + arguments[j].height && arguments[i].height + arguments[i].y > arguments[j].y) {
                                            Physics.determineCollisionSide(arguments[i],arguments[j]);
                                        }
                                    break;
                                    case "line box":
                                        if (arguments[i].x < arguments[j].x + arguments[j].width && arguments[i].x + arguments[i].length > arguments[j].x && arguments[i].y < arguments[j].y + arguments[j].height && 1 + arguments[i].y > arguments[j].y) {
                                            Physics.determineCollisionSide(arguments[i],arguments[j]);
                                        }
                                    break;
                                    case "box line":
                                        if (arguments[i].x < arguments[j].x + arguments[j].length && arguments[i].x + arguments[i].width > arguments[j].x && arguments[i].y < arguments[j].y + 1 && arguments[i].height + arguments[i].y > arguments[j].y) {
                                            Physics.determineCollisionSide(arguments[i],arguments[j]);
                                        }
                                    break;
                                    case "line line":
                                        if (arguments[i].x < arguments[j].x + arguments[j].length && arguments[i].x + arguments[i].length > arguments[j].x && arguments[i].y < arguments[j].y + 1 && 1 + arguments[i].y > arguments[j].y) {
                                            Physics.determineCollisionSide(arguments[i],arguments[j]);
                                        }
                                    break;
                                    case "circle circle":
                                    break;
                                    case "line circle":
                                    break;
                                    case "circle line":
                                    break;
                                    case "box circle":
                                    break;
                                    case "circle box":
                                    break;
                                    default:
                                        inefficient++;
                                        Physics.inefficientArr[Physics.inefficientArr.length] = arguments[i];
                                        Physics.inefficientArr[Physics.inefficientArr.length] = arguments[j];
                                    break;
                                }
                            }
                            
                        }
                    }
                }
                for (var i=0; i<Physics.inefficientArr.length; i+=2) {
                    if (typeof Physics.inefficientArr[i] != "undefined" && typeof Physics.inefficientArr[i+1] != "undefined") {
                        Physics.calculate_collisions_narrow(Physics.inefficientArr[i],Physics.inefficientArr[i+1]);
                    } else {
                        console.error("COLL_NARROW: Physics coll i+1 val missing, calculating with previous argument");
                        Physics.calculate_collisions_narrow([i],Physics.inefficientArr[i-1]);
                    }
                }
                if (Physics.debugMode) {
                    console.log("Physics collision checking ineffifiency: "+((inefficient/(arguments.length**2))*100)+"%, inefficiently processed args: "+inefficient+", args: "+arguments.length);
                }
                Physics.collisionEfficiency = 100-((inefficient/(arguments.length**2))*100);
            }
        }

        //memory of which blocks are different from part of rendering
    },
    calculate_collisions_mid: function() {

    },
    calculate_collisions_narrow: function() {
        //console.log(arguments.length)
        if (arguments.length < 2) {
            console.error("Error while calculating collisions: there is only one (or none) shape passed into function. COLL_NARROW");
        } else {
            for (var i=0; i<arguments.length; i++) {
                /*if (arguments[i].updPointTable === undefined || arguments[i].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                    arguments[i].update(); //calculate gravity and updPointTable, as well as center point
                }*/
                //arguments[i].calculate();
                for (var j=1; j<arguments.length; j++) {
                    /*if (arguments[i].updPointTable === undefined || arguments[j].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                        arguments[j].update(); //calculate gravity and updPointTable
                    }*/
                    //arguments[j].calculate();
                    for (var b=0; b<arguments[i].updPointTable.length; b++) {
                        for (var z=0; z<arguments[j].updPointTable.length; z++) {
                            //console.log(typeof (arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]))
                            //old check && ((arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]).between(-Physics.collisionAccuracy,Physics.collisionAccuracy) && (arguments[i].updPointTable[b][1]-arguments[j].updPointTable[z][1]).between(-Physics.collisionAccuracy,Physics.collisionAccuracy))
                            //console.log((arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]));
                            //new check (((arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]) < Physics.collisionAccuracy) && (arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]) > -Physics.collisionAccuracy))
                            var xdist = (arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]);
                            var ydist = (arguments[i].updPointTable[b][1]-arguments[j].updPointTable[z][1]);
                            if (((xdist > -Physics.collisionAccuracy && xdist < Physics.collisionAccuracy) && (ydist > -Physics.collisionAccuracy && ydist < Physics.collisionAccuracy)) && arguments[i].UUID != arguments[j].UUID) { //make sure uuids are different so that shapes can't collide with themselves
                                if (Physics.debugMode) {
                                    console.log("Collision detected between "+arguments[i].type+" (UUID: "+arguments[i].UUID+") and "+arguments[j].type+" (UUID: "+arguments[j].UUID+"), X1: "+arguments[i].updPointTable[b][0]+", Y1: "+arguments[i].updPointTable[b][1]+", X2: "+arguments[j].updPointTable[z][0]+", Y2: "+arguments[j].updPointTable[z][0]);
                                }

                                Physics.determineCollisionSideFromPoint(arguments[i],arguments[j],b,z);
                            }
                        }
                    }
                }
            }
        }
    },
    determineCollisionSideFromPoint: function(shape,shape2,shape1ind,shape2ind) {
        //calc collision side for first shape
        if (shape.collide) {
            if (shape.collisionRight == false && shape.collisionLeft == false) {
                if (shape.updPointTable[shape1ind][0] <= shape.centerPoint[0]) { //if x pos collision of first shape is less than center (left collision)
                    shape.collisionRight = false;
                    shape.collisionLeft = true;
                } else if (shape.updPointTable[shape1ind][0] > shape.centerPoint[0]) { //collision right
                    shape.collisionRight = true;
                    shape.collisionLeft = false;
                } else {
                    console.error("Error calculating collision side from collision (x axis), try running update on shape "+shape.type+", UUID "+shape.UUID);
                    shape.calculate();
                }
            }

            if (shape.collisionTop == false && shape.collisionBottom == false) {
                if (shape.updPointTable[shape1ind][1] <= shape.centerPoint[1] || shape.y+shape.height == Physics.height) { //if y pos collision of first shape is less than center (bottom collision) or __exact center__!
                    shape.collisionBottom = true;
                    shape.collisionTop = false;
                } else if (shape.updPointTable[shape1ind][1] > shape.centerPoint[1]) { //collision top
                    shape.collisionBottom = false;
                    shape.collisionTop = true;
                } else {
                    console.error("Error calculating collision side from collision (y axis), try running update on shape "+shape.type+", UUID "+shape.UUID);
                    shape.calculate();
                }
            }
        }

        //calc collision side for second shape
        if (shape2.collide) {
            if (shape2.collisionRight == false && shape2.collisionLeft == false) {
                if (shape2.updPointTable[shape2ind][0] <= shape2.centerPoint[0]) { //if x pos collision of first shape is less than center (left collision)
                    shape2.collisionRight = false;
                    shape2.collisionLeft = true;
                } else if (shape2.updPointTable[shape2ind][0] > shape2.centerPoint[0]) { //collision right
                    shape2.collisionRight = true;
                    shape2.collisionLeft = false;
                } else {
                    console.error("Error calculating collision side from collision (x axis), try running update on shape "+shape2.type+", UUID "+shape2.UUID+"Point X: "+shape2.updPointTable[shape1ind][0]+", center X: "+shape2.centerPoint[0]);
                    shape2.calculate();
                }
            }

            if (shape2.collisionTop == false && shape2.collisionBottom == false) {
                if (shape2.updPointTable[shape2ind][1] <= shape2.centerPoint[1] || shape2.y+shape2.height == Physics.height) { //if y pos collision of first shape is less than center (bottom collision) or __exact center__!
                    shape2.collisionBottom = true;
                    shape2.collisionTop = false;
                } else if (shape2.updPointTable[shape2ind][1] > shape2.centerPoint[1]) { //collision top
                    shape2.collisionBottom = false;
                    shape2.collisionTop = true;
                } else {
                    console.error("Error calculating collision side from collision (y axis), try running update on shape "+shape2.type+", UUID "+shape2.UUID);
                    shape2.calculate();
                }
            }
        }

        if (Physics.debugMode) {
            console.log("Shape 1 updPointTable "+JSON.stringify(shape.updPointTable[shape1ind])+", Shape 2 updPointTable "+JSON.stringify(shape2.updPointTable[shape2ind])+", Shape 1 centerPoint "+JSON.stringify(shape.centerPoint)+", Shape 2 centerPoint "+JSON.stringify(shape2.centerPoint)+", Shape 1 collide "+shape.collide+", Shape 2 collide "+shape2.collide)
        }
    },
    determineCollisionSide: function(shape1, shape2) {
        if (shape1.centerPoint[0] <= shape2.centerPoint[0]) {
            shape1.collisionLeft = true;
            shape1.collisionRight = false;

            shape2.collisionRight = true;
            shape2.collisionLeft = false;
        }
        if (shape1.centerPoint[0] <= shape2.centerPoint[0]) {
            shape1.collisionBottom = true;
            shape1.collisionTop = false;

            shape2.collisionTop = true;
            shape2.collisionBottom = false;
        }
    },
    init: function() {
        setTimeout(function(){
            //console.clear();
            console.typeable("debugon","console.log(\"Type debugon into the console to enable debug mode. (Warning: there is about 1000 debug messages outputted per second)\");","console.log(\"Debug mode active.\"); Physics.debugMode = true;");
            console.typeable("debugoff","console.log(\"Type debugoff into the console to disable debug mode.\");","console.log(\"Debug mode disabled.\"); Physics.debugMode = false;");
            console.typeable("collisioncheck","console.log(\"Type collisioncheck into the console to test collisions. (mostly for me) Note that the object being tested must be named \'player\'.\");","console.log(\"Testing collisions...\"); player.y = 1000; player.x = -1000; Physics.render(platform,platform2,platform3,player,tri); Physics.calculate_collisions(platform,platform2,platform3,player,tri); console.log(\"Player colliding: bottom: \"+player.collisionBottom+\", top: \"+player.collisionTop+\", right: \"+player.collisionRight+\", left: \"+player.collisionLeft); setTimeout(function(){player.y = 10; player.x = 10; Physics.render(platform,platform2,platform3,player,tri); Physics.calculate_collisions(platform,platform2,platform3,player,tri); console.log(\"Player still colliding: bottom: \"+player.collisionBottom+\", top: \"+player.collisionTop+\", right: \"+player.collisionRight+\", left: \"+player.collisionLeft);},100);");
            console.typeable("debug2s","console.log('Type debug2s into the console to perform auto-test of code for 2s and then stop it. (Mostly for debugging broken things in render loop)');","console.clear(); fpsInterval = 0; debugon; setFPS(1); setTimeout(function(){fpsInterval = 0; debugoff;},2000);");
            //console.typeable("stop","console.log('Type stop into the console to stop the game.');","fpsInterval = 0;")
        },500);

        Physics.element.style.lineHeight = String(Physics.lineHeight);
        Physics.height = Math.round(window.innerHeight*(Physics.lineHeight-0.53));
        Physics.width = Math.round(window.innerWidth*(Physics.lineHeight-0.523));
        Physics.bodyFontSize = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size'));
    },
    clear: function() {
        Physics.renderBuffer = [];
        Physics.collisionBuffers = [];
        Physics.element.innerHTML = "";
    },
    renderLoop: function(opts) {
        var args = arguments;
        opts.fps = opts.fps || 60;
        if (typeof opts.collision == "undefined") {
            opts.collision = true;
        }
        if (typeof opts.onFrame == "undefined") {
            opts.onFrame = function(){};
            opts.executeOnFrame = false;
        } else {
            opts.executeOnFrame = true;
        }
        if (typeof opts.clear == "undefined") {
            opts.clear = true;
        }
        opts.queueNum = Physics.renderLoopNext;
        Physics.renderLoopPasts[opts.queueNum] = Date.now();
        this.options = opts;
        var _this = this;

        this._this = this;
        this.args = args;
        this.firstRun = true;

        function createRenderLoop(_this, queuenum, args) { //this is going to get a little twisted to be able to pass variables from this to setinterval
            _this.loopNum = setInterval(function(){
                var fpsInterval = 1000/_this.options.fps;
                var now = Date.now();
                var then = Physics.renderLoopPasts[queuenum];
                var elapsed = now - then;
                if (elapsed > fpsInterval) {
                    Physics.renderLoopPasts[queuenum] = now - (elapsed % fpsInterval);
                    var renderstr = "Physics.render("+_this.options.clear+",";
                    var firstrunstr;
                    if (_this.firstRun) {
                        var firstrunstr = "Physics.render(true,";
                    }
                    var collisionstr = "Physics.calculate_collisions(";
                    for (var i=1; i<args.length; i++) {
                        if (Physics.debugMode) {console.log("args into renderloop i: "+i+", arg: "+JSON.stringify(args[i]));}
                        renderstr+="Physics.renderLoopShapes["+args[i].shapeArrayNum+"],";
                        if (_this.firstRun) {
                            firstrunstr+="Physics.renderLoopShapes["+args[i].shapeArrayNum+"],";
                        }
                        collisionstr+="Physics.renderLoopShapes["+args[i].shapeArrayNum+"],";
                    }
                    renderstr = renderstr.substring(0, renderstr.length-1);
                    collisionstr = collisionstr.substring(0, collisionstr.length-1);
                    if (_this.firstRun) {
                        firstrunstr = firstrunstr.substring(0, firstrunstr.length-1);
                        firstrunstr+=");";
                        console.log("firstrun:"+firstrunstr)
                        eval(firstrunstr);
                        _this.firstRun = false;
                    }
                    renderstr+=");";
                    collisionstr+=");";
                    if (Physics.debugMode) {console.log(renderstr);}
                    eval(renderstr);
                    //console.log(JSON.stringify(_this.options))
                    if (_this.options.collision) {
                        eval(collisionstr);
                    }
                    if (_this.options.executeOnFrame) {
                        try {
                            _this.options.onFrame();
                        } catch(e) {
                            _this.options.executeOnFrame = false;
                            console.error("Error executing onFrame function for renderLoop. E: "+e+", RENDERLOOP_LOOP");
                        }
                    }
                }
            },0);
        }
        //createRenderLoop(this, this.options.queueNum, this.args);
        this.start = function() {
            createRenderLoop(this, this.options.queueNum, this.args); //pass the args to the function
        }
        this.stop = function() {
            try{
                clearInterval(this.loopNum);
            } catch(e) {
                console.error("Error stopping renderLoop. E: "+e+", RENDERLOOP_MAIN")
            }
        }
        Physics.renderLoopNext++;

    }
}

Physics.shape.prototype.update = function(render) {
    this.calculate();

    var deltaTime = (Physics.forceAverageDelta) ? ((Physics.oldDelta+((Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond)))/2) : (Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond); //calculate deltatime as ratio between tme since last update and updates per second vs calculate deltatime since last frame as ratio between time between last update and updates per second averaged with the last frames delta to redce spikes
    Physics.oldDelta = deltaTime; //average delta to avoid spikes

    var frictionRatio = 1 / (0.3 + (deltaTime * Physics.frictionConstant));
    var gravityRatio = 1 / (0.7 + (deltaTime * Physics.gravitationalConstant));

    render = render || false;
    if (this.gravity === undefined || this.momentumX === undefined || this.momentumY === undefined) {
            console.error("Object passed in to update function has no gravity constants");
    } else {
        if (this.gravity || Physics.allGravity) {
            this.momentumX = constrain(this.momentumX,-Physics.terminalVelocity,Physics.terminalVelocity);
            this.momentumY = constrain(this.momentumY,-Physics.terminalVelocity,Physics.terminalVelocity);
            if (this.y+this.height == Physics.height) {
                this.momentumY = 0;
            }
            if (this.x+this.width == Physics.width) {
                this.momentumX = 0;
            }
            //this.momentumX *= frictionRatio;
            //this.momentumY *= gravityRatio;
            var gconst = 0.99;
            var fconst = 0.99;

            this.y += ((Physics.enableDeltaTimeCalculations)? ((!Physics.simpleDeltaCalculations) ? (this.momentumY * (gconst**(deltaTime*deltaTime)-1) / (deltaTime*Math.log(gconst))) : (this.momentumY * deltaTime)) : this.momentumY); //calculate position change as integral from 0 to dt of (velocity * (drag^(x*dt)))dx
            this.x += ((Physics.enableDeltaTimeCalculations) ? ((!Physics.simpleDeltaCalculations) ? (this.momentumX * (fconst**(deltaTime*deltaTime)-1) / (deltaTime*Math.log(fconst))) : (this.momentumX * deltaTime)) : this.momentumX);
            if (Physics.debugMode) {
                console.log("Complex calculations for x pos change: "+String((this.momentumX * (fconst**(deltaTime*deltaTime)-1) / (deltaTime*Math.log(fconst))))+" Simple calculations for x pos change: "+(this.momentumX * deltaTime));
                console.log("Complex calculations for y pos change: "+String((this.momentumY * (gconst**(deltaTime*deltaTime)-1) / (deltaTime*Math.log(gconst))))+" Simple calculations for y pos change: "+(this.momentumY * deltaTime));
                console.log("Δtime: "+deltaTime);
            }

            if (this.collisionBottom || this.collisionTop) {
                /*if (this.momentumY > 0) { //old system
                    this.momentumY = -Physics.gravitationalConstant;
                } else {
                    this.momentumY -= 0.5;
                }*/
                this.momentumY = -0.25; //new system
            } else {
                if (this.momentumY <= Physics.terminalVelocity || this.momentumY >= -Physics.terminalVelocity) {
                    this.momentumY = this.momentumY+Physics.gravitationalConstant;
                }

                /*if (this.collisionRight) { //only do x check if y is stable to prevent drifting
                    this.momentumX = Physics.frictionConstant;
                } else if (this.collisionLeft) {
                    this.momentumX = -Physics.frictionConstant;
                }*/
                if (this.collisionRight || this.collisionLeft) {
                    this.momentumX = 0;
                }
            }
            if (this.momentumX < Physics.frictionConstant && this.momentumX > -Physics.frictionConstant) { //fix for glitch where momentum will be less than constant and oscillation occurs
                this.momentumX = 0;
            }
            if (this.momentumY < Physics.gravitationalConstant && this.momentumY > Physics.gravitationalConstant) {
                this.momentumY = 0;
            }
            if (this.collisionRight == false || this.collisionLeft == false) {
                if (this.momentumX <= Physics.terminalVelocity && this.momentumX >= -Physics.terminalVelocity) {
                    if (this.momentumX > 0) {
                        this.momentumX = this.momentumX-Physics.frictionConstant;
                    } else if (this.momentumX < 0) {
                        this.momentumX = this.momentumX+Physics.frictionConstant;
                    }
                }
            }
        }
        if (this.height+this.y == Physics.height) {
            this.momentumY = -2;
        }
    }

    Physics.lastUpdate = Date.now();
    if (render) {
        Physics.render(false,this);
    }
}

Physics.shape.prototype.calculate = function() {
    if (this.pointTable === undefined || this.updPointTable === undefined) {
        console.error("No point table or updatePointTable object found")
    } else {
        this.updPointTable = [];
        for (var i=0; i<this.pointTable.length; i++) {
            this.updPointTable[i] = [];
            if (this.pointTable[i].length == 2) {
                this.updPointTable[i][0] = this.pointTable[i][0]+this.x;
                this.updPointTable[i][1] = this.pointTable[i][1]+this.y;
            } else {
                console.error("Point table i:"+i+" has an invalid point length, not 2");
            }
        }
    }
    this.centerPoint = [(this.updPointTable[0][0]+(0.5*(this.width || this.radius || this.length || this.height || 0))),(this.updPointTable[0][1]+(0.5*(this.height || this.radius || this.length || this.width || 0)))];
}

Physics.shape.prototype.regenColorMesh = function(newColor) {
    this.colorMesh = [];
    this.color = newColor;
    for (var i=0; i<this.mesh.length; i++) {
        this.colorMesh[i] = "";
        for (var j=0; j<this.mesh[i].length; j++) {
            if (this.type == "custom" && this.mesh[i][j] !== " ") {
                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.mesh[i][j]+"</span>";
            } else if (this.mesh[i][j] == this.character) {
                this.colorMesh[i]+= "<span style='color: "+this.color+";'>"+this.character+"</span>";
            } else {
                this.colorMesh[i]+=Physics.defaultSpaceChar;
            }
        }
    }
}

var play = [];
var timeSinceUpKey;
var timeBetweenJumps = 900;
var lastKeyPress = Date.now();
var map = {};
Physics.shape.prototype.control = function() {
    play = this;
    window.onkeydown = window.onkeyup = function(e) {
        var e = window.event ? window.event : e;
        map[e.keyCode] = e.type == 'keydown';
        if (map["37"] || map["38"] || map["39"] || map["40"]) {
            e.preventDefault();
        }
        if (map["38"]) { //up
            timeSinceUpKey = Date.now()-lastKeyPress;
            if (play.momentumY < Physics.gravitationalConstant && timeSinceUpKey > timeBetweenJumps) {
                lastKeyPress = Date.now();
                play.y-=2;
                setTimeout(function(){
                    play.momentumY = -3;
                },50);
            } else if (lvlnum == 0 || lvlnum == "title") {
                play.momentumY = -2.5;
            }
        }
        if (map["40"]) { //down
            if (play.y+play.height == Physics.height || play.momentumY < Physics.gravitationalConstant) {
                play.momentumY = 3;
            } else if (lvlnum == 0 || lvlnum == "title") {
                play.momentumY = 3;
            }
        }
        if (map["37"]) { //left
            if (play.momentumX < Physics.terminalVelocity && play.momentumX > -Physics.terminalVelocity) {
                play.momentumX = -3;
            }
        }
        if (map["39"]) { //right
            if (play.momentumX < Physics.terminalVelocity && play.momentumX > -Physics.terminalVelocity) {
                play.momentumX = 3;
            }
        }
    }
}

