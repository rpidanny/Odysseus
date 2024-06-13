# Odysseus Class API Documentation

## Constructor

### `constructor(config: IConfig = {}, logger?: ILogger)`

Creates an instance of the `Odysseus` class.

#### Parameters:

- `config` (optional): An object conforming to the `IConfig` interface. Contains configuration options for the instance.
  - `headless` (boolean): Whether to run the browser in headless mode. Defaults to `true`.
  - `delay` (number): Delay time in milliseconds for waiting after the page loads. Defaults to `3000`.
  - `retry` (number): Number of retry attempts for fetching content. Defaults to `3`.
  - `waitOnCaptcha` (boolean): Weather to wait for user action when captcha is detected. Defaults to `true`.
  - `captchaDelay` (number): Delay time in milliseconds before polling page to detect captcha solve. Defaults to `10_000`.
- `logger` (optional): An object conforming to the `ILogger` interface. Used for logging debug and warning messages.

## Public Methods

### `async init(): Promise<void>`

Initializes Odysseus.

### `async close(): Promise<void>`

Closes the browser if it is open.

### `async getContent(url: string, delay?: number): Promise<string>`

Fetches the content of the specified URL with optional delay.

#### Parameters:

- `url` (string): The URL of the page to fetch content from.
- `delay` (optional, number): The delay time in milliseconds to wait after the page loads. If not specified, the default delay will be used.
- `waitOnCaptcha` (optional, boolean): Overrides the global `waitOnCaptcha`.

#### Returns:

- A promise that resolves to the content of the page as a string.
