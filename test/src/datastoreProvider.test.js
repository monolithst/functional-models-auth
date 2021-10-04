const sinon = require('sinon')
const assert = require('chai').assert
const datastoreProviders = require('../../src/datastoreProviders')
const models = require('../../src/models')
const { DEFAULT_ROLES } = require('../../src/constants')
const { datastore, orm } = require('functional-models-orm')
/*
getUser,
  getModelPermissionsModel,
  datastoreProvider,
  defaultPermissions
 */

const TEST_USER_1 = {
  id: '123',
  firstName: 'unit',
  lastName: 'test',
  roles: [DEFAULT_ROLES.Viewer]
}

const TEST_USER_2 = { ...TEST_USER_1, roles: []}
const TEST_USER_ADMIN = { ...TEST_USER_1, roles: [DEFAULT_ROLES.Admin]}
const TEST_USER_SUPER_ADMIN = { ...TEST_USER_1, roles: ['SuperAdmin']}
const TEST_USER_CONTRIBUTOR = { ...TEST_USER_1, roles: [DEFAULT_ROLES.Contributor]}
const TEST_USER_SENIOR_CONTRIBUTOR = { ...TEST_USER_1, roles: [DEFAULT_ROLES.SeniorContributor]}

const TEST_SEED_DATA_1 = {
  ModelPermissions: [{
    id: '456',
    model: 'TEST_MODEL',
    read: [DEFAULT_ROLES.Viewer, DEFAULT_ROLES.Contributor, DEFAULT_ROLES.SeniorContributor],
    write: [DEFAULT_ROLES.Viewer, DEFAULT_ROLES.Contributor, DEFAULT_ROLES.SeniorContributor],
    delete: [DEFAULT_ROLES.SeniorContributor],
  }],
  TEST_MODEL: [{
    id: '123',
  }]
}

const TEST_MODEL = (Model) => Model('TEST_MODEL', {})

describe('/src/datastoreProviders.js', () => {
  describe('#authWrappedDatastoreProvider()', () => {
    describe('#search()', () => {
      it('should throw an exception if getUserObj returns empty', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> null,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const error = await wrappedProvider.search(model, {})
          .then(() => {
            return false
          })
          .catch(e => {
            return true
          })
        assert.isTrue(error)
      })
      it('should call datastoreProvider.search when a user with a Viewer role tries to read a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_1,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        await wrappedProvider.search(model, {})
        assert.isTrue(datastoreProvider.search.called)
      })
      it('should call ModelPermissions.create when no existing permissions exist', async () => {
        const datastoreProvider = datastore.memory()
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ Model: unprotectedOrm.Model })
        const permissions = sinon.spy(authModels.ModelPermissions)
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_1,
          getModelPermissionsModel: () => permissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        await wrappedProvider.search(model, {})
        assert.isTrue(permissions.create.called)
      })
      it('should throw an exception when a user without a role tries to read a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_2,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const error = await wrappedProvider.search(model, {})
          .then(() => {
            return false
          })
          .catch(e => {
            return true
          })
        assert.isTrue(error)
      })
      it('should throw an exception when a Viewer role user tries to read a model when the default permissions do not allow viewer', async () => {
        const datastoreProvider = sinon.spy(datastore.memory())
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_2,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
          defaultPermissions: {
            read: [DEFAULT_ROLES.Admin],
          }
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const error = await wrappedProvider.search(model, {})
          .then(() => {
            return false
          })
          .catch(e => {
            return true
          })
        assert.isTrue(error)
      })
    })
    describe('#retrieve()', () => {
      it('should call datastoreProvider.retrieve when a user with a SeniorContributor role tries to retrieve a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_SENIOR_CONTRIBUTOR,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        await wrappedProvider.retrieve(model, '123')
        assert.isTrue(datastoreProvider.retrieve.called)
      })
    })
    describe('#save()', () => {
      it('should call datastoreProvider.save when a user with a Contributor role tries to save a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_CONTRIBUTOR,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const instance = model.create({id: '123'})
        await wrappedProvider.save(instance)
        assert.isTrue(datastoreProvider.save.called)
      })
    })
    describe('#delete()', () => {
      it('should call datastoreProvider.delete when a user with a SeniorContributor role tries to delete a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_SENIOR_CONTRIBUTOR,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const instance = model.create({id: '123'})
        await wrappedProvider.delete(instance)
        assert.isTrue(datastoreProvider.delete.called)
      })
      it('should call datastoreProvider.delete when a user with a Admin role tries to delete a model', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_ADMIN,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const instance = model.create({id: '123'})
        await wrappedProvider.delete(instance)
        assert.isTrue(datastoreProvider.delete.called)
      })
      it('should call datastoreProvider.delete when a user with a SuperAdmin role tries to delete a model with SuperAdmin set as the adminRole', async () => {
        const datastoreProvider = sinon.spy(datastore.memory(TEST_SEED_DATA_1))
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels  = models({ Model: unprotectedOrm.Model })
        const wrappedProvider = datastoreProviders.authWrappedDatastoreProvider({
          getUserObj: ()=> TEST_USER_SUPER_ADMIN,
          getModelPermissionsModel: () => authModels.ModelPermissions,
          datastoreProvider,
          adminRole: 'SuperAdmin',
        })
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.Model)
        const instance = model.create({id: '123'})
        await wrappedProvider.delete(instance)
        assert.isTrue(datastoreProvider.delete.called)
      })
    })
  })
})

