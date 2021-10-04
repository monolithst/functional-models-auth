/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
class PermissionError extends Error {
  constructor(modelName, functionName) {
    super('User does not have access to this function')
    this.name = 'PermissionError'
    this.modelName = modelName
    this.functionName = functionName
  }
}
/* eslint-enable functional/no-this-expression */
/* eslint-enable functional/no-class */

module.exports = {
  PermissionError,
}
