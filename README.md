# Odysseus

Odysseus is a web scraping library built on top of Playwright, designed to handle dynamic web pages and CAPTCHA challenges with ease.

> Odysseus was renowned for his cunning and resourcefulness. This library employs cunning strategies to navigate through dynamic web content and extract desired information.

## Highlights

- **Dynamic Content Handling**: Efficiently scrapes web pages with dynamic content rendered by JavaScript.
- **Retry Mechanism**: Automatically retries fetching content on failure, with configurable retry attempts.
- **Configurable Delays**: Allows setting custom delays for waiting after page loads.
- **Logging Support**: Integrates with custom logging mechanisms for debugging and monitoring.
- **CAPTCHA Handling**: Supports human-in-the-loop [CAPTCHA](https://en.wikipedia.org/wiki/CAPTCHA) handling for uninterrupted scraping.

## Install

```sh
$ npm i @rpidanny/odysseys
```

## Usage

Here's a basic example to get you started:

```ts
import { Quill } from '@rpidanny/quill'
import { Odysseus } from '@rpidanny/odysseus'

// Configuration object
const config: IConfig = {
  headless: false, // Runs browser in non-headless mode
  delay: 5000, // Wait for 5 seconds after page loads
  retry: 5, // Retry fetching content up to 5 times
}

// Optional logger
const logger = new Quill()

// Create an instance of Odysseus
const odysseus = new Odysseus(config, logger)

async function fetchContent(url: string, delay: number = 3_000) {
  try {
    const content = await odysseus.getContent(url, delay)
    console.log(content)
  } catch (error) {
    console.error('Failed to fetch content:', error)
  } finally {
    // Close the browser
    await odysseus.close()
  }
}

await fetchContent('https://www.tiktok.com/explore', 6_000)
```

## API Documentation

The API Docs can be found [here](docs/API.md).

## License

This project is licensed under the MIT License.

---

Feel free to contribute to the project or report issues on the [GitHub repository](https://github.com/rpidanny/odysseus). Happy scraping!
