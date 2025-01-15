export interface CarParkFetchEnvironment {
  CARPARK_PUBLIC_BUCKET_URL?: string
}

export interface CarParkFetchContext {
  fetch: typeof globalThis.fetch
}
