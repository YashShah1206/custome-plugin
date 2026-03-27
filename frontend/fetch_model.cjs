const fs = require('fs');
const path = require('path');

const dest = path.join('z:', 'YASH SHAH', 'custome plugin', 'custom-product-designer', 'frontend', 'public', 'models', 'tshirt.glb');

const urls = [
  'https://raw.githubusercontent.com/pmndrs/drei-assets/master/tshirt/shirt_baked.glb',
  'https://raw.githubusercontent.com/pmndrs/camera-controls/main/examples/models/t-shirt.glb',
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
];

(async () => {
  for (let url of urls) {
    console.log('Testing URL: ' + url);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log('HTTP ' + res.status);
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Checking magic bytes for glTF version 2 binary
      if (buffer.length > 4 && buffer.toString('utf8', 0, 4) === 'glTF') {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buffer);
        console.log('SUCCESS! Saved valid GLB to ' + dest);
        process.exit(0);
      } else {
        console.log('Invalid magic bytes signature: Not a GLB.');
      }
    } catch (e) {
      console.log('Fetch error: ' + e.message);
    }
  }
  console.error('\nALL URLS FAILED.');
  process.exit(1);
})();
