
Map.addLayer(geometry, {}, 'vis geometry');
Map.centerObject(geometry, 9);

var start = '2023-03-01';
var end = '2023-07-01';

// Applies scaling factors.
function applyScaleFactors(image) {
// Scale and offset values for optical bands
var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
 
// Scale and offset values for thermal bands
var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
 
// Add scaled bands to the original image
return image.addBands(opticalBands, null, true)
.addBands(thermalBands, null, true);
}

// Function to Mask Clouds and Cloud Shadows in Landsat 8 Imagery

function cloudMask(image) {
  // Define cloud shadow and cloud bitmasks (Bits 3 and 5)
  var cloudShadowBitmask = (1 << 3);
  var cloudBitmask = (1 << 5);

  // Select the Quality Assessment (QA) band for pixel quality information
  var qa = image.select('QA_PIXEL');

  // Create a binary mask to identify clear conditions (both cloud and cloud shadow bits set to 0)
  var mask = qa.bitwiseAnd(cloudShadowBitmask).eq(0)
                .and(qa.bitwiseAnd(cloudBitmask).eq(0));

  // Update the original image, masking out cloud and cloud shadow-affected pixels
  return image.updateMask(mask);
}

// Import and preprocess Landsat 8 imagery
var image = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
              .filterBounds(geometry)
              .filterDate(start, end)
              .map(applyScaleFactors)
              .map(cloudMask)
              // .median()
              .max()
              .clip(geometry);

// Define visualization parameters for True Color imagery (bands 4, 3, and 2)
// var visualization = {
//   bands: ['SR_B4', 'SR_B3', 'SR_B2'],
//   min: 0.0,
//   max: 0.15,
// };

// Add the processed image to the map with the specified visualization
// Map.addLayer(image, visualization, 'landsat8');


// NDBI calculation

var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');
 
var ndbiPalette = {
min: -1,
max: 1,
palette: ['blue', 'white', 'green']
};

// Map.addLayer(ndbi, ndbiPalette, 'NDBI')


// // Calculate Normalized Difference Vegetation Index (NDVI)
var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');

// Calculate the minimum NDVI value within the AOI
var ndviMin = ee.Number(ndvi.reduceRegion({
  reducer   : ee.Reducer.min(),
  geometry  : geometry,
  scale     : 30,
  maxPixels : 1e9
}).values().get(0));

// Calculate the maximum NDVI value within the AOI
var ndviMax = ee.Number(ndvi.reduceRegion({
  reducer   : ee.Reducer.max(),
  geometry  : geometry,
  scale     : 30,
  maxPixels : 1e9
}).values().get(0));


// Print the Minimum and Maximum NDVI Values
print("Minimum NDVI:", ndviMin);
print("Maximum NDVI:", ndviMax);

// Define NDVI Visualization Parameters
var ndviPalette = {
min: -1,
max: 1,
palette: ['blue', 'white', 'green']
};

// Map.addLayer(ndvi, ndviPalette, 'NDVI')

// //MNDWI Thane

// var green = image.select('SR_B3'); // Green band
// var swir = image.select('SR_B7');  // SWIR band

//   // Calculate MNDWI
// var mndwi = green.subtract(swir).divide(green.add(swir)).rename('MNDWI');
var mndwi = image.normalizedDifference(['SR_B3', 'SR_B7']).rename('MNDWI');

var mndwiVis = {
  min: -1,   // Minimum MNDWI value
  max: 1,    // Maximum MNDWI value
  palette: ['blue', 'white', 'green']
};

// // Add MNDWI layer to the map
// Map.addLayer(mndwi, mndwiVis, 'MNDWI Image');

var BSI = image.expression(
  '((B4 + B6) - (B5 + B2)) / ((B4 + B6) + (B5 + B2))',
  {
    'B4': image.select('SR_B4'), // Red
    'B2': image.select('SR_B2'), // Blue
    'B5': image.select('SR_B5'), // NIR
    'B6': image.select('SR_B6')  // SWIR
  }
).rename('BSI');

//BSI Thane

// Define the Bare Soil Index (BSI)
var bsi = image.expression(
  // '((SWIR + RED) - (BLUE + NIR)) / ((NIR + RED) + (BLUE + SWIR))', {
  '((SWIR1 - SWIR2) / (SWIR1 + SWIR2))', {
    // NIR: image.select('SR_B5'),
    // RED: image.select('SR_B4'),
    // BLUE: image.select('SR_B2'),
    SWIR1: image.select('SR_B6'),
    SWIR2: image.select('SR_B7')
});

// Clip the BSI values to the range [-1, 1]
// bsi = bsi.clamp(-1, 1);

// // Display the result
// Map.centerObject(image, 8);
// Map.addLayer(bsi, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'BSI');
var bsiVis = {
  min: -1,   // Minimum value
  max: 1,    // Maximum value
  palette: ['blue', 'white', 'green']
};

// // // Add BSI layer to the map
// Map.addLayer(bsi, bsiVis, 'BSI Image');

//Albedo map

var albedo = image.expression(
  '((0.356*B1) + (0.130*B3) + (0.373*B4) + (0.085*B5) + (0.072*B7) -0.018) / 1.016',
  {
    B1: image.select('SR_B1'),
    B3: image.select('SR_B3'),
    B4: image.select('SR_B4'),
    B5: image.select('SR_B5'),
    B7: image.select('SR_B7')
  }
);

// var vizParams = {
//   // bands: ['albedo'],
//   min: 0,
//   max: 1,
//   palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
// };

// // Add the albedo layer to the map
// // Map.addLayer(myAlbedo.mean(), vizParams, 'Albedo');
// Map.addLayer(BSI, bsiVis, 'BSI');


// Export.image.toDrive({
//   image:ndvi,
//   description: "NDVI",
//   scale:10,
//   region: geometry,
//   maxPixels: 1e13
// });

// Export.image.toDrive({
//   image:ndbi,
//   description: "NDBI",
//   scale:10,
//   region: geometry,
//   maxPixels: 1e13
// });


// Export.image.toDrive({
//   image:albedo,
//   description: "Albedo",
//   scale:10,
//   region: geometry,
//   maxPixels: 1e13
// });

// Export.image.toDrive({
//   image:mndwi,
//   description: "MNDWI",
//   scale:10,
//   region: geometry,
//   maxPixels: 1e13
// });

// Export.image.toDrive({
//   image:bsi,
//   description: "BSI",
//   scale:10,
//   region: geometry,
//   maxPixels: 1e13
// });