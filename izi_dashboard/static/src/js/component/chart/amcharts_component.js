class amChartsComponent {
    constructor(attr){
        this.idElm = attr.idElm;
        this.data = attr.data;
        this.dimension = attr.dimension;
        this.metric = attr.metric;
        this.visual = attr.visual;
        this.callback = attr.callback;

        this.scorecardStyle = attr.scorecardStyle;
        this.scorecardIcon = attr.scorecardIcon;
        this.backgroundColor = attr.backgroundColor;
        this.borderColor = attr.borderColor;
        this.fontColor = attr.fontColor;
        this.scorecardIconColor = attr.scorecardIconColor;
        this.legendPosition = attr.legendPosition;
        this.legendHeatmap = attr.legendHeatmap;
        this.area = attr.area;
        this.stacked = attr.stacked;
        this.innerRadius = attr.innerRadius;
        this.circleType = attr.circleType;
        this.labelSeries = attr.labelSeries;
        this.rotateLabel = attr.rotateLabel;
        this.scrollBar = attr.scrollBar;

        //scorecard properties
        this.title = attr.title; //defaultnya Get dari nama Analyisis
        this.currencyCode = attr.currency_code;
        this.particle = attr.particle;
        this.trends = attr.trends;
        this.trendLine = attr.trendLine;
        this.imageUrl = "https://bit.ly/3A4FGmI"; // next. Bisa pilih icon ?
        // this.imageUrl = false; // Comment First

        //heatmapGeo properties
        this.mapView = attr.mapView;
        // this.mapView = (attr.mapView === undefined) ? "all" : attr.mapView;

        this.prefix_by_field = attr.prefix_by_field;
        this.suffix_by_field = attr.suffix_by_field;
        this.decimal_places_by_field = attr.decimal_places_by_field;
        this.is_metric_by_field = attr.is_metric_by_field;
        this.locale_code_by_field = attr.locale_code_by_field;
    };


    //=======================================================
    // Pie Chart
    //=======================================================
    makePieChart() {
        self = this;
        var chart = am4core.create(self.idElm, am4charts.PieChart);
        chart.radius = am4core.percent(85);

        self.configLegend(chart);
        self.configCircleType(chart);
        self.configInnerRadius(chart);
        
        chart.data = self.data;
        
        var series = chart.series.push(new am4charts.PieSeries());
        series.dataFields.value = self.metric[0];
        series.dataFields.category = self.dimension;
        series.slices.template.stroke = am4core.color("#fff");
        series.slices.template.strokeWidth = 2;
        series.slices.template.strokeOpacity = 1;
        series.slices.template.events.on('hit', (ev) => {
            const val = ev.target.dataItem.dataContext;
            if (self.callback) {
                self.callback(ev, self.visual, val);
            }
        }, this);
        // animate config
        series.hiddenState.properties.endAngle = -90;
        
        // series.slices.template.tooltipText = "{category} : [bold]{value}[/]";
        self.configTooltipWhite(series);
        
        if (self.labelSeries) {
            series.labels.template.text = "{category}";
        } else {
            series.ticks.template.disabled = true;
            series.labels.template.disabled = true;
        }
        
        var slice = series.slices.template;
        slice.states.getKey("hover").properties.scale = 1.05;
        slice.states.getKey("active").properties.shiftRadius = 0;
        
        return chart;
    }

    //=======================================================
    // Radar Chart
    //=======================================================
    makeRadarChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.RadarChart);
        chart.cursor = new am4charts.RadarCursor();
        chart.cursor.xAxis = categoryAxis;
        chart.cursor.fullWidthXLine = true;
        chart.cursor.lineX.strokeOpacity = 0;
        chart.cursor.lineX.fillOpacity = 0.1;
        chart.cursor.lineX.fill = am4core.color("#000000");
        chart.seriesContainer.zIndex = -1;

        self.configColorsStep(chart); 
        
        self.configLegend(chart);
        self.configCircleType(chart);
        self.configInnerRadius(chart);
        
        chart.data = self.data;
        
        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        // categoryAxis.renderer.labels.template.location = 0.5;
        // categoryAxis.renderer.tooltipLocation = 0.5;
        
        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        valueAxis.renderer.labels.template.horizontalCenter = "left";
        valueAxis.min = 0;
        
        function createAxisAndSeries(field, i) {
          var series = chart.series.push(new am4charts.RadarSeries());
          series.tooltipText = "{name} : [bold]{valueY.value}[/]";
          series.name = field;
          series.dataFields.categoryX = self.dimension;
          series.dataFields.valueY = field;
          series.strokeWidth = 2;
          
            // # Tooltip white background
            self.configTooltipWhite(series);
          
            self.configStacked(series);
            if (self.area) { 
                series.fillOpacity = 0.5; // Filling Area
            }
        }
        
        (self.metric).forEach((field, i) => {
            createAxisAndSeries(field, i);
        });
        return chart;
    }

    //=======================================================
    // Flower Chart
    //=======================================================
    makeFlowerChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.RadarChart);
        chart.cursor = new am4charts.RadarCursor();
        chart.cursor.xAxis = categoryAxis;
        chart.cursor.fullWidthXLine = true;
        chart.cursor.lineX.strokeOpacity = 0;
        chart.cursor.lineX.fillOpacity = 0.1;
        chart.cursor.lineX.fill = am4core.color("#000000");
        chart.seriesContainer.zIndex = -1;

        self.configColorsStep(chart); 
        
        self.configLegend(chart);
        self.configCircleType(chart);
        self.configInnerRadius(chart);
        
        chart.data = self.data;
        
        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.labels.template.location = 0.5;
        categoryAxis.renderer.tooltipLocation = 0.5;
        
        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        valueAxis.renderer.labels.template.horizontalCenter = "left";
        valueAxis.min = 0;
        
        function createAxisAndSeries(field, i) {
          var series = chart.series.push(new am4charts.RadarColumnSeries());
          series.tooltipText = "{name} : {valueY.value}";
          series.columns.template.width = am4core.percent(80);
          series.columns.template.events.on('hit', (ev) => {
              const val = ev.target.dataItem.dataContext;
              if (self.callback) {
                  self.callback(ev, self.visual, val);
              }
          }, this);
          series.name = field;
          series.dataFields.categoryX = self.dimension;
          series.dataFields.valueY = field;
          
            // # Tooltip white background
            self.configTooltipWhite(series);
          
            self.configStacked(series);
        }

        
        (self.metric).forEach((field, i) => {
            createAxisAndSeries(field, i);
        });
        return chart;
    }

    //=======================================================
    // Radial Bar Chart
    //=======================================================
    makeRadialBarChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.RadarChart);
        chart.cursor = new am4charts.RadarCursor();
        chart.cursor.lineX.strokeOpacity = 0;
        chart.cursor.lineX.fillOpacity = 0.1;
        chart.cursor.lineX.fill = am4core.color("#000000");
        chart.seriesContainer.zIndex = -1;

        self.configColorsStep(chart); 
        
        self.configLegend(chart);
        self.configCircleType(chart);
        self.configInnerRadius(chart);
        
        chart.data = self.data;
        
        var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.labels.template.horizontalCenter = "right";
        categoryAxis.renderer.grid.template.location = 0;
        categoryAxis.renderer.grid.template.strokeOpacity = 0.05;
        categoryAxis.renderer.minGridDistance = 10;
        
        var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
        valueAxis.renderer.labels.template.horizontalCenter = "left";
        valueAxis.renderer.maxLabelPosition = 0.99;
        valueAxis.renderer.grid.template.strokeOpacity = 0.05;
        valueAxis.min = 0;
        
        function createAxisAndSeries(field, i) {
            var series = chart.series.push(new am4charts.RadarColumnSeries());
            series.columns.template.tooltipText = "{categoryY} {name} : {valueX.value}";
            series.columns.template.width = am4core.percent(80);
            series.name = field;
            series.dataFields.categoryY = self.dimension;
            series.dataFields.valueX = field;
            series.columns.template.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
          
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            self.configStacked(series);
            return series;
        }

        (self.metric).forEach((field, i) => {
            createAxisAndSeries(field, i);
        });
        return chart;
    }
  
    //=======================================================
    // Bar - update 05/04/2023
    //=======================================================
    makeBarChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        // chart.cursor = new am4charts.XYCursor();
        // chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);
        
        chart.data = self.data;

        self.configScrollBar(chart, chart.data); 
        self.configColorsStep(chart); 
        
        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.grid.template.location = 0;
        // categoryAxis.renderer.labels.template.verticalCenter = "middle";
        
        // # Label width
        // categoryAxis.renderer.labels.template.wrap = true;
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 100;
        
        self.configRotateLabel(categoryAxis);
        // # Rotate Label
        // categoryAxis.events.on("sizechanged", function(ev) {
        //     var axis = ev.target;
        //     var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
        //     if (cellWidth < axis.renderer.labels.template.maxWidth) {
        //         axis.renderer.labels.template.horizontalCenter = "right";
        //         axis.renderer.labels.template.verticalCenter = "middle";
        //         axis.renderer.labels.template.rotation = -90;
        //         // axis.renderer.labels.template.rotation = -45;
        //         categoryAxis.renderer.minGridDistance = 10;
        //         categoryAxis.renderer.labels.template.wrap = false;
        //         categoryAxis.renderer.labels.template.truncate = true;
        //     } else {
        //         axis.renderer.labels.template.rotation = 0;
        //         axis.renderer.labels.template.horizontalCenter = "middle";
        //         // categoryAxis.renderer.labels.template.wrap = false;
        //         // categoryAxis.renderer.labels.template.truncate = true;
        //     }
        // });

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        if (chart.yAxes.indexOf(valueAxis) != 0) {
            valueAxis.syncWithAxis = chart.yAxes.getIndex(0);
        }
        valueAxis.renderer.minGridDistance = 30;
        valueAxis.renderer.baseGrid.disabled = true;
        
        // # 100% width series
        // valueAxis.min = 0;
        // valueAxis.max = 100;
        // valueAxis.strictMinMax = true;
        // valueAxis.calculateTotals = true;
        
        function createAxisAndSeries(field, i) {
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.categoryX = self.dimension;
            series.dataFields.valueY = field;
            series.columns.template.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
            // series.columns.template.tooltipY = 0;
            
            // series.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            series.columns.template.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            series.columns.template.tooltipY = am4core.percent(50);
            series.columns.template.tooltipX = am4core.percent(50);
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            series.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            self.configStacked(series);
        
            return series;
        }
    // # Dynamic Color Chart
    // if (self.colorType != 'single') {
    //     series.columns.template.adapter.add("fill", function(fill, target) {
    //         return chart.colors.getIndex(target.dataItem.index);
    //     });
    //     series.columns.template.adapter.add("stroke", function(fill, target) {
    //         return chart.colors.getIndex(target.dataItem.index);
    //     });
    // }
        (self.metric).forEach((field, i) => {
            createAxisAndSeries(field, i);
        });



    return chart;
	
    }

    //=======================================================
    // Row - update 04/04/2022
    //=======================================================
    makeRowChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        // chart.cursor = new am4charts.XYCursor();
        // chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);

        chart.data = self.data;

        self.configColorsStep(chart); 
        
        var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.minGridDistance = 20;
        categoryAxis.renderer.grid.template.location = 0;
        categoryAxis.renderer.grid.template.disabled = true; // hide border top-bottom
        
        // # Label width
        // categoryAxis.renderer.labels.template.wrap = true;
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 80;
        
        // # Label dynamic rotation
        // categoryAxis.events.on("sizechanged", function(ev) {
        //     var axis = ev.target;
        //     var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
        //     if (cellWidth < axis.renderer.labels.template.maxWidth) {
        //         axis.renderer.labels.template.rotation = -45;
        //         axis.renderer.labels.template.horizontalCenter = "right";
        //     }
        //     else {
        //         axis.renderer.labels.template.rotation = 0;
        //         axis.renderer.labels.template.horizontalCenter = "middle";
        //     }
        // });

        var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
        if (chart.xAxes.indexOf(valueAxis) != 0) {
            valueAxis.syncWithAxis = chart.xAxes.getIndex(0);
        }
        // valueAxis.min = 0;
        valueAxis.renderer.minGridDistance = 60;
        valueAxis.renderer.baseGrid.disabled = true;

        // # 100% width series
        // valueAxis.max = 100;
        // valueAxis.strictMinMax = true;
        // valueAxis.calculateTotals = true;
        
        function createAxisAndSeries(field, i) {
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.categoryY = self.dimension;
            series.dataFields.valueX = field;
            series.columns.template.tooltipX = 0;
            series.columns.template.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
            
            // series.tooltipText = ((self.metric).length == 1) ? " {categoryY} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
            series.columns.template.tooltipText = ((self.metric).length == 1) ? " {categoryY} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
            series.columns.template.tooltipY = am4core.percent(50);
            series.columns.template.tooltipX = am4core.percent(50);
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            series.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            self.configStacked(series);
        
            return series;
        }
    // # Dynamic Color Chart
    // if (self.colorType != 'single') {
    //     series.columns.template.adapter.add("fill", function(fill, target) {
    //         return chart.colors.getIndex(target.dataItem.index);
    //     });
    //     series.columns.template.adapter.add("stroke", function(fill, target) {
    //         return chart.colors.getIndex(target.dataItem.index);
    //     });
    // }
        (self.metric).forEach((field, i) => {
            createAxisAndSeries(field, i);
        });
        return chart;
    }

    //=======================================================
    // BulletBar - update 04/04/2022
    //=======================================================
    makeBulletBarChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);
        
        chart.data = self.data;

        self.configScrollBar(chart, chart.data); 
        self.configColorsStep(chart); 
        
        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.minGridDistance = 50;
        categoryAxis.renderer.grid.template.location = 0;
        
        // # Label width
        // categoryAxis.renderer.labels.template.wrap = true;
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 80;

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.min = 0;
        valueAxis.renderer.minGridDistance = 30;
        valueAxis.renderer.baseGrid.disabled = true;
        
        var series = chart.series.push(new am4charts.ColumnSeries());
        series.dataFields.categoryX = self.dimension;
        series.dataFields.valueY = self.metric[0];
        series.columns.template.tooltipY = 0;
        series.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
        // # Tooltip white background
        self.configTooltipWhite(series);

        series.name =  (self.metric[0] ?? "Unnamed Series").replaceAll('_', ' ').trim();
        series.clustered = false;

        self.configStacked(series);
            
        if ((self.metric).length >= 2) {
            var series2 = chart.series.push(new am4charts.ColumnSeries());
            series2.dataFields.categoryX = self.dimension;
            series2.dataFields.valueY =  self.metric[1];
            series2.columns.template.width = am4core.percent(50);
            series2.columns.template.tooltipY = 0;
            series2.columns.template.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
            series2.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            // # Tooltip white background
            self.configTooltipWhite(series2);

            series2.name = (self.metric[1] ?? "Unnamed Series").replaceAll('_', ' ').trim();
            series2.clustered = false;
            self.configStacked(series2);
        }   

        return chart;
    }
    
    makeBulletRow() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);

        chart.data = self.data;

        self.configColorsStep(chart); 
        
        var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.minGridDistance = 20;
        categoryAxis.renderer.grid.template.location = 0;
        categoryAxis.renderer.grid.template.disabled = true; // hide border top-bottom
        
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 80;
        

        var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
        valueAxis.min = 0;
        valueAxis.renderer.minGridDistance = 60;
        valueAxis.renderer.baseGrid.disabled = true;

        
        var series = chart.series.push(new am4charts.ColumnSeries());
        series.dataFields.categoryY = self.dimension;
        series.dataFields.valueX = self.metric[0];
        series.columns.template.tooltipX = 0;
            
        series.tooltipText = ((self.metric).length == 1) ? " {categoryY} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
        // # Tooltip white background
        self.configTooltipWhite(series);
            
        series.name = (self.metric[0] ?? "Unnamed Series").replaceAll('_', ' ').trim();
        series.clustered = false;
        
        self.configStacked(series);

        if ((self.metric).length >= 2) {
            var series2 = chart.series.push(new am4charts.ColumnSeries());
            series2.dataFields.categoryY = self.dimension;
            series2.dataFields.valueX = self.metric[1];
            series2.columns.template.height = am4core.percent(50);
            series2.columns.template.tooltipX = 0;
            series2.columns.template.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
            
            series2.tooltipText = ((self.metric).length == 1) ? " {categoryY} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
            // # Tooltip white background
            self.configTooltipWhite(series2);
            
            series2.name = (self.metric[1] ?? "Unnamed Series").replaceAll('_', ' ').trim();
            series2.clustered = false;
            self.configStacked(series2);
        }
        return chart;
    }
    
    makeRowLine() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);

        chart.data = self.data;

        self.configColorsStep(chart); 
        
        var categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.minGridDistance = 20;
        categoryAxis.renderer.grid.template.location = 0;
        categoryAxis.renderer.grid.template.disabled = true; // hide border top-bottom
        
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 80;
        

        var valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
        if (chart.xAxes.indexOf(valueAxis) != 0) {
            valueAxis.syncWithAxis = chart.xAxes.getIndex(0);
        }
        // valueAxis.min = 0;
        valueAxis.renderer.minGridDistance = 60;
        valueAxis.renderer.baseGrid.disabled = true;
        
        function createBarSeries(field, i) {
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.categoryY = self.dimension;
            series.dataFields.valueX = field;
            series.columns.template.tooltipX = 0;
            
            series.tooltipText = ((self.metric).length == 1) ? " {categoryY} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            series.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            self.configStacked(series);
        
            return series;
        }

        function createLineSeries(field, i) {
            //Line Series
            var seriesLine = chart.series.push(new am4charts.LineSeries());
            seriesLine.dataFields.categoryY = self.dimension;
            seriesLine.dataFields.valueX = field;
            // seriesLine.yAxis = valueAxis;
            seriesLine.tooltipText = ((self.metric).length == 2) ? " {categoryX} : [bold]{valueX}[/] " : "{name} : [bold]{valueX}[/]";
            seriesLine.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            seriesLine.strokeWidth = 1.5;
            seriesLine.smoothing = "monotoneY";
            // seriesLine.tensionX = 0.95;
            // seriesLine.tensionY = 0.95;
            seriesLine.showOnInit = true;

            seriesLine.fillOpacity = 0.2; // Filling Area
                
            // # Tooltip white background
            self.configTooltipWhite(seriesLine);
                
            // # Style Node Circle
            var interfaceColors = new am4core.InterfaceColorSet();
            var bullet = seriesLine.bullets.push(new am4charts.CircleBullet());
            bullet.circle.stroke = interfaceColors.getFor("background");
            bullet.circle.radius = 3;
            bullet.circle.strokeWidth = 1;
    
            // # Style Node Circle w/black stroke
            // seriesLine.stroke = new am4core.InterfaceColorSet().getFor(
            //     "alternativeBackground"
            //     );
            // var bullet = seriesLine.bullets.push(new am4charts.Bullet());
            // bullet.fill = seriesLine.stroke;
            // var circle = bullet.createChild(am4core.Circle);
            // circle.radius = 4;
            // circle.fill = seriesLine.fill;
            // circle.strokeWidth = 2;

            return seriesLine;
        }

        if ((self.metric).length >= 2) {
            var metricBar = $.extend( [], self.metric ) ; 
            var metricLine = [metricBar.pop()];

            metricBar.forEach((field, i) => {
                createBarSeries(field, i);
            });

            metricLine.forEach((field, i) => {
                createLineSeries(field, i);
            });

        }else{
            (self.metric).forEach((field, i) => {
                createBarSeries(field, i);
            });
        }

        return chart;
    }

    //=======================================================
    // Bar Line - update 04/04/2022
    //=======================================================
    makeBarLineChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);
        
        chart.data = self.data;

        self.configScrollBar(chart, chart.data); 
        self.configColorsStep(chart); 

        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        categoryAxis.renderer.minGridDistance = 50;
        categoryAxis.renderer.grid.template.location = 0;
        
        // # Label width
        // categoryAxis.renderer.labels.template.wrap = true;
        categoryAxis.renderer.labels.template.truncate = true;
        categoryAxis.renderer.labels.template.maxWidth = 80;

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        // valueAxis.min = 0;
        if (chart.yAxes.indexOf(valueAxis) != 0) {
            valueAxis.syncWithAxis = chart.yAxes.getIndex(0);
        }
        valueAxis.renderer.minGridDistance = 30;
        valueAxis.renderer.baseGrid.disabled = true;
        
        function createBarSeries(field, i) {
            var series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.categoryX = self.dimension;
            series.dataFields.valueY = field;
            series.columns.template.tooltipY = 0;
            
            series.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            series.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            self.configStacked(series);
        
            return series;
        }

        function createLineSeries(field, i) {
            var seriesLine = chart.series.push(new am4charts.LineSeries());
            seriesLine.dataFields.categoryX = self.dimension;
            seriesLine.dataFields.valueY = field;
            seriesLine.yAxis = valueAxis;
            seriesLine.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            seriesLine.name = (field ?? "Unnamed Series").replaceAll('_', ' ').trim();
            seriesLine.strokeWidth = 1.5;
            seriesLine.smoothing = "monotoneX";
            // seriesLine.tensionX = 0.95;
            // seriesLine.tensionY = 0.95;
            seriesLine.showOnInit = true;

            seriesLine.fillOpacity = 0.2; // Filling Area
            
            // # Tooltip white background
            self.configTooltipWhite(seriesLine);
            
            // # Style Node Circle
            var interfaceColors = new am4core.InterfaceColorSet();
            var bullet = seriesLine.bullets.push(new am4charts.CircleBullet());
            bullet.circle.stroke = interfaceColors.getFor("background");
            bullet.circle.radius = 3;
            bullet.circle.strokeWidth = 1;

            // # Style Node Circle w/black stroke
            // seriesLine.stroke = new am4core.InterfaceColorSet().getFor(
            //     "alternativeBackground"
            //     );
            // var bullet = seriesLine.bullets.push(new am4charts.Bullet());
            // bullet.fill = seriesLine.stroke;
            // var circle = bullet.createChild(am4core.Circle);
            // circle.radius = 4;
            // circle.fill = seriesLine.fill;
            // circle.strokeWidth = 2;
        
            return seriesLine;
        }

        if ((self.metric).length >= 2) {
            var metricBar = $.extend( [], self.metric ) ; 
            var metricLine = [metricBar.pop()];

            metricBar.forEach((field, i) => {
                createBarSeries(field, i);
            });

            metricLine.forEach((field, i) => {
                createLineSeries(field, i);
            });

        }else{
            (self.metric).forEach((field, i) => {
                createBarSeries(field, i);
            });
        }
        return chart;
    }
    
    //=======================================================
    // Line Chart - update 04/04/2022
    //=======================================================
    makeLineChart() {
        self = this;
        if (self.dimension == undefined) {
            self.showAlert(self.idElm);
            return true
        };

        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.maxTooltipDistance = -1;
        self.configLegend(chart);
        
        chart.data = self.data;

        self.configScrollBar(chart, chart.data); 
        self.configColorsStep(chart); 
        
        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = self.dimension;
        // categoryAxis.renderer.minGridDistance = 50;
        categoryAxis.renderer.grid.template.location = 0;
        categoryAxis.renderer.labels.template.maxWidth = 100;
        
        self.configRotateLabel(categoryAxis);
        
        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        if (chart.yAxes.indexOf(valueAxis) != 0) {
            valueAxis.syncWithAxis = chart.yAxes.getIndex(0);
        }
        valueAxis.renderer.line.strokeOpacity = 1;
        valueAxis.renderer.line.strokeWidth = 1;
        // valueAxis.renderer.line.stroke = series.stroke;
        // valueAxis.renderer.labels.template.fill = series.stroke;
        // valueAxis.renderer.opposite = (i%2 ? true : false); // jika index series bernilai ganjil maka akan render axis di sebelah kiri

        function createAxisAndSeries(field, i) {    
            var series = chart.series.push(new am4charts.LineSeries());
            series.dataFields.valueY = field;
            series.dataFields.categoryX = self.dimension;
            series.yAxis = valueAxis;
            series.tooltipText = ((self.metric).length == 1) ? " {categoryX} : [bold]{valueY}[/] " : "{name} : [bold]{valueY}[/]";
            series.name = field;
            series.strokeWidth = 1.5;
            series.smoothing = "monotoneX";
            // series.tensionX = 0.95;
            // series.tensionY = 0.95;
            series.showOnInit = true;

            if (self.area) { 
                series.fillOpacity = 0.2; // Filling Area
            }
            self.configStacked(series);
            
            // # Tooltip white background
            self.configTooltipWhite(series);
            
            // # Style Node Circle
            var interfaceColors = new am4core.InterfaceColorSet();
            var bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.circle.stroke = interfaceColors.getFor("background");
            bullet.circle.radius = 3;
            bullet.circle.strokeWidth = 1;
            bullet.events.on('hit', (ev) => {
                const val = ev.target.dataItem.dataContext;
                if (self.callback) {
                    self.callback(ev, self.visual, val);
                }
            }, this);
                    
            return series;
        }
        (self.metric).forEach((field, i) => {
          createAxisAndSeries(field, i);
        });
        return chart;
    }
    
    //=======================================================
    // Scatterplot Chart
    //=======================================================
    makeScatterChart(){
        self = this;
        am4core.unuseTheme(am4themes_animated);
        var chart = am4core.create(self.idElm, am4charts.XYChart);
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.behavior = "zoomXY";

        // Check If Dimension Is Cluster, Set Color Properties
        if (self.dimension && self.dimension.toUpperCase().includes('CLUSTER')) {
            var new_data = [];
            var clusters = [];
            self.data.forEach((data) => {
                var cluster = data[self.dimension];
                if (clusters.indexOf(cluster) == -1) {
                    clusters.push(cluster);
                }
                if (clusters.indexOf(cluster) + 1 > chart.colors.length) {
                    data['color'] = '#000000';
                } else {
                    data['color'] = chart.colors.getIndex(clusters.indexOf(cluster));
                }
                new_data.push(data);
            })
            self.data = new_data;
        }

        chart.data = self.addDataLinearRegression();

        var bubbleValue = (self.metric[2]) ? self.metric[2] : false; //Jika metric value tidak ada, maka circle biasa
        var coordinatesY = (self.metric[1]) ? self.metric[1] : [0];

        var xAxis = chart.xAxes.push(new am4charts.ValueAxis());
        xAxis.title.text = self.metric[0];
        var yAxis = chart.yAxes.push(new am4charts.ValueAxis());
        yAxis.title.text = coordinatesY;

        var series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.categoryX = self.dimension;
        series.dataFields.valueY = coordinatesY;
        series.dataFields.valueX = self.metric[0];
        series.strokeOpacity = 0;
        series.tooltip.pointerOrientation = "vertical";

        // # Tooltip white background
        self.configTooltipWhite(series);

        var bullet = series.bullets.push(new am4core.Circle());
        bullet.propertyFields.fill = "color";
        bullet.fillOpacity = 0.5;
        bullet.strokeWidth = 0;
        bullet.radius = 6;
        // bullet.stroke = am4core.color("#ffffff");
        // bullet.hiddenState.properties.opacity = 0;
        if (bubbleValue) {
            series.heatRules.push({
                target: bullet,
                min: 8,
                max: 60,
                property: "radius",
            });
        }

        var plotName = (self.dimension != undefined) ? "[bold]" + self.dimension + " : {categoryX}[/] \n" : "";
        if (bubbleValue) {
            series.dataFields.value = bubbleValue;
            bullet.tooltipText =
            plotName + "[bold]" + bubbleValue + " : {value}[/] \n" + self.metric[0] + " : [bold]{valueX}[/] \n" + coordinatesY + " : [bold]{valueY}[/]";
        } else {
            bullet.tooltipText =
                plotName + self.metric[0] + " : [bold]{valueX}[/] \n" + coordinatesY + " : [bold]{valueY}[/]";
        }

        // var hoverState = bullet.states.create("hover");
        // hoverState.properties.fillOpacity = 1;
        // hoverState.properties.strokeOpacity = 1;
        chart.svgContainer.autoResize = false;
        self.configTrendLine(chart);

        return chart;
    }

    //=======================================================
    // Heatmap Geo
    //=======================================================
    makeHeatmapGeo(){
        self = this;
        self.mapView = self.mapView == undefined ? 'ALL' : self.mapView;
        let countryData = [];
        var countryValue = new Map();
        let stateData = [];

        //Set up data
        self.data.forEach((data_map) => {
            let countryCode = Object.values(data_map)[0];
            let stateCode = Object.values(data_map)[1];
            let value = Object.values(data_map)[2];

            if (countryValue.has(countryCode)) {
                countryValue.set(countryCode, (countryValue.get(countryCode)) + value)
            } else {
                countryValue.set(countryCode, value)
            };

            stateData.push({
                id: countryCode + '-' + stateCode,
                value: value,
            });
        });

        countryValue.forEach (function(value, key) {
            countryData.push({
                id: key,
                value: value,
            });
        });
        //--
        var chart = am4core.create(self.idElm, am4maps.MapChart);
        chart.projection = new am4maps.projections.Miller();

        chart.padding(10, 10, 10, 10);
        chart.zoomControl = new am4maps.ZoomControl();
        chart.chartContainer.wheelable = false;
        chart.cursorOverStyle = am4core.MouseCursorStyle.grab;

        //Check mapView selected
        if (self.mapView === "ALL") {
            var worldSeries = chart.series.push(new am4maps.MapPolygonSeries());
            worldSeries.geodata = am4geodata_worldLow;
            worldSeries.useGeodata = true;
            worldSeries.exclude = ["AQ"];
            worldSeries.heatRules.push({
                property: "fill",
                target: worldSeries.mapPolygons.template,
                min: chart.colors.getIndex(0).brighten(1),
                max: chart.colors.getIndex(0).brighten(-0.3)
            });
            
            self.configlegendHeatmap(chart, countryData, worldSeries);
            self.configTooltipWhite(worldSeries);
            
            var worldPolygon = worldSeries.mapPolygons.template;
            worldPolygon.tooltipText = "{name} ({id}) : {value}";
            worldPolygon.nonScalingStroke = true;
            worldPolygon.cursorOverStyle = am4core.MouseCursorStyle.pointer;
            
            var hs = worldPolygon.states.create("hover");
            hs.properties.fill = chart.colors.getIndex(2);
            hs.properties.fill.fillOpacity = 0.5;
            
            // Set up click events
            worldPolygon.events.on("hit", function(ev) {
                ev.target.series.chart.zoomToMapObject(ev.target);
                var mapId = ev.target.dataItem.dataContext.id;
                var map = ev.target.dataItem.dataContext.map;
                if (map) {
                    ev.target.isHover = false;
                    var dataCountrySelected = stateData.filter(function (el)
                    {
                        return el.id.includes(mapId + "-");
                    });
                    createCountrySeries(map, dataCountrySelected);
                }
            });
            
            // Set up data for countries
            var plainWorldData = [];
            for(var id in am4geodata_data_countries2) {
                if (am4geodata_data_countries2.hasOwnProperty(id)) {
                    var country = am4geodata_data_countries2[id];
                    if (country.maps.length) {
                        plainWorldData.push({
                            id: id,
                            map: country.maps[0]
                        });
                    };
                };
            };
            
            var worldSeriesData = plainWorldData.map(p_el => {
                let valueWorldData = countryData.find(el => el.id === p_el.id)
                return { ...p_el, ...valueWorldData }
            })
            worldSeries.data = worldSeriesData;

            //HomeBtn Control
            var homeButton = new am4core.Button();
            homeButton.events.on("hit", function() {
                if (chart.series.getIndex(1)) {
                    chart.series.removeIndex(1).dispose();
                    worldSeries.show();
                    chart.goHome();
                    
                    self.configlegendHeatmap(chart, countryData, worldSeries);
                }else{
                    chart.goHome();
                };
            });
            homeButton.icon = new am4core.Sprite();
            homeButton.padding(7, 5, 7, 5);
            homeButton.width = 30;
            homeButton.icon.path = "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8";
            homeButton.marginBottom = 10;
            homeButton.parent = chart.zoomControl;
            homeButton.insertBefore(chart.zoomControl.plusButton);

        } else {
            var dataCountrySelected = stateData.filter(function (el){
                return el.id.includes(self.mapView.toUpperCase() +"-");
            });
            let mapViewId = am4geodata_data_countries2[self.mapView.toUpperCase()].maps[0]

            createCountrySeries(mapViewId, dataCountrySelected);
        };

        //-------------------------------------------------
        function createCountrySeries(map, seriesData){
            var countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
            countrySeries.geodataSource.url = "https://www.amcharts.com/lib/4/geodata/json/" + map + ".json";
            countrySeries.geodataSource.load();
            countrySeries.useGeodata = true;
            countrySeries.data = seriesData;
            if(map === "indonesiaLow"){
                countrySeries.exclude = ["MY-12", "MY-13", "BN", "TL"];
            }
            
            countrySeries.heatRules.push({
                property: "fill",
                target: countrySeries.mapPolygons.template,
                min: chart.colors.getIndex(0).brighten(1),
                max: chart.colors.getIndex(0).brighten(-0.3),
                // logarithmic: true
            });
            countrySeries.geodataSource.events.on("done", function(ev) {
                worldSeries.hide();
                countrySeries.show();
            });
            
            var countryPolygon = countrySeries.mapPolygons.template;
            countryPolygon.tooltipText = "{name} ({id}) : {value}";
            countryPolygon.nonScalingStroke = true;
            countryPolygon.cursorOverStyle = am4core.MouseCursorStyle.pointer;
      
            
            var hsi = countryPolygon.states.create("hover");
            hsi.properties.fill = chart.colors.getIndex(2);
            hsi.properties.fill.fillOpacity = 0.5;
            
            self.configlegendHeatmap(chart, seriesData, countrySeries);
            self.configTooltipWhite(countrySeries);
            
            return countrySeries;
        };
    };

    // --------------------------------------------------------------------------------------
    //=======================================================
    // Scorecard - Basic
    //=======================================================
    formatNumberToString(number, metric) {
        var self = this;
        numberString = number.toString();
        var prefix = '';
        if (metric in self.prefix_by_field) {
            prefix = self.prefix_by_field[metric] + ' ';
        }
        var suffix = '';
        if (metric in self.suffix_by_field) {
            suffix = ' ' + self.suffix_by_field[metric];
        }
        var decimal_places = 0;
        if (metric in self.decimal_places_by_field) {
            decimal_places = self.decimal_places_by_field[metric];
        }
        var locale_code = 'en-US';
        if (metric in self.locale_code_by_field) {
            locale_code = self.locale_code_by_field[metric];
        }
        var numberString = prefix + parseFloat(number).toLocaleString(locale_code, {minimumFractionDigits: decimal_places, maximumFractionDigits: decimal_places}) + suffix;
        return numberString;
    }
    makeScorecardBasic() {
        var self = this;
        var currencyCode = self.currencyCode || "";
        var particle = self.particle || "";

        var recentValue = (self.data).length ? (self.data[(self.data).length - 1])[self.metric[0]] : 0;
        var recentValueString = self.formatNumberToString(recentValue, self.metric[0]);
        
        $("#" + self.idElm).removeClass (function (index, className) {
            return (className.match (/(^|\s)scorecard-style_\S+/g) || []).join(' ');
        });
        $("#" + self.idElm).addClass(`scorecard scorecard-sm scorecard-${self.scorecardStyle}`);
        $("#" + self.idElm).attr('style', `background-color: ${self.backgroundColor} !important; border-color: ${self.borderColor} !important; color: ${self.fontColor} !important;`)
        $("#" + self.idElm).append(
        `
            <div class="flex-column flex-2" style="min-width: 0;">
                <div class="flex-row" style="align-items : flex-end !important;">
                    <span class="scorecard-title">`+ self.title +`</span>
                </div>
                <div class="flex-row">
                    <div class="scorecard-value">`+ currencyCode +" "+ recentValueString +`</div>
                    <small class="scorecard-particle">`+ particle +`</small>
                </div>
            </div>
            <div class="scorecard-img-container" style="">
                <i class="material-icons" style="color: ${self.scorecardIconColor} !important;">${self.scorecardIcon}</i>
            </div>
            `
            );

        $('.scorecard-value, .scorecard-title ,.scorecard-target').bind('mouseenter', function(){
            var $this = $(this);
            if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
                $this.attr('title', $this.text());
            }
        });
    }
    //=======================================================
    // Scorecard - Trend
    //=======================================================
    makeScorecardTrend() {
        var self = this;
        $("#" + self.idElm).removeClass (function (index, className) {
            return (className.match (/(^|\s)scorecard-style_\S+/g) || []).join(' ');
        });
        if (self.dimension == undefined) {
            $("#" + self.idElm).addClass("scorecard scorecard-sm");
            $('#'+self.idElm).append(`
                <div class="row alert-warning izi_alert">
                    <div class="izi_alert_icon">
                        <span class="material-icons-outlined">warning</span>
                    </div>
                    <div class="col">
                        <h4>Dimension is not defined </h4>
                        Select time field to see how this has changed over time.
                    </div>
                </div>
            `);
            return true
        };

        var elmGrowthNum = "";
        var elmIllustration = "";
        var currencyCode = self.currencyCode || "";
        var particle = self.particle || "";

        var recentValue = (self.data).length ? (self.data[(self.data).length - 1])[self.metric[0]] : 0;
        var recentValueString = self.formatNumberToString(recentValue, self.metric[0]);
        
        elmIllustration = `
            <div class="scorecard-chart flex-1"></div>
        `;
        // Trends Growth 
        if ((self.data).length >= 2) {
            ((self.data)[(self.data).length - 1])["opacity"]= 1
            var previousValue = (self.data[(self.data).length - 2])[self.metric[0]];
            var previousValueString = self.formatNumberToString(previousValue, self.metric[0]);
            var growthNumBase = (recentValue - previousValue) / previousValue * 100;
            var growthNum = Math.round(growthNumBase);

            if (growthNum > 0) {
                elmGrowthNum = ` <div class="scorecard-status label label-success" title=" Increased from `+ previousValueString +`">
                                    <span class="material-icons">arrow_drop_up</span>
                                    `+ growthNum +`% </div> `
            }else if(growthNum < 0){
                elmGrowthNum = ` <div class="scorecard-status label label-danger" title=" Decreased from `+ previousValueString +`">
                                    <span class="material-icons">arrow_drop_down</span>
                                    `+ growthNum.toString().substring(1) +`% </div> `
            }
        }else{
            elmIllustration = `
            <div style="max-width: 55%;">
                <div class="alert-warning izi_alert">
                    <div class="col">
                        Nothing to compare for the previous period.
                    </div>
                </div>    
            </div>
                `;
        }
        //-----------

        $("#" + self.idElm).addClass("scorecard scorecard-sm");
        $("#" + self.idElm).append(
        `
            <div class="flex-column flex-2" style="min-width: 0;">
                <div class="flex-row" style="align-items : flex-end !important;">
                    <span class="scorecard-title">`+ self.title +`</span>
                </div>
                <div class="flex-row">
                    <div class="scorecard-value">`+ currencyCode +" "+ recentValueString +`</div>
                    <small class="scorecard-particle">`+ particle +`</small>
                    ${elmGrowthNum}
                </div>
            </div>
            ${elmIllustration}
        `
        );
        self.addMicroChartLine(".scorecard-chart", "full-endpoint");

        $('.scorecard-value, .scorecard-title ,.scorecard-target').bind('mouseenter', function(){
            var $this = $(this);
            if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
                $this.attr('title', $this.text());
            }
        });
    }
    //=======================================================
    // Scorecard - Progress
    //=======================================================
    makeScorecardProgress() {
        var self = this;
        $("#" + self.idElm).removeClass (function (index, className) {
            return (className.match (/(^|\s)scorecard-style_\S+/g) || []).join(' ');
        });
        if (self.metric.length <= 1) {
            $("#" + self.idElm).addClass("scorecard scorecard-sm");
            $('#'+self.idElm).append(`
                <div class="row alert-warning izi_alert">
                <div class="izi_alert_icon">
                    <span class="material-icons-outlined">warning</span>
                </div>
                <div class="col">
                    <h4>Target is not defined </h4>
                    Select second metric for target number. 
                </div>
            </div>
            `);
            return true
        };

        var elmGrowthNum = "";
        var elmIllustration = "";
        var elmTarget = "";
        var currencyCode = self.currencyCode || "";
        var particle = self.particle || "";

        var recentValue = (self.data).length ? (self.data[(self.data).length - 1])[self.metric[0]] : 0;
        var recentValueString = self.formatNumberToString(recentValue, self.metric[0]);
        var recentTarget =  0;
        var recentAchievement = 0;
        if (self.metric.length >= 2) {
            recentTarget = (self.data).length ? (self.data[(self.data).length - 1])[self.metric[1]] : 0;
            var recentTargetString = self.formatNumberToString(recentTarget, self.metric[1]);
            if (recentTarget > 0) {
                recentAchievement = Math.round(100 * recentValue / recentTarget);
                elmTarget = `
                    <div class="flex-row">
                        <div class="scorecard-target">From Target `+ currencyCode +" "+ recentTargetString +`</div>
                        <small class="scorecard-particle">`+ particle +`</small>
                    </div>
                `;
            }
        }
        elmIllustration = `
            <div class="scorecard-chart flex-1"></div>
        `;
        //-----------

        $("#" + self.idElm).addClass("scorecard scorecard-sm");
        $("#" + self.idElm).append(
        `
            <div class="flex-column flex-2" style="min-width: 0;">
                <div class="flex-row" style="align-items : flex-end !important;">
                    <span class="scorecard-title">`+ self.title +`</span>
                </div>
                <div class="flex-row">
                    <div class="scorecard-value">`+ currencyCode +" "+ recentValueString +`</div>
                    <small class="scorecard-particle">`+ particle +`</small>
                    ${elmGrowthNum}
                </div>
                ${elmTarget}
            </div>
            ${elmIllustration}
            `
            );
        
        if (recentAchievement > 0) {
            var circleStrokeWidth = 1;
            var circleRadius = 4;
            var cx = 5;
            var cy = 5;

            $("#" + self.idElm + " .scorecard-chart").append(
                `<svg class="circle-ring" viewBox="0 0 10 10">
                    <circle class="circle-grey" stroke="#F0F0F0" stroke-width="`+ circleStrokeWidth +`" fill="transparent" r="`+ circleRadius +`" cx="`+ cx +`" cy="`+ cy +`"/>
                    <text x="`+ cx +`" y="`+ cy +`" fill="#4c4c4c" text-anchor="middle" dy="0.38em" class="percentage">` + recentAchievement.toLocaleString() + `%</text>
                </svg>`
            );
            self.addMicroChartCircleProgress(".circle-ring", recentAchievement, circleStrokeWidth, circleRadius, cx, cy);
        } 

        $('.scorecard-value, .scorecard-title ,.scorecard-target').bind('mouseenter', function(){
            var $this = $(this);
            if(this.offsetWidth < this.scrollWidth && !$this.attr('title')){
                $this.attr('title', $this.text());
            }
        });
    }

    //=======================================================
    // Config - Legend
    //=======================================================
    configLegend(selfChart){
        if (self.legendPosition != 'none') {
            selfChart.legend = new am4charts.Legend();
            selfChart.legend.position = self.legendPosition;
            selfChart.legend.scrollable = true;
            
            let markerTemplate = selfChart.legend.markers.template;
            markerTemplate.width = 16;
            markerTemplate.height = 16;

            if (self.legendPosition == "bottom" || self.legendPosition == undefined) {
                selfChart.legend.itemContainers.template.paddingTop = 5;
                selfChart.legend.itemContainers.template.paddingBottom = 5;

                if (selfChart._className == 'XYChart') {
                }else{
                    selfChart.chartAndLegendContainer.paddingBottom = 15;
                }

                selfChart.legend.maxHeight = 60;

            } else if(self.legendPosition == "top"){
                selfChart.legend.itemContainers.template.paddingTop = 5;
                selfChart.legend.itemContainers.template.paddingBottom = 5;

                selfChart.paddingTop = 0;
                selfChart.paddingBottom = 5;
                if (selfChart._className == 'XYChart') {
                    selfChart.topAxesContainer.paddingTop = 10;
                }else{
                    // selfChart.chartAndLegendContainer.paddingTop = 15;
                }

                selfChart.legend.maxHeight = 60;
                
            }
        }
    }

    //=======================================================
    // Config - Heatmap Legend
    //=======================================================
    configlegendHeatmap(selfChart, data, series){  // Set up custom heat map legend labels using axis ranges
        if (self.legendHeatmap || self.legendHeatmap == undefined) {
            let maxV = Math.max.apply(Math,data.map(function (n) { return n.value; }));
            let minV = Math.min.apply(Math,data.map(function (n) { return n.value; }));
            //Check MinMaxValue NaN
            let maxValue = (isFinite(maxV) ? maxV : 0 );
            let minValue = (isFinite(minV) ? minV : 0 );
            
            //Check HeatLegend is Exist
            var getLegendIndex = selfChart.children.getIndex(2);
            if(getLegendIndex !== undefined){
                selfChart.children.getIndex(2).dispose();
            }
            
            var heatLegend = selfChart.createChild(am4maps.HeatLegend);
            heatLegend.series = series;
            heatLegend.align = "right";
            heatLegend.valign = "bottom";
            heatLegend.width = 230;
            // heatLegend.marginRight = am4core.percent(4);
            heatLegend.marginRight = 45;
            heatLegend.marginBottom = 5;
            heatLegend.valueAxis.renderer.opposite = true;
            heatLegend.valueAxis.strictMinMax = false;
            heatLegend.valueAxis.fontSize = 11;
            // heatLegend.valueAxis.logarithmic = true;
            heatLegend.background.fill = am4core.color("#000");
            heatLegend.background.fillOpacity = 0.05;
            heatLegend.padding(5, 5, 5, 5);

            heatLegend.minColor = selfChart.colors.getIndex(0).brighten(1);
            heatLegend.maxColor = selfChart.colors.getIndex(0).brighten(-0.3);
            heatLegend.minValue = 0;
            heatLegend.maxValue = 100;
            
            var minRange = heatLegend.valueAxis.axisRanges.create();
            minRange.value = heatLegend.minValue;
            minRange.label.horizontalCenter = "left";
            minRange.label.text = heatLegend.numberFormatter.format(minValue);
            var maxRange = heatLegend.valueAxis.axisRanges.create();
            maxRange.value = heatLegend.maxValue;
            maxRange.label.horizontalCenter = "right";
            maxRange.label.text = heatLegend.numberFormatter.format(maxValue);

            if (minV === maxV && maxV !== 0) {
                minRange.label.text = "";
                maxRange.label.text = heatLegend.numberFormatter.format(maxValue);
                heatLegend.minColor = selfChart.colors.getIndex(0);
                heatLegend.maxColor = selfChart.colors.getIndex(0);
            } else if(!isFinite(minV)){
                maxRange.label.text = "";
                heatLegend.minColor = am4core.color("#D9D9D9");
                heatLegend.maxColor = am4core.color("#D9D9D9");
            }
            heatLegend.valueAxis.renderer.labels.template.adapter.add(
                "text", function (labelText) { return "";}
            );            
        }
    }

    //=======================================================
    // Config - CircleType
    //=======================================================
    configCircleType(selfChart){
        if (self.circleType == 'half') {
            selfChart.startAngle = 180;
            selfChart.endAngle = 360;
        } else if(self.circleType == 'threeQuarters'){
            selfChart.startAngle = -90;
            selfChart.endAngle = 180;
        }
    }

    //=======================================================
    // Config - InnerRadius
    //=======================================================
    configInnerRadius(selfChart){
        if (self.innerRadius) {
            selfChart.innerRadius = am4core.percent(self.innerRadius); //make donut
        }
    }
    
    //=======================================================
    // Config - stacked
    //=======================================================
    configStacked(selfSeries){
        if (self.stacked) {
            selfSeries.stacked = true;   // Make it stacked
        }
    }
    
    //=======================================================
    // Config - ColorsStep
    //=======================================================
    configColorsStep(selfChart){
        if ((self.metric).length <= 4) {
            selfChart.colors.step = 3;
        } else if ((self.metric).length >= 5 && (self.metric).length <= 8) {
            selfChart.colors.step = 2;
        } 
    }

    //=======================================================
    // Config - Tooltip White Background
    //=======================================================
    configTooltipWhite(selfSeries){
        selfSeries.tooltip.getFillFromObject = false;
        selfSeries.tooltip.getStrokeFromObject = true;
        selfSeries.tooltip.label.fill = am4core.color("black");
    }

    //=======================================================
    // Config - Trend Line
    //=======================================================
    configTrendLine(selfSeries){
        if (self.trendLine) {

            var lineTrend = selfSeries.series.push(new am4charts.LineSeries());
                lineTrend.dataFields.valueY = "yValues";
                lineTrend.dataFields.valueX = "xValues";
                lineTrend.strokeWidth = 3;
                lineTrend.strokeOpacity = 0.5;
                // lineTrend.name = field + "'s Trends";
                // lineTrend.plugins.push(new am4plugins_regression.Regression()); --
                // lineTrend.method = "polynomial";
                // lineTrend.simplify = true; --
                // lineTrend.reorder = true; --
                // lineTrend.tensionX = 0.9;
                
                return lineTrend;
        };
    }

    //=======================================================
    // Config - Auto Rotate Label
    //=======================================================
    configRotateLabel(selfCategoryAxis){
        if (self.rotateLabel) {
            selfCategoryAxis.renderer.minGridDistance = 10; //ketika Label dynamic rotation aktif

            selfCategoryAxis.events.on("sizechanged", function(ev) {
                var axis = ev.target;
                var cellWidth = axis.pixelWidth / (axis.endIndex - axis.startIndex);
                if (cellWidth < axis.renderer.labels.template.maxWidth) {
                    axis.renderer.labels.template.horizontalCenter = "right";
                    axis.renderer.labels.template.verticalCenter = "middle";
                    // axis.renderer.labels.template.rotation = -90;
                    axis.renderer.labels.template.rotation = -60;
                    selfCategoryAxis.renderer.minGridDistance = 10;
                    selfCategoryAxis.renderer.labels.template.wrap = false;
                    selfCategoryAxis.renderer.labels.template.truncate = true;
                } else {
                    axis.renderer.labels.template.rotation = 0;
                    axis.renderer.labels.template.horizontalCenter = "middle";
                    // selfCategoryAxis.renderer.labels.template.wrap = false;
                    // selfCategoryAxis.renderer.labels.template.truncate = true;
                }
            });
        }else{
            selfCategoryAxis.renderer.minGridDistance = 50; //default
        };
    }

    //=======================================================
    // Config - ScrollBar
    //=======================================================
    configScrollBar(selfChart, selfData){
        let selfDataLength = self.data.length;

        if (self.scrollBar) {
            selfChart.scrollbarX = new am4core.Scrollbar();
            if (selfDataLength <= 35) {
                selfChart.scrollbarX.start = 0.50;
                selfChart.scrollbarX.end = 1;
            } else if(selfDataLength > 31 && selfDataLength <= 60) {
                selfChart.scrollbarX.start = 0.75;
                selfChart.scrollbarX.end = 1;
            } else {
                selfChart.scrollbarX.start = 0.85;
                selfChart.scrollbarX.end = 1;
            }
        };
    }

    //=======================================================
    // Addons - micro lineChart
    //=======================================================
    addMicroChartLine(container, endPointType){
        self = this;
        var microchart_id = "micro" + self.idElm;
        $("#" + self.idElm + " " + container).attr("id", microchart_id);
        var chart = am4core.create(microchart_id, am4charts.XYChart);
        
        chart.data = self.data;
        
        var dateAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        dateAxis.dataFields.category = self.dimension;
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
        series.dataFields.categoryX = self.dimension;
        series.dataFields.valueY = self.metric[0];
        series.tooltipText = "{categoryX}: [bold]{valueY}";
        series.tooltip.pointerOrientation = "vertical";
        series.tensionX = 0.8;
        series.strokeWidth = 2;
        series.fillOpacity = 0.4;
        self.configTooltipWhite(series);
    
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

    //=======================================================
    // Addons Data - Linear Regression
    //=======================================================
    addDataLinearRegression(){
        var xArray = [];
        var yArray = [];
        (self.data).forEach((value, i) => {
            xArray.push(self.data[i][self.metric[0]])
            yArray.push(self.data[i][self.metric[1]])
        });
        
        // Calculate Sums
        var xSum=0, ySum=0, xxSum=0, yySum=0, xySum=0;
        var count = xArray.length;
        for (var i = 0, len = count; i < count; i++) {
            xSum += xArray[i];
            ySum += yArray[i];
            xxSum += xArray[i] * xArray[i];
            yySum += yArray[i] * yArray[i];
            xySum += xArray[i] * yArray[i];
        }
        
        // Calculate slope and intercept
        var slope = parseFloat(((count * xySum - xSum * ySum) / (count * xxSum - xSum * xSum)).toFixed(2)) ;
        var intercept = parseFloat(((ySum / count) - (slope * xSum) / count).toFixed(2)) ;
        var r_sqrt = parseFloat(Math.pow((count*xySum - xSum*ySum) / Math.sqrt((count*xxSum - xSum*xSum)*(count*yySum - ySum*ySum)),2).toFixed(2))
        
        // Generate values
        var xArray_sorted = xArray.sort(function(a, b){return a - b});
        var xValues = [];
        var yValues = [];
        (xArray_sorted).forEach((value, i) => {
            xValues.push(value);
            yValues.push(parseFloat((value * slope + intercept).toFixed(2)));
        });
        // console.log(">> Equation Y = "+ slope +"*x + "+ intercept)
        // console.log(">> r_sqrt = "+ r_sqrt)

        var chartDataExtended = self.data.map((v, i) => ({ ...v, xValues: xValues[i], yValues: yValues[i] }));

        return chartDataExtended;
    }

    //=======================================================
    // Microchart (Circle Progress)
    //=======================================================
    addMicroChartCircleProgress(container, progress, strokeWidth, radius, cx, cy){
        var self = this;
        var progressNumE = progress > 100 ? 100 : progress;
        var circleColor = "#ff0000";
        if (progress > 25) circleColor = "#ff6000";
        if (progress > 50) circleColor = "#fff700";
        if (progress > 70) circleColor = "#67ff00";
        if (progress > 90) circleColor = "#2B9EFF";

        $("#" + self.idElm + " " + container).append(
            fillingCircle()
        );

        function fillingCircle() {
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
                delay = (animationDuration * 0) / 100;
                circleFill.setAttribute("r", radius);
                circleFill.setAttribute("cx", cx);
                circleFill.setAttribute("cy", cy);
                circleFill.setAttribute("fill", "transparent");
                circleFill.setAttribute("stroke", circleColor);
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
    // Alert
    //=======================================================
    showAlert(container){
        var dom_alert = `
            <div class="row alert-danger izi_alert">
                <div class="izi_alert_icon">
                    <span class="material-icons-outlined">error</span>
                </div>
                <div class="col">
                    <h4>Dimension is not defined </h4>
                    Please select data fields for dimension ! 
                </div>
            </div>`;

            $('#'+container).append(dom_alert);
            $('#'+container ).closest("div").css({
                'display': 'flex',
                'align-items' : 'center',
                'justify-content': 'center',
            });
    }
    showError(container, error_message){
        var dom_alert = `
            <div class="row alert-danger izi_alert">
                <div class="izi_alert_icon">
                    <span class="material-icons-outlined">error</span>
                </div>
                <div class="col">
                    <h4>Error Fetching Data</h4>
                    <pre style="color: #723735;">${error_message}</pre>
                </div>
            </div>`;

            $('#'+container).append(dom_alert);
            $('#'+container ).closest("div").css({
                'display': 'flex',
                'align-items' : 'center',
                'justify-content': 'center',
            });
    }
}
