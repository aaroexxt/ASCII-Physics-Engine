# ASCII-Physics-Engine
Physics.js is a vanilla JavaScript-based ASCII rendering engine that runs fully in text, no <canvas> or <video> element required. The only dependency is a browser with JavaScript and the script HelpLib.js, it even runs on my kindle paperwhite!

# Installation
To download, simply clone the repository to your computer or click the green "Clone or Download" and select "Download ZIP". The library is contained in dist/unminified for the raw version with comments, and dist/minified for the minified version.

# Basic Tutorial
This short section will provide a basic tutorial on how to use this library.
If you want to see a completed example of a setup, go to [the boilerplate file](https://github.com/aaroexxt/ASCII-Physics-Engine/blob/master/examples/boilerplate.html).
### Setup
To use, you must first include the required libraries under the html ```<head>``` tag, like so:

    <script src="/path/to/physics.js"></script>
    <script src="/path/to/helpLib.js"></script>
    <script src="/path/to/stats.js"></script>
    
Also, you should include a meta tag (in the ```<head>``` tag as well) for utf-8 so that you can display all utf-8 characters. If you want to display non-standard characters, this is important.

    <meta charset="utf-8">
    
In the body tag, you need to include a ```<pre>``` element for the actual place where the graphics will be rendered. Give it an ID so that it can be selected later easier.

    <pre id="phys"></pre>

And that's it, setup is done!

### Initialization
To initialize the physics library, you first must set the element and initialize the library. In the last step, we set the element to a ```<pre>``` element with the ID "phys". Inside a new ```<script>``` tag, add the code:

    Physics.element = doocument.getElementById("phys");
    Physics.init();

### Create Shape - 2D
To create a shape in 2d space, you need to make a new instance of the ```Physics.shape()``` class. This may sound complicated, but it is actually pretty simple.
To start off with an example, if I wanted to construct a rectangle that is 12 by 12 characters wide and tall, and displayed with the letter "y", I would type:

    var yayitworks = new Physics.shape("rect",{width: 12, height: 12, x: 0, y: 0, character: "y"});
    
So what does this code mean? The ```Physics.shape()``` function takes 2 arguments. The first is the type of shape, of which there are 4 prebuilt ones. (This will be explained in the next section). The second is a "options" array, where you define several options that you need to construct the shape.

There are 12 options that apply to **all shapes**. This may seem like a lot, but only 3 or 4 are used regularly.
The full list of options includes:

Option | Type of Value Passed | Effect |
|---|---|---|
| x | Integer | X position on screen |
| y | Integer | Y position on screen |
| character | Char | Character that shape is rendered with |
| gravity | Boolean | Whether shape is affected by gravity |
| collide | Boolean | Whether shape can be collided with |
| enableUp | Boolean | Whether shape can be moved up in control functions |
| enableDown | Boolean | Whether shape can be moved down in control functions |
| enableLeft | Boolean | Whether shape can be moved left in control functions |
| enableRight | Boolean | Whether shape can be moved right in control functions |
| color | String | Color to render shape in when experimental color rendering mode is enabled |
| overrideRenderLimit | Boolean | Whether shape is subjected to fixed framerate & interpolating |
| replaceWithSpace | Boolean | If shape is rendering over another shape, chars that belong to both shapes will be written over with a space |

If you forget to include an option, all options default to a certain value, so the shape can still be used.

##### Types of Shapes
There are 4 types of default shapes that are currently supported by this engine: Circles, Triangles, Rectangles, and Lines. Each has special properties in addition to the ones above that change their characteristics.
**IMPORTANT: All of the properties stated above apply to these shapes! These properties are the ones that apply only to each type of shape.**

| Type of Shape | Name When Constructing | Required Option 1 | Required Option 2 | Required Option 3 | Effect |
|---|---|---|---|---|---|
| Circle | circle | radius | filled | | Radius sets radius of circle to draw; filled sets whether the circle is filled or not. |
| Triangle | triangle | height | width | | Height sets height of triangle; width is width of triangle **NOTE: Width must be height*2.**|
| Rectangle | rect | height | width | filled | Height sets height of rectangle; width sets width; filled sets whether rectangle is filled or not |
| Line | line | length | | | Length sets length of line |

##### Using the "Custom" Shape Type
In addition to the 4 base types of shapes, there is one additional type, called custom. To use this, you don't need to specify a width, height, length, or any options that define the size shape. Instead, supply a mesh options that contains characters in an array by line. Since the shape below is not any of the previous types, it will need to specified as a custom mesh.

    (***)
      |  
    |---|
    | | |
      |  
      |  
    -| |-

To render this, you first need to make into an array with each line as another argument. The shape above would become the array: \["(***)","  |  ","|---|","| | |","  |  ","  |  ","-| |-"\]. Then, instead of passing a "width", "height", or "length" property, you would pass it the above array as the "mesh" option.

Now that we have the mesh array, the final statement would look like this:

    var customasciidude = new Physics.shape("custom",{mesh: ["(***)","  |  ","|---|","| | |","  |  ","  |  ","-| |-"], x: 0, y: 0});

***Note: If you are wondering why the mesh looks a little squished, it's because the engine has no line spacing between lines to make rendering geometry look better. To fix this, you may want to run the command ```Physics.element.style.lineHeight = String(Physics.initialLineHeight);``` This will make it look better, but geometry will look worse.
### Create Shape - 3D
Now that you know how to render 2d shapes, let's move on to 3d! ***The 3d library is somewhat experimental at the moment. There are only two shapes currently supported, the cube and the pyramid. There are several known bugs, they are listed below.***
Known Bugs:
1) X, Y, and Z positions don't line up with actual X Y and Z
2) shape3d.rotateAxis and shape3d.rotatePoint don't really work yet, they throw random errors and skew points
3) Not optimized yet, 10+ shapes updated on every frame = low framerate :(

### Render!
Once you have created your shape(s) of choice, you need to render them to the screen! **Make sure you have called Physics.init() and set Physics.element before rendering, otherwise the rendering will not work.**

Rendering is simple. Let's say we had 2 shapes, called 'awesomerectangle' and 'sometriangle'.

    var awesomerectangle = new Physics.shape("rect",{width: 5, height: 5, x: 0, y: 0, character: "*"});
    var sometriangle = new Physics.shape("triangle",{width: 5, height: 5, x: 10, y: 10, character: "^"});
Now, how do we render these? It is pretty simple. Just call Physics.render on them and they will be rendered!

    Physics.render(awesomerectangle,sometriangle);
If you are doing this demo live, you should see your two shapes pop up onscreen.
#### Render Loops
Ok, so now you know how to construct shapes, and how to render them. But, they only update every time the Physics.render function is called? To fix this problem, we should implement a rendering loop. This loop will automatically render these shapes for you.
The Physics.renderLoop function only requires 1 argument inside a object: the fps.

| Option for RenderLoop | Type of Value | Effect |
|---|---|---|
| fps | Integer | Sets time, in updates per second, that the loop will be updated. **NOTE: Since this uses the "requestAnimationFrame" function at heart, the loop is constrained to 60fps max. If you want a higher FPS, setup a loop using a setInterval function.** |
| collision | Boolean | Sets whether loop includes collision detection (if not required, set to false for better rendering times |
| onFrame | Function | A function that is called every frame. Optional argument that passes in the loop constructor for type. |

An example of a completed render loop: 
    
    var loop = new Physics.renderLoop({fps: 60, collision: false, onFrame: function(parentloop) { //create a new renderloop
                console.log("frame reached! fps: "+parentloop.options.fps); //every frame just log a simple message
    }},awesomerectangle,sometriangle); //renderloop will render shapes
    loop.start();
Notice the ```,awesomerectangle,sometriangle``` statement at the end? To actually render shapes, you need to pass in these shapes at the end. One simple render loop could look like this:

    var loop = new Physics.renderLoop({fps: 60},awesomerectangle,sometriangle); //renderloop will render shapes
    loop.start();
This loop will try render the shapes at 60fps.
In addition, the loop.start() function at the end actually starts the loop. If you want to stop the loop, use ```loop.stop();```. To restart it, simply use ```loop.start();``` again.

# Demos
[Platformed](https://aaronbecker.tech/code/platformedv5)

# Changelog
