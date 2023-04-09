import { assert } from 'chai'
import { asyncMap } from '../../src/utils'


describe('/src/utils.ts', () => {
  describe('#asyncMap()', () => {
    it('should return [2,3,4] for 1,2,3', async () => {
      const input = [1,2,3]
      const actual = await asyncMap(input, x => x + 1)
      const expected = [2,3,4]
      assert.deepEqual(actual, expected)
    })
    it('should return [2,3,4] for 1,2,3 that are promises', async () => {
      const _get = (num: number): Promise<number> => {
        return new Promise(r => setTimeout(() => r(num), 0.001))
      }
      const input : Promise<number>[]= [_get(1),_get(2),_get(3)]
      const actual = await asyncMap(input, async (xP: Promise<number>) => {
        const x: number = await xP
        return x + 1
      })
      const expected = [2,3,4]
      assert.deepEqual(actual, expected)
    })
  })
})
