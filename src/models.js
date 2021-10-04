const merge = require('lodash/merge')
const {
  Model: functionalModel,
  EmailProperty,
  TextProperty,
} = require('functional-models')
const { ormPropertyConfig } = require('functional-models-orm').properties
const { MODEL_NAMES, DEFAULT_ROLES } = require('./constants')
const { NameProperty, RolesProperty } = require('./properties')

const _modelPermissionsConfig = {
  properties: {},
  permissions: {},
  model: {},
  args: [],
}
const _defaultUsersConfig = { properties: {}, args: [], roles: {} }

const models = ({
  Model = functionalModel,
  modelPermissionsConfig = _modelPermissionsConfig,
  usersConfig = _defaultUsersConfig,
  rolesArray = DEFAULT_ROLES.toArray(),
}) => {
  const Users = Model(
    MODEL_NAMES.Users,
    {
      firstName: NameProperty({ required: true }),
      lastName: NameProperty({ required: true }),
      email: EmailProperty(
        ormPropertyConfig({ required: true, unique: 'email' })
      ),
      roles: RolesProperty(rolesArray, { ...usersConfig.roles }),
      ...usersConfig.properties,
    },
    ...usersConfig.args
  )

  const ModelPermissions = Model(
    MODEL_NAMES.ModelPermissions,
    {
      model: TextProperty(
        merge(
          {},
          modelPermissionsConfig.model,
          ormPropertyConfig({ required: true, unique: true })
        )
      ),
      read: RolesProperty(rolesArray),
      write: RolesProperty(rolesArray),
      delete: RolesProperty(rolesArray),
      ...modelPermissionsConfig.properties,
    },
    ...modelPermissionsConfig.args
  )

  return {
    ModelPermissions,
    Users,
  }
}

module.exports = models
