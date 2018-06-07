        var numbers = [
            new Physics.shape("custom",{mesh:["   ____ ","  / __ \\"," / / / /","/ /_/ / ","\\____/  "], x: 0, y:0}), //0
            new Physics.shape("custom",{mesh:["   ___","  <  /","  / / "," / /  ","/_/   "], x: 0, y:0}), //1
            new Physics.shape("custom",{mesh:["   ___ ","  |__ \\","  __/ /"," / __/ ","/____/ "], x: 0, y:0}), //2
            new Physics.shape("custom",{mesh:["   _____","  |__  /","   /_ < "," ___/ / ","/____/  "], x: 0, y:0}), //3
            new Physics.shape("custom",{mesh:["   __ __","  / // /"," / // /_","/__  __/","  /_/   "], x: 0, y:0}), //4
            new Physics.shape("custom",{mesh:["    ______","   / ____/","  /___ \\  "," ____/ /  ","/_____/   "], x: 0, y:0}), //5
            new Physics.shape("custom",{mesh:["   _____","  / ___/"," / __ \\ ","/ /_/ / ","\\____/  "], x: 0, y:0}), //6
            new Physics.shape("custom",{mesh:[" _____","/__  /","  / / "," / /  ","/_/   "], x: 0, y:0}), //7
            new Physics.shape("custom",{mesh:["   ____ ","  ( __ )"," / __  |","/ /_/ / ","\\____/  "], x: 0, y:0}), //8
            new Physics.shape("custom",{mesh:["   ____ ","  / __ \\"," / /_/ /"," \\__, / ","/____/  "], x: 0, y:0}), //9
            new Physics.shape("custom",{mesh:["    __                   __","   / /   ___ _   _____  / /","  / /   / _ \\ | / / _ \\/ / "," / /___/  __/ |/ /  __/ /  ","/_____/\\___/|___/\\___/_/   "], x: 0, y:0}) //level
        ]
        var extranums = [];

        var title = {
            main: new Physics.shape("custom",{mesh:["   ▄███████▄  ▄█          ▄████████     ███        ▄████████  ▄██████▄     ▄████████   ▄▄▄▄███▄▄▄▄      ▄████████ ████████▄  ","  ███    ███ ███         ███    ███ ▀█████████▄   ███    ███ ███    ███   ███    ███ ▄██▀▀▀███▀▀▀██▄   ███    ███ ███   ▀███ ","  ███    ███ ███         ███    ███    ▀███▀▀██   ███    █▀  ███    ███   ███    ███ ███   ███   ███   ███    █▀  ███    ███ ","  ███    ███ ███         ███    ███     ███   ▀  ▄███▄▄▄     ███    ███  ▄███▄▄▄▄██▀ ███   ███   ███  ▄███▄▄▄     ███    ███ ","▀█████████▀  ███       ▀███████████     ███     ▀▀███▀▀▀     ███    ███ ▀▀███▀▀▀▀▀   ███   ███   ███ ▀▀███▀▀▀     ███    ███ ","  ███        ███         ███    ███     ███       ███        ███    ███ ▀███████████ ███   ███   ███   ███    █▄  ███    ███ ","  ███        ███▌    ▄   ███    ███     ███       ███        ███    ███   ███    ███ ███   ███   ███   ███    ███ ███   ▄███ "," ▄████▀      █████▄▄██   ███    █▀     ▄████▀     ███         ▀██████▀    ███    ███  ▀█   ███   █▀    ██████████ ████████▀  ","             ▀                                                            ███    ███                                         "], x: 0, y: 0}),
            subtitle: new Physics.shape("custom",{mesh:["                         ___                                                                        ","_-_ _,,                 -   -_,                               _-_ _,,              ,,               ","   -/  )               (  ~/||    _                              -/  )             ||               ","  ~||_<   '\\\\/\\\\       (  / ||   < \\, ,._-_  /'\\\\ \\\\/\\\\         ~||_<    _-_   _-_ ||/\\  _-_  ,._-_ ","   || \\\\   || ;'        \\/==||   /-||  ||   || || || ||          || \\\\  || \\\\ ||   ||_< || \\\\  ||   ","   ,/--||  ||/          /_ _||  (( ||  ||   || || || ||          ,/--|| ||/   ||   || | ||/    ||   ","  _--_-'   |/          (  - \\\\,  \\/\\\\  \\\\,  \\\\,/  \\\\ \\\\         _--_-'  \\\\,/  \\\\,/ \\\\,\\ \\\\,/   \\\\,  "," (        (                                                    (                                    ","           -_-                                                                                      "], x:0, y:10}),
            startbox: [],
            optsbox: [],
            start: new Physics.shape("custom",{mesh:["  ___ _            _   "," / __| |_ __ _ _ _| |_ "," \\__ \\  _/ _` | '_|  _|"," |___/\\__\\__,_|_|  \\__|","                       "], x:Physics.width-33, y:25}),
            opts: new Physics.shape("custom",{mesh:["   ___       _   _             ","  / _ \\ _ __| |_(_)___ _ _  ___"," | (_) | '_ \\  _| / _ \\ ' \\(_-<","  \\___/| .__/\\__|_\\___/_||_/__/","       |_|                     "], x: 10, y:25}),
            startline: [],
            rightpoint: new Physics.shape("custom",{mesh:["                      >   ","                       >  ","                        > ","------------------------->","                        > ","                       >  ","                      >   "], x: Physics.width-73, y: 45}),
            leftpoint: new Physics.shape("custom",{mesh:["   <                      ","  <                       "," <                        ","<-------------------------"," <                        ","  <                       ","   <                      "], x: 50, y: 45})

        }
        title.main.x = ((Physics.width-title.main.width)/2); //center titles
        title.subtitle.x = ((Physics.width-title.subtitle.width)/2);

        title.startbox = new Physics.shape("box",{height: title.start.height+3, width: title.start.width+3, filled: false, character: "*", x: title.start.x-1, y: title.start.y-1}); //set up boxes around text; has to come later because start isn't initalized yet and render order matters
        title.optsbox = new Physics.shape("box",{height: title.opts.height+3, width: title.opts.width+3, filled: false, character: "*", x: title.opts.x-1, y: title.opts.y-1});
        title.startline = new Physics.shape("box",{height: 2, width: title.startbox.x-(title.optsbox.x+title.optsbox.width)-10, character: "_", x: title.optsbox.x+title.optsbox.width+5, y: title.start.y+2});

        titleplayer.x = ((Physics.width-titleplayer.width)/2);
        titleplayer.y = title.startline.y-titleplayer.height;

        var options = {
            opts: new Physics.shape("custom",{mesh:["   ___       _   _             ","  / _ \\ _ __| |_(_)___ _ _  ___"," | (_) | '_ \\  _| / _ \\ ' \\(_-<","  \\___/| .__/\\__|_\\___/_||_/__/","       |_|                     "], x: 10, y:25})
        }

        var loading = {
            loadbox: [],
            load: new Physics.shape("custom",{mesh:["    __                    ___                          ","   / /   ____  ____ _____/ (_)___  ____ _              ","  / /   / __ \\/ __ `/ __  / / __ \\/ __ `/              "," / /___/ /_/ / /_/ / /_/ / / / / / /_/ /  _    _    _  ","/_____/\\____/\\__,_/\\__,_/_/_/ /_/\\__, /  (_)  (_)  (_) ","                                /____/                 "], x: 0, y: 0})
        }

        loading.load.x = ((Physics.width-loading.load.width)/2);
        loading.load.y = ((Physics.height-loading.load.height)/2);
        loading.loadbox = new Physics.shape("box",{height: loading.load.height+3, width: loading.load.width+3, filled: false, character: "*", x: loading.load.x-2, y: loading.load.y-1});

        var lvl1 = {
            portal: new Physics.shape("custom",{mesh:["   ____ ","  / __ \\"," / / / /","/ /_/ / ","\\____/  "], x: 1, y: Physics.height-5})
        }

        var lvl2 = {
            platform: new Physics.shape("line",{length: Physics.width, character: "_", x: 0, y: Physics.height-2}),
            portal: new Physics.shape("custom",{mesh:["   ____ ","  / __ \\"," / / / /","/ /_/ / ","\\____/  "], x: Physics.width-5, y: Physics.height-1})
        }

        var lvl3 = {
            platform: new Physics.shape("line",{length: 50, character: "_", x: 0, y: Physics.height-2}),
            platform2: new Physics.shape("line",{length: 20, character: "_", x: 50, y: Physics.height-10}),
            platform3: new Physics.shape("line",{length: 30, character: "_", x: 70, y: Physics.height-20}),
            platform4: new Physics.shape("line",{length: 30, character: "_", x: 90, y: Physics.height-34}),
            tri: new Physics.shape("triangle",{height: 5, character: "⬘", x: 74, y: Physics.height-25}),
            portal: new Physics.shape("custom",{mesh:["   ____ ","  / __ \\"," / / / /","/ /_/ / ","\\____/  "], x: 120, y: Physics.height-39})
        };