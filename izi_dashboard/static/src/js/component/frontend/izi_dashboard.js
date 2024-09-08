$(function() {
    var base_url = window.location.origin;
    var access_token = $('#access_token').val();
    var dashboard_id = $('#dashboard_id').val();
    $.ajax(`${base_url}/izi/dashboard/${dashboard_id}?access_token=${access_token}`, {
        headers: {
        },
        type : 'GET',
        success: async function(res, status){
            console.log("Response", res);
            if (res.data && res.code == 200) {
                // new swal('Success', 'Data Successfully Fetched', 'success');
                generateDashboard(res.data);
            } else {
                if (res.data && res.data.error)
                    new swal("Error", `${res.data.error_descrip}`, "error");
                else
                    new swal("Error", "Internal Server Error", "error");
            }
        },
        error: function(xhr, textStatus, errorThrown){
            if (xhr.responseJSON && xhr.responseJSON.data)
                new swal("Error", xhr.responseJSON.data, "error");
            else
                new swal("Error", "Internal Server Error", "error");
        }
    });
});

function generateDashboard(data) {
    var self = {};
    var dashboardBlocks = data.blocks;
    var themeName = data.theme_name;
    amChartsTheme.applyTheme(themeName);
    // console.log('Load Dashboard', dashboardBlocks);
    self.dashboardBlocks = dashboardBlocks;
    self.$blocks = [];
    // Init Grid
    if (!self.$grid) {
        self.$grid = GridStack.init();
        self.$grid.margin(7);
        self.$grid.float('true');
        self.$grid.cellHeight(125);
    }
    self.$grid.enableMove(false);
    self.$grid.enableResize(false);
    self.$grid.removeAll();
    // For Each Dashboard Block
    var nextY = 0;
    var index = 0;
    self.dashboardBlocks.forEach(block => {
        var isScoreCard = false;
        if (block.visual_type_name && block.visual_type_name.toLowerCase().indexOf("scrcard") >= 0)
            isScoreCard = true;
        if (self.mode == 'ai_analysis') {
            if (isScoreCard) {
                block.gs_x = 0;
                block.gs_h = 2;
                block.gs_w = 12;
            } else {
                block.gs_x = 0;
                block.gs_h = 4;
                block.gs_w = 12;
            }
        }
        var widgetValues = {
            'id': block.id,
            'w': block.gs_w,
            'h': block.gs_h,
            'x': block.gs_x,
            'y': block.gs_y,
            'minW': block.min_gs_w,
            'minH': block.min_gs_h,
            // 'autoPosition': 'true',
        }
        if (window.innerWidth <= 792 || self.mode == 'ai_analysis') {
            widgetValues.y = nextY;
            nextY += widgetValues.h;
        }
        self.$grid.addWidget(widgetValues);
        // Init IZIViewDashboardBlock
        if (block.analysis_id) {
            var args = {
                'id': block.id,
                'analysis_id': block.analysis_id[0],
                'analysis_name': block.analysis_id[1],
                'animation': block.animation,
                'filters': self.filters,
                'refresh_interval': block.refresh_interval,
                'index': index,
                'mode': self.mode,
                'visual_type_name': block.visual_type_name,
                'rtl': block.rtl,
            }
            index += 1;
            var $block = $(`
                <div class="izi_dashboard_block_item" data-id="${block.id}">
                    <div class="izi_dashboard_block_header">
                        <div class="izi_block_left izi_dropdown dropdown">
                            <h4 class="izi_dashboard_block_title dropdown-toggle" data-toggle="dropdown">${block.analysis_id[1]}</h4>
                            <div class="dropdown-menu">
                                <a class="dropdown-item izi_action_open_analysis">Open Analysis</a>
                                <a class="dropdown-item izi_action_quick_open_analysis">Quick Open Analysis</a>
                                <a class="dropdown-item izi_action_edit_analysis">Edit Analysis</a>
                                <a class="dropdown-item izi_action_open_list_view">View List</a>
                                <a class="dropdown-item izi_action_export_excel" data-id="${block.id}">Export Excel</a>
                                <a class="dropdown-item izi_action_delete_block" data-id="${block.id}">Remove Analysis</a>
                            </div>
                        </div>
                    </div>
                    <div class="izi_dashboard_block_content">
                        <div class="izi_view_visual h-100"></div>
                    </div>
                </div>
            `);
            $block.appendTo($(`.grid-stack-item[gs-id="${block.id}"] .grid-stack-item-content`));
            generateVisual(block);
            self.$blocks.push($block);
        }
    });
}

function generateVisual(block, args={}) {
    var base_url = window.location.origin;
    var access_token = $('#access_token').val();
    var kwargs_string = $('#kwargs_string').val();
    var str_kwargs = '';
    if (kwargs_string) {
        var kwargs = JSON.parse(kwargs_string);
        if (kwargs) {
            for (let key in kwargs) {
                str_kwargs += `&${key}=${kwargs[key]}`;
            }
        }
    }
    var str_filters = '';
    if (args && args.filters) {
        for (let key in args.filters) {
            str_filters += `&${key}=${args.filters[key]}`;
        }
    }
    $.ajax(`${base_url}/izi/analysis/${block.analysis_id[0]}/data?access_token=${access_token}${str_filters}${str_kwargs}`, {
        headers: {
        },
        type : 'GET',
        success: async function(res, status){
            console.log("Response", res);
            if (res.data && res.code == 200) {
                makeChart(block, res.data);
            } else {
                if (res.data && res.data.error)
                    new swal("Error", `${res.data.error_descrip}`, "error");
                else
                    new swal("Error", "Internal Server Error", "error");
            }
        },
        error: function(xhr, textStatus, errorThrown){
            if (xhr.responseJSON && xhr.responseJSON.data)
                new swal("Error", xhr.responseJSON.data, "error");
            else
                new swal("Error", "Internal Server Error", "error");
        }
    });
}

function makeChart(block, result) {
    var self = {
        $el: $(`.izi_dashboard_block_item[data-id="${block.id}"] .izi_view_visual`),
        analysis_id: block.analysis_id[0],
        block_id: block.id,
        animation: block.animation,
        filters: block.filters,
        refresh_interval: block.refresh_interval,
        index: block.index,
        mode: block.mode,
        visual_type_name: block.visual_type_name,
        rtl: block.rtl,
    };
    self._renderVisual = function(args) {
        self.$el.empty();
        block.filters = args.filters;
        generateVisual(block, args);
    }

    // TODO: Make it more elegant
    self.$el.parent().removeClass('izi_view_background');
    self.$el.removeClass('izi_view_scrcard_container scorecard scorecard-sm');
    self.$el.parents(".izi_dashboard_block_item").removeClass("izi_dashboard_block_item_v_background");

    var visual_type = result.visual_type;
    var data = result.data;
    var table_data = result.values;
    var columns = result.fields;

    var idElm = `visual_${self.analysis_id}`;
    if (self.block_id) {
        idElm = `block_${self.block_id}_${idElm}`;
    }
    self.$el.attr('id', idElm);
    if ($(`#${idElm}`).length == 0) return false;
    var chart;
    var visual = new amChartsComponent({
        title: result.analysis_name,
        idElm: idElm,
        data: data,
        dimension: result.dimensions[0], // TODO: Only one dimension?
        metric: result.metrics,

        scorecardStyle: result.visual_config_values.scorecardStyle,
        scorecardIcon: result.visual_config_values.scorecardIcon,
        backgroundColor: result.visual_config_values.backgroundColor,
        borderColor: result.visual_config_values.borderColor,
        fontColor: result.visual_config_values.fontColor,
        scorecardIconColor: result.visual_config_values.scorecardIconColor,
        legendPosition: result.visual_config_values.legendPosition,
        legendHeatmap: result.visual_config_values.legendHeatmap,
        area: result.visual_config_values.area,
        stacked: result.visual_config_values.stacked,
        innerRadius: result.visual_config_values.innerRadius,
        circleType: result.visual_config_values.circleType,
        labelSeries: result.visual_config_values.labelSeries,
        rotateLabel: result.visual_config_values.rotateLabel,
        scrollbar: result.visual_config_values.scrollbar,
        currency_code: result.visual_config_values.currency_code,
        particle: result.visual_config_values.particle,
        trends: result.visual_config_values.trends,
        trendLine: result.visual_config_values.trendLine,
        mapView: result.visual_config_values.mapView
    });
    if (visual_type == 'custom') {
        if (result.use_render_visual_script && result.render_visual_script) {
            // console.log('Render Visual Script', result.use_render_visual_script, result.render_visual_script);
            try {
                eval(result.render_visual_script);
            } catch (error) {
                new swal('Render Visual Script: JS Error', error.message, 'error')
            }
        }
    }
    else if (visual_type == 'iframe') {
        if (result.visual_config_values.iframeHTMLTag || result.visual_config_values.iframeURL) {
            console.log('Render Iframe', result.visual_config_values.iframeHTMLTag, result.visual_config_values.iframeURL);
            try {
                if (result.visual_config_values.iframeHTMLTag) {
                    $(`#${idElm}`).append(result.visual_config_values.iframeHTMLTag);
                } else if (result.visual_config_values.iframeURL) {
                    $(`#${idElm}`).append(`<iframe src="${result.visual_config_values.iframeURL}" style="width:100%;height:100%;border:none;"></iframe>`);
                }
            } catch (error) {
                new swal('Render Iframe: JS Error', error.message, 'error')
            }
        }
    }
    else if (visual_type == 'table') {
        if (!self.grid) {
            self.grid = new gridjs.Grid({
                columns: columns,
                data: tableToLocaleString(table_data),
                sort: true,
                pagination: true,
                resizable: true,
                // search: true,
            }).render($(`#${idElm}`).get(0));
        } else {
            self.grid.updateConfig({
                columns: columns,
                data: table_data,
            }).forceRender();
        }
    }
    else if (visual_type == 'pie') {
        chart = visual.makePieChart();
    }
    else if (visual_type == 'radar') {
        chart = visual.makeRadarChart();
    }
    else if (visual_type == 'flower') {
        chart = visual.makeFlowerChart();
    }
    else if (visual_type == 'radialBar') {
        chart = visual.makeRadialBarChart();
    }
    else if (visual_type == 'bar') {
        chart = visual.makeBarChart();
    }
    else if (visual_type == 'row') {
        chart = visual.makeRowChart();
    }
    else if (visual_type == 'bullet_bar') {
        chart = visual.makeBulletBarChart();
    }
    else if (visual_type == 'bullet_row') {
        chart = visual.makeBulletRow();
    }
    else if (visual_type == 'row_line') {
        chart = visual.makeRowLine();
    }
    else if (visual_type == 'bar_line') {
        chart = visual.makeBarLineChart();
    }
    else if (visual_type == 'line') {
        chart = visual.makeLineChart();
    }
    else if (visual_type == 'scatter') {
        chart = visual.makeScatterChart();
    }
    else if (visual_type == 'heatmap_geo') {
        chart = visual.makeHeatmapGeo();
    }
    else if (visual_type == 'scrcard_basic') {

        if ((self.$el.attr('id')).indexOf('block') === -1) { // layout ketika di preview chart
            self.$el.parents(".izi_dashboard_block_item").addClass("izi_dashboard_block_item_v_background");
            self.$el.parent().addClass('izi_view_background');
            self.$el.addClass('izi_view_scrcard_container');
        }else{ // layout ketika di block Dashboard 
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_title").text("");
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_header").addClass("izi_dashboard_block_btn_config");                    
        }
        visual.makeScorecardBasic();
    }
    else if (visual_type == 'scrcard_trend') {

        if ((self.$el.attr('id')).indexOf('block') === -1) { // layout ketika di preview chart
            self.$el.parents(".izi_dashboard_block_item").addClass("izi_dashboard_block_item_v_background");
            self.$el.parent().addClass('izi_view_background');
            self.$el.addClass('izi_view_scrcard_container');
        }else{ // layout ketika di block Dashboard 
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_title").text("");
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_header").addClass("izi_dashboard_block_btn_config");                    
        }
        visual.makeScorecardTrend();
    }
    else if (visual_type == 'scrcard_progress') {

        if ((self.$el.attr('id')).indexOf('block') === -1) { // layout ketika di preview chart
            self.$el.parents(".izi_dashboard_block_item").addClass("izi_dashboard_block_item_v_background");
            self.$el.parent().addClass('izi_view_background');
            self.$el.addClass('izi_view_scrcard_container');
        }else{ // layout ketika di block Dashboard 
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_title").text("");
            self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_header").addClass("izi_dashboard_block_btn_config");                    
        }
        visual.makeScorecardProgress();
    }
    
    // RTL
    if (chart && self.rtl) {
        chart.rtl = true;
    }
}

function tableToLocaleString(table_data) {
    var new_table_data = []
    table_data.forEach(t_data => {
        var new_t_data = []
        t_data.forEach(dt => {
            if (typeof dt == 'number')
                dt = dt.toLocaleString()
            new_t_data.push(dt);
        });
        new_table_data.push(new_t_data);
    });
    return new_table_data;
}