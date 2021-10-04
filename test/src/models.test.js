const sinon = require('sinon')
const assert = require('chai').assert
const models = require('../../src/models')

describe('/src/models.js', () => {
  describe('#()', () => {
    it('should create an object with "Users"', () => {
      const instance = models({})
      const actual = instance.Users
      assert.isOk(actual)
    })
    it('should create an object with "ModelPermissions"', () => {
      const instance = models({})
      const actual = instance.ModelPermissions
      assert.isOk(actual)
    })
    it('should use the model class passed into Model', () => {
      const Model = sinon.stub()
      models({ Model })
      sinon.assert.called(Model)
    })
    describe('#Users.create()', () => {
      it('should create a user with the expected keys', () => {
        const authModels = models({})
        const user = authModels.Users.create({})
        const actual = Object.keys(user)
        const expected = [
          'getId',
          'getFirstName',
          'getLastName',
          'getEmail',
          'getRoles',
        ]
        assert.includeMembers(actual, expected)
      })
    })
    describe('#ModelPermissions.create()', () => {
      it('should create a model permission with the expected keys', () => {
        const authModels = models({})
        const user = authModels.ModelPermissions.create({})
        const actual = Object.keys(user)
        const expected = ['getId', 'getRead', 'getWrite', 'getDelete']
        assert.includeMembers(actual, expected)
      })
    })
  })
})
