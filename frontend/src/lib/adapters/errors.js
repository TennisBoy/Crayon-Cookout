export class NotImplementedError extends Error {
  constructor(method) {
    super(`${method} needs a backend — no auth provider is configured.`)
    this.name = 'NotImplementedError'
    this.method = method
  }
}
