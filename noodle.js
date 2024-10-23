/**
 * Generate one overload.
 * @param {*} n Number of middleware arguments to accept.
 * @returns {string} The overload as TypeScript code.
 */
const overload = (n) => {
  const indexes = [...Array(n).keys()]
  return [
    'export declare function composeMiddleware<',
    'C0 extends Context,',
    ...indexes.map(
      (i) => `C${i + 1} extends C${i}, E${i + 1} extends Environment,`
    ),
    '>(',
    ...indexes.map(
      (i) => `m${i + 1}: Middleware<C${i + 1}, C${i}, E${i + 1}>,`
    ),
    `): Middleware<C${n}, C0, ${indexes.map((i) => `E${i + 1}`).join(' & ')}>`
  ].join('\n')
}

const imports =
  "import { Context, Environment, Middleware } from '@web3-storage/gateway-lib';"

// Print 40 overloads to stdout
process.stdout.write(
  [imports, ...[...Array(40).keys()].map((n) => overload(n + 1))].join('\n\n')
)
