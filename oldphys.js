acceleration = force / mass
velocity += acceleration * time_step
position += velocity * time_step


OLD UPDATE

var frictionRatio = 1 / (0.3 + (deltaTime * Physics.frictionConstant.x));
    var gravityRatio = 1 / (0.7 + (deltaTime * Physics.gravitationalConstant.y));
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

            this.y += ((Physics.dynamicPhysics) ? ((!Physics.simpleDeltaCalculations) ? (this.velocity.y * (Math.pow(gconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(gconst))) : (this.velocity.y * deltaTime)) : this.velocity.y); //calculate position change as integral from 0 to dt of (velocity * (drag^(x*dt)))dx
            this.x += ((Physics.dynamicPhysics) ? ((!Physics.simpleDeltaCalculations) ? (this.velocity.x * (Math.pow(fconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(fconst))) : (this.velocity.x * deltaTime)) : this.velocity.x);
            if (Physics.debugMode) {
                console.log("[PHYSICS_UPDATE] Complex calculations for x pos change: "+String((this.velocity.x * (Math.pow(fconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(fconst))))+" Simple calculations for x pos change: "+(this.velocity.x * deltaTime));
                console.log("[PHYSICS_UPDATE] Complex calculations for y pos change: "+String((this.velocity.y * (Math.pow(gconst,(deltaTime*deltaTime))-1) / (deltaTime*Math.log(gconst))))+" Simple calculations for y pos change: "+(this.velocity.y * deltaTime));
                console.log("[PHYSICS_UPDATE] Δtime between frames: "+deltaTime);
            }

            if (this.collisionBottom || this.collisionTop) {
                /*if (this.velocity.y > 0) { //old system
                    this.velocity.y = -Physics.gravitationalConstant.y;
                } else {
                    this.velocity.y -= 0.5;
                }*/
                this.velocity.y = -0.25; //new system
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




OLD COLLISIONS

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
        if (arguments.length < 1) {
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