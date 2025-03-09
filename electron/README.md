# CodeV Electron App

## Code AI Assistant Feature

CodeV now includes a Code AI Assistant feature powered by Anthropic's Claude AI. This feature allows you to get detailed explanations of code snippets with a simple keyboard shortcut.

### Setup

1. Make sure you have an Anthropic API key. You can get one from [Anthropic's website](https://console.anthropic.com/).

2. Add your API key to the `.env` file in the `electron` directory:

   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```
   yarn
   ```

### Usage

1. Start the application:

   ```
   yarn start
   ```

2. Select the code you want to explain in any editor.

3. Press `Cmd+C` to copy the selected code to your clipboard.

4. Press `Ctrl+Cmd+E` to open the Code AI Assistant window, which will:

   - Create a floating window with the code from your clipboard
   - Generate an explanation using Anthropic Claude

5. The window will display your code and start generating an explanation.

> Note: For a smooth demonstration workflow, make sure to copy your code to the clipboard before triggering the Code AI Assistant with Ctrl+Cmd+E.

### How It Works

- The Code AI Assistant uses Claude API to generate explanations.
- The API request is made from the main Electron process (not the renderer) for security.
- Explanations are streamed in real-time for a better user experience.
- The UI is a semi-transparent floating window that can be closed when not needed.

### Features

- Syntax highlighting for various programming languages
- Streaming explanation that updates in real-time
- Automatic language detection
- Error handling

### Development Notes

- API keys are loaded from `.env` using dotenv
- The main API communication is in `AnthropicService.ts`
- The UI component is in `CodeAI Assistant.tsx`
