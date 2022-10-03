export class HttpError extends Error {
  constructor (message, options = {}) {
    super(message, options)
    this.status = options.status == null ? 500 : options.status
  }
}
