import {FunctionalModel, MaybePromise, Model, ModelInstance, ModelMethod, ModelInstanceMethod } from "functional-models/interfaces"
import {OrmModelInstance, DatastoreProvider, OrmModel, OrmModelMethod, OrmModelInstanceMethod} from "functional-models-orm/interfaces"

type ModelRoleStructure = {
  read: readonly string[],
  write: readonly string[],
  delete: readonly string[],
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
}


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

export {
  ModelRoleType,
  ModelRoleStructure,
  AuthWrapperInputs,
  UserType,
}
