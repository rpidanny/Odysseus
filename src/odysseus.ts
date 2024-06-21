import { convert } from 'html-to-text'
import pRetry from 'p-retry'
import { Browser, BrowserContext, chromium, Page } from 'playwright'

import { IConfig, ILogger } from './interfaces.js'

export class Odysseus {
  private browser!: Browser
  private context!: BrowserContext
  private mainPage!: Page

  private readonly defaultHeadless = true
  private readonly defaultDelay = 3_000
  private readonly defaultRetry = 3
  private readonly defaultWaitOnCaptcha = true
  private readonly defaultCaptchaDelay = 10_000

  private captchaMarkers: string[] = [
    '<form method="get" id="gs_captcha_f">', // Google
    'https://challenges.cloudflare.com/cdn-cgi/challenge-platform', // Cloudflare
    'Performance & security by Cloudflare', // Cloudflare
  ]
  private defaultInitHtml = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300&display=swap');

body {
    margin: 0;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f0f0f0;
    font-family: 'Montserrat', sans-serif;
}

.centered {
    font-size: 3rem;
    color: #333;
}

</style><div class="centered">Odysseus </div>`

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
    this.mainPage = await this.context.newPage()
    await this.mainPage.setContent(this.config.initHtml || this.defaultInitHtml)
  }

  /*
    This method is used to get the content of the main page.
    It is used to get the content of the page that is loaded when the browser is initialized.
  */
  public async getMainPageContent(): Promise<string> {
    return this.mainPage.content()
  }

  private async getPageContent(
    url: string,
    delay: number,
    waitOnCaptcha: boolean,
  ): Promise<string> {
    const page = await this.context.newPage()

    await page.goto(url)
    await page.waitForLoadState('domcontentloaded')
    // await page.waitForLoadState('networkidle')
    await page.waitForTimeout(delay)

    let content = await page.content()

    if (waitOnCaptcha && this.isCaptcha(content)) {
      this.logger?.warn('Captcha detected. Waiting for user input...')

      do {
        await page.waitForTimeout(this.captchaDelay)
        content = await page.content()
      } while (this.isCaptcha(content))

      // wait for the page to load after the captcha
      await page.waitForTimeout(this.captchaDelay)
      content = await page.content()
    }

    await page.close()

    return content
  }

  protected stripHtmlTags(html: string): string {
    const text = convert(html, {
      wordwrap: 130,
      // wordwrap: false, // Set to false to avoid wrapping text
    })
    return text.trim()
  }

  public async getTextContent(
    url: string,
    delay?: number,
    waitOnCaptcha?: boolean,
  ): Promise<string> {
    const html = await this.getContent(url, delay, waitOnCaptcha)
    return this.stripHtmlTags(html)
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }

  public isCaptcha(content: string): boolean {
    return this.captchaMarkers.some(marker => content.includes(marker))
  }

  public async getContent(url: string, delay?: number, waitOnCaptcha?: boolean): Promise<string> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.')
    }

    this.logger?.debug(`Fetching content from ${url}`)

    return pRetry(
      this.getPageContent.bind(this, url, delay || this.delay, waitOnCaptcha ?? this.waitOnCaptcha),
      {
        retries: this.retry,
        onFailedAttempt: error => {
          this.logger?.warn(
            `Attempt ${error.attemptNumber} failed with "${error.message}". There are ${error.retriesLeft} retries left.`,
          )
        },
      },
    )
  }
}
