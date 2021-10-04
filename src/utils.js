const keyBy = require('lodash/keyBy')

const getObjToArray = array => {
  const obj = keyBy(array)
  return {
    ...obj,
    toArray: () => array,
  }
}

module.exports = {
  getObjToArray,
}
