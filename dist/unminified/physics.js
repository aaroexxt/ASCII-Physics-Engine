/*
* physics.js by Aaron Becker
* A complete ASCII physics and rendering engine written in JavaScript
*/

/*
 * Copyright (c) 2018 Aaron Becker
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var notLoadedVectors = []; //array to store vector calls that doesn't work because Physics is not initialized yet
function notLoadedVector(obj,x,y) { //dummy class that pushes to list
    notLoadedVectors.push([obj,x,y]);
    return false;
}
var Physics = { //Class to represent all main functions of physics engine
    element: null,
    defaultSpaceChar: " ",
    defaultShapeChar: "*",
    defaultNewlineChar: "<br>",
    startString: "PHYV7:<br><br>",
    //CONSTANTS
    constants: {
        gravitationalConstant: new notLoadedVector("gravitationalConstant",0,0.1), //gravitational constant
        frictionConstant: new notLoadedVector("frictionConstant",1,0), //frictional constant
        weightPerCharacter: 0.0001, //weight is calculated per character
        terminalVelocity: 100 //maximum velocity in any direction
    },
    ticksPerSecond: 60, //limit number of physics calls per second
    updatesPerSecond: 40, //limit number of gravity updates per second
    renderPerSecond: 50, //limit renders performed per second
    renderInColor: false, //very beta (doesn't really work yet)
    //TIMING VARIABLES
    now: Date.now(),
    nextTick: Date.now(),
    nextUpdate: Date.now(),
    nextRender: Date.now(), //currently disabled because of problems with timing, go to line 279 to change this (line may change as I remove/add code)
    lastUpdate: Date.now(),
    oldDelta: 0,
    currentFPS: 0,
    //PHYSICS CONSTANTS
    dynamicPhysics: true, //can help mitigate low framerates by making physics work over a dynamic timescale
    simpleDeltaCalculations: true, //use simple (fast) or complex (slow) calculations for delta time
    forceAverageDelta: false, //force delta time frame calculation to average over multiple frames (more stable in general, lag spikes are not handeled as well though)
    moreEfficientPhysics: true, //beta and kind of works, implements AABB collision to avoid having to do narrow collision for everything
    //GENERAL CONSTANTS
    debugMode: false, //enables a LOT of debug messages
    allGravity: false, //force all rendered shapes to have gravity (funny in games)
    recalculateWeightOnFrame: true, //recalculate weight for shape on every frame vs on creation of shape (don't use with lots of shapes)
    updateColorMeshOnVectorChange: true, //update color mesh for vector on update (not needed if color rendering is disabled)
    regenColorMeshOnRender: false, //updates color mesh for shape after rendering it if set to true
    width: window.innerWidth,
    height: window.innerHeight,
    lineHeight: 0.65,
    initialLineHeight: 0.83,
    collisionAccuracy: 0.5, //maximum difference for narrow collision between pixels
    ignoreMeshSize: false, //DO NOT ENABLE UNLESS YOU ARE TESTING (disables error checking for rendering shapes that are too large or small)
    stopRenderFunctionOnError: true, //stop running onFrame function of renderLoop on error
    trimMeshOnShapeCreation: true, //trim shape mesh on creation to save space
    useMeshOptimizationWhenCombining: true, //attempt to optimize meshes on combine shapes, if set to false will just trim mesh. Optimization is slower than trimming, set to false if combining shapes on every frame (vector angle displays)
    //MISC
    collisionEfficiency: -1, //tracks how efficient the collision detection is
    inefficientArr: [],
    bodyFontSize: 16,
    renderBuffer: [], //buffer which holds shapes to be drawn
    renderString: [],
    charsPerFrame: 0,
    //RENDER LOOP VARIABLES
    renderLoopPasts: [], //past shapes in render loop
    renderLoopNext: 0,
    //MAIN FUNCTIONS
    /**
    * Constructor for 2d shape
    * @constructor
    */
    shape: function(type, options) {
        if (type === undefined || options === undefined) {
            throw new Error("Type or options nonexistent when constructing shape");
        } else {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.originalMesh = [];
            this.colorMesh = [];
            this.onlyWriteNonemptyPixels = options.onlyWriteNonemptyPixels;
            if (typeof this.onlyWriteNonemptyPixels == "undefined") {
                this.onlyWriteNonemptyPixels = true;
            }
            this.replaceWithSpace = options.replaceWithSpace || false;
            if (typeof this.replaceWithSpace == "undefined") {
                this.replaceWithSpace = false;
            }
            this.color = options.color || "black";
            if (typeof this.color === "undefined") {
                this.color = "black";
            }

            this.UUID = generateUUID();
            this.physics = options.physics || false;
            if (typeof this.physics === "undefined" || typeof options.physics === "undefined") {
                this.physics = false;
            }
            this.velocity = new Physics.util.vec2d(0,0); //use new vector system!
            this.acceleration = new Physics.util.vec2d(0,0);
            this.position = new Physics.util.vec2d(this.x,this.y);

            this.coefficients = {
                drag: 0.47,
                staticFrictionCutoff: 0.3, //great table at https://www.school-for-champions.com/science/friction_sliding_coefficient.htm
                kineticFriction: 0.48, //we will assume that the materials are oak on oak wood
                rollingFriction: 0.002,
                angularDamping: -1,
                mu: 0.01, //friction
                J: -1
            }
            this.rotation = {
                alpha: 0,
                omega: 0,
                theta: 0 //rotation in radians
            }

            this.collide = options.collide;
            if (typeof this.collide === "undefined") {
                this.collide = true;
            }
            this.overrideRenderLimit = options.overrideRenderLimit || false;
            if (typeof this.overrideRenderLimit === "undefined") {
                this.overrideRenderLimit = false;
            }

            if (typeof options.enableUp == "undefined") {
                options.enableUp = true;
            }
            if (typeof options.enableDown == "undefined") {
                options.enableDown = true;
            }
            if (typeof options.enableLeft == "undefined") {
                options.enableLeft = true;
            }
            if (typeof options.enableRight == "undefined") {
                options.enableRight = true;
            }
            this.overrideSpacesInCustomShape = options.overrideSpacesInCustomShape || false;
            if (typeof this.overrideSpacesInCustomShape) {
                this.overrideSpacesInCustomShape = false;
            }
            this.enableUp = options.enableUp;
            this.enableDown = options.enableDown;
            this.enableLeft = options.enableLeft;
            this.enableRight = options.enableRight;

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
            if (type == "rect") {
                this.height = options.height || 10;
                this.width = options.width || 10;
                this.filled = options.filled;
                if (typeof this.filled === "undefined") {
                    this.filled = true;
                }
                if (this.filled) {
                    for (var i=0; i<this.height; i++) {
                        this.originalMesh[i] = "";
                        this.colorMesh[i] = [];
                        for (var j=0; j<this.width; j++) {
                            this.originalMesh[i]+=this.character;
                            this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                } else {
                    for (var i=0; i<this.height; i++) {
                        this.originalMesh[i] = "";
                        this.colorMesh[i] = [];
                        for (var j=0; j<this.width; j++) {
                            if ((i == 0 || i == (this.height-1)) || (j == 0 || j == (this.width-1))) {
                                this.originalMesh[i]+=this.character;
                                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.originalMesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i].push(Physics.defaultSpaceChar);
                            }
                        }
                    }
                }
            } else if (type == "line") { //regular flat
                this.length = options.length || 10;
                this.originalMesh[0] = "";
                this.colorMesh[0] = [];
                for (var i=0; i<this.length; i++) {
                    this.originalMesh[0]+=this.character;
                    this.colorMesh[0].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                    this.pointTable[this.pointTable.length] = [i,0];
                }
            } else if (type == "bline") { //bresenham's algorithm line
                this.x1 = options.x1 || 0;
                this.x2 = options.x2 || 5;
                this.y1 = options.y1 || 0;
                this.y2 = options.y2 || 5;
                var line = Physics.util.line(new Physics.util.point2d(this.x1, this.y1), new Physics.util.point2d(this.x2, this.y2));
                var mesh = Physics.util.coords2mesh(line,this.character);
                var trim = Physics.util.optimizeMesh(mesh.originalMesh);
                this.originalMesh = trim.originalMesh;
                this.x+=trim.x;
                this.y+=trim.y;
                this.width = 0;
                this.height = trim.originalMesh.length;
                for (var i=0; i<trim.originalMesh.length; i++) {
                    if (trim.originalMesh[i].length > this.width) {
                        this.width = trim.originalMesh[i].length;
                    }
                    this.colorMesh[i] = [];
                    for (var j=0; j<trim.originalMesh[i].length; j++) {
                        if (trim.originalMesh[i][j] == " ") {
                            this.colorMesh[i].push(" ");
                        } else {
                            this.colorMesh[i].push("<span style='color: "+this.color+";'>"+trim.originalMesh[i][j]+"</span>");
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                }
            } else if (type == "triangle") {
                this.height = options.height || options.width/2;
                this.width = options.width || options.height*2;

                for (var i=0; i<this.height; i++) { //generate blank mask as a square
                    this.originalMesh[i] = "";
                    this.colorMesh[i] = [];
                    for (var j=0; j<this.width; j++) {
                        this.originalMesh[i]+=Physics.defaultSpaceChar;
                        this.colorMesh[i].push(Physics.defaultSpaceChar);
                    }
                }
                var start = this.width/2;
                var amount = 1;
                for (var i=0; i<this.height; i++) {
                    for (var j=0; j<amount; j++) {
                        this.originalMesh[i] = this.originalMesh[i].replaceAt((start+j),this.character);
                        this.colorMesh[i].push(this.originalMesh[i].replaceAt((start+j),"<span style='color: "+this.color+";'>"+this.character+"</span>"));
                        this.pointTable[this.pointTable.length] = [i,j];
                    }
                    start-=1;
                    amount+=2;
                }
            } else if (type == "custom") {
                if (typeof options.mesh === "undefined" || typeof options.mesh !== "object") {
                    console.error("[SHAPE_CONSTRUCT] Mesh for custom object is undefined");
                } else {
                    this.width = 0;
                    this.height = options.mesh.length;
                    for (var i=0; i<options.mesh.length; i++) {
                        this.originalMesh[i] = [];
                        this.colorMesh[i] = [];
                        if (options.mesh[i].length > this.width) {
                            this.width = options.mesh[i].length;
                        }
                        for (var j=0; j<options.mesh[i].length; j++) {
                            this.originalMesh[i] += options.mesh[i][j];
                            if (options.mesh[i][j] == " " && this.overrideSpacesInCustomShape === true) {
                                this.colorMesh[i].push(" ");
                            } else {
                                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+options.mesh[i][j]+"</span>");
                                this.pointTable[this.pointTable.length] = [i,j];
                            }
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
                        this.originalMesh[i] = "";
                        this.colorMesh[i] = [];
                        for (var j=0; j<=2*this.radius; j++) {

                            var offsetx = j;
                            var offsety = i;

                            var dx=centerx-offsetx;
                            var dy=centery-offsety;
                            if ((dx*dx + dy*dy) <= (this.radius*this.radius)) {
                                this.originalMesh[i]+=this.character;
                                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.originalMesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i].push(Physics.defaultSpaceChar);
                            }
                        }
                    }
                } else if (this.filled == "cool") {
                    for (var i=0; i<=2*this.radius; i++) { //draw unfilled circle
                        this.originalMesh[i] = "";
                        this.colorMesh[i] = [];
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.pointTable[this.pointTable.length] = [i,j];
                                this.originalMesh[i]+=this.character;
                                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                            } else {
                                this.originalMesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i].push(Physics.defaultSpaceChar);
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
                            this.originalMesh[rouy] = this.originalMesh[rouy].replaceAt(roux,this.character);
                            this.colorMesh[rouy][roux] = "<span style='color: "+this.color+";'>"+this.character+"</span>";
                        }
                    }
                } else {
                    for (var i=0; i<=2*this.radius; i++) {
                        this.originalMesh[i] = "";
                        this.colorMesh[i] = [];
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.originalMesh[i]+=this.character;
                                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.originalMesh[i]+=Physics.defaultSpaceChar;
                                this.colorMesh[i].push(Physics.defaultSpaceChar);
                            }
                        }
                    }
                }
            } else {
                console.error("[SHAPE_CONSTRUCT] Shape "+this.type+" not found. There may be errors rendering.");
            }
            this.rotate = function(angle,orMesh) {
                if (typeof orMesh == "undefined") {
                    if (typeof this.originalMesh == "undefined") {
                        console.error("[ROTATE_SHAPE] No original mesh to rotate provided and shape does not have original mesh property");
                    } else {
                        orMesh = this.originalMesh;
                    }
                }
                this.mesh = orMesh;
            }
            this.rotate(this.rotation.theta,this.originalMesh);
            if (Physics.trimMeshOnShapeCreation) {
                this.originalMesh = Physics.util.trimMesh(this.originalMesh);
                this.rotate(this.rotation.theta,this.originalMesh);
                this.regenColorMesh(this.color); //regen color mesh
                this.calculate(); //regen pointTable
            }
            this.pointTable.uniqueify(); //remove calls for multiple points
            
            this.calculate(); //update to start gravity and set updated point table
            this.recalculateWeight(); //calculate weight
        }
    },
    /**
    * Constructor for 3d shape
    * @constructor
    */
    shape3d: function(type, options) { //Constructor for 3d shapes

        this.prototype = Object.create(Physics.shape.prototype); //inherit methods from normal shape like update
        this.prototype.constructor = this;

        this.x = options.x || 0;
        this.y = options.y || 0;
        this.z = options.z || 0;
        this.mesh = [];
        this.colorMesh = [];
        this.onlyWriteNonemptyPixels = options.onlyWriteNonemptyPixels;
        if (typeof this.onlyWriteNonemptyPixels == "undefined") {
            this.onlyWriteNonemptyPixels = true;
        }
        this.replaceWithSpace = options.replaceWithSpace || false;
        if (typeof this.replaceWithSpace == "undefined") {
            this.replaceWithSpace = false;
        }
        this.color = options.color || "black";
        if (typeof this.color === "undefined") {
            this.color = "black";
        }

        this.UUID = generateUUID();
        this.physics = options.physics || false;
        if (typeof this.physics === "undefined" || typeof options.physics === "undefined") {
            this.physics = false;
        }
        this.velocity = new Physics.util.vec2d(0,0); //use new vector system!
        this.collide = options.collide;
        if (typeof this.collide === "undefined") {
            this.collide = true;
        }
        this.overrideRenderLimit = options.overrideRenderLimit || false;
        if (typeof this.overrideRenderLimit === "undefined") {
            this.overrideRenderLimit = false;
        }

        if (typeof options.enableUp == "undefined") {
            options.enableUp = true;
        }
        if (typeof options.enableDown == "undefined") {
            options.enableDown = true;
        }
        if (typeof options.enableLeft == "undefined") {
            options.enableLeft = true;
        }
        if (typeof options.enableRight == "undefined") {
            options.enableRight = true;
        }
        this.enableUp = options.enableUp;
        this.enableDown = options.enableDown;
        this.enableLeft = options.enableLeft;
        this.enableRight = options.enableRight;

        this.pointTable = [];
        this.updPointTable = [];
        this.faces = [];
        this.vertices = [];
        this.collisionBottom = false;
        this.collisionTop = false;
        this.collisionRight = false;
        this.collisionLeft = false;

        this.camera = options.camera;
        if (typeof this.camera == "undefined") {
            this.camera = new Physics.orthographicCamera();
        }

        this.character = options.character || Physics.defaultShapeChar;
        if (this.character.length > 1) {
            this.character = this.character.substring(0,1);
        }

        this.type = type;
        if (type == "cube") {
            this.height = options.height || 10;
            this.width = options.width || 10;
            this.depth = options.depth || 10;
            if (typeof this.height == "undefined") {
                this.height = 10;
            }
            if (typeof this.width == "undefined") {
                this.width = 10;
            }
            if (typeof this.depth == "undefined") {
                this.depth = 10;
            }
            var hr = options.height/2;
            var wr = options.width/2;
            var dr = options.depth/2;
            if (typeof hr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Height undefined in options of shape, please set it!");
            }
            if (typeof wr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Width undefined in options of shape, please set it!");
            }
            if (typeof dr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Depth undefined in options of shape, please set it!");
            }
            if (Physics.debugMode) {console.log("[3DSHAPE_CONSTRUCT] Construct 3d shape hr: "+hr+", wr: "+wr+", dr: "+dr+", size: "+((hr+wr+dr)/3))}
            this.center = new Physics.util.point3d(this.x-wr,this.y-hr,this.z-dr);
            this.size = (hr+wr+dr)/3;

            this.updateVertices = function(center,d) {
                this.vertices = [
                    new Physics.util.point3d(center.x - d, center.y - d, center.z + d),
                    new Physics.util.point3d(center.x - d, center.y - d, center.z - d),
                    new Physics.util.point3d(center.x + d, center.y - d, center.z - d),
                    new Physics.util.point3d(center.x + d, center.y - d, center.z + d),
                    new Physics.util.point3d(center.x + d, center.y + d, center.z + d),
                    new Physics.util.point3d(center.x + d, center.y + d, center.z - d),
                    new Physics.util.point3d(center.x - d, center.y + d, center.z - d),
                    new Physics.util.point3d(center.x - d, center.y + d, center.z + d)
                ];
            }
            this.updateVertices(this.center,this.size);
            this.faces = [
                [this.vertices[0], this.vertices[1], this.vertices[2], this.vertices[3]], //front plane
                [this.vertices[3], this.vertices[2], this.vertices[5], this.vertices[4]], //right side plane
                [this.vertices[4], this.vertices[5], this.vertices[6], this.vertices[7]], //back plane
                [this.vertices[7], this.vertices[6], this.vertices[1], this.vertices[0]], //left plane
                [this.vertices[7], this.vertices[0], this.vertices[3], this.vertices[4]], //bottom plane
                [this.vertices[1], this.vertices[6], this.vertices[5], this.vertices[2]] //top plane
            ]; //make list of coords in shape using project and line and then coords2mesh to make it into a mesh to render
        } else if (type == "pyramid") {
            this.height = options.height || 10;
            this.width = options.width || 10;
            this.depth = options.depth || 10;
            if (typeof this.height == "undefined") {
                this.height = 10;
            }
            if (typeof this.width == "undefined") {
                this.width = 10;
            }
            if (typeof this.depth == "undefined") {
                this.depth = 10;
            }
            var hr = options.height/2;
            var wr = options.width/2;
            var dr = options.depth/2;
            if (typeof hr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Height undefined in options of shape, please set it!");
            }
            if (typeof wr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Width undefined in options of shape, please set it!");
            }
            if (typeof dr == "undefined") {
                return console.error("[3DSHAPE_CONSTRUCT] Depth undefined in options of shape, please set it!");
            }
            if (Physics.debugMode) {console.log("[3DSHAPE] Construct 3d shape hr: "+hr+", wr: "+wr+", dr: "+dr+", size: "+((hr+wr+dr)/3))}
            this.center = new Physics.util.point3d(this.x-wr,this.y-hr,this.z-dr);
            this.size = (hr+wr+dr)/3;

            this.updateVertices = function(center,d) {
                this.vertices = [
                    new Physics.util.point3d(center.x - d, center.y - d, center.z + d), //front left
                    new Physics.util.point3d(center.x + d, center.y - d, center.z + d), //front right
                    new Physics.util.point3d(center.x + d, center.y + d, center.z + d), //back right
                    new Physics.util.point3d(center.x - d, center.y + d, center.z + d), //back left
                    new Physics.util.point3d(center.x, center.y + d, center.z) //top
                ];
            }
            this.updateVertices(this.center,this.size);
            this.faces = [
                [this.vertices[3], this.vertices[0], this.vertices[1], this.vertices[2]], //bottom plane lines
                [this.vertices[0], this.vertices[1], this.vertices[4]],
                [this.vertices[0], this.vertices[3], this.vertices[4]],
                [this.vertices[2], this.vertices[3], this.vertices[4]],
                [this.vertices[2], this.vertices[1], this.vertices[4]]
            ];
        } else {
            console.error("[3DSHAPE_CONSTRUCT] Shape "+this.type+"not found. There may be errors rendering.");
        }
        this.rotatePoint = function(center,theta,phi) {
            if (typeof center == "undefined" || typeof theta == "undefined" || typeof phi == "undefined") {
                return console.error("[3DPOINT_ROTCENTER] Theta x, y, or z undefined");
            }
            this.x -= this.vertices[0].x-(this.vertices[0].rotateCenter(center,theta,phi).x);
            this.y -= this.vertices[0].y-(this.vertices[0].rotateCenter(center,theta,phi).y);
            this.z -= this.vertices[0].z-(this.vertices[0].rotateCenter(center,theta,phi).z);
            for (var i=0; i<this.vertices.length; i++) {
                this.vertices[i] = this.vertices[i].rotateCenter(center,theta,phi);
                this.vertices[i].x = Math.round(this.vertices[i].x);
                this.vertices[i].y = Math.round(this.vertices[i].y);
                this.vertices[i].z = Math.round(this.vertices[i].z);
            }
            this.updateCoords();
        }
        this.rotateAxis = function(thetax,thetay,thetaz) {
            if (typeof thetax == "undefined" || typeof thetay == "undefined" || typeof thetay == "undefined") {
                return console.error("[3DPOINT_ROTAXIS] Theta value for x, y, or z undefined");
            }
            this.x -= this.vertices[0].x-(this.vertices[0].rotateAxis(thetax,thetay,thetaz).x);
            this.y -= this.vertices[0].y-(this.vertices[0].rotateAxis(thetax,thetay,thetaz).y);
            this.z -= this.vertices[0].z-(this.vertices[0].rotateAxis(thetax,thetay,thetaz).z);
            for (var i=0; i<this.vertices.length; i++) {
                this.vertices[i] = this.vertices[i].rotateAxis(thetax,thetay,thetaz);
                this.vertices[i].x = Math.round(this.vertices[i].x);
                this.vertices[i].y = Math.round(this.vertices[i].y);
                this.vertices[i].z = Math.round(this.vertices[i].z);
            }
            this.updateCoords();
        }
        this.dilate = function(mult) {
            if (typeof mult == "undefined") {
                return console.error("[3DPOINT_DILATE] Multiplier undefined");
            }
            this.x -= this.vertices[0].x-(this.vertices[0].x*mult);
            this.y -= this.vertices[0].y-(this.vertices[0].y*mult);
            this.z -= this.vertices[0].z-(this.vertices[0].z*mult);
            for (var i=0; i<this.vertices.length; i++) {
                this.vertices[i].x = Math.round(this.vertices[i].x*mult);
                this.vertices[i].y = Math.round(this.vertices[i].y*mult);
                this.vertices[i].z = Math.round(this.vertices[i].z*mult);
            }
            this.updateCoords();
        }
        this.translate = function(x,y,z) {
            if (typeof x == "undefined") {
                x = 0;
            }
            if (typeof y == "undefined") {
                y = 0;
            }
            if (typeof z == "undefined") {
                z = 0;
            }
            this.x+=x;
            this.y+=y;
            this.z+=z;
            for (var i=0; i<this.vertices.length; i++) {
                this.vertices[i].x = Math.round(this.vertices[i].x+x);
                this.vertices[i].y = Math.round(this.vertices[i].y+y);
                this.vertices[i].z = Math.round(this.vertices[i].z+z);
            }
            this.updateCoords();
        }
        this.updateCoords = function() {
            if (this.faces.length < 1) {
                return console.error("[3DSHAPE_UPDATECOORDS] Faces length is less than 1")
            }
            var coords = [];
            for (var i = 0, n_faces = this.faces.length; i < n_faces; i++) {
                // Current face
                var face = this.faces[i];

                // Set up the first vertex and project
                var sP = this.camera.project(face[0]);
                //sP.x += Physics.width/2;
                //sP.y = -sP.y + Physics.height/2;

                // Draw the other vertices
                for (var j = 1, n_vertices = face.length; j < n_vertices+1; ++j) {
                    var fP;
                    if (j == n_vertices) {
                        fP = this.camera.project(face[0]); //if last, project back to first face
                    } else {
                        var fP = this.camera.project(face[j]); //project new faces
                    }
                    //fP.x += Physics.width/2;
                    //fP.y = -fP.y + Physics.height/2;
                    var vcoord = Physics.util.line(sP, fP); //draw a line
                    if (Physics.debugMode) {console.log("[3DSHAPE_UPDATECOORDS] sP: "+JSON.stringify(sP)+", fP: "+JSON.stringify(fP)+", face: "+i+", vertice: "+j+", vcoord: "+JSON.stringify(vcoord));}
                    //coords.push(vcoord);
                    for (var k = 0; k<vcoord.length; k++) { //push coords to array
                        coords.push(vcoord[k]);
                        /*if (vcoord.length < 100) {
                            console.log("vc->"+vcoord[k]);
                        }*/
                    }

                    sP = JSON.parse(JSON.stringify(fP)); //set previous coord to current
                }
            }
            this.coords = coords;
            var shape = Physics.util.coords2mesh(coords,"*");
            this.mesh = shape.mesh;
            this.pointTable = shape.pointTable;
            this.colorMesh = [""];
        }
        this.updateCoords(); //update coords
        if (Physics.trimMeshOnShapeCreation) {
            this.mesh = Physics.util.trimMesh(this.mesh); //trim mesh to save space
            this.regenColorMesh(this.color); //regen color mesh
            this.calculate(); //regen pointTable
        }
        this.pointTable.uniqueify(); //remove calls for multiple points
        this.calculate(); //update to start gravity and set updated point table
        this.recalculateWeight(); //calculate weight
    },
    cameras: { //Object to hold different kinds of cameras for projection
        /**
        * Orthographic camera
        * @constructor
        */
        orthographic: function() {
            this.project = function(p) {
                return p.projectOrtho();
            }
        },
        /**
        * Basic camera
        * @constructor
        */
        basic: function() {
            this.project = function(p) {
                return p.projectBasic();
            }
        },
        /**
        * Perspective camera
        * @constructor
        */
        perspective: function(dist) {
            if (typeof dist == "undefined") {
                return console.error("[CAMERA_PERSPECTIVE_SETUP] Distance undefined");
            } else {
                this.distance = dist;
            }
            this.project = function(p) {
                return p.projectDistance(Math.abs(this.distance));
            }
        }
    },
    util: { //Main utility object for things like conversions and vectors
        conversion: {
            conversionMultiplier: (180 / Math.PI),
            radian2degrees: function(rad) {
                return rad * Physics.util.conversion.conversionMultiplier;
            },
            degrees2radian: function(deg) {
                return deg / Physics.util.conversion.conversionMultiplier;
            }
        },
        asciitext: {
            fonts: { //default font is large
                large: { //can't use 'new Physics.shape' because Physics object is not created yet
                    "0" : {mesh:["   ____ ","  / __ \\"," / / / /","/ /_/ / ","\\____/  "], x: 0, y:0, color: "red"}, //0
                    "1" : {mesh:["   ___","  <  /","  / / "," / /  ","/_/   "], x: 0, y:0, color: "orange"}, //1
                    "2" : {mesh:["   ___ ","  |__ \\","  __/ /"," / __/ ","/____/ "], x: 0, y:0, color: "yellow"}, //2
                    "3" : {mesh:["   _____","  |__  /","   /_ < "," ___/ / ","/____/  "], x: 0, y:0, color: "green"}, //3
                    "4" : {mesh:["   __ __","  / // /"," / // /_","/__  __/","  /_/   "], x: 0, y:0, color: "#00ccff"}, //4
                    "5" : {mesh:["    ______","   / ____/","  /___ \\  "," ____/ /  ","/_____/   "], x: 0, y:0, color: "blue"}, //5
                    "6" : {mesh:["   _____","  / ___/"," / __ \\ ","/ /_/ / ","\\____/  "], x: 0, y:0, color: "indigo"}, //6
                    "7" : {mesh:[" _____","/__  /","  / / "," / /  ","/_/   "], x: 0, y:0}, //7
                    "8" : {mesh:["   ____ ","  ( __ )"," / __  |","/ /_/ / ","\\____/  "], x: 0, y:0}, //8
                    "9" : {mesh:["   ____ ","  / __ \\"," / /_/ /"," \\__, / ","/____/  "], x: 0, y:0}, //9
                    " " : {mesh:["  ","  ","  ","  ","  "], x: 0, y:0, overrideSpacesInCustomShape: true}, //space
                    "a" : {mesh:["  ____ _", " / __ \`/", "/ /_/ / ", "\\__,_/  ", "        "], x:0, y:0}, //a
                    "b" : {mesh:["   / /_ ", "  / __ \\", " / /_/ /", "/_.___/ ", "        "], x:0, y:0}, //b
                    "c" : {mesh:["  _____", " / ___/", "/ /__  ", "\\___/  ", "       "], x:0, y:0}, //c
                    "d" : {mesh:["  ____/ /", " / __  / ", "/ /_/ /  ", "\\__,_/   ", "         "], x:0, y:0}, //d
                    "e" : {mesh:["  ___ ", " / _ \\", "/  __/", "\\___/ ", "      "], x:0, y:0}, //e
                    "f" : {mesh:["   / __/", "  / /_  ", " / __/  ", "/_/     ", "        "], x:0, y:0}, //f
                    "g" : {mesh:["   ____ _", "  / __ \`/", " / /_/ / ", " \\__, /  ", "/____/   "], x:0, y:0}, //g
                    "h" : {mesh:["   / /_ ", "  / __ \\", " / / / /", "/_/ /_/ ", "        "], x:0, y:0}, //h
                    "i" : {mesh:["   (_)", "  / / ", " / /  ", "/_/   ", "      "], x:0, y:0}, //i
                    "j" : {mesh:["      (_)", "     / / ", "    / /  ", " __/ /   ", "/___/    "], x:0, y:0}, //j
                    "k" : {mesh:["   / /__", "  / //_/", " / ,<   ", "/_/|_|  ", "        "], x:0, y:0}, //k
                    "l" : {mesh:["   / /", "  / / ", " / /  ", "/_/   ", "      "], x:0, y:0}, //l
                    "m" : {mesh:["   ____ ___ ", "  / __ \`__ \\", " / / / / / /", "/_/ /_/ /_/ ", "            "], x:0, y:0}, //m
                    "n" : {mesh:["   ____ ", "  / __ \\", " / / / /", "/_/ /_/ ", "        "], x:0, y:0}, //n
                    "o" : {mesh:["  ____ ", " / __ \\", "/ /_/ /", "\\____/ ", "       "], x:0, y:0}, //o
                    "p" : {mesh:["    ____ ", "   / __ \\", "  / /_/ /", " / .___/ ", "/_/      "], x:0, y:0}, //p
                    "q" : {mesh:["  ____ _", " / __ \`/", "/ /_/ / ", "\\__, /  ", "  /_/   "], x:0, y:0}, //q
                    "r" : {mesh:["   _____", "  / ___/", " / /    ", "/_/     ", "        "], x:0, y:0}, //r
                    "s" : {mesh:["   _____", "  / ___/", " (__  ) ", "/____/  ", "        "], x:0, y:0}, //s
                    "t" : {mesh:["  / /_", " / __/", "/ /_  ", "\\__/  ", "      "], x:0, y:0}, //t
                    "u" : {mesh:["  __  __", " / / / /", "/ /_/ / ", "\\__,_/  ", "        "], x:0, y:0}, //u
                    "v" : {mesh:[" _   __", "| | / /", "| |/ / ", "|___/  ", "       "], x:0, y:0}, //v
                    "w" : {mesh:[" _      __", "| | /| / /", "| |/ |/ / ", "|__/|__/  ", "          "], x:0, y:0}, //w
                    "x" : {mesh:["   _  __", "  | |/_/", " _>  <  ", "/_/|_|  ", "        "], x:0, y:0}, //x
                    "y" : {mesh:["   __  __", "  / / / /", " / /_/ / ", " \\__, /  ", "/____/   "], x:0, y:0}, //y
                    "-" : {mesh:["       "," ______","/_____/","       ","       "], x:0, y:0}, //-
                    "_" : {mesh:["       ","       ","       "," ______","/_____/"], x:0, y:0}, //_
                    "+" : {mesh:["    __ "," __/ /_","/_  __/"," /_/   ","       "], x:0, y:0}, //+
                    "*" : {mesh:["  __/|_"," |    /","/_ __| "," |/    ","       "], x:0, y:0}, //*
                    "/" : {mesh:["     _/_/","   _/_/  "," _/_/    ","/_/      ","         "], x:0, y:0}, ///
                    "." : {mesh:["   ","   "," _ ","(_)","   "], x:0, y:0}, //.
                    "lvl" : {mesh:["    __                   __","   / /   ___ _   _____  / /","  / /   / _ \\ | / / _ \\/ / "," / /___/  __/ |/ /  __/ /  ","/_____/\\___/|___/\\___/_/   "], x: 0, y:0} //level
                }
            },
            /* Script to make fonts in mesh format from website 'http://patorjk.com/software/taag'. Simply take value from font array and plug into mesh value in new custom shape
            if (typeof font === "undefined") {var font = []; } font.push(JSON.stringify(document.getElementById("taag_output_text").innerHTML.replace(/\\/g, "\\\\").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/`/g, "\\`").replace(/\"/g, "\\\"").replace(/\'/g, "\\\'").split("\n").slice(1)))
            */
            extranums: [],
            init: function() {
                var keys = Object.keys(Physics.util.asciitext.fonts);
                for (var i=0; i<keys.length; i++) { //for every font in list
                    var keysfont = Object.keys(Physics.util.asciitext.fonts[keys[i]]);
                    for (var j=0; j<keysfont.length; j++) { //for every number from font in list
                        var item = Physics.util.asciitext.fonts[keys[i]][keysfont[j]];
                        if (Physics.debugMode) {
                            console.log("[ASCII_TXT_INIT] character in: "+JSON.stringify(item));
                        }
                        var newitem = new Physics.shape("custom",{mesh: item.mesh, x: item.x, y: item.y, color: ((typeof item.color === "undefined") ? "black" : item.color), overrideRenderLimit: true, overrideSpacesInCustomShape: ((typeof item.overrideSpacesInCustomShape === "undefined") ? false : item.overrideSpacesInCustomShape)}); //make a new shape with options from font
                        //delete Physics.util.asciitext.fonts[keys[i]][keysfont[j]];
                        Physics.util.asciitext.fonts[keys[i]][keysfont[j]] = newitem;
                    }
                }
            },
            generateText: function(lnum,xstart,font) {
                if (typeof font === "undefined") {
                    font = Physics.util.asciitext.fonts.large;
                }
                if (typeof xstart === "undefined") {
                    xstart = 0;
                }
                var usednums = [];
                var xpos = xstart;
                var finalarr = [];
                for (var i=0; i<String(lnum).length; i++) {
                    if (font[String(lnum)[i]] instanceof Physics.shape) {
                        if (xpos+font[String(lnum)[i]].width > Physics.width) {
                            console.error("[GEN_ASCII_TXT] Attempt at placing character wider than screen width, all characters after character '"+String(lnum)[i-1]+"' will not be rendered");
                            break;
                        } else {
                            if (!usednums.contains(String(lnum)[i])) { //check if number has already been used
                                font[String(lnum)[i]].x = xpos;
                                xpos+=font[String(lnum)[i]].width;
                                finalarr.push(font[String(lnum)[i]]);
                                usednums[usednums.length] = String(lnum)[i];
                            } else { //number already used deep clone and add to array because xpos and ypos has to be different
                                Physics.util.asciitext.extranums[Physics.util.asciitext.extranums.length] = JSON.parse(JSON.stringify(font[String(lnum)[i]]));
                                Physics.util.asciitext.extranums[Physics.util.asciitext.extranums.length-1].UUID = generateUUID();
                                Physics.util.asciitext.extranums[Physics.util.asciitext.extranums.length-1].x = xpos;
                                xpos+=font[String(lnum)[i]].width;
                                finalarr.push(Physics.util.asciitext.extranums[(Physics.util.asciitext.extranums.length-1)]);
                            }
                        }
                    } else {
                        console.error("[GEN_ASCII_TXT] Font character that has been selected is not initialized or doesn't exist in font. Character='"+String(lnum)[i]+"'");
                    }
                }
                return finalarr;
            }
        },
        /**
        * Onscreen vector angle display
        * @constructor
        */
        angleDisplay: function(shape, vec, normalize, normmult) { //angle display function
            if (typeof normalize == "undefined") {
                normalize = false;
            }
            if (typeof normmult == "undefined") {
                normmult = 1;
            }
            this.centerPoint = shape.centerPoint || [Physics.width/2,Physics.height/2];
            this.shape = shape;
            this.vector = vec;
            this.line = [];
            this.mesh = [""];
            this.UUID = generateUUID();
            this.color = "blue";
            this.multiplier = 1;
            this.normalize = normalize;
            this.normmult = normmult;
            this.physics = false;
            this.onlyWriteNonemptyPixels = true;
            this.colorMesh = ["VecNotCompatible"]; //noncompatible with color for now
            this.mx = Math.round(this.centerPoint[0]);
            this.my = Math.round(this.centerPoint[1]);
            this.regenColorMesh = this.shape.regenColorMesh;
            this.x = 0;
            this.y = 0;
            this.update = function() {
                this.centerPoint = this.shape.centerPoint || [Physics.width/2,Physics.height/2];
                this.mx = Math.round(this.centerPoint[0]);
                this.my = Math.round(this.centerPoint[1]);
                var vec = JSON.parse(JSON.stringify(this.vector));
                vec.normalize = this.vector.normalize;
                vec.length = this.vector.length;
                vec.divide = this.vector.divide;
                vec.angle = this.vector.angle;
                if (normalize) {
                    vec = vec.normalize(this.normmult);
                }
                var ang = Math.round(vec.angle());
                var text = Physics.util.asciitext.generateText(String(ang));
                var combine = Physics.util.combineMeshes(text); //combine meshes from array of asciitext generation
                this.mesh = combine.mesh;
                var shape = new Physics.shape("custom",{mesh: combine.mesh, x:0, y:0})
                this.width = shape.width;
                this.height = shape.height;
                this.x = this.mx-shape.width/2;
                this.y = this.shape.y-shape.height-2;
                if (Physics.updateColorMeshOnVectorChange) {
                    this.regenColorMesh(this.color);
                }
            }
            this.update();
        },
        /**
        * Onscreen vector display
        * @constructor
        */
        vectorDisplay: function(shape, vec, normalize, normmult) { //vector display function
            if (typeof normalize == "undefined") {
                normalize = false;
            }
            if (typeof normmult == "undefined") {
                normmult = 1;
            }
            this.centerPoint = shape.centerPoint || [Physics.width/2,Physics.height/2];
            this.shape = shape;
            this.vector = vec;
            this.line = [];
            this.mesh = [""];
            this.UUID = generateUUID();
            this.color = "blue";
            this.multiplier = 1;
            this.normalize = normalize;
            this.normmult = normmult;
            this.physics = false;
            this.onlyWriteNonemptyPixels = true;
            this.colorMesh = ["VecNotCompatible"]; //noncompatible with color for now
            this.mx = Math.round(this.centerPoint[0]);
            this.my = Math.round(this.centerPoint[1]);
            this.regenColorMesh = this.shape.regenColorMesh;
            this.x = 0;
            this.y = 0;
            this.update = function() {
                this.centerPoint = this.shape.centerPoint || [Physics.width/2,Physics.height/2];
                this.mx = Math.round(this.centerPoint[0]);
                this.my = Math.round(this.centerPoint[1]);
                var vec = JSON.parse(JSON.stringify(this.vector));
                vec.normalize = this.vector.normalize;
                vec.length = this.vector.length;
                vec.divide = this.vector.divide;
                if (normalize) {
                    vec = vec.normalize(this.normmult);
                }
                var cp = new Physics.util.point2d(this.mx, this.my);
                var ep = new Physics.util.point2d((this.mx+vec.x)*this.multiplier, (this.my+vec.y)*this.multiplier);
                var line = Physics.util.line(cp, ep); //create line of vector
                var mesh = Physics.util.coords2mesh(line,"a");
                this.line = line;
                this.mesh = mesh.mesh;
                if (Physics.updateColorMeshOnVectorChange) {
                    this.regenColorMesh(this.color);
                }
            }
            this.update();
        },
        /**
        * Constructor for 2d vector
        * @constructor
        */
        vec2d: function(x,y) { //class to represent vectors
            this.x = x || 0;
            this.y = y || 0;
            this.clone = function(){
                return new Physics.util.vec2d(this.x,this.y);
            }
            this.magnitude = this.length = function(){
                return Math.sqrt(Math.pow(this.x,2) + Math.pow(this.y,2)); //square root with math.pow not **
            }
            this.normalize = function (mult) {
                if (typeof mult == "undefined") {
                    mult = 1;
                }
                var length = this.length();
                if (length === 0) {
                    this.x = 1;
                    this.y = 0;
                } else {
                    this.divide(new Physics.util.vec2d(length, length));
                    this.x *= mult;
                    this.y *= mult;
                }
                return this;
            };
            this.limit = function (max, factor) {
                if (Math.abs(this.x) > max){ this.x *= factor; }
                if (Math.abs(this.y) > max){ this.y *= factor; }
                return this;
            };
            this.HangleDeg = this.angleDegrees = this.angle = function() {
                return Physics.util.conversion.radian2degrees(Math.atan2(this.y, this.x));
            }
            this.HangleRad = this.angleRadians = function() {
                return Math.atan2(this.y, this.x);
            }
            this.VangleDeg = this.VangleDegrees = function() {
                return Physics.util.conversion.radian2degrees(Math.atan2(this.x, this.y));
            }
            this.VangleRad = this.VangleRadians = function() {
                return Math.atan2(this.x, this.y);
            }
            this.dot = function (vec) {
                return this.x * vec.x + this.y * vec.y;
            };
            this.rotateDeg = this.rotateDegrees = function (ang) {
                var angle = Physics.util.conversion.degrees2radian(ang);
                var nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
                var ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

                this.x = nx;
                this.y = ny;

                return this;
            };
            this.rotateRad = this.rotateRadians = function (angle) {
                var nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
                var ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

                this.x = nx;
                this.y = ny;

                return this;
            };
            this.cross = function (vec) {
                return (this.x * vec.y ) - (this.y * vec.x );
            };
            this.distance = function(vec) {
                var dx = this.x-vec.x;
                var dy = this.y-vec.y;
                return Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));
            }
            this.add = function(vec,mod) {
                if (typeof mod == "undefined") {
                    mod = true;
                }
                if (mod) {
                    this.x += vec.x;
                    this.y += vec.y;
                    return this;
                } else {
                    return new Physics.util.vec2d((this.x+vec.x),(this.y+vec.y));
                }
            }
            this.mix = function(vec, amount) {
                if (typeof amount === 'undefined') {
                    amount = 0.5;
                }

                this.y = (1 - amount) * this.y + amount * vec.y;
                this.x = (1 - amount) * this.x + amount * vec.x;
                return this;
            }
            this.sub = this.subtract = function(vec,mod) {
                if (typeof mod == "undefined") {
                    mod = true;
                }
                if (mod) {
                    this.x -= vec.x;
                    this.y -= vec.y;
                    return this;
                } else {
                    return new Physics.util.vec2d((this.x-vec.x),(this.y-vec.y));
                }
            }
            this.multiply = function(vec,mod) {
                if (typeof mod == "undefined") {
                    mod = true;
                }
                if (mod) {
                    this.x *= vec.x;
                    this.y *= vec.y;
                    return this;
                } else {
                    return new Physics.util.vec2d((this.x*vec.x),(this.y*vec.y));
                }
            }
            this.divide = function(vec,mod) {
                if (typeof mod == "undefined") {
                    mod = true;
                }
                if (mod) {
                    this.x /= vec.x;
                    this.y /= vec.y;
                    return this;
                } else {
                    return new Physics.util.vec2d((this.x/vec.x),(this.y/vec.y));
                }
            }
            this.scale = function(scalar) {
                if (typeof mod == "undefined") {
                    mod = true;
                }
                if (mod) {
                    this.x *= scalar;
                    this.y *= scalar;
                    return this;
                } else {
                    return new Physics.util.vec2d((this.x*scalar),(this.y*scalar));
                }
            }
            return this;
        },
        /**
        * Constructor for 3d vector
        * @constructor
        */
        vec3d: function() { //class to represent 3d vectors (not finished)

        },
        /**
        * Constructor for 3d point
        * @constructor
        */
        point3d: function(ix,iy,iz) { //class to represent points
            this.x = ix;
            this.y = iy;
            this.z = iz;
            this.projectOrtho = function() {
                return new Physics.util.point2d(this.x + this.z, this.y - this.z);
            }
            this.projectDistance = function(dist) {
                if (typeof dist == "undefined") {
                    dist = 300;
                }
                // Distance between the camera and the plane
                var r = dist / this.y;
                if (r == Infinity || isNaN(r) || typeof r == "undefined") {
                    r = 0;
                    console.warn("[POINT3D_PROJECTDIST] r is outside bounds, bad things might happen");
                }

                return new Physics.util.point2d((r * this.x), (r * this.z));
            }
            this.projectBasic = function() {
                return new Physics.util.point2d(this.x, this.z);
            }
            this.rotateCenter = function(center, theta, phi) {
                // Rotation matrix coefficients
                var ct = Math.cos(theta);
                var st = Math.sin(theta);
                var cp = Math.cos(phi);
                var sp = Math.sin(phi);

                // Rotation
                var x = this.x - center.x;
                var y = this.y - center.y;
                var z = this.z - center.z;

                this.x = ct * x - st * cp * y + st * sp * z + center.x;
                this.y = st * x + ct * cp * y - ct * sp * z + center.y;
                this.z = sp * y + cp * z + center.z;
                return this;
            }
            this.rotateAxis = function(thetax, thetay, thetaz) {
                var sinThetax = Math.sin(thetax);
                var cosThetax = Math.cos(thetax);
                var sinThetay = Math.sin(thetay);
                var cosThetay = Math.cos(thetay);
                var sinThetaz = Math.sin(thetaz);
                var cosThetaz = Math.cos(thetaz);

                var x = this.x;
                var y = this.y;
                var z = this.z;

                //Rotate shape around the z-axis
                this.x = x * cosThetaz - y * sinThetaz;
                this.y = y * cosThetaz + x * sinThetaz;

                //Rotate shape around the y-axis

                var x = this.x;
                var z = this.z;
                this.x = x * cosThetay - z * sinThetay;
                this.z = z * cosThetay + x * sinThetay;

                //Rotate shape around the x-axis
                var y = this.y;
                var z = this.z;
                this.y = y * cosThetax - z * sinThetax;
                this.z = z * cosThetax + y * sinThetax;
                return this;
            }
        },
        /**
        * Constructor for 2d point
        * @constructor
        */
        point2d: function(ix, iy) {
            this.x = ix;
            this.y = iy;
        },
        line: function(p, p2) { //make a line using bresenham's algorithm
            if (typeof p.x == "undefined" || typeof p.y == "undefined" || typeof p.z != "undefined") {
                return console.error("[UTIL3D_LINE] First 2d point is missing an argument or has a z value");
            }
            if (typeof p2.x == "undefined" || typeof p2.y == "undefined" || typeof p2.z != "undefined") {
                return console.error("[UTIL3D_LINE] Second 2d point is missing an argument or has a z value");
            }
            p.x = Math.round(p.x);
            p.y = Math.round(p.y);
            p2.x = Math.round(p2.x);
            p2.y = Math.round(p2.y);
            var deltax = Math.abs(p2.x - p.x); //setup vars
            var deltay = Math.abs(p2.y - p.y);
            var stepx = (p.x < p2.x) ? 1 : -1;
            var stepy = (p.y < p2.y) ? 1 : -1;
            var err = deltax - deltay;
            var coords = [];

            var tx1 = p.x;
            var tx2 = p2.x;
            var ty1 = p.y;
            var ty2 = p2.y;
            var MAXCOORDS = 10000;

            coords.push([tx1, ty1]);
            while (!((tx1 == tx2) && (ty1 == ty2)) && MAXCOORDS > 0) {
                MAXCOORDS--;
                var e2 = err << 1;
                if (e2 > -deltay) {
                    err -= deltay;
                    tx1 += stepx;
                }
                if (e2 < deltax) {
                    err += deltax;
                    ty1 += stepy;
                }
                coords.push([tx1, ty1]);
            }
            return coords;
        },
        combineMeshes: function() { //combine multiple shapes into mesh
            var buf = [];
            for (var j=0; j<Physics.height; j++) { //generate blank screen
                buf[j] = "";
                for (var i=0; i<Physics.width; i++) {
                    buf[j] += Physics.defaultSpaceChar;
                }
            }
            //possibly array of objects to render, check to be sure
            var bad = false;
            var arrlist = [];
            var args = []; //make a seperate array to change so strict mode checks don't fail
            for (var i=0; i<arguments.length; i++) {
                if (arguments[i] != true && arguments[i] != false) {
                    if (typeof arguments[i] === "object" && typeof arguments[i].UUID === "undefined" && arguments[i].length > 0 && arguments[i].constructor === Array) { //check if it is a shape object
                        var badshape = false;
                        for (var j=0; j<arguments[i].length; j++) { //check if all items in list are valid to render
                            if (typeof arguments[i][j] === "object" && typeof arguments[i][j].UUID !== "undefined") {
                                arrlist.push(arguments[i][j]);
                            } else {
                                badshape = true;
                                console.error("[COMBINE_MESH_PRE] Invalid shape detected in array passed");
                            }
                        }
                    } else {
                        bad = true;
                        if (Physics.debugMode) {
                            console.log("[COMBINE_MESH_PRE] Discovered argument that is not array in combine mesh");
                        }
                    }
                }
            }
            if (bad == false && badshape == false) {
                args = [];
                for(var i=0; i<arrlist.length; i++) {
                    if (Physics.debugMode) {
                        console.log("[COMBINE_MESH_PRE] Changing arguments passed into combine mesh because of array, i="+i);
                    }
                    args.push(arrlist[i]);
                }
            } else {
                for (var i=0; i<arguments.length; i++) {
                    args.push(arguments[i]);
                }
            }
            for (var i=0; i<args.length; i++) {
                var mesh = args[i].mesh;
                for (var j=0; j<mesh.length; j++) { //for every line of mesh
                    for (var b=0; b<mesh[j].length; b++) { //for every character in mesh
                        var x = constrain(args[i].x,0,(Physics.width-args[i].width)); //constrain x
                        var y = constrain(args[i].y,0,(Physics.height-args[i].height)); //constrain y
                        args[i].x = x; //fix bug where y position keeps changing
                        args[i].y = y;
                        x = Math.round(x);
                        y = Math.round(y);
                        if (args[i].onlyWriteNonemptyPixels) { //don't replace screen pixel if source pixel is air
                            if (args[i].mesh[j][b] != " ") { //if it's air just skip else replace
                                buf[j+y] = buf[j+y].replaceAt(b+x,args[i].mesh[j][b]);
                            }
                        } else { //no special options just replace everything no matter whether it's space or not
                            buf[j+y] = buf[j+y].replaceAt(b+x,args[i].mesh[j][b]);
                        }
                    }
                }
            }
            if (Physics.useMeshOptimizationWhenCombining == false) {
                buf = Physics.util.trimMesh(buf); //trim unneccesary characters to save space
                var shape = new Physics.shape("custom", {x:0, y:0, mesh: buf});
            } else {
                var opt = Physics.util.optimizeMesh(buf); //calculate optimized form of shape with x and y
                var shape = new Physics.shape("custom", {x:opt.x, y:opt.y, mesh: opt.mesh});
            }
            return shape;
        },
        trimMesh: function(mesh) { //trimMesh just makes the mesh more efficient to render
            //3 steps: find the max x for each row, if the max x is none then delete the row (only delete if row is not needed to maintain shape integrity)
            var maxX = [];
            for (var i=0; i<mesh.length; i++) { //find maxx for each row
                maxX[i] = -1;
                for (var j=0; j<mesh[i].length; j++) {
                    if (mesh[i][j] != " ") {
                        maxX[i] = j+1;
                    }
                }
            }
            //console.log(JSON.stringify(maxX))
            var allowdel = true; //allow deletion of rows
            for (var i=mesh.length-1; i>=0; i--) {
                if (maxX[i] == -1 && allowdel) { //still haven't hit first column with char, go ahead and trim
                    //console.log("slicing mesh "+i);
                    mesh.splice(i,1); //slice the mesh and remove the row
                } else if (maxX[i] == -1 && allowdel == false) { //just set to blank to preserve row but remove rendering load
                    //console.log("sliceindel "+i)
                    mesh[i] = "";
                } else {
                    //console.log("stringing mesh "+i)
                    mesh[i] = mesh[i].substring(0,maxX[i]);
                    allowdel = false;
                }
            }
            return mesh;
        },
        optimizeMesh: function(mesh) { //optimizeMesh actually sets an X and Y and removes all unneeded space so mesh renders better
            var optX = -1; //x and y to string
            var optY = -1;

            var minX = []; //shifted minX with -1s to represent empty rows
            var mx = Infinity; //minimum xpos
            var my = Infinity;
            for (var i=0; i<mesh.length; i++) { //find maxx for each row
                minX[i] = -1;
                for (var j=mesh[i].length; j>=0; j--) {
                    if (mesh[i][j] != " " && j != mesh[i].length) {
                        minX[i] = j;
                        if (j < mx) {
                            mx = j;
                        }
                        if (i < my) { //set y because there has to be char
                            my = i;
                        }
                    }
                }
            }
            var maxX = []; //shifted maxX
            var Mx = -Infinity; //maximum xpos
            var My = -Infinity;
            for (var i=0; i<mesh.length; i++) { //find maxx for each row
                maxX[i] = -1;
                for (var j=0; j<mesh[i].length; j++) {
                    if (mesh[i][j] != " ") {
                        maxX[i] = j;
                        if (j > Mx) {
                            Mx = j;
                        }
                        if (i > My) {
                            My = i;
                        }
                    }
                }
            }

            optX = mx; //set optX to min xpos

            /*
            4 steps:
                First, find the minimimum and maximum xs for each row
                Then, trim the minimum characters from each row and set min x so it displays in the same place
                Then, go from top and trim until character
                Then, go from bottom and trim until character
                Lastly, set all blank rows remaining to an empty character so rows are preserved with minimal impact on performance
            */
            /*console.log("ml "+mesh.length);
            console.log("STEP 1: TRIM");*/
            for (var i=0; i<JSON.parse(JSON.stringify(mesh.length)); i++) {
                if (maxX[i] == -1) {
                    //console.log("blanking mesh "+i);
                    mesh[i] = ""; //set to blank to preserve rows
                } else if (maxX[i] != -1) {
                    //console.log("stringing mesh "+i)
                    mesh[i] = mesh[i].substring(mx,maxX[i]+1); //slice from minx to max+1 to preserve column
                    if (optY == -1) { //column where y is at min
                        optY = i;
                    }
                }
            }
            //console.log("STEP 2: SLICE FROM TOP");
            var diff = 0;
            for (var i=0; i<mesh.length; i++) {
                //console.log("ubroke tp char "+JSON.stringify(mesh[i])+", dif: "+diff);
                if (mesh[(i-diff)] == "") { //remove if blank
                    //console.log("slicing mesh tp "+i);
                    mesh.splice((i-diff),1); //slice the mesh and remove the row
                    diff++;
                } else {
                    //console.log("broke tp char "+JSON.stringify(mesh[i-diff]));
                    break;
                }
            }
            //console.log("STEP 3: SLICE FROM BOTTOM");
            for (var i=mesh.length-1; i>=0; i--) {
                if (mesh[i] == "") { //remove if blank
                    //console.log("slicing mesh bt "+i);
                    mesh.splice(i,1); //slice the mesh and remove the row
                } else {
                    //console.log("broke bt char "+JSON.stringify(mesh[i]));
                    break;
                }
            }

            if (Physics.debugMode) {
                console.log("[OPTIMIZE_MESH] minx="+mx+" maxx="+Mx+" miny="+my+" maxy="+My);
                console.log("[OPTIMIZE_MESH] maxXArr="+JSON.stringify(maxX)+", minXArr="+JSON.stringify(minX))
            }
            return {mesh: mesh, x: ((optX == -1 || optX == Infinity || optX == -Infinity) ? 0 : optX), y: ((optY == -1 || optY == Infinity || optY == -Infinity) ? 0 : optY)};

        },
        coords2mesh: function(coords,character,map) { //convert array of coords to mesh
            if (coords.length == 0) {
                return console.error("[COORDS2MESH] Coordinates array length is 0");
            }
            if (typeof map == "undefined") {
                map = false;
            }

            if (typeof character == "undefined") {
                console.warn("[COORDS2MESH] Character undefined, defaulting");
                character = Physics.defaultShapeChar;
            }

            var xmin = 1000000; //limit so no infinite loop!
            var ymin = 1000000;
            var xmax = -1000000;
            var ymax = -1000000;
            for (var i=0; i<coords.length; i++) {
                if (coords[i][0] < xmin) {
                    xmin = coords[i][0];
                } else if (coords[i][0] > xmax) {
                    xmax = coords[i][0];
                }
                if (coords[i][1] < ymin) {
                    ymin = coords[i][1];
                } else if (coords[i][1] > ymax) {
                    ymax = coords[i][1];
                }
            }
            if (xmin == 0) {
                xmin = 1;
            }
            if (ymin == 0) {
                ymin = 1;
            }
            var shiftx = 0;
            if (xmin <= 0) {
                shiftx = Math.abs(xmin)+1;
            }
            var shifty = 0;
            if (ymin <= 0) {
                shifty = Math.abs(ymin)+1;
            }
            if (Physics.debugMode){console.log("[COORDS2MESH] xmin: "+xmin+", ymin: "+ymin+", xmax: "+xmax+", ymax: "+ymax+", shiftx: "+shiftx+", shifty: "+shifty);}
            if (map) {
                var mappedcoords = [];
                for (var i=0; i<coords.length; i++) {
                    mappedcoords[i] = [Math.round(coords[i][0]-xmin)+shiftx,Math.round(coords[i][1]-ymin)+shifty];
                    if (mappedcoords[i][0] < xmin) {
                        xmin = mappedcoords[i][0];
                    } else if (mappedcoords[i][0] > xmax) {
                        xmax = mappedcoords[i][0];
                    }
                    if (mappedcoords[i][1] < ymin) {
                        ymin = mappedcoords[i][1];
                    } else if (mappedcoords[i][1] > ymax) {
                        ymax = mappedcoords[i][1];
                    }
                }
            } else {
                var mappedcoords = [];
                for (var i=0; i<coords.length; i++) {
                    mappedcoords[i] = [Math.round(coords[i][0])+shiftx,Math.round(coords[i][1])+shifty];
                    if (mappedcoords[i][0] < xmin) {
                        xmin = mappedcoords[i][0];
                    } else if (mappedcoords[i][0] > xmax) {
                        xmax = mappedcoords[i][0];
                    }
                    if (mappedcoords[i][1] < ymin) {
                        ymin = mappedcoords[i][1];
                    } else if (mappedcoords[i][1] > ymax) {
                        ymax = mappedcoords[i][1];
                    }
                }
            }

            var mesh = [];
            var blankLine = "";
            for (var i=0; i<xmax+1; i++) { //make blank mesh
                blankLine += Physics.defaultSpaceChar;
            }
            for (var i=0; i<ymax+1; i++) {
                mesh[i] = JSON.parse(JSON.stringify(blankLine));
            }
            for (var i=0; i<mappedcoords.length; i++) {
                
                if (mesh.length < mappedcoords[i][1]-1 || mesh[0].length < mappedcoords[i][0]-1 || typeof mesh[mappedcoords[i][1]-1] == "undefined") { //check if point exists in mesh
                    return console.error("[COORDS2MESH] Point x: "+mappedcoords[i][0]+", y: "+mappedcoords[i][1]+", meshheight: "+mesh.length+", meshwidth: "+mesh[0].length+" doesn't exist in mesh")
                }
                mesh[mappedcoords[i][1]-1] = mesh[mappedcoords[i][1]-1].replaceAt(mappedcoords[i][0]-1,character); //subtract 1 because arrays start at index 0
            }
            //return {mesh: mesh};
            mesh = Physics.util.trimMesh(mesh);
            return new Physics.shape("custom", {mesh: mesh, x: xmin, y: ymin}); //return the shape
        }
        /*dramatic music plays* I leave this here as a tribute to when this didn't work. Whoever finds this is awesome! (this code renders coords directly to screen)
            var wstr = "";
            var buf = [];
            for (var i=0; i<Physics.width; i++) {
                wstr+=" ";
            }
            for (var i=0; i<Physics.height; i++) {
                buf[i] = wstr;
            }
            for (var i=0; i<box.coords.length; i++) {
                buf[box.coords[i][1]] = buf[box.coords[i][1]].replaceAt(box.coords[i][0],"*");
            }
            var rs = "";
            for (var i=0; i<buf.length; i++) { //write it to string to optimize writing calls
                rs+=buf[i]+Physics.defaultNewlineChar;
            }
            Physics.element.innerHTML = rs;
        */
    },
    render: function(options) {
        var optionsDefined = true; //keeps track of whether the options parameter is defined
        if (typeof options == "undefined" || options.constructor !== Object) {
            options = {
                clearScreen: true,
                renderToScreen: true,
                debugFrames: false
            }
            optionsDefined = false;
        } else if (options.constructor === Physics.shape || options.constructor === Physics.shape3d) {
            if (Physics.debugMode){console.log("[RENDER_PRE] Shape detected as first argument; adding to arguments")}
            var args = [JSON.parse(JSON.stringify(options))];
            for (var i=1; i<arguments.length; i++) { //omit the options
                args.push(arguments[i]);
            }
            optionsDefined = false;
            arguments = args; //push the shapes
            options = {
                clearScreen: true,
                renderToScreen: true,
                debugFrames: false
            }
        } else {
            if (typeof options.clearScreen === "undefined") { //determines whether the renderbuffer is cleared every frame
                options.clearScreen = false;
            }
            if (typeof options.renderToScreen == "undefined") { //determines whether the generated render is actually drawn to screen
                options.renderToScreen = true;
            }
            if (typeof options.debugFrames == "undefined") { //not rendering to screen a
                options.debugFrames = false;
            }
            var optionkeys = Object.keys(options);
            var physicsOptions = ["clearScreen","renderToScreen","debugFrames"];
            for (var i=0; i<optionkeys.length; i++) {
                if (!physicsOptions.contains(optionkeys[i])) {
                    console.error("[RENDER_PRE] Option '"+optionkeys[i]+"' is not a valid option for rendering. Valid options are "+JSON.stringify(physicsOptions))
                    return;
                }
            }
        }
        var generatedFrames = [];

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

        if (options.clearScreen) {
            Physics.renderBuffer = [];
            for (var j=0; j<Physics.height; j++) { //generate blank screen
                Physics.renderBuffer[j] = "";
                for (var i=0; i<Physics.width; i++) {
                    Physics.renderBuffer[j] += Physics.defaultSpaceChar;
                }
            }
        }
        //possibly array of objects to render, check to be sure
        var bad = false;
        var arrlist = [];
        var args = []; //make a seperate array to change so strict mode checks don't fail
        for (var i=0; i<arguments.length; i++) {
            if (!(i == 0 && optionsDefined == true)) {
                if (arguments[i] != true && arguments[i] != false) {
                    if (typeof arguments[i] === "object" && typeof arguments[i].UUID === "undefined" && arguments[i].length > 0 && arguments[i].constructor === Array) { //check if it is a shape object
                        var badshape = false;
                        for (var j=0; j<arguments[i].length; j++) { //check if all items in list are valid to render
                            if (typeof arguments[i][j] === "object" && typeof arguments[i][j].UUID !== "undefined") {
                                arrlist.push(arguments[i][j]);
                            } else {
                                badshape = true;
                                console.error("[RENDER_PRE] Invalid shape detected in array passed to render");
                                return;
                            }
                        }
                    } else {
                        bad = true;
                        if (Physics.debugMode) {
                            console.log("[RENDER_PRE] Discovered argument that is not an array, nor an option, in render");
                        }
                    }
                }
            } //can't pass options
        }
        if (bad == false && badshape == false) {
            args = [];
            for(var i=0; i<arrlist.length; i++) {
                if (Physics.debugMode) {
                    console.log("[RENDER_PRE] Changing arguments passed into render because of array, i="+i);
                }
                args.push(arrlist[i]);
            }
        } else { //push onto arguments, since it isn't an array
            for (var ind = ((optionsDefined) ? 1 : 0); ind<arguments.length; ind++) {//start a 1 to remove options
                args.push(arguments[ind]);
            }
        }
        if (Physics.renderInColor) { //resort to go to left to right
            var LtoR = [];
            for (var i=0; i<args.length; i++) {
                LtoR.push([args[i].x,args[i]])
            }
            LtoR.sort(function(a,b){return b[0] > a[0]}) //sort xPos
            for (var i=0; i<LtoR.length; i++) {
                args[i] = LtoR[i][1];
            }

        }
        for (var i=0; i<args.length; i++) { //add meshes to screen
            if (args[i] != true && args[i] != false && typeof args[i] !== "undefined") {
                //alert(JSON.stringify(args[i]))
                //try {
                    if ((args[i].physics == true || Physics.allGravity) && (nextUpdateReached || true)) { //calculate gravity
                        if (Physics.debugMode) {console.log("[RENDER_MAIN] Updating velocity for shape: "+args[i].type+", UUID: "+args[i].UUID+" (velX: "+args[i].velocity.x+", velY: "+args[i].velocity.y+")")}
                            args[i].update(false);
                    }
                /*} catch(e) {
                    console.error("[RENDER_MAIN] Error updating gravity for shape. Shape: "+JSON.stringify(args[i])+", e: "+e);
                    //console.log(JSON.stringify(args))
                }*/
                if (args[i].UUID === undefined) { //sanity check!!
                    if (!(i == 0 && args[i].constructor == Object)) { //if it is the first parameter (options)
                        console.error("[RENDER_MAIN] Error drawing: argument "+i+" is not a valid shape or doesn't have a UUID. Argument: "+JSON.stringify(args[i]));
                    }
                } else {
                    var bad = false;
                    try {
                        args[i].width = (args[i].type == "custom") ? args[i].width : args[i].mesh[0].length; //don't overwrite width for custom shape
                        args[i].height = args[i].mesh.length;
                    } catch(e) {
                        bad = true;
                        console.error("[RENDER_MAIN] Error rendering: argument "+i+" doesn't have a width or height property")
                    }
                    if ((args[i].width > Physics.width || args[i].height > Physics.height)) {
                        if (Physics.ignoreMeshSize) {
                            console.warn("[RENDER_MAIN] Warning: the IgnoreMeshSize flag is enabled. The mesh you are *attempting* to render is too large for the screen. Parts of what you are trying to render may be cut off. Normally, this would throw an error, but not anymore :)");
                        } else {
                            bad = true;
                            console.error("[RENDER_MAIN] Error rendering: argument "+i+"'s mesh is too large to fit on screen");
                        }
                    }
                    if (bad == false) {
                        var x = constrain(args[i].x, 0, (Physics.width-args[i].width)); //constrain x
                        var y = constrain(args[i].y, 0, (Physics.height-args[i].height)); //constrain y
                        args[i].x = x; //fix bug where y position keeps changing
                        args[i].y = y;
                        x = Math.round(x);
                        y = Math.round(y); //approximate because screen position needs to be in whole pixels
                        //console.info("x: "+args[i].x+", y: "+args[i].y+", CONSTx: "+x+", CONSTy: "+y)
                        if (Physics.debugMode){console.info("[RENDER_MAIN] Shape to be placed at x: "+x+", y: "+y);}
                        if (args[i].mesh.length == 0 || args[i].colorMesh.length == 0) {
                            console.error("[RENDER_MAIN] Error rendering: shape has no mesh (or colorMesh) to render!");
                        } else {
                            if (nextFrameReached || options.clearScreen == false || args[i].overrideRenderLimit || true) { //I'll fix the render timing later, it doesn't work
                                var mesh = (Physics.renderInColor) ? args[i].colorMesh : args[i].mesh;
                                for (var j=0; j<mesh.length; j++) { //for every line of mesh
                                    if (Physics.renderInColor) {
                                        var xOff = 0;

                                        for (var b=0; b<args[i].mesh[j].length; b++) {
                                            if (Physics.renderBuffer[j+y][x+xOff] != " ") {
                                                if (Physics.debugMode) {console.log("[RENDER_RENDER]: attempting to place colored chars ("+Physics.renderBuffer[j+y][x+xOff]+") at y "+(j+y)+", x "+(x+xOff)+" but there are pixels there")};
                                            } else {
                                                Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, x+xOff) + args[i].colorMesh[j][b] + Physics.renderBuffer[j+y].slice(x+xOff+1)//x+(args[i].width || args[i].length)+xOff);
                                                xOff+=args[i].colorMesh[j][b].length;
                                                if (options.debugFrames) {
                                                    generatedFrames.push(JSON.parse(JSON.stringify(Physics.renderBuffer)));
                                                }
                                                if (Physics.debugMode){console.log("[RENDER_RENDER] Adding to buffer (COLOR) at x: "+(x)+", y: "+(j+y)+", previous chars there: "+Physics.renderBuffer[j+y][x]+", j val: "+j+", chars: "+args[i].colorMesh[j][b]+", offsetX: "+xOff)}
                                            }
                                        }
                                        Physics.charsPerFrame+=args[i].colorMesh[j].length;
                                        if (Physics.regenColorMeshOnRender) {
                                            args[i].regenColorMesh(args[i].color);
                                        }
                                    } else {
                                        for (var b=0; b<mesh[j].length; b++) { //for every character in mesh
                                            try {
                                                //console.log(Physics.renderBuffer[j+y][b+x])
                                                if (args[i].mesh[j] != "") {
                                                    if (args[i].replaceWithSpace && Physics.renderBuffer[j+y][b+x] != " ") { //invert pixel if it's over another
                                                        Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x," ");
                                                        Physics.charsPerFrame++;
                                                    } else {
                                                        if (args[i].onlyWriteNonemptyPixels) { //don't replace screen pixel if source pixel is air
                                                            if (args[i].mesh[j][b] != " ") { //if it's air just skip else replace
                                                                Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x,args[i].mesh[j][b]);
                                                                Physics.charsPerFrame++;
                                                            }
                                                        } else { //no special options just replace everything no matter whether it's space or not
                                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x,args[i].mesh[j][b]);
                                                            Physics.charsPerFrame++;
                                                        }
                                                        if (options.debugFrames) {
                                                            generatedFrames.push(JSON.parse(JSON.stringify(Physics.renderBuffer)));
                                                        }
                                                    }
                                                } else {
                                                    console.error('[RENDER_RENDER] Shape with uuid '+args[i].UUID+"at mesh row "+j+" has nothing there. Please pass this mesh through Physics.optimizeMesh");
                                                }
                                            } catch(e) {
                                                if (!Physics.ignoreMeshSize) {
                                                    console.error("[RENDER_RENDER] Error while rendering physics buffer for shape "+args[i].type+", UUID "+args[i].UUID+", x: "+(b+x)+", y: "+(j+y)+", error: "+e);
                                                }
                                            }
                                            if (Physics.debugMode){console.log("[RENDER_RENDER] Adding to buffer (non-color) at x: "+(b+x)+", j val: "+j+", y: "+(j+y)+", char: "+mesh[j][b])}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Physics.renderString = Physics.startString+Physics.renderBuffer.join(Physics.defaultNewlineChar);
        if (Physics.charsPerFrame > 0) { //only render if more than 0 chars
            if (Physics.element.innerHTML != Physics.renderString && options.renderToScreen) { //only draw if different optimization
                Physics.element.innerHTML = Physics.renderString; //draw it!
                if (options.debugFrames) {
                    for (var i=0; i<generatedFrames.length; i++) { //for every frame in captured frames
                        generatedFrames[i] = (Physics.startString+generatedFrames[i].join(Physics.defaultNewlineChar));
                    }
                    return generatedFrames;
                }
            } else if (options.debugFrames) {
                for (var i=0; i<generatedFrames.length; i++) { //for every frame in captured frames
                    generatedFrames[i] = (Physics.startString+generatedFrames[i].join(Physics.defaultNewlineChar));
                }
                return generatedFrames;
            } else if (Physics.element.innerHTML != Physics.renderString && !options.renderToScreen) { //different, not rendering to screen
                return Physics.renderString; //return rendered string
            } else if (Physics.element.innerHTML == Physics.renderString && !options.renderToScreen) { //same, no need to recalculate renderstring
                return Physics.renderBuffer;
            }
        }
    },
    calculate_collisions: function() {
        //possibly array of objects to calculate collisions, check to be sure
        var bad = false;
        var arrlist = [];
        var args = [];
        for (var i=0; i<arguments.length; i++) {
            if (typeof arguments[i] === "object" && typeof arguments[i].UUID === "undefined" && arguments[i].length > 0 && arguments[i].constructor === Array) { //check if it is an array
                var badshape = false;
                for (var j=0; j<arguments[i].length; j++) { //check if all items in array are valid to render
                    if (typeof arguments[i][j] === "object" && typeof arguments[i][j].UUID !== "undefined") {
                        arrlist.push(arguments[i][j]);
                    } else {
                        badshape = true;
                        console.error("[COLL_PRE] Invalid shape detected in array passed");
                    }
                }
            } else {
                bad = true;
                if (Physics.debugMode) {
                    console.log("[COLL_PRE] Discovered argument that is not array in check collisions");
                }
            }
        }
        if (bad == false && badshape == false) {
            args = [];
            for(var i=0; i<arrlist.length; i++) {
                if (Physics.debugMode) {
                    console.log("[COLL_PRE] Changing arguments passed into render because of array, i="+i);
                }
                args.push(arrlist[i]);
            }
        } else {
            for (var i=0; i<arguments.length; i++) {
                args.push(arguments[i]);
            }
        }

    },
    calculateEdges: function(shape) {
        if (shape.constructor !== Physics.shape) { //3d shapes not supported yet
            console.error("[CALC_EDGES] Object passed in is not a valid shape")
        } else {
            shape.vertex = function(id) {
                var edge = Physics.calculateEdges(this);
                if (id == 0)
                {
                    return edge.topLeft;
                }
                else if (id == 1)
                {
                    return edge.topRight;
                }
                else if (id == 2)
                {
                    return edge.bottomRight;
                }
                else if (id == 3)
                {
                    return edge.bottomLeft;
                }
            }
            var minX = shape.x;
            var minY = shape.y;
            var maxX = minX+shape.width;
            var maxY = minY+shape.height;
            return {
                topLeft: new Physics.util.vec2d(minX,minY),
                topRight: new Physics.util.vec2d(maxX,minY),
                bottomLeft: new Physics.util.vec2d(minX,maxY),
                bottomRight: new Physics.util.vec2d(maxX,maxY)
            }
        }
    } ,
    satTest: function(a, b) {
        var edgeA = Physics.calculateEdges(a);
        var edgeB = Physics.calculateEdges(b);
        if (Physics.debugMode) {
            console.log("edgesA: "+JSON.stringify(edgeA)+", edgesB: "+JSON.stringify(edgeB))
        }
        var testVectors = [
            edgeA.topRight.subtract(edgeA.topLeft,false),
            edgeA.bottomRight.subtract(edgeA.topRight,false),
            edgeB.topRight.subtract(edgeB.topLeft,false),
            edgeB.bottomRight.subtract(edgeB.topRight,false),
        ];
        var ainvolvedVertices = [];
        var binvolvedVertices = [];

        function intersect_safe(a, b) {
            var result = new Array();

            var as = a.map( function(x) { return x.toString(); });
            var bs = b.map( function(x) { return x.toString(); });

            for (var i in as)
            {
                if (bs.indexOf(as[i]) !== -1)
                {
                    result.push( a[i] );
                }
            }

            return result;
        }

    /*
             * Look at each test vector (shadows)
             */
        for (var i = 0; i < 4; i++) {
            ainvolvedVertices[i] = []; // Our container for involved vertces
            binvolvedVertices[i] = []; // Our container for involved vertces
            var myProjections = [];
            var foreignProjections = [];

            for (var j = 0; j < 4; j++) {
                myProjections.push(testVectors[i].dot(a.vertex(j)));
                foreignProjections.push(testVectors[i].dot(b.vertex(j)));
            }

            // Loop through foreignProjections, and test if each point is x lt my.min AND x gt m.max
            // If it's in the range, add this vertex to a list
            var myProjectionsMin = Math.min.apply(null, myProjections);
            var myProjectionsMax = Math.max.apply(null, myProjections);
            var foreignProjectionsMin = Math.min.apply(null, foreignProjections);
            var foreignProjectionsMax = Math.max.apply(null, foreignProjections);


            for (var j in foreignProjections) {
                if (foreignProjections[j] > myProjectionsMin && foreignProjections[j] < myProjectionsMax) {
                    binvolvedVertices[i].push(b.vertex(j));
                }
            }

            // Loop through myProjections and test if each point is x gt foreign.min and x lt foreign.max
            // If it's in the range, add the vertex to the list
            for (var j in myProjections) {
                if (myProjections[j] > foreignProjectionsMin && myProjections[j] < foreignProjectionsMax) {
                    ainvolvedVertices[i].push(a.vertex(j));
                }
            }
        }

        // console.log( intersect_safe ( intersect_safe( involvedVertices[0], involvedVertices[1] ), intersect_safe( involvedVertices[2], involvedVertices[3] ) ) );
        ainvolvedVertices = intersect_safe(intersect_safe(ainvolvedVertices[0], ainvolvedVertices[1]), intersect_safe(ainvolvedVertices[2], ainvolvedVertices[3]));
        binvolvedVertices = intersect_safe(intersect_safe(binvolvedVertices[0], binvolvedVertices[1]), intersect_safe(binvolvedVertices[2], binvolvedVertices[3]));
    /*
            If we have two vertices from one rect and one vertex from the other, probably the single vertex is penetrating the segment
            return involvedVertices;
            */
        if (ainvolvedVertices.length === 2 && binvolvedVertices.length === 2) {
            return ainvolvedVertices[1];
        } else if (ainvolvedVertices.length === 1 && binvolvedVertices.length === 2) {
            return ainvolvedVertices[0];
        } else if (binvolvedVertices.length === 1 && ainvolvedVertices.length === 2) {
            return binvolvedVertices[0];
        } else if (ainvolvedVertices.length === 1 && binvolvedVertices.length === 1) {
            return ainvolvedVertices[0];
        } else if (ainvolvedVertices.length === 1 && binvolvedVertices.length === 0) {
            return ainvolvedVertices[0];
        } else if (ainvolvedVertices.length === 0 && binvolvedVertices.length === 1) {
            return binvolvedVertices[0];
        } else if (ainvolvedVertices.length === 0 && binvolvedVertices.length === 0) {
            return false;
        } else {
            console.error("[COLL_SAT] Unknown collision profile");
            console.log(JSON.stringify(ainvolvedVertices),JSON.stringify(binvolvedVertices))
        }
        return true;
    },
    init: function() {
        //console.clear();
        mouseOffsetX = Physics.element.offsetLeft;
        mouseOffsetY = Physics.element.offsetTop+100;
        document.body.onmousedown = function() {
            mouseDown = true;
        }
        document.body.onmouseup = function() {
            mouseDown = false;
        }
        //DEAL WITH NOT LOADED VECTORS
        for (var i=0; i<notLoadedVectors.length; i++) {
            if (Physics.debugMode || true) {
                console.log("[INIT] Fixing notLoadedVector '"+notLoadedVectors[i][0]+"'");
            }
            Physics.constants[notLoadedVectors[i][0]] = new Physics.util.vec2d(notLoadedVectors[i][1],notLoadedVectors[i][2]);
        }
        notLoadedVectors = [];
        Physics.util.asciitext.init(); //initialize asciitext
        console.typeable("debugon",
            function(){console.log("[INIT] Type 'debugon' into the console to enable debug mode. (Warning: there is about 1000 debug messages outputted per second)");},
            function(){console.log("Debug mode active."); Physics.debugMode = true;});
        console.typeable("debugoff",
            function(){console.log("[INIT] Type 'debugoff' into the console to disable debug mode.");},
            function(){console.log("Debug mode disabled."); Physics.debugMode = false;});
        console.typeable("debug2s",
            function(){console.log("[INIT] Type 'debug2s' into the console to perform auto-test of code for 2s and then stop it. (Mostly for debugging broken things in render loop)");},
            function(){console.clear(); debugon; setTimeout(function(){debugoff;},2000);});
        //console.typeable("stop","console.log('Type stop into the console to stop the game.');","fpsInterval = 0;")

        Physics.renderBuffer = []; //setup blank render buffer
        for (var j=0; j<Physics.height; j++) { //generate blank screen
            Physics.renderBuffer[j] = "";
            for (var i=0; i<Physics.width; i++) {
                Physics.renderBuffer[j] += Physics.defaultSpaceChar;
            }
        }

        Physics.element.style.lineHeight = String(Physics.lineHeight);
        Physics.height = Math.round(window.innerHeight*(Physics.lineHeight-0.53));
        Physics.width = Math.round(window.innerWidth*(Physics.lineHeight-0.523));
        Physics.bodyFontSize = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size'));
    },
    clear: function() {
        Physics.renderBuffer = [];
        Physics.element.innerHTML = "";
    },
    /**
    * Constructor for render loop
    * @constructor
    */
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
        this.frameCount = 0;

        this._this = this;
        this.runLoop = true;
        this.args = args;
        this.firstRun = true;
        var _this = this;

        function createRenderLoop(_this, queuenum, args) { //this is going to get a little twisted to be able to pass variables from this to setinterval
            _this.renderFunction = (function(){
                if (_this.runLoop) {requestAnimationFrame(_this.renderFunction);}
                var fpsInterval = 1000/_this.options.fps;
                var now = Date.now();
                var then = Physics.renderLoopPasts[queuenum];
                var elapsed = now - then;
                if (elapsed > fpsInterval) {
                    Physics.renderLoopPasts[queuenum] = now - (elapsed % fpsInterval);
                    var shapesarr = [];
                    for (var i=1; i<args.length; i++) {
                        try{if (Physics.debugMode) {console.log("[CREATERENDERLOOP] Args into renderloop i: "+i+", arg: "+JSON.stringify(args[i]));}}catch(e){}
                        shapesarr.push(args[i]);
                    }
                    if (_this.firstRun) {
                        if (Physics.debugMode){console.log("[RENDERLOOP_CREATE] firstrun renderloopauto: "+JSON.stringify(shapesarr));}
                        Physics.render({clearScreen: true},shapesarr);
                        _this.frameCount++;
                        //eval(firstrunstr); //No eval here!!! Changed to array
                        _this.firstRun = false;
                    }
                    if (Physics.debugMode) {console.log("[RENDERLOOP_CREATE] shapesarr: "+JSON.stringify(shapesarr));}
                    //console.log(JSON.stringify(_this.options))
                    if (_this.options.collision) {
                        Physics.calculate_collisions(shapesarr); //No eval here either!
                    }
                    try {
                        Physics.render({clearScreen: _this.options.clear},shapesarr); //still no eval!
                        _this.frameCount++;
                    } catch(e) {
                        console.error("[RENDERLOOP_LOOP] Error executing render function for renderLoop. E: '"+e+"'");
                    }
                    if (_this.options.executeOnFrame) {
                        try {
                            _this.options.onFrame(_this);
                        } catch(e) {
                            console.error("[RENDERLOOP_LOOP] Error executing onFrame function for renderLoop. E: '"+e+"'");
                            if (Physics.stopRenderFunctionOnError) {
                                _this.options.executeOnFrame = false;
                                var randstr = "";
                                var alpha="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
                                randstr+=alpha[constrain(Math.floor(Math.random() * alpha.length-6),0,alpha.length)]; //can't have digit as first letter of code
                                for (var i=0; i<4; i++) {
                                    randstr+=alpha[Math.floor(Math.random() * alpha.length)];
                                } //TODO REMOVE EVAL FROM CONSOLE.TYPEABLE
                                console.typeable(randstr, function(){console.log("To start onFrame function again, type \'"+randstr+"\'.");}, {
                                    function: function(_this){
                                        console.log("Restarting onFrame loop.");
                                        _this.options.executeOnFrame=true;
                                    }, arguments: [_this]
                                });
                            } else {
                                console.warn("[RENDERLOOP_LOOP] RenderLoop onFrame function has thrown an error, however flag is set so loop will not stop");
                            }
                        }
                    }
                }
            });
            requestAnimationFrame(function(){
                _this.renderFunction();
            });
        }
        //createRenderLoop(this, this.options.queueNum, this.args);
        this.start = function() { //start rendering loop
            this.runLoop = true;
            createRenderLoop(this, this.options.queueNum, this.args); //pass the args to the function
        }
        this.step = function() { //step loop (1 frame)
            this.runLoop = true;
            createRenderLoop(this, this.options.queueNum, this.args); //pass the args to the function
            this.runLoop = false;
        }
        this.stop = function() { //stop rendering loop
            /*try{
                clearInterval(this.loopNum);
            } catch(e) {
                console.error("Error stopping renderLoop. E: "+e+", RENDERLOOP_MAIN")
            }*/
            this.runLoop = false;
        }
        Physics.renderLoopNext++;

    },
    /**
    * Constructor for simulation loop
    * @constructor
    */
    simulationLoop: function(opts) {
        var args = arguments;
        opts.seconds = opts.seconds || 5;
        opts.frames = opts.frames || (opts.fps*opts.seconds)
        opts.timeout = opts.timeout || (30 * 1000); //30 seconds to finish rendering else fail
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
        this.options = opts;
        this.frameCount = 0;

        this._this = this;
        this.runLoop = true;
        this.doneRendering = false;
        this.args = args;
        this.frames = []; //frames array
        this.firstRun = true;
        var _this = this;

        function createSimulationLoop(_this, queuenum, args) { //this is going to get a little twisted to be able to pass variables from this to setinterval
            _this.renderFunction = (function(){
                if (_this.runLoop) {
                    setTimeout(function(){
                        _this.renderFunction();
                    },0); //max speed timeout to render sequence
                }
                var shapesarr = [];
                for (var i=1; i<args.length; i++) {
                    try{if (Physics.debugMode) {console.log("[CREATESIMLOOP] Args into renderloop i: "+i+", arg: "+JSON.stringify(args[i]));}}catch(e){}
                    shapesarr.push(args[i]);
                }
                if (_this.firstRun) {
                    if (Physics.debugMode){console.log("[SIMLOOP_CREATE] firstrun renderloopauto: "+JSON.stringify(shapesarr));}
                    _this.frames.push(Physics.render({clearScreen: true, renderToScreen: false},shapesarr));
                    _this.frameCount++;
                    _this.firstRun = false;
                }
                if (Physics.debugMode) {console.log("[SIMLOOP_CREATE] shapesarr: "+JSON.stringify(shapesarr));}
                //console.log(JSON.stringify(_this.options))
                if (_this.options.collision) {
                    Physics.calculate_collisions(shapesarr); //No eval here either!
                }
                try {
                    _this.frames.push(Physics.render({clearScreen: _this.options.clear, renderToScreen: false},shapesarr));
                    _this.frameCount++;
                } catch(e) {
                    console.error("[SIMLOOP_LOOP] Error executing render function for renderLoop. E: '"+e+"'");
                    _this.stop();
                }
                if (_this.frameCount > _this.options.frames) {
                    if (Physics.debugMode) {console.log("[SIMLOOP_LOOP] Stopping simulation loop. Frame "+_this.frameCount+" has reached limit of "+_this.options.frames+" frames.")};
                    _this.doneRendering = true;
                    _this.runLoop = false;
                } else {
                    if (Physics.debugMode) {console.log("[SIMLOOP_LOOP] Processed frame "+_this.frameCount)}
                }
                if (_this.options.executeOnFrame) {
                    try {
                        _this.options.onFrame(_this);
                    } catch(e) {
                        console.error("[SIMLOOP_LOOP] Error executing onFrame function for renderLoop. E: '"+e+"'");
                        if (Physics.stopRenderFunctionOnError) {
                            _this.options.executeOnFrame = false;
                        } else {
                            console.warn("[SIMLOOP_LOOP] RenderLoop onFrame function has thrown an error, however flag is set so loop will not stop");
                        }
                    }
                }
            });
            requestAnimationFrame(function(){
                _this.renderFunction();
            });
        }
        //createRenderLoop(this, this.options.queueNum, this.args);
        this.start = function() { //start rendering loop
            this.runLoop = true;
            var _this = this;
            var promise = new Promise(function(resolve, reject) {
                createSimulationLoop(_this, _this.options.queueNum, _this.args); //pass the args to the function
                var doneinterval = setInterval(function(){
                    if (_this.doneRendering) {
                        clearInterval(doneinterval);
                        resolve(_this.frames);
                    }
                },10);
                setTimeout(function(){
                    console.warn("Stopped simulation loop on frame "+_this.frameCount+" out of target framecount "+_this.options.frames);
                    clearInterval(doneinterval);
                    _this.stop();
                    reject(_this.frames);
                },_this.options.timeout); //timeout to stop rendering after arbitrary amount of time
            });
            return promise;
        }
        this.stop = function() { //stop rendering loop
            this.runLoop = false;
        }
        Physics.renderLoopNext++;

    },
    recallFrame: function() { //save the last rendered frame
        return Physics.startString+Physics.renderBuffer.join(Physics.defaultNewlineChar);
    },
    displaySavedFrame: function(frame) {
        if (typeof frame == "undefined") {
            console.error("[DISPSAVEDFRAME] No frame in the form of an object or string was passed into function");
            return;
        } else {
            var str = "";
            if (frame.constructor == Array) {
                str = Physics.startString+frame.join(Physics.defaultNewlineChar); //regen frame, probably renderbuffer
            } else {
                str = frame;
            }
            Physics.element.innerHTML = str;
        }
    }
}

Physics.shape.prototype.update = Physics.shape3d.prototype.update = function() {//don't need vector display calculate because it won't be used (no gravity)
    this.calculate();

    var deltaTime = (Physics.forceAverageDelta) ? ((Physics.oldDelta+((Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond)))/2) : (Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond); //calculate deltatime as ratio between tme since last update and updates per second vs calculate deltatime since last frame as ratio between time between last update and updates per second averaged with the last frames delta to redce spikes
    var fps = Math.round((1/deltaTime)*10000)/100;
    Physics.currentFPS = (fps == Infinity) ? 0 : fps;
    Physics.oldDelta = deltaTime; //average delta to avoid spikes

    if (typeof this.physics === "undefined" || typeof this.velocity.x === "undefined" || typeof this.velocity.y === "undefined") {
            console.error("[PHYSICS_UPDATE] Object passed in to update function has no gravity constants");
    } else {
        //do velocity verlet integration
        var FORCE = new Physics.util.vec2d(0,0);
        if ((this.y+this.velocity.y)<(Physics.height-this.height)) { //within constraints
            FORCE.y += this.mass * Physics.constants.gravitationalConstant.y; //gravity
        } else {
            this.velocity.y = 0;
            this.acceleration.y = 0;
            this.position.y = Physics.height;
            this.y = this.position.y;
        }
        //FORCE.x += this.mass * Physics.frictionConstant.x;
        FORCE.x += this.coefficients.mu*-1*deltaTime; //kinetic friction in opposite direction to movement
        /*if (FORCE.x < this.coefficients.staticFrictionCutoff*0.00000001) { //static friction
            FORCE.x = 0;
        }*/
        if (this.velocity.x < this.coefficients.staticFrictionCutoff) {
            this.velocity.x = 0;
            this.acceleration.x = 0;
        }
        /*if (this.velocity.x < Physics.frictionConstant.x && this.velocity.x > -Physics.frictionConstant.x) { //fix for glitch where momentum will be less than constant and oscillation occurs
            this.velocity.x = 0;
        }*/

        var TORQUE = 0;
        TORQUE+=this.rotation.omega*this.coefficients.angularDamping;

        this.position = new Physics.util.vec2d(this.x,this.y);
        var lastAccel = this.acceleration;
        //console.log("pos: "+JSON.stringify(this.position)+", vel: "+JSON.stringify(this.velocity)+", accel: "+JSON.stringify(this.acceleration)+", lastAccel: "+JSON.stringify(lastAccel))

        this.position.add(this.velocity.scale(deltaTime).add(lastAccel.scale(0.5).scale(deltaTime^2))); //position integration
        this.x = this.position.x/100;
        this.y = this.position.y/100;

        var newAccel = FORCE.scale(1/this.mass); //calculate new acceleration with multiplying instead of dividing (1/mult)
        var avgAccel = lastAccel.add(newAccel).scale(0.5);
        console.log("FORCE: "+JSON.stringify(FORCE)+", newAccel: "+JSON.stringify(newAccel)+", avgAccel: "+JSON.stringify(avgAccel))
        this.velocity.add(avgAccel.scale(deltaTime));

        this.rotation.alpha = TORQUE/this.coefficients.J;
        this.rotation.omega+=this.rotation.alpha*deltaTime;
        var deltaTheta = this.rotation.omega*deltaTime;
        this.rotation.theta+=deltaTheta;
        console.log(this.rotation.theta)
        this.rotate(this.rotation.theta); //rotate shape radians
    }

    Physics.lastUpdate = Date.now();
}

Physics.shape.prototype.calculate = Physics.shape3d.prototype.calculate = function() { //don't need vector display calculate because it won't be used
    if (this.pointTable === undefined || this.updPointTable === undefined) {
        console.error("[PHYSICS_CALCULATE] No point table or updatePointTable object found")
    } else {
        this.updPointTable = [];
        for (var i=0; i<this.pointTable.length; i++) {
            this.updPointTable[i] = [];
            if (this.pointTable[i].length == 2) {
                this.updPointTable[i][0] = this.pointTable[i][0]+this.x;
                this.updPointTable[i][1] = this.pointTable[i][1]+this.y;
            } else {
                console.error("[PHYSICS_CALCULATE] Point table i:"+i+" has an invalid point length, not 2");
            }
        }
    }
    this.centerPoint = [(this.updPointTable[0][0]+(0.5*(this.width || this.radius || this.length || this.height || 0))),(this.updPointTable[0][1]+(0.5*(this.height || this.radius || this.length || this.width || 0)))];
}

Physics.shape.prototype.recalculateWeight = Physics.shape3d.prototype.recalculateWeight = Physics.util.vectorDisplay.prototype.recalculateWeight = function() {
    var chars = 0; //recalculate chars
    for (var i=0; i<this.mesh.length; i++) {
        for (var j=0; j<this.mesh[i].length; j++) {
            if (this.mesh[i][j] == this.character) {
                chars++;
            }
        }
    }
    if (Physics.debugMode) {
        console.log("[PHYSICS_RECALCWEIGHT] Recalculate Chars for shape, chars= "+chars+", UUID= "+this.UUID)
    }
    this.characters = chars; //square root characters
    this.sqrtcharacters = Math.sqrt(chars);
    this.mass = this.sqrtcharacters*Physics.constants.weightPerCharacter;
    this.weight = Physics.constants.gravitationalConstant.y*this.mass; //calculate weight by g*m
    this.friction = Physics.constants.frictionConstant.x*this.weight; //calculate friction by f*w
    this.coefficients.J = this.mass*((this.height*this.height)+(this.width*this.width) / 12000); //set J coeff
}

Physics.shape.prototype.regenColorMesh = Physics.shape3d.prototype.regenColorMesh = Physics.util.vectorDisplay.prototype.regenColorMesh = function(newColor) {
    if (typeof newColor == "undefined") {
        return console.error("[REGEN_COL_MESH] Passed color is undefined");
    }
    this.colorMesh = [];
    this.color = newColor;
    for (var i=0; i<this.mesh.length; i++) {
        this.colorMesh[i] = [];
        for (var j=0; j<this.mesh[i].length; j++) {
            if (this.type == "custom" && this.mesh[i][j] !== " ") {
                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.mesh[i][j]+"</span>");
            } else if (this.mesh[i][j] == this.character) {
                this.colorMesh[i].push("<span style='color: "+this.color+";'>"+this.character+"</span>");
            } else {
                this.colorMesh[i].push(Physics.defaultSpaceChar);
            }
        }
    }
}

Physics.shape.prototype.moveTowardsObject = Physics.shape3d.prototype.moveTowardsObject = function(object,maxspeed) {
    maxspeed = Math.abs(maxspeed);
    var diffx = -((this.x + ((this.width || this.length) / 2)) - object.x);
    if(diffx < 0 && diffx < -maxspeed) { // max speed left
        diffx = -maxspeed;
    } else if (diffx > 0 && diffx > maxspeed) { // max speed right
        diffx = maxspeed;
    }
    if ((this.enableRight && diffx > 0) || (this.enableLeft && diffx < 0)) {
        this.x+=diffx;
    }

    var diffy = -((this.y + (this.height / 2)) - object.y);
    if(diffy < 0 && diffy < -maxspeed) { // max speed up
        diffy = -maxspeed;
    } else if (diffy > 0 && diffy > maxspeed) { // max speed down
        diffy = maxspeed;
    }
    if ((this.enableUp && diffy < 0) || (this.enableDown && diffy > 0)) {
        this.y+=diffy;
    }
    if (Physics.debugMode) {console.log("[CONTROL_MOVEOBJ] movetowards object diffx: "+diffx+", diffy: "+diffy);}
}

var play = [];
var timeSinceUpKey;
var timeBetweenJumps = 900;
var lastKeyPress = Date.now();
var map = {};
Physics.shape.prototype.controlGravity = Physics.shape3d.prototype.controlRaw = function() {
    play = this;
    window.onkeydown = window.onkeyup = function(e) {
        var e = window.event ? window.event : e;
        map[e.keyCode] = e.type == 'keydown';
        if (map["37"] || map["38"] || map["39"] || map["40"]) {
            e.preventDefault();
        }
        if (map["38"] && play.enableUp) { //up
            timeSinceUpKey = Date.now()-lastKeyPress;
            if (play.velocity.y < Physics.constants.gravitationalConstant.y && timeSinceUpKey > timeBetweenJumps) {
                lastKeyPress = Date.now();
                play.y-=2;
                setTimeout(function(){
                    play.velocity.y = -10;
                },50);
            }
        }
        if (map["40"] && play.enableDown) { //down
            if (play.y+play.height == Physics.height || play.velocity.y < Physics.constants.gravitationalConstant.y) {
                play.velocity.y = 10;
            }
        }
        if (map["37"] && play.enableLeft) { //left
            if (play.velocity.x < Physics.terminalVelocity && play.velocity.x > -Physics.constants.terminalVelocity) {
                play.velocity.x = -5;
            }
        }
        if (map["39"] && play.enableRight) { //right
            if (play.velocity.x < Physics.terminalVelocity && play.velocity.x > -Physics.constants.terminalVelocity) {
                play.velocity.x = 5;
            }
        }
    }
}

var playraw = [];
var mapraw = {};
Physics.shape.prototype.controlRaw = Physics.shape3d.prototype.controlRaw = function(multiplier) {
    if (typeof multiplier === "undefined") {
        multiplier = 1;
    }
    playraw = this;
    window.onkeydown = window.onkeyup = function(e) {
        var e = window.event ? window.event : e;
        mapraw[e.keyCode] = e.type == 'keydown';
        if (mapraw["37"] || mapraw["38"] || mapraw["39"] || mapraw["40"]) {
            e.preventDefault();
        }
        if (mapraw["38"] && playraw.enableUp) { //up
            playraw.y-=1*multiplier;
        }
        if (mapraw["40"] && playraw.enableDown) { //down
            playraw.y+=1*multiplier;
        }
        if (mapraw["37"] && playraw.enableLeft) { //left
            playraw.x-=1*multiplier;
        }
        if (mapraw["39"] && playraw.enableRight) { //right
            playraw.x+=1*multiplier;
        }
    }
}

var mousePos, mouseOffsetX, mouseOffsetY;
var mouseDown = false;
var relMousePos = {x: 0, y: 0}
var playmouse = [];

Physics.shape.prototype.controlMouse = Physics.shape3d.prototype.controlMouse = function() {
    playmouse = this;
    document.onmousemove = function(e) {
        handleMouseMove(e);
        if (playmouse.enableUp) {
            if (relMousePos.y<=playmouse.y) {
                playmouse.y = relMousePos.y;
            }
        }
        if (playmouse.enableDown) {
            if (relMousePos.y>=playmouse.y) {
                playmouse.y = relMousePos.y;
            }
        }
        if (playmouse.enableLeft) {
            if (relMousePos.x<=playmouse.x) {
                playmouse.x = relMousePos.x;
            }
        }
        if (playmouse.enableRight) {
            if (relMousePos.x>=playmouse.x) {
                playmouse.x = relMousePos.x;
            }
        }
    };
}

function handleMouseMove(event) {
    var dot, eventDoc, doc, body, pageX, pageY;

    event = event || window.event; // IE-ism

    // If pageX/Y aren't available and clientX/Y are,
    // calculate pageX/Y - logic taken from jQuery.
    // (This is to support old IE)
    if (event.pageX == null && event.clientX != null) {
        eventDoc = (event.target && event.target.ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        event.pageX = event.clientX +
          (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
          (doc && doc.clientLeft || body && body.clientLeft || 0);
        event.pageY = event.clientY +
          (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
          (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

    mousePos = {
        x: event.pageX,
        y: event.pageY
    };

    var pos = mousePos;
    var newx, newy;
    if (!pos) {
        console.warn("[CONTROL_MOUSE] UpdateMousePos called when no mouse movement was seen");
    } else {
        var px = pos.x-=mouseOffsetX;
        var py = pos.y-=mouseOffsetY;
        var ppx = window.innerWidth/Physics.width;
        var ppy = window.innerHeight/Physics.height;
        newx = Math.round(px/ppx);
        newy = Math.round(py/ppy);
        //console.log(newx,newy);
    }

    relMousePos = {
        x: newx,
        y: newy
    }
}
