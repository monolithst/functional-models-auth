const sinon = require('sinon')
const assert = require('chai').assert
const properties = require('../../src/properties')

describe('/src/properties.js', () => {
  describe('#NameProperty()', () => {
    it('should create without exception with no added config', () => {
      const instance = properties.NameProperty()
      assert.isOk(instance)
    })
  })
})

