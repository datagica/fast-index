'use strict';

const nextTick = (typeof process !== 'undefined' &&
                  typeof process.nextTick === 'function')
  ? process.nextTick
  : function(block) {
    setTimeout(block, 0);
  };


// TODO add more special characters:
// https://ja.wikipedia.org/wiki/%E6%8B%AC%E5%BC%A7
// https://en.wikipedia.org/wiki/Bracket
// https://en.wikipedia.org/wiki/Comma
// https://en.wikipedia.org/wiki/Colon_(punctuation)
// https://en.wikipedia.org/wiki/Question_mark
// https://en.wikipedia.org/wiki/Quotation_mark
// https://en.wikipedia.org/wiki/Semicolon
// https://en.wikipedia.org/wiki/Slash_(punctuation)

const exotics = [
  '0009', // character tabulation
  '000A', // line feed
  '000B', // line tabulation
  '000C', // form feed
  '000D', // carriage return
  '0020', // space
  '0021', // exclamation mark
  '0022', // quotation mark
  '0027', // apostrophe
  '0028', // left parenthesis
  '0029', // right parenthesis
  '002C', // comma
  '003A', // colon
  '003B', // semicolon
  '003F', // question mark
  '0085', // next line
  '00A0', // no-break space
  '00A7', // section sign
  '00B6', // pilcrow (paragraph mark, paragraph sign, paraph, alinea)
  '00B7', // interpunct
  '01C3', // latin letter retroflex click
  '02D0', // ipa triangular colon
  '1680', // ogham space mark
  '2000', // en quad
  '2001', // em quad
  '2002', // en space
  '2003', // em space
  '2004', // three-per-em space
  '2005', // four-per-em space
  '2006', // six-per-em space
  '2007', // figure space
  '2008', // punctuation space
  '2009', // thin space
  '200A', // hair space

  // OK actually we want to keep this one, it is part of some words
  // '2012', // figure dash

  '2013', // en dash
  '2014', // em dash
  '2015', // horizontal bar

  '2025', // japanese two-dots ellipsis
  '2026', // japanese three-dots ellipsis
  '2028', // line separator
  '2029', // paragraph separator
  '2047', // double question mark
  '2048', // question exclamation mark
  '2049', // exclamation question mark
  '202F', // narrow no-break space
  '205F', // medium mathematical space
  '203C', // double exclamation mark
  '2E0F', // paragraphos
  '3000', // ideographic space
  '3002', // japanese full stop
  '303D', // japanese part alternation mark
  'FF1A', // full-width colon
  'FF1F', // full-width question mark
  'FE56', // small question mark
  'FE57', // small exclamation mark
  'FF01' // full-width exclamation mark
].map(s => '\\u' + s).join('');

const exoticSpaces = new RegExp(`[ :\\s${exotics}]+`, 'g');

function eachAsync(collection, iterator, callback) {
  var iterate = function(i) {
    nextTick(function() {
      iterator(collection[i]);
      if (i < collection.length) {
        iterate(i + 1);
      } else {
        callback();
      }
    });
  };
  iterate(0);
}

function eachAsyncPromise(collection, iterator){
  return new Promise(function (resolve, reject){
    eachAsync(collection, iterator, function(completed) {
      resolve()
    })
  });
}

function removeNonAlpha(str){
  return str
    .replace(/[^a-zA-Z0-9\-]/gi, ' ');
}

function cleanSpaces(str) {
  return str
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function removeAccents(str){
  return str
    .replace(/[àáâäãå]/gi,'a')
    .replace(/[èéêë]/gi,'e')
    .replace(/[îïìí]/gi,'i')
    .replace(/[ôöõòóð]/gi,'o')
    .replace(/[ûüùú]/gi,'u')
    .replace(/[ç]/gi, 'c')
    .replace(/[ýÿ]/gi, 'y')
    .replace(/[æ]/gi, 'y')
    .replace(/[ß]/gi, 'b')
    .replace(/[ñ]/gi,'n');
}


function defaultSpellings(x){};

class TrimKeyMap extends Map {
  constructor(){
    super();
  }
  set(k,v) {
    super.set(k.trim(),v);
  }
}

class FastIndex {
  constructor(opts) {

    if (typeof opts === "undefined"){
      opts = {};
    }

    this.store = new Map();
    this.cache = new Map();

    this.fields = (typeof opts.fields !== 'undefined')
      ? opts.fields
      : "label";

    this.fields =
      (Array.isArray(this.fields))
        ? this.fields
        : [ this.fields ];

    this.spellings =
      (typeof opts.spellings === 'function')
      ? opts.spellings
      : defaultSpellings;
    //console.log("this.spellings: "+JSON.stringify(this.spellings));

    this.removeNonAlpha =
      (typeof opts.removeNonAlpha === 'boolean')
      ? opts.removeNonAlpha
      : true;

    this.removeAccents =
      (typeof opts.removeAccents === 'boolean')
      ? opts.removeAccents
      : true;

    this.cleanSpaces =
      (typeof opts.cleanSpaces === 'boolean')
      ? opts.cleanSpaces
      : true;

  }

  /**
   * okay this is the only function that really has to be fast
   */
  get(term, opts) {

    const spellings = this.build(
      term,
      (opts && typeof opts.spellings === 'function')
        ? opts.spellings : this.spellings
    );

    const results = [];

    for (var spelling of spellings.entries()) {
      //console.log("spelling:" +JSON.stringify(spelling));
      const values = this.store.get(spelling[0]);
      if (!values) continue;
      for (var i = 0; i < values.length; i++) {
        results.push({
          value: values[i].value,
          score: spelling[1] * values[i].score
        });
      }
    }
    if (results.length > 1) {
      results.sort((a, b) => b.score - a.score);
    }
    return results;
  }

  build(key, spellingsFn){

    // compulsory cleaning
    key = key
      .toLowerCase();

    if (this.removeAccents) {
      key = removeAccents(key);
    }

    if (this.removeNonAlpha) {
      key = removeNonAlpha(key);
    }

    if (this.cleanSpaces) {
      key = cleanSpaces(key);
    }

    const spellings = new TrimKeyMap();
    spellingsFn(spellings, ' '+key+' ');
    spellings.set(key.trim(), 1);
    return spellings;
  }

  /**
   * Low-level set
   *
   * This function is used to set a raw value in the database and doesn't perform
   * any text processing
   *
   * Input must be an array of values
   */
  _store(key, data){

    // we need to handle a collision
    // we are going to add the element to an array, but we want to eliminate
    // duplicates. This is better "pre-processed" here rather than at runtime
    // (during .get()) so we can afford some performance hurt
    if (!this.store.has(key)) {
      // console.log("this is brand new!")
      this.store.set(key, data);
      return;
    }
    // console.log(`blimey! we already have something for key ${key}`);
    const toRegister = this.store.get(key);
    for (var i = 0; i < data.length; i++){
      const item = data[i];
      const ourJSON = JSON.stringify(item.value);

      var otherJSON, alreadyInside = false;
      for (var j = 0; j < toRegister.length; j++){
        otherJSON = JSON.stringify(toRegister[j].value);
        // console.log("COMPARING "+ourJSON+"  WITH "+otherJSON);
        if (ourJSON === otherJSON) {
          alreadyInside = true;
          break;
        }
      }
      if (!alreadyInside) {
        toRegister.push(item);
      }
    }
    this.store.set(key, toRegister );
  }
  set(key, value){

    //console.log(`\n\nset(${key})`)
    if (!key) return;

    if (Array.isArray(key)) {
      for (var i = 0; i < key.length; i++){
        this.set(key[i], value);
      }
      return;
    }
    const spellings = this.build(key, this.spellings);
    //console.log("set spellings:"+JSON.stringify(spellings));
    //console.log(`  set("${key}")`);
    for (var spelling of spellings.entries()) {
      //console.log("\n  - item:" +JSON.stringify(spelling));
      /*console.log("  - storing: "+spelling[0]+" = "+JSON.stringify(  {
          value: value,
          score: spelling[1]
        }))
        */
      this._store(spelling[0], [
        {
          value: value,
          score: spelling[1]
        }
      ]);
    }
  }

  loadOne(item){
    if (!item) return;
    for (var i = 0; i < this.fields.length; i++){
      this.set(item[ this.fields[i] ], item);
    }
  }

  loadAsync(collection) {
    return eachAsyncPromise(
      (Array.isArray(collection)) ? collection : [],
      (item) => this.loadOne(item))
  }

  loadSync(collection) {
    ((Array.isArray(collection)) ? collection : [])
      .forEach(item => this.loadOne(item));
    return this;
  }
}

module.exports = FastIndex
module.exports.default = FastIndex
module.exports.FastIndex = FastIndex
