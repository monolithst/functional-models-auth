import { MaybePromise } from './interfaces'

type MapFunc<T, TResult> = (item: T) => MaybePromise<TResult>

const asyncMap = async <T, TResult>(items: readonly T[], func: MapFunc<T, TResult>) : Promise<readonly TResult[]> => {
  const r : readonly TResult[] = await items.reduce(async (accP : Promise<readonly TResult[]>, item: T) => {
    const acc = await accP
    const item2 = await func(item)
    return acc.concat(item2)
  }, Promise.resolve([] as TResult[]))
  return r
}

export {
  asyncMap
}
