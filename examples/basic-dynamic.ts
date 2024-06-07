import { Quill } from '@rpidanny/quill'

import { Odysseus } from '../src/odysseus'

const logger = new Quill({})
const odysseus = new Odysseus({ headless: false }, logger)

async function fetchContent(url: string, delay: number = 3_000) {
  try {
    const content = await odysseus.getContent(url, delay)
    console.log(content)
  } catch (error) {
    console.error('Failed to fetch content:', error)
  } finally {
    await odysseus.close()
  }
}

await fetchContent('https://www.tiktok.com/explore', 5_000)
