const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const basePathInput = document.getElementById('basePath');
const saveButton = document.getElementById('save');
const statusP = document.getElementById('status');

// Load saved settings
chrome.storage.sync.get(['cloudpasteApiUrl', 'cloudpasteApiKey', 'cloudpasteBasePath'], (result) => {
  if (result.cloudpasteApiUrl) {
    apiUrlInput.value = result.cloudpasteApiUrl;
  }
  if (result.cloudpasteApiKey) {
    apiKeyInput.value = result.cloudpasteApiKey;
  }
  if (result.cloudpasteBasePath) {
    basePathInput.value = result.cloudpasteBasePath;
  } else {
    basePathInput.value = "/cookies"; // Default value
  }
});

saveButton.addEventListener('click', () => {
  // Remove trailing slash from apiUrl for upload-direct
  let apiUrl = apiUrlInput.value.trim();
  if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
  }
  const apiKey = apiKeyInput.value.trim();
  let basePath = basePathInput.value.trim();

  if (!apiUrl || !apiKey) {
    statusP.textContent = 'API URL and API Key are required!';
    statusP.style.color = 'red';
    setTimeout(() => statusP.textContent = '', 3000);
    return;
  }

  // Ensure basePath starts with a slash and doesn't end with one (unless it's just "/")
  if (!basePath.startsWith('/')) {
    basePath = '/' + basePath;
  }
  if (basePath.length > 1 && basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }

  chrome.storage.sync.set({
    cloudpasteApiUrl: apiUrl,
    cloudpasteApiKey: apiKey,
    cloudpasteBasePath: basePath
  }, () => {
    statusP.textContent = 'Settings saved!';
    statusP.style.color = 'green';
    setTimeout(() => statusP.textContent = '', 3000);
  });
});
