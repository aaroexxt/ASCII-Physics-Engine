/*
* physics.js by Aaron Becker
* A complete ASCII physics and rendering engine written in JavaScript
*/

/*
 * @license
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
    startString: "PHYV5:<br><br>",
    //CONSTANTS
    gravitationalConstant: new notLoadedVector("gravitationalConstant",0,0.05), //gravitational constant
    frictionConstant: new notLoadedVector("frictionConstant",1,0), //frictional constant
    weightPerCharacter: 0.4, //weight is calculated per character
    terminalVelocity: 7, //maximum velocity in any direction
    ticksPerSecond: 60, //limit number of physics calls per second
    updatesPerSecond: 40, //limit number of gravity updates per second
    renderPerSecond: 50, //limit renders performed per second
    renderInColor: false, //very beta
    //TIMING VARIABLES
    now: Date.now(),
    nextTick: Date.now(),
    nextUpdate: Date.now(),
    nextRender: Date.now(), //currently disabled because of problems with timing, go to line 279 to change this (line may change as I remove/add code)
    lastUpdate: Date.now(),
    oldDelta: 0,
    //PHYSICS CONSTANTS
    enableDeltaTimeCalculations: true, //can help mitigate low framerates by making physics work over a dynamic timescale
    simpleDeltaCalculations: true, //use simple (fast) or complex (slow) calculations for delta time
    forceAverageDelta: false, //force delta time calculation to average over multiple frames (more stable in general, lag spikes are not handeled as well though)
    moreEfficientPhysics: true, //beta and kind of works, implements AABB collision to avoid having to do narrow collision for everything
    //GENERAL CONSTANTS
    debugMode: false, //enables a LOT of debug messages
    allGravity: false, //force all rendered shapes to have gravity (funny in games)
    recalculateWeightOnFrame: true, //recalculate weight for shape on every frame vs on creation of shape (don't use with lots of shapes)
    updateColorMeshOnVectorChange: true, //update color mesh for vector on update (not needed if color rendering is disabled)
    width: window.innerWidth,
    height: window.innerHeight,
    lineHeight: 0.65,
    initialLineHeight: 0.83,
    collisionAccuracy: 0.5, //maximum difference for narrow collision between pixels
    ignoreMeshSize: false, //DO NOT ENABLE UNLESS YOU ARE TESTING (disables error checking for rendering shapes that are too large or small)
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
                    console.error("[SHAPE_CONSTRUCT] Mesh for custom object is undefined");
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
                            if (options.mesh[i][j] == " " && this.overrideSpacesInCustomShape === true) {
                                this.colorMesh[i] += " ";
                            } else {
                                this.colorMesh[i] += "<span style='color: "+this.color+";'>"+options.mesh[i][j]+"</span>";
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
                console.error("[SHAPE_CONSTRUCT] Shape "+this.type+" not found. There may be errors rendering.");
            }
            this.pointTable.uniqueify(); //remove calls for multiple points
            this.update(); //update to start gravity and set updated point table
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
        this.pointTable.uniqueify(); //remove calls for multiple points
        this.update(); //update to start gravity and set updated point table
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
                    "l" : {mesh:["    __                   __","   / /   ___ _   _____  / /","  / /   / _ \\ | / / _ \\/ / "," / /___/  __/ |/ /  __/ /  ","/_____/\\___/|___/\\___/_/   "], x: 0, y:0} //level
                }
            },
            extranums: [],
            init: function() {
                var keys = Object.keys(Physics.util.asciitext.fonts);
                for (var i=0; i<keys.length; i++) { //for every font in list
                    var keysfont = Object.keys(Physics.util.asciitext.fonts[keys[i]]);
                    for (var j=0; j<keysfont.length; j++) { //for every number from font in list
                        var item = Physics.util.asciitext.fonts[keys[i]][keysfont[j]];
                        //console.log(JSON.stringify(item))
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
        angleDisplay: function(shape, vec) { //angle display function (not finished)

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
            this.gravity = false;
            this.onlyWriteNonemptyPixels = true;
            this.colorMesh = ["VecNotCompatible"]; //noncompatible with color for now
            this.mx = Math.round(this.centerPoint[0]);
            this.my = Math.round(this.centerPoint[1]);
            this.shapeArrayNum = Physics.renderLoopShapes.length;
            Physics.renderLoopShapes[Physics.renderLoopShapes.length] = this;
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
            this.add = function(vec) {
                this.x += vec.x;
                this.y += vec.y;
                return this;
            }
            this.mix = function(vec, amount) {
                if (typeof amount === 'undefined') {
                    amount = 0.5;
                }

                this.y = (1 - amount) * this.y + amount * vec.y;
                this.x = (1 - amount) * this.x + amount * vec.x;
                return this;
            }
            this.sub = this.subtract = function(vec) {
                if (vec.x == 0) {
                    this.x = 0;
                } else {
                    this.x -= vec.x;
                }
                if (vec.y == 0) {
                    this.y = 0;
                } else {
                    this.y -= vec.y;
                }
                return this;
            }
            this.multiply = function(vec) {
                this.x *= vec.x;
                this.y *= vec.y;
                return this;
            }
            this.divide = function(vec) {
                this.x /= vec.x;
                this.y /= vec.y;
                return this;
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
                            console.error("[RENDER_PRE] Bad shape detected in array passed");
                        }
                    }
                } else {
                    bad = true;
                    if (Physics.debugMode) {
                        console.log("[RENDER_PRE] Discovered argument that is not array in render");
                    }
                }
            }
        }
        if (bad == false && badshape == false) {
            args = [];
            for(var i=0; i<arrlist.length; i++) {
                if (Physics.debugMode) {
                    console.log("[RENDER_PRE] Changing arguments passed into render because of array, i="+i);
                }
                args.push(arrlist[i]);
            }
        } else {
            for (var i=0; i<arguments.length; i++) {
                args.push(arguments[i]);
            }
        }
        //console.info(JSON.stringify(Physics.renderBuffer))
        var colorXOffset = [];
        var rtolRender = [];
        if (Physics.renderInColor) { //what is this even and why is it here I guess I'll leave it (I'm probably going to want to delete it anyways)
            for (var i=0; i<args.length; i++) {

            }
        }
        for (var i=0; i<args.length; i++) { //add meshes to screen
            if (args[i] != true && args[i] != false && typeof args[i] !== "undefined") {
                //alert(JSON.stringify(args[i]))
                try {
                    if ((args[i].gravity == true || Physics.allGravity) && (nextUpdateReached || true)) { //calculate gravity
                        if (Physics.debugMode) {console.log("[RENDER_MAIN] Updating velocity for shape: "+args[i].type+", UUID: "+args[i].UUID+" (velX: "+args[i].velocity.x+", velY: "+args[i].velocity.y+")")}
                            args[i].update(false);
                    }
                } catch(e) {
                    console.error("[RENDER_MAIN] Error updating gravity for shape. Shape: "+args[i]+", e: "+e);
                    //console.log(JSON.stringify(args))
                }
                if (args[i].UUID === undefined) { //sanity check!!
                    if (!(i == 0 && (args[i] == true || args[i] == false))) {
                        console.error("[RENDER_MAIN] Error drawing: argument "+i+" does not exist or doesn't have a UUID");
                    }
                } else {
                    var bad = false;
                    try {
                        args[i].width = args[i].mesh[0].length;
                        args[i].height = args[i].mesh.length;
                    } catch(e) {
                        bad = true;
                        console.error("[RENDER_MAIN] Error rendering: argument "+i+" doesn't have a width or height property")
                    }
                    if ((args[i].width > Physics.width || args[i].height > Physics.height) && args[i].type != "colorbox") {
                        if (Physics.ignoreMeshSize) {
                            console.warn("[RENDER_MAIN] Warning: the IgnoreMeshSize flag is enabled. The mesh you are *attempting* to render is too large for the screen. Parts of what you are trying to render may be cut off. Normally, this would throw an error, but not anymore :)");
                        } else {
                            bad = true;
                            console.error("[RENDER_MAIN] Error rendering: argument "+i+"'s mesh is too large to fit on screen");
                        }
                    }
                    if (bad == false) {
                        var x = constrain(args[i].x,0,(Physics.width-args[i].width)); //constrain x
                        var y = constrain(args[i].y,0,(Physics.height-args[i].height)); //constrain y
                        args[i].x = x; //fix bug where y position keeps changing
                        args[i].y = y;
                        x = Math.round(x);
                        y = Math.round(y);
                        //console.info("x: "+args[i].x+", y: "+args[i].y+", CONSTx: "+x+", CONSTy: "+y)
                        if (Physics.debugMode){console.info("[RENDER_MAIN] Shape to be placed at x: "+x+", y: "+y);}
                        if (args[i].mesh.length == 0 || args[i].colorMesh.length == 0) {
                            console.error("[RENDER_MAIN] Error rendering: shape has no mesh (or colorMesh) to render!");
                        } else {
                            if (nextFrameReached || clearScreen == false || args[i].overrideRenderLimit || true) { //I'll fix the render timing later, it doesn't work
                                var mesh = (Physics.renderInColor) ? args[i].colorMesh : args[i].mesh;
                                //console.log((Physics.renderInColor || args[i].UUID == titleplayer.UUID) ? "Color mesh selected" : "");
                                for (var j=0; j<mesh.length; j++) { //for every line of mesh
                                    if (Physics.renderInColor) {
                                        //Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y][x] += args[i].colorMesh[j];
                                        /*if (Physics.renderBuffer[j+y].substr(x, x+1) != " ") {
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, x) + args[i].colorMesh[j] + Physics.renderBuffer[j+y].slice(x);
                                        } else {
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(x,args[i].colorMesh[j]); //MAKE IT SLICE IN CHARS NOT REPLACE
                                        }*/
                                        Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, x) + args[i].colorMesh[j] + Physics.renderBuffer[j+y].slice(x);
                                        //CHANGE SO REMOVES NUMBER OF CHARACTERS THAT WERE REPLACED: Ex. inserts player at certain x, then adds playerx+playerwidth and removes (playerwidth) characters
                                        var endX = args[i].x+args[i].colorMesh[j].length;
                                        //loop
                                        /*for (var z=0; z<(args[i].width || args[i].length); z++) {
                                            if (Physics.renderBuffer[j+y].substring(endX+z,endX+z+1) == " ") {
                                                //break;
                                            }
                                            Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, endX+z) + Physics.renderBuffer[j+y].slice(endX+z+1);
                                        }*/
                                        // oneliner: Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].slice(0, endX) + Physics.renderBuffer[j+y].slice(endX+(args[i].width || args[i].length));
                                        Physics.charsPerFrame+=args[i].colorMesh[j].length;
                                        if (Physics.debugMode){console.log("[RENDER_RENDER] Adding to buffer (COLOR) at x: "+(x)+", y: "+(j+y)+", offset: "+JSON.stringify(colorXOffset)+", j val: "+j+", chars: "+args[i].colorMesh[j])}
                                    } else {
                                        for (var b=0; b<mesh[j].length; b++) { //for every character in mesh
                                            try {
                                                //console.log(Physics.renderBuffer[j+y][b+x])
                                                if (args[i].replaceWithSpace && Physics.renderBuffer[j+y][b+x] != " ") { //OPTION TO REPLACE AIR SPACE OR NOT
                                                    Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x," ");
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
                                                }
                                            } catch(e) {
                                                if (!Physics.ignoreMeshSize) {
                                                    console.error("[RENDER_RENDER] Error while rendering physics buffer for shape "+args[i].type+", UUID "+args[i].UUID+", x: "+(b+x)+", y: "+(j+y)+", error: "+e);
                                                }
                                            }
                                            if (Physics.debugMode){console.log("[RENDER_RENDER] Adding to buffer (non-color) at x: "+(b+x)+", offset: "+JSON.stringify(colorXOffset)+", j val: "+j+", y: "+(j+y)+", char: "+mesh[j][b])}
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
                        console.error("[COLL_PRE] Bad shape detected in array passed");
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

        if (args.length < 2) {
            console.error("[COLL_MAIN] Error while calculating collisions: there is only one (or none) shape passed into the function.");
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
                for (var i=0; i<args.length; i++) {
                    args[i].collisionBottom = false;
                    args[i].collisionTop = false;
                    args[i].collisionRight = false;
                    args[i].collisionLeft = false;
                }
                for (var i=0; i<args.length; i++) {
                    /*if (args[i].updPointTable === undefined || args[i].centerPoint === undefined || (typeof args[i].centerPoint[0] == "number" && isNaN(args[i].centerPoint[0]))) {
                        args[i].update(); //calculate gravity and updPointTable, as well as center point
                    }*/
                    args[i].calculate();
                    for (var j=1; j<args.length-1; j++) {
                        /*if (args[i].updPointTable === undefined || args[j].centerPoint === undefined || (typeof args[i].centerPoint[0] == "number" && isNaN(args[i].centerPoint[0]))) {
                            args[j].update(); //calculate gravity and updPointTable
                        }*/
                        if (j==1) {
                            args[j].calculate();
                        } //only need to do this for one iteration of j to save computational power
                        if (typeof args[i] != "undefined" && typeof args[j] != "undefined") {
                            if (args[i] !== args[j]) {
                                if (Physics.debugMode) {
                                    console.log("[COLL_MAIN] Arguments evaluating for collision type: "+args[i].type+" "+args[j].type);
                                }
                                switch((Physics.moreEfficientPhysics) ? (args[i].type+" "+args[j].type) : ("nomatch")) { //first try broad methods to simplify computation time by matching against preset scenarios
                                    case "box box":
                                        if (args[i].x < args[j].x + args[j].width && args[i].x + args[i].width > args[j].x && args[i].y < args[j].y + args[j].height && args[i].height + args[i].y > args[j].y) {
                                            Physics.determineCollisionSide(args[i],args[j]);
                                        }
                                    break;
                                    case "line box":
                                        if (args[i].x < args[j].x + args[j].width && args[i].x + args[i].length > args[j].x && args[i].y < args[j].y + args[j].height && 1 + args[i].y > args[j].y) {
                                            Physics.determineCollisionSide(args[i],args[j]);
                                        }
                                    break;
                                    case "box line":
                                        if (args[i].x < args[j].x + args[j].length && args[i].x + args[i].width > args[j].x && args[i].y < args[j].y + 1 && args[i].height + args[i].y > args[j].y) {
                                            Physics.determineCollisionSide(args[i],args[j]);
                                        }
                                    break;
                                    case "line line":
                                        if (args[i].x < args[j].x + args[j].length && args[i].x + args[i].length > args[j].x && args[i].y < args[j].y + 1 && 1 + args[i].y > args[j].y) {
                                            Physics.determineCollisionSide(args[i],args[j]);
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
                                        Physics.inefficientArr[Physics.inefficientArr.length] = args[i];
                                        Physics.inefficientArr[Physics.inefficientArr.length] = args[j];
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
                        console.error("[COLL_NARROW] Physics coll i+1 val missing, calculating with previous argument");
                        Physics.calculate_collisions_narrow(Physics.innefficientArr[i],Physics.inefficientArr[i-1]);
                    }
                }
                if (Physics.debugMode) {
                    console.log("[COLL_MAIN] Physics collision checking ineffifiency: "+((inefficient/(Math.pow(args.length,2)))*100)+"%, inefficiently processed args: "+inefficient+", args: "+args.length);
                }
                Physics.collisionEfficiency = 100-((inefficient/(Math.pow(args.length,2)))*100);
            }
        }

        //memory of which blocks are different from part of rendering
    },
    calculate_collisions_mid: function() {

    },
    calculate_collisions_narrow: function() {
        //console.log(arguments.length)
        if (arguments.length < 2) {
            console.error("[COLL_NARROW] Error while calculating collisions: there is only one (or none) shape passed into function.");
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
                                    console.log("[COLL_NARROW] Collision detected between "+arguments[i].type+" (UUID: "+arguments[i].UUID+") and "+arguments[j].type+" (UUID: "+arguments[j].UUID+"), X1: "+arguments[i].updPointTable[b][0]+", Y1: "+arguments[i].updPointTable[b][1]+", X2: "+arguments[j].updPointTable[z][0]+", Y2: "+arguments[j].updPointTable[z][0]);
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
                    console.error("[COLL_DETERMINESIDE] Error calculating collision side from collision (x axis), try running update on shape "+shape.type+", UUID "+shape.UUID);
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
                    console.error("[COLL_DETERMINESIDE] Error calculating collision side from collision (y axis), try running update on shape "+shape.type+", UUID "+shape.UUID);
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
                    console.error("[COLL_DETERMINESIDE] Error calculating collision side from collision (x axis), try running update on shape "+shape2.type+", UUID "+shape2.UUID+"Point X: "+shape2.updPointTable[shape1ind][0]+", center X: "+shape2.centerPoint[0]);
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
                    console.error("[COLL_DETERMINESIDE] Error calculating collision side from collision (y axis), try running update on shape "+shape2.type+", UUID "+shape2.UUID);
                    shape2.calculate();
                }
            }
        }

        if (Physics.debugMode) {
            console.log("[COLL_DETERMINESIDE] Shape 1 updPointTable "+JSON.stringify(shape.updPointTable[shape1ind])+", Shape 2 updPointTable "+JSON.stringify(shape2.updPointTable[shape2ind])+", Shape 1 centerPoint "+JSON.stringify(shape.centerPoint)+", Shape 2 centerPoint "+JSON.stringify(shape2.centerPoint)+", Shape 1 collide "+shape.collide+", Shape 2 collide "+shape2.collide)
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
                Physics[notLoadedVectors[i][0]] = new Physics.util.vec2d(notLoadedVectors[i][1],notLoadedVectors[i][2]);
            }
            //delete notLoadedVectors;
            Physics.util.asciitext.init(); //initialize asciitext
            console.typeable("debugon","console.log(\"[INIT] Type debugon into the console to enable debug mode. (Warning: there is about 1000 debug messages outputted per second)\");","console.log(\"Debug mode active.\"); Physics.debugMode = true;");
            console.typeable("debugoff","console.log(\"[INIT] Type debugoff into the console to disable debug mode.\");","console.log(\"Debug mode disabled.\"); Physics.debugMode = false;");
            console.typeable("debug2s","console.log('[INIT] Type debug2s into the console to perform auto-test of code for 2s and then stop it. (Mostly for debugging broken things in render loop)');","console.clear(); debugon; setTimeout(function(){debugoff;},2000);");
            //console.typeable("stop","console.log('Type stop into the console to stop the game.');","fpsInterval = 0;")

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
                    var renderstr = "Physics.render("+_this.options.clear+",";
                    var shapesarr = [];
                    for (var i=1; i<args.length; i++) {
                        try{if (Physics.debugMode) {console.log("[CREATERENDERLOOP] Args into renderloop i: "+i+", arg: "+JSON.stringify(args[i]));}}catch(e){}
                        shapesarr.push(Physics.renderLoopShapes[args[i].shapeArrayNum]);
                    }
                    if (_this.firstRun) {
                        if (Physics.debugMode){console.log("[RENDERLOOP_CREATE] firstrun renderloopauto: "+JSON.stringify(shapesarr));}
                        Physics.render(true,shapesarr);
                        //eval(firstrunstr); //No eval here!!! Changed to array
                        _this.firstRun = false;
                    }
                    if (Physics.debugMode) {console.log("[RENDERLOOP_CREATE] shapesarr: "+JSON.stringify(shapesarr));}
                    //console.log(JSON.stringify(_this.options))
                    if (_this.options.collision) {
                        Physics.calculate_collisions(shapesarr); //No eval here either!
                    }
                    try {
                        Physics.render(_this.options.clear,shapesarr); //still no eval!
                    } catch(e) {
                        console.error("[RENDERLOOP_LOOP] Error executing render function for renderLoop. E: '"+e+"'");
                    }
                    if (_this.options.executeOnFrame) {
                        try {
                            _this.options.onFrame(_this);
                        } catch(e) {
                            _this.options.executeOnFrame = false;
                            console.error("[RENDERLOOP_LOOP] Error executing onFrame function for renderLoop. E: '"+e+"'");
                        }
                    }
                }
            });
            requestAnimationFrame(function(){
                _this.renderFunction();
            });
        }
        //createRenderLoop(this, this.options.queueNum, this.args);
        this.start = function() {
            this.runLoop = true;
            createRenderLoop(this, this.options.queueNum, this.args); //pass the args to the function
        }
        this.stop = function() {
            /*try{
                clearInterval(this.loopNum);
            } catch(e) {
                console.error("Error stopping renderLoop. E: "+e+", RENDERLOOP_MAIN")
            }*/
            this.runLoop = false;
        }
        Physics.renderLoopNext++;

    }
}

Physics.shape.prototype.update = Physics.shape3d.prototype.update = function(render) {//don't need vector display calculate because it won't be used (no gravity)
    this.calculate();

    var deltaTime = (Physics.forceAverageDelta) ? ((Physics.oldDelta+((Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond)))/2) : (Date.now()-Physics.lastUpdate)/(1000/Physics.updatesPerSecond); //calculate deltatime as ratio between tme since last update and updates per second vs calculate deltatime since last frame as ratio between time between last update and updates per second averaged with the last frames delta to redce spikes
    Physics.oldDelta = deltaTime; //average delta to avoid spikes

    var frictionRatio = 1 / (0.3 + (deltaTime * Physics.frictionConstant.x));
    var gravityRatio = 1 / (0.7 + (deltaTime * Physics.gravitationalConstant.y));

    render = render || false;
    if (typeof this.gravity === "undefined" || typeof this.velocity.x === "undefined" || typeof this.velocity.y === "undefined") {
            console.error("[PHYSICS_UPDATE] Object passed in to update function has no gravity constants");
    } else {
        if (this.gravity || Physics.allGravity) {
            this.velocity.x = constrain(this.velocity.x,-Physics.terminalVelocity,Physics.terminalVelocity);
            this.velocity.y = constrain(this.velocity.y,-Physics.terminalVelocity,Physics.terminalVelocity);
            if (this.y+this.height == Physics.height) {
                this.velocity.y = 0;
            }
            /*if (this.x+this.width == Physics.width) {
                this.velocity.x = 0;
            }*/ //Causes glitches
            //this.velocity.x *= frictionRatio;
            //this.velocity.y *= gravityRatio;
            var gconst = 0.99;
            var fconst = 0.99;

            if (typeof this.mass == "undefined" || Physics.recalculateWeightOnFrame) { //recalculate character weight if it doesn't exist
                this.recalculateWeight();
            }

            this.y += ((Physics.enableDeltaTimeCalculations)? ((!Physics.simpleDeltaCalculations) ? (this.velocity.y * (Math.pow(gconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(gconst))) : (this.velocity.y * deltaTime)) : this.velocity.y); //calculate position change as integral from 0 to dt of (velocity * (drag^(x*dt)))dx
            this.x += ((Physics.enableDeltaTimeCalculations) ? ((!Physics.simpleDeltaCalculations) ? (this.velocity.x * (Math.pow(fconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(fconst))) : (this.velocity.x * deltaTime)) : this.velocity.x);
            if (Physics.debugMode) {
                console.log("[PHYSICS_UPDATE] Complex calculations for x pos change: "+String((this.velocity.x * (Math.pow(fconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(fconst))))+" Simple calculations for x pos change: "+(this.velocity.x * deltaTime));
                console.log("[PHYSICS_UPDATE] Complex calculations for y pos change: "+String((this.velocity.y * (Math.pow(gconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(gconst))))+" Simple calculations for y pos change: "+(this.velocity.y * deltaTime));
                console.log("[PHYSICS_UPDATE] Δtime: "+deltaTime);
            }

            if (this.collisionBottom || this.collisionTop) {
                /*if (this.velocity.y > 0) { //old system
                    this.velocity.y = -Physics.gravitationalConstant.y;
                } else {
                    this.velocity.y -= 0.5;
                }*/
                this.velcocity.y = -0.25; //new system
            } else {
                if (this.velocity.y <= Physics.terminalVelocity && this.velocity.y >= -Physics.terminalVelocity) {
                    this.velocity.y += this.weight; //add vectors
                }

                /*if (this.collisionRight) { //only do x check if y is stable to prevent drifting
                    this.velocity.x = Physics.frictionConstant.x;
                } else if (this.collisionLeft) {
                    this.velocity.x = -Physics.frictionConstant.x;
                }*/
                if (this.collisionRight || this.collisionLeft) {
                    this.velocity.x = 0;
                }
            }
            if (this.velocity.x < Physics.frictionConstant.x && this.velocity.x > -Physics.frictionConstant.x) { //fix for glitch where momentum will be less than constant and oscillation occurs
                this.velocity.x = 0;
            }
            if (this.velocity.y < Physics.gravitationalConstant.y && this.velocity.y > Physics.gravitationalConstant.y) {
                this.velocity.y = 0;
            }
            if (this.collisionRight == false || this.collisionLeft == false) {
                if (this.velocity.x <= Physics.terminalVelocity && this.velocity.x >= -Physics.terminalVelocity) {
                    if (this.velocity.x > 0) {
                        this.velocity.x -= this.friction; //slow down if going positive x
                    } else if (this.velocity.x < 0) {
                        this.velocity.x += this.friction;
                    }
                }
            }
        }
        if (this.height+this.y == Physics.height) {
            this.velocity.y = 0; //used to be -2
        }
    }

    Physics.lastUpdate = Date.now();
    if (render) {
        Physics.render(false,this);
    }
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

Physics.shape.prototype.regenColorMesh = Physics.shape3d.prototype.regenColorMesh = Physics.util.vectorDisplay.prototype.regenColorMesh = function(newColor) {
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
    this.characters = Math.sqrt(chars);
    this.mass = this.characters*Physics.weightPerCharacter;
    this.weight = Physics.gravitationalConstant.y*this.mass; //calculate weight by g*m
    this.friction = Physics.frictionConstant.x*this.weight; //calculate friction
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
            if (play.velocity.y < Physics.gravitationalConstant.y && timeSinceUpKey > timeBetweenJumps) {
                lastKeyPress = Date.now();
                play.y-=2;
                setTimeout(function(){
                    play.velocity.y = -3;
                },50);
            }
        }
        if (map["40"] && play.enableDown) { //down
            if (play.y+play.height == Physics.height || play.velocity.y < Physics.gravitationalConstant.y) {
                play.velocity.y = 3;
            }
        }
        if (map["37"] && play.enableLeft) { //left
            if (play.velocity.x < Physics.terminalVelocity && play.velocity.x > -Physics.terminalVelocity) {
                play.velocity.x = -3;
            }
        }
        if (map["39"] && play.enableRight) { //right
            if (play.velocity.x < Physics.terminalVelocity && play.velocity.x > -Physics.terminalVelocity) {
                play.velocity.x = 3;
            }
        }
    }
}

var playraw = [];
var mapraw = {};
Physics.shape.prototype.controlRaw = Physics.shape3d.prototype.controlRaw = function(multiplier) {
    playraw = this;
    window.onkeydown = window.onkeyup = function(e) {
        var e = window.event ? window.event : e;
        map[e.keyCode] = e.type == 'keydown';
        if (map["37"] || map["38"] || map["39"] || map["40"]) {
            e.preventDefault();
        }
        if (map["38"] && playraw.enableUp) { //up
            playraw.y-=1*multiplier;
        }
        if (map["40"] && playraw.enableDown) { //down
            playraw.y+=1*multiplier;
        }
        if (map["37"] && playraw.enableLeft) { //left
            playraw.x-=1*multiplier;
        }
        if (map["39"] && playraw.enableRight) { //right
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

function constrain(number, min, max) {
    return number > max ? max : number < min ? min : number;
}
