import { get } from 'lodash'
import { mapLimit } from 'modern-async'
import {FunctionalModel, Model, ModelInstance, PrimaryKeyType} from 'functional-models/interfaces'
import { ormQuery } from 'functional-models-orm'
import { DatastoreProvider, OrmModel, OrmModelInstance, OrmQuery } from 'functional-models-orm/interfaces'
import { SoftAuthError, PermissionError, CouldNotFindOwnerError, NotOwnerOfModelError } from '../errors'
import { UserType, MaybePromise, OwnerDatastoreInput, OwnerGetter } from '../interfaces'

const userOwnerDatastoreWrapper = <T extends FunctionalModel, TModel extends Model<T>, TUserType extends UserType>({
  getCurrentUser,
  datastoreProvider,
  getUserOwnedModels,
  getOwner=undefined,
  softAuthError=true,
}: OwnerDatastoreInput<TUserType>) : DatastoreProvider => {

  const _defaultGetOwner = <TUserType extends UserType>() : OwnerGetter => async (modelInstance: any) => {
    const value = await (get(modelInstance, 'get.owner', () => undefined ))()
    if (!value) {
      return value
    }

    // Do we need to fetch the owner???
    if (typeof value !== 'object') {
      const userModel = (await getCurrentUser()).getModel()
      const searchResults = await datastoreProvider.search<TUserType>(
        // @ts-ignore
        userModel,
        ormQuery.ormQueryBuilder()
        .property(userModel.getPrimaryKeyName(), value)
        .take(1)
        .compile()
      )
      const data = searchResults.instances[0]
      if (!data) {
        return undefined
      }
      // @ts-ignore
      return userModel.create(data)
    }
    return value
  }
  getOwner = getOwner || _defaultGetOwner<TUserType>()

  const _isUserLockedModel = async (model: any) => {
    const modelNames = (await getUserOwnedModels()).map(model => model.getName())
    const key = model.getName()
    return modelNames.includes(key) 
  }

  const _ifNotOwnerThrow = async (user: any, modelInstance: any, shouldThrow: boolean) => {
    // @ts-ignore
    const owner = await getOwner(modelInstance)
    if (!owner) {
      throw new CouldNotFindOwnerError(modelInstance.getModel().getName(), `${await modelInstance.getPrimaryKey()}`)
    }
    if (await owner.getPrimaryKey() !== await user.getPrimaryKey()) {
      /*
      The current user is not the owner of this model.
      There are three possible responses.
      shouldThrow is an internal limitation with search. (we don't want any throwing with search. It'll just filter)
      softAuthError will throw a different error, if doing soft auth failures.
      */
      // The current user is NOT the owner of this.
      // There are three levels of responses.

      if (shouldThrow) {
        if (softAuthError === false) {
          throw new NotOwnerOfModelError(modelInstance.getModel().getName(), `${await owner.getPrimaryKey()}`, `${await modelInstance.getPrimaryKey()}`)
        }
        throw new SoftAuthError()
      }
      return false
    }
    return true
  }

  const _doOwnerProcess = async (modelInstance: any, shouldThrow=true) => {
    if (_isUserLockedModel(modelInstance.getModel())) {
      const user = await getCurrentUser()
      /*
       TODO: There is a major vulnerability. A person can change the owner of the model instance to make them the owner, and then delete/save or whatever the
      model because they'll be the owner now. This whole thing needs to retrieve the modelInstance that is being saved/deleted, and then check THAT ONE first.

      */
      return _ifNotOwnerThrow(user, modelInstance, shouldThrow)
    }
    return true
  }

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve().then(async () => {
      await _doOwnerProcess(instance)
      return datastoreProvider.delete<T, TModel>(instance)
    })
  }

  const search = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, query: OrmQuery) => {
    return Promise.resolve().then(async () => {
      const results = await datastoreProvider.search<T>(model, query)
      if (results.instances.length > 0) {
        const instances = results.instances.map(model.create)
        const boolAndInstance = await mapLimit(instances, async (instance) => {
          const shouldContinue = await _doOwnerProcess(instance, false)
          return [shouldContinue, instance]
        }, 1)
        const finalInstances : readonly ModelInstance<T, Model<T>>[] = boolAndInstance
          .filter((entry: any) => entry[0])
          .map((entry: any) => entry[1] as ModelInstance<T, Model<T>>)
        const data = await mapLimit(finalInstances, instance => instance.toObj(), 1)
        return {
          instances: data,
          page: results.page
        }
      }

      return results
    })
  }

  const retrieve = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, id: PrimaryKeyType) => {
    return Promise.resolve().then(async () => {
      const data = await datastoreProvider.retrieve(model, id)
      if (data) {
        const instance = model.create(data)
        await _doOwnerProcess(instance)
        return data
      }
      return undefined 
    })
  }

  const save = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve().then(async () => {
      await _doOwnerProcess(instance)
      return datastoreProvider.save<T, TModel>(instance)
    })
  }

  return {
    // If there are any additional methods provided by the provider, add it here.
    ...datastoreProvider,
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}

export default userOwnerDatastoreWrapper 
