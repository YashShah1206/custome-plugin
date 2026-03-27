const fs = require('fs');

async function downloadShirt() {
  const url = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/t-shirt/model.gltf';
  const destPath = 'z:\\YASH SHAH\\custome plugin\\custom-product-designer\\frontend\\public\\models\\tshirt.gltf';
  
  console.log('Downloading standard 3D T-Shirt model from Supabase...');
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to download: HTTP ' + response.status);
      process.exit(1);
    }
    
    const text = await response.text();
    // It's a JSON gltf file.
    if (text.includes('"asset"') || text.includes('asset')) {
      fs.writeFileSync(destPath, text);
      console.log('Successfully saved valid GLTF T-Shirt to: ' + destPath);
      process.exit(0);
    } else {
      console.error('Downloaded file is not a valid GLTF.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }
}

downloadShirt();
