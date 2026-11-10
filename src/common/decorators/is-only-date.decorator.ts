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
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          const match = isOnlyDateValidation.regex.exec(value);
          if (!match) {
            return false;
          }

          if (Number(value.slice(0, 4)) < 1) {
            return false;
          }

          const date = new Date(`${value}T00:00:00.000Z`);
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
          );
        },
      },
    });
  };
}
