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
To initialize the physics library, you first must set the element and initialize. In the last step, we set the element to a ```<pre>``` element with the ID "phys".

    Physics.element = doocument.getElementById("phys");
    Physics.init();

# Demos
[Platformed](https://aaronbecker.tech/code/platformedv5)

# Changelog
