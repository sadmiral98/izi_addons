class amChartsComponentOld {
  //=======================================================
  // Heatmap (XY Chart)
  //=======================================================
  static makeHeatmapChart(
    idElm,
    chartTitle,
    chartData,
    categoryXName,
    categoryYName,
    seriesValue
  ) {
    // am4core.useTheme(am4themes_animated);
    var chart = am4core.create(idElm, am4charts.XYChart);

    chart.data = chartData;
    chart.maskBullets = false;

    var xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    var yAxis = chart.yAxes.push(new am4charts.CategoryAxis());

    xAxis.dataFields.category = categoryXName;
    yAxis.dataFields.category = categoryYName;

    xAxis.renderer.grid.template.disabled = true;
    xAxis.renderer.minGridDistance = 40;

    yAxis.renderer.grid.template.disabled = true;
    yAxis.renderer.inversed = true;
    yAxis.renderer.minGridDistance = 30;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryX = categoryXName;
    series.dataFields.categoryY = categoryYName;
    series.dataFields.value = seriesValue;
    series.sequencedInterpolation = true;
    series.defaultState.transitionDuration = 3000;

    series.tooltip.getFillFromObject = false;
    series.tooltip.getStrokeFromObject = true;
    series.tooltip.label.fill = am4core.color("black");

    var columnTemplate = series.columns.template;
    columnTemplate.strokeWidth = 1;
    columnTemplate.strokeOpacity = 1;
    columnTemplate.stroke = am4core.color("#ffffff");
    columnTemplate.tooltipText =
      "{" +
      categoryXName +
      "} ({" +
      categoryYName +
      "}) : {" +
      seriesValue +
      "}";
    columnTemplate.column.cornerRadius(3, 3, 3, 3);
    columnTemplate.width = am4core.percent(100);
    columnTemplate.height = am4core.percent(100);

    series.heatRules.push({
      target: columnTemplate,
      property: "fill",
      min: am4core.color("#67B7DC"),
      max: am4core.color("#444B92"),
    });

    // var bullet = series.bullets.push(new am4charts.LabelBullet());
    // bullet.label.text = "{hour}";
    // bullet.label.fill = am4core.color("#fff");
    // bullet.zIndex = 0;
    // bullet.interactionsEnabled = false;

    // // heat legend
    var heatLegend = chart.bottomAxesContainer.createChild(
      am4charts.HeatLegend
    );
    heatLegend.width = am4core.percent(100);
    heatLegend.series = series;
    heatLegend.valueAxis.renderer.labels.template.fontSize = 9;
    heatLegend.valueAxis.renderer.minGridDistance = 50;

    // heat legend behavior
    series.columns.template.events.on("over", (event) => {
      handleHover(event.target);
    });

    series.columns.template.events.on("hit", (event) => {
      handleHover(event.target);
    });

    function handleHover(column) {
      if (!isNaN(column.dataItem.value)) {
        heatLegend.valueAxis.showTooltipAt(column.dataItem.value);
      } else {
        heatLegend.valueAxis.hideTooltip();
      }
    }

    series.columns.template.events.on("out", (event) => {
      heatLegend.valueAxis.hideTooltip();
    });
  }
  //=======================================================
  // Treemap
  //=======================================================
  static makeTreemapChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue,
    grupName
  ) {
    var chart = am4core.create(idElm, am4charts.TreeMap);
    chart.hiddenState.properties.opacity = 0; // this makes initial fade in effect

    chart.data = chartData;

    chart.dataFields.name = categoryName;
    chart.dataFields.value = seriesValue;
    chart.dataFields.children = grupName;

    chart.zoomable = true;
    chart.maxLevels = 2;
    var bgColor = new am4core.InterfaceColorSet().getFor("background");
    chart.colors.step = 2;

    //   level 0 series template
    var level0SeriesTemplate = chart.seriesTemplates.create("0");
    var level0ColumnTemplate = level0SeriesTemplate.columns.template;

    level0ColumnTemplate.column.cornerRadius(3, 3, 3, 3);
    level0ColumnTemplate.fillOpacity = 0;
    level0ColumnTemplate.strokeWidth = 1;
    level0ColumnTemplate.strokeOpacity = 0;

    // level 1 series template
    var level1SeriesTemplate = chart.seriesTemplates.create("1");
    var level1ColumnTemplate = level1SeriesTemplate.columns.template;

    level1SeriesTemplate.tooltip.animationDuration = 0;
    level1SeriesTemplate.strokeOpacity = 1;

    level1ColumnTemplate.column.cornerRadius(3, 3, 3, 3);
    level1ColumnTemplate.fillOpacity = 1;
    level1ColumnTemplate.strokeWidth = 1;
    level1ColumnTemplate.stroke = bgColor;

    var bullet1 = level1SeriesTemplate.bullets.push(
      new am4charts.LabelBullet()
    );
    bullet1.locationY = 0.5;
    bullet1.locationX = 0.5;
    bullet1.label.text = "{name}";
    bullet1.label.fill = am4core.color("#ffffff");
  }
  //=======================================================
  // Table Progress
  //=======================================================
  static makeTableProgress(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var self = this;
    var color_fill = "#2B9EFF";
    var strokeWidth = 4;
    var radius = 10;
    var cx = 15;
    var cy = 15;
    
    var tableContentDOM = '';
    $.each(chartData, function (i) {
      tableContentDOM += `
        <div id ="tbl-list-` + i + `" class="tbl-list flex-row">
          <span class="tbl-name flex-1 text-left" >` + chartData[i][categoryName] + `</span>
          <span class="tbl-value" >` + chartData[i][seriesValue] + `%</span>
          <span class="tbl-circle">
            <svg class="circle-ring" width="100%" height="100%">
              <circle class="circle-grey" stroke="#F0F0F0" stroke-width="`+ strokeWidth +`" fill="transparent" r="`+ radius +`" cx="`+ cx +`" cy="`+ cy +`"/>
            </svg>
          </span>
        </div>`;
    });
    $("#" + idElm).append(`<div class="tbl-container">${tableContentDOM}</div>`);
    $.each(chartData, function (i) {
      self.microChartCircleProgress("tbl-list-" + i, ".circle-ring", "", i, chartData, seriesValue, color_fill, strokeWidth, radius, cx, cy);
    });
  }
  //=======================================================
  // Card Circle Progress
  //=======================================================
  static makeCircleProgressCard(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var self = this;
    var color_fill = "#2B9EFF";
    var strokeWidth = 0.5;
    var radius = 3;
    var cx = 5;
    var cy = 4;

    $( "#" + idElm ).wrapInner( "<div class='flex-row'></div>" );
    $.each(chartData, function (i) {
      $("#" + idElm).append(
        `<svg class="circle-ring" viewBox="0 0 10 10">
          <circle class="circle-grey" stroke="#F0F0F0" stroke-width="`+ strokeWidth +`" fill="transparent" r="`+ radius +`" cx="`+ cx +`" cy="`+ cy +`"/>
          <text x="`+ cx +`" y="`+ cy +`" text-anchor="middle" dy="0.38em" class="percentage">` + chartData[i][seriesValue] + `%</text>
          <text x="`+ cx +`" y="95%" text-anchor="middle" dy="" class="circle-name">` + chartData[i][categoryName] + `</text>
        </svg>`
      );
      $("#" + idElm + " .circle-ring").append(self.microChartCircleProgress(idElm, ".circle-ring", "", i, chartData, seriesValue, color_fill, strokeWidth, radius, cx, cy));
    });
  }

  //=======================================================
  // Line (MultiLine) Chart
  //=======================================================
  static makeLineChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";
    chart.cursor = new am4charts.XYCursor();
    chart.colors.step = 2;
    chart.exporting.menu = new am4core.ExportMenu();

    chart.data = chartData;

    if (categoryName.includes("date")) {
      var categoryAxis = chart.xAxes.push(new am4charts.DateAxis());
    } else {
      var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
      categoryAxis.dataFields.category = categoryName;
    }
    categoryAxis.renderer.minGridDistance = 50;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    // valueAxis.logarithmic = true;

    // Create series
    function createAxisAndSeries(field, name) {
      var series = chart.series.push(new am4charts.LineSeries());
      series.dataFields.valueY = field;

      if (categoryName.includes("date")) {
        series.dataFields.dateX = categoryName;
      } else {
        series.dataFields.categoryX = categoryName;
      }
      series.strokeWidth = 2;
      series.yAxis = valueAxis;
      series.name = name;
      series.tooltipText = "{name} : [bold]{valueY}[/]";

      // Make bullets on chart
      var bullet = series.bullets.push(new am4charts.CircleBullet());
      bullet.circle.strokeWidth = 2;
      bullet.circle.radius = 3.5;
      bullet.circle.fill = am4core.color("#fff");
    }

    seriesValue.forEach((obj, i) => {
      createAxisAndSeries(seriesValue[i][0], seriesValue[i][1]);
    });
  }
  //=======================================================
  // MultiLine () Chart
  //=======================================================
  static makeMultipleValueLine(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.legend = new am4charts.Legend();
    chart.cursor = new am4charts.XYCursor();

    chart.data = chartData;

    if (categoryName.includes("date")) {
      var categoryAxis = chart.xAxes.push(new am4charts.DateAxis());
    } else {
      var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
      categoryAxis.dataFields.category = categoryName;
    }
    categoryAxis.renderer.minGridDistance = 50;

    function createAxisAndSeries(field, name, opposite) {
      var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
      if (chart.yAxes.indexOf(valueAxis) != 0) {
        valueAxis.syncWithAxis = chart.yAxes.getIndex(0);
      }

      var series = chart.series.push(new am4charts.LineSeries());
      series.dataFields.valueY = field;
      if (categoryName.includes("date")) {
        series.dataFields.dateX = categoryName;
      } else {
        series.dataFields.categoryX = categoryName;
      }
      series.yAxis = valueAxis;
      series.tooltipText = "{name}: [bold]{valueY}[/]";
      series.name = name;
      series.strokeWidth = 1.5;
      series.tensionX = 0.85;
      series.showOnInit = true;

      // var interfaceColors = new am4core.InterfaceColorSet();
      // var bullet = series.bullets.push(new am4charts.CircleBullet());
      // bullet.circle.stroke = interfaceColors.getFor("background");
      // bullet.circle.strokeWidth = 2;

      valueAxis.renderer.line.strokeOpacity = 1;
      valueAxis.renderer.line.strokeWidth = 1;
      valueAxis.renderer.line.stroke = series.stroke;
      valueAxis.renderer.labels.template.fill = series.stroke;
      valueAxis.renderer.opposite = opposite;
    }

    seriesValue.forEach((obj, i) => {
      createAxisAndSeries(
        seriesValue[i][0],
        seriesValue[i][1],
        seriesValue[i][2]
      );
    });
  }
  //=======================================================
  // Bar & Line Chart
  //=======================================================
  static makeBarLineChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValueBar,
    seriesValueLine
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    chart.data = chartData;

    /* Axes */
    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.minGridDistance = 30;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    // valueAxis.logarithmic = true;

    var columnSeries = chart.series.push(new am4charts.ColumnSeries());
    columnSeries.name = seriesValueBar;
    columnSeries.dataFields.valueY = seriesValueBar;
    columnSeries.dataFields.categoryX = categoryName;
    columnSeries.tooltipText ="[bold]{name}[/] : {valueY}";
    columnSeries.tooltip.getFillFromObject = false;
    columnSeries.tooltip.getStrokeFromObject = true;
    columnSeries.tooltip.label.fill = am4core.color("black");
    columnSeries.tooltip.label.textAlign = "middle";

    var lineSeries = chart.series.push(new am4charts.LineSeries());
    lineSeries.name = seriesValueLine;
    lineSeries.dataFields.valueY = seriesValueLine;
    lineSeries.dataFields.categoryX = categoryName;
    // lineSeries.stroke = am4core.color("#fdd400");
    lineSeries.stroke = new am4core.InterfaceColorSet().getFor(
      "alternativeBackground"
    );
    lineSeries.strokeWidth = 2;
    lineSeries.tooltip.label.textAlign = "middle";
    lineSeries.tooltipText ="[bold]{name}[/] : {valueY}";
    lineSeries.tooltip.getFillFromObject = false;
    lineSeries.tooltip.getStrokeFromObject = true;
    lineSeries.tooltip.label.fill = am4core.color("black");
    // lineSeries.tooltip.background.fill = lineSeries.stroke;

    var bullet = lineSeries.bullets.push(new am4charts.Bullet());
    bullet.fill = lineSeries.stroke;
    var circle = bullet.createChild(am4core.Circle);
    circle.radius = 4;
    circle.fill = am4core.color("#fdd400");
    circle.strokeWidth = 2;
  }

  //=======================================================
  // Sorted Bar Chart
  //=======================================================
  static makeSortedBarChart(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    chart.data = chartData;

    var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.grid.template.disabled = true;
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.minGridDistance = 1;
    categoryAxis.renderer.inversed = true;

    var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryY = categoryName;
    series.dataFields.valueX = seriesValue;
    series.columns.template.strokeOpacity = 0;
    series.columns.template.column.cornerRadiusBottomRight = 3;
    series.columns.template.column.cornerRadiusTopRight = 3;
    series.tooltip.getFillFromObject = false;
    series.tooltip.background.fill = am4core.color("black");
    series.tooltip.pointerOrientation = "left";
    series.tooltipText = "{valueX}";

    let bullet = series.bullets.push(new am4charts.LabelBullet());
    bullet.dx = 20;
    bullet.label.text = "{valueX.value}";
    bullet.label.truncate = false;
    bullet.label.hideOversized = false;

    series.columns.template.adapter.add("fill", function (fill, target) {
      return chart.colors.getIndex(target.dataItem.index);
    });
    categoryAxis.sortBySeries = series;
  }
  //=======================================================
  // Stacked Bar Chart - Full(100%)
  //=======================================================
  static makeFullStackedBarChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.colors.step = 2;
    // chart.padding(0, 0, 0, 0);
    chart.legend = new am4charts.Legend();
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;
    // chart.cursor.lineX.disabled = true;

    chart.data = chartData;

    if (categoryName.includes("date")) {
      var categoryAxis = chart.xAxes.push(new am4charts.DateAxis());
    } else {
      var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
      categoryAxis.dataFields.category = categoryName;
    }
    categoryAxis.renderer.grid.template.location = 0;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.max = 100;
    valueAxis.strictMinMax = true;
    valueAxis.calculateTotals = true;
    valueAxis.renderer.minWidth = 50;
    valueAxis.cursorTooltipEnabled = false;

    function createSeries(value, name) {
      var series = chart.series.push(new am4charts.ColumnSeries());
      series.columns.template.width = am4core.percent(80);
      series.columns.template.tooltipText =
        "{name} : {valueY.totalPercent.formatNumber('#.0')}%";
      series.name = name;
      if (categoryName.includes("date")) {
        series.dataFields.dateX = categoryName;
        series.dataItems.template.locations.dateX = 0.5;
      } else {
        series.dataFields.categoryX = categoryName;
        series.dataItems.template.locations.categoryX = 0.5;
      }
      series.dataFields.valueY = value;
      series.dataFields.valueYShow = "totalPercent";
      series.stacked = true;
      // series.tooltip.pointerOrientation = "vertical";
      series.tooltip.getFillFromObject = false;
      series.tooltip.getStrokeFromObject = true;
      series.tooltip.label.fill = am4core.color("black");

      var bullet = series.bullets.push(new am4charts.LabelBullet());
      bullet.interactionsEnabled = false;
      bullet.label.text = "{valueY.totalPercent.formatNumber('#.')}%";
      bullet.label.fill = am4core.color("#ffffff");
      bullet.locationY = 0.5;
    }

    seriesValue.forEach((obj, i) => {
      createSeries(seriesValue[i][0], seriesValue[i][1]);
    });
  }
  //=======================================================
  // Vertical Stacked Bar Chart
  //=======================================================
  static makeVerticalStackedBarChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;
    // chart.legend = new am4charts.Legend();
    chart.colors.step = 2;
    chart.numberFormatter.numberFormat = "#.#";
    chart.responsive.enabled = true;

    const chartDataExtend = chartData.map((v) => ({ ...v, none: 0 }));
    chart.data = chartDataExtend;

    if (categoryName.includes("date")) {
      var categoryAxis = chart.xAxes.push(new am4charts.DateAxis());
      //3eerewr
    } else {
      var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
      categoryAxis.dataFields.category = categoryName;
    }
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.minGridDistance = 30;

    // categoryAxis.events.on("sizechanged", function (ev) {
    //   var axis = ev.target;
    //   var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
    //   if (cellWidth < axis.renderer.labels.template.maxWidth && cellWidth >= axis.renderer.labels.template.maxWidth - 85) {
    //     axis.renderer.labels.template.rotation = -45;
    //     axis.renderer.labels.template.horizontalCenter = "right";
    //     axis.renderer.labels.template.verticalCenter = "middle";
    //   } else if (cellWidth < axis.renderer.labels.template.maxWidth - 85) {
    //     axis.renderer.labels.template.rotation = -90;
    //   } else {
    //     axis.renderer.labels.template.rotation = 0;
    //     axis.renderer.labels.template.horizontalCenter = "middle";
    //     axis.renderer.labels.template.verticalCenter = "top";
    //   }
    // });
    // var categoryLabel = categoryAxis.renderer.labels.template;
    // categoryLabel.maxWidth = 110;
    // categoryLabel.truncate = true;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.extraMax = 0.1;
    valueAxis.calculateTotals = true;

    function createSeries(value, name) {
      var series = chart.series.push(new am4charts.ColumnSeries());
      series.name = name;
      series.dataFields.valueY = value;

      if (categoryName.includes("date")) {
        series.dataFields.dateX = categoryName;
        series.dataItems.template.locations.dateX = 0.5;
      } else {
        series.dataFields.categoryX = categoryName;
        series.dataItems.template.locations.categoryX = 0.5;
      } 

      series.sequencedInterpolation = true;
      series.stacked = true; //forStacked
      series.columns.template.width = am4core.percent(60);
      series.columns.template.column.adapter.add("cornerRadiusTopLeft",cornerRadius);
      series.columns.template.column.adapter.add("cornerRadiusTopRight",cornerRadius);
      series.tooltip.getFillFromObject = false;
      series.tooltip.getStrokeFromObject = true;
      series.tooltip.label.fill = am4core.color("black");
      series.tooltipText = "{name} : {valueY}";
      return series;
    }

    seriesValue.forEach((obj, i) => {
      createSeries(seriesValue[i][0], seriesValue[i][1]);
    });

    var totalSeries = chart.series.push(new am4charts.ColumnSeries());
    totalSeries.dataFields.valueY = "none";
    if (categoryName.includes("date")) {
      totalSeries.dataFields.dateX = categoryName;
    } else {
      totalSeries.dataFields.categoryX = categoryName;
    } 
    totalSeries.stacked = true;
    totalSeries.hiddenInLegend = true;
    totalSeries.columns.template.strokeOpacity = 0;
    totalSeries.tooltip.getFillFromObject = false;
    totalSeries.tooltip.background.fill = am4core.color("black");
    totalSeries.tooltip.pointerOrientation = "vertical";
    totalSeries.tooltipText = "Total : {valueY.total}";

    var totalBullet = totalSeries.bullets.push(new am4charts.LabelBullet());
    totalBullet.dy = -8;
    totalBullet.label.text = "{valueY.total}";
    totalBullet.label.hideOversized = false;
    totalBullet.label.fontSize = 18;

    function cornerRadius(radius, item) {
      var dataItem = item.dataItem;
      var lastSeries;
      chart.series.each(function (series) {
        if (
          dataItem.dataContext[series.dataFields.valueY] &&
          !series.isHidden &&
          !series.isHiding
        ) {
          lastSeries = series;
        }
      });
      return dataItem.component == lastSeries ? 3 : radius;
    }
  }
  //=======================================================
  // Horizontal Stacked Bar Chart
  //=======================================================
  static makeHorizontalStackedBarChart(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.colors.step = 3;
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";
    
    const chartDataExtend = chartData.map(v => ({...v, none : 0,}));
    chart.data = chartDataExtend;

    var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.grid.template.opacity = 0;

    var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.ticks.template.strokeOpacity = 0.5;
    valueAxis.renderer.ticks.template.stroke = am4core.color("#495C43");
    valueAxis.renderer.ticks.template.length = 10;
    valueAxis.renderer.line.strokeOpacity = 0.5;
    valueAxis.renderer.minGridDistance = 40;
    valueAxis.extraMax = 0.1;
    valueAxis.calculateTotals = true;

    function createSeries(value, name) {
      var series = chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueX = value;
      series.dataFields.categoryY = categoryName;
      series.stacked = true;
      series.name = name;
      series.columns.template.width = am4core.percent(60);
      series.columns.template.tooltipText = "[bold]{name}[/] ( {categoryY} )\n[font-size:14px]{valueX}";

    //   var labelBullet = series.bullets.push(new am4charts.LabelBullet());
    //   labelBullet.locationX = 0.5;
    //   labelBullet.label.text = "{valueX}";
    //   labelBullet.label.fill = am4core.color("#fff");
      // return series;
    }
    seriesValue.forEach((obj, i) => {
      createSeries(seriesValue[i][0], seriesValue[i][1]);
    });

    let totalSeries = chart.series.push(new am4charts.ColumnSeries());
    totalSeries.dataFields.valueX = "none";
    totalSeries.dataFields.categoryY = categoryName;
    totalSeries.stacked = true;
    totalSeries.name = "Total Value";
    totalSeries.columns.template.strokeWidth = 0;  
    totalSeries.hiddenInLegend = true;

    let totalBullet = totalSeries.bullets.push(new am4charts.LabelBullet());
    totalBullet.dx = 20;
    totalBullet.label.text = "{valueX.total}";
    totalBullet.label.truncate = false;
    totalBullet.label.hideOversized = false;
    totalBullet.label.fontSize = 18;    
  }
  //=======================================================
  // Divergent Stacked Bar Chart
  //=======================================================
  static makeDivergentStackedBarChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValueBar,
    seriesValueLine
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.legend = new am4charts.Legend();
    chart.cursor = new am4charts.XYCursor();

    var interfaceColors = new am4core.InterfaceColorSet();
    var positiveColor = interfaceColors.getFor("positive");
    var negativeColor = interfaceColors.getFor("negative");

    chart.data = chartData;

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.grid.template.location = 0;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.renderer.ticks.template.length = 5;
    valueAxis.renderer.ticks.template.disabled = false;
    valueAxis.renderer.ticks.template.strokeOpacity = 0.4;

    function createSeries(field, name, color) {
      var series = chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueY = field;
      series.dataFields.categoryX = categoryName;
      series.stacked = true;
      series.name = name;
      series.tooltipText = "{name} : {valueY}";
      if (color != null) {
        if (color == "positiveColor") {
          color = positiveColor;
        } else if (color == "negativeColor") {
          color = negativeColor;
        }
        series.stroke = color;
        series.fill = color;
      }
      return series;
    }

    seriesValueBar.forEach((obj, i) => {
      createSeries(
        seriesValueBar[i][0],
        seriesValueBar[i][1],
        seriesValueBar[i][2]
      );
    });

    var lineSeries = chart.series.push(new am4charts.LineSeries());
    lineSeries.name = seriesValueLine;
    lineSeries.dataFields.valueY = seriesValueLine;
    lineSeries.dataFields.categoryX = categoryName;
    lineSeries.stroke = new am4core.InterfaceColorSet().getFor(
      "alternativeBackground"
    );
    lineSeries.strokeWidth = 2;
    lineSeries.tensionX = 0.8;
    lineSeries.tooltip.label.textAlign = "middle";
    lineSeries.tooltipText = "{name} : {valueY}";
    lineSeries.tooltip.getFillFromObject = false;
    lineSeries.tooltip.background.fill = lineSeries.stroke;

    var lineBullet = lineSeries.bullets.push(new am4charts.CircleBullet());
    lineBullet.fill = lineSeries.stroke;
    var circle = lineBullet.createChild(am4core.Circle);
    circle.radius = 4;
    circle.fill = am4core.color("#fdd400");
    circle.strokeWidth = 1;
    circle.strokeOpacity = 0.8;
  }
  //=======================================================
  // Clustered Bar Chart
  //=======================================================
  static makeClusteredBarChart2(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;
    chart.colors.step = 2;
    chart.legend = new am4charts.Legend();

    chart.data = chartData;

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.minGridDistance = 30;
    categoryAxis.renderer.cellStartLocation = 0.1;
    categoryAxis.renderer.cellEndLocation = 0.9;

    categoryAxis.events.on("sizechanged", function (ev) {
      var axis = ev.target;
      var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
      if (cellWidth < axis.renderer.labels.template.maxWidth - 35 && cellWidth >= axis.renderer.labels.template.maxWidth - 70) {
        axis.renderer.labels.template.rotation = -45;
        axis.renderer.labels.template.horizontalCenter = "right";
        axis.renderer.labels.template.verticalCenter = "middle";
      } else if (cellWidth < axis.renderer.labels.template.maxWidth - 70) {
        axis.renderer.labels.template.rotation = -90;
      } else {
        axis.renderer.labels.template.rotation = 0;
        axis.renderer.labels.template.horizontalCenter = "middle";
        axis.renderer.labels.template.verticalCenter = "top";
      }
    });

    var label = categoryAxis.renderer.labels.template;
    label.maxWidth = 110;
    label.truncate = true;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;

    function createSeries(value, name) {
      var series = chart.series.push(new am4charts.ColumnSeries());
      series.dataFields.valueY = value;
      series.dataFields.categoryX = categoryName;
      series.name = name;
      series.columns.template.column.cornerRadiusTopLeft = 3;
      series.columns.template.column.cornerRadiusTopRight = 3;
    
      series.tooltip.getFillFromObject = false;
      series.tooltip.getStrokeFromObject = true;
      series.tooltip.label.fill = am4core.color("black");
      series.tooltip.label.textAlign = "middle";
      series.tooltip.pointerOrientation = "down";
      series.tooltipText = "{name} : {valueY}";
    
      series.events.on("hidden", arrangeColumns);
      series.events.on("shown", arrangeColumns);
      return series;
    }

    function arrangeColumns() {
      var series = chart.series.getIndex(0);
      var w = 1 - categoryAxis.renderer.cellStartLocation - (1 - categoryAxis.renderer.cellEndLocation);
      if (series.dataItems.length > 1) {
        var x0 = categoryAxis.getX(series.dataItems.getIndex(0), "categoryX");
        var x1 = categoryAxis.getX(series.dataItems.getIndex(1), "categoryX");
        var delta = ((x1 - x0) / chart.series.length) * w;
        if (am4core.isNumber(delta)) {
          var middle = chart.series.length / 2;
          var newIndex = 0;
          chart.series.each(function (series) {
            if (!series.isHidden && !series.isHiding) {
              series.dummyData = newIndex;
              newIndex++;
            } else {
              series.dummyData = chart.series.indexOf(series);
            }
          });
          var visibleCount = newIndex;
          var newMiddle = visibleCount / 2;
          chart.series.each(function (series) {
            var trueIndex = chart.series.indexOf(series);
            var newIndex = series.dummyData;
            var dx = (newIndex - trueIndex + middle - newMiddle) * delta;
            series.animate(
              { property: "dx", to: dx },
              series.interpolationDuration,
              series.interpolationEasing
            );
            series.bulletsContainer.animate(
              { property: "dx", to: dx },
              series.interpolationDuration,
              series.interpolationEasing
            );
          });
        }
      }
    }

    seriesValue.forEach((obj, i) => {
      createSeries(seriesValue[i][0], seriesValue[i][1]);
    });
  }
  //=======================================================
  // Clustered Bar Chart
  //=======================================================
  static makeClusteredBarChart(idElm, chartData, dimensionName, measureNames) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    am4core.useTheme(am4themes_animated);
    chart.colors.step = 1;
    chart.legend = new am4charts.Legend()
    chart.legend.position = 'top'
    chart.legend.paddingBottom = 20
    chart.legend.labels.template.maxWidth = 95
    chart.legend.useDefaultMarker = true;
    var marker = chart.legend.markers.template.children.getIndex(0);
    marker.cornerRadius(12, 12, 12, 12);
    marker.strokeWidth = 0;
    marker.strokeOpacity = 1;
    var markerTemplate = chart.legend.markers.template;
    markerTemplate.width = 15;
    markerTemplate.height = 15;

    var xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = dimensionName
    xAxis.renderer.cellStartLocation = 0.1
    xAxis.renderer.cellEndLocation = 0.9
    xAxis.renderer.grid.template.location = 0;

    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.min = 0;

    function createSeries(value, name) {
        var series = chart.series.push(new am4charts.ColumnSeries())
        series.dataFields.valueY = value
        series.dataFields.categoryX = dimensionName
        series.name = name

        series.events.on("hidden", arrangeColumns);
        series.events.on("shown", arrangeColumns);
        series.columns.template.tooltipText = "{categoryX}: {valueY.value}";
        series.columns.template.strokeOpacity = 0;

        return series;
    }

    chart.data = chartData;
    measureNames.forEach(measureName => {
        createSeries(measureName, measureName);
    });
    function arrangeColumns() {
        var series = chart.series.getIndex(0);
        var w = 1 - xAxis.renderer.cellStartLocation - (1 - xAxis.renderer.cellEndLocation);
        if (series.dataItems.length > 1) {
            var x0 = xAxis.getX(series.dataItems.getIndex(0), "categoryX");
            var x1 = xAxis.getX(series.dataItems.getIndex(1), "categoryX");
            var delta = ((x1 - x0) / chart.series.length) * w;
            if (am4core.isNumber(delta)) {
                var middle = chart.series.length / 2;
                var newIndex = 0;
                chart.series.each(function(series) {
                    if (!series.isHidden && !series.isHiding) {
                        series.dummyData = newIndex;
                        newIndex++;
                    }
                    else {
                        series.dummyData = chart.series.indexOf(series);
                    }
                })
                var visibleCount = newIndex;
                var newMiddle = visibleCount / 2;

                chart.series.each(function(series) {
                    var trueIndex = chart.series.indexOf(series);
                    var newIndex = series.dummyData;

                    var dx = (newIndex - trueIndex + middle - newMiddle) * delta

                    series.animate({ property: "dx", to: dx }, series.interpolationDuration, series.interpolationEasing);
                    series.bulletsContainer.animate({ property: "dx", to: dx }, series.interpolationDuration, series.interpolationEasing);
                })
            }
        }
    }
    return chart;
  }
  //=======================================================
  // Pareto Chart
  //=======================================================
  static makeParetoChart(
    idElm,
    chartTitle,
    chartData,
    categoryName,
    seriesValue
  ) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    // Add data
    chart.data = chartData;

    prepareParetoData();
    function prepareParetoData() {
      var total = 0;
      for (var i = 0; i < chart.data.length; i++) {
        var value = chart.data[i][seriesValue];
        total += value;
      }
      var sum = 0;
      for (var i = 0; i < chart.data.length; i++) {
        var value = chart.data[i][seriesValue];
        sum += value;
        chart.data[i].pareto = (sum / total) * 100;
      }
    }

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.minGridDistance = 60;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.renderer.minWidth = 50;
    valueAxis.min = 50;
    valueAxis.cursorTooltipEnabled = false;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.sequencedInterpolation = true;
    series.dataFields.valueY = seriesValue;
    series.dataFields.categoryX = categoryName;
    series.tooltipText = "[{categoryX}: bold]{valueY}[/]";
    series.columns.template.strokeWidth = 0;
    series.tooltip.pointerOrientation = "vertical";
    series.columns.template.column.cornerRadiusTopLeft = 3;
    series.columns.template.column.cornerRadiusTopRight = 3;

    series.columns.template.adapter.add("fill", function (fill, target) {
      return chart.colors.getIndex(target.dataItem.index);
    });

    var paretoValueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    paretoValueAxis.renderer.opposite = true;
    paretoValueAxis.min = 0;
    paretoValueAxis.max = 100;
    paretoValueAxis.strictMinMax = true;
    paretoValueAxis.renderer.grid.template.disabled = true;
    paretoValueAxis.numberFormatter = new am4core.NumberFormatter();
    paretoValueAxis.numberFormatter.numberFormat = "#'%'";
    paretoValueAxis.cursorTooltipEnabled = false;

    var paretoSeries = chart.series.push(new am4charts.LineSeries());
    paretoSeries.dataFields.valueY = "pareto";
    paretoSeries.dataFields.categoryX = categoryName;
    paretoSeries.yAxis = paretoValueAxis;
    paretoSeries.tooltipText = "pareto : {valueY.formatNumber('#.0')}%[/]";
    paretoSeries.tooltip.getFillFromObject = false;
    paretoSeries.tooltip.background.fill = am4core.color("#fdd400");
    paretoSeries.strokeWidth = 2;
    paretoSeries.stroke = new am4core.InterfaceColorSet().getFor(
      "alternativeBackground"
    );
    paretoSeries.strokeOpacity = 0.8;

    var paretoBullet = paretoSeries.bullets.push(new am4charts.CircleBullet());
    paretoBullet.fill = paretoSeries.stroke;
    var circle = paretoBullet.createChild(am4core.Circle);
    circle.radius = 4;
    circle.fill = am4core.color("#fdd400");
    circle.strokeWidth = 1;
    circle.strokeOpacity = 0.8;
  }
  //=======================================================
  // Bubble Chart
  //=======================================================
  static makeBubbleChart(idElm, chartTitle, chartData, seriesValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.colors.step = 2;
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.behavior = "zoomXY";
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";

    chart.data = chartData;

    var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.renderer.minGridDistance = 50;
    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.renderer.minGridDistance = 50;

    function createSeries(x, y, value, name) {
      var series = chart.series.push(new am4charts.LineSeries());
      series.dataFields.valueY = y;
      series.dataFields.valueX = x;
      series.dataFields.value = value;
      series.name = name;
      series.strokeOpacity = 0;
      series.tooltip.pointerOrientation = "vertical";

      var bullet = series.bullets.push(new am4charts.CircleBullet());
      bullet.fillOpacity = 0.8;
      bullet.strokeWidth = 1.2;
      bullet.stroke = am4core.color("#ffffff");
      bullet.hiddenState.properties.opacity = 0;
      bullet.tooltipText =
        value + ": {value} \n" + x + " : {valueX} | " + y + " : {valueY}";
      series.heatRules.push({
        target: bullet.circle,
        min: 10,
        max: 60,
        property: "radius",
      });

      var hoverState = bullet.states.create("hover");
      hoverState.properties.fillOpacity = 1;
      hoverState.properties.strokeOpacity = 1;
    }
    seriesValue.forEach((obj, i) => {
      createSeries(
        seriesValue[i][0],
        seriesValue[i][1],
        seriesValue[i][2],
        seriesValue[i][3]
      );
    });
  }
  //=======================================================
  // Scatterplot Chart
  //=======================================================
  static makeScatterChart(idElm, chartTitle, chartData, seriesValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.colors.step = 2;
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.behavior = "zoomXY";
    chart.legend = new am4charts.Legend();
    // chart.legend.position = "right";

    chart.data = chartData;

    var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.renderer.minGridDistance = 40;
    var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.renderer.minGridDistance = 40;

    function createSeries(x, y, name) {
      var series = chart.series.push(new am4charts.LineSeries());
      series.name = name;
      series.dataFields.valueX = x;
      series.dataFields.valueY = y;
      series.strokeOpacity = 0;
      series.tooltip.label.textAlign = "middle";

      var bullet = series.bullets.push(new am4charts.CircleBullet());
      bullet.tooltipText = x + ": {valueX} \n " + y + ": {valueY}";
      var circle = bullet.createChild(am4core.Circle);
      circle.radius = 4;
      circle.fill = new am4core.InterfaceColorSet().getFor("background");
      circle.strokeWidth = 1;

      var hoverState = circle.states.create("hover");
      hoverState.properties.fill = series.fill;

      var lineTrend = chart.series.push(new am4charts.LineSeries());
      lineTrend.dataFields.valueY = y;
      lineTrend.dataFields.valueX = x;
      lineTrend.strokeWidth = 2;
      lineTrend.strokeOpacity = 0.5;
      lineTrend.name = name + "'s Trends";
      lineTrend.plugins.push(new am4plugins_regression.Regression());
      // lineTrend.method = "polynomial";
      lineTrend.simplify = true;
      lineTrend.reorder = true;
      lineTrend.tensionX = 0.9;
      lineTrend.tensionY = 0.9;
    }

    seriesValue.forEach((obj, i) => {
      createSeries(seriesValue[i][0], seriesValue[i][1], seriesValue[i][2]);
    });
  }
  //=======================================================
  // Nested Sunburst
  //=======================================================
  static makeSunburstChart(
    idElm,
    chartTitle,
    chartData,
    seriesName,
    seriesValue,
    seriesChild
  ) {
    var chart = am4core.create(idElm, am4plugins_sunburst.Sunburst);
    chart.colors.step = 2;
    chart.fontSize = 11;
    chart.innerRadius = am4core.percent(35);
    chart.radius = am4core.percent(80);
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";

    chart.data = chartData;
    chart.dataFields.name = seriesName;
    chart.dataFields.value = seriesValue;
    chart.dataFields.children = seriesChild;

    var series = new am4plugins_sunburst.SunburstSeries();
    chart.seriesTemplates.setKey("0", series);
    series.slices.template.states.getKey("hover").properties.shiftRadius = 0;
    series.slices.template.states.getKey("hover").properties.scale = 0.95;
    series.labels.template.disabled = true;

    var series1 = new am4plugins_sunburst.SunburstSeries();
    chart.seriesTemplates.setKey("1", series1);
    series1.fillOpacity = 0.7;
    series1.hiddenInLegend = true;
    series1.labels.template.inside = false;
    series1.labels.template.fill = am4core.color("#000");
    series1.labels.template.disabled = true;

    var labelTotal = series1.createChild(am4core.Label);
    labelTotal.text = "{values.value.sum}";
    labelTotal.horizontalCenter = "middle";
    labelTotal.verticalCenter = "middle";
    labelTotal.fontSize = 30;
  }
  //=======================================================
  // Pie Chart
  //=======================================================
  static makePieChart(idElm, title, data, keyLabel, keyValue, useLegend=false) {
    var chart = am4core.create(idElm, am4charts.PieChart);

    var pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = keyValue;
    pieSeries.dataFields.category = keyLabel;

    chart.innerRadius = am4core.percent(30);
    chart.radius = am4core.percent(80);

    pieSeries.slices.template.stroke = am4core.color("#fff");
    pieSeries.slices.template.fillOpacity = 1;
    pieSeries.slices.template.strokeWidth = 2;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template
    .cursorOverStyle = [
        {
        "property": "cursor",
        "value": "pointer"
        }
    ];

    pieSeries.alignLabels = false;
    pieSeries.labels.template.maxWidth = 70;
    pieSeries.labels.template.wrap = true;
    // pieSeries.labels.template.truncate = true;
    // pieSeries.labels.template.bent = true;
    pieSeries.labels.template.radius = 8;
    pieSeries.labels.template.padding(0,0,0,0);
    pieSeries.labels.template.text = "{category}";
    pieSeries.labels.template.fontSize = 9;

    pieSeries.ticks.template.disabled = true;

    pieSeries.ticks.template.events.on("ready", hideSmall);
    pieSeries.ticks.template.events.on("visibilitychanged", hideSmall);
    pieSeries.labels.template.events.on("ready", hideSmall);
    pieSeries.labels.template.events.on("visibilitychanged", hideSmall);

    function hideSmall(ev) {
        if (ev.target.dataItem.values.value.percent < 10) {
            ev.target.hide();
        }
        else {
            ev.target.show();
        }
    }

    var shadow = pieSeries.slices.template.filters.push(new am4core.DropShadowFilter);
    shadow.opacity = 0;

    var hoverState = pieSeries.slices.template.states.getKey("hover"); // normally we have to create the hover state, in this case it already exists

    var hoverShadow = hoverState.filters.push(new am4core.DropShadowFilter);
    hoverShadow.opacity = 0.7;
    hoverShadow.blur = 5;

    if (useLegend) {
        chart.legend = new am4charts.Legend();
    }

    chart.data = data;

    return chart;
  }
  //=======================================================
  // Semi Pie / Donut Chart
  //=======================================================
  static makeSemiDonutChart(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.PieChart);
    chart.legend = new am4charts.Legend();
    chart.legend.position = "right";
    chart.radius = am4core.percent(80);
    chart.innerRadius = am4core.percent(50);
    chart.startAngle = 180;
    chart.endAngle = 360;
    
    chart.data = chartData;
    
    var series = chart.series.push(new am4charts.PieSeries());
    series.colors.step = 2;
    series.dataFields.value = seriesValue;
    series.dataFields.category = categoryName;
    series.alignLabels = false;
    series.slices.template.cornerRadius = 5;
    series.slices.template.innerCornerRadius = 5;
    series.slices.template.stroke = am4core.color("#ffffff");
    series.slices.template.strokeWidth = 1;
    series.hiddenState.properties.startAngle = 90;
    series.hiddenState.properties.endAngle = 90;

    series.labels.template.disabled = true;
    series.ticks.template.disabled = true;

    var labelTotal = series.createChild(am4core.Label);
    labelTotal.text = "{values.value.sum}";
    labelTotal.horizontalCenter = "middle";
    labelTotal.verticalCenter = "middle";
    labelTotal.fontSize = 100;
  }
  //=======================================================
  // Funnel Chart
  //=======================================================
  static makeFunnelChart(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.SlicedChart);
    // chart.legend = new am4charts.Legend();
    // chart.legend.position = "right";
    // chart.legend.valign = "bottom";
    // chart.legend.margin(5,5,20,5);

    chart.data = chartData;

    var series = chart.series.push(new am4charts.FunnelSeries());
    series.colors.step = 2;
    series.dataFields.value = seriesValue;
    series.dataFields.category = categoryName;
    series.alignLabels = true;
    series.labelsOpposite = false;
    // series.orientation = "horizontal";
    // series.bottomRatio = 1;
  }
  //=======================================================
  // Solid Gauge Chart
  //=======================================================
  static makeSolidGaugeChart(idElm,chartTitle,chartData,categoryName,seriesValue) {
    var chart = am4core.create(idElm, am4charts.RadarChart);
    chart.startAngle = -90;
    chart.endAngle = 180;
    chart.innerRadius = am4core.percent(20);
    chart.numberFormatter.numberFormat = "#.#'%'";
    chart.cursor = new am4charts.RadarCursor();

    const chartDataExtend = chartData.map(v => ({...v, full : 100,}));
    chart.data = chartDataExtend;

    var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.grid.template.strokeOpacity = 0;
    categoryAxis.renderer.labels.template.horizontalCenter = "right";
    categoryAxis.renderer.labels.template.fontWeight = 500;
    categoryAxis.renderer.labels.template.adapter.add("fill", function(fill, target) {
      return (target.dataItem.index >= 0) ? chart.colors.getIndex((target.dataItem.index)+1) : fill;
    });
    categoryAxis.renderer.minGridDistance = 10;

    var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.renderer.grid.template.strokeOpacity = 0;
    valueAxis.min = 0;
    valueAxis.max = 100;
    valueAxis.strictMinMax = true;

    var series = chart.series.push(new am4charts.RadarColumnSeries());
    series.dataFields.valueX = "full";
    series.dataFields.categoryY = categoryName;
    series.columns.template.fill = new am4core.InterfaceColorSet().getFor("alternativeBackground");
    series.columns.template.fillOpacity = 0.08;
    series.columns.template.strokeWidth = 0;
    series.columns.template.radarColumn.cornerRadius = 20;

    var series1 = chart.series.push(new am4charts.RadarColumnSeries());
    series1.dataFields.valueX = seriesValue;
    series1.dataFields.categoryY = categoryName;
    series1.clustered = false;
    series1.columns.template.strokeWidth = 0;
    series1.columns.template.tooltipText = "{categoryY} : [bold]{valueX}[/]";
    series1.columns.template.radarColumn.cornerRadius = 20;
    series1.columns.template.adapter.add("fill", function(fill, target) {
      return chart.colors.getIndex((target.dataItem.index)+1);
    });
  }

  //=======================================================
  // Scorecard - Basic
  //=======================================================
  static makeScorecardBasic(idElm,cardTitle, cardValue, currencySymbol, particle, growthNum, imageUrl = false) {
    var elmDom = "";
    if(imageUrl){
      elmDom = `
      <div class="scorecard-img-container flex-1" style="">
        <img src="`+ imageUrl +`" alt="" class="scorecard-img">
      </div>
      `
    }
    $("#" + idElm).addClass("flex-body scorecard scorecard-sm");
    $("#" + idElm).css("border-left","3px solid #2B9EFF");
    $("#" + idElm).append(
      `
        <div class="flex-column flex-2">
          <div class="flex-row">
            <span class="scorecard-title">`+ cardTitle +`</span>
            <div class="scorecard-status label">`+ Math.abs(growthNum) +`</div>
          </div>
          <div class="flex-row">
            <div class="scorecard-value">`+ currencySymbol + cardValue.toLocaleString("id-ID") +`</div>
            <small class="scorecard-particle">`+ particle +`</small>
          </div>
        </div>
        ${elmDom}
      `
    );
    this.cmpLabelGrowth(idElm, ".scorecard-status", growthNum);

    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });
  }

  //=======================================================
  // Scorecard Growth - with microchart (line)
  //=======================================================
  static makeScorecardGrowthLine(idElm,cardTitle,cardData,categoryName, seriesValue, currencySymbol, particle) {
    (cardData[cardData.length - 1])["opacity"]= 1;
    let recentValue = (cardData[cardData.length - 1])[seriesValue];
    let previousValue = (cardData[cardData.length - 2])[seriesValue];
    let growthNumBase = (recentValue - previousValue) / previousValue * 100;
    let growthNum = Math.round(growthNumBase);
    
    $("#" + idElm).addClass("flex-body scorecard scorecard-sm");
    $("#" + idElm).css("border-left","3px solid #2B9EFF");
    $("#" + idElm).append(
      `
        <div class="flex-column flex-3">
          <div class="flex-row">
            <span class="scorecard-title">`+ cardTitle +`</span>
            <div class="scorecard-status label">`+ growthNum +`</div>
          </div>
          <div class="flex-row">
            <div class="scorecard-value">`+ currencySymbol + recentValue.toLocaleString("id-ID") +`</div>
            <small class="scorecard-particle">`+ particle +`</small>
          </div>
        </div>
        <div class="scorecard-chart flex-1" style="height: 78%; padding-right: 3px;"></div>
      `
    );
    this.microChartLine(idElm, ".scorecard-chart", cardData, categoryName, seriesValue, "full-endpoint");
    this.cmpLabelGrowth(idElm, ".scorecard-status", growthNum);

    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });
  }

  //=======================================================
  // Scorecard Circle Progress
  //=======================================================
  static makeScorecardProgress(idElm, cardTitle, imageURL, recentValue, targetValue) {
    let progressNumBase = recentValue / targetValue * 100;
    if (isNaN(progressNumBase)) {
      progressNumBase = 0;
    }

    let progressNum = Math.round(progressNumBase);
    var recentValue = Number(recentValue);
    var targetValue = Number(targetValue);

    var color_fill = "#2B9EFF";
    var strokeWidth = 0.6;
    var radius = 4;
    var cx = 5;
    var cy = 5;

    $("#" + idElm).addClass("flex-body scorecard scorecard-sm");
    $("#" + idElm).css("border-left","3px solid #2B9EFF");
    var elmDom = `
      <div class="flex-column flex-1">
          <div class="flex-row">
            <span class="scorecard-title">${cardTitle}</span>
          </div>
        <div class="flex-row">
          <div class="scorecard-value">`+ recentValue.toLocaleString("id-ID") +`</div>
          <small class="scorecard-particle"> / `+ targetValue.toLocaleString("id-ID") +`</small>
        </div>
      </div>
    `;
    if (imageURL) {
      elmDom = `
        <div class="flex-row flex-1">
            <div class="flex-column flex-1">
              <img class="scorecard-title-img" src="${imageURL}"/>
            </div>
          <div class="flex-column flex-1" style="text-align:left;">
            <div class="scorecard-value">`+ recentValue.toLocaleString("id-ID") +`</div>
            <small class="scorecard-particle" style="margin: 0;">`+ targetValue.toLocaleString("id-ID") +`</small>
          </div>
        </div>
      `;
    }
    $("#" + idElm).append(
      `
        ${elmDom}
        <svg class="circle-ring" viewBox="0 0 10 10">
          <circle class="circle-grey" stroke="#F0F0F0" stroke-width="`+ strokeWidth +`" fill="transparent" r="`+ radius +`" cx="`+ cx +`" cy="`+ cy +`"/>
          <text x="50%" y="50%" text-anchor="middle" dy="0.38em" class="percentage">`+ progressNum +`%</text>
        </svg>
      `
    );
    this.microChartCircleProgress(idElm, ".circle-ring", progressNum, "", "", "", color_fill, strokeWidth, radius, cx, cy);

    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });  
  }

  //=======================================================
  // Scorecard MD - Basic
  //=======================================================
  static makeScorecardMDBasic(idElm,cardTitle, cardValue, currencySymbol, particle, percentage, cardIcon) {
    $("#" + idElm).addClass("flex-body flex-column scorecard");
    $("#" + idElm).css("border-bottom","3px solid #2B9EFF");
    $("#" + idElm).append(
      `
      <img src="`+ cardIcon +`" alt="" class="scorecard-img flex-1">
      <div class="flex-column flex-1" style="align-items:center; justify-content: center;">    
          <div class="scorecard-title">`+ cardTitle +`</div>
          <div class="flex-row">
              <div class="scorecard-value">`+ currencySymbol + cardValue.toLocaleString("id-ID") +`</div>
              <small class="scorecard-particle">`+ particle +`</small>
          </div>
          <div class="scorecard-status">`+ percentage +`</div>
      </div>
      `
    );
    if (percentage > 0) {
      $("#" + idElm + " .scorecard-status").css("color","green");
      // $("#" + idElm + " .scorecard-status").prepend("(+");
      $("#" + idElm + " .scorecard-status").prepend(`<span class="glyphicon glyphicon-triangle-top glyph-sm" aria-hidden="true"></span>`);
      $("#" + idElm + " .scorecard-status").append("%");
    }else{
      $("#" + idElm + " .scorecard-status").empty();
      $("#" + idElm + " .scorecard-status").css("color","red");
      // $("#" + idElm + " .scorecard-status").prepend("(");
      $("#" + idElm + " .scorecard-status").prepend(percentage.substring(1));
      $("#" + idElm + " .scorecard-status").prepend(`<span class="glyphicon glyphicon-triangle-bottom glyph-sm" aria-hidden="true"></span>`);
      $("#" + idElm + " .scorecard-status").append("%");
    };

    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });
  }
  //=======================================================
  // Scorecard MD - Microchart (Line)
  //=======================================================
  static makeScorecardMDGrowthLine(idElm,cardTitle,cardData,categoryName,seriesValue,currencySymbol,particle,cardIcon) {
    var grid = GridStack.init();

    let recentValue;
    let growthNum = 0;
    if ((cardData.length) >= 2){
      (cardData[cardData.length - 1])["opacity"]= 1;
      recentValue = (cardData[cardData.length - 1])[seriesValue];
      let previousValue = (cardData[cardData.length - 2])[seriesValue];
      let growthNumBase = (recentValue - previousValue) / previousValue * 100;
      growthNum = Math.round(growthNumBase)
    }else{
      recentValue = cardData[0][seriesValue];
    }

    if ($("#" + idElm).width() < 205) {
      $("#" + idElm ).addClass("bottom-chart");
    }
    $("#" + idElm).addClass("flex-body flex-column scorecard scorecard-md");
    $("#" + idElm).append(
      `
      <div class="flex-row flex-1">
        <img src="`+ cardIcon +`" alt="" class="scorecard-img">
        <div class="flex-column">
          <div class="flex-row">
            <div class="scorecard-value">`+ currencySymbol + (recentValue).toLocaleString("id-ID") +`</div>
            <small class="scorecard-particle">`+ particle +`</small>
            <div class="scorecard-status label">`+ growthNum +`</div>
          </div>
          <div class="flex-row">
            <span class="scorecard-title">`+ cardTitle +`</span>
            <div class="scorecard-status label">`+ growthNum +`</div>
          </div>
        </div>
      </div>
      <div class="scorecard-chart flex-1"></div>
      `
    );
    this.microChartLine(idElm, ".scorecard-chart", cardData, categoryName, seriesValue, "half-endpoint");
    this.cmpLabelGrowth(idElm, ".scorecard-status", growthNum);

    $("#" + idElm).on("mouseenter",function(){
      grid.on('resizestop', function(){
        if ($("#" + idElm).width() < 205) {
          $("#" + idElm ).addClass("bottom-chart");
        }else{
          $("#" + idElm ).removeClass("bottom-chart");
        };
      });
    });
    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });
  }
  //=======================================================
  // Scorecard MD - Microchart (Line) - Versi2
  //=======================================================
  static makeScorecardMDGrowthLineVersi2(idElm,cardTitle,cardData,categoryName,seriesValue,currencySymbol,particle,cardIcon) {
    // var grid = GridStack.init();
    (cardData[cardData.length - 1])["opacity"]= 1;
    let recentValue = (cardData[cardData.length - 1])[seriesValue];
    let previousValue = (cardData[cardData.length - 2])[seriesValue];
    let growthNumBase = (recentValue - previousValue) / previousValue * 100;
    let growthNum = Math.round(growthNumBase);

    if ($("#" + idElm).width() < 205) {
      $("#" + idElm ).addClass("background-chart");
    }
    $("#" + idElm).addClass("flex-body flex-column scorecard scorecard-md");
    $("#" + idElm).append(
      `
      <div class="flex-row flex-1">
        <img src="`+ cardIcon +`" alt="" class="scorecard-img">
        <div class="flex-column">
          <div class="flex-row">
            <div class="scorecard-value">`+ currencySymbol + (recentValue).toLocaleString("id-ID") +`</div>
            <small class="scorecard-particle">`+ particle +`</small>
            <div class="scorecard-status label">`+ growthNum +`</div>
          </div>
          <div class="flex-row">
            <span class="scorecard-title">`+ cardTitle +`</span>
            <div class="scorecard-status label">`+ growthNum +`</div>
          </div>
        </div>
      </div>
      <div class="scorecard-chart flex-1"></div>
      `
    );
    this.microChartLine(idElm, ".scorecard-chart", cardData, categoryName, seriesValue, "half-endpoint");
    this.cmpLabelGrowth(idElm, ".scorecard-status", growthNum);

    $("#" + idElm).on("mouseenter",function(){
      grid.on('resizestop', function(){
        if ($("#" + idElm).width() < 205) {
          $("#" + idElm ).addClass("background-chart");
        }else{
          $("#" + idElm ).removeClass("background-chart");
        };
      });
    });
    $('.scorecard-value').bind('mouseenter', function(){
      var $this = $(this);
      if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
          $this.attr('title', $this.text());
      }
    });
  }

  //=======================================================
  // Heatmap ( Geo )
  //=======================================================
  static makeHeatmapGeo(idElm,chartTitle, chartData, countryName) {
    var continents = {
      AF: 0,
      AN: 1,
      AS: 2,
      EU: 3,
      NA: 4,
      OC: 5,
      SA: 6,
    };
    
    let maxValue = Math.max.apply(Math, chartData.map(function (n) { return n.value; }));
    let minValue = Math.min.apply(Math,chartData.map(function (n) { return n.value; }));
    
    if (countryName === "all") {
      var chart = am4core.create(idElm, am4maps.MapChart);
      chart.projection = new am4maps.projections.Miller();
      chart.geodata = am4geodata_worldLow;
    
      var worldSeries = chart.series.push(new am4maps.MapPolygonSeries());
      worldSeries.data = chartData;
      worldSeries.useGeodata = true;
      worldSeries.exclude = ["AQ"];
      worldSeries.heatRules.push({
        property: "fill",
        target: worldSeries.mapPolygons.template,
        min: chart.colors.getIndex(1).brighten(1),
        max: chart.colors.getIndex(1).brighten(-0.3),
      });
      var worldPolygon = worldSeries.mapPolygons.template;
      worldPolygon.tooltipText = "{name} ({id})";
      worldPolygon.nonScalingStroke = true;
      worldPolygon.strokeOpacity = 0.5;
      var hs = worldPolygon.states.create("hover");
      hs.properties.fill = chart.colors.getIndex(9);
    
      var countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
      countrySeries.data = chartData;
      countrySeries.useGeodata = true;
      countrySeries.exclude = ["MY-12", "MY-13", "BN", "TL"];
      countrySeries.heatRules.push({
        property: "fill",
        target: countrySeries.mapPolygons.template,
        min: chart.colors.getIndex(1).brighten(1),
        max: chart.colors.getIndex(1).brighten(-0.3),
        // logarithmic: true
      });
      countrySeries.hide();
      countrySeries.geodataSource.events.on("done", function (ev) {
        worldSeries.hide();
        countrySeries.show();
      });
      var countryPolygon = countrySeries.mapPolygons.template;
      countryPolygon.tooltipText = "{name} : {value}";
      countryPolygon.nonScalingStroke = true;
      countryPolygon.strokeOpacity = 0.5;
      countryPolygon.fill = am4core.color("#eee");
      var hs = countryPolygon.states.create("hover");
      hs.properties.fill = chart.colors.getIndex(9);
    
      // Set up click events
      worldPolygon.events.on("hit", function (ev) {
        ev.target.series.chart.zoomToMapObject(ev.target);
        var map = ev.target.dataItem.dataContext.map;
        if (map) {
          ev.target.isHover = false;
          countrySeries.geodataSource.url =
            "https://www.amcharts.com/lib/4/geodata/json/" + map + ".json";
          countrySeries.geodataSource.load();
        }
      });
      var data = [];
      for (var id in am4geodata_data_countries2) {
        if (am4geodata_data_countries2.hasOwnProperty(id)) {
          var country = am4geodata_data_countries2[id];
          if (country.maps.length) {
            data.push({
              id: id,
              color: chart.colors.getIndex(continents[country.continent_code]),
              map: country.maps[0],
            });
          }
        }
      }
      worldSeries.data = data;
    
      // Zoom control
      chart.zoomControl = new am4maps.ZoomControl();
      var homeButton = new am4core.Button();
      homeButton.events.on("hit", function () {
        worldSeries.show();
        countrySeries.hide();
        chart.goHome();
      });
      homeButton.icon = new am4core.Sprite();
      homeButton.padding(7, 5, 7, 5);
      homeButton.width = 30;
      homeButton.icon.path =
        "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8";
      homeButton.marginBottom = 10;
      homeButton.parent = chart.zoomControl;
      homeButton.insertBefore(chart.zoomControl.plusButton);
    
      //---------------------------------------------
    } else {
      var chart = am4core.create(idElm, am4maps.MapChart);
    
      var countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
      countrySeries.geodataSource.url =
        "https://www.amcharts.com/lib/4/geodata/json/" + countryName +"Low.json";
      countrySeries.geodataSource.load();
      countrySeries.exclude = ["MY-12", "MY-13", "BN", "TL"];
      countrySeries.data = chartData;
      countrySeries.heatRules.push({
        property: "fill",
        target: countrySeries.mapPolygons.template,
        min: chart.colors.getIndex(1).brighten(1),
        max: chart.colors.getIndex(1).brighten(-0.3),
        // logarithmic: true
      });
    
      var countryPolygon = countrySeries.mapPolygons.template;
      countryPolygon.tooltipText = "{name} : {value}";
      countryPolygon.nonScalingStroke = true;
      countryPolygon.fill = am4core.color("#eee");
      var hs = countryPolygon.states.create("hover");
      hs.properties.fill = chart.colors.getIndex(9);
    
      var heatLegend = chart.createChild(am4maps.HeatLegend);
      heatLegend.series = countrySeries;
      heatLegend.align = "right";
      heatLegend.valign = "bottom";
      heatLegend.width = 230;
      heatLegend.marginRight = am4core.percent(4);
      heatLegend.valueAxis.renderer.opposite = true;
      heatLegend.valueAxis.strictMinMax = false;
      heatLegend.valueAxis.fontSize = 11;
      // heatLegend.valueAxis.logarithmic = true;
      heatLegend.background.fill = am4core.color("#000");
      heatLegend.background.fillOpacity = 0.05;
      heatLegend.padding(5, 5, 5, 5);
      heatLegend.minValue = 0;
      heatLegend.maxValue = 100;
    
      // Set up custom heat map legend labels using axis ranges
      var minRange = heatLegend.valueAxis.axisRanges.create();
      minRange.value = heatLegend.minValue;
      minRange.label.horizontalCenter = "left";
      minRange.label.text = heatLegend.numberFormatter.format(minValue);
      var maxRange = heatLegend.valueAxis.axisRanges.create();
      maxRange.value = heatLegend.maxValue;
      maxRange.label.horizontalCenter = "right";
      maxRange.label.text = heatLegend.numberFormatter.format(maxValue);
      heatLegend.valueAxis.renderer.labels.template.adapter.add(
        "text", function (labelText) { return "";}
      );
    
      countrySeries.mapPolygons.template.events.on("over", function (ev) {
        if (!isNaN(ev.target.dataItem.value)) {
          heatLegend.valueAxis.showTooltipAt(ev.target.dataItem.value);
        } else {
          heatLegend.valueAxis.hideTooltip();
        }
      });
      countrySeries.mapPolygons.template.events.on("out", function (ev) {
        heatLegend.valueAxis.hideTooltip();
      });
    } //<--- end of IF GeoMap
    
  }
  
  //=======================================================
  // Heatmap Indonesia
  //=======================================================
  static makeHeatmapIndonesiaCities(idElm, dataProvince, dataCity, provinceName=false) {
    var chart = am4core.create(idElm, am4maps.MapChart);
    chart.projection = new am4maps.projections.Miller();
    chart.zoomControl = new am4maps.ZoomControl();

    chart.geodata = am4geodata_indonesiaCities;
    chart.reverseGeodata = true;
    chart.cursorOverStyle = am4core.MouseCursorStyle.grab;

    function createCitySeries(name, include, seriesData) {
      var citySeries = chart.series.push(new am4maps.MapPolygonSeries());
      citySeries.id = name
      citySeries.name = name;
      citySeries.useGeodata = true;
      citySeries.include = include;
      citySeries.data = seriesData;
      citySeries.heatRules.push({
        property: "fill",
        target: citySeries.mapPolygons.template,
        min: chart.colors.getIndex(1).brighten(1),
        max: chart.colors.getIndex(1).brighten(-0.3),
      });
      
      var cityPolygon = citySeries.mapPolygons.template;
      cityPolygon.tooltipText = "{KABKOT} : {value}";
      cityPolygon.fill = am4core.color("#D9D9D9");
      cityPolygon.cursorOverStyle = am4core.MouseCursorStyle.pointer;
      
      var hs = cityPolygon.states.create("hover");
      hs.properties.fill = cityPolygon.fill.lighten(-0.5);
      
      return citySeries;
    }

    // 000
    var provinceSeries = chart.series.push(new am4maps.MapPolygonSeries());
    provinceSeries.geodata = am4geodata_indonesiaProvince;
    provinceSeries.useGeodata = true;
    provinceSeries.exclude = ["MY-12", "MY-13", "BN", "TL"];
    provinceSeries.data = dataProvince;
    provinceSeries.heatRules.push({
      property: "fill",
      target: provinceSeries.mapPolygons.template,
      min: chart.colors.getIndex(1).brighten(1),
      max: chart.colors.getIndex(1).brighten(-0.3),
      // logarithmic: true
    });
  
    var provincePolygon = provinceSeries.mapPolygons.template;
    provincePolygon.tooltipText = "[text-transform: uppercase;] {name} : {value}";
    provincePolygon.nonScalingStroke = true;
    provincePolygon.fill = am4core.color("#D9D9D9");
    provincePolygon.cursorOverStyle = am4core.MouseCursorStyle.pointer;

    var hsc = provincePolygon.states.create("hover");
    hsc.properties.fill = provincePolygon.fill.lighten(-0.5);

    // Set up click events
    provincePolygon.events.on("hit", function (ev) {
      ev.target.series.chart.zoomToMapObject(ev.target);
      var map = ev.target.dataItem.dataContext.name;
      if (map) {
        ev.target.isHover = false;
        var selectedProvince = am4geodata_indonesiaCities.features.filter(function (el)
        {
          return el.properties.PROVINSI == map.toUpperCase();
        });
        // am4geodata_selected = {"type":"FeatureCollection"};
        // am4geodata_selected["features"] = selectedProvince;

        var cityIds = [];
        for (var i=0; i < selectedProvince.length; i++) {
          cityIds.push(selectedProvince[i].id);
        }
        var dataCitySelected = dataCity.filter(function (el)
        {
          return el.province == map.toUpperCase();
        });

        createCitySeries(map, cityIds, dataCitySelected);
        // citySeries.show();
        provinceSeries.hide();
      }
    });

    // Zoom control
    chart.zoomControl = new am4maps.ZoomControl();
    var homeButton = new am4core.Button();
    homeButton.events.on("hit", function () {
      if (chart.series.getIndex(1)) {
        chart.series.removeIndex(1).dispose();
        // citySeries.hide();
        provinceSeries.show();
        chart.goHome();
      }
    });
    homeButton.icon = new am4core.Sprite();
    homeButton.padding(7, 5, 7, 5);
    homeButton.width = 30;
    homeButton.icon.path =
      "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8";
    homeButton.marginBottom = 10;
    homeButton.parent = chart.zoomControl;
    homeButton.insertBefore(chart.zoomControl.plusButton);
            
    // 0000  
    // // Set up custom heat map legend labels using axis ranges
    // let maxValue = Math.max.apply(Math,chartData.map(function (n) { return n.value; }));
    // let minValue = Math.min.apply(Math,chartData.map(function (n) { return n.value; }));

    // var heatLegend = chart.createChild(am4maps.HeatLegend);
    // heatLegend.series = polygonSeries;
    // heatLegend.align = "right";
    // heatLegend.valign = "bottom";
    // heatLegend.width = 230;
    // heatLegend.marginRight = am4core.percent(4);
    // heatLegend.valueAxis.renderer.opposite = true;
    // heatLegend.valueAxis.strictMinMax = false;
    // heatLegend.valueAxis.fontSize = 11;
    // // heatLegend.valueAxis.logarithmic = true;
    // heatLegend.background.fill = am4core.color("#000");
    // heatLegend.background.fillOpacity = 0.05;
    // heatLegend.padding(5, 5, 5, 5);
    // heatLegend.minValue = 0;
    // heatLegend.maxValue = 100;
    
    // var minRange = heatLegend.valueAxis.axisRanges.create();
    // minRange.value = heatLegend.minValue;
    // minRange.label.horizontalCenter = "left";
    // minRange.label.text = heatLegend.numberFormatter.format(minValue);
    // var maxRange = heatLegend.valueAxis.axisRanges.create();
    // maxRange.value = heatLegend.maxValue;
    // maxRange.label.horizontalCenter = "right";
    // maxRange.label.text = heatLegend.numberFormatter.format(maxValue);
    // heatLegend.valueAxis.renderer.labels.template.adapter.add(
    //   "text", function (labelText) { return "";}
    // );
  }

  //=======================================================
  // Radar Chart
  //=======================================================
  static makeRadarChart(idElm, title, data, keyLabel, keyValue) {
    var chart = am4core.create(idElm, am4charts.RadarChart);
    chart.data = data;

    chart.innerRadius = am4core.percent(30);

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = keyLabel;
    categoryAxis.renderer.minGridDistance = 60;
    categoryAxis.renderer.inversed = true;
    categoryAxis.renderer.labels.template.location = 0.5;
    categoryAxis.renderer.grid.template.strokeOpacity = 0.08;
    categoryAxis.tooltip.disabled = true;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.extraMax = 0.1;
    valueAxis.tooltip.disabled = true;
    valueAxis.renderer.grid.template.strokeOpacity = 0.08;

    chart.seriesContainer.zIndex = -10;

    var series = chart.series.push(new am4charts.RadarColumnSeries());
    series.dataFields.categoryX = keyLabel;
    series.dataFields.valueY = keyValue;
    series.tooltipText = "{valueY.value}"
    series.columns.template.strokeOpacity = 0;
    series.columns.template.radarColumn.cornerRadius = 5;
    series.columns.template.radarColumn.innerCornerRadius = 0;

    chart.zoomOutButton.disabled = true;

    series.columns.template.adapter.add("fill", (fill, target) => {
        return chart.colors.getIndex(target.dataItem.index);
    });

    categoryAxis.sortBySeries = series;

    chart.cursor = new am4charts.RadarCursor();
    chart.cursor.behavior = "none";
    chart.cursor.lineX.disabled = true;
    chart.cursor.lineY.disabled = true;

    return chart;
  }

  //=======================================================
  // Pivot Nested
  //=======================================================
  static makePivotNestedDonutChart(idElm, pivot, chartData, rawData) {
    var chart = am4core.create(idElm, am4charts.PieChart);
    chart.data = chartData.data;

    var numberFormat = pivot.amcharts.getNumberFormatPattern(rawData.meta.formats[0]);
    chart.numberFormatter.numberFormat = numberFormat;
    chart.innerRadius = am4core.percent(40);

    // Create pie series
    for (let s = 0; s < pivot.amcharts.getNumberOfMeasures(rawData); s++) {
        var series = chart.series.push(new am4charts.PieSeries());
        series.dataFields.category = pivot.amcharts.getCategoryName(rawData);
        series.dataFields.value = pivot.amcharts.getMeasureNameByIndex(rawData, s);
        series.slices.template.stroke = am4core.color("#fff");
        series.slices.template.strokeWidth = 2;
        series.slices.template.strokeOpacity = 1;
        if (s != pivot.amcharts.getNumberOfMeasures(rawData) - 1) {
            series.labels.template.disabled = true;
            series.ticks.template.disabled = true;
        }
        if (s == 0) {
            series.slices.template.states.getKey("hover").properties.shiftRadius = 0;
            series.slices.template.states.getKey("hover").properties.scale = 0.9;
        }
        else {
            series.slices.template.states.getKey("hover").properties.shiftRadius = 0;
            series.slices.template.states.getKey("hover").properties.scale = 1.1;
        }
        /* Create initial animation */
        series.hiddenState.properties.opacity = 1;
        series.hiddenState.properties.endAngle = -90;
        series.hiddenState.properties.startAngle = -90;

        series.labels.template.maxWidth = 100;
        series.labels.template.wrap = true;
        series.alignLabels = false;
        // series.labels.template.truncate = true;

        series.ticks.template.events.on("ready", hideSmall);
        series.ticks.template.events.on("visibilitychanged", hideSmall);
        series.labels.template.events.on("ready", hideSmall);
        series.labels.template.events.on("visibilitychanged", hideSmall);
        series.fontSize = 12;

        function hideSmall(ev) {
            if (ev.target.dataItem && (ev.target.dataItem.values.value.percent < 5)) {
                ev.target.hide();
            }
            else {
                ev.target.show();
            }
        }
    }
    chart.innerRadius = am4core.percent(25);
    chart.radius = am4core.percent(55);
    return chart;
  }

  //=======================================================
  // Horizontal Bar
  //=======================================================
  static makeHBarChart(idElm, title, data, keyLabel, keyValue, useImage=false) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.hiddenState.properties.opacity = 0;

    chart.data = data;

    var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = keyLabel;
    categoryAxis.renderer.minGridDistance = 40;
    categoryAxis.fontSize = 11;
    categoryAxis.renderer.labels.template.dy = 5;

    if (useImage) {
        var image = new am4core.Image();
        image.horizontalCenter = "middle";
        image.width = 20;
        image.height = 20;
        image.verticalCenter = "middle";
        image.adapter.add("href", (href, target)=>{
            let category = target.dataItem.category;
            if(category){
                return "https://www.amcharts.com/wp-content/uploads/flags/" + category.split(" ").join("-").toLowerCase() + ".svg";
            }
                return href;
            }
        );
        categoryAxis.dataItems.template.bullet = image;
    }

    var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.minGridDistance = 30;
    valueAxis.renderer.baseGrid.disabled = true;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryY = keyLabel;
    series.dataFields.valueX = keyValue;
    series.columns.template.tooltipText = "{categoryY}: {valueX.value}";
    series.columns.template.strokeOpacity = 0;

    series.columns.template.adapter.add("fill", function(fill, target) {
        return chart.colors.getIndex(target.dataItem.index);
    });

    return chart;
  }


  //=======================================================
  // Bar
  //=======================================================
  static makeBarChart(idElm, title, data, keyLabel, keyValue, useImage=false) {
    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.hiddenState.properties.opacity = 0;

    chart.data = data;

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = keyLabel;
    categoryAxis.renderer.minGridDistance = 40;
    categoryAxis.fontSize = 11;
    categoryAxis.renderer.labels.template.dy = 5;
    categoryAxis.renderer.labels.template.wrap = true;
    categoryAxis.renderer.labels.template.maxWidth = 80;
    categoryAxis.events.on("sizechanged", function(ev) {
    var axis = ev.target;
      var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
      if (cellWidth < axis.renderer.labels.template.maxWidth) {
        axis.renderer.labels.template.rotation = -45;
        axis.renderer.labels.template.horizontalCenter = "right";
        axis.renderer.labels.template.verticalCenter = "middle";
      }
      else {
        axis.renderer.labels.template.rotation = 0;
        axis.renderer.labels.template.horizontalCenter = "middle";
        axis.renderer.labels.template.verticalCenter = "top";
      }
    });

    if (useImage) {
        var image = new am4core.Image();
        image.horizontalCenter = "middle";
        image.width = 20;
        image.height = 20;
        image.verticalCenter = "middle";
        image.adapter.add("href", (href, target)=>{
            let category = target.dataItem.category;
            if(category){
                return "https://www.amcharts.com/wp-content/uploads/flags/" + category.split(" ").join("-").toLowerCase() + ".svg";
            }
                return href;
            }
        );
        categoryAxis.dataItems.template.bullet = image;
    }

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.minGridDistance = 30;
    valueAxis.renderer.baseGrid.disabled = true;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryX = keyLabel;
    series.dataFields.valueY = keyValue;
    series.columns.template.tooltipText = "{categoryX}: {valueY.value}";
    series.columns.template.tooltipY = 0;
    series.columns.template.strokeOpacity = 0;

    // series.columns.template.adapter.add("fill", function(fill, target) {
    //     return chart.colors.getIndex(target.dataItem.index);
    // });

    return chart;
  }

  //=======================================================
  // Line Chart
  //=======================================================
  static makeSingleLineChart(idElm, title, data, keyLabel, keyValue, useScrollbar=false) {
    var chart = am4core.create(idElm, am4charts.XYChart);

    chart.data = data;

    var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
    dateAxis.renderer.minGridDistance = 50;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());

    var series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = keyValue;
    series.dataFields.dateX = keyLabel;
    series.strokeWidth = 2;
    series.minBulletDistance = 10;
    series.tooltipText = "{valueY}";
    series.tooltip.pointerOrientation = "vertical";
    series.tooltip.background.cornerRadius = 20;
    series.tooltip.background.fillOpacity = 0.5;
    series.tooltip.label.padding(12,12,12,12);
    series.stroke = am4core.color("#0060C0");
    // series.tensionX = 0.77;

    if (useScrollbar) {
        chart.scrollbarX = new am4charts.XYChartScrollbar();
        chart.scrollbarX.series.push(series);
    }

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.xAxis = dateAxis;
    chart.cursor.snapToSeries = series;

    return chart;
  }

  //=======================================================
  // Hour Line
  //=======================================================
  static makeHourLineChart(idElm, title, data, keyLabel, keyValue, useScrollbar=false) {
    var self = this;
    var parseData= function(data) {
        var chartData = [];
        _.each(data, function(i){
            chartData.push({
              date: new Date(i.date),
              hour: i.date.slice(11, 16),
              qty: i.count
            });
        });
        return chartData;
    }
    $('#'+idElm).parent().find('.charttitle').text(title);
    var chart = am4core.create(idElm, am4charts.XYChart);

    chart.data = self.parseData(data);

    var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
    dateAxis.baseInterval = {
      "timeUnit": "minute",
      "count": 10
    };
    dateAxis.tooltipDateFormat = "HH:mm";

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.tooltip.disabled = true;
    // valueAxis.title.text = "Jumlah Order";

    var series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.dateX = 'date';
    series.dataFields.valueY = 'qty';
    series.tooltipText = "[bold]{valueY}[/] order";
    series.fillOpacity = 0.3;

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.opacity = 0;

    // dateAxis.start = 0.0;
    dateAxis.keepSelection = true;

    return chart;
  }

  //=======================================================
  // Map With Bubble / Point
  //=======================================================
  static makeMapPoint(idElm, chartData, labelName, measureName, mapByName) {
    var chart = am4core.create(idElm, am4maps.MapChart);

    chart.zoomControl = new am4maps.ZoomControl();
    chart.chartContainer.wheelable = false;
    // am4core.useTheme(am4themes_animated);
    
    chart.geodata = am4geodata_indonesiaLow;

    // Set projection
    chart.projection = new am4maps.projections.Miller();

    // Create map polygon series
    var polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());

    //Set min/max fill color for each area
    polygonSeries.heatRules.push({
    property: "fill",
    target: polygonSeries.mapPolygons.template,
        min: chart.colors.getIndex(1).brighten(1),
        max: chart.colors.getIndex(1).brighten(-0.3)
    });

    // Make map load polygon data (state shapes and names) from GeoJSON
    polygonSeries.useGeodata = true;

    // Add image series
    var imageSeries = chart.series.push(new am4maps.MapImageSeries());
    imageSeries.mapImages.template.propertyFields.longitude = "longitude";
    imageSeries.mapImages.template.propertyFields.latitude = "latitude";
    // imageSeries.mapImages.template.tooltipText = "{title}";

    imageSeries.data = chartData;
    imageSeries.dataFields.value = "value";

    var imageTemplate = imageSeries.mapImages.template;
    imageTemplate.nonScaling = true

    var circle = imageTemplate.createChild(am4core.Circle);
    circle.fillOpacity = 0.7;
    circle.propertyFields.fill = "color";
    circle.tooltipText = "{title}: [bold]{value}[/]";
    imageSeries.heatRules.push({
        "target": circle,
        "property": "radius",
        "min": 10,
        "max": 20,
        "dataField": "value"
    })

    var colorSet = new am4core.ColorSet();
    
    imageSeries.data = [];
    for (var i=0; i<chartData.length; i++) {
        var min = 94.0000,
            max = 141.0000,
            randomLong = Math.random() * (max - min) + min;
            randomLong = 95;
        var min = -11.0000,
            max = 6.0000,
            randomLat = Math.random() * (max - min) + min;
            randomLat = -8; 
        
        var tmpName = chartData[i][labelName] ? chartData[i][labelName].replace(/[^a-z\d\s]+/gi, '').replace(/ /g,'').toLowerCase() : '';
        imageSeries.data.push({
            'title': chartData[i][labelName],
            'longitude': tmpName in mapByName? mapByName[tmpName]['long'] : randomLong,
            'latitude': tmpName in mapByName? mapByName[tmpName]['lat'] :  randomLat,
            'value': chartData[i][measureName],
            'color': '#06c',
        })
    }
    // console.log(imageSeries.data, mapByName, chartData);
  }

  //=======================================================
  // BarChart - AC
  //=======================================================
  static makeBarPieChartAC(idElm,idElmPie,chartTitle,chartData,categoryName,seriesValue,categoryNamePie,seriesValuePie ) {
    var filter = "";
    var chartPie = am4core.create(idElmPie, am4charts.PieChart);
    updatePieChartAC(idElmPie, chartTitle, chartData, categoryNamePie, seriesValuePie, filter);

    var chart = am4core.create(idElm, am4charts.XYChart);
    chart.exporting.menu = new am4core.ExportMenu();
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    chart.data = chartData;
    /* Axes */
    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = categoryName;
    categoryAxis.renderer.minGridDistance = 30;
    categoryAxis.cursorTooltipEnabled = false;

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());

    var columnSeries = chart.series.push(new am4charts.ColumnSeries());
    columnSeries.name = seriesValue;
    columnSeries.dataFields.valueY = seriesValue;
    columnSeries.dataFields.categoryX = categoryName;
    columnSeries.tooltipText =
      "[#fff font-size: 1.5em]{name} {categoryX} :\n[/][#fff font-size: 1.5em]{valueY}[/] [#fff]{additional}[/]";
    columnSeries.tooltip.label.textAlign = "middle";

    columnSeries.columns.template.togglable = true;
    var activeState = columnSeries.columns.template.states.create("active");
    activeState.properties.fill = am4core.color("#E94F37"); 

    columnSeries.columns.template.events.on("hit", function(event) {
      if (event.target.isActive == false) { 
        filter = event.target.dataItem.categoryX;
        chartPie.dispose();
        updatePieChartAC(idElmPie, chartTitle, chartData, categoryNamePie, seriesValuePie, filter);
      }else{
        filter = "";
        chartPie.dispose();
        updatePieChartAC(idElmPie, chartTitle, chartData, categoryNamePie, seriesValuePie, filter);
      }
      columnSeries.columns.each(function(column) {
        if (column !== event.target) {
          column.setState("default");
          column.isActive = false;
        }else{
        };
      });
    }, this);
    // -----------------------
    function updatePieChartAC(idElmPie, chartTitle, chartData, categoryNamePie, seriesValuePie, filter){
        
      chartPie = am4core.create(idElmPie, am4charts.PieChart);
      chartPie.innerRadius = am4core.percent(50);
        
        if(filter === ""){
          var flattenData = (chartData.map(x => x.mp)).flat();
          var mpTotal = [];
          flattenData.reduce(function(res, value) {
            if (!res[value.mp_name]) {
              res[value.mp_name] = { mp_name: value.mp_name, amount: 0 };
              mpTotal.push(res[value.mp_name])
            };
            res[value.mp_name].amount += value.amount;
            return res;
          }, {});
          chartPie.data = mpTotal;
          // console.log(mpTotal);
          
        }else{
          var selectedObjByFilter = chartData.filter(x => x.date === filter).map(x => x.mp);
          chartPie.data = selectedObjByFilter[0];
        }
      
      // Add and configure Series
      var pieSeries = chartPie.series.push(new am4charts.PieSeries());
      pieSeries.dataFields.value = seriesValuePie;
      pieSeries.dataFields.category = categoryNamePie;
      pieSeries.slices.template.stroke = am4core.color("#fff");
      pieSeries.slices.template.strokeWidth = 2;
      pieSeries.slices.template.strokeOpacity = 1;
      
      // This creates initial animation
      pieSeries.hiddenState.properties.opacity = 1;
      pieSeries.hiddenState.properties.endAngle = -90;
      pieSeries.hiddenState.properties.startAngle = -90;

      var label = pieSeries.createChild(am4core.Label);
      label.text = "{values.value.sum}";
      label.horizontalCenter = "middle";
      label.verticalCenter = "middle";
      label.fontSize = 40;
      }
  }
  
  //=======================================================
  // Micro Bar
  //=======================================================
  static makeMicroBarChart(idElm, title, data, keyLabel, keyValue) {
    var chart = am4core.create(idElm, am4charts.XYChart);

    chart.data = data;

    chart.padding(20, 5, 2, 5);

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.disabled = true;
    // categoryAxis.renderer.labels.template.disabled = true;
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = keyLabel;
    categoryAxis.renderer.minGridDistance = 40;
    categoryAxis.fontSize = 11;
    categoryAxis.renderer.labels.template.dy = 0;
    categoryAxis.renderer.labels.template.wrap = true;
    categoryAxis.renderer.labels.template.maxWidth = 80;
    categoryAxis.events.on("sizechanged", function(ev) {
    var axis = ev.target;
      var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
      if (cellWidth < axis.renderer.labels.template.maxWidth) {
        axis.renderer.labels.template.rotation = -45;
        axis.renderer.labels.template.horizontalCenter = "right";
        axis.renderer.labels.template.verticalCenter = "middle";
      }
      else {
        axis.renderer.labels.template.rotation = 0;
        axis.renderer.labels.template.horizontalCenter = "middle";
        axis.renderer.labels.template.verticalCenter = "top";
      }
    });

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    valueAxis.renderer.grid.template.disabled = true;
    valueAxis.renderer.baseGrid.disabled = true;
    valueAxis.renderer.labels.template.disabled = true;
    valueAxis.cursorTooltipEnabled = false;

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.tooltipText = "{categoryX}: [bold]{valueY.value}";
    series.dataFields.categoryX = keyLabel;
    series.dataFields.valueY = keyValue;
    series.strokeWidth = 0;
    series.fillOpacity = 0.9;
    series.columns.template.propertyFields.fillOpacity = "opacity";

    return chart;
  }
  //=======================================================
  // Micro Bar Line
  //=======================================================
  static makeMicroBarLineChart(idElm, title, data, keyLabel, keyValueBar, keyValueLine) {
    var chart = am4core.create(idElm, am4charts.XYChart);

    chart.data = data;

    chart.padding(20, 5, 2, 5);

    var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    categoryAxis.renderer.grid.template.disabled = true;
    // categoryAxis.renderer.labels.template.disabled = true;
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.dataFields.category = keyLabel;
    categoryAxis.renderer.minGridDistance = 40;
    categoryAxis.fontSize = 11;
    categoryAxis.renderer.labels.template.dy = 0;
    categoryAxis.renderer.labels.template.wrap = true;
    categoryAxis.renderer.labels.template.maxWidth = 80;
    categoryAxis.events.on("sizechanged", function(ev) {
    var axis = ev.target;
      var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
      if (cellWidth < axis.renderer.labels.template.maxWidth) {
        axis.renderer.labels.template.rotation = -45;
        axis.renderer.labels.template.horizontalCenter = "right";
        axis.renderer.labels.template.verticalCenter = "middle";
      }
      else {
        axis.renderer.labels.template.rotation = 0;
        axis.renderer.labels.template.horizontalCenter = "middle";
        axis.renderer.labels.template.verticalCenter = "top";
      }
    });

    var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
    valueAxis.min = 0;
    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;

    var series = chart.series.push(new am4charts.ColumnSeries());
    series.tooltipText = "{categoryX}: [bold]{valueY.value}";
    series.dataFields.categoryX = keyLabel;
    series.dataFields.valueY = keyValueBar;
    series.strokeWidth = 0;
    // series.fillOpacity = 0.9;
    // series.columns.template.propertyFields.fillOpacity = "opacity";

    var lineSeries = chart.series.push(new am4charts.LineSeries());
    lineSeries.dataFields.valueY = keyValueLine;
    lineSeries.dataFields.categoryX = keyLabel;
    lineSeries.strokeWidth = 2;
    lineSeries.stroke = chart.colors.getIndex(1);

    return chart;
  }

  //=======================================================
  // Component - Label Growth
  //=======================================================
  static cmpLabelGrowth(idElm, container, growthNum){
    if (growthNum != ""){
      if (growthNum > 0) {
        $("#" + idElm + " "+ container ).addClass("label-success");
        $("#" + idElm + " "+ container ).attr({"data-toggle":"tooltip", "data-placement":"top", "title":"Since last period"});
        $("#" + idElm + " "+ container ).prepend(`<i class="fa fa-caret-up fa-lg mr-03" aria-hidden="true"></i>`);
        $("#" + idElm + " "+ container ).append("%");
      }else{
        $("#" + idElm + " "+ container ).addClass("label-danger");
        $("#" + idElm + " "+ container ).attr({"data-toggle":"tooltip", "data-placement":"top", "title":"Since last period"});
        $("#" + idElm + " "+ container ).prepend(`<i class="fa fa-caret-down fa-lg mr-03" aria-hidden="true"></i>`);
        $("#" + idElm + " "+ container ).append("%");
      };
    }
  }

  //=======================================================
  // Microchart (line)
  //=======================================================

  static microChartLine(idElm, container, chartData, categoryName, seriesValue, endPointType){
    var microchart_id = "micro" + idElm;
    $("#" + idElm + " " + container).attr("id", microchart_id);
    var chart = am4core.create(microchart_id, am4charts.XYChart);
    
    chart.data = chartData;
    
    var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
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

    chart.cursor = new am4charts.XYCursor();
    chart.cursor.lineY.disabled = true;
    chart.cursor.behavior = "none"
    chart.paddingTop = 0;
    chart.paddingBottom = 0;
    chart.paddingLeft = 0;
    chart.paddingRight = 0;
    
    var series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.dateX = categoryName;
    series.dataFields.valueY = seriesValue;
    series.tooltipText = "{dateX}: [bold]{valueY}";
    series.tooltip.pointerOrientation = "vertical";
    series.tensionX = 0.8;
    series.strokeWidth = 2;
    series.fillOpacity = 0.4;
    series.tooltip.getFillFromObject = false;
    series.tooltip.getStrokeFromObject = true;
    series.tooltip.label.fill = am4core.color("black");

    let fillModifier = new am4core.LinearGradientModifier();
    fillModifier.opacities = [1, 0];
    fillModifier.offsets = [0, 1];
    fillModifier.gradient.rotation = 90;
    series.segments.template.fillModifier = fillModifier;

    var bullet = series.bullets.push(new am4charts.CircleBullet());
    bullet.circle.opacity = 0;
    bullet.circle.propertyFields.opacity = "opacity";
    bullet.circle.radius = 3;
  }

  //=======================================================
  // Microchart (Circle Progress)
  //=======================================================
  static microChartCircleProgress(idElm, container, progressNum, i, chartData, seriesValue, color_fill, strokeWidth, radius, cx, cy){
		if(i === ""){
      i = 0;
    }else{
      var progressNumE = chartData[i][seriesValue];
    };
    if (progressNum >= 100) {
      var progressNumE = 100;
    }else{
      var progressNumE = progressNum;
    }
    $("#" + idElm + " " + container).append(
      fillingCircle(i)
      );

    function fillingCircle(i) {
      var circleFill = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        ),
        startAngle = -90,
        animationDuration = 1500,
        dashArray = 2 * Math.PI * radius,
        angle = (0 * 360) / 100 + startAngle,
        dashOffset = dashArray - (dashArray * progressNumE) / 100,
        currentDuration = (animationDuration * progressNumE) / 100,
        delay = (animationDuration * 0) / 100;circleFill.setAttribute("r", radius);
        circleFill.setAttribute("cx", cx);
        circleFill.setAttribute("cy", cy);
        circleFill.setAttribute("fill", "transparent");
        circleFill.setAttribute("stroke", color_fill);
        circleFill.setAttribute("stroke-linecap", "round");
        circleFill.setAttribute("stroke-width", strokeWidth);
        circleFill.setAttribute("stroke-dasharray", dashArray);
        circleFill.setAttribute("stroke-dashoffset", dashArray);
        circleFill.style.transition = "stroke-dashoffset " + currentDuration + "ms linear " + delay + "ms";
        circleFill.setAttribute("transform","rotate(" + angle + " " + cx + " " + cy + ")"
      );
      setTimeout(function () {
        circleFill.style["stroke-dashoffset"] = dashOffset;
      }, 100);
      return circleFill;
    } // <<---------- end of fillingCircle()
  }

  //=======================================================
  // State Map Heat Polygon
  //=======================================================
  static makeStateMapHeatPolygon(idElm, data, measureName) {
    var chart = am4core.create(idElm, am4maps.MapChart);

    chart.chartContainer.wheelable = false;
    
    // Set map definition
    chart.geodataSource.url = "https://www.amcharts.com/lib/4/geodata/json/indonesiaLow.json";
    chart.geodataSource.events.on("parseended", function(ev) {
        var map_data = [];
        // checked if dict or array
        if (data.length === undefined) {
            map_data = [{id:data.hasc, value:data[measureName]}];
        } else {
            data.forEach(dt => {
                map_data.push({id:dt.hasc, value:dt[measureName]});
            });
        }
        polygonSeries.data = map_data;
    });

    // Set projection
    chart.projection = new am4maps.projections.Miller();

    // Create map polygon series
    var polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());

    //Set min/max fill color for each area
    polygonSeries.heatRules.push({
        property: "fill",
        logarithmic: true,
        target: polygonSeries.mapPolygons.template,
        min: chart.colors.getIndex(0).brighten(1),
        max: chart.colors.getIndex(0).brighten(-0.3)
    });

    // Make map load polygon data (state shapes and names) from GeoJSON
    polygonSeries.useGeodata = true;

    // Set up heat legend
    let heatLegend = chart.createChild(am4maps.HeatLegend);
    heatLegend.series = polygonSeries;
    heatLegend.align = "center";
    heatLegend.width = am4core.percent(25);
    heatLegend.marginRight = am4core.percent(4);
    heatLegend.minValue = 0;
    heatLegend.maxValue = 40000000;
    heatLegend.valign = "bottom";

    // Set up custom heat map legend labels using axis ranges
    var minRange = heatLegend.valueAxis.axisRanges.create();
    minRange.value = heatLegend.minValue;
    minRange.label.text = "Low";
    var maxRange = heatLegend.valueAxis.axisRanges.create();
    maxRange.value = heatLegend.maxValue;
    maxRange.label.text = "High";

    // Blank out internal heat legend value axis labels
    heatLegend.valueAxis.renderer.labels.template.adapter
        .add("text", function(labelText) {
            return "";
    });

    // Configure series tooltip
    var polygonTemplate = polygonSeries.mapPolygons.template;
    polygonTemplate.tooltipText = "{name}: {value}";
    polygonTemplate.nonScalingStroke = true;
    polygonTemplate.strokeWidth = 0.5;

    // Create hover state and set alternative fill color
    var hs = polygonTemplate.states.create("hover");
    hs.properties.fill = chart.colors.getIndex(1);

    chart.zoomControl = new am4maps.ZoomControl();

    return chart;
  }
}
