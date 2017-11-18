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
There are 12 options that apply to all shapes. This may seem like a lot, but only 3 or 4 are used regularly.
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

| Type of Shape | Name When Constructing | Required Option 1 | Required Option 2 | Required Option 3 | Effect |
|---|---|---|---|---|---|
| Circle | circle | radius | filled | | Radius sets radius of circle to draw; filled sets whether the circle is filled or not. |
| Triangle | triangle | height | width | | Height sets height of triangle; width is width of triangle |
| Rectangle | rect | height | width | filled | Height sets height of rectangle; width sets width; filled sets whether rectangle is filled or not |
| Line | line | length | | | Length sets length of line |

In addition to the 4 base types of shapes, there is one additional type, called custom. To use this, you don't need to specify a width, height, length, or any options that define the size shape. Instead, supply a mesh options that contains characters in an array by line. Since the shape below is not any of the previous types, it will need to specified as a custom mesh.

    (***)
      |  
    |---|
    | | |
      |  
      |  
    -| |-

To render this, you first need to make into an array with each line as another argument. The shape above would become the array: \["(***)","  |  ","|---|","| | |","  |  ","  |  ","-| |-"\]. Then, you would pass it 
### Create Shape - 3D

### Render!
# Demos
[Platformed](https://aaronbecker.tech/code/platformedv5)

# Changelog
