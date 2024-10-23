import { Context, Environment, Middleware } from '@web3-storage/gateway-lib'

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment
>(m1: Middleware<C1, C0, E1>): Middleware<C1, C0, E1>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>
): Middleware<C2, C0, E1 & E2>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>
): Middleware<C3, C0, E1 & E2 & E3>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>
): Middleware<C4, C0, E1 & E2 & E3 & E4>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>
): Middleware<C5, C0, E1 & E2 & E3 & E4 & E5>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>
): Middleware<C6, C0, E1 & E2 & E3 & E4 & E5 & E6>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>
): Middleware<C7, C0, E1 & E2 & E3 & E4 & E5 & E6 & E7>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>
): Middleware<C8, C0, E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>
): Middleware<C9, C0, E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>
): Middleware<C10, C0, E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>
): Middleware<C11, C0, E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>
): Middleware<
  C12,
  C0,
  E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11 & E12
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>
): Middleware<
  C13,
  C0,
  E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11 & E12 & E13
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>
): Middleware<
  C14,
  C0,
  E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11 & E12 & E13 & E14
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>
): Middleware<
  C15,
  C0,
  E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 & E10 & E11 & E12 & E13 & E14 & E15
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>
): Middleware<
  C16,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>
): Middleware<
  C17,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>
): Middleware<
  C18,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>
): Middleware<
  C19,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>
): Middleware<
  C20,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>
): Middleware<
  C21,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>
): Middleware<
  C22,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>
): Middleware<
  C23,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>
): Middleware<
  C24,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>
): Middleware<
  C25,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>
): Middleware<
  C26,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>
): Middleware<
  C27,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>
): Middleware<
  C28,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>
): Middleware<
  C29,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>
): Middleware<
  C30,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>
): Middleware<
  C31,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>
): Middleware<
  C32,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>
): Middleware<
  C33,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>
): Middleware<
  C34,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>
): Middleware<
  C35,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment,
  C36 extends C35,
  E36 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>,
  m36: Middleware<C36, C35, E36>
): Middleware<
  C36,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35 &
    E36
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment,
  C36 extends C35,
  E36 extends Environment,
  C37 extends C36,
  E37 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>,
  m36: Middleware<C36, C35, E36>,
  m37: Middleware<C37, C36, E37>
): Middleware<
  C37,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35 &
    E36 &
    E37
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment,
  C36 extends C35,
  E36 extends Environment,
  C37 extends C36,
  E37 extends Environment,
  C38 extends C37,
  E38 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>,
  m36: Middleware<C36, C35, E36>,
  m37: Middleware<C37, C36, E37>,
  m38: Middleware<C38, C37, E38>
): Middleware<
  C38,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35 &
    E36 &
    E37 &
    E38
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment,
  C36 extends C35,
  E36 extends Environment,
  C37 extends C36,
  E37 extends Environment,
  C38 extends C37,
  E38 extends Environment,
  C39 extends C38,
  E39 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>,
  m36: Middleware<C36, C35, E36>,
  m37: Middleware<C37, C36, E37>,
  m38: Middleware<C38, C37, E38>,
  m39: Middleware<C39, C38, E39>
): Middleware<
  C39,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35 &
    E36 &
    E37 &
    E38 &
    E39
>

export declare function composeMiddleware<
  C0 extends Context,
  C1 extends C0,
  E1 extends Environment,
  C2 extends C1,
  E2 extends Environment,
  C3 extends C2,
  E3 extends Environment,
  C4 extends C3,
  E4 extends Environment,
  C5 extends C4,
  E5 extends Environment,
  C6 extends C5,
  E6 extends Environment,
  C7 extends C6,
  E7 extends Environment,
  C8 extends C7,
  E8 extends Environment,
  C9 extends C8,
  E9 extends Environment,
  C10 extends C9,
  E10 extends Environment,
  C11 extends C10,
  E11 extends Environment,
  C12 extends C11,
  E12 extends Environment,
  C13 extends C12,
  E13 extends Environment,
  C14 extends C13,
  E14 extends Environment,
  C15 extends C14,
  E15 extends Environment,
  C16 extends C15,
  E16 extends Environment,
  C17 extends C16,
  E17 extends Environment,
  C18 extends C17,
  E18 extends Environment,
  C19 extends C18,
  E19 extends Environment,
  C20 extends C19,
  E20 extends Environment,
  C21 extends C20,
  E21 extends Environment,
  C22 extends C21,
  E22 extends Environment,
  C23 extends C22,
  E23 extends Environment,
  C24 extends C23,
  E24 extends Environment,
  C25 extends C24,
  E25 extends Environment,
  C26 extends C25,
  E26 extends Environment,
  C27 extends C26,
  E27 extends Environment,
  C28 extends C27,
  E28 extends Environment,
  C29 extends C28,
  E29 extends Environment,
  C30 extends C29,
  E30 extends Environment,
  C31 extends C30,
  E31 extends Environment,
  C32 extends C31,
  E32 extends Environment,
  C33 extends C32,
  E33 extends Environment,
  C34 extends C33,
  E34 extends Environment,
  C35 extends C34,
  E35 extends Environment,
  C36 extends C35,
  E36 extends Environment,
  C37 extends C36,
  E37 extends Environment,
  C38 extends C37,
  E38 extends Environment,
  C39 extends C38,
  E39 extends Environment,
  C40 extends C39,
  E40 extends Environment
>(
  m1: Middleware<C1, C0, E1>,
  m2: Middleware<C2, C1, E2>,
  m3: Middleware<C3, C2, E3>,
  m4: Middleware<C4, C3, E4>,
  m5: Middleware<C5, C4, E5>,
  m6: Middleware<C6, C5, E6>,
  m7: Middleware<C7, C6, E7>,
  m8: Middleware<C8, C7, E8>,
  m9: Middleware<C9, C8, E9>,
  m10: Middleware<C10, C9, E10>,
  m11: Middleware<C11, C10, E11>,
  m12: Middleware<C12, C11, E12>,
  m13: Middleware<C13, C12, E13>,
  m14: Middleware<C14, C13, E14>,
  m15: Middleware<C15, C14, E15>,
  m16: Middleware<C16, C15, E16>,
  m17: Middleware<C17, C16, E17>,
  m18: Middleware<C18, C17, E18>,
  m19: Middleware<C19, C18, E19>,
  m20: Middleware<C20, C19, E20>,
  m21: Middleware<C21, C20, E21>,
  m22: Middleware<C22, C21, E22>,
  m23: Middleware<C23, C22, E23>,
  m24: Middleware<C24, C23, E24>,
  m25: Middleware<C25, C24, E25>,
  m26: Middleware<C26, C25, E26>,
  m27: Middleware<C27, C26, E27>,
  m28: Middleware<C28, C27, E28>,
  m29: Middleware<C29, C28, E29>,
  m30: Middleware<C30, C29, E30>,
  m31: Middleware<C31, C30, E31>,
  m32: Middleware<C32, C31, E32>,
  m33: Middleware<C33, C32, E33>,
  m34: Middleware<C34, C33, E34>,
  m35: Middleware<C35, C34, E35>,
  m36: Middleware<C36, C35, E36>,
  m37: Middleware<C37, C36, E37>,
  m38: Middleware<C38, C37, E38>,
  m39: Middleware<C39, C38, E39>,
  m40: Middleware<C40, C39, E40>
): Middleware<
  C40,
  C0,
  E1 &
    E2 &
    E3 &
    E4 &
    E5 &
    E6 &
    E7 &
    E8 &
    E9 &
    E10 &
    E11 &
    E12 &
    E13 &
    E14 &
    E15 &
    E16 &
    E17 &
    E18 &
    E19 &
    E20 &
    E21 &
    E22 &
    E23 &
    E24 &
    E25 &
    E26 &
    E27 &
    E28 &
    E29 &
    E30 &
    E31 &
    E32 &
    E33 &
    E34 &
    E35 &
    E36 &
    E37 &
    E38 &
    E39 &
    E40
>
