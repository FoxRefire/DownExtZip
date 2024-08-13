document.getElementById('xpi-crx').addEventListener("click", async () => {
    let url = await queryURL()
    let [fileName, data, ext] = await getPackage(url)
    downloadResult(data, fileName + ext)
})

document.getElementById('zip').addEventListener("click", async () => {
    let url = await queryURL()
    let [fileName, data, ext] = await getPackage(url)
    if(ext == ".crx"){
        data = await crx2zip(data)
    }
    downloadResult(data, fileName + ".zip")
})

document.getElementById('zip-beautify').addEventListener("click", async () => {
    let url = await queryURL()
    let [fileName, data, ext] = await getPackage(url)
    data = await beautify(data)
    downloadResult(data, fileName + ".zip")
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
        ["chromewebstore.google.com", getChrome],
        ["microsoftedge.microsoft.com", getEdge],
        ["addons.opera.com", getOpera]
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

    let data = await fetch(`https://clients2.google.com/service/update2/crx?response=redirect&prodversion=49.0&acceptformat=crx3&x=id%3D${id}%26installsource%3Dondemand%26uc`).then(r => r.arrayBuffer())
    let fileName = `${name}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
}

async function getEdge(url){
    let id = url.replace(/.*?\/detail\/(.*?)\/(.*?)(\/|#|\?|$).*/, "$2")
    let name = url.replace(/.*?\/detail\/(.*?)\/(.*?)(\/|#|\?|$).*/, "$1")

    let data = await fetch(`https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D${id}%26installsource%3Dondemand%26uc`).then(r => r.arrayBuffer())
    let fileName = `${name}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
}

async function getOpera(url){
    let id = url.replace(/.*?\/details\/(.*?)(\/|#|\?|$).*/, "$1")

    let data = await fetch(`https://addons.opera.com/extensions/download/${id}/`).then(r => r.arrayBuffer())
    let fileName = `${id}-${await findVersion(data)}`

    return [fileName, data, ".crx"]
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
