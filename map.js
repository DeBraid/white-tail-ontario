
// FILE IMPORTS
const geoJsonPath = 'data.geojson';
const whiteTailCSVPath = 'white-tailed_deer_2019.csv';

// Load the data as Promises
const geoJson = () => d3.json(geoJsonPath);
const whiteTailData = () => d3.csv(whiteTailCSVPath);

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
const map = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// Add a text-box for the feature name
const featureName = map.append('text')
  .classed('big-text', true)
  .attr('x', width/1.75)
  .attr('y', 45);

const whiteTailToMapFeatures = (map_data, white_tails, target_year = '2018') => {
  const features = map_data.features;
  features.map(feature => {
    const mapWMU = feature.properties.WMU;
    white_tails.map(({WMU, Year, Total_Harvest, Active_Hunters}) => {
      if (mapWMU.includes(WMU) && Year === target_year) {
        feature.whitetail_hunting_data = calcHarvestsPerHunter(Active_Hunters, Total_Harvest);
      }
    });
  });
  return features;

  function calcHarvestsPerHunter (hunters, harvests) {
    return hunters > 0 ? Number((harvests/hunters).toFixed(3)) : 0;
  }
}

const fetchData = async (year) => {
  const [a, b] = await Promise.all([geoJson, whiteTailData]);
  const mapData = await a();
  const whiteTailRaw = await b();
  return await whiteTailToMapFeatures(mapData, whiteTailRaw, year);
}

const drawChart = async (whitetail_year = '2018') => {
  const features = await fetchData(whitetail_year);
  const domain = d3.extent(_.compact(features.map(f => f.whitetail_hunting_data)));
  console.log('domain', domain);
  const colorRange = ['#fff','#59b300', '#006400'];

  const color = d3.scaleLinear()
    .domain(domain)
    .range(colorRange);

  const fillFunction = (d, i) => color(d.whitetail_hunting_data);

  const polygons = map.selectAll('path')
    .data(features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', fillFunction)
    .attr('fill-opacity', 0.5)
    .attr('stroke', '#222')
    .on('mouseover', onMouseOver)
    .on('mouseout', onMouseOut);

  function onMouseOver(d, i) {
    console.log('onMouseOver whitetail_hunting_data', d.whitetail_hunting_data);
    d3.select(this).attr('fill', '#ffcb6b');
    const { WMU, SYS_AREA } = d.properties;
    const featureText = WMU + ' - ' + Math.round(SYS_AREA/1000000) + '   KM²';

    featureName.text(featureText);
  }

  function onMouseOut(d, i) {
    d3.select(this).attr('fill', fillFunction(d,i));
    featureName.text('');
  }

}

// drawChart('2016');
drawChart('2010');
