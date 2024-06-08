import { jest } from '@jest/globals'
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

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

  beforeEach(() => {
    odysseus = new Odysseus({ delay: 100, captchaDelay: 200 }, logger)
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await odysseus.close()
  })

  it('should fetch content from a URL', async () => {
    const content = await odysseus.getContent(url, 1_000)

    expect(content).toContain('Example Domain')
  })

  it('should fetch content from a dynamic web page', async () => {
    const filePath = path.join(__dirname, '../test', 'data', 'page1.html')
    const url = `file://${filePath}`

    const content = await odysseus.getContent(url, 1_000)

    expect(content).toContain('<div id="message">New Text</div>')
  })

  it('should log debug messages', async () => {
    await odysseus.getContent(url, 1_000)

    expect(debug).toHaveBeenCalledWith('Fetching content from https://example.com')
  })

  it('should log warning messages when failing to load page', async () => {
    await expect(odysseus.getContent('file:///invalid')).rejects.toThrow(Error)

    expect(warn).toHaveBeenCalledTimes(4)
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

      const getContentPromise = odysseus.getContent(url)

      await new Promise(resolve =>
        setTimeout(() => {
          expect(warn).toHaveBeenCalledWith('Captcha detected. Waiting for user input...')
          expect(getContentPromise).toBeInstanceOf(Promise)
          resolve('done')
        }, 2_000),
      )
    })

    it('should not wait for user input on captcha when waitOnCaptcha is false', async () => {
      const filePath = path.join(__dirname, '../test', 'data', 'cloudflare-captcha.html')
      const url = `file://${filePath}`

      const odysseus = new Odysseus({ delay: 100, waitOnCaptcha: false }, logger)

      const content = await odysseus.getContent(url, 1_000)

      odysseus.close()

      expect(content).toContain('https://challenges.cloudflare.com/cdn-cgi/challenge-platform')
    })
  })
})
