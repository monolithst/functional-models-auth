const { getObjToArray } = require('./utils')
const MAX_NAME_LENGTH = 50
const MIN_NAME_LENGTH = 50

const DEFAULT_ROLES = getObjToArray([
  'Viewer',
  'Contributor',
  'SeniorContributor',
  'Admin',
])

const MODEL_NAMES = getObjToArray([
  'Users',
  'ModelPermissions',
])

const DEFAULT_MODEL_PERMISSIONS = {
  read: [DEFAULT_ROLES.SeniorContributor, DEFAULT_ROLES.Contributor, DEFAULT_ROLES.Viewer],
  write: [DEFAULT_ROLES.SeniorContributor, DEFAULT_ROLES.Contributor],
  delete: [DEFAULT_ROLES.SeniorContributor],
}

module.exports = {
  MODEL_NAMES,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  DEFAULT_ROLES,
  DEFAULT_MODEL_PERMISSIONS
}