import sinon from 'sinon'
import { assert } from 'chai'
import { orm } from 'functional-models-orm'
import models from '../../src/models'
import { DefaultRoles } from '../../src/constants'
import memoryDatastore from 'functional-models-orm/datastore/memory'

describe('/src/models.ts', () => {
  describe('#()', () => {
    it('should create an object with "Users"', () => {
      const instance = models({})
      const actual = instance.Users
      assert.isOk(actual)
    })
    it('should create an object with "ModelRoles"', () => {
      const instance = models({})
      const actual = instance.ModelRoles
      assert.isOk(actual)
    })
    it('should use the model class passed into Model', () => {
      const Model = sinon.stub()
      models({ BaseModel: Model })
      sinon.assert.called(Model)
    })
    describe('#Users.create()', () => {
      it('should create a user with the expected keys', () => {
        const authModels = models({})
        const user = authModels.Users.create({
          firstName: 'first',
          lastName: 'last',
          email: 'email',
          password: 'myPassword',
          enabled: true,
          roles: [DefaultRoles.Admin],
        })
        const actual = Object.keys(user.get)
        const expected = [
          'id',
          'firstName',
          'lastName',
          'email',
          'password',
          'enabled',
          'roles',
        ]
        assert.includeMembers(actual, expected)
      })
    })
    describe('#Users.getUsersByEmail()', () => {
      it('should find the user with the email provided', async () => {
        const expected = {
          id: 'id',
          firstName: 'first',
          lastName: 'last',
          email: 'email',
          password: 'myPassword',
          enabled: true,
          roles: [DefaultRoles.Admin],
        }
        const datastoreProvider = memoryDatastore({
          Users: [expected],
        })
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const user = await authModels.Users.methods.getUserByEmail('email')
        const actual = await user.toObj()
        assert.deepEqual(actual, expected)
      })
    })
    describe('#Users.canLogin()', () => {
      it('should return true if user is enabled', async () => {
        const datastoreProvider = memoryDatastore()
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const user = authModels.Users.create({
          id: 'id',
          firstName: 'first',
          lastName: 'last',
          email: 'email',
          password: 'myPassword',
          enabled: true,
          roles: [DefaultRoles.Admin],
        })
        const actual = await user.methods.canLogin()
        assert.isTrue(actual)
      })
      it('should return true if user is not enabled', async () => {
        const datastoreProvider = memoryDatastore()
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const user = authModels.Users.create({
          id: 'id',
          firstName: 'first',
          lastName: 'last',
          email: 'email',
          password: 'myPassword',
          enabled: false,
          roles: [DefaultRoles.Admin],
        })
        const actual = await user.methods.canLogin()
        assert.isFalse(actual)
      })
    })
    describe('#Users.canLogin()', () => {
      it('should return true if user is enabled', async () => {
        const datastoreProvider = memoryDatastore()
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const user = authModels.Users.create({
          id: 'id',
          firstName: 'first',
          lastName: 'last',
          email: 'email@myemail.com',
          password: 'myPassword',
          enabled: false,
          roles: [DefaultRoles.Admin],
        })
        const newUser = await user.methods.enable()
        const actual = newUser.get.enabled()
        assert.isTrue(actual)
      })
    })
    describe('#ModelRoles.create()', () => {
      it('should create a model role with the expected keys', () => {
        const authModels = models({})
        const modelRole = authModels.ModelRoles.create({
          model: 'my-model',
          read: [],
          write: [],
          delete: [],
        })
        const actual = Object.keys(modelRole.get)
        const expected = ['id', 'read', 'write', 'delete']
        assert.includeMembers(actual, expected)
      })
    })
  })
})
