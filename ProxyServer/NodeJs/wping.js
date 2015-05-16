/**
 * Created by chi on 5/11/15.
 */

/**
 * a simple wrapper for ping
 * Refactor base on http://github.com/danielzzz/node-ping.
 */
//system library
var sys = require('util'),
    cp = require('child_process'),
    os = require('os');

exports.probe = Probe;
exports.ParsePingStatics = ParsePingStatics;
exports.ParsePingRttTime = ParsePingRttTime;
exports.GetPacketStaticsParseReg = GetPacketStaticsParseReg;
exports.GetPacketRttTimeParseReg = GetPacketRttTimeParseReg;
exports.GetIgnoreCommentReg = GetIgnoreCommentReg;
exports.GetIgnoreMsgReg = GetIgnoreMsgReg;

var packetStaticsParseReg = /(\d) packets transmitted, (\d) received, ([\d]+)% packet loss, time ([\d]+)ms/i;
var packetRttTimeParseReg = /rtt min\/avg\/max\/mdev = (.*)\/(.*)\/(.*)\/(.*) ms/i;
var ignoreMsgReg = /bytes/i;
var ignoreCommentReg = /---/i;

/**
 * Class::Ping construtor, only work on Linux
 *
 * @param addr string
 * @param cb function (data, err)
 *      arguments order is based on compatabile issue
 */
function Probe(addr, cb) {
    var p = os.platform();
    var ls = ls = cp.spawn('/bin/ping', ['-n', '-w 3', '-c 3', addr]);;
    var returnMsg = "";
    var network_statistic = {
        'result': false,
        'sentPackets': 0,
        'receivedPackets': 0,
        'packetLostRateInPercent': 0,
        'totalTimeInMs': 0,
        'rttMinInMs': 0,
        'rttAvgInMs': 0,
        'rttMaxInMs': 0,
        'rttMdevInMs': 0
    };

    /* Sample Ping Results
     64 bytes from 74.125.20.105: icmp_seq=1 ttl=44 time=12.7 ms
     64 bytes from 74.125.20.105: icmp_seq=2 ttl=44 time=13.4 ms
     64 bytes from 74.125.20.105: icmp_seq=3 ttl=44 time=12.3 ms

     --- www.google.com ping statistics ---
     3 packets transmitted, 3 received, 0% packet loss, time 2003ms
     rtt min/avg/max/mdev = 12.321/12.831/13.419/0.460 ms
     */

    ls.on('error', function (e) {
        var err = new Error('ping.probe: there was an error while executing the ping program. check the path or permissions...');
        cb(null, err);
    });


    ls.stdout.on('data', function (data) {
        returnMsg += String(data);
    });

    ls.stderr.on('data', function (data) {
        //sys.print('stderr: ' + data);
    });

    ls.on('exit', function (code) {
        var lines = returnMsg.split('\n');

        network_statistic.result = (code === 0) ? true : false;
        for (var t = 0; t < lines.length; t++) {
            if(ignoreMsgReg.test(lines[t])){
                continue;
            }

            if(ignoreCommentReg.test(lines[t])){
                continue;
            }

            var ping_statistic = ParsePingStatics(packetStaticsParseReg, lines[t]);
            if(undefined != ping_statistic){
                network_statistic.sentPackets = ping_statistic.sentPackets;
                network_statistic.receivedPackets = ping_statistic.receivedPackets;
                network_statistic.packetLostRateInPercent = ping_statistic.packetLostRateInPercent;
                network_statistic.totalTimeInMs = ping_statistic.totalTimeInMs;

                continue;
            }

            var ping_rtt = ParsePingRttTime(packetRttTimeParseReg, lines[t]);
            if(undefined != ping_rtt){
                network_statistic.rttMinInMs = ping_rtt.rttMinInMs;
                network_statistic.rttAvgInMs = ping_rtt.rttAvgInMs;
                network_statistic.rttMaxInMs = ping_rtt.rttMaxInMs;
                network_statistic.rttMdevInMs = ping_rtt.rttMdevInMs;
            }
        }

        console.log(network_statistic);
        //console.log(returnMsg);
        if (cb) {
            cb(network_statistic, null);
        }
    });
}

function ParsePingStatics(reg, line){
    var results = reg.exec(line);
    if(results == null || results.length < 5){
        return undefined;
    }

    return {
        'sentPackets': results[1],
        'receivedPackets': results[2],
        'packetLostRateInPercent': results[3],
        'totalTimeInMs': results[4]
    };
}

function ParsePingRttTime(reg, line){
    var results = reg.exec(line);
    if(results == null || results.length < 5){
        return undefined;
    }

    return {
        'rttMinInMs': results[1],
        'rttAvgInMs': results[2],
        'rttMaxInMs': results[3],
        'rttMdevInMs': results[4]
    }
}

function GetPacketStaticsParseReg(){
    return packetStaticsParseReg;
}

function GetPacketRttTimeParseReg(){
    return packetRttTimeParseReg;
}

function GetIgnoreMsgReg(){
    return ignoreMsgReg;
}

function GetIgnoreCommentReg(){
    return ignoreCommentReg;
}

//for local debugging ...

//console.log(ParsePingStatics(packetStaticsParseReg, '3 packets transmitted, 3 received, 0% packet loss, time 2003ms'));
//console.log(ParsePingRttTime(packetRttTimeParseReg, 'rtt min/avg/max/mdev = 16.522/19.181/22.506/2.490 ms'));

//var host = 'www.google.com';
//Probe(host, function(statistic){
//    var msg = statistic.result ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead';
//    console.log(msg);
//})