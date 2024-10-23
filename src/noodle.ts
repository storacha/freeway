// import { Context, Environment, Middleware } from '@web3-storage/gateway-lib';

// declare function composeMiddleware<
//   B0 extends Context,
//   C1 extends B0,
//   E1 extends Environment
// >(m1: Middleware<C1, B0, E1>): Middleware<C1, B0, E1>;

// declare function composeMiddleware<
//   B0 extends Context,
//   C1 extends B0,
//   E1 extends Environment,
//   C2 extends C1,
//   E2 extends Environment
// >(
//   m1: Middleware<C1, B0, E1>,
//   m2: Middleware<C2, C1, E2>
// ): Middleware<C2, B0, E1 & E2>;

// const middleware1: Middleware<
//   Context & { a: string },
//   Context,
//   Environment & { THING1: string }
// > = (handler) => {
//   return async (request, env, ctx) => {
//     return handler(request, env, { ...ctx, a: 'a' });
//   };
// };

// const middleware2: Middleware<
//   Context & { a: string; b: string },
//   Context & { a: string },
//   Environment & { THING2: string }
// > = (handler) => {
//   return async (request, env, ctx) => {
//     return handler(request, env, { ...ctx, b: 'b' });
//   };
// };

// // const composed = composeMiddleware(middleware1, middleware2)
// //    ^?

// // const overload = (n: number): string => {
// //   const indexes = [...Array(n).keys()];
// //   return [
// //     `declare function composeMiddleware<`,
// //     `C0 extends Context,`,
// //     ...indexes.map(
// //       (i) => `C${i + 1} extends C${i}, E${i + 1} extends Environment,`
// //     ),
// //     `>(`,
// //     ...indexes.map(
// //       (i) => `m${i + 1}: Middleware<C${i + 1}, C${i}, E${i + 1}>,`
// //     ),
// //     `): Middleware<C2, C0, ${indexes.map((i) => `E${i + 1}`).join(' & ')}>`,
// //   ].join('\n');
// // };

// // [...Array(40).keys()].map((n) => overload(n + 1)).join('\n');

// // {
// //   {
// //     [...Array(40).keys()];
// //   }
// // }
// // `»
// //  [
// //     0,  1,  2,  3,  4,  5,  6,  7,  8,  9,
// //    10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
// //    20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
// //    30, 31, 32, 33, 34, 35, 36, 37, 38, 39
// //  ]
// //  «`;

import {
  withContext,
  withCorsHeaders,
  withContentDispositionHeader,
  withErrorHandler,
  createWithHttpMethod,
  withCdnCache,
  withParsedIpfsUrl,
  withFixedLengthStream,
} from '@web3-storage/gateway-lib/middleware'

import {
  Context,
  Environment,
  Handler,
  IpfsUrlContext,
} from '@web3-storage/gateway-lib'

import {
  withContentClaimsDagula,
  withVersionHeader,
  withAuthToken,
  withCarBlockHandler,
  withRateLimit,
} from './middleware/index.js'

import { composeMiddleware } from './composeMiddleware.js'
import {
  RateLimitContext,
  RateLimitEnvironment,
} from './middleware/withRateLimit.types.js'

composeMiddleware<
  Context,
  IpfsUrlContext,
  Environment,
  RateLimitContext,
  Environment,
  RateLimitContext,
  RateLimitEnvironment
>(
  //
  withParsedIpfsUrl,
  withAuthToken,
  withRateLimit
)

composeMiddleware(
  //
  withParsedIpfsUrl,
  withAuthToken,
  withRateLimit
)

composeMiddleware<
  Context,
  IpfsUrlContext,
  Environment,
  IpfsUrlContext,
  Environment,
  RateLimitContext,
  RateLimitEnvironment
>(
  //
  withParsedIpfsUrl,
  withAuthToken,
  withRateLimit
)

export interface Middleware2<
  ContextExtension,
  BaseContext extends Context = Context,
  E extends Environment = Environment
> {
  (h: Handler<Context & ContextExtension, E>): Handler<BaseContext, E>
}

export declare function composeMiddleware2<
  BC extends Context,
  CX1,
  E1 extends Environment,
  CX2,
  E2 extends Environment,
  CX3,
  E3 extends Environment
>(
  m1: Middleware2<CX1, BC, E1>,
  m2: Middleware2<CX2, BC & CX1, E2>,
  m3: Middleware2<CX3, BC & CX1 & CX2, E3>
): Middleware2<CX1 & CX3, BC, E1 & E2 & E3>

declare const withParsedIpfsUrl2: Middleware2<IpfsUrlContext>
declare const withAuthToken2: Middleware2<{ authToken: string | null }>
declare const withRateLimit2: Middleware2<
  {},
  RateLimitContext,
  RateLimitEnvironment
>

const c = composeMiddleware2(
  //
  withParsedIpfsUrl2,
  withAuthToken2,
  withRateLimit2
)
