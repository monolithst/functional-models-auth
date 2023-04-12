import { omit } from 'lodash'
import { TextProperty } from 'functional-models'
import chai = require('chai')
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import { DatastoreProvider, OrmModelFactory, OrmModelInstance, OrmModel } from 'functional-models-orm/interfaces'
import sinon from 'sinon'
import { orm, ormQuery } from 'functional-models-orm'
import memoryDatastore from 'functional-models-orm/datastore/memory'
import { create as userDatastoreProvider } from '../../../src/datastoreProviders/user'
import { SoftAuthError, PermissionError } from '../../../src/errors'
import models from '../../../src/models'
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

const _getDefaultTestUser = (User: any) => {
  const user = User.create(TEST_USER_DATA)
  return () => user
} 

const _setup = ({
  user=null,
  getCurrentUser=undefined,
  seedData=undefined,
  datastoreArgs={},
}: any) => {
  // @ts-ignore
  const datastoreProvider = sinon.spy(memoryDatastore(seedData)) as DatastoreProvider
  const unprotectedOrm = orm({ datastoreProvider })
  const authModels = models({ BaseModel: unprotectedOrm.BaseModel })
  const allModels = {
    TestModel: unprotectedOrm.BaseModel<{ name: string }>('TestModel', {
      properties: {
        name: TextProperty()
      }
    })
  }
  getCurrentUser = getCurrentUser 
    ? getCurrentUser 
    : _getDefaultTestUser(authModels.Users)

  const instance = userDatastoreProvider({
    getCurrentUser,
    datastoreProvider,
    ...datastoreArgs,
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


describe('/src/datastoreProviders/user.ts', () => {
  describe('#save()', () => {
    it('should be able to save when the current user is the user being saved', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels } = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      const u2 = await Users.create(TEST_USER_2_DATA).save()
      //@ts-ignore
      await datastoreProvider.save(Users.create(TEST_USER_DATA))
    })
    it('should throw an exception when saving, because current user is not the user being saved', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      //@ts-ignore
      assert.isRejected(datastoreProvider.save(Users.create(TEST_USER_2_DATA)))
    })
  })
  describe('#search()', () => {
    it('should throw a soft error because a user cannot search users when allowRead=false', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser, datastoreArgs: { allowRead: false} })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await assertErrorThrown(SoftAuthError, datastoreProvider.search)(Users, ormQuery.ormQueryBuilder().compile())
    })
    it('should search for users when allowRead=true', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser, datastoreArgs: { allowRead: true} })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      const actual = await datastoreProvider.search(
        Users, 
        ormQuery
          .ormQueryBuilder()
          .property('id', TEST_USER_2_DATA.id)
          .compile()
      )
      const expected = {
        instances: [ omit(TEST_USER_2_DATA, 'password')],
        page: null,
      }
      assert.deepEqual<any>(actual, expected)
    })
    it('should not include email for users when omitKeys=["email"]', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser, datastoreArgs: { allowRead: true, omitKeys: ["email"]} })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      const actual = await datastoreProvider.search(
        Users, 
        ormQuery
          .ormQueryBuilder()
          .property('id', TEST_USER_2_DATA.id)
          .compile()
      )
      const expected = {
        instances: [ omit(TEST_USER_2_DATA, 'email')],
        page: null,
      }
      assert.deepEqual<any>(actual, expected)
    })
    it('should include password for users when omitKeys=[]', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser, datastoreArgs: { allowRead: true, omitKeys: []} })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      const actual = await datastoreProvider.search(
        Users, 
        ormQuery
          .ormQueryBuilder()
          .property('id', TEST_USER_2_DATA.id)
          .compile()
      )
      const expected = {
        instances: [ TEST_USER_2_DATA ],
        page: null,
      }
      assert.deepEqual<any>(actual, expected)
    })
  })
  describe('#delete()', () => {
    it('should throw a soft error because a user cannot be deleted by the current user even if it is its own user', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await assertErrorThrown(SoftAuthError, datastoreProvider.delete)(Users, TEST_USER_DATA.id)
    })
    it('should throw a soft error if one user tries to delete another', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      //@ts-ignore
      await assertErrorThrown(SoftAuthError, datastoreProvider.delete)(Users, TEST_USER_2_DATA.id)
    })
  })
  describe('#retrieve()', () => {
    it('should be able to get the user when the current user matches', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels } = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      //@ts-ignore
      await datastoreProvider.retrieve(Users, TEST_USER_DATA.id)
    })
    it('should throw a SoftAuthError when retrieving a different model other than a user', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      await assertErrorThrown(SoftAuthError, datastoreProvider.retrieve)(allModels.TestModel, 'a-different-id')
    })
    it('should throw an exception when retrieving when allowRead=false, because current user is not the user being retrieved', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser, datastoreArgs: { allowRead: false }})
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      await assertErrorThrown(PermissionError, datastoreProvider.retrieve)(Users, TEST_USER_2_DATA.id)
    })
    it('should NOT throw an exception when retrieving when current user is not the user being retrieved and allowRead=true', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      await datastoreProvider.retrieve(Users, TEST_USER_2_DATA.id)
    })
    it('should return empty when retrieving when current user is not the user being retrieved and allowRead=true but the user doesnt exist', async () => {
      let Users = null
      let user : any = null
      const getCurrentUser = () => {
        return user
      }

      const { allModels, datastoreProvider, BaseModel, authModels }  = _setup({ getCurrentUser })
      Users = authModels.Users
      user = await Users.create(TEST_USER_DATA).save()
      await Users.create(TEST_USER_2_DATA).save()
      await datastoreProvider.retrieve(Users, 'not-here')
    })
  })
})
