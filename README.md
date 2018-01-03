# What is this ?

This is a webserver written with nodejs to control the multimedia show at the Centre International Marie de Nazareth.

You can play/pause/stop any show in any room, open/close the doors and test the alignment of the videoprojectors.

# Install

really easy, just clone the repo and run "npm start". Then open a browser at "localhost:3000" to see the webpage to control the show.

The server has to be in a network where the watchout server (producer) is reachable (watchout server has currently this ip : 192.168.100.53).

# How it works

Watchout has a doc to remotely control shows through TCP : http://www.eurolocation.fr/docs/watchout4.pdf appendix D and E.

This application establishes a TCP connection with the watchout server and sends the appropriate commands to launch the shows etc.
There are 2 ways to control the watchout :
- through port 3040 (services/watchout.js) : to send the play/pause/stop commands for the shows and open/close the doors
- through port 3039 (services/watchoutStatus.js) : to get the current status of the rooms (timing)

The web interface is defined in /views. The file shows.ejs is legacy. The important file is shows2.ejs which defined the UI.

The server API is defined in /routes

# Add other watchout commands

Currently only this most important watchout commands
