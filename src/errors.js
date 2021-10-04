
class PermissionError extends Error {
  constructor(modelName, functionName) {
    super('User does not have access to this function')
    this.name = "PermissionError"
    this.modelName = modelName
    this.functionName = functionName
  }
}

module.exports = {
  PermissionError,
}