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
import models from '../../../src/models'
import { UserType } from '../../../src/interfaces'
const { assert } = chai

  /*
  getCurrentUser,
  datastoreProvider,
  getUserOwnedModels,
  getOwner=_defaultGetOwner<TUserType>(),
  throwIfNotUser=true,
 */

const TEST_USER_DATA = {
  id: 'my-test-user',
  firstName: 'unit',
  lastName: 'test',
  email: 'unit-test@notreal.com',
  enabled: true,
  password: 'password',
  roles: [],
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

  const instance = ownerDatastoreProvider({
    getCurrentUser,
    getUserOwnedModels: () => values(allModels) as unknown as OrmModel<any>[],
    datastoreProvider,
  })
  return {
    getCurrentUser,
    datastoreProvider: instance,
    memoryDatastore: datastoreProvider,
    authModels,
    allModels,
    BaseModel: unprotectedOrm.BaseModel,
  }
}


describe('/src/datastoreProviders/owner.ts', () => {
  describe('#save()', () => {
    it('should be able to save', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const owner = getCurrentUser()
      const myModelInstance = allModels.TestModel.create({
        owner,
        name: 'my-name',
      })
      await datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance)
    })
    it('should throw an exception when saving, because current user is not the owner', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await assert.isRejected(datastoreProvider.save<TestModelType, OrmModel<TestModelType>>(myModelInstance))
    })
  })
})
