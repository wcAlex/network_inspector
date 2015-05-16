/**
 * Created by chi on 5/11/15.
 */
//https://github.com/jaw187/node-traceroute/blob/master/traceroute.js

var child = require('child_process'),
    net = require('net'),
    dns = require('dns')

function parseHop(line) {
    line = line.replace(/\*/g,'0');
    var s = line.split(' ');
    for (var i=s.length - 1; i > -1; i--) {
        if (s[i] === '') s.splice(i,1);
        if (s[i] === 'ms') s.splice(i,1);
    }

    return parseHopNix(s);
}

function parseHopNix(line) {
    if (line[1] === '0')
        return false;

    var hop = {},
        lastip = line[1];

    hop[line[1]] = [+line[2]];

    for (var i=3; i < line.length; i++) {
        if (net.isIP(line[i])) {
            lastip = line[i];
            if (!hop[lastip])
                hop[lastip] = [];
        }
        else hop[lastip].push(+line[i]);
    }

    return hop;
}

function parseOutput(output,cb) {
    var lines = output.split('\n'),
        hops=[];

    lines.shift();
    lines.pop();

    for (var i = 0; i < lines.length; i++)
        hops.push(parseHop(lines[i]));

    cb(null,hops);
}

function trace(host,cb) {
    dns.lookup(host, function (err) {
        if (err && net.isIP(host) === 0)
            cb('Invalid host');
        else {
            var traceroute = child.exec('traceroute -q 2 -n ' + host, function (err,stdout,stderr) {
                if (!err) {
                    parseOutput(stdout, cb);
                }
            });
        }
    });
}

exports.trace = function (host,cb) {
    host = host + '';
    trace(host.toUpperCase(),cb);
}

//trace('74.125.20.104', function (err,hops) {
//    if (!err) {
//        //for(var i=0; i< hops.length; i++) {
//        //    for(var address in hops[i]) {
//        //        console.log(address);
//        //    }
//        //}
//
//        console.log(hops);
//    }
//});