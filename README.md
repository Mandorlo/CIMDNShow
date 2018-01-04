# What is this ?

This is a webserver written with nodejs to control the multimedia show at the Centre International Marie de Nazareth.

You can play/pause/stop any show in any room, open/close the doors and test the alignment of the videoprojectors.

# Install

Really easy, just clone the repo and run "npm start". Then open a browser at "localhost:3000" to see the webpage to control the show.

The server has to be in a network where the watchout server (producer) is reachable (the watchout server has currently this ip : 192.168.100.53).

# How it works

Watchout has a doc to remotely control shows through TCP : http://www.eurolocation.fr/docs/watchout4.pdf appendix D and E.

This application establishes a TCP connection with the watchout server and sends the appropriate commands to launch the shows etc.
There are 2 ways to control the watchout :
- through port 3040 (services/watchout.js) : to send the play/pause/stop commands for the shows and open/close the doors
- through port 3039 (services/watchoutStatus.js) : to get the current status of the rooms (timing)

The web interface is defined in /views. The important file is shows.ejs which defines the main UI. It includes :
- __watchoutStatus.ejs__ to set/get the connection to the watchout server
- __alignements.ejs__ to play/stop Alignements
- __doors.ejs__ to open/close doors
- __toast.ejs__ to show nice messages to the user

The server API is defined in /routes

# Add other watchout commands

Currently only the most important watchout commands are integrated in /services/watchout.js and /services/watchoutStatus.js. To add more commands, here is a simple method :
- add a function in watchout.js or watchoutStatus.js and expose it through module.exports (don't forget to add a \n at the end of each command)
- add a route in index.js that calls the function you just added
- add a button or a UI element in shows.ejs (or in a separate .ejs file) that calls the route you just added
