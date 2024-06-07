import { jest } from '@jest/globals'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import { Odysseus } from './odysseus'

describe('Odysseus', () => {
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
    odysseus = new Odysseus({ delay: 100 }, logger)
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await odysseus.close()
  })

  it('should fetch content from a URL', async () => {
    const content = await odysseus.getContent(url)

    expect(content).toContain('Example Domain')
  })

  it('should fetch content from a dynamic web page', async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url))

    const filePath = path.join(__dirname, '../test', 'data', 'page1.html')
    const url = `file://${filePath}`

    const content = await odysseus.getContent(url, 2_000)

    expect(content).toContain('<div id="message">New Text</div>')
  })

  it('should log debug messages', async () => {
    await odysseus.getContent(url)

    expect(debug).toHaveBeenCalledWith('Fetching content from https://example.com')
  })

  it('should log warning messages when failing to load page', async () => {
    await expect(odysseus.getContent('file:///invalid')).rejects.toThrow(Error)

    expect(warn).toHaveBeenCalledTimes(4)
  })
})
