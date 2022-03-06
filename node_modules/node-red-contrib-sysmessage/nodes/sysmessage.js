/**
 * Copyright(c) 2016 Nabil Redmann <repo@nabil-redmann.de>
 * MIT Licensed
 **/

module.exports = function(RED) {
    "use strict";
    var exec = require('child_process').exec;
    var isUtf8 = require('is-utf8');
    var mustache = require("mustache");

    function SysMessageNode(n) {
        RED.nodes.createNode(this,n);
        this.cmd = (n.command || "").trim();
        this.title = (n.title || "").trim();
        this.subtitle = (n.subtitle || "").trim();
        this.receiver = (n.receiver || "").trim();
        this.timer = Number(n.timer || 0)*1000;
        this.activeProcesses = {};


        this.op1 = n.op1 || "";
        this.op1type = n.op1type || "str";
        if (this.op1type === 'val') {
            if (this.op1 === 'true' || this.op1 === 'false') {
                this.op1type = 'bool'
            } else if (this.op1 === 'null') {
                this.op1type = 'null';
                this.op1 = null;
            } else {
                this.op1type = 'str';
            }
        }
        var node = this;


        var cleanup = function(p) {
            //console.log("CLEANUP!!!",p);
            node.activeProcesses[p].kill();
            node.status({fill: "red", shape:"dot", text:"timeout"});
            node.error("Exec node timeout");
        }

        this.on("input", function(msg) {
            var child;
            node.status({fill:"blue", shape:"dot", text:" "});
           
                let payload = null;
                
                if (msg && node.op1type === 'pay') { // && msg.hasOwnProperty("payload")) {
                    payload = mustache.render(msg.payload, node).replace('\n', '\\n');
                }
                else if (msg && this.op1type === 'str') {
                    payload = mustache.render(node.op1, node).replace('\n', '\\n');;
                }

                var cl = '';

                switch (node.cmd) {
                    case 'osxnotification': {
                        let modPayload = payload.replace(/"/g, "´").replace(/'/g, "´");
                        let modTitle = node.title.replace(/"/g, "´").replace(/'/g, "´");
                        let modSubtitle = node.subtitle.replace(/"/g, "´").replace(/'/g, "´");

                        if (node.receiver.length) {
                            cl += `tell application "Finder" of machine "eppc://${node.receiver}" to `;
                        }

                        cl += `display notification "${modPayload}" with title "${modTitle}" subtitle "${modSubtitle}"`;
                        cl  = `osascript -e '${cl}'`;
                        break;
                    }

                    case 'osxalert': {
                        let modPayload = payload.replace(/"/g, "´").replace(/'/g, "´");
                        let modTitle = node.title.replace(/"/g, "´").replace(/'/g, "´");
                        let modSubtitle = node.subtitle.replace(/"/g, "´").replace(/'/g, "´");

                        if (node.receiver.length) {
                            cl += `of machine "eppc://${node.receiver}" `;
                        }

                        cl  = `tell application "System Events" ${cl} to display dialog "${modSubtitle}\\n\\n${modPayload}" with title "${modTitle}" buttons "ok"`;
                        cl  = `osascript -e '${cl}'`;
                        break;
                    }

                    case 'osxmessage': {
                        let modPayload = payload.replace(/"/g, "´").replace(/'/g, "´");
                        let modTitle = node.title + (node.subtitle ? ': ' + node.subtitle : '');
                        modTitle = modTitle.replace(/"/g, "´").replace(/'/g, "´");

                        let modMessage = `${modTitle}\n\n${modPayload}`;

                        cl += `tell application "Messages" to send "${modMessage}" to buddy "${node.receiver}"`;
                        cl  = `osascript -e '${cl}'`;
                        break;
                    }

                    case 'osxsay': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        if (node.receiver.length) {
                            cl += `of machine "eppc://${node.receiver}" `;
                        }

                        cl  = `tell application "System Events" ${cl} to say "${modTitle}, ${modSubtitle}, ${modPayload}"`.replace(/,+/, ','); // every second would be spoken
                        cl  = `osascript -e '${cl}'`;
                        break;
                    }


                    case 'winalert': {
                        let receiver = node.receiver || process.env.USERNAME; //'%username%';
                        let modPayload = payload.replace(/\\n/g, ' ').replace(/"/g, "'");
                        let modTitle = node.title.replace(/\\n/g, ' ').replace(/"/g, "'");
                        let modSubtitle = node.subtitle.replace(/\\n/g, ' ').replace(/"/g, "'");

                        cl = `msg "${receiver}" "${modTitle} - ${modSubtitle}     ${modPayload}"`;
                        break;
                    }

                    case 'winalert2': {
                        let modPayload = payload.replace(/"/g, "'").replace(/\\n/g, '""+vbNewLine+""');
                        let modTitle = node.title.replace(/"/g, "'");
                        let modSubtitle = node.subtitle.replace(/\\n/g, ' ').replace(/"/g, "'");

                        cl = `mshta vbscript:Execute("MsgBox(""${modPayload}"",0,""${modTitle} - ${modSubtitle}"")(window.close)")`;
                        break;
                    }

                    case 'winnotification': {
                        let modTitle = node.title + (node.subtitle ? ' - ' + node.subtitle : '');
                        modTitle = modTitle.replace(/'/g, "`");
                        let modPayload = payload.replace(/\\n/g, '\n').replace(/'/g, "`");
                        let c = Buffer.from(`. '${__dirname}\\parts\\_windows-notificationicon.ps1'; Show-BalloonTip -Title '${modTitle}' -Message '${modPayload}';`, 'utf16le').toString('base64');

                        cl = `PowerShell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${c}`;
                        break;
                    }

                    case 'winsay': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        let c = Buffer.from(`Add-Type –AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${modTitle}, ${modSubtitle}, ${modPayload}');`.replace(/,+/, ','), 'utf16le').toString('base64');
                        cl = `PowerShell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${c}`;
                        break;
                    }

                    case 'winsay2': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        // PowerShell -Command "Add-Type –AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${modTitle}, ${modSubtitle}, ${modPayload}');"
                        cl = `mshta vbscript:Execute("CreateObject(""SAPI.SpVoice"").Speak(""${modTitle}, ${modSubtitle}, ${modPayload}"")(window.close)")`.replace(/,+/, ',');
                        break;
                    }


                    case 'linuxsay_festival': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        cl  = `echo "${modTitle}, ${modSubtitle}, ${modPayload}" | festival --tts`.replace(/,+/, ','); // every second would be spoken
                        break;
                    }

                    case 'linuxsay_espeak': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        cl  = `espeak -ven+f3 -k5 -s150 "${modTitle}, ${modSubtitle}, ${modPayload}"`.replace(/,+/, ','); // every second would be spoken
                        break;
                    }

                    case 'linuxsay_google': {
                        let modPayload = payload.replace(/"/g, "").replace(/'/g, "");
                        let modTitle = node.title.replace(/"/g, "").replace(/'/g, "");
                        let modSubtitle = node.subtitle.replace(/"/g, "").replace(/'/g, "");

                        let msg = `${modTitle}, ${modSubtitle}, ${modPayload}";`.replace(/,+/, ','); // every second would be spoken

                        cl  = `/usr/bin/mplayer -ao alsa -really-quiet -noconsolecontrols "http://translate.google.com/translate_tts?tl=en&q=${complete}";`;
                        break;
                    }

                }

                ///console.log( require('util').inspect( ['p', this.op1, this.op1type, process.cwd(), __dirname] ) );
                ///console.log( require('util').inspect( ['CL', cl] ) );

                /* istanbul ignore else  */
                if (RED.settings.verbose) { node.log(cl); }
                child = exec(cl, {encoding: 'binary', maxBuffer:10000000}, function (error, stdout, stderr) {

                    ///console.log( require('util').inspect( [error, stdout, stderr] ) );
                    
                    var msg = {};

                    msg.payload = new Buffer(stdout || stderr, "binary").toString('utf8');
                    if (isUtf8(msg.payload)) { msg.payload = msg.payload.toString(); }
                    if (error !== null) {
                        msg.payload = error;
                    }

                    node.status({});
                    node.send([msg]);
                    if (child.tout) { clearTimeout(child.tout); }
                    delete node.activeProcesses[child.pid];
                });
                child.on('error',function() {});
                if (node.timer !== 0) {
                    child.tout = setTimeout(function() { cleanup(child.pid); }, node.timer);
                }
                node.activeProcesses[child.pid] = child;
            
        });
        this.on('close',function() {
            for (var pid in node.activeProcesses) {
                /* istanbul ignore else  */
                if (node.activeProcesses.hasOwnProperty(pid)) {
                    if (node.activeProcesses[pid].tout) { clearTimeout(node.activeProcesses[pid].tout); }
                    node.activeProcesses[pid].kill();
                }
            }
            node.activeProcesses = {};
            node.status({});
        });
    }
    RED.nodes.registerType("sysmessage",SysMessageNode);
}
