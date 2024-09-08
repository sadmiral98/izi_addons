function indexFields(label) {
    return result.fields.indexOf(label);
}

$(`#${idElm}`).append(`
    <div class="grid_container"></div>
`);

var all_values_by_id = [];
var all_frequency_by_id = [];
columns = self.formatTableColumns(result);
table_data.forEach((row) => {
    // Val
    var all_values = JSON.parse(row[indexFields('Values')]);
    all_values_by_id[row[indexFields('ID')]] = all_values;
    row[indexFields('Values')] = gridjs.html(`
        <div id="val-micro-${row[indexFields('ID')]}" class="micro-container"></div>
    `);
    // Freq
    var all_frequency = JSON.parse(row[indexFields('Frequency')]);
    all_frequency_by_id[row[indexFields('ID')]] = all_frequency;
    row[indexFields('Frequency')] = gridjs.html(`
        <div id="freq-micro-${row[indexFields('ID')]}" class="micro-container"></div>
    `);
});
// console.log(table_data);

var config = {
    columns: columns,
    data: table_data,
    sort: true,
    resizable: true,
    pagination: {
        limit: 10,
    },
    className: {
        td: 'custom-td',
        tr: 'custom-tr',
        th: 'custom-th',
        table: 'custom-table',
    },
    // style: {
    //     table: {
    //         'white-space': 'nowrap'
    //     }
    // },
    // search: true,
};
$(`#${idElm} .grid_container`).empty();
self.grid = new gridjs.Grid(config).render($(`#${idElm} .grid_container`).get(0));

// Micro Chart
var addMicroChartLine = function(config, containerId, endPointType) {
    var chart = am4core.create(containerId, am4charts.XYChart);
    chart.data = config.data;
    
    var dateAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    dateAxis.dataFields.category = config.dimension;
    dateAxis.renderer.grid.template.disabled = true;
    dateAxis.renderer.labels.template.disabled = true;
    dateAxis.startLocation = 0.5;
    if(endPointType == "full-endpoint"){
      dateAxis.endLocation = 0.8;
    }else{
      dateAxis.endLocation = 0.51;
    }
    dateAxis.cursorTooltipEnabled = false;
    
    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.minGridDistance = 23;
    valueAxis.renderer.grid.template.disabled = true;
    valueAxis.renderer.baseGrid.disabled = true;
    valueAxis.renderer.labels.template.disabled = true;
    valueAxis.cursorTooltipEnabled = false;
    // valueAxis.logarithmic = true;

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;
    chart.cursor.behavior = "none"
    chart.paddingTop = 0;
    chart.paddingBottom = 0;
    chart.paddingLeft = 0;
    chart.paddingRight = 0;
    
    var series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.categoryX = config.dimension;
    series.dataFields.valueY = config.metric[0];
    series.tooltipText = "{categoryX}: [bold]{valueY}";
    series.tooltip.pointerOrientation = "vertical";
    series.tensionX = 0.8;
    series.strokeWidth = 2;
    series.fillOpacity = 0.4;
    // self.configTooltipWhite(series);

    let fillModifier = new am4core.LinearGradientModifier();
    fillModifier.opacities = [1, 0];
    fillModifier.offsets = [0, 1];
    fillModifier.gradient.rotation = 90;
    series.segments.template.fillModifier = fillModifier;

    var bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.opacity = 0;
    bullet.circle.propertyFields.opacity = "opacity";
    bullet.circle.radius = 3;

    return chart;
}
var generateLineChart = function() {
    var charts = [];
    table_data.forEach((data, index) => {
        var elm_micro_id = `val-micro-${data[0]}`;
        if ($('#'+elm_micro_id).length) {
            var elm_data = all_values_by_id[data[indexFields('ID')]];
            
            var config = {};
            config.data = [];
            var dm = 0;
            elm_data.forEach(elm_value => {
                config.data.push({
                    'dimension': dm,
                    'total': elm_value,
                });
                dm += 1;
            });
            config.dimension = 'dimension';
            config.metric = ['total'];
            // console.log('Found', elm_micro_id, config);
            charts.push(addMicroChartLine(config, elm_micro_id, "full-endpoint"));
        }
        var freq_elm_micro_id = `freq-micro-${data[0]}`;
        if ($('#'+freq_elm_micro_id).length) {
            var freq_elm_data = all_frequency_by_id[data[indexFields('ID')]];
            
            var freq_config = {};
            freq_config.data = [];
            var freq_dm = 0;
            freq_elm_data.forEach(elm_value => {
                freq_config.data.push({
                    'dimension': freq_dm,
                    'freq': elm_value,
                });
                freq_dm += 1;
            });
            freq_config.dimension = 'dimension';
            freq_config.metric = ['freq'];
            // console.log('Found', freq_elm_micro_id, freq_config);
            charts.push(addMicroChartLine(freq_config, freq_elm_micro_id, "full-endpoint"));
        }
    });
}
// Load Micro Chart
// Set TimeOut 2 Second
setTimeout(function() {
    // Code to load Micro Chart
    am4core.disposeAllCharts();
    generateLineChart();
}, 500);


// Event Listener
$(`#${idElm}`).off('click', '.gridjs-pages button');
$(`#${idElm}`).on('click', '.gridjs-pages button', function() {
    am4core.disposeAllCharts();
    setTimeout(function() {
        // Code to load Micro Chart
        generateLineChart();
    }, 1000);
});

// $(`#${idElm}`).off('click', 'table');
// $(`#${idElm}`).on('click', 'table', function() {
//     am4core.disposeAllCharts();
//     setTimeout(function() {
//         // Code to load Micro Chart
//         generateLineChart();
//     }, 1000);
// });

$(`#${visual.idElm}`).append(`
    <style>
        #${idElm} {
            overflow-x: auto;
        }
        #${idElm} .micro-container {
            height: 50px;
            min-width: 100px;
            display: block;
        }
    <style>
`)