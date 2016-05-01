const chai = require('chai');
chai.use(require('chai-fuzzy'));
const expect = chai.expect;

const FastIndex = require("../lib/fast-index");

describe('@datagica/fast-index', () => {

  describe('in async mode', () => {

    const index = new FastIndex({
      fields: [
        'label',
        'aliases'
      ]
    });

    const testInput = 'Vegeta';

    it('should find the test input', (done) => {
      index.loadAsync([{
        label: 'vegetable',
        aliases: [
          'Vegetables',
          'vegetable.'
        ],
        description: 'edible thing'
      }, {
        label: 'vegeta',
        description: 'character'
      }]).then(ready => {
        const matches = index.get(testInput);
        console.log("matches 1: "+JSON.stringify(matches));
        expect(matches).to.be.like([
          {
            "label":"vegeta",
            "description":"character"
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
      aliaser: (x) => {
        return [
          x.replace(/(?:le|el) /gi, 'the ')
        ]
      }
    }).loadSync([{
      label: 'the chef',
      description: 'the master cook'
    }, {
      label: 'el chef',
      aliases: [
        'el chef'
      ],
      description: 'the cook, too'
    }]);

    const testInput = 'le chef';

    it('should find the test input', () => {
      const matches = index.get(testInput);
      console.log("matches 2: "+JSON.stringify(matches));
      expect(matches).to.be.like([]);
    })
  })
})
