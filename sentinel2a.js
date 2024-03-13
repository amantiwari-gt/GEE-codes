// Define the bounding box coordinates
var geometry = ee.Geometry.Rectangle([78.99, 30.7, 79.3, 30.95]);

// Visualize the bounding box on the map
Map.centerObject(geometry);
Map.addLayer(geometry, {color: 'FF0000'}, 'Bounding Box');

// Map.centerObject(gangotri);


var startDate = '2023-10-01';
var endDate = '2023-10-31';

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate(startDate, endDate)
                  .filterBounds(geometry)
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',5))
                  .map(maskS2clouds)
                  .mean()
                  .clip(geometry);
                  
print(dataset)

var visualization = {
  min: 0.0,
  max: 1.0,
  bands: ['B4', 'B3', 'B2'],
};

// Map.setCenter(83.277, 17.7009, 12);

Map.addLayer(dataset, visualization, 'RGB');

Map.addLayer(gangotri, {color: 'blue'}, 'Shapefile');

  Export.image.toDrive({
  image:dataset,
  description: "oct_2023",
  scale:10,
  region: geometry,
  maxPixels: 1e13
});