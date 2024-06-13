import pRetry from 'p-retry'
import { Browser, BrowserContext, chromium, Page } from 'playwright'

import { IConfig, ILogger } from './interfaces.js'

export class Odysseus {
  private browser!: Browser
  private context!: BrowserContext
  private page!: Page

  private readonly defaultHeadless = true
  private readonly defaultDelay = 3_000
  private readonly defaultRetry = 3
  private readonly defaultWaitOnCaptcha = true
  private readonly defaultCaptchaDelay = 10_000

  private captchaMarkers: string[] = [
    '<form method="get" id="gs_captcha_f">', // Google
    'https://challenges.cloudflare.com/cdn-cgi/challenge-platform', // Cloudflare
  ]

  private headless: boolean
  private delay: number
  private retry: number
  private waitOnCaptcha: boolean
  private captchaDelay: number

  constructor(
    private readonly config: IConfig = {},
    private readonly logger?: ILogger,
  ) {
    this.headless = this.config.headless ?? this.defaultHeadless
    this.delay = this.config.delay ?? this.defaultDelay
    this.retry = this.config.retry ?? this.defaultRetry
    this.waitOnCaptcha = this.config.waitOnCaptcha ?? this.defaultWaitOnCaptcha
    this.captchaDelay = this.config.captchaDelay ?? this.defaultCaptchaDelay
  }

  public async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.headless })
    this.context = await this.browser.newContext()
    this.page = await this.context.newPage()
  }

  private async getPageContent(url: string, delay?: number): Promise<string> {
    const page = await this.context.newPage()

    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')
    // await this.page.waitForLoadState('networkidle')
    await page.waitForTimeout(delay || this.delay)

    let content = await page.content()

    if (this.waitOnCaptcha && this.isCaptcha(content)) {
      this.logger?.warn('Captcha detected. Waiting for user input...')

      do {
        await this.page.waitForTimeout(this.captchaDelay)
        content = await this.page.content()
      } while (this.isCaptcha(content))
    }

    await page.close()

    return content
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }

  public isCaptcha(content: string): boolean {
    return this.captchaMarkers.some(marker => content.includes(marker))
  }

  public async getContent(url: string, delay?: number): Promise<string> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.')
    }

    this.logger?.debug(`Fetching content from ${url}`)

    return pRetry(this.getPageContent.bind(this, url, delay), {
      retries: this.retry,
      onFailedAttempt: error => {
        this.logger?.warn(
          `Attempt ${error.attemptNumber} failed with "${error.message}". There are ${error.retriesLeft} retries left.`,
        )
      },
    })
  }
}
