const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public', 'assets');

const fragmentAssetFiles = [
  { source: path.resolve(__dirname, '../../navigation/src/assets/navigation.css'), target: 'navigation.css' },
  { source: path.resolve(__dirname, '../../navigation/src/assets/navigation.js'), target: 'navigation.js' },
  { source: path.resolve(__dirname, '../../hotel-search/src/assets/search.css'), target: 'search.css' },
  { source: path.resolve(__dirname, '../../hotel-details/src/assets/details.css'), target: 'details.css' },
  { source: path.resolve(__dirname, '../../hotel-details/src/assets/details.js'), target: 'details.js' },
  { source: path.resolve(__dirname, '../../reviews/src/assets/reviews.css'), target: 'reviews.css' },
  { source: path.resolve(__dirname, '../../reviews/src/assets/reviews.js'), target: 'reviews.js' },
  { source: path.resolve(__dirname, '../../recommendations/src/assets/recommendations.css'), target: 'recommendations.css' },
  { source: path.resolve(__dirname, '../../recommendations/src/assets/recommendations.js'), target: 'recommendations.js' },
  { source: path.resolve(__dirname, '../../local-highlights/src/assets/local-highlights.css'), target: 'local-highlights.css' },
  { source: path.resolve(__dirname, '../../experiences-discovery/src/assets/experiences-discovery.css'), target: 'experiences-discovery.css' },
  { source: path.resolve(__dirname, '../../experiences-itinerary/src/assets/experiences-itinerary.css'), target: 'experiences-itinerary.css' },
];

const staticAssets = {
  'brand-mark.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#dff6ef"/><path d="M60 18 76 52 112 60 76 68 60 102 44 68 8 60 44 52 60 18z" fill="#0d6b5f"/></svg>',
};

function assertExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fragment asset source: ${filePath}`);
  }
}

function syncAssets() {
  fs.mkdirSync(publicDir, { recursive: true });

  for (const { source, target } of fragmentAssetFiles) {
    assertExists(source);
    fs.copyFileSync(source, path.join(publicDir, target));
  }

  for (const [fileName, fileContent] of Object.entries(staticAssets)) {
    fs.writeFileSync(path.join(publicDir, fileName), fileContent, 'utf8');
  }

  const generatedBundlePath = path.join(publicDir, 'local-highlights.js');
  const generatedSearchBundlePath = path.join(publicDir, 'search.js');
  const generatedDiscoveryBundlePath = path.join(publicDir, 'experiences-discovery.js');
  const generatedItineraryBundlePath = path.join(publicDir, 'experiences-itinerary.js');
  if (fs.existsSync(generatedBundlePath)) {
    console.log(`Preserved generated local-highlights bundle at ${generatedBundlePath}`);
  } else {
    console.log(`No generated local-highlights bundle found yet at ${generatedBundlePath}; run local-highlights build to generate it.`);
  }
  if (fs.existsSync(generatedSearchBundlePath)) {
    console.log(`Preserved generated search bundle at ${generatedSearchBundlePath}`);
  } else {
    console.log(`No generated search bundle found yet at ${generatedSearchBundlePath}; run hotel-search build to generate it.`);
  }
  if (fs.existsSync(generatedDiscoveryBundlePath)) {
    console.log(`Preserved generated experiences-discovery bundle at ${generatedDiscoveryBundlePath}`);
  } else {
    console.log(`No generated experiences-discovery bundle found yet at ${generatedDiscoveryBundlePath}; run experiences-discovery build to generate it.`);
  }
  if (fs.existsSync(generatedItineraryBundlePath)) {
    console.log(`Preserved generated experiences-itinerary bundle at ${generatedItineraryBundlePath}`);
  } else {
    console.log(`No generated experiences-itinerary bundle found yet at ${generatedItineraryBundlePath}; run experiences-itinerary build to generate it.`);
  }

  console.log(`Simulated CDN copy complete: ${fragmentAssetFiles.length + Object.keys(staticAssets).length} assets in ${publicDir}`);
}

syncAssets();
