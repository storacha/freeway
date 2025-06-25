# Storacha Console Iframe Integration Test

This test project demonstrates how to embed the Storacha Console in an iframe within a third-party application (simulating an email provider interface).

## Setup

1. **Start the Console App:**
   
   From the `../console/` directory:
   ```bash
   cd ../console
   pnpm dev
   ```
   
   This will start the console app on `http://localhost:3000`. The `/iframe` routes automatically have iframe-friendly headers.

2. **Start the Test Iframe Application:**
   
   From this directory (`test-client/test-iframe/`):
   ```bash
   pnpm dev
   # or
   python3 -m http.server 8080
   ```

3. **Open the Test Application:**
   
   Navigate to `http://localhost:8080` to see the email provider interface with the embedded Storacha Console.

## What to Test

- **Iframe Loading**: The Storacha Console should load within the "Workspaces" tab
- **Parent-Child Communication**: Check the "Debug" tab to see message logs
- **Navigation**: Click links in the iframe - external navigation should open in new tabs
- **Authentication**: Login flow should work within the iframe
- **Space Management**: Browse and manage your Storacha spaces within the iframe

## Message Communication

The iframe and parent communicate via `postMessage`. Key message types:

- `CONSOLE_LOADED`: Iframe finished loading
- `CONSOLE_READY`: Iframe is ready for interaction
- `IFRAME_INIT`: Parent sends configuration to iframe
- `REQUEST_NAVIGATION`: Iframe requests parent to open URL in new tab
- `USER_ACTION`: User performed an action in the iframe

## Troubleshooting

1. **Iframe not loading**: Ensure the console app is running with `pnpm dev`
2. **CORS/Frame errors**: Check browser console for security policy violations
3. **Communication failing**: Check the Debug tab message log for errors

## Architecture

```
Email Provider App (localhost:8080)
└── Iframe Container
    └── Storacha Console (localhost:3000/iframe)
        ├── IframeHeader
        ├── IframeCompactSidebar  
        └── Dashboard/Space Views
``` 