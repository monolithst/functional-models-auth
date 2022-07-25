import { merge } from 'lodash'
import { TextProperty, ArrayProperty } from 'functional-models'
import { PropertyConfig } from 'functional-models/interfaces'
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, PropertyTypes } from './constants'

const NameProperty = (config = {}, additionalMetadata={}) =>
  TextProperty(
    merge(config, {
      minLength: MIN_NAME_LENGTH,
      maxLength: MAX_NAME_LENGTH,
    }),
    additionalMetadata
  )

const PasswordProperty = (config: PropertyConfig<any>={}, additionalMetadata={}) => TextProperty(
  merge(config, {
    type: PropertyTypes.PasswordProperty,
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
  }), additionalMetadata
)

const RolesProperty = (rolesChoices: string[], config : PropertyConfig<any>= { defaultValue: [] }, additionalMetadata={}) =>
  ArrayProperty<string>({
    ...config,
    choices: rolesChoices,
  }, additionalMetadata)

export {
  NameProperty,
  RolesProperty,
  PasswordProperty,
}
