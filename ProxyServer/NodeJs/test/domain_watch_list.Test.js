var assert = require('assert');
var fs = require('fs');
var should = require('should');
var domain_list = require('./../domain_watch_list');

describe('domain_watch_list', function(){
    describe('azure_download', function() {
        it('download watchlist from azure successfully', function (done) {

            domain_list.DownloadDomainWatchList(function (err, domain_reg_list) {
                if (err) throw err;

                assert.equal(domain_reg_list.length > 0, true, 'domain list should have contents');
                done();
            });
        });
    })

    describe('domain_list_filter', function(){
        it('given domain does not list in domain list.', function(done){
            var watch_list = [/\w+\.baidu\..*/i, /\w+\.qq\..*/i, /\w+\.google\..*/i];

            var result = domain_list.IsDomainInWatchList('www.bing.com', watch_list, function(error, domain_match_list, domain_unmatch_list){
                assert.equal(domain_unmatch_list['www.bing.com'], true, 'www.bing.com is not in watch list.');
                assert.equal(domain_match_list['www.bing.com'], null);
                done();
            });

            assert.equal(result, false);
        });

        it('given domain belongs to domain list.', function(done){
            var watch_list = [/\w+\.baidu\..*/i, /\w+\.qq\..*/i, /\w+\.google\..*/i];

            var stop = false;

            var google = 'www.google.com';
            var result = domain_list.IsDomainInWatchList(google, watch_list, function(error, domain_match_list, domain_unmatch_list){
                assert.equal(domain_match_list[google], true, 'www.google.com is not in watch list at first.');
                assert.equal(domain_unmatch_list[google], null);

                done();
            });

            assert.equal(result, false);

            result = domain_list.IsDomainInWatchList(google, watch_list, null);
            assert.equal(result, true, 'catch at the second time.');
        });
    })

    describe('regex testing', function(){
        it('normal pass cases', function(){

            var baidu_reg = /\w+\.baidu\..*/i;
            assert.equal(baidu_reg.test('www.baidu.com'), true);
            assert.equal(baidu_reg.test('img.baidu.com'), true);

            var baidu_reg_str = '\\w+\\.baidu\\..*';
            var baidu_reg2 = new RegExp(baidu_reg_str, 'i');
            assert.equal(baidu_reg2.test('www.baidu.com'), true);
            assert.equal(baidu_reg2.test('img.baidu.com'), true);
        });

        it('normal failure cases', function(){
            var google_reg = /\w+\.google\.w+/i;
            assert.equal(google_reg.test('www.bing.com'), false);
            assert.equal(google_reg.test('__.google.com'), false);
        });

    });

    describe('domain_list_management_integration', function(){

        it('step 1 : handle request with original domain list', function(done){
            var watch_list = [/\w+\.pandora\..*/i];

            var pandora = "www.pandora.com";
            var result = domain_list.IsDomainInWatchList(pandora, watch_list, function(error, domain_match_list, domain_unmatch_list) {
                assert.equal(domain_unmatch_list[pandora], null, 'www.pandora.com is in match list.');
                assert.equal(domain_match_list[pandora], true, 'www.pandora.com is in match list.');

                done();
                });

            assert.equal(result, false, "first hit is treated as failure to improve response speed.");
        });

        it('step 2 : download new domain list from blob', function(done){
            domain_list.DownloadDomainWatchList(function (err, domain_reg_list) {
                assert.equal(domain_reg_list.length > 0, true, 'domain list should have contents');

                done();
            });

        });

        it('step 3 : previous passable request now are rejected since domain list updated', function(done){
            var pandora = "www.pandora.com";
            var result = domain_list.IsDomainInWatchList(pandora, domain_list.GetDomainRegexWatchList(), function(error, domain_match_list, domain_unmatch_list) {
                assert.equal(domain_match_list[pandora], null, 'www.pandora.com is not in match list anymore since match list is recreated after download domain list from azure');
                assert.equal(domain_unmatch_list[pandora], true, 'www.pandora.com is put into unmatch list again');

                done();
            });

            assert.equal(result, false, 'www.pandora.com is not on the domain list any more.');
        });

        it('step 4 : test request with new domain list in memory', function(done){
            var baidu = 'www.baidu.com';
            var result = domain_list.IsDomainInWatchList(baidu, domain_list.GetDomainRegexWatchList(), function(error, domain_match_list, domain_unmatch_list){
                assert.equal(domain_match_list[baidu], true, 'www.baidu.com is in match list after download domain list from azure');
                assert.equal(domain_unmatch_list[baidu], null, 'www.baidu.com is in match list after download domain list from azure');

                // 5. try baidu second times, cache item when it hit once.
                result = domain_list.IsDomainInWatchList(baidu, domain_list.GetDomainRegexWatchList(), null);
                assert.equal(result, true, 'cache match list should return true when baidu try second times.');

                done();
            });
        });
    })
})