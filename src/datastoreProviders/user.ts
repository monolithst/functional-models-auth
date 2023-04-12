import omit from 'lodash/omit'
import {ModelInstanceInputData, FunctionalModel, Model, ModelInstance, PrimaryKeyType} from 'functional-models/interfaces'
import { DatastoreProvider, OrmModel, OrmModelInstance, OrmQuery, DatastoreSearchResult } from 'functional-models-orm/interfaces'
import { SoftAuthError, PermissionError } from '../errors'
import { UserType, UserDatastoreInput } from '../interfaces'

/*
 An auth layer specifically for the user model. Allows retrieving and saving the user by the currently logged in user. 

Does not enable delete, nor search.
*/
export const create = <T extends FunctionalModel, TModel extends OrmModel<T>, TUserType extends UserType>({
  getCurrentUser,
  datastoreProvider,
  allowRead=true,
  omitKeys=['password'],
}: UserDatastoreInput<TUserType>) : DatastoreProvider => {

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve().then(() => {
      throw new SoftAuthError()
    })
  }

  const search = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, query: OrmQuery) : Promise<DatastoreSearchResult<T>> => {
    return Promise.resolve().then(async () => {
      if (!allowRead) {
        throw new SoftAuthError()
      }
      const user = await _checkModelGetUserOrThrow<T, TModel>(model)

      return datastoreProvider.search(user.getModel(), query).then(result => {
        return {
          instances: result.instances.map(_omit) as ModelInstanceInputData<T>[],
          page: result.page,
        }
      })
    })
  }

  const _checkModelGetUserOrThrow = async <T extends FunctionalModel, TModel extends Model<T>> (model: TModel) => {
      const user = await getCurrentUser()
      if (model.getName() !== user.getModel().getName()) {
        throw new SoftAuthError()
      }
      return user
  }

  const _omit = <T extends FunctionalModel, TModel extends OrmModel<T>>(obj: ModelInstanceInputData<T>) => {
    if (omitKeys.length < 1) {
      return obj
    }
    return omit(obj, omitKeys) as ModelInstanceInputData<T>
  }

  const retrieve = async <T extends FunctionalModel, TModel extends OrmModel<T>> (model: TModel, id: PrimaryKeyType) => {
    return Promise.resolve()
      .then(async () => {
        const user = await _checkModelGetUserOrThrow<T, TModel>(model)
        const loggedInId = await user.getPrimaryKey()
        if (!allowRead && loggedInId !== id) {
          throw new PermissionError(user.getModel().getName(), 'retrieve')
        }

        return datastoreProvider.retrieve(model, id).then(obj => {
          if (obj) {
            return _omit(obj)
          }
        })
      })
  }

  const save = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve()
      .then(async () => {
        const user = await _checkModelGetUserOrThrow<T, TModel>(instance.getModel())
        const id = await instance.getPrimaryKey()
        const loggedInId = await user.getPrimaryKey()
        if (loggedInId !== id) {
          throw new PermissionError(user.getModel().getName(), 'save')
        }

        return datastoreProvider.save<T, TModel>(instance)
      })
  }
  return {
    save,
    retrieve,
    search,
    delete: deleteObj,
  }
}


