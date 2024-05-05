export const notInitializedErrorMsg = (className: string) =>
  `${className} is not initialized! Please call .init() first.`;

export function mustBeInitialized(initialized: boolean, className: string) {
  if (!initialized) {
    throw new Error(notInitializedErrorMsg(className));
  }
}

