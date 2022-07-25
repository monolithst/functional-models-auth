import {FunctionalModel, Model, ModelInstance, MaybePromise, PrimaryKeyType} from 'functional-models/interfaces'
import { ormQuery } from 'functional-models-orm'
import { DatastoreProvider, OrmModel, OrmModelInstance, OrmQuery } from 'functional-models-orm/interfaces'
import { DEFAULT_MODEL_ROLES, DefaultRoles } from '../constants'
import { PermissionError } from '../errors'
import { ModelRoleType, AuthWrapperInputs } from '../interfaces'


const authWrappedDatastoreProvider = <T extends FunctionalModel, TModel extends Model<T>>({
  getUserObj,
  getModelRolesModel,
  datastoreProvider,
  defaultModelRoles = DEFAULT_MODEL_ROLES, // this MUST match your ModelRoles structure (outside of the model property).
  adminRole = DefaultRoles.Admin,
}: AuthWrapperInputs) : DatastoreProvider => {
  const _getOrCreateRoles = async <T extends FunctionalModel>(model: Model<T>) => {
    const modelName = model.getName()
    const query = ormQuery
      .ormQueryBuilder()
      .property('model', modelName)
      .compile()
    const ModelRoles = await getModelRolesModel()
    const modelRoles = (await ModelRoles.search(query)).instances[0]
    if (!modelRoles) {
      const instance = ModelRoles.create({
        model: modelName,
        ...defaultModelRoles,
      })
      return instance.save()
    }
    return modelRoles 
  }

  const _checkPermissionAndError = async <T extends FunctionalModel, TModel extends Model<T>>(
    model: TModel,
    functionName: string,
    rolesMethod: (modelRolesInstance: OrmModelInstance<ModelRoleType, OrmModel<ModelRoleType>>) => MaybePromise<readonly string[]>,
  ) => {
    const user = await getUserObj()
    if (!user) {
      throw new Error(`No user found!`)
    }
    const userRoles = user.get.roles()
    if (userRoles.includes(adminRole)) {
      return undefined
    }
    const modelRoles = await _getOrCreateRoles<T>(model)
    const roles = await rolesMethod(modelRoles)
    if (!userRoles.find((role: string) => roles.includes(role))) {
      throw new PermissionError(model.getName(), functionName)
    }
    return undefined
  }

  const deleteObj = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError<T, TModel>(
        instance.getModel(),
        'delete',
        modelRoles => modelRoles.get.delete()
      )
      return datastoreProvider.delete<T, TModel>(instance)
    })
  }

  const search = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, query: OrmQuery) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError<T, TModel>(model, 'read', modelRoles =>
        modelRoles.get.read()
      )
      return datastoreProvider.search<T>(model, query)
    })
  }

  const retrieve = <T extends FunctionalModel, TModel extends OrmModel<T>>(model: TModel, id: PrimaryKeyType) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError<T, TModel>(model, 'read', modelRoles =>
        modelRoles.get.read()
      )
      return datastoreProvider.retrieve(model, id)
    })
  }

  const save = <T extends FunctionalModel, TModel extends Model<T>>(instance: ModelInstance<T, TModel>) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError<T, TModel>(
        instance.getModel(),
        'write',
        modelRoles => modelRoles.get.write()
      )
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

export default authWrappedDatastoreProvider
