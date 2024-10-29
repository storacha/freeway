import { expect } from 'chai'

/**
 * Asserts that a value is an instance of a class, in a way that TypeScript can
 * understand too. Just a simple wrapper around Chai's `instanceOf`, typed as an
 * assertion function.
 *
 * @template {Function} Class
 * @param {unknown} value
 * @param {Class} aClass
 * @returns {asserts value is InstanceType<Class>}
 */
export const expectToBeInstanceOf = (value, aClass) => {
  expect(value).to.be.instanceOf(aClass)
}
