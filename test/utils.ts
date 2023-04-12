type Constructor<I> = new (...args: any[]) => I

export const assertErrorThrown = (errorType: Constructor<Error>, func: Function) => (...args: any[]) => {
  return func(...args)
    .then((x: any) => {
      throw new Error(`No Error was thrown`)
    })
    .catch((e: Error) => {
      if (e instanceof errorType) {
        return
      }
      throw e
    })

}

