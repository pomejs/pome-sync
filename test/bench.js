// bench for data-snyc

var MemDatabase = require('../lib/dbsync');
var db = null;
var assert = require('assert');

var best = {writes: 0, hwrites: 0, jwrites: 0, reads: 0, hreads: 0, jreads: 0}
    , avg = {
    writes: 0, writesCnt: 0, hwrites: 0, hwritesCnt: 0, jwrites: 0, jwritesCnt: 0
    , reads: 0, readsCnt: 0, hreads: 0, hreadsCnt: 0, jreads: 0, jreadsCnt: 0
};

var big = [];

for (var i = 1000; i--;) {
    big.push(i)
}

var objects = [
    JSON.stringify('tiny')

    , JSON.stringify('hello I am a medium sized string')

    , JSON.stringify({
        there: 'is'
        , only: 'chaos'
        , butterfly: ['says', ['there', 'is', 'only', 'chaos']]
        , pi: Math.PI
    })

    , JSON.stringify({
        there: 'is'
        , only: 'chaos'
        , butterfly: ['says', ['there', 'is', 'only', 'chaos']]
        , pi: Math.PI
        , big: big
    })
];

function bench(obj, what, num, cb) {
    console.log(' obj length:', obj.length);
    console.log(' operations:', num);
    console.log('-------------------');
    switch (what) {
        case 'all':
            sets(obj, num, function () {
                gets(obj, num, function () {
                    hsets(obj, num, function () {
                        hgets(obj, num, function () {
                            console.log('');
                            cb();
                        });
                    });
                })
            });
            break;
        case 'sets':
            sets(obj, num, function () {
                console.log('');
                cb();
            });
            break;
        case 'gets':
            gets(obj, num, function () {
                console.log('');
                cb();
            });
            break;
        case 'hsets':
            hsets(obj, num, function () {
                console.log('');
                cb();
            });
            break;
        case 'hgets':
            hgets(obj, num, function () {
                console.log('');
                cb();
            });
            break;
        default:
            cb();
            break
    }
}

function sets(obj, num, cb) {
    var done = 0
        , clients = 0
        , timer = new Date();
    for (var i = num; i--;) {
        var res = db.set(i, obj);
        if (res) {
            done++
        }
        if (done === num) {
            var result = ( (num) / ((new Date() - timer) / 1000));
            if (result > best.writes) best.writes = result;
            avg.writes += result;
            avg.writesCnt += 1;
            console.log('sets writes:', result.toFixed(2) + '/s');
            cb();
        }
    }
}

function gets(obj, num, cb) {
    var done = 0
        , clients = 0
        , timer = new Date();

    for (var i = num; i--;) {
        var data = db.get(i);
        if (!!data) {
            done++
        }
        if (done === num) {
            var result = ( (num) / ((new Date() - timer) / 1000));
            if (result > best.reads) best.reads = result;
            avg.reads += result;
            avg.readsCnt += 1;
            console.log('gets reads:', result.toFixed(2) + '/s');
            cb();
        }

    }
}

function hsets(obj, num, cb) {
    var done = 0
        , clients = 0
        , timer = new Date();

    for (var i = num; i--;) {
        var res = db.hset('hkey', 'num', num);
        if (!!res) {
            done++
        }
        if (done === num) {
            var result = ( (num) / ((new Date() - timer) / 1000));
            if (result > best.hwrites) best.hwrites = result;
            avg.hwrites += result;
            avg.hwritesCnt += 1;
            console.log('hkey writes:', result.toFixed(2) + '/s');
            cb()
        }
    }
}

function hgets(obj, num, cb) {
    var done = 0
        , clients = 0
        , timer = new Date();
    for (var i = num; i--;) {
        var res = db.hget('hkey', 'num');
        if (!!res) {
            done++
        }
        if (done === num) {
            var result = ( (num) / ((new Date() - timer) / 1000));
            if (result > best.hreads) best.hreads = result;
            avg.hreads += result;
            avg.hreadsCnt += 1;
            console.log('hkey reads:', result.toFixed(2) + '/s');
            cb()
        }
    }
}


var scenario = [['all', 1000], ['all', 2000], ['sets', 5000], ['sets', 10000], ['gets', 5000], ['gets', 10000], ['hsets', 5000], ['hgets', 10000]];
var scenarioLen = scenario.length;

var next = function (i, o) {
    if (i < scenarioLen) {
        bench(objects[o], scenario[i][0], scenario[i][1], function () {
            setTimeout(function () {
                next(++i, o)
            }, scenario[i][1] / 3) // give some time for the hd to breath
        })
    } else {
        o++;
        if (o === objects.length) {
            console.log('---------------------');
            console.log('');
            console.log('best writes:', best.writes.toFixed(2) + '/s');
            console.log('best hkey writes:', best.hwrites.toFixed(2) + '/s');
            console.log('best reads:', best.reads.toFixed(2) + '/s');
            console.log('best hkey reads:', best.hreads.toFixed(2) + '/s');
            console.log('avg writes:', (avg.writes / avg.writesCnt).toFixed(2) + '/s');
            console.log('avg hwrites:', (avg.hwrites / avg.hwritesCnt).toFixed(2) + '/s');
            console.log('avg reads:', (avg.reads / avg.readsCnt).toFixed(2) + '/s');
            console.log('avg hreads:', (avg.hreads / avg.hreadsCnt).toFixed(2) + '/s');
            console.log('---------------------');
            console.log('');
            console.log('all done!')
        } else {
            next(0, o)
        }
    }
};

var consistency = function (cb) {
    var done = 0
        , num = 100;
    console.log('writes...');
    for (var i = num; i--;) {
        if (db.set(i, '1234567890')) {
            done++;
        }
    }
    if (done === num) {
        done = 0;
        console.log('reads...');
        for (var i = num; i--;) {
            var res = db.get(i);
            if (!!res) {
                done++;
                var data = res;
                assert.equal(data, '1234567890', 'Consistency error!');
                if (done === num) {
                    cb();
                }
            }
        }
    }
};

var doesitwork = function (cb) {
    var cnt = 0
        , max = 6;

    var cntincr = 0;
    for (var i = 50; i--;) {
        var number = db.incr('incr');
        cntincr++;
        if (cntincr == 50) {
            console.log('incr test:', number);
            cnt++;
            if (cnt === max) cb()
        }
    }
    var cntdecr = 0;
    for (var i = 50; i--;) {
        if (db.decr('decr'))
            cntdecr++
    }
    if (cntdecr == 50) {
        console.log('decr test:', number);
        cnt++;
        if (cnt === max) cb()
    }
    var cntmass = 0;
    for (var i = 50; i--;) {
        if (db.set('mass', 'writes'))
            cntmass++
    }
    if (cntmass === 50) {
        var data = db.get('mass');
        console.log('mass:', data);
        cnt++;
        if (cnt === max) cb()
    }
};

var start = function (db) {
    console.log('checking consistency...');
    consistency(function () {
        console.log('done.');
        console.log('=====================');
        console.log('benchmark starting...');
        console.log('');
        next(0, 0)
    });
};

var db = new MemDatabase();
start(db);
