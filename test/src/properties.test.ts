import sinon from 'sinon'
import { assert } from 'chai'
import { NameProperty } from '../../src/properties'

describe('/src/properties.ts', () => {
  describe('#NameProperty()', () => {
    it('should create without exception with no added config', () => {
      const instance = NameProperty()
      assert.isOk(instance)
    })
  })
})
