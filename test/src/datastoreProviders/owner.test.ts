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
import { CouldNotFindOwnerError, SoftAuthError, NotOwnerOfModelError } from '../../../src/errors'
import { assertErrorThrown } from '../../utils'
const { assert } = chai

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

type TestModel2Type = {
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
  datastoreProviderArgs={},
}: any) => {
  // @ts-ignore
  const datastoreProvider = sinon.spy(memoryDatastore(seedData)) as DatastoreProvider
  const unprotectedOrm = orm({ datastoreProvider })
  const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
  const allModels = {
    TestModel: createTestModel(unprotectedOrm.BaseModel, authModels.Users),
    TestModel2: unprotectedOrm.BaseModel<TestModel2Type>('TestModel2', {
      properties: {
        name: TextProperty(),
      }
    })
  }
  getCurrentUser = getCurrentUser 
    ? getCurrentUser 
    : _getDefaultTestUser(authModels.Users)

  const instance = ownerDatastoreProvider({
    getCurrentUser,
    getUserOwnedModels: () => ([allModels.TestModel] as unknown as OrmModel<any>[]),
    datastoreProvider,
    ...datastoreProviderArgs,
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
  describe('#search()', () => {
    it('should return doing nothing if no results are found', async() => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const myModelInstance = await allModels.TestModel2.create({
        name: 'my-name',
      }).save()
      const actual = await datastoreProvider.search<TestModel2Type>(allModels.TestModel2, ormQuery.ormQueryBuilder().property('name', 'my-name-2-3').compile())
      const expected = 0
      assert.equal(actual.instances.length, expected)
    })
    it('should find 1 result and work as normal if the model is NOT an owner locked model', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const myModelInstance = await allModels.TestModel2.create({
        name: 'my-name',
      }).save()
      const actual = await datastoreProvider.search<TestModel2Type>(allModels.TestModel2, ormQuery.ormQueryBuilder().property('name', 'my-name').compile())
      const expected = 1
      assert.equal(actual.instances.length, expected)
    })
    it('should not throw an exception if the owner is not the correct owner, because its a search', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const anotherUser = await authModels.Users.create(TEST_USER_2_DATA).save()
      const myModelInstance = await allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      }).save()
      await datastoreProvider.search<TestModelType>(allModels.TestModel, ormQuery.ormQueryBuilder().property('name', 'my-name').compile())
    })
  })
  describe('#retrieve()', () => {
    it('should return undefined if retrieve doesnt find any objects, as normal', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ })
      const owner = await getCurrentUser().save()
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const actual = await datastoreProvider.retrieve<TestModelType>(allModels.TestModel, 'my-test-model-id')
      assert.isUndefined(actual)
    })
    it('should throw a CouldNotFindOwnerError when getOwner() returns undefined', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ })
      const owner = await getCurrentUser().save()
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = await allModels.TestModel.create({
        id: 'my-test-model-id',
        owner: anotherUser,
        name: 'my-name',
      }).save()
      await assertErrorThrown(CouldNotFindOwnerError, datastoreProvider.retrieve)(allModels.TestModel, 'my-test-model-id')
    })
  })
  describe('#save()', () => {
    it('should throw a soft auth error when saving, because current user is not the owner', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({})
      const anotherUser = authModels.Users.create(TEST_USER_2_DATA)
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await assertErrorThrown(SoftAuthError, datastoreProvider.save)(myModelInstance)
    })
    it('should throw a NotOwnerOfModelError when saving, because current user is not the owner AND softAuthError=false', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ datastoreProviderArgs: { softAuthError: false}})
      const currentUser = await getCurrentUser().save()
      const anotherUser = await authModels.Users.create(TEST_USER_2_DATA).save()
      const myModelInstance = allModels.TestModel.create({
        owner: anotherUser,
        name: 'my-name',
      })
      await assertErrorThrown(NotOwnerOfModelError, datastoreProvider.save)(myModelInstance)
    })
    it('should throw a CouldNotFindOwnerError when getOwner() returns undefined because the model does not have an owner even though it should', async () => {
      const { allModels, datastoreProvider, BaseModel, authModels, getCurrentUser } = _setup({ })
      const owner = await getCurrentUser().save()
      //@ts-ignore
      const myModelInstance = await allModels.TestModel.create({
        id: 'my-test-model-id',
        name: 'my-name',
      })
      await assertErrorThrown(CouldNotFindOwnerError, datastoreProvider.save)(myModelInstance)
    })
  })
})
