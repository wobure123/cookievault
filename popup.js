const exportButton = document.getElementById('exportCookies');
const statusP = document.getElementById('status');
const currentDomainSpan = document.getElementById('currentDomain');
const openOptionsLink = document.getElementById('openOptions');
const cookiesPreviewDiv = document.getElementById('cookiesPreview');

let activeTabDomain = null;
let allCookies = [];

// Get current tab's domain to display
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      activeTabDomain = url.hostname;
      currentDomainSpan.textContent = activeTabDomain;
      // Get cookies and render
      chrome.cookies.getAll({ domain: activeTabDomain }, (cookies) => {
        allCookies = cookies || [];
        if (allCookies.length > 0) {
          cookiesPreviewDiv.style.display = '';
          cookiesPreviewDiv.innerHTML = allCookies.map((cookie, idx) =>
            `<label style='display:block;word-break:break-all;'><input type='checkbox' class='cookie-checkbox' data-idx='${idx}' checked> <b>${cookie.name}</b>=${cookie.value}</label>`
          ).join('');
        } else {
          cookiesPreviewDiv.style.display = '';
          cookiesPreviewDiv.innerHTML = '<em>No cookies found</em>';
        }
      });
    } catch (e) {
      currentDomainSpan.textContent = "Invalid URL";
      exportButton.disabled = true;
    }
  } else {
    currentDomainSpan.textContent = "Cannot determine domain";
    exportButton.disabled = true;
  }
});

exportButton.addEventListener('click', async () => {
  if (!activeTabDomain) {
    statusP.textContent = 'Cannot get domain.';
    statusP.style.color = 'red';
    return;
  }
  // Get selected cookies
  const checkedIdxs = Array.from(document.querySelectorAll('.cookie-checkbox:checked')).map(cb => parseInt(cb.dataset.idx));
  const selectedCookies = allCookies.filter((_, idx) => checkedIdxs.includes(idx));
  if (selectedCookies.length === 0) {
    statusP.textContent = 'Please select at least one cookie.';
    statusP.style.color = 'red';
    return;
  }
  // 获取 slug 输入
  const slugInput = document.getElementById('slugInput');
  let slug = '';
  if (slugInput && slugInput.value.trim()) {
    slug = slugInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, ''); // 只允许字母数字下划线和横杠
  } else {
    slug = activeTabDomain.replace(/\./g, '-');
  }
  statusP.textContent = 'Exporting...';
  statusP.style.color = 'orange';
  exportButton.disabled = true;
  try {
    // --- CloudPaste S3直传API ---
    const settings = await new Promise(resolve => chrome.storage.sync.get(['cloudpasteApiUrl', 'cloudpasteApiKey', 'cloudpasteBasePath'], resolve));
    const { cloudpasteApiUrl, cloudpasteApiKey, cloudpasteBasePath } = settings;
    const fileName = `${activeTabDomain}.json`;
    const path = cloudpasteBasePath || '/cookies/';
    // 拼接路径时不要多余斜杠，且 path 不能带文件名
    // 增加 slug 查询参数
    const uploadUrl = `${cloudpasteApiUrl.replace(/\/$/, '')}/api/upload-direct/${encodeURIComponent(fileName)}?path=${encodeURIComponent(path)}&slug=${encodeURIComponent(slug)}&override=true&original_filename=true`;
    const cookieData = {
      source: "CookieVaultExtension",
      domain: activeTabDomain,
      exportedAt: new Date().toISOString(),
      cookies: selectedCookies
    };
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `ApiKey ${cloudpasteApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cookieData)
    });
    if (response.ok) {
      statusP.textContent = `Cookies saved!`;
      statusP.style.color = 'green';
    } else {
      const err = await response.text();
      statusP.textContent = `Error: ${err}`;
      statusP.style.color = 'red';
    }
  } catch (error) {
    statusP.textContent = `Communication error: ${error.message}`;
    statusP.style.color = 'red';
  } finally {
    exportButton.disabled = false;
  }
});

openOptionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
