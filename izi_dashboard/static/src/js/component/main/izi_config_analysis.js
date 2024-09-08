odoo.define('izi_dashboard.IZIConfigAnalysis', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var view_dialogs = require('web.view_dialogs');
    var _t = core._t;
    var QWeb = core.qweb;

    var IZIAutocomplete = require('izi_dashboard.IZIAutocomplete');
    var IZISelectAnalysis = require('izi_dashboard.IZISelectAnalysis');
    var IZISelectDimension = require('izi_dashboard.IZISelectDimension');
    var IZISelectSort = require('izi_dashboard.IZISelectSort');
    var IZISelectFilter = require('izi_dashboard.IZISelectFilter');
    var IZISelectMetric = require('izi_dashboard.IZISelectMetric');
    var IZIViewVisual = require('izi_dashboard.IZIViewVisual');
    var IZIConfigAnalysis = Widget.extend({
        template: 'IZIConfigAnalysis',
        events: {
            'click input': '_onClickInput',
            'click button': '_onClickButton',
            'click .izi_select_analysis': '_onClickSelectAnalysis',
            'click .izi_select_visual': '_onChangeVisualType',

            'click .izi_add_metric': '_onClickAddMetric',
            'click .izi_add_dimension': '_onClickAddDimension',
            'click .izi_add_sort': '_onClickAddSort',
            'click .izi_add_filter': '_onClickAddFilter',
            'click .izi_remove_metric_item': '_onClickRemoveMetric',
            'click .izi_remove_dimension_item': '_onClickRemoveDimension',
            'click .izi_remove_sort_item': '_onClickRemoveSort',
            'click .izi_remove_filter_item': '_onClickRemoveFilter',
            'click .izi_select_calculation': '_onClickSelectCalculation',
            'click .izi_select_format': '_onClickSelectFormat',
            'click .izi_select_sort_direction': '_onClickSelectSortDirection',

            'click .izi_add_dashboard_block': '_onClickAddDashboardBlock',

            'click .izi_tab_data': '_onClickTabData',
            'click .izi_tab_visual': '_onClickTabVisual',

            'change .izi_visual_config': '_onChangeVisualConfig',
            'change .izi_change_limit': '_onChangeLimit',

            'click .izi_update_current_filter_item': '_onUpdateCurrentFilter',
            'click .izi_select_analysis_explore': '_onClickSelectAnalysisExplore',
            'click .izi_select_analysis_edit': '_onClickSelectAnalysisEdit',

            'click .izi_action_open_visual_script_editor': '_onClickVisualScriptEditor',
            'click .izi_action_open_data_script_editor': '_onClickDataScriptEditor',
        },

        /**
         * @override
         */
        init: function (parent, $viewAnalysis) {
            var self = this;
            self._super.apply(self, arguments);
            self.parent = parent;
            if (parent.actions) self.actions = parent.actions;
            self.$viewAnalysis = $viewAnalysis;

            // Element
            self.$selectTable;
            self.$selectAnalysis;
            self.$selectMetric;
            self.$selectDimension;
            self.$selectSort;
            self.$selectFilter;
            self.$selectUser;
            self.$tabData;
            self.$tabVisual;
            self.$tabContentData;
            self.$tabContentVisual;
            self.$selectDashboard;
            self.$exploreVisuals = [];

            // Values
            self.selectedTableFields = [];
            self.selectedTable;
            self.selectedAnalysis;
            self.selectedAnalysisName;
            self.selectedVisualType;
            self.selectedAnalysisData = false;
            self.selectedDashboard;
            self.selectedDashboardName;
            self.changeLimit;
            self.mode;
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

            // Element
            self.$selectTable = self.$('.izi_select_table');
            self.$selectAnalysis = self.$('.izi_select_analysis');
            self.$changeLimit = self.$('.izi_change_limit');

            // Current
            self.$currentMetric = self.$('.izi_current_metric');
            self.$currentDimension = self.$('.izi_current_dimension');
            self.$currentSort = self.$('.izi_current_sort');
            self.$currentFilter = self.$('.izi_current_filter');

            // Tab
            self.$tabData = self.$('.izi_tab_data');
            self.$tabVisual = self.$('.izi_tab_visual');
            self.$tabContentData = self.$('.izi_tab_content_data');
            self.$tabContentVisual = self.$('.izi_tab_content_visual');

            self.$selectVisualContainer = self.$('.izi_select_visual_container');
            self.$changeLimitContainer = self.$('.izi_change_limit_container');
            self._renderVisualTypes();

            self.$selectVisualConfigContainer = self.$('.izi_select_visual_config_container');
            self.$addDasboardContainer = self.$('.izi_add_dashboard_container');
            self.$buttonAddDashboardBlock = self.$('.izi_add_dashboard_block');

            // Dashboard
            self._loadDashboards();

            // Check Context From Actions
            self._checkActionContext();

            // Hide Icon Picker
            self._initHideIconPicker();
        },

        /**
         * Load Method
         */


        /**
         * Handler Method
         */
        _onClickInput: function (ev) {
            var self = this;
        },

        _onClickButton: function (ev) {
            var self = this;
        },

        _onClickSelectAnalysis: function (ev) {
            var self = this;
            // Add Dialog
            var $select = new IZISelectAnalysis(self)
            $select.appendTo($('body'));
        },

        _selectAnalysis: function (id, name, table, visual_type) {
            var self = this;
            self.selectedAnalysis = id;
            self.selectedAnalysisName = name;
            self.selectedVisualType = visual_type;
            self.$viewAnalysis._setAnalysisId(id);
            self.$viewAnalysis._closeScript();
            self.$selectAnalysis.find('.izi_title').text(name);
            self.$selectAnalysis.find('.izi_subtitle').text(table);
            self._loadAnalysisInfo();
            self._renderVisual();
            self._renderVisualConfigs();
            self.$buttonAddDashboardBlock.show();
            self.$addDasboardContainer.show();
            self.$changeLimitContainer.show();

            self._onClickAddMetric();
            self._onClickAddDimension();
            self._onClickAddFilter();
            self._onClickAddSort();
        },

        _loadAnalysisInfo: function () {
            var self = this;
            if (self.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_get_analysis_info',
                    args: [self.selectedAnalysis],
                }).then(function (result) {
                    // console.log('Get Analysis Info', result)
                    self._setActiveClass(result.visual_type);
                    // if dashbord has been selected then hide select2 dropdown dashboard
                    if (self.selectedDashboard) {
                        
                        self.$('#s2id_izi_select2_dashboard').hide()
                    }
                    // Metric
                    self.metrics = result.metrics;
                    self.$currentMetric.empty();
                    self.metrics.forEach(metric => {
                        var $content = $(QWeb.render('IZICurrentMetricItem', {
                            name: metric.name,
                            id: metric.id,
                            field_type: metric.field_type,
                            calculation: metric.calculation,
                            metric_id: metric.metric_id,
                            sort: metric.sort,
                        }));
                        self.$currentMetric.append($content)
                    });
                    // Dimensions
                    self.dimensions = result.dimensions;
                    self.$currentDimension.empty();
                    self.dimensions.forEach(dimension => {
                        var $content = $(QWeb.render('IZICurrentDimensionItem', {
                            name: dimension.name,
                            id: dimension.id,
                            field_type: dimension.field_type,
                            dimension_id: dimension.dimension_id,
                            field_icon: IZIFieldIcon.getIcon(dimension.field_type),
                            field_format: dimension.field_format || 'FORMAT',
                            sort: dimension.sort,
                        }));
                        self.$currentDimension.append($content)
                    });
                    // Sorts
                    self.sorts = result.sorts;
                    self.$currentSort.empty();
                    self.sorts.forEach(sort => {
                        var $content = $(QWeb.render('IZICurrentSortItem', {
                            name: sort.name,
                            id: sort.id,
                            field_type: sort.field_type,
                            sort_id: sort.sort_id,
                            field_icon: IZIFieldIcon.getIcon(sort.field_type),
                            field_format: sort.field_format || 'FORMAT',
                            field_calculation: sort.field_calculation,
                            sort: sort.sort,
                        }));
                        self.$currentSort.append($content)
                    });
                    // Filters
                    self.filters = result.filters;
                    self.$currentFilter.empty();
                    self.filters.forEach(filter => {
                        var $content = $(QWeb.render('IZICurrentFilterItem', {
                            name: filter.name,
                            id: filter.id,
                            field_type: filter.field_type,
                            filter_id: filter.filter_id,
                            field_icon: IZIFieldIcon.getIcon(filter.field_type),
                            filter_operators: result.filter_operators,
                            current_operator_id: filter.operator_id,
                            condition: filter.condition,
                            value: filter.value,
                        }));
                        self.$currentFilter.append($content)
                    });
                    // Limit
                    self.$changeLimit.val(result.limit);
                })
            }
        },

        _renderVisualTypes: function () {
            var self = this;
            self._rpc({
                model: 'izi.visual.type',
                method: 'search_read',
                args: [[], ['id', 'name', 'icon', 'title']],
            }).then(function (results) {
                // console.log('Get Visual Types', results)
                self.$selectVisualContainer.empty();
                results.forEach(vt => {
                    self.$selectVisualContainer.append(
                        `<div class="izi_btn izi_select_visual flex-column" data-visual-type="${vt.name}" data-visual-type-id="${vt.id}">
                            <span class="material-icons">${vt.icon}</span> ${vt.title}
                        </div>`
                    )
                });
            })
        },

        _renderVisualConfigs: function () {
            var self = this;
            self._rpc({
                model: 'izi.visual.type',
                method: 'get_visual_config',
                args: [[], self.selectedVisualType, self.selectedAnalysis],
            }).then(function (results) {
                // console.log('Get Visual Config', results)
                self.$selectVisualConfigContainer.empty();
                results.forEach(vc => {
                    if (vc.config_type == 'input_string' || vc.config_type == 'input_number') {
                        let input_type = 'text';
                        if (vc.config_type == 'input_number') {
                            input_type = 'number';
                        }
                        self.$selectVisualConfigContainer.append(`
                            <div class="flex-body mb-3">
                                <label for="${vc.name}${vc.id}" class="flex-1 col-form-label izi_subtitle">${vc.title}</label>
                                <div class="input-group flex-1">
                                    <input type="${input_type}" class="form-control izi_visual_config" id="${vc.name}${vc.id}" placeholder="" data-visual-config="${vc.name}" data-visual-config-id="${vc.id}" data-visual-config-type="${vc.config_type}" data-analysis-visual-config-id="${vc.analysis_visual_config_id}"></input>
                                </div>
                            </div>
                        `);
                        let input_value = vc.config_value != null ? vc.config_value : vc.default_config_value;
                        $(`#${vc.name}${vc.id}`).val(input_value);

                    } else if (vc.config_type == 'toggle') {
                        self.$selectVisualConfigContainer.append(`
                        <div class="flex-body mb-3">
                            <label for="" class="flex-1 col-form-label izi_subtitle">${vc.title}</label>
                            <div class="flex-1">
                                <label class="toggle-switchy" for="${vc.name}${vc.id}" data-size="xs" data-style="rounded" data-text="false">
                                    <input checked="" class="izi_visual_config" type="checkbox" id="${vc.name}${vc.id}" data-visual-config="${vc.name}" data-visual-config-id="${vc.id}" data-visual-config-type="${vc.config_type}" data-analysis-visual-config-id="${vc.analysis_visual_config_id}"></input>
                                    <span class="toggle">
                                        <span class="switch"></span>
                                    </span>
                                </label>
                            </div>
                        </div>
                        `);
                        let toggle_value = vc.config_value != null ? vc.config_value : vc.default_config_value;
                        $(`#${vc.name}${vc.id}`).prop("checked", toggle_value);

                    } else if (vc.config_type == 'selection_string' || vc.config_type == 'selection_number') {
                        self.$selectVisualConfigContainer.append(`
                        <div class="flex-body mb-3">
                            <label for="${vc.name}${vc.id}" class="flex-1 col-form-label izi_subtitle">${vc.title}</label>
                            <div class="input-group flex-1">
                                <select id="${vc.name}${vc.id}" class="form-control izi_visual_config" data-visual-config="${vc.name}" data-visual-config-id="${vc.id}" data-visual-config-type="${vc.config_type}" data-analysis-visual-config-id="${vc.analysis_visual_config_id}">
                                </select>
                            </div>
                        </div>
                        `);
                        (vc.visual_config_values).forEach(vcv => {
                            $(`#${vc.name}${vc.id}`).append(`
                                <option class="izi_visual_config_value" value="${vcv.name}" data-visual-config-value-id="${vcv.id}">${vcv.title}</option>
                            `);
                        });
                        let selection_value = vc.config_value != null ? vc.config_value : vc.default_config_value;

                        if (vc.name === "mapView") {
                            var countriesId = Object.keys(am4geodata_data_countries2);
                            selection_value = selection_value.toUpperCase();
                            countriesId.forEach((values, i) => {
                                if (am4geodata_data_countries2[countriesId[i]].maps[0] != undefined) {
                                    $(`#${vc.name}${vc.id}`).append(`
                                        <option class="izi_visual_config_value" value=`+ countriesId[i] +`>` + am4geodata_data_countries2[countriesId[i]].country + `</option>
                                    `);
                                };
                            });
                        };

                        $(`#${vc.name}${vc.id}`).val(selection_value);
                    }
                });
                self._initIconPicker();
            })
        },

        _onClickAddMetric: function (ev) {
            var self = this;

            // Add Metric Component
            if (self.selectedAnalysis) {
                if (self.$selectMetric)
                    self.$selectMetric.destroy();
                self.$selectMetric = new IZISelectMetric(self)
                self.$selectMetric.appendTo(self.$el.find('.izi_select_metric_container'));
            }
        },

        _onClickAddDimension: function (ev) {
            var self = this;

            // Add Dimension Component
            if (self.selectedAnalysis) {
                if (self.$selectDimension)
                    self.$selectDimension.destroy();
                self.$selectDimension = new IZISelectDimension(self)
                self.$selectDimension.appendTo(self.$el.find('.izi_select_dimension_container'));
            }
        },

        _onClickAddSort: function (ev) {
            var self = this;

            // Add Sort Component
            if (self.selectedAnalysis) {
                if (self.$selectSort)
                    self.$selectSort.destroy();
                self.$selectSort = new IZISelectSort(self)
                self.$selectSort.appendTo(self.$el.find('.izi_select_sort_container'));
            }
        },

        _onClickAddFilter: function (ev) {
            var self = this;

            // Add Filter Component
            if (self.selectedAnalysis) {
                if (self.$selectFilter)
                    self.$selectFilter.destroy();
                self.$selectFilter = new IZISelectFilter(self)
                self.$selectFilter.appendTo(self.$el.find('.izi_select_filter_container'));
            }
        },

        _onClickRemoveMetric: function (ev) {
            var self = this;
            var metric_id = $(ev.target).data('metric');
            // console.log('Remove Metric', metric_id);
            if (self.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_remove_metric',
                    args: [self.selectedAnalysis, metric_id],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddMetric();
                    self._renderVisual();
                })
            }
        },

        _onClickRemoveDimension: function (ev) {
            var self = this;
            var dimension_id = $(ev.target).data('dimension');
            // console.log('Remove Dimension', dimension_id);
            if (self.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_remove_dimension',
                    args: [self.selectedAnalysis, dimension_id],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddDimension();
                    self._renderVisual();
                })
            }
        },

        _onClickRemoveSort: function (ev) {
            var self = this;
            var sort_id = $(ev.target).data('sort_id');
            if (self.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_remove_sort',
                    args: [self.selectedAnalysis, sort_id],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddSort();
                    self._renderVisual();
                })
            }
        },

        _onClickRemoveFilter: function (ev) {
            var self = this;
            var filter_id = $(ev.target).data('filter_id');
            if (self.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_remove_filter',
                    args: [self.selectedAnalysis, filter_id],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddFilter();
                    self._renderVisual();
                })
            }
        },

        _onUpdateCurrentFilter: function (ev) {
            var self = this;
            var filter_id = $(ev.currentTarget).data('filter_id');
            var field_id = $(ev.currentTarget).data('id');
            var logical_operator = $('#current_form_filter_' + field_id).find('#current_condition_' + field_id).val();
            var operator_id = $('#current_form_filter_' + field_id).find('#current_operator_' + field_id).val();
            var value = $('#current_form_filter_' + field_id).find('#current_value_' + field_id).val();
            if (self.selectedAnalysis) {
                var data = {
                    'filter_id': filter_id,
                    'field_id': field_id,
                    'operator_id': operator_id,
                    'condition': logical_operator,
                    'value': value,
                }
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_update_filter_by_field',
                    args: [self.selectedAnalysis, data],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddFilter();
                    self._renderVisual();
                })
            }
        },

        _onClickSelectCalculation: function (ev) {
            var self = this;
            var calculation = $(ev.currentTarget).data('calculation');
            var metric_id = $(ev.currentTarget).data('metric');
            if (calculation && metric_id) {
                var data = {
                    'calculation': calculation,
                }
                self._rpc({
                    model: 'izi.analysis.metric',
                    method: 'write',
                    args: [[parseInt(metric_id)], data],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._renderVisual();
                })
            }
        },

        _onClickSelectFormat: function (ev) {
            var self = this;
            var format = $(ev.currentTarget).data('format');
            var dimension_id = $(ev.currentTarget).data('dimension');
            if (format && dimension_id) {
                var data = {
                    'field_format': format,
                }
                self._rpc({
                    model: 'izi.analysis.dimension',
                    method: 'write',
                    args: [[parseInt(dimension_id)], data],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddDimension();
                    self._renderVisual();
                })
            }
        },

        _onClickSelectSortDirection: function (ev) {
            var self = this;
            var sort = $(ev.currentTarget).data('sort');
            var sort_id = $(ev.currentTarget).data('sort_id');
            if (sort && sort_id) {
                var data = {
                    'sort': sort != 'none' ? sort : false,
                }
                self._rpc({
                    model: 'izi.analysis.sort',
                    method: 'write',
                    args: [[parseInt(sort_id)], data],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._onClickAddDimension();
                    self._renderVisual();
                });
            }
        },

        _setActiveClass: function (visual_type) {
            $('.izi_select_visual').removeClass('active');
            if (visual_type) {
                $(`.izi_select_visual[data-visual-type="${visual_type}"]`).addClass('active');
            }
        },

        _renderVisual: function (args) {
            var self = this;
            if (self.$viewAnalysis.$visual && self.selectedAnalysis) {
                self.$viewAnalysis.$visual._setAnalysisId(self.selectedAnalysis);
                self.$viewAnalysis.$visual._renderVisual(args);

                
                if (self.selectedVisualType == 'heatmap_geo') {
                    Swal.fire({
                        title: 'Map Viz',
                        icon: 'info',
                        html:
                        '<div style=`text-align : left`>Needs to have 2 Dimensions :'+
                        '<br></br>'+
                        '<li>First dimension as the Country code.</li>' +
                        '<li>Second dimension as the State code.</li>'+
                        '<small>e.g. " ID-RI " for Riau province of Indonesia </small><br></br>' +
                        '<small>Reference by <a href="https://www.iso.org/obp/ui/#search/code/">ISO 3166-2 code</a> </small></div>',
                      });
                }else if (self.selectedVisualType == 'scatter') {
                    Swal.fire({
                        title: 'Scatter Plot',
                        icon: 'info',
                        html:
                        'Needs to have 2 Metrics :'+
                        '<br></br>'+
                        '<li>1st Metric as the X axis</li>' +
                        '<li>2nd Metric as the Y axis</li>'+
                        '<li>3rd Metric as the value(optional)</li>',
                   });
                };
            }
        },

        _onChangeVisualType: function (ev) {
            var self = this;
            if (self.selectedAnalysis) {
                self.selectedVisualType = $(ev.currentTarget).data('visual-type');
                self._rpc({
                    model: 'izi.analysis',
                    method: 'save_analysis_visual_type',
                    args: [[self.selectedAnalysis], self.selectedVisualType],
                }).then(function (result) {
                    self._setActiveClass(self.selectedVisualType);
                    self._renderVisual();
                    self._renderVisualConfigs();
                });
            }
        },

        _onClickSaveAnalysisVisual: function () {
            var self = this;
            if (self.selectedAnalysis) {
                let config_values = []
                $('.izi_select_visual_config_container .izi_visual_config').each(function () {
                    let config_type = $(this).attr('data-visual-config-type');
                    let config_value = null;
                    let visual_config_value_id = null;
                    let analysis_visual_config_id = $(this).attr('data-analysis-visual-config-id');
                    if (config_type == "input_string" || config_type == "input_number") {
                        config_value = $(this).val();
                    } else if (config_type == "toggle") {
                        config_value = $(this).is(":checked");
                    } else if (config_type == "selection_string" || config_type == "selection_number") {
                        config_value = $(this).val();
                        visual_config_value_id = $(`#${$(this).attr("id")} option:selected`).attr('data-visual-config-value-id');
                    }
                    config_values.push({
                        'id': analysis_visual_config_id != 'null' ? parseInt(analysis_visual_config_id) : null,
                        'analysis_id': self.selectedAnalysis,
                        'visual_config_id': parseInt($(this).attr('data-visual-config-id')),
                        'visual_config_value_id': visual_config_value_id != null ? parseInt(visual_config_value_id) : null,
                        'string_value': String(config_value),
                    })
                })

                self._rpc({
                    model: 'izi.analysis',
                    method: 'save_analysis_visual_config',
                    args: [[self.selectedAnalysis], self.selectedVisualType, config_values],
                }).then(function (result) {
                    self._renderVisual();
                    self._renderVisualConfigs();
                    new swal('Success', 'Analysis Visual has been saved successfully', 'success');
                })
            }
        },

        _onClickAddDashboardBlock: function () {
            var self = this;
            if (self.selectedAnalysis && self.selectedDashboard) {
                self._rpc({
                    model: 'izi.dashboard.block',
                    method: 'create',
                    args: [{
                        'analysis_id': self.selectedAnalysis,
                        'dashboard_id': self.selectedDashboard,
                    }],
                }).then(function (result) {
                    new swal('Success', `${self.selectedAnalysisName} has been added to ${self.selectedDashboardName}`, 'success');
                })
            }
        },

        _onClickTabData: function () {
            var self = this;
            self.$tabData.addClass('active');
            self.$tabVisual.removeClass('active');
            self.$tabContentData.show();
            self.$tabContentVisual.hide();
        },

        _onClickTabVisual: function () {
            var self = this;
            self.$tabData.removeClass('active');
            self.$tabVisual.addClass('active');
            self.$tabContentData.hide();
            self.$tabContentVisual.show();
        },

        _onChangeVisualConfig: function (ev) {
            var self = this;
            if (self.selectedAnalysis) {
                let config_values = []
                $('.izi_select_visual_config_container .izi_visual_config').each(function () {
                    let config_type = $(this).attr('data-visual-config-type');
                    let config_value = null;
                    let visual_config_value_id = null;
                    let analysis_visual_config_id = $(this).attr('data-analysis-visual-config-id');
                    if (config_type == "input_string" || config_type == "input_number") {
                        config_value = $(this).val();
                    } else if (config_type == "toggle") {
                        config_value = $(this).is(":checked");
                    } else if (config_type == "selection_string" || config_type == "selection_number") {
                        config_value = $(this).val();
                        visual_config_value_id = $(`#${$(this).attr("id")} option:selected`).attr('data-visual-config-value-id');
                    }
                    config_values.push({
                        'id': analysis_visual_config_id != 'null' ? parseInt(analysis_visual_config_id) : null,
                        'analysis_id': self.selectedAnalysis,
                        'visual_config_id': parseInt($(this).attr('data-visual-config-id')),
                        'visual_config_value_id': visual_config_value_id != null ? parseInt(visual_config_value_id) : null,
                        'string_value': String(config_value),
                    })
                })

                self._rpc({
                    model: 'izi.analysis',
                    method: 'save_analysis_visual_config',
                    args: [[self.selectedAnalysis], config_values],
                }).then(function (result) {
                    self._renderVisual();
                    self._renderVisualConfigs();
                })
            }
        },

        _onChangeLimit: function () {
            var self = this;
            if (self.selectedAnalysis) {
                self.changeLimit = parseInt(self.$changeLimit.val());
                var data = {
                    'limit': self.changeLimit,
                }
                self._rpc({
                    model: 'izi.analysis',
                    method: 'write',
                    args: [self.selectedAnalysis, data],
                }).then(function (result) {
                    self._loadAnalysisInfo();
                    self._renderVisual();
                })
            }
        },

        _getVisualConfigValues: function () {
            var self = this;
            let visual_config_values = {}
            $('.izi_select_visual_config_container .izi_visual_config').each(function () {
                let config_type = $(this).attr('data-visual-config-type');
                let config_value = null;
                if (config_type == "input_string") {
                    config_value = $(this).val();
                } else if (config_type == "input_number") {
                    config_value = parseInt($(this).val());
                } else if (config_type == "toggle") {
                    config_value = $(this).is(":checked");
                } else if (config_type == "selection_string") {
                    config_value = $(this).val();
                } else if (config_type == "selection_number") {
                    config_value = parseInt($(this).val());
                }
                visual_config_values[$(this).attr('data-visual-config')] = config_value;
            })
            return visual_config_values;
        },

        _loadDashboards: function() {
            var self = this;
            self.$selectDashboard = new IZIAutocomplete(self, {
                'elm': self.$('#izi_select2_dashboard'),
                'multiple': false,
                'placeholder': 'Select Dashboard',
                'minimumInput': false,
                'params':  {
                    'model': 'izi.dashboard',
                    'textField': 'name',
                    'fields': ['id', 'name'],
                    'domain': [],
                    'limit': 10,
                    'sourceType': 'model',
                    'modelFieldValues': 'id',
                },
                'textField': 'name',
                'onChange': function(id, name) {
                    self.selectedDashboard = id;
                    self.selectedDashboardName = name;
                },
            })
        },

        _checkActionContext: function() {
            var self = this;
            if (self.actions) {
                for (const key in self.actions) {
                    if (self.actions[key] && self.actions[key].context && self.actions[key].context.analysis_id) {
                        self.selectedAnalysis = self.actions[key].context.analysis_id;
                        self.selectedDashboard = self.actions[key].context.dashboard_id;
                        self.selectedDashboardName = self.actions[key].context.dashboard_name;
                        self.mode = self.actions[key].context.mode;
                        if (self.mode == 'ai_explore' && self.selectedAnalysis) {
                            self._startLabAnalysisExplore();
                        }
                        self._rpc({
                            model: 'izi.analysis',
                            method: 'search_read',
                            args: [[['id', '=', self.selectedAnalysis]], ['id', 'name', 'table_id', 'visual_type_id']],
                        }).then(function (results) {
                            // console.log('Check Actions Context', results);
                            if (results && results.length) {
                                var result = results[0];
                                if (!result.table_id) {
                                    result.table_id = [0, ''];
                                }
                                if (result.id && result.name && result.table_id && result.table_id.length && result.visual_type_id && result.visual_type_id.length) {
                                    self._selectAnalysis(result.id, result.name, result.table_id[1], result.visual_type_id[1]);
                                }
                            }
                        })
                    } 
                }
            }
        },

        _startLabAnalysisExplore: function(args) {
            var self = this;
            // Generate Dashboard
            new IZIAutocomplete(self, {
                'elm': self.$viewAnalysis.$('#izi_select2_dashboard_explore'),
                'multiple': false,
                'placeholder': 'Select Dashboard',
                'minimumInput': false,
                'params':  {
                    'model': 'izi.dashboard',
                    'textField': 'name',
                    'fields': ['id', 'name'],
                    'domain': [],
                    'limit': 10,
                    'sourceType': 'model',
                    'modelFieldValues': 'id',
                },
                'textField': 'name',
                'onChange': function(id, name) {
                    self.$viewAnalysis.selectedDashboardExplore = id;
                },
            })
            // 
            self.$viewAnalysis.$viewAnalysisExplore.closest('.izi_dialog').show();
            self.$viewAnalysis.$viewAnalysisExplore.empty();
            self.$viewAnalysis.selectedAnalysisExplores = [];
            self._rpc({
                model: 'izi.analysis',
                method: 'start_lab_analysis_explore',
                args: [self.selectedAnalysis],
                kwargs: args,
            }).then(function (result) {
                console.log('Success Start Analysis Explore', result);
                if (result && result.analysis_explores) {
                    result.analysis_explores.forEach(function (analysis) {
                        var $exploreVisual = new IZIViewVisual(self, {
                            'analysis_id': analysis.id,
                        });
                        var $exploreVisualContainer = $(`<div class="izi_view_analysis_explore_content"></div>`);
                        $(`<div class="izi_view_analysis_explore_container" data-analysis-id="${analysis.id}">
                            <div class="izi_view_analysis_explore_title">${analysis.name}</div>
                        </div>`).append($exploreVisualContainer).appendTo(self.$viewAnalysis.$viewAnalysisExplore);
                        $exploreVisual.appendTo($exploreVisualContainer);
                        self.$exploreVisuals.push($exploreVisual);
                    })
                } else if (result.status == 401) {
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
                            // self._initDashboard();
                        }
                    });
                } else
                    new swal('Error', result.message, 'error');
            })
        },

        _onClickSelectAnalysisExplore: function (ev) {
            var self = this;
            var $target = $(ev.currentTarget);
            if (self.selectedAnalysis)
                self._startLabAnalysisExplore();
        },

        _onClickSelectAnalysisEdit: function (ev) {
            var self = this;
            var $target = $(ev.currentTarget);
            if (self.selectedAnalysis) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Analysis'),
                    target: 'new',
                    res_id: self.selectedAnalysis,
                    res_model: 'izi.analysis',
                    views: [[false, 'form']],
                    context: { 'active_test': false },
                }, {
                    on_close: function () {
                        self._loadAnalysisInfo();
                        self._renderVisual();
                        self._renderVisualConfigs();
                        self.$viewAnalysis._closeScript();
                    },
                });
            }
        },

        _initIconPicker: function() {
            var self = this;
            var material_icons = [
                '3d_rotation', 'ac_unit', 'access_alarm', 'access_alarms', 'access_time', 'accessibility', 'accessible', 'account_balance', 'account_balance_wallet', 'account_box', 'account_circle', 'adb', 'add', 'add_a_photo', 'add_alarm', 'add_alert', 'add_box', 'add_circle', 'add_circle_outline', 'add_location', 'add_shopping_cart', 'add_to_photos', 'add_to_queue', 'adjust', 'airline_seat_flat', 'airline_seat_flat_angled', 'airline_seat_individual_suite', 'airline_seat_legroom_extra', 'airline_seat_legroom_normal', 'airline_seat_legroom_reduced', 'airline_seat_recline_extra', 'airline_seat_recline_normal', 'airplanemode_active', 'airplanemode_inactive', 'airplay', 'airport_shuttle', 'alarm', 'alarm_add', 'alarm_off', 'alarm_on', 'album', 'all_inclusive', 'all_out', 'android', 'announcement', 'apps', 'archive', 'arrow_back', 'arrow_downward', 'arrow_drop_down', 'arrow_drop_down_circle', 'arrow_drop_up', 'arrow_forward', 'arrow_upward', 'art_track', 'aspect_ratio', 'assessment', 'assignment', 'assignment_ind', 'assignment_late', 'assignment_return', 'assignment_returned', 'assignment_turned_in', 'assistant', 'assistant_photo', 'attach_file', 'attach_money', 'attachment', 'audiotrack', 'autorenew', 'av_timer', 'backspace', 'backup', 'battery_alert', 'battery_charging_full', 'battery_full', 'battery_std', 'battery_unknown', 'beach_access', 'beenhere', 'block', 'bluetooth', 'bluetooth_audio', 'bluetooth_connected', 'bluetooth_disabled', 'bluetooth_searching', 'blur_circular', 'blur_linear', 'blur_off', 'blur_on', 'book', 'bookmark', 'bookmark_border', 'border_all', 'border_bottom', 'border_clear', 'border_color', 'border_horizontal', 'border_inner', 'border_left', 'border_outer', 'border_right', 'border_style', 'border_top', 'border_vertical', 'branding_watermark', 'brightness_1', 'brightness_2', 'brightness_3', 'brightness_4', 'brightness_5', 'brightness_6', 'brightness_7', 'brightness_auto', 'brightness_high', 'brightness_low', 'brightness_medium', 'broken_image', 'brush', 'bubble_chart', 'bug_report', 'build', 'burst_mode', 'business', 'business_center', 'cached', 'cake', 'call', 'call_end', 'call_made', 'call_merge', 'call_missed', 'call_missed_outgoing', 'call_received', 'call_split', 'call_to_action', 'camera', 'camera_alt', 'camera_enhance', 'camera_front', 'camera_rear', 'camera_roll', 'cancel', 'card_giftcard', 'card_membership', 'card_travel', 'casino', 'cast', 'cast_connected', 'center_focus_strong', 'center_focus_weak', 'change_history', 'chat', 'chat_bubble', 'chat_bubble_outline', 'check', 'check_box', 'check_box_outline_blank', 'check_circle', 'chevron_left', 'chevron_right', 'child_care', 'child_friendly', 'chrome_reader_mode', 'class', 'clear', 'clear_all', 'close', 'closed_caption', 'cloud', 'cloud_circle', 'cloud_done', 'cloud_download', 'cloud_off', 'cloud_queue', 'cloud_upload', 'code', 'collections', 'collections_bookmark', 'color_lens', 'colorize', 'comment', 'compare', 'compare_arrows', 'computer', 'confirmation_number', 'contact_mail', 'contact_phone', 'contacts', 'content_copy', 'content_cut', 'content_paste', 'control_point', 'control_point_duplicate', 'copyright', 'create', 'create_new_folder', 'credit_card', 'crop', 'crop_16_9', 'crop_3_2', 'crop_5_4', 'crop_7_5', 'crop_din', 'crop_free', 'crop_landscape', 'crop_original', 'crop_portrait', 'crop_rotate', 'crop_square', 'dashboard', 'data_usage', 'date_range', 'dehaze', 'delete', 'delete_forever', 'delete_sweep', 'description', 'desktop_mac', 'desktop_windows', 'details', 'developer_board', 'developer_mode', 'device_hub', 'devices',
                'devices_other', 'dialer_sip', 'dialpad', 'directions', 'directions_bike', 'directions_boat', 'directions_bus', 'directions_car', 'directions_railway', 'directions_run', 'directions_subway', 'directions_transit', 'directions_walk', 'disc_full', 'dns', 'do_not_disturb', 'do_not_disturb_alt', 'do_not_disturb_off', 'do_not_disturb_on', 'dock', 'domain', 'done', 'done_all', 'donut_large', 'donut_small', 'drafts', 'drag_handle', 'drive_eta', 'dvr', 'edit', 'edit_location', 'eject', 'email', 'enhanced_encryption', 'equalizer', 'error', 'error_outline', 'euro_symbol', 'ev_station', 'event', 'event_available', 'event_busy', 'event_note', 'event_seat', 'exit_to_app', 'expand_less', 'expand_more', 'explicit', 'explore', 'exposure', 'exposure_neg_1', 'exposure_neg_2', 'exposure_plus_1', 'exposure_plus_2', 'exposure_zero', 'extension', 'face', 'fast_forward', 'fast_rewind', 'favorite', 'favorite_border', 'featured_play_list', 'featured_video', 'feedback', 'fiber_dvr', 'fiber_manual_record', 'fiber_new', 'fiber_pin', 'fiber_smart_record', 'file_download', 'file_upload', 'filter', 'filter_1', 'filter_2', 'filter_3', 'filter_4', 'filter_5', 'filter_6', 'filter_7', 'filter_8', 'filter_9', 'filter_9_plus', 'filter_b_and_w', 'filter_center_focus', 'filter_drama', 'filter_frames', 'filter_hdr', 'filter_list', 'filter_none', 'filter_tilt_shift', 'filter_vintage', 'find_in_page', 'find_replace', 'fingerprint', 'first_page', 'fitness_center', 'flag', 'flare', 'flash_auto', 'flash_off', 'flash_on', 'flight', 'flight_land', 'flight_takeoff', 'flip', 'flip_to_back', 'flip_to_front', 'folder', 'folder_open', 'folder_shared', 'folder_special', 'font_download', 'format_align_center', 'format_align_justify', 'format_align_left', 'format_align_right', 'format_bold', 'format_clear', 'format_color_fill', 'format_color_reset', 'format_color_text', 'format_indent_decrease', 'format_indent_increase', 'format_italic', 'format_line_spacing', 'format_list_bulleted', 'format_list_numbered', 'format_paint', 'format_quote', 'format_shapes', 'format_size', 'format_strikethrough', 'format_textdirection_l_to_r', 'format_textdirection_r_to_l', 'format_underlined', 'forum', 'forward', 'forward_10', 'forward_30', 'forward_5', 'free_breakfast', 'fullscreen', 'fullscreen_exit', 'functions', 'g_translate', 'gamepad', 'games', 'gavel', 'gesture', 'get_app', 'gif', 'golf_course', 'gps_fixed', 'gps_not_fixed', 'gps_off', 'grade', 'gradient', 'grain', 'graphic_eq', 'grid_off', 'grid_on', 'group', 'group_add', 'group_work', 'hd', 'hdr_off', 'hdr_on', 'hdr_strong', 'hdr_weak', 'headset', 'headset_mic', 'healing', 'hearing', 'help', 'help_outline', 'high_quality', 'highlight', 'highlight_off', 'history', 'home', 'hot_tub', 'hotel', 'hourglass_empty', 'hourglass_full', 'http', 'https', 'image', 'image_aspect_ratio', 'import_contacts', 'import_export', 'important_devices', 'inbox', 'indeterminate_check_box', 'info', 'input', 'insert_chart', 'insert_comment', 'insert_drive_file', 'insert_emoticon', 'insert_invitation', 'insert_link', 'insert_photo', 'invert_colors', 'invert_colors_off', 'iso', 'keyboard', 'keyboard_arrow_down', 'keyboard_arrow_left', 'keyboard_arrow_right', 'keyboard_arrow_up', 'keyboard_backspace', 'keyboard_capslock', 'keyboard_hide', 'keyboard_return', 'keyboard_tab', 'keyboard_voice', 'kitchen', 'label', 'label_outline', 'landscape', 'language', 'laptop', 'laptop_chromebook', 'laptop_mac', 'laptop_windows', 'last_page', 'launch', 'layers', 'layers_clear', 'leak_add', 'leak_remove', 'lens', 'library_add', 'library_books', 'library_music',
                'lightbulb_outline', 'line_style', 'line_weight', 'linear_scale', 'link', 'linked_camera', 'list', 'live_help', 'live_tv', 'local_activity', 'local_airport', 'local_atm', 'local_bar', 'local_cafe', 'local_car_wash', 'local_convenience_store', 'local_dining', 'local_drink', 'local_florist', 'local_gas_station', 'local_grocery_store', 'local_hospital', 'local_hotel', 'local_laundry_service', 'local_library', 'local_mall', 'local_movies', 'local_offer', 'local_parking', 'local_pharmacy', 'local_phone', 'local_pizza', 'local_play', 'local_post_office', 'local_printshop', 'local_see', 'local_shipping', 'local_taxi', 'location_city', 'location_disabled', 'location_off', 'location_on', 'location_searching', 'lock', 'lock_open', 'lock_outline', 'looks', 'looks_3', 'looks_4', 'looks_5', 'looks_6', 'looks_one', 'looks_two', 'loop', 'loupe', 'low_priority', 'loyalty', 'mail', 'mail_outline', 'map', 'markunread', 'markunread_mailbox', 'memory', 'menu', 'merge_type', 'message', 'mic', 'mic_none', 'mic_off', 'mms', 'mode_comment', 'mode_edit', 'monetization_on', 'money_off', 'monochrome_photos', 'mood', 'mood_bad', 'more', 'more_horiz', 'more_vert', 'motorcycle', 'mouse', 'move_to_inbox', 'movie', 'movie_creation', 'movie_filter', 'multiline_chart', 'music_note', 'music_video', 'my_location', 'nature', 'nature_people', 'navigate_before', 'navigate_next', 'navigation', 'near_me', 'network_cell', 'network_check', 'network_locked', 'network_wifi', 'new_releases', 'next_week', 'nfc', 'no_encryption', 'no_sim', 'not_interested', 'note', 'note_add', 'notifications', 'notifications_active', 'notifications_none', 'notifications_off', 'notifications_paused', 'offline_pin', 'ondemand_video', 'opacity', 'open_in_browser', 'open_in_new', 'open_with', 'pages', 'pageview', 'palette', 'pan_tool', 'panorama', 'panorama_fish_eye', 'panorama_horizontal', 'panorama_vertical', 'panorama_wide_angle', 'party_mode', 'pause', 'pause_circle_filled', 'pause_circle_outline', 'payment', 'people', 'people_outline', 'perm_camera_mic', 'perm_contact_calendar', 'perm_data_setting', 'perm_device_information', 'perm_identity', 'perm_media', 'perm_phone_msg', 'perm_scan_wifi', 'person', 'person_add', 'person_outline', 'person_pin', 'person_pin_circle', 'personal_video', 'pets', 'phone', 'phone_android', 'phone_bluetooth_speaker', 'phone_forwarded', 'phone_in_talk', 'phone_iphone', 'phone_locked', 'phone_missed', 'phone_paused', 'phonelink', 'phonelink_erase', 'phonelink_lock', 'phonelink_off', 'phonelink_ring', 'phonelink_setup', 'photo', 'photo_album', 'photo_camera', 'photo_filter', 'photo_library', 'photo_size_select_actual', 'photo_size_select_large', 'photo_size_select_small', 'picture_as_pdf', 'picture_in_picture', 'picture_in_picture_alt', 'pie_chart', 'pie_chart_outlined', 'pin_drop', 'place', 'play_arrow', 'play_circle_filled', 'play_circle_outline', 'play_for_work', 'playlist_add', 'playlist_add_check', 'playlist_play', 'plus_one', 'poll', 'polymer', 'pool', 'portable_wifi_off', 'portrait', 'power', 'power_input', 'power_settings_new', 'pregnant_woman', 'present_to_all', 'print', 'priority_high', 'public', 'publish', 'query_builder', 'question_answer', 'queue', 'queue_music', 'queue_play_next', 'radio', 'radio_button_checked', 'radio_button_unchecked', 'rate_review', 'receipt', 'recent_actors', 'record_voice_over', 'redeem', 'redo', 'refresh', 'remove', 'remove_circle', 'remove_circle_outline', 'remove_from_queue', 'remove_red_eye', 'remove_shopping_cart', 'reorder', 'repeat', 'repeat_one', 'replay', 'replay_10', 'replay_30', 'replay_5', 'reply', 'reply_all',
                'report', 'report_problem', 'restaurant', 'restaurant_menu', 'restore', 'restore_page', 'ring_volume', 'room', 'room_service', 'rotate_90_degrees_ccw', 'rotate_left', 'rotate_right', 'rounded_corner', 'router', 'rowing', 'rss_feed', 'rv_hookup', 'satellite', 'save', 'scanner', 'schedule', 'school', 'screen_lock_landscape', 'screen_lock_portrait', 'screen_lock_rotation', 'screen_rotation', 'screen_share', 'sd_card', 'sd_storage', 'search', 'security', 'select_all', 'send', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'sentiment_very_dissatisfied', 'sentiment_very_satisfied', 'settings', 'settings_applications', 'settings_backup_restore', 'settings_bluetooth', 'settings_brightness', 'settings_cell', 'settings_ethernet', 'settings_input_antenna', 'settings_input_component', 'settings_input_composite', 'settings_input_hdmi', 'settings_input_svideo', 'settings_overscan', 'settings_phone', 'settings_power', 'settings_remote', 'settings_system_daydream', 'settings_voice', 'share', 'shop', 'shop_two', 'shopping_basket', 'shopping_cart', 'short_text', 'show_chart', 'shuffle', 'signal_cellular_4_bar', 'signal_cellular_connected_no_internet_4_bar', 'signal_cellular_no_sim', 'signal_cellular_null', 'signal_cellular_off', 'signal_wifi_4_bar', 'signal_wifi_4_bar_lock', 'signal_wifi_off', 'sim_card', 'sim_card_alert', 'skip_next', 'skip_previous', 'slideshow', 'slow_motion_video', 'smartphone', 'smoke_free', 'smoking_rooms', 'sms', 'sms_failed', 'snooze', 'sort', 'sort_by_alpha', 'spa', 'space_bar', 'speaker', 'speaker_group', 'speaker_notes', 'speaker_notes_off', 'speaker_phone', 'spellcheck', 'star', 'star_border', 'star_half', 'stars', 'stay_current_landscape', 'stay_current_portrait', 'stay_primary_landscape', 'stay_primary_portrait', 'stop', 'stop_screen_share', 'storage', 'store', 'store_mall_directory', 'straighten', 'streetview', 'strikethrough_s', 'style', 'subdirectory_arrow_left', 'subdirectory_arrow_right', 'subject', 'subscriptions', 'subtitles', 'subway', 'supervisor_account', 'surround_sound', 'swap_calls', 'swap_horiz', 'swap_vert', 'swap_vertical_circle', 'switch_camera', 'switch_video', 'sync', 'sync_disabled', 'sync_problem', 'system_update', 'system_update_alt', 'tab', 'tab_unselected', 'tablet', 'tablet_android', 'tablet_mac', 'tag_faces', 'tap_and_play', 'terrain', 'text_fields', 'text_format', 'textsms', 'texture', 'theaters', 'thumb_down', 'thumb_up', 'thumbs_up_down', 'time_to_leave', 'timelapse', 'timeline', 'timer', 'timer_10', 'timer_3', 'timer_off', 'title', 'toc', 'today', 'toll', 'tonality', 'touch_app', 'toys', 'track_changes', 'traffic', 'train', 'tram', 'transfer_within_a_station', 'transform', 'translate', 'trending_down', 'trending_flat', 'trending_up', 'tune', 'turned_in', 'turned_in_not', 'tv', 'unarchive', 'undo', 'unfold_less', 'unfold_more', 'update', 'usb', 'verified_user', 'vertical_align_bottom', 'vertical_align_center', 'vertical_align_top', 'vibration', 'video_call', 'video_label', 'video_library', 'videocam', 'videocam_off', 'videogame_asset', 'view_agenda', 'view_array', 'view_carousel', 'view_column', 'view_comfy', 'view_compact', 'view_day', 'view_headline', 'view_list', 'view_module', 'view_quilt', 'view_stream', 'view_week', 'vignette', 'visibility', 'visibility_off', 'voice_chat', 'voicemail', 'volume_down', 'volume_mute', 'volume_off', 'volume_up', 'vpn_key', 'vpn_lock', 'wallpaper', 'warning', 'watch', 'watch_later', 'wb_auto', 'wb_cloudy', 'wb_incandescent', 'wb_iridescent', 'wb_sunny', 'wc', 'web', 'web_asset', 'weekend', 'whatshot', 'widgets', 'wifi',
                'wifi_lock', 'wifi_tethering', 'work', 'wrap_text', 'youtube_searched_for', 'zoom_in', 'zoom_out', 'zoom_out_map'
            ];
            
            $('input[data-visual-config="scorecardIcon"]').each(function () {
                var input = this;
                $(this).addClass('use-material-icon-picker');
                // Add the current icon as a prefix, and update when the field changes.
                $(this).before('<i class="material-icons material-icon-picker-prefix prefix"></i>');
                $(this).on('change keyup', function () {
                    $(this).prev().text($(this).val());
                });
                $(this).prev().text($(this).val());
                // Append the picker and the search box.
                var $picker = $('<div class="izi_dialog_bg"></div><div class="material-icon-picker" tabindex="-1"></div>');
                var $search = $('<input type="text" placeholder="Search...">');
                // Do simple filtering based on the search.
                $search.on('keyup', function () {
                    var search = $search.val().toLowerCase();
                    var $icons = $(this).siblings('.icons');
                    $icons.find('i').css('display', 'none');
                    $icons.find('i:contains('+search+')').css('display', 'inline-block');
                });
                $picker.append($search);
                // Append each icon into the picker.
                var $icons = $('<div class="icons"></div>');
                function onIconClick() {
                    $(input).val($(this).text()).trigger('change');
                    $('.material-icon-picker').fadeOut(200, function() { $(this).remove(); });
                    $('.izi_dialog_bg').fadeOut(200, function() { $(this).remove(); });
                }
                material_icons.forEach(function (icon) {
                    var $icon = $('<i class="material-icons"></i>');
                    $icon.text(icon);
                    $icon.on('click', onIconClick);
                    $icons.append($icon);
                });
                // Show the picker when the input field gets focus.
                $picker.append($icons).hide();
                $('body').after($picker);
                $(this).on('focusin', function () {
                    $picker.fadeIn(200);
                });
            });
        },

        _initHideIconPicker: function () {
            var self = this;
            // Hide any picker when it or the input field loses focus.
            $('body').on('click', '.izi_dialog_bg', function (e) {
                $('.material-icon-picker').fadeOut(200, function() { $(this).remove(); });
                $('.izi_dialog_bg').fadeOut(200, function() { $(this).remove(); });
            });
        },

        _onClickDataScriptEditor: function(ev) {
            var self = this;
            var domain = [];
            ev.preventDefault();
            ev.stopPropagation();
            if (self.selectedAnalysis) {
                domain = [['id', '=', self.selectedAnalysis]];
                self._rpc({
                    model: 'izi.analysis',
                    method: 'get_data_script',
                    args: [self.selectedAnalysis],
                }).then(function (result) {
                    if (result && result.length == 2 && result[1]) {
                        var script = result[0];
                        // Load Script Editor
                        self.$viewAnalysis._loadDataScriptEditor(result[1]);
                        // Reset Script Editor
                        if (self.$viewAnalysis.$editorContainer) {
                            self.$viewAnalysis._resetScriptEditor();
                        }
                        self.$viewAnalysis.$editor.setValue(script, 1);
                        self.$viewAnalysis.lastScript = script;
                        self.$viewAnalysis.scriptType = 'data';
                        self.$viewAnalysis.$editorContainer.css('background', '#272823');
                        self.$viewAnalysis.$editorContainer.find('h4').text(self.selectedAnalysisName);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-analysis-id', self.selectedAnalysis);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-analysis-name', self.selectedAnalysisName);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-block-id', 0);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-script-type', 'data');
                        self.$viewAnalysis.$editorContainer.show();
                    } else {
                        new swal('Error', 'This analysis method can not fetch data with script!', 'error');
                    }
                });
            }
        },

        _onClickVisualScriptEditor: function(ev) {
            var self = this;
            var domain = [];
            ev.preventDefault();
            ev.stopPropagation();
            if (self.selectedAnalysis) {
                domain = [['id', '=', self.selectedAnalysis]];
                self._rpc({
                    model: 'izi.analysis',
                    method: 'search_read',
                    args: [domain, ['name', 'render_visual_script']],
                }).then(function (results) {
                    if (results && results.length > 0) {
                        var script = results[0].render_visual_script || '';
                        // Load Script Editor
                        self.$viewAnalysis._loadVisualScriptEditor();
                        // Reset Script Editor
                        if (self.$viewAnalysis.$editorContainer) {
                            self.$viewAnalysis._resetScriptEditor();
                        }
                        self.$viewAnalysis.$editor.setValue(script, 1);
                        self.$viewAnalysis.lastScript = script;
                        self.$viewAnalysis.scriptType = 'visual';
                        self.$viewAnalysis.$editorContainer.css('background', 'white');
                        self.$viewAnalysis.$editorContainer.find('h4').text(self.selectedAnalysisName);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-analysis-id', self.selectedAnalysis);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-analysis-name', self.selectedAnalysisName);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-block-id', 0);
                        self.$viewAnalysis.$editorContainer.find('.izi_update_script').attr('data-script-type', 'visual');
                        self.$viewAnalysis.$editorContainer.show();
                    }
                });
            }
        },

    });

    return IZIConfigAnalysis;
});