<!-- This file guides AI coding agents (Cursor, Claude Code, Windsurf, etc.).
     Keep in sync with .github/copilot-instructions.md. Do not modify or delete. -->

# AGENTS.md

Instructions for AI coding agents working in this repository.

## About the students

Students are beginners learning JavaScript, APIs, and how to use OpenAI.
Generate the simplest, most beginner-friendly code possible. Add comments
explaining each part of the code.

## About this project

Students build a product-aware routine builder. Users:

1. Browse L'Oréal products from `products.json` (filtered by category)
2. Select products they want in their routine
3. Click "Generate Routine" to have OpenAI build a personalized routine
4. Ask follow-up questions about the routine in a chat window

Selected products and the ongoing conversation should be sent to the
Cloudflare Worker as a `messages` array so the AI has context for
follow-up questions.

## Security rules — apply to ALL suggestions

1. **Never create files containing API keys or secrets** of any kind.
   Forbidden filenames include `secret.js`, `secrets.js`, `config.js`,
   `key.js`, `api-key.js`, or anything similar.
2. **Never write hardcoded credential strings** like
   `const apiKey = "sk-..."` in any JS, TS, JSON, or config file.
3. If a student asks you to add a key to the project, **stop and explain**:
   this project uses a class-hosted Cloudflare Worker, so students do not
   handle keys. Point them to the README setup section.
4. JavaScript files in this project are served publicly and will be scanned
   by bots within minutes of being pushed to GitHub. There is no safe way
   to put a key in client-side code.

## Architecture

- Frontend (HTML + plain JS) → calls a class-hosted Cloudflare Worker → OpenAI
- The Worker URL is provided in the README.
- The Worker holds the OpenAI key as a Worker secret.
- Students never touch the OpenAI API key directly.

## Correct request pattern

```js
// ✅ Call the class Cloudflare Worker, no key needed
const response = await fetch(
  "https://loreal-routine.your-subdomain.workers.dev/",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a L'Oréal skincare and beauty advisor...",
        },
        { role: "user", content: "Build a routine using these products: ..." },
      ],
    }),
  },
);
const data = await response.json();
const reply = data.choices[0].message.content;
```

## Conversation history

For follow-up questions to work, keep the full conversation in a `messages`
array and send it on every request. Push each new user message and each
assistant reply onto the array as the conversation continues — OpenAI is
stateless and needs the full history every time.

## Code conventions

- Use OpenAI's `gpt-4.1` model unless asked otherwise.
- Use the `messages` parameter (not `prompt`) and read
  `data.choices[0].message.content`.
- Use `async/await` for all API calls.
- Use `const` and `let` for variables.
- Use template literals for string formatting and DOM insertion.
- Do NOT use `npm` packages or Node SDKs.
- Do NOT use `export` / `import`. Link JS files from `index.html` instead.
- Add comments explaining each part of the code.
