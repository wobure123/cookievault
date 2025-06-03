// background.js

// Helper to get settings
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['cloudpasteApiUrl', 'cloudpasteApiKey', 'cloudpasteBasePath'], resolve);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportCookiesToCloudPaste") {
    (async () => {
      const { domain } = request;
      if (!domain) {
        sendResponse({ success: false, error: "Domain not provided." });
        return;
      }
      const settings = await getSettings();
      const { cloudpasteApiUrl, cloudpasteApiKey, cloudpasteBasePath } = settings;
      // 支持自定义cookies导出
      let cookies = request.cookies;
      if (!cookies) {
        cookies = await chrome.cookies.getAll({ domain: domain });
      }
      if (!cookies || cookies.length === 0) {
        sendResponse({ success: false, error: `No cookies found for ${domain}.` });
        return;
      }
      // Prepare cookies for storage (WebDriver compatible format)
      const processedCookies = cookies.map(cookie => {
        let newCookie = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
        };
        if (cookie.expirationDate) {
          newCookie.expiry = Math.floor(cookie.expirationDate);
        }
        if (cookie.sameSite) {
          if (cookie.sameSite === "no_restriction") newCookie.sameSite = "None";
          else if (cookie.sameSite === "unspecified") { /* Omit or map if needed */ }
          else newCookie.sameSite = cookie.sameSite.charAt(0).toUpperCase() + cookie.sameSite.slice(1);
        }
        return newCookie;
      });
      const cookieData = {
        source: "CookieVaultExtension",
        domain: domain,
        exportedAt: new Date().toISOString(),
        cookies: processedCookies
      };
      const fileName = `${domain}.json`;
      const fullPath = `${cloudpasteBasePath || "/cookies"}/${fileName}`.replace(/\/\//g, '/');
      const updateApiUrl = `${cloudpasteApiUrl.replace(/\/$/, '')}/update`;
      // Ensure parent directory exists before uploading file
      async function ensureDirExists(dirPath) {
        if (!dirPath || dirPath === '' || dirPath === '/') return;
        const listUrl = `${cloudpasteApiUrl.replace(/\/$/, '')}/list?path=${encodeURIComponent(dirPath)}`;
        const res = await fetch(listUrl, {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${cloudpasteApiKey}`
          }
        });
        if (res.status === 404) {
          // Try to create parent first (recursive)
          const parent = dirPath.substring(0, dirPath.lastIndexOf('/')) || '/';
          if (parent && parent !== dirPath) {
            await ensureDirExists(parent);
          }
          // Directory does not exist, create it
          const mkdirUrl = `${cloudpasteApiUrl.replace(/\/$/, '')}/mkdir`;
          await fetch(mkdirUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `ApiKey ${cloudpasteApiKey}`
            },
            body: JSON.stringify({ path: dirPath })
          });
        }
      }
      // 取父目录
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
      await ensureDirExists(parentDir);
      const response = await fetch(updateApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${cloudpasteApiKey}`
        },
        body: JSON.stringify({
          path: fullPath,
          content: JSON.stringify(cookieData, null, 2)
        })
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${errorData}`);
      }
      const result = await response.json();
      console.log("CloudPaste API response:", result);
      sendResponse({ success: true, message: `Cookies saved to ${fullPath}` });
    })().catch(error => {
      console.error("Error exporting cookies:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});
