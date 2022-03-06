# node-red-contrib-sysmessage

This module provides a node for Node-RED to quickly show or speak a message at the host system (OSX, Windows, Linux).

It is distributed on NPM [node-red-contrib-sysmessage](https://www.npmjs.com/package/node-red-contrib-sysmessage).

## Pre-requisites

This requires Node-RED version 0.14 or newer.

No extra binaries needed. None are included in the package.

## Install

Run the following commands to install the node-module in your Node-RED user directory (typically `~/.node-red`):
```bash
$ cd ~/.node-red
$ npm install node-red-contrib-sysmessage
```
**you might need to use `npm install -g node-red-contrib-sysmessage` instead, if you get an error about [sysmessage] not being able to find "is_uft8"**


Open your Node-RED instance and you should have the node available in the palette and a new `system` tab in right side panel.

#### Features

It supports OSX and Windows:
- OSX Alert
	- A basic OS message box.
- OSX Notification
	- Right hand notification banner, will also be added to the notification center.
- OSX Message / iMessage
	- Sends messages through the messages.app to any buddy in your list, including iMessages (Hint: add yourself to send to)
- OSX Say
	- Uses OSX own speech synthesis to speak the provided input.
- WIN Alert
	- A basic OS message box (all fields will be parsed in the message area without newlines, but supports a receiver), at least Win 7
- WIN Alert (mshta)
	- A basic OS message box (title is shown correctly as well as newlines). At least Win XP.
	- Does not support a receiver.
- WIN Notification
	- Requires POWERSHELL to be available - means at least Win 8 (or earlier with POWERSHELL manually installed).
	- Will not be added to the notification center.
	- Does not support a receiver.
- WIN Say
	- Uses WIN own speech synthesis to speak the provided input, using POWERSHELL.
	- Does not support a receiver.
- WIN Say (mshta)
	- Uses WIN own speech synthesis to speak the provided input, using mshta without POWERSHELL (for older windows).
	- Starts the speach faster.
	- ! Focus from the current window, is taken on the host, while mshta creates a window + speaks + closes it.
	- Does not support a receiver.
- LINUX Say (festival) [use for RaspberryPI]
	- Needs festival to be installed first.
	- Does not support a receiver.
- LINUX Say (espeak) [use for RaspberryPI]
	- Needs espeak to be installed first.
	- Does not support a receiver.
- LINUX Say (google) [use for RaspberryPI]
	- Needs mplayer to be installed first, requires the google domains to be reachable.
	- Does not support a receiver.

*Mind:*
1. Some commands support a receiver, usually a target machines name with the same OS.
	* Except for OSX Message / iMessage, here its the buddy / phonenumber or email.
2. To show a message on a different OS, send the payload with an TCP OUT server, and receive it there with an TCP IN to pass it into sysmessage.
3. **For _Remote Apple Events_ to work, you need to enable them at: `System Preferences > Sharing > Remote Apple Events` on the Mac you want execute the events at.**
4. For _Windows Remote Execution_ you might get a login box to be able to send/receive the commands.
5. For Linux, you might read how to install the TTS engines: [RPi_Text_to_Speech_(Speech_Synthesis)  ](http://elinux.org/RPi_Text_to_Speech_(Speech_Synthesis))  


#### Note

It is completely based on CLI commands.
The message field supports mustache, using the msg fields.
If no receiver is set, it uses the current host system (not a remote) to show the message.


#### The nodes mount points 

- 1 IN: the payload
- 1 OUT [optional]: any console error or message created, use for error debugging


#### Example flow
_How to: Import using the Menu->Import->Clipboard._

##### Simple trigger by button press:
1. Server: `Button -> SysMessage:alert -> debug out`
```
[{"id":"72013ad3.c27184","type":"sysmessage","z":"2fc3038e.7502e4","command":"osxalert","title":"tit","subtitle":"st","op1":"asd 'fsdf\\n123","op1type":"str","receiver":"","name":"","x":247,"y":260,"wires":[["8c391e4.bfe5be"]]},{"id":"8c391e4.bfe5be","type":"debug","z":"2fc3038e.7502e4","name":"Show debug result","active":true,"console":"true","complete":"payload","x":403,"y":334,"wires":[]},{"id":"c6834579.0edbc","type":"inject","z":"2fc3038e.7502e4","name":"","topic":"","payload":"Button: test it.","payloadType":"str","repeat":"","crontab":"","once":false,"x":154,"y":173,"wires":[["72013ad3.c27184"]]}]
```

##### Generic Triggering an alert on a remote Machine using Node-RED
1. Client: `Button -> Template/msg -> TCP out`
2. Server: `TCP in -> SysMessage:WinNotification`
```
[{"id":"6e5c0cc8.004fd4","type":"inject","z":"5bf58f7.236367","name":"","topic":"","payload":"Button: test it.","payloadType":"str","repeat":"","crontab":"","once":false,"x":210,"y":560,"wires":[["ea40d552.664718"]]},{"id":"feb826be.cfcb48","type":"tcp out","z":"5bf58f7.236367","host":"localhost","port":"1029","beserver":"client","base64":false,"end":true,"name":"","x":450,"y":700,"wires":[]},{"id":"ea40d552.664718","type":"template","z":"5bf58f7.236367","name":"msg","field":"payload","fieldType":"msg","format":"handlebars","syntax":"mustache","template":"This is a message from the trigger.","x":330,"y":640,"wires":[["feb826be.cfcb48"]]},{"id":"a782f989.cc0c88","type":"tcp in","z":"5bf58f7.236367","name":"","server":"server","host":"","port":"1029","datamode":"single","datatype":"utf8","newline":"","topic":"","base64":false,"x":660,"y":560,"wires":[["cfb0ec5f.65722"]]},{"id":"cfb0ec5f.65722","type":"sysmessage","z":"5bf58f7.236367","command":"winnotification","title":"New Message","subtitle":"","op1":"","op1type":"pay","receiver":"","name":"","x":800,"y":640,"wires":[[]]}]
```