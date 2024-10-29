import { inspect } from 'util'

/** @import * as sinon from 'sinon' */

/**
 * Equivalent to {@link Overloaded} when {@link Fn} is overloaded, and to
 * {@link NotOverloaded} when {@link Fn} is not overloaded.
 *
 * @template {(...args: any) => any} Fn
 * @template Overloaded
 * @template NotOverloaded
 * @typedef {Fn extends {
 *     (a: infer Arg): infer Ret;
 *     (a: infer Arg2): infer Ret2;
 *   }
 *     ? [[Arg, Ret], [Arg2, Ret2]] extends [[Arg2, Ret2], [Arg, Ret]]
 *       ? NotOverloaded
 *       : Overloaded
 *     : never
 * } IfOverloaded
 */

/**
 * Makes concessions for overloaded functions. TypeScript cannot properly infer
 * from the type of overloaded functions, and instead infers from the last
 * overload. This can cause surprising results. {@link SinonStubOf} for an
 * overloaded function returns a stub typed with `unknown` arg and return types,
 * but also typed as the original function, with all its overloads intact. Sinon
 * calls will lack type information, but regular use of the function will be
 * properly typed.
 *
 * @template {(...args: any) => any} Fn
 * @typedef {IfOverloaded<Fn, sinon.SinonStub<unknown[], unknown>, sinon.SinonStub<Parameters<Fn>, ReturnType<Fn>>>} SinonStubOf
 */

/**
 * Creates a Sinon stub which has no default behavior and throws an error if
 * called without a specific behavior being set.
 *
 * @example
 * const toWord = stub('toWord')
 * toWord.withArgs(1).returns('one')
 * toWord.withArgs(2).returns('two')
 *
 * toWord(1) // => 'one'
 * toWord(2) // => 'two'
 * toWord(3) // => Error: Unexpected call to toWord with args: 3
 *
 * @template {(...args: any[]) => any} Fn
 * @param {sinon.SinonSandbox} sandbox
 * @param {string} name
 * @returns {Fn & SinonStubOf<Fn>}
 */
export const strictStub = (sandbox, name) => {
  const createdStub = /** @type {Fn & SinonStubOf<Fn>} */ (sandbox.stub())
  /** @type {(...args: unknown[]) => never} */
  const fakeImpl = (...args) => {
    throw new Error(`Unexpected call to ${name} with args: ${inspect(args)}`)
  }
  createdStub.callsFake(fakeImpl)

  // When the sandbox resets this stub, set it up again.
  const existingResetBehavior = createdStub.resetBehavior
  createdStub.resetBehavior = () => {
    existingResetBehavior.call(createdStub)
    createdStub.callsFake(fakeImpl)
  }
  return createdStub
}
