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
/* eslint-enable functional/no-this-expression */
/* eslint-enable functional/no-class */

export {
  PermissionError,
}
