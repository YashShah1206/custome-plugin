const fs = require('fs');
const path = require('path');

async function downloadGltf() {
  const baseUrl = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/t-shirt/';
  const outDir = 'z:\\YASH SHAH\\custome plugin\\custom-product-designer\\frontend\\public\\models';
  
  if (!fs.existsSync(outDir)) { fs.mkdirSync(outDir, { recursive: true }); }
  
  console.log('Fetching model.gltf...');
  const gltfRes = await fetch(baseUrl + 'model.gltf');
  if (!gltfRes.ok) throw new Error('HTTP ' + gltfRes.status);
  
  const gltfText = await gltfRes.text();
  fs.writeFileSync(path.join(outDir, 'tshirt.gltf'), gltfText);
  console.log('Saved tshirt.gltf');
  
  const json = JSON.parse(gltfText);
  
  for (let buffer of json.buffers || []) {
     if (buffer.uri) {
        console.log('Downloading buffer: ' + buffer.uri);
        const binRes = await fetch(baseUrl + buffer.uri);
        const arrayBuffer = await binRes.arrayBuffer();
        fs.writeFileSync(path.join(outDir, buffer.uri), Buffer.from(arrayBuffer));
     }
  }
  
  for (let img of json.images || []) {
     if (img.uri) {
        console.log('Downloading image: ' + img.uri);
        const imgRes = await fetch(baseUrl + img.uri);
        const arrayBuffer = await imgRes.arrayBuffer();
        fs.writeFileSync(path.join(outDir, img.uri), Buffer.from(arrayBuffer));
     }
  }
  
  console.log('All model assets downloaded successfully!');
}

downloadGltf().then(() => process.exit(0)).catch(e => {
  console.error(e.message);
  process.exit(1);
});
