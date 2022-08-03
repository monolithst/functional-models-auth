import { invoke } from 'lodash'
import {FunctionalModel, Model, ModelInstance, PrimaryKeyType} from 'functional-models/interfaces'
import { DatastoreProvider, OrmModel, OrmModelInstance, OrmQuery } from 'functional-models-orm/interfaces'
import { SoftAuthError, AuthError } from '../errors'


const authComposeDatastoreProvider = ({
  authDatastoreProviders=[],
  datastoreProvider,
}: any) : DatastoreProvider => {

  const _doAuthFlow = (funcName: string, ...args: readonly any[]) => {
    return Promise.resolve().then(async () => {
      const [allFailed, results] = await authDatastoreProviders.reduce(async (accP: any, authProvider: DatastoreProvider) => {
        const acc = await accP
        if (acc[0] === false) {
          return acc
        }

        const [keepGoing, funcResults] = await invoke(authProvider, funcName, ...args) 
          .then((result: any) => {
            return [false, result]
          })
          .catch((e: Error) => {
            if (e instanceof SoftAuthError) {
              return [true, undefined]
            }
            throw e
          })
        return [keepGoing, funcResults]

      }, [true, undefined])
      if (allFailed) {
        throw new AuthError(`Current user cannot access ${funcName} on model`)
      }
      return results
    })
  }

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return _doAuthFlow('delete', instance)
  }

  const search = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, query: OrmQuery) => {
    return _doAuthFlow('search', model, query)
  }

  const retrieve = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, id: PrimaryKeyType) => {
    return _doAuthFlow('retrieve', model, id)
  }

  const save = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return _doAuthFlow('save', instance)
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

export default authComposeDatastoreProvider
