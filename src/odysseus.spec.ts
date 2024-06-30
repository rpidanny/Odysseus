import { jest } from '@jest/globals'
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import { CaptchaError } from './errors/captcha.error'
import { Odysseus } from './odysseus'

describe('Odysseus', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const url = 'https://example.com'
  const debug = jest.fn()
  const warn = jest.fn()
  const error = jest.fn()

  const logger = {
    debug,
    warn,
    error,
  }
  let odysseus: Odysseus

  beforeEach(async () => {
    odysseus = new Odysseus(
      {
        delay: 100,
        captchaDelay: 200,
        headless: true,
        waitOnCaptcha: false,
        throwOnCaptcha: false,
      },
      logger,
    )

    await odysseus.init()
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    await odysseus.close()
  })

  describe('getContent', () => {
    it('should fetch content from a URL', async () => {
      const content = await odysseus.getContent(url, { delay: 1_000 })

      expect(content).toContain('Example Domain')
    })

    it('should render init HTML', async () => {
      const content = await odysseus.getMainPageContent()

      expect(content).toContain('Odysseus')
    })

    it('should fetch contents from multiple calls concurrently', async () => {
      const contents = await Promise.all([
        odysseus.getContent(url, { delay: 1_000 }),
        odysseus.getContent('https://www.iana.org/help/example-domains', { delay: 1_000 }),
        odysseus.getContent(url, { delay: 1_000 }),
        odysseus.getContent('https://www.iana.org/help/example-domains', { delay: 1_000 }),
      ])

      expect(contents[0]).toContain('This domain is for use in illustrative examples in documents')
      expect(contents[1]).toContain('Further Reading')
      expect(contents[2]).toContain('This domain is for use in illustrative examples in documents')
      expect(contents[3]).toContain('Further Reading')
    })

    it('should throw error when getContent is called without init', async () => {
      const odysseus = new Odysseus({ headless: true }, logger)
      await expect(odysseus.getContent(url, { delay: 1_000 })).rejects.toThrow(Error)
    })

    it('should throw error when browser closed', async () => {
      const content = await odysseus.getContent(url, { delay: 1_000 })
      expect(content).toContain('Example Domain')

      await odysseus.close()

      await expect(odysseus.getContent(url, { delay: 1_000 })).rejects.toThrow(Error)
    })

    it('should fetch content from a dynamic web page', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'page1.html')
      const url = `file://${filePath}`

      const content = await odysseus.getContent(url, { delay: 1_000 })

      expect(content).toContain('<div id="message">New Text</div>')
    })

    it('should log debug messages', async () => {
      await odysseus.getContent(url, { delay: 1_000 })

      expect(debug).toHaveBeenCalledWith('Fetching content from https://example.com')
    })

    it('should log warning messages when failing to load page', async () => {
      await expect(odysseus.getContent('file:///invalid')).rejects.toThrow(Error)

      expect(warn).toHaveBeenCalledTimes(4)
    })
  })

  describe('getTextContent', () => {
    it('should only return text without any html, css, js', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'page1.html')
      const url = `file://${filePath}`

      const content = await odysseus.getTextContent(url, { delay: 1_000 })

      expect(content).toEqual('WELCOME TO MY PAGE\n\nNew Text')
    })
  })

  describe('captcha', () => {
    describe('isCaptcha', () => {
      it.each`
        page
        ${'cloudflare-captcha.html'}
        ${'google-captcha.html'}
      `('should return true for $page', async ({ page }) => {
        const filePath = path.join(__dirname, '../test', 'data', page)
        const content = await fs.readFile(filePath, 'utf-8')

        expect(odysseus.isCaptcha(content)).toBe(true)
      })

      it('should return false if the content does not contain a captcha marker', async () => {
        const filePath = path.join(__dirname, '../test', 'data', 'page1.html')
        const content = await fs.readFile(filePath, 'utf-8')

        expect(odysseus.isCaptcha(content)).toBe(false)
      })
    })

    it('should wait for user input when a captcha is detected', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
      const url = `file://${filePath}`

      const odysseus = new Odysseus({ delay: 100, waitOnCaptcha: true }, logger)
      await odysseus.init()

      const getContentPromise = odysseus.getContent(url)

      await new Promise(resolve =>
        setTimeout(() => {
          expect(warn).toHaveBeenCalledWith('Captcha detected. Waiting for user input...')
          expect(getContentPromise).toBeInstanceOf(Promise)
          resolve('done')
        }, 2_000),
      )
    })

    it('should wait for user input when a captcha is detected when waitOnCaptcha is true on getContent', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
      const url = `file://${filePath}`

      const getContentPromise = odysseus.getContent(url, { delay: 1_000, waitOnCaptcha: true })

      await new Promise(resolve =>
        setTimeout(() => {
          expect(warn).toHaveBeenCalledWith('Captcha detected. Waiting for user input...')
          expect(getContentPromise).toBeInstanceOf(Promise)
          resolve('done')
        }, 2_000),
      )
    })

    it('should not wait for user input on captcha when waitOnCaptcha is false on constructor', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
      const url = `file://${filePath}`

      const content = await odysseus.getContent(url, { delay: 1_000, waitOnCaptcha: false })

      await odysseus.close()

      expect(content).toContain('https://challenges.cloudflare.com/cdn-cgi/challenge-platform')
    })

    it('should not wait for user input on captcha when waitOnCaptcha false on getContent', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
      const url = `file://${filePath}`

      const odysseus = new Odysseus({ delay: 100, waitOnCaptcha: true }, logger)
      await odysseus.init()

      const content = await odysseus.getContent(url, { delay: 1_000, waitOnCaptcha: false })

      await odysseus.close()

      expect(content).toContain('https://challenges.cloudflare.com/cdn-cgi/challenge-platform')
    })

    describe('throwOnCaptcha', () => {
      it('should throw error on captcha when throwOnCaptcha is true on constructor', async () => {
        const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
        const url = `file://${filePath}`

        const odysseus = new Odysseus(
          { delay: 100, throwOnCaptcha: true, waitOnCaptcha: false },
          logger,
        )
        await odysseus.init()

        await expect(odysseus.getContent(url, { delay: 100 })).rejects.toThrow(CaptchaError)

        await odysseus.close()
      })

      it('should throw error on captcha when throwOnCaptcha is true on getContent', async () => {
        const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
        const url = `file://${filePath}`

        const odysseus = new Odysseus(
          { delay: 100, throwOnCaptcha: false, waitOnCaptcha: false },
          { debug: console.log, warn: console.log, error: console.log },
        )
        await odysseus.init()

        await expect(
          odysseus.getContent(url, {
            delay: 100,
            throwOnCaptcha: true,
          }),
        ).rejects.toThrow(CaptchaError)

        await odysseus.close()
      })
    })
  })
})
