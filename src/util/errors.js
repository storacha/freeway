export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, cause?: any }} [options]
   */
  constructor (message, options = {}) {
    // @ts-ignore typescript does not understand Error
    super(message, options)
    this.status = options.status == null ? 500 : options.status
  }
}
