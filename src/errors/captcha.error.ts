export class CaptchaError extends Error {
  constructor() {
    super('Captcha error')
    this.name = 'CaptchaError'
  }
}
