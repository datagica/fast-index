const chai = require('chai');
chai.use(require('chai-fuzzy'));
const expect = chai.expect;

const util = require('util');
const pretty = (x) => {
  console.log(util.inspect(x, false,7,true));
};

const FastIndex = require("../lib/fast-index");

describe('@datagica/fast-index', () => {

  describe('in async mode', () => {

    const index = new FastIndex({
      fields: [
        'label',
        'aliases'
      ]
    });

    it('should work on a dirty get key', (done) => {
      index.loadAsync([{
        label: {
          'en': 'vegetable',
          'fr': 'légume'
        },
        aliases: [
          'Vegetables',
          'vegetable.'
        ]
      }, {
        label: 'vegeta'
      }]).then(ready => {

        //pretty([...index.store]);

        const matches = index.get(' Vegetable, ');
        //console.log("matches 1: "+JSON.stringify(matches));
        expect(matches).to.be.like([
          {
            value: {
              label: {
                en: "vegetable",
                fr: "légume"
              },
              aliases: [
                "Vegetables",
                "vegetable."
              ]
            },
            score: 1
          }
        ]);
        done()
      })
    })
  })

  describe('in sync mode', () => {

    const index = new FastIndex({
      fields: [
        'label',
        'aliases'
      ],
      spellings: (map, word) => {
        //console.log("generating spelling for "+word);
        map.set(word.replace(/(?:le|el) /gi, 'the '), 0.5);
      }
    }).loadSync([
    {
      label: 'the chef',
      type: 'movie'
    }, {
      label: 'the chef',
      type: 'book'
    },, {
      label: 'el chef',
      type: 'unknow',
      aliases: [
        'el chef'
      ]
    }]);

    // pretty([...index.store]);

    it('should work on a different spelling key', () => {
      const matches = index.get("le chef");
      //pretty(matches);
      //console.log("matches 2: "+JSON.stringify(matches));
      expect(matches).to.be.like([
          {
            score: 0.5,
            value: {
              label: "the chef",
              type: "movie"
            }
          },
          {
            score: 0.5,
            value: {
              label: "the chef",
              type: "book"
            }
          },
          {
            score: 0.25,
            value: {
              aliases: [
                "el chef"
              ],
              label: "el chef",
              type: "unknow"
            }
          }
      ])

    })

  })

  describe('on non-latin characters', () => {

    const index = new FastIndex({
      fields: [
        'label',
        'aliases'
      ],
      spellings: (map, word) => {
      }
    }).loadSync([
      {
        label: {
          zh: '浙江大学',
          en: 'Zhejiang University',
          fr: 'Université de Zhejiang',
          es: 'Universidad de Zhejiang',
          ru: 'Чжэцзянский университет'
        },
        aliases: [
          'Zheda',
          'ZJU',
          'Zhejiang University',
          'Che Kiang University',
          '浙江大学',
          '浙江大學',
          'Zhèjiāng Dàxué',
          'Universidad de Zhejiang',
          'Université de Zhejiang',
          'Zhejiang-Universität',
          'Чжэцзянский университет',
          '저장 대학'
        ]
      },
      {
        label: {
          en: "abd-al-aziz"
        },
        aliases: [
          "abd-al-aziz"
        ]
      }
    ]);

    //pretty([...index.store]);

    it('should match non-latin patterns', () => {
      const matches = index.get('저장 대학');
      expect(matches).to.be.like([
        {
          score: 1,
          value: {
            label: {
              zh: '浙江大学',
              en: 'Zhejiang University',
              fr: 'Université de Zhejiang',
              es: 'Universidad de Zhejiang',
              ru: 'Чжэцзянский университет'
            },
            aliases: [
              'Zheda',
              'ZJU',
              'Zhejiang University',
              'Che Kiang University',
              '浙江大学',
              '浙江大學',
              'Zhèjiāng Dàxué',
              'Universidad de Zhejiang',
              'Université de Zhejiang',
              'Zhejiang-Universität',
              'Чжэцзянский университет',
              '저장 대학'
            ]
          }
        }
      ])

    })

    it('should not match other non-latin characters such as •', () => {
      const matches = index.get('•');
      expect(matches).to.be.like([])

    })

    it('should match words with hyphen', () => {
      const matches = index.get('abd-al-aziz');
      expect(matches).to.be.like([
      {
         "score": 1,
          "value": {
            "aliases": [
              "abd-al-aziz"
            ],
            "label": {
              "en": "abd-al-aziz"
            }
          }
        }
      ])
    })

  })
})
