# CookieVault for CloudPaste

A Chrome extension to export cookies from the current website and upload them as JSON files to your CloudPaste instance using the S3 direct upload API.

## Features
- One-click export of all cookies for the current tab's domain
- Preview and select which cookies to export
- Uploads cookies as a JSON file to CloudPaste (S3 compatible)
- Supports custom API endpoint, API key, and storage path
- No login required on the target Chrome, just import cookies as needed

## Usage

1. **Install the Extension**
   - Load this folder as an unpacked extension in Chrome (`chrome://extensions` > "Load unpacked").

2. **Configure CloudPaste Settings**
   - Click the extension icon, then click "Options".
   - Enter your CloudPaste API Base URL (e.g. `https://your.cloudpaste.server`)
   - Enter your CloudPaste API Key (must have upload permission)
   - Enter the base path for cookies (e.g. `/cookies`)
   - Save settings.

3. **Export Cookies**
   - Visit the website you want to export cookies from and log in.
   - Click the CookieVault extension icon.
   - Preview and select cookies to export.
   - Click "Export Cookies to CloudPaste".
   - The cookies will be uploaded as a JSON file named `domain.json` to your CloudPaste instance.

4. **Import Cookies (e.g. with DrissionPage)**
   - Download the JSON file from CloudPaste.
   - Use Python to convert and import cookies into DrissionPage or other automation tools.

## Example: Download and Import Cookies in Python

```python
import json
from drissionpage import SessionPage

with open('your_cookies.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
cookies = data['cookies']
for c in cookies:
    if 'expirationDate' in c:
        c['expiry'] = int(float(c['expirationDate']))
    c.pop('expirationDate', None)
    for k in ['hostOnly', 'session', 'storeId']:
        c.pop(k, None)
page = SessionPage()
page.cookies.add(cookies, domain=data['domain'])
```

## Notes
- Most websites can restore login state by importing cookies. Some sites may require additional data (localStorage, User-Agent, etc.).
- The extension uses CloudPaste's `/api/upload-direct` API for robust, directory-free uploads.
- If you want to store cookies in a different directory, change the base path in Options.

## License
MIT
