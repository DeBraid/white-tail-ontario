
// FILE IMPORTS
const geoJsonPath = 'data.geojson';
const whiteTailCSVPath = 'white-tailed_deer_2019.csv';

// Load the data as Promises
const geoJson = () => d3.json(geoJsonPath);
const whiteTailData = () => d3.csv(whiteTailCSVPath);

const mapConfig = {
  default: {
    scale: 1800,
    center:[-91.5445018, 55.2280993],
  },
  south: {
    scale: 3500,
    center:[-84.641971,49.0719856],
  }
};
const height = 800;
const width = d3.select('#map-container')
  .node()
  .getBoundingClientRect()
  .width
  .toFixed();


const setMapProjection = ({ scale, center }) => d3.geoMercator()
  .scale(scale)
  .translate([width / 4, height / 6])
  .center(center);

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
  // FIXME DB -- this is hacky, clean this up
  const yr = document.getElementById('year-dropdown');
  const year = yr.options[yr.selectedIndex].value;
  whitetail_year = year && year.length ? year : whitetail_year;

  const region = d3.select('#region-dropdown').property('value');
  const projection = setMapProjection(mapConfig[region]);
  // Return the projection object
  const path = d3.geoPath()
    .projection(projection);

  // Create the object that will contain the map
  const map = d3.select('#map-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const mouseOverSummaryText = (text = 'Hover on WMU for summary') =>
    d3.select('#wmu-summary').text(text);

  mouseOverSummaryText();

  const features = await fetchData(whitetail_year);
  const extent = d3.extent(_.compact(features.map(f => f.whitetail_hunting_data)));
  const variance = d3.variance(extent);
  const median = d3.median(extent);
  const domain = [median-variance, median+variance];
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
    d3.select(this).attr('fill', '#ffcb6b');
    const { WMU, SYS_AREA } = d.properties;
    const area = Math.round(SYS_AREA/1000000);
    const text = 'WMU: ' + WMU + ' - ' + area + ' KM² - Harvest Per Hunter: ' + d.whitetail_hunting_data;
    mouseOverSummaryText(text);
  }

  function onMouseOut(d, i) {
    d3.select(this).attr('fill', fillFunction(d,i));
    mouseOverSummaryText();
  }

}

const dropdownChange = function() {
    const newYear = d3.select(this).property('value');

    d3.select('#year')
      .text('');
    // FIXME DB this is hacky
    d3.selectAll('svg')
    .remove();

      console.log('dropdownChange newYear', newYear);
    drawChart(newYear);
};
const dropdown = d3.select("#year-dropdown").on("change", dropdownChange);

const regionChange = function() {
    const newRegion = d3.select(this).property('value');
    console.log('newRegion', newRegion);

    d3.select('#year')
      .text('');
    // FIXME DB this is hacky
    d3.selectAll('svg')
    .remove();

    drawChart();
};
const regionDropdown = d3.select("#region-dropdown").on("change", regionChange);

drawChart();
