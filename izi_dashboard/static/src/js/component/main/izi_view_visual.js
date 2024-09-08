odoo.define('izi_dashboard.IZIViewVisual', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var _t = core._t;

    function isQuarter(value) {
        const quarterPattern = /^Q[1-4] \d{4}$/;
        return quarterPattern.test(value);
    };
    function isWeek(value) {
        const weekPattern = /^W[0-9]{1,2} \d{4}$/;
        return weekPattern.test(value);
    };

    var IZIViewVisual = Widget.extend({
        template: 'IZIViewVisual',
        events: {
            'click .izi_reset_drilldown': '_onClickResetDrilldown',
        },

        /**
         * @override
         */
        init: function (parent, args) {
            this._super.apply(this, arguments);
            this.interval;
            this.parent = parent;
            this.grid;
            this.index = 0;
            this.mode;
            this.visual_type_name;
            this.rtl;
            this.dimension_alias;
            this.drilldown_level = 0;
            this.drilldown_title = '';
            this.max_drilldown_level;
            this.action_id;
            this.action_external_id;
            this.analysis_name;
            this.field_by_alias = {};
            this.model_field_names = [];
            this.analysis_data;
            if (args) {
                this.block_id = args.block_id;
                this.analysis_id = args.analysis_id;
                this.filters = args.filters;
                this.refresh_interval = args.refresh_interval;
                this.index = args.index;
                this.mode = args.mode;
                this.visual_type_name = args.visual_type_name;
                this.rtl = args.rtl;
                this.analysis_data = args.analysis_data;
            }
            am4core.options.autoDispose = false;
        },

        willStart: function () {
            var self = this;

            return this._super.apply(this, arguments).then(function () {
                return self.load();
            });
        },

        load: function () {
            var self = this;
        },

        start: function () {
            var self = this;
            this._super.apply(this, arguments);
            var args = {}
            if (self.filters) {
                args.filters = self.filters;
                args.mode = self.mode;
            }
            self._renderVisual(args);
            if (self.refresh_interval && self.refresh_interval >= 10) {
                var readyInterval = true;
                self.interval = setInterval(function () {
                    if (readyInterval) {
                        readyInterval = false;
                        self._renderVisual(args, function() {
                            readyInterval = true;
                        });
                    }
                }, self.refresh_interval * 1000);
            }
        },

        /**
         * Called By Others
         */
        _setAnalysisId: function (analysis_id) {
            var self = this;
            self.analysis_id = analysis_id;
        },

        _renderVisual: function (args, callback) {
            var self = this;
            self._deleteVisual();
            am4core.options.autoDispose = false;
            if (self.analysis_id) {
                self._getDataAnalysis(args, function (result) {
                    setTimeout(function() {
                        if (self.parent && self.parent.$title)
                            self.parent.$title.html(self.analysis_name);
                        self._makeChart(result);
                        if (callback) {
                            callback();
                        }
                    }, Math.floor(self.index/6)*1500);
                })
            } else if (self.analysis_data) {
                self._makeChart(self.analysis_data);
                if (callback) {
                    callback();
                }
            }
        },

        tableToLocaleString: function(table_data) {
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
        },

        _getViewVisualByAnalysisId: function(analysis_id) {
            var self = this;
            if (self.parent)
                return self.parent._getViewVisualByAnalysisId(analysis_id);
            return false;
        },

        _onClickResetDrilldown: function (ev) {
            var self = this;
            self.drilldown_level = 0;
            self.drilldown_title = '';
            if (self.filters)
                self.filters.action = [];
            self._renderVisual();
            self.$el.find('.izi_reset_drilldown').hide();
        },

        _onHitChart: function (ev, visual, val) {
            var analysis_id = false;
            var self = false;
            if (ev.target && ev.target.htmlContainer) {
                analysis_id = parseInt($(ev.target.htmlContainer).closest('.izi_view_visual').data('analysis_id'));
                if (analysis_id && visual) {
                    // Visual From On Hit Listener Is Wrong
                    // So We Get The Right One By Searching With Analysis Id
                    visual = visual._getViewVisualByAnalysisId(analysis_id);
                    self = visual;
                    console.log('Hit Chart!', self.analysis_id, self.dimension_alias, val);
                    if (self && self.dimension_alias && val) {
                        // Open Action
                        if (self.action_model && self.drilldown_level >= self.max_drilldown_level) {
                            var action_domain = [];
                            if (self.filters && self.filters.action) {
                                self.filters.action.forEach(action => {
                                    if (action.dimension_alias in self.field_by_alias) {
                                        var field_name = self.field_by_alias[action.dimension_alias];
                                        var operator = action.operator || '=';
                                        if (self.model_field_names.includes(field_name)) {
                                            var formatted_domains = self._formatDomains(field_name, operator, action.value);
                                            formatted_domains.forEach(formatted_domain => {
                                                action_domain.push(formatted_domain);
                                            });
                                        }
                                    } else if (action.field_name) {
                                        var field_name = action.field_name;
                                        var operator = action.operator || '=';
                                        if (self.model_field_names.includes(field_name)) {
                                            var formatted_domains = self._formatDomains(field_name, operator, action.value);
                                            formatted_domains.forEach(formatted_domain => {
                                                action_domain.push(formatted_domain);
                                            });
                                        }
                                    }
                                });
                            }
                            if (self.dimension_alias in self.field_by_alias) {
                                var field_name = self.field_by_alias[self.dimension_alias];
                                if (self.model_field_names.includes(field_name))
                                    var formatted_domains = self._formatDomains(field_name, '=', val[self.dimension_alias]);
                                    formatted_domains.forEach(formatted_domain => {
                                        action_domain.push(formatted_domain);
                                    });
                            }
                            self._convertDomainToUTC(action_domain, function (new_action_domain) {
                                self.do_action({
                                    type: 'ir.actions.act_window',
                                    // xml_id: self.action_external_id, // TODO: Not Working. Why?
                                    name: self.analysis_name,
                                    res_model: self.action_model,
                                    views: [[false, "list"], [false, "form"]],
                                    view_type: 'list',
                                    view_mode: 'list',
                                    target: 'current',
                                    context: {},
                                    domain: new_action_domain,
                                })
                            });
                        }
                        // Drill Down
                        else if (self.drilldown_level < self.max_drilldown_level) {
                            self.drilldown_level += 1;
                            // Arguments
                            if (self.dimension_alias in val) {
                                if (!self.filters)
                                    self.filters = {};
                                if (!self.filters.action) {
                                    self.filters.action = [];
                                }
                                if (self.dimension_alias in self.field_by_alias) {
                                    var field_name = self.field_by_alias[self.dimension_alias];
                                    var additional_action_filters = self._formatDomains(field_name, '=', val[self.dimension_alias]);
                                    additional_action_filters.forEach(additional_action_filter => {
                                        self.filters.action.push({
                                            'field_name': additional_action_filter[0],
                                            'operator': additional_action_filter[1],
                                            'value': additional_action_filter[2],
                                        });
                                    });
                                }
                                var args = {
                                    'mode': self.mode,
                                    'filters': self.filters || {},
                                    'drilldown_level': self.drilldown_level,
                                };
                                self.drilldown_title += ' / ' + val[self.dimension_alias];
                                // Make Chart
                                self._getDataAnalysis(args, function (result) {
                                    if (self.parent && self.parent.$title)
                                        self.parent.$title.html(self.analysis_name + self.drilldown_title);
                                    self._makeChart(result);
                                    self.$el.find('.izi_reset_drilldown').show();
                                });
                            }
                        }
                    }
                }
            }
            
        },

        _convertDomainToUTC(domain, callback) {
            var self = this;
            if (self.analysis_id) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'convert_domain_to_utc',
                    args: [self.analysis_id, domain],
                }).then(function (result) {
                    console.log('Domain', result);
                    if (callback) {
                        callback(result);
                    }
                })
            }
        },

        _formatDomains: function(field_name, operator, value) {
            var self = this;
            // Check Date
            if (moment(value, 'DD MMM YYYY', true).isValid()) {
                var start_date = moment(value, 'DD MMM YYYY', true).format('YYYY-MM-DD');
                var end_date = moment(value, 'DD MMM YYYY', true).add(1, 'd').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if  (moment(value, 'DD MMMM YYYY', true).isValid()) {
                var start_date = moment(value, 'DD MMMM YYYY', true).format('YYYY-MM-DD');
                var end_date = moment(value, 'DD MMMM YYYY', true).add(1, 'M').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if  (moment(value, 'MMM YYYY', true).isValid()) {
                var start_date = moment(value, 'MMM YYYY', true).format('YYYY-MM-DD');
                var end_date = moment(value, 'MMM YYYY', true).add(1, 'M').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if  (moment(value, 'MMMM YYYY', true).isValid()) {
                var start_date = moment(value, 'MMMM YYYY', true).format('YYYY-MM-DD');
                var end_date = moment(value, 'MMMM YYYY', true).add(1, 'M').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if (moment(value, 'YYYY', true).isValid()) {
                var start_date = moment(value, 'YYYY', true).format('YYYY-MM-DD');
                var end_date = moment(value, 'YYYY', true).add(1, 'Y').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if (isQuarter(value)) {
                // In Case Of Quarter Format: Q1 2023
                var values = value.split(' ');
                var quarter = values[0].split('Q')[1];
                var year = values[1];
                var start_date = moment().quarter(quarter).year(year).startOf('quarter').format('YYYY-MM-DD');
                var end_date = moment().quarter(quarter).year(year).endOf('quarter').add(1, 'd').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            } else if (isWeek(value)) {
                // In Case Of Week Format: W21 2023
                var values = value.split(' ');
                var week = values[0].split('W')[1];
                var year = values[1];
                // Moment Starts Week From Sunday
                var start_date = moment().week(week).year(year).startOf('week').add(1, 'd').format('YYYY-MM-DD');
                var end_date = moment().week(week).year(year).endOf('week').add(2, 'd').format('YYYY-MM-DD');
                return [[field_name, '>=', start_date], [field_name, '<', end_date]];
            }
            return [[field_name, operator || '=', value]];
        },

        _makeChart: function (result) {
            var self = this;
            var chart;
            var visual;

            // Not Elegant
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
            self.$el.attr('data-analysis_id', self.analysis_id);
            if ($(`#${idElm}`).length == 0) return false;
            // If Error
            if (result.is_error) {
                visual = new amChartsComponent({
                    title: self.analysis_name,
                    idElm: idElm,
                });
                chart = visual.showError(idElm, result.error || 'Unknown error, check the log');
                return chart;
            }

            // If Not Error
            self.dimension_alias = result.dimensions[0];
            visual = new amChartsComponent({
                title: self.analysis_name,
                idElm: idElm,
                data: data,
                dimension: result.dimensions[0],
                metric: result.metrics,
                visual: self,
                callback: self._onHitChart,
                
                prefix_by_field: result.prefix_by_field,
                suffix_by_field: result.suffix_by_field,
                decimal_places_by_field: result.decimal_places_by_field,
                is_metric_by_field: result.is_metric_by_field,
                locale_code_by_field: result.locale_code_by_field,

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
                scrollBar: result.visual_config_values.scrollBar,
                currency_code: result.visual_config_values.currency_code,
                particle: result.visual_config_values.particle,
                trends: result.visual_config_values.trends,
                trendLine: result.visual_config_values.trendLine,
                mapView: result.visual_config_values.mapView,
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
                columns = self.formatTableColumns(result);
                if (!self.grid) {
                    self.grid = new gridjs.Grid({
                        columns: columns,
                        data: table_data,
                        sort: true,
                        pagination: true,
                        resizable: true,
                        // search: true,
                        className: {
                            table: `gridjs-table-${idElm}`,
                        }
                    }).render($(`#${idElm}`).get(0));
                    self.renderSumTableRow(result, table_data, `gridjs-table-${idElm}`);
                } else {
                    self.grid.updateConfig({
                        columns: columns,
                        data: table_data,
                    }).forceRender();
                    self.renderSumTableRow(result, table_data, `gridjs-table-${idElm}`);
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

                if ((self.el.id).indexOf('block') === -1) { // layout ketika di preview chart
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

                if ((self.el.id).indexOf('block') === -1) { // layout ketika di preview chart
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

                if ((self.el.id).indexOf('block') === -1) { // layout ketika di preview chart
                    self.$el.parents(".izi_dashboard_block_item").addClass("izi_dashboard_block_item_v_background");
                    self.$el.parent().addClass('izi_view_background');
                    self.$el.addClass('izi_view_scrcard_container');
                }else{ // layout ketika di block Dashboard 
                    self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_title").text("");
                    self.$el.parents(".izi_dashboard_block_item").find(".izi_dashboard_block_header").addClass("izi_dashboard_block_btn_config");                    
                }
                visual.makeScorecardProgress();
            }
            // Get AI Analysis
            if (self.mode == 'ai_analysis')
                self._getLabAnalysisText(visual.data)
            // RTL
            if (chart && typeof chart === 'object' && self.rtl) {
                chart.rtl = true;
            }
            // Drill Up
            self.$el.find('.izi_reset_drilldown').remove();
            self.$el.append(`
                <button class="btn btn-sm btn-primary izi_reset_drilldown">
                    <i class="fa fa-chevron-up"></i>
                </button>
            `)
        },
        _getLabAnalysisText: function (ai_analysis_data) {
            var self = this;
            if (self.analysis_id) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'action_get_lab_analysis_text',
                    args: [self.analysis_id, ai_analysis_data],
                }).then(function (result) {
                    if (result.status == 200) {
                        if (self.parent.$description) {
                            self.parent.$description.html(result.ai_analysis_text);
                        }
                    } else if (self.index == 0) {
                        if (result.status == 401) {
                            new swal('Need Access', result.message, 'warning');
                            self.do_action({
                                type: 'ir.actions.act_window',
                                name: _t('Need API Access'),
                                target: 'new',
                                res_model: 'izi.lab.api.key.wizard',
                                views: [[false, 'form']],
                                context: {},
                            },{
                                on_close: function(){
                                }
                            });
                        } else
                            new swal('Error', result.message, 'error');
                    }
                    self.mode = false;
                    self.parent.mode = false;
                })
            }
        },
        _deleteVisual: function () {
            var self = this;
            self.$el.empty();
        },

        _setAnalysisVariables: function (result) {
            var self = this;
            // Set Variables
            self.max_drilldown_level = result.max_drilldown_level;
            self.action_id = result.action_id;
            self.action_external_id = result.action_external_id;
            self.action_model = result.action_model;
            self.analysis_name = result.analysis_name;
            self.field_by_alias = result.field_by_alias;
            self.model_field_names = result.model_field_names;
        },

        _getFilters: function () {
            var self = this;
            return self.filters;
        },

        _getDataAnalysis: function (args, callback) {
            var self = this;
            if (self.analysis_id) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'try_get_analysis_data_dashboard',
                    args: [self.analysis_id],
                    kwargs: args,
                }).then(function (result) {
                    // console.log('Success Get Data Analysis', result);
                    self._setAnalysisVariables(result);
                    callback(result);
                })
            }
        },

        renderSumTableRow: function (result, table_data, tableIdElm) {
            var self = this;
            var prefix_by_field = result.prefix_by_field;
            var suffix_by_field = result.suffix_by_field;
            var decimal_places_by_field = result.decimal_places_by_field;
            var is_metric_by_field = result.is_metric_by_field;
            var locale_code_by_field = result.locale_code_by_field;
            var total_data = [];
            var total_tr_elm = ``;
            if (result && result.fields) {
                result.fields.forEach(function (field) {
                    var index_field = result.fields.indexOf(field);
                    if (field in is_metric_by_field) {
                        total_data[index_field] = 0
                        table_data.forEach(function (t_data) {
                            total_data[index_field] += parseFloat(t_data[index_field] || 0);
                        });
                        var prefix = '';
                        var suffix = '';
                        var decimal_places = 0;
                        var locale_code = 'en-US';
                        if (field in prefix_by_field) {
                            prefix = prefix_by_field[field] + ' ';
                        }
                        if (field in suffix_by_field) {
                            suffix = ' ' + suffix_by_field[field];
                        }
                        if (field in decimal_places_by_field) {
                            decimal_places = decimal_places_by_field[field];
                        }
                        if (field in locale_code_by_field) {
                            locale_code = locale_code_by_field[field];
                        }
                        total_data[index_field] = `${prefix}${parseFloat(total_data[index_field]||0).toLocaleString(locale_code, {minimumFractionDigits: decimal_places, maximumFractionDigits: decimal_places})}${suffix}`;
                        total_tr_elm += `<th class="gridjs-th"><span style="float:right;">${total_data[index_field]}</span></th>`;
                    } else {
                        total_data[index_field] = '';
                        total_tr_elm += `<th class="gridjs-th"></th>`;
                    }
                })
            }
            // Render
            if ($(`.${tableIdElm}`).length > 0 && total_data.length > 0 && total_tr_elm) {
                $(`.${tableIdElm} tfoot`).remove();
                $(`.${tableIdElm}`).append(`
                    <tfoot>
                        ${total_tr_elm}
                    </tfoot>
                `);
            }
        },

        formatTableColumns: function (result) {
            var self = this;
            var columns = [];
            var prefix_by_field = result.prefix_by_field;
            var suffix_by_field = result.suffix_by_field;
            var decimal_places_by_field = result.decimal_places_by_field;
            var is_metric_by_field = result.is_metric_by_field;
            var locale_code_by_field = result.locale_code_by_field;
            if (result && result.fields) {
                result.fields.forEach(function (field) {
                    if (field in is_metric_by_field) {
                        var prefix = '';
                        var suffix = '';
                        var decimal_places = 0;
                        var locale_code = 'en-US';
                        if (field in prefix_by_field) {
                            prefix = prefix_by_field[field] + ' ';
                        }
                        if (field in suffix_by_field) {
                            suffix = ' ' + suffix_by_field[field];
                        }
                        if (field in decimal_places_by_field) {
                            decimal_places = decimal_places_by_field[field];
                        }
                        if (field in locale_code_by_field) {
                            locale_code = locale_code_by_field[field];
                        }
                        columns.push({
                            name: field,
                            formatter: (cell) => gridjs.html(`<span style="float:right;">${prefix}${parseFloat(cell||0).toLocaleString(locale_code, {minimumFractionDigits: decimal_places, maximumFractionDigits: decimal_places})}${suffix}</span>`)
                        });
                    } else {
                        columns.push(field);
                    }
                })
            }
            return columns;
        },

        _onClickInput: function (ev) {
            var self = this;
        },

        _onClickButton: function (ev) {
            var self = this;
        }
    });

    return IZIViewVisual;
});