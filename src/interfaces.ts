import {FunctionalModel, Model, ModelInstance, ModelMethod, ModelInstanceMethod } from "functional-models/interfaces"
import {OrmModelInstance, DatastoreProvider, OrmModel, OrmModelMethod, OrmModelInstanceMethod} from "functional-models-orm/interfaces"

type MaybePromise<T> = Promise<T>|T

type ModelRoleStructure = {
  read: readonly string[],
  write: readonly string[],
  delete: readonly string[],
  search: readonly string[],
}

type AuthComposableInput = {
  softAuthError?: boolean
}

type ModelRoleType = {
  model: string,
} & ModelRoleStructure

type AuthWrapperInputs = {
  getUserObj: () => MaybePromise<OrmModelInstance<UserType>>,
  getModelRolesModel: () => MaybePromise<OrmModel<ModelRoleType>>,
  datastoreProvider: DatastoreProvider,
  defaultModelRoles?: ModelRoleStructure,
  adminRole?: string,
} & AuthComposableInput

type UserType = {
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  roles: readonly string[],
  enabled: boolean,
  getUserByEmail: OrmModelMethod<UserType>,
  canLogin: OrmModelInstanceMethod<UserType>,
  enable: OrmModelInstanceMethod<UserType>,
}

type OwnerGetter = <
  T extends FunctionalModel,
  TModel extends OrmModel<T>,
  TModelInstance extends OrmModelInstance<T, TModel>,
  TUserType extends UserType
>(modelInstance: TModelInstance) => MaybePromise<OrmModelInstance<TUserType>|undefined>

type OwnerDatastoreInput<TUserType extends UserType> = {
  getCurrentUser: () => MaybePromise<OrmModelInstance<TUserType>>,
  getUserOwnedModels: () => MaybePromise<OrmModel<any>[]>,
  datastoreProvider: DatastoreProvider,
  getOwner?: OwnerGetter,
} & AuthComposableInput 

export {
  ModelRoleType,
  ModelRoleStructure,
  AuthWrapperInputs,
  UserType,
  MaybePromise,
  AuthComposableInput,
  OwnerDatastoreInput,
  OwnerGetter,
}
