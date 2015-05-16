/**
 * Created by chi on 5/14/15.
 */
/**
 * Created by chi on 5/10/15.
 */

/*
 * Get Package status(package lost rate) towards given web address
 * Resolve Ip address of given dns domain,
 */


var http = require('http');
var dns = require('dns');
var wp = require('./wping');
var tr = require('./wtrace');
var watchlist = require('./domain_watch_list');

exports.Initialize = Initialize;

function Initialize(){
    CalculateTrafficStatistic(watchlist.GetMatchedDomainList());

    setInterval(CalculateTrafficStatistic, 60000);
}

function CalculateTrafficStatistic(){

    var domainlist = watchlist.GetMatchedDomainList();
    console.log('start to calculate statistic for matched domains ' + JSON.stringify(domainlist));

    for(var domain in domainlist) {
        dns.lookup(domain, function(err, address, family){
            if(!err) {
                PostDomainStatistic(domain, address);
            }
        });
    }
}

function PostDomainStatistic(domain, address){
    // Test the speed of the connection from proxy to the server(destination of user request), ttl and lost rate.
    // Lost rate is not that accurate.
    wp.probe(address, function(statistic){
        // to do: Post ping result to elastic search.
        console.log('ping ' + domain + ':' + address +',' + JSON.stringify(statistic));

        var probe_msg = {
            domain : domain,
            ipAddress : address,
            result : statistic['result'],
            sentPackets: statistic['sentPackets'],
            receivedPackets: statistic['receivedPackets'],
            packetLostRateInPercent: statistic['packetLostRateInPercent'],
            totalTimeInMs: statistic['totalTimeInMs'],
            rttMinInMs: statistic['rttMinInMs'],
            rttAvgInMs: statistic['rttAvgInMs'],
            rttMaxInMs: statistic['rttMaxInMs'],
            rttMdevInMs: statistic['rttMdevInMs']
        }

        postToElasticSearch(JSON.stringify(probe_msg), 'probe');
    });

    // Trace how many hops the packet requires to reach the host and how long each hop takes.
    tr.trace(address, function(err, hops){

        if(!err) {
            // to do: Post traceroute result to elastic search.
            console.log('traceroute ' + domain + ':' + address + ',' + JSON.stringify(hops));
            var routes = [];
            for (var i = 0; i < hops.length; i++)
                routes.push( JSON.stringify(hops[i]));

            var route_msg = {
                domain : domain,
                ipAddress : address,
                hops: routes
            };

            postToElasticSearch(JSON.stringify(route_msg), 'route');
        }
        else{
            // Post failure ...
        }
    });

}
function postToElasticSearch(content, eType){
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': content.length
    };

    var options = {
        host: 'baudscope.cloudapp.net',
        port: 9200,
        path: '/proxy_http_traffic/'+eType,
        method: 'POST',
        headers: headers
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');

        var responseString = '';

        console.log('start to post to elastic search ' + options.host + eType);

        res.on('data', function(data) {
            responseString += data;
        });

        res.on('end', function() {
            console.log('finish to post to elastic search ' + options.host + eType);
        });
    });

    req.on('error', function(e) {
        console.log('fail to post data to ' + options.host + options.path + ', error msg is ' + e);
    });

    req.write(content);
    req.end();
}


//domains = {'www.baidu.com' : true, 'www.google.com': true, 'www.hoopchina.com': true};

//CalculateTrafficStatistic(watchlist.GetMatchedDomainList());
//PingDns(domains);
//TraceRoute(domains);
