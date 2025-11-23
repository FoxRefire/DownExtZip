// i18n helper function
function i18n(messageKey) {
    return chrome.i18n.getMessage(messageKey);
}

// Apply i18n to all elements with data-i18n attribute
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const messageKey = element.getAttribute('data-i18n');
        const message = i18n(messageKey);
        if (message) {
            element.textContent = message;
        }
    });
}

// Supported sites configuration
const SUPPORTED_SITES = [
    "addons.mozilla.org",
    "gnuzilla.gnu.org", 
    "addons.thunderbird.net",
    "chromewebstore.google.com",
    "microsoftedge.microsoft.com",
    "addons.opera.com",
    "store.whale.naver.com",
    "zen-browser.app"
];

// Check if current site is supported
async function isSupportedSite() {
    try {
        const url = await queryURL();
        const host = (new URL(url)).host;
        return SUPPORTED_SITES.includes(host);
    } catch (error) {
        return false;
    }
}

// UI utility functions
function showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    const spinner = button.querySelector('.loading-spinner');
    const btnContent = button.querySelector('.btn-content');
    
    button.disabled = true;
    btnContent.style.opacity = '0.6';
    spinner.style.display = 'block';
}

function hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    const spinner = button.querySelector('.loading-spinner');
    const btnContent = button.querySelector('.btn-content');
    
    button.disabled = false;
    btnContent.style.opacity = '1';
    spinner.style.display = 'none';
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = 'block';
    
    // Auto-hide after 3 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

function hideStatus() {
    const statusEl = document.getElementById('status-message');
    statusEl.style.display = 'none';
}

function showUnsupportedSite() {
    const buttonGroup = document.querySelector('.button-group');
    const statusEl = document.getElementById('status-message');
    
    // Hide all buttons
    buttonGroup.style.display = 'none';
    
    // Show unsupported message
    statusEl.textContent = i18n('unsupportedMessage');
    statusEl.className = 'status-message status-error';
    statusEl.style.display = 'block';
    
    // Update header
    const header = document.querySelector('.header');
    header.innerHTML = `
        <h1>${i18n('headerTitle')}</h1>
        <p>${i18n('unsupportedSite')}</p>
    `;
}

function addRippleEffect(button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Initialize popup based on current site
async function initializePopup() {
    // Apply i18n translations
    applyI18n();
    
    const isSupported = await isSupportedSite();
    if (!isSupported) {
        showUnsupportedSite();
        return;
    }
    
    // Show normal interface for supported sites
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.style.display = 'flex';
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', initializePopup);

// Event listeners with enhanced UI feedback
document.getElementById('xpi-crx').addEventListener("click", async (event) => {
    addRippleEffect(event.target);
    showLoading('xpi-crx');
    hideStatus();
    
    try {
        let url = await queryURL()
        showStatus(i18n('statusFetching'), 'info');
        let [fileName, data, ext] = await getPackage(url)
        showStatus(i18n('statusDownloading'), 'info');
        downloadResult(data, fileName + ext)
        showStatus(i18n('statusCompleted'), 'success');
    } catch (error) {
        console.error('Error downloading XPI/CRX:', error);
        showStatus(i18n('statusError'), 'error');
    } finally {
        hideLoading('xpi-crx');
    }
})

document.getElementById('zip').addEventListener("click", async (event) => {
    addRippleEffect(event.target);
    showLoading('zip');
    hideStatus();
    
    try {
        let url = await queryURL()
        showStatus(i18n('statusFetching'), 'info');
        let [fileName, data, ext] = await getPackage(url)
        showStatus(i18n('statusConverting'), 'info');
        if(ext == ".crx"){
            data = await crx2zip(data)
        }
        showStatus(i18n('statusDownloading'), 'info');
        downloadResult(data, fileName + ".zip")
        showStatus(i18n('statusCompleted'), 'success');
    } catch (error) {
        console.error('Error downloading ZIP:', error);
        showStatus(i18n('statusError'), 'error');
    } finally {
        hideLoading('zip');
    }
})

document.getElementById('zip-beautify').addEventListener("click", async (event) => {
    addRippleEffect(event.target);
    showLoading('zip-beautify');
    hideStatus();
    
    try {
        let url = await queryURL()
        showStatus(i18n('statusFetching'), 'info');
        let [fileName, data, ext] = await getPackage(url)
        showStatus(i18n('statusFormatting'), 'info');
        data = await beautify(data)
        showStatus(i18n('statusDownloading'), 'info');
        downloadResult(data, fileName + ".zip")
        showStatus(i18n('statusCompleted'), 'success');
    } catch (error) {
        console.error('Error downloading beautified ZIP:', error);
        showStatus(i18n('statusError'), 'error');
    } finally {
        hideLoading('zip-beautify');
    }
})

function queryURL(){
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0].url))
    })
}

async function getPackage(url){
    let host = (new URL(url)).host
    let utils = [
        ["addons.mozilla.org", getFirefox],
        ["gnuzilla.gnu.org", getIcecat],
        ["addons.thunderbird.net", getThunderbird],
        ["chromewebstore.google.com", getChrome],
        ["microsoftedge.microsoft.com", getEdge],
        ["addons.opera.com", getOpera],
        ["store.whale.naver.com", getWhale],
        ["zen-browser.app", getZen]
    ]
    for(let util of utils){
        if(host == util[0]){
            return (await util[1](url))
        }
    }
}

async function getFirefox(url){
    let id = url.replace(/.*?(firefox|android)\/addon\/(.*?)(\/|#|\?|$).*/, "$2");
    let apiResponse = await fetch(`https://addons.mozilla.org/api/v5/addons/addon/${id}/`).then(r => r.json())

    let fileName = `${id}-${apiResponse['current_version']['version']}`
    let data = await fetch(apiResponse['current_version']['file']['url']).then(r => r.arrayBuffer())

    return [fileName, data, ".xpi"]
}

async function getChrome(url){
    let id = url.replace(/.*?\/detail\/(.*?)\/(.*?)(\/|#|\?|$).*/, "$2")
    let name = url.replace(/.*?\/detail\/(.*?)\/(.*?)(\/|#|\?|$).*/, "$1")

    let data = await fetch(`https://clients2.google.com/service/update2/crx?response=redirect&prodversion=140&acceptformat=crx3&x=id%3D${id}%26installsource%3Dondemand%26uc`).then(r => r.arrayBuffer())
    let fileName = `${name}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
}

async function getEdge(url){
    // Edge cannot dynamically retrieve crx using fetch
    let id = url.replace(/.*?\/detail\/(.*?)\/(.*?)(\/|#|\?|$).*/, "$2")
    Object.assign(document.createElement("a"), {
        href: `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D${id}%26installsource%3Dondemand%26uc`,
        download: `${id}.crx`
    }).click()
}

async function getOpera(url){
    let id = url.replace(/.*?\/details\/(.*?)(\/|#|\?|$).*/, "$1")

    let data = await fetch(`https://addons.opera.com/extensions/download/${id}/`).then(r => r.arrayBuffer())
    let fileName = `${id}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
}

async function getIcecat(url) {
    let content = await fetch(url).then(r => r.text())
    let origURL = content.match(/(?<=<li>Orig: <a href=").*?(?=">)/)[0]
    return getFirefox(origURL)
}

async function getThunderbird(url) {
    let elem = document.createElement("html")
    elem.innerHTML = await fetch(url).then(r => r.text())

    let id = url.replace(/.*?thunderbird\/addon\/(.*?)(\/|#|\?|$).*/, "$1");
    let version = elem.querySelector(".version-number").innerText

    let fileName = `${id}-${version}`
    let data = await fetch(elem.querySelector("a.button.download:not(.prominent)").href).then(r => r.arrayBuffer())

    console.log(data)

    return [fileName, data, ".xpi"]
}

async function getWhale(url) {
    let id = url.replace(/.*?\/detail\/(.*?)(\/|#|\?|$).*/, "$1")
    let data = await fetch(`https://store.whale.naver.com/update/whx?response=redirect&amp;x=id%3D${id}%26installsource%3Dondemand%26uc`).then(r => r.arrayBuffer())
    let fileName = `${id}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
}

async function getZen(url) {
    // Extract UUID from URL
    let uuid = url.replace(/.*?\/mods\/([a-f0-9-]+)(\/|#|\?|$).*/, "$1")
    
    if (!uuid || uuid === url) {
        throw new Error("Invalid Zen Browser mod URL")
    }
    
    // Fetch directory contents from GitHub
    let apiUrl = `https://api.github.com/repos/zen-browser/theme-store/contents/themes/${uuid}`
    let response = await fetch(apiUrl)
    
    if (!response.ok) {
        throw new Error(`Failed to fetch mod files: ${response.status}`)
    }
    
    let files = await response.json()
    
    // Create ZIP file
    let zip = new JSZip()
    
    // Download and add each file to the ZIP
    for (let file of files) {
        if (file.type === 'file') {
            let fileResponse = await fetch(file.download_url)
            let fileData = await fileResponse.arrayBuffer()
            zip.file(file.name, fileData)
        }
    }
    
    // Generate ZIP file
    let zipData = await zip.generateAsync({type: "arraybuffer"})
    let fileName = `zen-mod-${uuid}`
    
    return [fileName, zipData, ".zip"]
}

async function findVersion(data){
    let manifest = await unpackPackage(data).then(zip => zip.file('manifest.json').async('text'))
    return JSON.parse(manifest)['version']
}

async function beautify(data){
    let zip = await unpackPackage(data)
    let promises = []
    zip.forEach((path, file) => {
        let promise = file.async("text").then(content =>{
            path.endsWith(".js") ? zip.file(path, js_beautify(content)) : null
            path.endsWith(".css") ? zip.file(path, css_beautify(content)) : null
            path.endsWith(".html") ? zip.file(path, html_beautify(content)) : null
        })
        promises.push(promise)
    })
    await Promise.all(promises)
    return (await zip.generateAsync({type: "arraybuffer"}))
}

async function crx2zip(data){
    let zip = await unpackPackage(data)
    return (await zip.generateAsync({type: "arraybuffer"}))
}

function unpackPackage(ab){
    let zip = new JSZip()
    return zip.loadAsync(ab)
}

function downloadResult(ab, name){
    let blob =new Blob([ab], {type: "octet/stream"});
    let blobLink = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.download = name;
    a.href = blobLink
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobLink);
}
