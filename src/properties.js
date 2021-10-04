const merge = require('lodash/merge')
const { ArrayProperty, TextProperty } = require('functional-models')
const { MIN_NAME_LENGTH, MAX_NAME_LENGTH, DEFAULT_ROLES } = require('./constants')

const NameProperty = (config = {}) => TextProperty(
  merge(config, {
    minLength: MIN_NAME_LENGTH,
    maxLength: MAX_NAME_LENGTH,
  })
)

const RolesProperty = (rolesChoices, config={ defaultValue: []}) => ArrayProperty({
  ...config,
  choices: rolesChoices
})

module.exports = {
  NameProperty,
  RolesProperty,
}