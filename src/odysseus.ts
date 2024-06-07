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

  private headless: boolean
  private delay: number
  private retry: number

  constructor(
    private readonly config: IConfig = {},
    private readonly logger?: ILogger,
  ) {
    this.headless = this.config.headless ?? this.defaultHeadless
    this.delay = this.config.delay ?? this.defaultDelay
    this.retry = this.config.retry ?? this.defaultRetry
  }

  private async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless })
      this.context = await this.browser.newContext()
      this.page = await this.context.newPage()
    }
  }

  private async getPageContent(url: string, delay?: number): Promise<string> {
    await this.page.goto(url)
    await this.page.waitForLoadState('domcontentloaded')
    // await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(delay || this.delay)

    return await this.page.content()
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }

  public async getContent(url: string, delay?: number): Promise<string> {
    if (!this.page) {
      await this.init()
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
