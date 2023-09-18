export const notInitializedError = (methodName: string) => `Cannot execute ${methodName} as 'initialized' is false.`

/* eslint-disable */
export function CheckInitialized(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  // Store the original method
  const originalMethod = descriptor.value;

  // Rewrite the method descriptor with new functionality
  descriptor.value = function (this: any, ...args: any[]) {
    if (this.initialized) {
      return originalMethod.apply(this, args);
    } else {
      throw new Error(notInitializedError(propertyKey));
    }
  };

  return descriptor;
}
/* eslint-enable */

