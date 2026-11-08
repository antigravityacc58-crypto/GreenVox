// GreenVox — Sentinel-2 NDVI quick analysis
// Paste this into https://code.earthengine.google.com/
// IMPORTANT: the 250 m buffer is only a temporary AOI.
// Replace it with a validated school boundary before final paper analysis.

var SCHOOL_LAT = -6.3663;
var SCHOOL_LNG = 106.8883;
var START = '2026-06-01';
var END   = '2026-08-23';
var GREEN_THRESHOLD = 0.35; // working operational threshold; validate/document in paper

var schoolPoint = ee.Geometry.Point([SCHOOL_LNG, SCHOOL_LAT]);
var aoi = schoolPoint.buffer(250);

// Simple SCL mask for Sentinel-2 Level-2A Surface Reflectance.
// Masks cloud shadow, medium/high probability cloud, cirrus, snow/ice,
// saturated/defective and no-data-like classes.
function maskS2(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(1)
    .and(scl.neq(3))
    .and(scl.neq(7))
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return image.updateMask(mask)
    .copyProperties(image, image.propertyNames());
}

function addNdvi(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate(START, END)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 70))
  .map(maskS2)
  .map(addNdvi);

print('Number of candidate scenes', s2.size());

var composite = s2.median();
var ndvi = composite.select('NDVI');

var stats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine({reducer2: ee.Reducer.median(), sharedInputs: true}),
  geometry: aoi,
  scale: 10,
  maxPixels: 1e7
});

var greenMask = ndvi.gte(GREEN_THRESHOLD);
var greenFraction = greenMask.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 10,
  maxPixels: 1e7
}).get('NDVI');

print('AOI mean/median NDVI', stats);
print('Fraction of pixels NDVI >= threshold', greenFraction);
print('Threshold', GREEN_THRESHOLD);

// Monthly trend
var startDate = ee.Date(START);
var endDate = ee.Date(END);
var months = endDate.difference(startDate, 'month').ceil();

var monthly = ee.FeatureCollection(
  ee.List.sequence(0, months.subtract(1)).map(function(m) {
    m = ee.Number(m);
    var d0 = startDate.advance(m, 'month');
    var d1 = d0.advance(1, 'month');
    var monthCollection = s2.filterDate(d0, d1);
    var count = monthCollection.size();

    var monthMean = ee.Algorithms.If(
      count.gt(0),
      monthCollection.median().select('NDVI').reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: aoi,
        scale: 10,
        maxPixels: 1e7
      }).get('NDVI'),
      null
    );

    return ee.Feature(null, {
      label: d0.format('YYYY-MM'),
      mean_ndvi: monthMean,
      scene_count: count
    });
  })
).filter(ee.Filter.notNull(['mean_ndvi']));

print('Monthly trend', monthly);

// Visualization only
Map.centerObject(aoi, 16);
Map.addLayer(
  composite,
  {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000},
  'Sentinel-2 true color'
);
Map.addLayer(
  ndvi,
  {min: -0.2, max: 0.8, palette: ['8c510a','f6e8c3','c7eae5','5ab4ac','01665e']},
  'NDVI'
);
Map.addLayer(aoi, {color: 'white'}, 'Temporary 250m AOI');

// Optional CSV export for documentation
Export.table.toDrive({
  collection: monthly,
  description: 'GreenVox_monthly_ndvi',
  fileFormat: 'CSV'
});
