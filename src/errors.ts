/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
class PermissionError extends Error {
  public modelName: string
  public functionName : string

  constructor(modelName: string, functionName: string) {
    super('User does not have access to this function')
    this.name = 'PermissionError'
    this.modelName = modelName
    this.functionName = functionName
  }
}

class CouldNotFindOwnerError extends Error {
  public modelName: string
  public primaryKey: string

  constructor(modelName: string, primaryKey: string) {
    super(`Could not find owner for modelType ${modelName} with id ${primaryKey}`)
    this.modelName = modelName,
    this.primaryKey = primaryKey
  }
}

class SoftAuthError extends Error {
  constructor() {
    super('SoftAuthError')
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
  }
}


class NotOwnerOfModelError extends Error {
  public modelName: string
  public ownerId: string
  public modelInstanceId: string

  constructor(modelName: string, ownerId: string, modelInstanceId: string) {
    super(`${ownerId} is not the owner of ${modelName}:${modelInstanceId}`)
    this.modelName = modelName,
    this.ownerId = ownerId
    this.modelInstanceId = modelInstanceId
  }
}
/* eslint-enable functional/no-this-expression */
/* eslint-enable functional/no-class */

export {
  PermissionError,
  CouldNotFindOwnerError,
  NotOwnerOfModelError,
  AuthError,
  SoftAuthError,
}
