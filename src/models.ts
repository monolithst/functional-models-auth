import { merge, values } from 'lodash'
import {
  BaseModel as BasicModel,
  EmailProperty,
  TextProperty,
  BooleanProperty,
} from 'functional-models'
import {
  PropertyConfig,
  PropertyInstance,
  ModelMethod,
  ModelInstanceMethod,
  ModelInstance,
  Model,
} from 'functional-models/interfaces'
import { OrmModel, OrmModelInstance, OrmModelFactory } from 'functional-models-orm/interfaces'
import { ormQuery, properties } from 'functional-models-orm'
import { ModelNames, DefaultRoles } from './constants'
import { NameProperty, RolesProperty, PasswordProperty } from './properties'
import { ModelRoleType, UserType } from './interfaces'

const { ormPropertyConfig } = properties
const { ormQueryBuilder } = ormQuery

const _modelRolesConfig : {
  properties: {[s: string]: PropertyInstance<any>},
  modelMethods: {[s: string]: ModelMethod},
  instanceMethods: {[s: string]: ModelInstanceMethod},
  propertyConfigOverrides: {[s: string]: any}
  additionalMetadata: {[s: string]: any}
} = {
  properties: {},
  modelMethods: {},
  instanceMethods: {},
  propertyConfigOverrides: {},
  additionalMetadata: {},
}

const _defaultUsersConfig : {
  properties: {[s: string]: PropertyInstance<any>},
  modelMethods: {[s: string]: ModelMethod},
  instanceMethods: {[s: string]: ModelInstanceMethod},
  propertyConfigOverrides: {[s: string]: any}
  additionalMetadata: {[s: string]: any}
  rolesConfig: {[s: string]: any}
} = {
  properties: {},
  modelMethods: {},
  instanceMethods: {},
  propertyConfigOverrides: {},
  additionalMetadata: {},
  rolesConfig: {}
}

const models = ({
  BaseModel = BasicModel as OrmModelFactory,
  modelRolesConfig = _modelRolesConfig,
  usersConfig = _defaultUsersConfig,
  rolesArray = values(DefaultRoles)
}) => {

  const Users = BaseModel<UserType>(
    ModelNames.Users, {
      properties: {
        firstName: NameProperty({required: true}),
        lastName: NameProperty({required: true}),
        email: EmailProperty(
          ormPropertyConfig({required: true, unique: 'email'})
        ),
        password: PasswordProperty(),
        roles: RolesProperty(rolesArray, {...usersConfig.rolesConfig}),
        enabled: BooleanProperty({defaultValue: false}),
        ...usersConfig.properties,
      },
      modelMethods: {
        // @ts-ignore
        getUserByEmail: (Users: OrmModel<UserType>, email: string) => {
          return Promise.resolve()
            .then(() => {
              const query = ormQueryBuilder()
                .property('email', email, { caseSensitive: false})
                .compile()
              return Users.searchOne(query)
            })
        },
        ...usersConfig.modelMethods,
      },
      instanceMethods: {
        canLogin: (user: OrmModelInstance<UserType>) => {
          return user.get.enabled()
        },
        enable: (user: OrmModelInstance<UserType>, Users: OrmModel<UserType>) => {
          return Promise.resolve()
            .then(async () => {
              const data = await user.toObj()
              const newData = { ...data, enabled: true} 
              return Users.create(newData).save()
            })
        },
        ...usersConfig.instanceMethods,
      }
    }, usersConfig.additionalMetadata
  )

  const ModelRoles = BaseModel<ModelRoleType>(
    ModelNames.ModelRoles,
    {
      properties: {
        model: TextProperty(merge(ormPropertyConfig({ required: true, unique: 'model'}), modelRolesConfig.propertyConfigOverrides) as PropertyConfig<string>),
        read: RolesProperty(rolesArray),
        write: RolesProperty(rolesArray),
        delete: RolesProperty(rolesArray),
        search: RolesProperty(rolesArray),
        ...modelRolesConfig.properties,
      },
      modelMethods: {
        ...modelRolesConfig.modelMethods,
      },
      instanceMethods: {
        ...modelRolesConfig.instanceMethods,
      },
    }, modelRolesConfig.additionalMetadata
  )

  return {
    ModelRoles,
    Users,
  }
}

export default models
