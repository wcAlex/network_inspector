/**
 * Created by chi on 5/12/15.
 */
var assert = require('assert');
var fs = require('fs');
var should = require('should');
var wping = require('./../wping');



describe('wping', function(){
    describe('probe', function() {
        it('probe www.bing.com success', function(done){

            //wping.probe('wwww.bing.com', function(statistic){
            //    assert.equal(statistic.result, true, 'www.bing.com should be pingable');
            //
            //    done();
            //});

            done();
        });

        it('probe www.haha_picna fail, this is a non exist web address', function(done){
            done();
        })
    });

    describe('regex', function(){
        it('parse ping statistic success from given string', function(){
            //console.log(ParsePingStatics(packetStaticsParseReg, '3 packets transmitted, 3 received, 0% packet loss, time 2003ms'));
            //console.log(ParsePingRttTime(packetRttTimeParseReg, 'rtt min/avg/max/mdev = 16.522/19.181/22.506/2.490 ms'));

            var statistic = wping.ParsePingStatics(wping.GetPacketStaticsParseReg(), '3 packets transmitted, 3 received, 0% packet loss, time 2003ms');
            assert.equal(statistic.sentPackets, '3');
            assert.equal(statistic.receivedPackets, '3');
            assert.equal(statistic.packetLostRateInPercent, '0');
            assert.equal(statistic.totalTimeInMs, '2003');
        });

        it('parse ping statistic fail from given string', function(){
            var statistic = wping.ParsePingStatics(wping.GetPacketStaticsParseReg(), 'hello world');
            assert.equal(statistic, undefined);
        })

        it('parse ping rtt time success from given string', function(){

            var rtt = wping.ParsePingRttTime(wping.GetPacketRttTimeParseReg(), 'rtt min/avg/max/mdev = 16.522/19.181/22.506/2.490 ms');
            assert.equal(rtt.rttAvgInMs, '19.181');
            assert.equal(rtt.rttMinInMs, '16.522');
            assert.equal(rtt.rttMaxInMs, '22.506');
            assert.equal(rtt.rttMdevInMs, '2.490');
        });

        it('parse ping rtt time fail from given string', function(){
            var rtt = wping.ParsePingRttTime(wping.GetPacketRttTimeParseReg(), 'rtt helloworld');
            assert.equal(rtt, undefined);
        })

        it('ignore comment msg success from given string', function(){
            var result = wping.GetIgnoreCommentReg().test('--- www.google.com ping statistics ---');
            assert.equal(result, true);
        });

        it('ignore comment msg fail from given string', function(){
            var result = wping.GetIgnoreCommentReg().test('rtt min/avg/max/mdev = 16.522/19.181/22.506/2.490 ms');
            assert.equal(result, false);

        })

        it('ignore ping msg success from given string', function(){
            var result = wping.GetIgnoreMsgReg().test('64 bytes from 74.125.20.105: icmp_seq=1 ttl=44 time=12.7 ms');
            assert.equal(result, true);
        });

        it('ignore ping statistic fail from given string', function(){
            var result = wping.GetIgnoreMsgReg().test('rtt min/avg/max/mdev = 16.522/19.181/22.506/2.490 ms');
            assert.equal(result, false);

        })
    });
})
