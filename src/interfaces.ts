export interface ILogger {
  debug(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface IConfig {
  headless?: boolean
  delay?: number
  retry?: number
  waitOnCaptcha?: boolean
  captchaDelay?: number
  throwOnCaptcha?: boolean
  initHtml?: string
}

export interface IGetContentOptions {
  delay?: number
  waitOnCaptcha?: boolean
  throwOnCaptcha?: boolean
}
