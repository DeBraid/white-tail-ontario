
// FILE IMPORTS
const geoJsonPath = "data.geojson";

// Set width and height of the map
const width = 800;
const height = 800;
const projectionCenter = [-91.5445018, 55.2280993];

// Sets the projection and scale of the map
const projection = d3.geoMercator()
  .scale(1800)
  .translate([width / 4, height / 6])
  .center(projectionCenter);

// Return the projection object
const path = d3.geoPath()
  .projection(projection);

// Create the object that will contain the map
const map = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Add a text-box for the feature name
const featureName = map.append('text')
  .classed('big-text', true)
  .attr('x', width/1.75)
  .attr('y', 45);

// Load the data
const geoJson = async () => {
  return await d3.json(geoJsonPath).then(results => results);
}

const whiteTailData = async () => {
  return await d3.csv('white-tailed_deer_2019.csv');
}

const fetchData = async () => {
  const [a, b] = await Promise.all([geoJson, whiteTailData])
  // console.log('fetchData a', a());
  // console.log('fetchData b', b());
  const mapData = await a();
  const bar = await b();
  console.log('fetchData mapData.features', mapData.features);
  console.log('fetchData bar', bar);
}

fetchData();

d3.json(geoJsonPath)
.then((mapData) => {
  const features = mapData.features;
  // TODO: need to merge harvest values with features
  features.map(feature => {
    const { WMU } = feature.properties;
    // feature.whitetail_hunting_data = [];
    d3.csv('white-tailed_deer_2019.csv').then((whitetails) => {
      whitetails.map((whitetail_row) => {
        if (WMU == whitetail_row.WMU) {
          feature.whitetail_hunting_data = Number(whitetail_row.Total_Harvest)
        }
      });
    });
  });
  return features;
})
.then((features) => {

  console.log('features', features);
  // Set constants for color scale
  const minDomain = 0;
  // const whitetailsArr = features.map(f => {
  //   // console.log('f', f);
  //   f.whitetail_hunting_data
  // });
  // console.log('whitetailsArr', whitetailsArr);
  const maxDomain = features.length;
  const colorRange = ["#f2ffe6","#59b300"];

  // Color and Fill functions
  const color = d3.scaleLinear()
    .domain([minDomain, maxDomain])
    .range(colorRange);

  const fillFunction = (d, i) => {
    return color(d.whitetail_hunting_data);
  };

  // Add the polygons
  const polygons = map.selectAll('path')
    .data(features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr("fill", fillFunction)
    .attr("fill-opacity", 0.5)
    .attr("stroke", "#222")
    .on('mouseover', onMouseOver)
    .on('mouseout', onMouseOut);

  // OnMouseOver function
  function onMouseOver(d, i) {
    console.log('onMouseOver whitetail_hunting_data', d.whitetail_hunting_data);
    d3.select(this).attr('fill', '#ffcb6b');
    const featureText = d.properties.WMU + ' - ' + Math.round(d.properties.SYS_AREA/1000000) + '   KM²';

    featureName.text(featureText);
  }

  // OnMouseOut function
  function onMouseOut(d, i) {
    d3.select(this).attr('fill', fillFunction(d,i));
    featureName.text('');
  }
});
