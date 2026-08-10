import { registerDecorator, ValidationOptions } from 'class-validator';
import { isOnlyDateValidation } from '../constants/is-only-date-validation';

export function IsOnlyDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsOnlyDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: isOnlyDateValidation.message,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          const regex = isOnlyDateValidation.regex;
          return typeof value === 'string' && regex.test(value);
        },
      },
    });
  };
}
