/*
WMU Notes Regions can be define as:
-- North =<45
-- Southeast 46-78
-- Southwest >=79

CSV has headers:
-- WMU,Year,Active_Hunters,Antlered_Harvest,Antlerless_Harvest,Total_Harvest
*/
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

const whiteTailToMapFeatures = (map_data, white_tails, target_year = '2018', harvest_type = 'Antlered_Harvest') => {
  const features = map_data.features;
  features.map(feature => {
    const mapWMU = feature.properties.WMU;
    white_tails.map((kill_data) => {
      const { WMU, Year, Active_Hunters } = kill_data;
      if (mapWMU.includes(WMU) && Year === target_year) {
        console.log('harvest_type.split', harvest_type.split('_Per')[0]);
        const deerType = kill_data[harvest_type.split('_Per')[0]];
        // const deerType = kill_data[harvest_type];
        console.log('deerType', deerType);
        feature.whitetail_hunting_data = calcWhiteTailData(deerType, Active_Hunters, harvest_type);

      }
    });
  });
  return features;

  function calcWhiteTailData (n, d, harvest_type) {
    console.log('n', n);
    console.log('d', d);
    let val = n;
    console.log('harvest_type.includes', harvest_type.includes('_Per'));
    if (d && harvest_type.includes('_Per')) {
      val = d > 0 ? Number((n/d).toFixed(3)) : 0;
    }
    return val;
  }
}

const fetchData = async (year) => {
  const [a, b] = await Promise.all([geoJson, whiteTailData]);
  const mapData = await a();
  const whiteTailRaw = await b();
  const harvestType = d3.select('#harvest-dropdown').property('value');
  console.log('harvestType', harvestType);
  return await whiteTailToMapFeatures(mapData, whiteTailRaw, year, harvestType);
}

const drawChart = async (whitetail_year = '2018') => {
  // FIXME DB -- this is hacky, clean this up
  const yr = document.getElementById('year-dropdown');
  const year = yr.options[yr.selectedIndex].value;
  whitetail_year = year && year.length ? year : whitetail_year;

  const region = d3.select('#region-dropdown').property('value');
  const projection = setMapProjection(mapConfig[region]);

  console.log('drawChart year, region', whitetail_year, region);

  const path = d3.geoPath()
    .projection(projection);

  const map = d3.select('#map-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const mouseOverSummaryText = (text = 'Hover on WMU for summary') =>
    d3.select('#wmu-summary').text(text);

  mouseOverSummaryText();

  const features = await fetchData(whitetail_year);
  const extent = d3.extent(_.compact(features.map(f => Number(f.whitetail_hunting_data) )));
  console.log('extent', extent);
  // const variance = d3.variance(extent);
  // console.log('variance', variance);
  // const median = d3.median(extent);
  // const domain = [median-variance, median+variance];
  const domain = extent;
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
    d3.select(this).attr('fill', '#ffcb6b');
    const { WMU, SYS_AREA } = d.properties;
    const area = Math.round(SYS_AREA/1000000);
    console.log('d.whitetail_hunting_data', d.whitetail_hunting_data);
    const text = 'WMU: ' + WMU + ' - ' + area + ' KM² - Harvest Per Hunter: ' + d.whitetail_hunting_data;
    mouseOverSummaryText(text);
  }

  function onMouseOut(d, i) {
    d3.select(this).attr('fill', fillFunction(d,i));
    mouseOverSummaryText();
  }

  const onDropdownChange = () => {
      d3.selectAll('svg').remove();
      drawChart();
  }
  d3.selectAll(".dropdown").on("change", onDropdownChange);

}

drawChart();
