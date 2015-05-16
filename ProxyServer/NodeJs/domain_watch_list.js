/**
 * Created by chi on 5/4/15.
 *
 * Domain manager in web_proxy.
 *      1. Download the watch domain list from azure.
 *      2. Maintain a regex list use to filter out incoming request.
 *      3. Maintain a cache of which domain address has been captured.
 *
 * To do:
 *      1. Filtering is very expensive, shouldn't filter on every request, web_proxy should log everything and apply the domain filtering later.
 *      2. Domain list cache is a simple cache right now, we should apply a better cache with retire/removing feature to prevent cache keep growing.
 */

var azure = require('azure-storage');
var fs = require('fs');

exports.DownloadDomainWatchList = DownloadDomainWatchList;
exports.Initialize = Initialize;
exports.IsDomainInWatchList = IsDomainInWatchList;
exports.GetDomainRegexWatchList = GetDomainRegexWatchList;
exports.GetMatchedDomainList = GetMatchedDomainList;

var azure_watchlist_settings = {
    account_name: 'portalvhdsxv2zszktlt7r2',
    account_key: '7Hft76oET+GHV6cgHF6dupQwE6lc4xAMgwQumr97lTH2LlQOE+PQTaFNjAvIEUmQyYsL5CpYBdjwJgRpRFdrcg==',
    container_name: 'webproxy',
    watch_list_blob_name: 'domain_watch_list.txt',
    download_targetfile: './temp.txt',
    watch_list_localfile: './domain_watch_list.txt',
    download_frequency: 21600000 /* 6 hours */
};

// the domain regex list, defines a group of domains which is required to be monitored.
var domain_regex_list = [];
// the real domain captured after filtering by domain regex list, hash table object, key is the domain, value is true {{www.google.com, true} ....}
var domain_match_list = {};
// cache match failed domain to improve speed, cache at most 20k domains. hash table object, key is the domain.
var domain_unmatch_list = {};
var domain_unmatch_list_size = 20000;

function GetDomainRegexWatchList(){
    return domain_regex_list;
}

function GetMatchedDomainList(){
    //return {'www.baidu.com' : true, 'www.google.com': true, 'www.hoopchina.com': true};

    return domain_match_list;
}

function IsDomainInWatchList(domain, watch_list, callback){
    if(domain_match_list[domain] != undefined){
        return true;
    }

    if(domain_unmatch_list[domain] != undefined){
        return false;
    }

    process.nextTick(function(){ TryAddDomainToMatchList(domain, watch_list, callback);});
    return false;
}

function TryAddDomainToMatchList(domain, regex_list, callback){
    var found = false;

    for(var i=0; i < regex_list.length; i++){
        if(regex_list[i].test(domain)){
            domain_match_list[domain] = true;
            found = true;
            break;
        }
    }

    if(Object.keys(domain_unmatch_list).length > domain_unmatch_list_size){
        domain_unmatch_list = {};
    }

    if(!found) {
        domain_unmatch_list[domain] = true;
    }

    if(callback != null){
        process.nextTick(function(){callback(null, domain_match_list, domain_unmatch_list);});
    }
}

// callback = function(err, result)
function DownloadDomainWatchList(callback) {
    //console.log('Start downloading process ...');

    var ExponentialRetryPolicyFilter = azure.ExponentialRetryPolicyFilter;
    var retryOnAnyFailure = new ExponentialRetryPolicyFilter();
    retryOnAnyFailure.retryCount = 3;
    retryOnAnyFailure.retryInterval = 30000;

    retryOnAnyFailure.shouldRetry = function (statusCode, retryData) {
        //console.log('Made the request at ' + new Date().toUTCString() + ', received StatusCode: ' + statusCode);

        var currentCount = (retryData && retryData.retryCount) ? retryData.retryCount : 0;

        return (currentCount < this.retryCount);
    };

    if(fs.existsSync(azure_watchlist_settings.download_targetfile)){
        fs.unlinkSync(azure_watchlist_settings.download_targetfile);
    }

    var blobSvc = azure.createBlobService(azure_watchlist_settings.account_name, azure_watchlist_settings.account_key).withFilter(retryOnAnyFailure);

    blobSvc.getBlobToLocalFile(azure_watchlist_settings.container_name, azure_watchlist_settings.watch_list_blob_name, azure_watchlist_settings.download_targetfile, function (error) {
        if(error){
            console.log('Download ' + azure_watchlist_settings.watch_list_blob_name + ' from ' + azure_watchlist_settings.container_name + ' failed, error: ' + error);

            process.nextTick(function(){ callback(error, null);});
        }

        if (!error) {
            fs.exists(azure_watchlist_settings.watch_list_localfile, function (b_exists) {
                if (b_exists) {
                    fs.unlinkSync(azure_watchlist_settings.watch_list_localfile);
                }

                fs.rename(azure_watchlist_settings.download_targetfile, azure_watchlist_settings.watch_list_localfile, function (err) {
                    if (err) {
                        console.log('fail to rename temp download file to ' + azure_watchlist_settings.watch_list_localfile + ', error is: ' + err);
                        process.nextTick(function(){ callback(error, null);});
                    }

                    if(!err){
                        UpdateDomainWatchList(callback);
                    }

                });
            });
        }
    });
}

function UpdateDomainWatchList(callback){

    domain_regex_list = fs.readFileSync(azure_watchlist_settings.watch_list_localfile, {encoding : 'utf8'}).split('\n')
        .filter(function(rx) { return rx.length > 5; })
        .map(function(rx) {
            return new RegExp(rx.substring(0, rx.length - 1), 'i');
        });

    domain_match_list = {};
    domain_unmatch_list = {};

    process.nextTick(function(){callback(null, domain_regex_list);});
}

function downloadCallback(err, domain_reg_list) {
    if (err) {
        console.log(err);
        return;
    }

    console.log('download domain watch list success : ');
    console.log(domain_reg_list);
}

function Initialize(){

    DownloadDomainWatchList(downloadCallback);

    setInterval(DownloadDomainWatchList, azure_watchlist_settings.download_frequency, downloadCallback);
}