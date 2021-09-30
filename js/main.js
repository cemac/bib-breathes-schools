'use strict';

document.addEventListener('DOMContentLoaded', async function() {

  let atmotube, atmotubeDropDown, binSizes, checkZoomLevel, colors,
      currentBinSize, currentLayer, dataAggregationText, featureDropDown,
      features, get_data, indexFile, layers, layersControl, layout, map,
      noLocationDataText, numAtmotubes, period, periodDropDown, plot_config,
      ranges, resetHeatMap, setBinSize, school;

  async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    school = urlParams.get('school');

    get_data = async function(data_url, type) {
      let data = null;
      let url_prefix = 'https://www.googleapis.com/drive/v2/files/';
      let url_suffix = '?alt=media&key=AIzaSyA6LgT8w7V7syKB6Deq0nxjpxX1HIalo6k';
      let full_url = url_prefix + data_url + url_suffix;
      /* get the encrypted data: */
      if (data_url == 'null') {
        if (type == "heatmap") {
          noLocationDataText.innerHTML = 'Sorry, no location data available for this time period';
          dataAggregationText.innerHTML = '';
        };
        return data;
      };
      let fetch_response = await fetch(full_url, {
        'cache': 'force-cache'
      });
      /* check age of response ... get headers: */
      let response_headers = fetch_response.headers.entries();
      for (var response_header of response_headers) {
        /* look for date header: */
        let header_key = response_header[0];
        if (header_key == 'date') {
          /* get date of response: */
          let header_value = response_header[1];
          let response_date = new Date(header_value);
          /* get current date: */
          let current_date = new Date();
          /* get response age from date difference in seconds: */
          let response_age = (current_date - response_date) / 1000;
          /* if reponse is over an hour old, fetch again: */
          if (response_age > 3600) {
            let fetch_response = await fetch(full_url);
          };
        };
      };
      if (type == 'index') {
        data = await fetch_response.json();
        return data;
      };
      let crypt_string = await fetch_response.text();
      /* decrypt the data: */
      let data_string = await decrypt(pass_phrase, crypt_string);
      /* if not empty: */
      if (data_string != '') {
        /* jsonify and store data: */
        data = JSON.parse(data_string);
        if (type == "heatmap") {
          noLocationDataText.innerHTML = '';
        };
      } else {
        if (type == "heatmap") {
          noLocationDataText.innerHTML = 'Sorry, no location data available for this time period';
          dataAggregationText.innerHTML = '';
        };
      };
      return data;
    };

    const indexFiles = {
      'barkerend':         '15JI3NocKDg35BfiICLiG2IcJMf10a-Nw',
      'beckfoot_allerton': '1C5w5UxoSCePD4AEfUsfCN_3nlurBO1IM',
      'beckfoot_heaton':   '16pJZKjQmgcibCfL3DgaRJc5BXew9zVAB',
      'brackenhill':       '1xMKjj86CKYcZ10bcsXXW1voQjURQacXo',
      'dixons':            '1ywS_k71YIEmzJp6aq3UNOmryWqi4dM7o',
      'home_farm':         '1Qb4CY0QPR7PZSl_yPfg9ZemDopyKjY50',
      'st_barnabas':       '1CjMQrY6HptcGTZXLSVIxUw105AmPq9dO',
      'st_johns':          '1Ne0-iDHCEi4HLPoLi8P8c6rvb1SLZYYR',
      'st_stephens':       '1tUb4cLAFp9TsdXLqwTZSMJLbiO7vDo4j',
      'whetley':           '1MIiipSh9qCLXqgCGAcNlXUFZQSZSaClT'
    };
    indexFile = await get_data(indexFiles[school], 'index');

    let pass_phrase;
    async function getPassPhrase() {
      pass_phrase = prompt("Enter password:");
      let checkPassPhrase = await get_data(indexFile['data']['alltime']['timeseries'][1], 'timeseries');
      for (let i = 3; i > 0; i--) {
        if (!checkPassPhrase) {
          pass_phrase = prompt("Incorrect password. " + i + " attempts remaining:");
          checkPassPhrase = await get_data(indexFile['data']['alltime']['timeseries'][1], 'timeseries');
        };
      };
      if (!checkPassPhrase) {
        alert('Sorry, too many incorrect attempts, please refresh page and try again.')
      };
    };
    await getPassPhrase();

    periodDropDown = document.getElementById('period-drop-down');

    function createPeriodDropDown() {
      const weeks = []
      indexFile['weeks'].forEach(function(week) {
        const weekSplit = week.split('-');
        weeks.push([week, weekSplit[2] + '/' + weekSplit[1] + '/' + weekSplit[0]]);
      });
      const days = []
      indexFile['days'].forEach(function(day) {
        const daySplit = day.split('-');
        days.push([day, daySplit[2] + '/' + daySplit[1] + '/' + daySplit[0]]);
      });
      periodDropDown.innerHTML += '<option value="alltime" selected>All time</option>'
      weeks.forEach(function(week) {
        periodDropDown.innerHTML += '<option value="weekly,' + week[0] + '">Week beginning ' + week[1] + '</option>'
      });
      days.forEach(function(day) {
        periodDropDown.innerHTML += '<option value="daily,' + day[0] + '">' + day[1] + '</option>'
      });
    };
    createPeriodDropDown();

    features = ['PM1, ug/m3', 'PM2.5, ug/m3', 'PM10, ug/m3', 'VOC, ppm'];
    featureDropDown = document.getElementById('feature-drop-down');

    function createFeatureDropDown() {
      features.forEach(function(feature) {
        if (feature == 'PM2.5, ug/m3') {
          featureDropDown.innerHTML += '<option value="' + feature + '" selected>' + feature + '</option>'
        } else {
          featureDropDown.innerHTML += '<option value="' + feature + '">' + feature + '</option>'
        };
      });
    };
    createFeatureDropDown();

    numAtmotubes = 5;
    atmotubeDropDown = document.getElementById('atmotube-drop-down');

    function createAtmotubeDropDown() {
      atmotubeDropDown.innerHTML += '<option value="all" selected>All Atmotubes</option>'
      for (let i = 1; i < numAtmotubes + 1; i++) {
        atmotubeDropDown.innerHTML += '<option value="' + i + '" >Atmotube ' + i + '</option>'
      };
    };
    createAtmotubeDropDown();

    noLocationDataText = document.getElementById('no-location-data-text');
    dataAggregationText = document.getElementById('data-aggregation-text');

    binSizes = ['5', '10', '50'];

  };
  await init();

  function initTimeSeries() {
    layout = {};
    features.forEach(function(feature) {
      layout[feature] = {
        title: {
          text: 'Time series showing how density of <br>' + feature + ' varies with time',
          font: {
            color: '#555',
            family: 'Arial, Helvetica, sans-serif',
            size: 16
          },
          pad: {
            l: 20,
            r: 20,
          }
        },
        showlegend: true,
        legend: {
          x: 0.5,
          xanchor: 'center',
          y: -0.2,
          orientation: 'h'
        },
        margin: { l: 20, r: 20 }
      };
    });

    plot_config = {
      'showLink': false,
      'linkText': '',
      'displaylogo': false,
      'responsive': true,
      displayModeBar: true
    };
  };
  initTimeSeries();

  async function plotTimeSeries() {
    featureDropDown.setAttribute('disabled', true);
    const plotId = document.getElementById('plotid');
    plotId.classList.add('plot-loading');

    period = periodDropDown.value;
    let newTimeSeriesData;
    const timeSeriesData = [];
    const atmotubeNumbers = []
    for (let i = 1; i < numAtmotubes + 1; i++) {
      if (period == 'alltime') {
        newTimeSeriesData = await get_data(indexFile['data']['alltime']['timeseries'][i], 'timeseries');
      } else {
        newTimeSeriesData = await get_data(indexFile['data'][period.split(',')[0]][period.split(',')[1]]['timeseries'][i], 'timeseries');
      };
      if (newTimeSeriesData) {
        timeSeriesData.push(newTimeSeriesData);
        atmotubeNumbers.push(i);
      };
    };

    const initialData = [];
    for (let i = 0; i < timeSeriesData.length; i++) {
      const dates = [];
      timeSeriesData[i]['dates'].forEach(function(date) {
        dates.push(new Date(date).toISOString());
      });
      initialData.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Atmotube ' + atmotubeNumbers[i],
        x: dates,
        y: timeSeriesData[i]['values'][featureDropDown.value]
      });
    };
    const initialLayout = JSON.parse(JSON.stringify(layout[featureDropDown.value]));
    Plotly.newPlot('plotid', initialData, initialLayout, plot_config);
    plotId.fn = school + '_' + period + '_' + featureDropDown.value;

    const summaryStatsObj = {};
    const update = {};
    features.forEach(function(feature) {
      const x = [];
      const y = [];
      summaryStatsObj[feature] = {};
      for (let i = 0; i < timeSeriesData.length; i++) {
        const dates = [];
        timeSeriesData[i]['dates'].forEach(function(date) {
          dates.push(new Date(date).toISOString());
        });
        x.push(dates);
        y.push(timeSeriesData[i]['values'][feature]);
        summaryStatsObj[feature][String(atmotubeNumbers[i])] = {};
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Count'] = timeSeriesData[i]['stats'][feature]["count"];
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Mean'] = timeSeriesData[i]['stats'][feature]["mean"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Standard deviation'] = timeSeriesData[i]['stats'][feature]["std"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Minimum'] = timeSeriesData[i]['stats'][feature]["min"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Lower quartile'] = timeSeriesData[i]['stats'][feature]["25%"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Median'] = timeSeriesData[i]['stats'][feature]["50%"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Upper quartile'] = timeSeriesData[i]['stats'][feature]["75%"].toFixed(2);
        summaryStatsObj[feature][String(atmotubeNumbers[i])]['Maximum'] = timeSeriesData[i]['stats'][feature]["max"].toFixed(2);
      };
      update[feature] = {
        x: x,
        y: y
      };
    });

    const summaryStatsText = [];
    for (let i = 1; i < 6; i++) {
      summaryStatsText.push(document.getElementById('summary-stats-text' + i));
    };

    function createSummaryStatsText() {
      for (let i = 0; i < 5; i++) {
        if (summaryStatsObj[featureDropDown.value][String(i + 1)]) {
          summaryStatsText[i].innerHTML = '';
          for (const property in summaryStatsObj[featureDropDown.value][String(i + 1)]) {
            summaryStatsText[i].innerHTML += '<li>' + `${property}: ${summaryStatsObj[featureDropDown.value][String(i+1)][property]}` + '</li>'
          };
        } else {
          summaryStatsText[i].innerHTML = 'Sorry no data';
        };
      };
    };
    createSummaryStatsText();

    function updateTimeSeries(event) {
      Plotly.update('plotid', update[featureDropDown.value], layout[featureDropDown.value], [0, 1, 2, 3, 4]);
      plotId.fn = school + '_' + period + '_' + featureDropDown.value;
      createSummaryStatsText();
    };
    featureDropDown.addEventListener("change", updateTimeSeries);

    plotId.classList.remove('plot-loading');
    featureDropDown.removeAttribute('disabled');
  };

  function initHeatMap() {
    map = L.map('mapid', { attributionControl: false, zoomControl: false }).setView([53.77875400063466, -1.7551848715634326], 12);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      maxZoom: 20,
      minZoom: 12,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1Ijoib3NjYXItcmljaGFyZHNvbiIsImEiOiJja3MwMDJheWkwaWw0MndwanBtbzl3djNvIn0.1wg7WwvVPp3elm4fyOpVfA'
    }).addTo(map);

    const zoomControl = L.control.zoom();
    zoomControl.addTo(map);
    L.DomUtil.addClass(zoomControl.getContainer(), 'zoom-control');

    const printer = L.easyPrint({
      exportOnly: true,
      hidden: true,
      hideControlContainer: false,
      hideClasses: ['zoom-control', 'layers-control']
    }).addTo(map);
    const exportButton = document.getElementById('export-button');
    exportButton.addEventListener('click', function() {
      exportButton.classList.add("button-loading");
      setTimeout(function() {
        printer.printMap('CurrentSize');
      }, 10);
    });
    map.on('easyPrint-finished', function(ev) {
      exportButton.classList.remove("button-loading");
    });

    L.control.scale().addTo(map);

    const leafletLegend = document.querySelector('.leaflet-legend');

    function onBaseLayerChange(e) {
      currentLayer = e.name;
      if (period.split(',')[0] == 'daily' && atmotube != 'all') {
        leafletLegend.innerHTML = '<div class="leaflet-legend-header">' + currentLayer + '</div>';
        for (let i = 0; i < colors[currentLayer].length; i++) {
          leafletLegend.innerHTML += '<i style="background: ' + colors[currentLayer][i] + '; opacity:0.6"></i>';
          if (i != 0) {
            leafletLegend.innerHTML += (parseFloat(ranges[currentLayer][i]) + 0.01).toFixed(2);
          } else {
            leafletLegend.innerHTML += parseFloat(ranges[currentLayer][i]).toFixed(2);
          };
          if (ranges[currentLayer][i + 1]) {
            leafletLegend.innerHTML += ' - ' + ranges[currentLayer][i + 1] + ' ug/m3<br>';
          } else {
            leafletLegend.innerHTML += ' ug/m3 or more<br>';
          };
        };
        printer["options"]["filename"] = school + '_' + period + '_atmotube' + atmotube + '_' + currentLayer;
      } else {
        leafletLegend.innerHTML = '<div class="leaflet-legend-header">Mean ' + currentLayer + ' per square</div>';
        for (let i = 0; i < colors[currentLayer].length; i++) {
          leafletLegend.innerHTML += '<i style="background: ' + colors[currentLayer][i] + '; opacity:0.6"></i>';
          if (i != 0) {
            leafletLegend.innerHTML += (parseFloat(ranges[currentBinSize][currentLayer][i]) + 0.01).toFixed(2);
          } else {
            leafletLegend.innerHTML += parseFloat(ranges[currentBinSize][currentLayer][i]).toFixed(2);
          };
          if (ranges[currentBinSize][currentLayer][i + 1]) {
            leafletLegend.innerHTML += ' - ' + ranges[currentBinSize][currentLayer][i + 1] + ' ug/m3<br>';
          } else {
            leafletLegend.innerHTML += ' ug/m3 or more<br>';
          };
        };
        if (atmotube == 'all') {
          printer["options"]["filename"] = school + '_' + period + '_all_atmotubes_' + currentLayer + '_square_size=' + currentBinSize;
        } else {
          printer["options"]["filename"] = school + '_' + period + '_atmotube' + atmotube + '_' + currentLayer + '_square_size=' + currentBinSize;
        };
      };
    };
    map.on('baselayerchange', onBaseLayerChange);

    resetHeatMap = function() {
      map.eachLayer(function(layer) {
        if (!layer.hasOwnProperty('_tiles')) {
          map.removeLayer(layer);
        };
      });
      if (layersControl) {
        map.removeControl(layersControl);
      };
    };

    setBinSize = function(binSize) {
      dataAggregationText.innerHTML = '';
      currentBinSize = binSize;
      layersControl = L.control.layers(layers[binSize]);
      layersControl.addTo(map);
      L.DomUtil.addClass(layersControl.getContainer(), 'layers-control');
      layers[binSize][currentLayer].addTo(map);
      dataAggregationText.innerHTML = 'Data aggregated in ' + currentBinSize + ' metre squares';
    };

    checkZoomLevel = function() {
      if (period.split(',')[0] != 'daily' || atmotube == 'all') {
        const zoomLevel = map.getZoom();
        if (periodDropDown.value == 'alltime') {
          if (zoomLevel >= 18) {
            if (currentBinSize !== '10') {
              resetHeatMap();
              setBinSize('10');
            };
          } else {
            if (currentBinSize !== '50') {
              resetHeatMap();
              setBinSize('50');
            };
          };
        } else {
          if (zoomLevel >= 18) {
            if (currentBinSize !== '5') {
              resetHeatMap();
              setBinSize('5');
            };
          } else if (zoomLevel < 14) {
            if (currentBinSize !== '50') {
              resetHeatMap();
              setBinSize('50');
            };
          } else {
            if (currentBinSize !== '10') {
              resetHeatMap();
              setBinSize('10');
            };
          };
        };
      };
    };
    map.on('zoomend', checkZoomLevel);

    colors = {};
    features.forEach(function(feature) {
      colors[feature] = ['#93f2c9', '#31cdaa', '#2ab1a0', '#1f5d73', '#000000'];
      if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
        colors[feature + ' (DAQI)'] = ['#9cff9c', '#31ff00', '#31cf00', '#ffff00', '#ffcf00', '#ff9a00', '#ff6464', '#ff0000', '#990000', '#ce30ff'];
      };
    });

    currentLayer = 'PM2.5, ug/m3';
  };
  initHeatMap();

  async function plotHeatMap() {
    atmotubeDropDown.setAttribute('disabled', true);
    periodDropDown.setAttribute('disabled', true);
    map.spin(true);

    resetHeatMap();

    const min = {};
    const max = {};
    const range = {};
    ranges = {};
    layers = {};
    period = periodDropDown.value;
    atmotube = atmotubeDropDown.value;

    function getIndex(value, array) {
      for (let i = 1; i < array.length; i++) {
        if (value <= array[i]) {
          return i - 1;
        };
      };
      return array.length - 1;
    };

    if (period.split(',')[0] == 'daily' && atmotube != 'all') {
      const heatMapData = await get_data(indexFile['data']['daily'][period.split(',')[1]]['heatmap'][atmotube], 'heatmap');

      if (heatMapData) {
        features.forEach(function(feature) {
          ranges[feature] = [];
          layers[feature] = L.layerGroup();
          if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
            layers[feature + ' (DAQI)'] = L.layerGroup();
          };
          min[feature] = Math.min(...Object.values(heatMapData[feature]));
          max[feature] = Math.max(...Object.values(heatMapData[feature]));
          range[feature] = max[feature] - min[feature];
          for (let i = 0; i <= 5; i++) {
            ranges[feature].push((min[feature] + range[feature] * 0.2 * i).toFixed(2));
          };
        });

        ranges['PM2.5, ug/m3 (DAQI)'] = ['0.00', '11.49', '23.49', '35.49', '41.49', '47.49', '53.49', '58.49', '64.49', '70.49'];
        ranges['PM10, ug/m3 (DAQI)'] = ['0.00', '16.49', '33.49', '50.49', '58.49', '66.49', '75.49', '83.49', '91.49', '100.49'];

        features.forEach(function(feature) {
          for (let i = 0; i < heatMapData['Date'].length; i++) {
            const circle = [
              heatMapData['Latitude'][i],
              heatMapData['Longitude'][i]
            ];
            const tooltip = 'Latitude: ' + heatMapData['Latitude'][i].toFixed(6) +
              '<br>Longitude: ' + heatMapData['Longitude'][i].toFixed(5) +
              '<br>PM1: ' + heatMapData['PM1, ug/m3'][i].toFixed(2) +
              ' ug/m3<br>PM2.5: ' + heatMapData['PM2.5, ug/m3'][i].toFixed(2) +
              ' ug/m3<br>PM10: ' + heatMapData['PM10, ug/m3'][i].toFixed(2) +
              ' ug/m3<br>VOC: ' + heatMapData['VOC, ppm'][i].toFixed(2) +
              ' ppm<br>Time: ' + new Date(heatMapData['Date'][i]).toUTCString();
            layers[feature].addLayer(L.circle(circle, {
                radius: 5,
                color: colors[feature][getIndex(
                  parseFloat(heatMapData[feature][i].toFixed(2)), ranges[feature])],
                weight: 0,
                fillOpacity: 0.8
              })
              .bindTooltip(tooltip));
            if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
              layers[feature + ' (DAQI)'].addLayer(L.circle(circle, {
                  radius: 5,
                  color: colors[feature + ' (DAQI)'][getIndex(
                    parseFloat(heatMapData[feature][i].toFixed(2)), ranges[feature + ' (DAQI)'])],
                  weight: 0,
                  fillOpacity: 0.4
                })
                .bindTooltip(tooltip));
            };
          };
        });

        layersControl = L.control.layers(layers);
        layersControl.addTo(map);
        L.DomUtil.addClass(layersControl.getContainer(), 'layers-control');
        layers[currentLayer].addTo(map);
        dataAggregationText.innerHTML = 'All data points plotted';

      };

    } else {

      const heatMapData = {};

      for (const binSize of binSizes) {
        if (period == 'alltime') {
          heatMapData[binSize] = await get_data(indexFile['data']['alltime']['heatmap'][atmotube][binSize], 'heatmap');
        } else {
          heatMapData[binSize] = await get_data(indexFile['data'][period.split(',')[0]][period.split(',')[1]]['heatmap'][atmotube][binSize], 'heatmap');
        };

        if (heatMapData[binSize]) {
          min[binSize] = {};
          max[binSize] = {};
          range[binSize] = {};
          ranges[binSize] = {};
          layers[binSize] = {};

          features.forEach(function(feature) {
            ranges[binSize][feature] = [];
            layers[binSize][feature] = L.layerGroup();
            if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
              layers[binSize][feature + ' (DAQI)'] = L.layerGroup();
            };
            min[binSize][feature] = Math.min(...heatMapData[binSize][feature]);
            max[binSize][feature] = Math.max(...heatMapData[binSize][feature]);
            range[binSize][feature] = max[binSize][feature] - min[binSize][feature];
            for (let i = 0; i <= 5; i++) {
              ranges[binSize][feature].push((min[binSize][feature] + range[binSize][feature] * 0.2 * i).toFixed(2));
            };
          });

          ranges[binSize]['PM2.5, ug/m3 (DAQI)'] = ['0.00', '11.49', '23.49', '35.49', '41.49', '47.49', '53.49', '58.49', '64.49', '70.49'];
          ranges[binSize]['PM10, ug/m3 (DAQI)'] = ['0.00', '16.49', '33.49', '50.49', '58.49', '66.49', '75.49', '83.49', '91.49', '100.49'];

          features.forEach(function(feature) {
            for (let i = 0; i < heatMapData[binSize]['latBottom'].length; i++) {
              const rectangle = [
                [heatMapData[binSize]['latBottom'][i], heatMapData[binSize]['longLeft'][i]],
                [heatMapData[binSize]['latTop'][i], heatMapData[binSize]['longRight'][i]]
              ];
              let tooltip = 'Latitude: ' + heatMapData[binSize]['latBottom'][i].toFixed(6) + ' to ' + heatMapData[binSize]['latTop'][i].toFixed(6) +
                '<br>Longitude: ' + heatMapData[binSize]['longLeft'][i].toFixed(5) + ' to ' + heatMapData[binSize]['longRight'][i].toFixed(5) +
                '<br>Mean PM1: ' + heatMapData[binSize]['PM1, ug/m3'][i].toFixed(2) +
                ' ug/m3<br>Mean PM2.5: ' + heatMapData[binSize]['PM2.5, ug/m3'][i].toFixed(2) +
                ' ug/m3<br>Mean PM10: ' + heatMapData[binSize]['PM10, ug/m3'][i].toFixed(2) +
                ' ug/m3<br>Mean VOC: ' + heatMapData[binSize]['VOC, ppm'][i].toFixed(2) +
                ' ppm<br>Number of observations: ' + heatMapData[binSize]['observations'][i] +
                '<br>First observation: ' + new Date(heatMapData[binSize]['start'][i]).toUTCString() +
                '<br>Last observation: ' + new Date(heatMapData[binSize]['end'][i]).toUTCString();
              if (heatMapData[binSize]['atmotubes'][i]) {
                tooltip += '<br>Number of Atmotubes: ' + heatMapData[binSize]['atmotubes'][i];
              };
              layers[binSize][feature].addLayer(L.rectangle(rectangle, {
                  color: colors[feature][getIndex(
                    parseFloat(heatMapData[binSize][feature][i].toFixed(2)), ranges[binSize][feature])],
                  weight: 0,
                  fillOpacity: 0.8
                })
                .bindTooltip(tooltip));
              if (feature == 'PM2.5, ug/m3' || feature == 'PM10, ug/m3') {
                layers[binSize][feature + ' (DAQI)'].addLayer(L.rectangle(rectangle, {
                    color: colors[feature + ' (DAQI)'][getIndex(
                      parseFloat(heatMapData[binSize][feature][i].toFixed(2)), ranges[binSize][feature + ' (DAQI)'])],
                    weight: 0,
                    fillOpacity: 0.4
                  })
                  .bindTooltip(tooltip));
              };
            };
          });
        };
      };

      if (heatMapData[5] && heatMapData[10] && heatMapData[50]) {
        if (period == 'alltime') {
          setBinSize('50');
        } else {
          setBinSize('10');
        };
        checkZoomLevel();
      };
    };

    map.spin(false);
    periodDropDown.removeAttribute('disabled');
    atmotubeDropDown.removeAttribute('disabled');

  };
  atmotubeDropDown.addEventListener("change", plotHeatMap);

  async function createPlots() {
    plotTimeSeries();
    await plotHeatMap();
  };
  periodDropDown.addEventListener("change", createPlots);
  createPlots();

});
