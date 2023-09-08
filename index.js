import PouchDB from 'pouchdb';

let api = await PouchDB.fetch('http://localhost:18080/convertigo/projects/sampleMobileRetailStore/.json?__sequence=select_shop&shopCode=42');
const cookie = api.headers.get('set-cookie').split(';', 1)[0];
console.log(`cookie : ${cookie}`);

await new PouchDB('my_db').destroy();

const db = new PouchDB('my_db', {
    fetch: (url, opts) => {
        opts.headers.set('cookie', cookie);
        return PouchDB.fetch(url, opts);
    }
});
//await db.destroy();
let start = new Date().getTime();
var done = new Promise((res, rej) => {

    db.replicate.from('http://localhost:18080/convertigo/fullsync/retaildb', {

    }).on('change', function (info) {
        console.log(`change : ${info.docs_written}`);
    }).on('paused', function (err) {
        console.log(`paused : ${err}`);
    }).on('active', function () {
        console.log(`active`);
    }).on('denied', function (err) {
        console.log(`denied : ${err}`);
        rej(err);
    }).on('complete', function (info) {
        console.log(`complete : ${JSON.stringify(info)}`);
        res(info);
    }).on('error', function (err) {
        console.log(`error : ${err}`);
        rej(err);
    });
});
await done;
console.log(`replicated in ${new Date().getTime() - start}ms`);
let designs = await db.allDocs({
    startkey: '_design',
    endkey: '_design_',
    include_docs: true
});
designs = designs.rows.filter(d => d.doc?.views && d.doc?.language != 'query' && d.doc?._id != '_design/c8o').map(d => {
    let views = [];
    for (let v in d.doc.views) {
        views.push(`${d.doc._id.substring(8)}/${v}`);
    }
    return views;
}).flat();
console.log(JSON.stringify(designs));
for (let d of designs) {
    let s = new Date().getTime();
    await db.query(d, {limit: 0});
    console.log(`indexed ${d} in ${new Date().getTime() - s}ms`);
}
console.log(`all done in ${new Date().getTime() - start}ms`);