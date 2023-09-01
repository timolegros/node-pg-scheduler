export function CheckInitialized(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  // Store the original method
  const originalMethod = descriptor.value;

  // Rewrite the method descriptor with new functionality
  descriptor.value = function(this: any, ...args: any[]) {
    if (this.initialized) {
      return originalMethod.apply(this, args);
    } else {
      console.error(`Cannot execute ${propertyKey} as 'initialized' is false.`);
      // You can return a default value or throw an error, as per requirements
      return;  // or throw new Error(...)
    }
  };

  return descriptor;
}
