const MAX_NAME_LENGTH = 50
const MIN_NAME_LENGTH = 3
const MAX_PASSWORD_LENGTH = 100
const MIN_PASSWORD_LENGTH = 8

enum DefaultRoles {
  Viewer='Viewer',
  Contributor='Contributor',
  SeniorContributor='SeniorContributor',
  Admin='Admin',
}

enum ModelNames {
  Users = 'Users',
  ModelRoles = 'ModelRoles',
}

const DEFAULT_MODEL_ROLES = {
  read: [
    DefaultRoles.SeniorContributor,
    DefaultRoles.Contributor,
    DefaultRoles.Viewer,
  ],
  write: [DefaultRoles.SeniorContributor, DefaultRoles.Contributor],
  delete: [DefaultRoles.SeniorContributor],
}

enum PropertyTypes {
  PasswordProperty = 'PasswordProperty',
}

export {
  ModelNames,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  DefaultRoles,
  DEFAULT_MODEL_ROLES,
  PropertyTypes,
}
