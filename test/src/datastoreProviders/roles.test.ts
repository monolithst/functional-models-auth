import chai = require('chai')
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import sinon from 'sinon'
import { orm, ormQuery } from 'functional-models-orm'
import { DatastoreProvider, OrmModel } from 'functional-models-orm/interfaces'
import memoryDatastore from 'functional-models-orm/datastore/memory'
import { rolesDatastoreProvider } from '../../../src/datastoreProviders'
import models from '../../../src/models'
import { DefaultRoles } from '../../../src/constants'
import { ModelRoleType } from '../../../src/interfaces'
const { assert } = chai
const { ormQueryBuilder } = ormQuery

const TEST_USER_1 = {
  id: '123',
  firstName: 'unit',
  lastName: 'test',
  enabled: true,
  password: 'pass',
  email: 'email',
  roles: [DefaultRoles.Viewer],
}

const TEST_USER_2 = { ...TEST_USER_1, roles: [] }
const TEST_USER_ADMIN = { ...TEST_USER_1, roles: [DefaultRoles.Admin] }
const TEST_USER_SUPER_ADMIN = { ...TEST_USER_1, roles: ['SuperAdmin'] }
const TEST_USER_CONTRIBUTOR = {
  ...TEST_USER_1,
  roles: [DefaultRoles.Contributor],
}
const TEST_USER_SENIOR_CONTRIBUTOR = {
  ...TEST_USER_1,
  roles: [DefaultRoles.SeniorContributor],
}

const TEST_SEED_DATA_1 = {
  ModelRoles: [
    {
      id: '456',
      model: 'TEST_MODEL',
      read: [
        DefaultRoles.Viewer,
        DefaultRoles.Contributor,
        DefaultRoles.SeniorContributor,
      ],
      write: [
        DefaultRoles.Viewer,
        DefaultRoles.Contributor,
        DefaultRoles.SeniorContributor,
      ],
      delete: [DefaultRoles.SeniorContributor],
    },
  ],
  TEST_MODEL: [
    {
      id: '123',
    },
  ],
}

const TEST_MODEL = (Model: any) => Model('TEST_MODEL', { properties: {}})

describe('/src/datastoreProviders/roles.ts', () => {
  describe('#rolesDatastoreProvider()', () => {
    describe('#search()', () => {
      it('should throw an exception if getUserObj returns empty', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            //@ts-ignore
            getUserObj: () => null,
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        assert.isRejected(wrappedProvider.search(model, ormQueryBuilder().compile()))
      })
      it('should call datastoreProvider.search when a user with a Viewer role tries to read a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_1),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        await wrappedProvider.search(model, ormQueryBuilder().compile())
        //@ts-ignore
        assert.isTrue(datastoreProvider.search.called)
      })
      it('should call ModelRoles.create when no existing modelRoles exist', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore()) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const modelRoles = sinon.spy(authModels.ModelRoles)
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_1),
            getModelRolesModel: () => modelRoles as unknown as OrmModel<ModelRoleType>,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        await wrappedProvider.search(model, ormQueryBuilder().compile())
        //@ts-ignore
        assert.isTrue(modelRoles.create.called)
      })
      it('should throw an exception when a user without a role tries to read a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_2),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        await assert.isRejected(wrappedProvider.search(model, ormQueryBuilder().compile()))
      })
      it('should throw an exception when a Viewer role user tries to read a model when the default modelRoles do not allow viewer', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore()) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_2),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
            defaultModelRoles: {
              write: [],
              delete: [],
              read: [DefaultRoles.Admin],
            },
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        await assert.isRejected(wrappedProvider.search(model, ormQueryBuilder().compile()))
      })
    })
    describe('#retrieve()', () => {
      it('should call datastoreProvider.retrieve when a user with a SeniorContributor role tries to retrieve a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_SENIOR_CONTRIBUTOR),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        await wrappedProvider.retrieve(model, '123')
        //@ts-ignore
        assert.isTrue(datastoreProvider.retrieve.called)
      })
    })
    describe('#save()', () => {
      it('should call datastoreProvider.save when a user with a Contributor role tries to save a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_CONTRIBUTOR),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        const instance = model.create({ id: '123' })
        await wrappedProvider.save(instance)
        //@ts-ignore
        assert.isTrue(datastoreProvider.save.called)
      })
    })
    describe('#delete()', () => {
      it('should call datastoreProvider.delete when a user with a SeniorContributor role tries to delete a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_SENIOR_CONTRIBUTOR),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        const instance = model.create({ id: '123' })
        await wrappedProvider.delete(instance)
        //@ts-ignore
        assert.isTrue(datastoreProvider.delete.called)
      })
      it('should call datastoreProvider.delete when a user with a Admin role tries to delete a model', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_ADMIN),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        const instance = model.create({ id: '123' })
        await wrappedProvider.delete(instance)
        //@ts-ignore
        assert.isTrue(datastoreProvider.delete.called)
      })
      it('should call datastoreProvider.delete when a user with a SuperAdmin role tries to delete a model with SuperAdmin set as the adminRole', async () => {
        const datastoreProvider = sinon.spy(memoryDatastore(TEST_SEED_DATA_1)) as DatastoreProvider
        const unprotectedOrm = orm({ datastoreProvider })
        const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
        const wrappedProvider = rolesDatastoreProvider(
          {
            getUserObj: () => authModels.Users.create(TEST_USER_SUPER_ADMIN),
            getModelRolesModel: () => authModels.ModelRoles,
            datastoreProvider,
            adminRole: 'SuperAdmin',
          }
        )
        const protectedOrm = orm({ datastoreProvider: wrappedProvider })
        const model = TEST_MODEL(protectedOrm.BaseModel)
        const instance = model.create({ id: '123' })
        await wrappedProvider.delete(instance)
        //@ts-ignore
        assert.isTrue(datastoreProvider.delete.called)
      })
    })
  })
})
