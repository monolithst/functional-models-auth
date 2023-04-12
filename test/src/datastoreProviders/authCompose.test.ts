import { values } from 'lodash'
import { TextProperty, ModelReferenceProperty } from 'functional-models'
import { ModelReference } from 'functional-models/interfaces'
import chai = require('chai')
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import { DatastoreProvider, OrmModelFactory, OrmModelInstance, OrmModel } from 'functional-models-orm/interfaces'
import sinon from 'sinon'
import { orm, ormQuery } from 'functional-models-orm'
import memoryDatastore from 'functional-models-orm/datastore/memory'
import ownerDatastoreProvider from '../../../src/datastoreProviders/owner'
import rolesDatastoreProvider from '../../../src/datastoreProviders/roles'
import authComposeDatastoreProvider from '../../../src/datastoreProviders/authCompose'
import models from '../../../src/models'
import { DefaultRoles } from '../../../src/constants'
import { UserType } from '../../../src/interfaces'
import { AuthError } from '../../../src/errors'
import { assertErrorThrown } from '../../utils'
const { assert } = chai

const TEST_USER_DATA = {
  id: 'my-test-user',
  firstName: 'unit',
  lastName: 'test',
  email: 'unit-test@notreal.com',
  enabled: true,
  password: 'password',
  roles: [ DefaultRoles.Contributor ],
}

const TEST_USER_2_DATA = {
  id: 'my-test-user-2',
  firstName: 'unit',
  lastName: 'test',
  email: 'unit-test2@notreal.com',
  enabled: true,
  password: 'password',
  roles: [],
}

const TEST_MODEL_1_DATA = {
  id: 'my-id',
  name: 'my-name'
}

type TestModelType = {
  owner: ModelReference<UserType>,
  name: string,
}

const createTestModel = (BaseModel: OrmModelFactory, User: OrmModel<UserType>) => BaseModel<TestModelType>('TestModel', {
  properties: {
    owner: ModelReferenceProperty(User, { required: true}),
    name: TextProperty(),
  }
})


const _getDefaultTestUser = (User: any) => {
  const user = User.create(TEST_USER_DATA)
  return () => user
} 

const _setup = ({
  user=null,
  getCurrentUser=undefined,
  seedData=undefined,
  additionalDatastoreProvider=null,
  noAuthDatastores=null,
}: any) => {
  // @ts-ignore
  const datastoreProvider = sinon.spy(memoryDatastore(seedData)) as DatastoreProvider
  const unprotectedOrm = orm({ datastoreProvider })
  const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
  const allModels = {
    TestModel: createTestModel(unprotectedOrm.BaseModel, authModels.Users)
  }
  getCurrentUser = getCurrentUser 
    ? getCurrentUser 
    : _getDefaultTestUser(authModels.Users)

  const oDatastore = ownerDatastoreProvider({
    getCurrentUser,
    getUserOwnedModels: () => values(allModels) as unknown as OrmModel<any>[],
    datastoreProvider,
    softAuthError: true,
  })
  const rDatastore = rolesDatastoreProvider({
    getUserObj: getCurrentUser,
    getModelRolesModel: () => authModels.ModelRoles,
    datastoreProvider,
    softAuthError: true,
  })
  const authDatastoreProviders = [
    oDatastore,
    rDatastore,
    ...additionalDatastoreProvider ? [additionalDatastoreProvider] : [],
  ]
  const instance = authComposeDatastoreProvider({
    ...(noAuthDatastores ? {} : { authDatastoreProviders}),
    datastoreProvider,
  })

  return {
    getCurrentUser,
    authDatastoreProviders,
    datastoreProvider: instance,
    memoryDatastore: datastoreProvider,
    authModels,
    allModels,
    BaseModel: unprotectedOrm.BaseModel,
  }
}


describe('/src/datastoreProviders/authCompose.ts', () => {
  describe('#save()', () => {
    it('should be able to save when the model has the correct owner but not the role', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
    })
    it('should be able to save when the model has the role but not the owner', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
    })
    it('should throw an exception when saving, because current user is not the owner, nor the right role', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await assert.isRejected(datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance).catch(e => {
        throw e
      }))
    })
    it('should throw an exception because the underlying datastoreProvider throws an exception that isnt a SoftAuthError', async () => {

      const additionalDatastoreProvider : any = {
        save: () => {
          return Promise.resolve()
            .then(() => {
                throw new Error(`My Error`)
            })
        }
      }
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({
        additionalDatastoreProvider
      })
      await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await assert.isRejected(datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance).catch(e => {
        throw e
      }))
    })
  })
  describe('#delete()', () => {
    it('should be able to delete when the model has the correct owner but not the role', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const model = await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
      await datastoreProvider.delete<TestModelType, OrmModel<TestModelType>>(myModelInstance)
    })
  })
  describe('#retrieve()', () => {
    it('should be able to retrieve when the model has the correct owner but not the role', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const model = await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      await authModels.Users.create(TEST_USER_DATA).save()
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
      await datastoreProvider.retrieve<TestModelType>(allModels.TestModel, await myModelInstance.getPrimaryKey())
    })
  })
  describe('#retrieve()', () => {
    it('should throw an auth error because there are no authDatastoreProviders passed in', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ noAuthDatastores: true})
      const model = await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      await authModels.Users.create(TEST_USER_DATA).save()
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await assertErrorThrown(AuthError, datastoreProvider.retrieve)(allModels.TestModel, await myModelInstance.getPrimaryKey())
    })
  })
  describe('#search()', () => {
    it('should be able to search and find the model when it has the correct owner but not the role', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ seedData: {
        Users: [TEST_USER_DATA]
      }})
      const model = await authModels.ModelRoles.create({
        model: allModels.TestModel.getName(),
        read: [],
        write: [],
        search: [],
        delete: [],
      }).save()
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
      const actual = await datastoreProvider.search(allModels.TestModel, ormQuery.ormQueryBuilder().compile())
      const expected = 1
      assert.equal(actual.instances.length, expected)
    })
  })
})
