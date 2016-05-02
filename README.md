# Datagica Fast-Index

A library to lookup if a word is inside an index, even if the spelling is a bit
different.

## Usage

### Installation

   $ npm install @datagica/fast-index --save

### Building the index

```javascript
import "FastIndex" from "@datagica/fast-index";

const index = new FastIndex({

  // fields to be indexed
  fields: [
    'label',
    'aliases'
  ],

  // a custom spelling generation function
  spellings: (map, word) => {
    // replace "le " or "el " by "the " with an arbitrary similarity score
   // of 0.5 (you can choose any value between 0 and 1)
    map.set(word.replace(/(?:le|el) /gi, 'the '), 0.5)
  }
})

// now we load some dataset
index.loadSync([
  { label: 'the chef', type: 'movie' },

  // duplicate entries are supported and will be returned in the results
  { label: 'the chef', type: 'book' },

  // duplicates inside an entry are simply skipped
  { label: 'el chef', aliases: [ 'el chef' ] }
]);


// side-note: here is the internal representation of the data inside the index:
[ [ 'the chef',
    [ { value: { label: 'the chef', type: 'movie' }, score: 1 },
      { value: { label: 'the chef', type: 'book' }, score: 1 },
      { value: { label: 'el chef', type: 'unknow', aliases: [ 'el chef' ] },
        score: 0.5 } ] ],
  [ 'el chef',
    [ { value: { label: 'el chef', type: 'unknow', aliases: [ 'el chef' ] },
        score: 1 } ] ] ]
```

### Querying the index

```javascript
const matches = index.get("le chef");

// this will output
[
  { value: { label: 'the chef', type: 'movie' },
    score: 0.5 },

  { value: { label: 'the chef', type: 'book' },
    score: 0.5 },

  // note how "el chef" has a lower score, although it would be closer using
  // a distance function. That's because we choose a naive spelling function
  // that converts everything into a single locale (english).
  // a better function would be more fine-tuned and store each locale
  // individually
  { value: { label: 'el chef',  type: 'unknow', aliases: [ 'el chef' ] },
    score: 0.25 }
]
```

## History

### Problem

The original algorithm used for fuzzy matching entities in all Datagica projects
(`@datagica/fuzzy-index`) was based on a lookup inside a tree of possible
spellings, using a [Finite State Levenshtein Transducer](http://www.aclweb.org/anthology/I08-2131).
This was nice because it allowed us to match a university name (for instance)
even if it was spelled a bit differently eg (*universidad* instead of *university*).

However for huge datasets this proved quite slow, incompatible with real-time
lookup, as it searched more alternative spellings than necessary.

### Solution

The new Fast Index simply converts its inputs into a simple representation of the
word, where punctuation, accents, useless spaces etc.. have been removed.

These transformations are quite opinionated, but some can be opted-out.

In addition to these default transforms, Fast-Index also gives you a way to
define custom alternative spellings.

For instance, you can tell Fast-Index to automatically convert:
 - ` de ` -> `of `
 -  `ité ` -> `ity `

Now, if the input word is `université de Poudlard` it will match `university of Poudlard`!

When using the spelling generator, you decide yourself which distance score
should be allocated. This helps the Fast-Index picks the best match it find
later.
