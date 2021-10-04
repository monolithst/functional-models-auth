const { ormQuery } = require('functional-models-orm')
const { DEFAULT_MODEL_PERMISSIONS, DEFAULT_ROLES } = require('./constants')
const { PermissionError } = require('./errors')

const authWrappedDatastoreProvider = ({
  getUserObj,
  getModelPermissionsModel,
  datastoreProvider,
  defaultPermissions = DEFAULT_MODEL_PERMISSIONS, // this MUST match your ModelPermissions structure (outside of the model property).
  adminRole = DEFAULT_ROLES.Admin,
}) => {
  const _getOrCreatePermissions = async model => {
    const modelName = model.getName()
    const query = ormQuery
      .ormQueryBuilder()
      .property('model', modelName)
      .compile()
    const ModelPermissions = await getModelPermissionsModel()
    const permissions = (await ModelPermissions.search(query)).instances[0]
    if (!permissions) {
      const instance = ModelPermissions.create({
        model: modelName,
        ...defaultPermissions,
      })
      return instance.functions.save()
    }
    return permissions
  }

  const _checkPermissionAndError = async (
    model,
    functionName,
    permissionMethod
  ) => {
    const user = await getUserObj()
    if (!user) {
      throw new Error(`No user found!`)
    }
    if (user.roles.includes(adminRole)) {
      return undefined
    }
    const permissions = await _getOrCreatePermissions(model)
    const roles = await permissionMethod(permissions)
    if (!user.roles.find(role => roles.includes(role))) {
      throw new PermissionError(model.getName(), functionName)
    }
    return undefined
  }

  const deleteObj = instance => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError(
        instance.meta.getModel(),
        'delete',
        permissions => permissions.getDelete()
      )
      return datastoreProvider.delete(instance)
    })
  }

  const search = (model, query) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError(model, 'read', permissions =>
        permissions.getRead()
      )
      return datastoreProvider.search(model, query)
    })
  }

  const retrieve = (model, id) => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError(model, 'read', permissions =>
        permissions.getRead()
      )
      return datastoreProvider.retrieve(model, id)
    })
  }

  const save = instance => {
    return Promise.resolve().then(async () => {
      await _checkPermissionAndError(
        instance.meta.getModel(),
        'write',
        permissions => permissions.getWrite()
      )
      return datastoreProvider.save(instance)
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

module.exports = {
  authWrappedDatastoreProvider,
}
