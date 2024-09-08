odoo.define('izi_dashboard.IZIAddAnalysis', function (require) {
    "use strict";

    var IZIDialog = require('izi_dashboard.IZIDialog');
    var core = require('web.core');
    var QWeb = core.qweb;
    var _t = core._t;

    var IZIAutocomplete = require('izi_dashboard.IZIAutocomplete');
    var IZIAddAnalysis = IZIDialog.extend({
        jsLibs: [
            '/izi_dashboard/static/lib/ace-1.3.1/ace.js',
            [
                '/izi_dashboard/static/lib/ace-1.3.1/mode-sql.js',
                '/izi_dashboard/static/lib/ace-1.3.1/theme-chrome.js',
            ]
        ],
        template: 'IZISelectAnalysis',
        events: {
            'click .izi_select_analysis_item': '_onSelectAnalysisItem',
            'click .izi_edit_analysis_item': '_onClickEditAnalysisItemWizard',
            'click .izi_new_analysis_item': '_onClickNewAnalysisWizard',
            'click .izi_dialog_bg': '_onClickBackground',
            'click .izi_select_data_source': '_onSelectDataSource',
            'click .izi_select_table': '_onSelectTable',
            'click .izi_action_analysis_save': '_onClickSaveAnalysis',
            'click .izi_action_analysis_close': '_onClickCloseAnalysis',
            'click .izi_action_analysis_delete': '_onClickDeleteAnalysis',
            'click .izi_select_data_source_item': '_onSelectedDataSourceItem',
            'click .izi_select_table_item': '_onSelectedTableItem',
            'click .izi_action_table_test_query': '_testQuery',
            'click .izi_action_table_execute_query': '_executeQuery',
            'click .izi_action_table_new': '_onClickNewTable',
            'click .izi_action_table_save': '_onClickSaveTable',
            'click .izi_action_table_search': '_onClickSearchTable',
            'click .izi_action_table_cancel': '_onClickCancelTable',
            'click .izi_action_table_edit': '_onClickEditTable',
            'click .izi_search_analysis_visual .dropdown-item': '_onClickSearchVisual',
            'click .izi_search_analysis_category .dropdown-item': '_onClickSearchCategory',
            'keydown .izi_search_analysis_name': '_onKeyupAnalysisName',
        },

        /**
         * @override
         */
        init: function (parent, $content) {
            this._super.apply(this, arguments);

            this.parent = parent;
            this.$content = $content;
            this.allAnalysis = [];
            this.analysisById = {};

            this.selectedAnalysis;
            this.selectedDashboard;
            this.selectedDashboardName;
            this.selectedSource;
            this.selectedTable;

            this.$analysisName;
            this.$sourceName;
            this.$tableName;

            this.selectedCategory;
            this.selectedVisualType;
            this.keyword;
            this.typingTimer;
            this.doneTypingInterval = 500;
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

            self.$analysisName = self.$el.find('.izi_input_analysis input');
            self.$tableName = self.$el.find('.izi_select_data_source .izi_input_table');
            self.$formContainer = self.$el.find('.izi_form_analysis_container');
            self.$analysisContainer = self.$el.find('.izi_select_analysis_item_container');
            self.$sourceContainer = self.$el.find('.izi_select_data_source_item_container');
            self.$tableContainer = self.$el.find('.izi_select_table_item_container');
            self.$fieldMetricContainer = self.$el.find('.izi_select_field_metric_item_container');
            self.$fieldDimensionContainer = self.$el.find('.izi_select_field_dimension_item_container');
            self.$btnTableNew = self.$el.find('.izi_select_data_source .izi_action_table_new');
            self.$btnTableSave = self.$el.find('.izi_select_data_source .izi_action_table_save');
            self.$btnTableCancel = self.$el.find('.izi_select_data_source .izi_action_table_cancel');
            self.$btnTableSearch = self.$el.find('.izi_select_data_source .izi_action_table_search');
            self.$formQuery = self.$el.find('.izi_form_table_query');
            self.$formFields = self.$el.find('.izi_form_table_fields');
            self.$btnTestQuery = self.$el.find('.izi_action_table_test_query');
            self.$btnExecuteQuery = self.$el.find('.izi_action_table_execute_query');
            self.$btnTableEdit = self.$el.find('.izi_select_data_source .izi_action_table_edit');
            self.$btnSearchVisual = self.$el.find('.izi_search_analysis_visual');
            self.$btnSearchCategory = self.$el.find('.izi_search_analysis_category');

            // Load
            self._loadAnalysisItems();
            self._loadSourcesTables();
            self._loadVisualTypes();
            self._loadCategories();

            // Query Editor
            self.$editor = ace.edit('izi_query_editor');
            self.$editor.setTheme('ace/theme/chrome');
            self.$editor.session.setMode('ace/mode/sql');
        },

        _showForm: function (id) {
        },

        /**
         * Private Method
         */
        _loadAnalysisItems: function (selectAnalysis=false) {
            var self = this;
            var args = {
                'category_id': self.selectedCategory || 0,
                'visual_type_id': self.selectedVisualType || 0,
                'keyword': self.keyword || '',
            }
            self.$analysisContainer.empty();
            self._rpc({
                model: 'izi.analysis',
                method: 'ui_get_all',
                args: [args],
            }).then(function (results) {
                self.allAnalysis = results;
                results.forEach(res => {
                    self.analysisById[res.id] = res;
                });
                // New Analysis
                var $new = `
                <div class="izi_new_analysis_item izi_select_item izi_select_item_blue">
                    <div class="izi_title" t-esc="name">New Analysis</div>
                    <div class="izi_subtitle" t-esc="source_table">
                        Create analysis from tables or queries
                    </div>
                    <div class="izi_select_item_icon">
                        <span class="material-icons">add</span>
                    </div>
                </div>
                `;
                self.$analysisContainer.append($new)
                // Render Analysis Item
                self.allAnalysis.forEach(analysis => {
                    var $content = $(QWeb.render('IZISelectAnalysisItem', {
                        name: `${analysis.name}`,
                        id: analysis.id,
                        table_id: analysis.table_id,
                        source_id: analysis.source_id,
                        table_name: analysis.table_name,
                        source_name: analysis.source_name,
                        source_table: `${analysis.source_name} / ${analysis.table_name}`,
                        visual_type: analysis.visual_type,
                        visual_type_icon: analysis.visual_type_icon,
                        category_name: analysis.category_name,
                    }));
                    self.$analysisContainer.append($content)
                });
            })
        },
        _loadSourcesTables: function() {
            var self = this;
            // Source & Table Autocomplete
            self.$selectSource = new IZIAutocomplete(self, {
                'elm': self.$('#izi_select2_data_source'),
                'multiple': false,
                'placeholder': 'Select Data Source',
                'minimumInput': false,
                'params':  {
                    'model': 'izi.data.source',
                    'textField': 'name',
                    'fields': ['id', 'name'],
                    'domain': [],
                    'limit': 10,
                    'sourceType': 'model',
                    'modelFieldValues': 'id',
                },
                'textField': 'name',
                'onChange': function(id, name) {
                    self.selectedSource = id;
                    self.selectedTable = null;
                    self.$selectTable.setDomain([['source_id', '=', id]]);
                    self.$btnTableNew.show();
                    self.$btnTableSearch.show();
                    self.$btnTableEdit.hide();
                    self.$btnTableSave.hide();
                    self.$btnTableCancel.hide();
                    self.$tableName.hide();
                    self.$fieldMetricContainer.empty();
                    self.$fieldDimensionContainer.empty();
                    self.$formFields.hide();
                    self.$formQuery.hide();
                },
            })
            self.$selectTable = new IZIAutocomplete(self, {
                'elm': self.$('#izi_select2_table'),
                'multiple': false,
                'placeholder': 'Select Table',
                'minimumInput': false,
                'params':  {
                    'model': 'izi.table',
                    'textField': 'name',
                    'fields': ['id', 'name'],
                    'domain': [],
                    'limit': 10,
                    'sourceType': 'model',
                    'modelFieldValues': 'id',
                },
                'textField': 'name',
                'onChange': function(id, name) {
                    self.selectedTable = id;
                    self._loadFields();
                    self.$formFields.show();
                    self._checkSelectedTable();
                },
            })
        },
        _loadFields: function (ev) {
            var self = this;
            if (self.selectedTable) {
                self.$fieldMetricContainer.empty();
                self.$fieldDimensionContainer.empty();
                self._rpc({
                    model: 'izi.table.field',
                    method: 'search_read',
                    args: [[['table_id', '=', self.selectedTable]], ['id', 'name', 'field_type']],
                }).then(function (results) {
                    // console.log('Fields', results);
                    results.forEach(res => {
                        if (res.field_type == 'numeric' || res.field_type == 'number') {
                            var $elm = `<div data-id="${res.id}" data-name="${res.name}" class="izi_bg_lp izi_form_select_item izi_select_field_item">
                                <span class="izi_col_p material-icons izi_btn_icon_left">${IZIFieldIcon.getIcon(res.field_type)}</span> 
                                <span class="izi_col_p izi_subtitle_bold">${res.name}</span>
                            </div>`;
                            self.$fieldMetricContainer.append($elm);
                        } else {
                            var $elm = `<div data-id="${res.id}" data-name="${res.name}" class="izi_bg_lb izi_form_select_item izi_select_field_item">
                                <span class="izi_col_b material-icons izi_btn_icon_left">${IZIFieldIcon.getIcon(res.field_type)}</span> 
                                <span class="izi_col_b izi_subtitle_bold">${res.name}</span>
                            </div>`;
                            self.$fieldDimensionContainer.append($elm);
                        }
                    })
                });
            }
        },
        _loadQuery: function () {
            var self = this;
            if (self.selectedTable) {
                self.$editor.setValue('');
                self._rpc({
                    model: 'izi.table',
                    method: 'read',
                    args: [self.selectedTable, ['id', 'name', 'db_query']],
                }).then(function (results) {
                    // console.log('Query', results);
                    results.forEach(res => {
                        if (res.db_query) {
                            self.$editor.setValue(res.db_query);
                            var line = self.$editor.session.getLength();
                            if (line && line > 1) {
                                self.$editor.gotoLine(line + 1);
                            }
                        }
                    })
                });
            }
        },
        _loadVisualTypes: function () {
            var self = this;
            self.$btnSearchVisual.find('.dropdown-menu').empty();
            self.$btnSearchVisual.find('.dropdown-menu').append(`
                <a class="dropdown-item" data-id="0" data-title="All Types" data-icon-name="query_stats">
                    <span class="material-icons">query_stats</span>
                    All Types
                </a>
            `)
            self._rpc({
                model: 'izi.visual.type',
                method: 'search_read',
                args: [[], ['id', 'name', 'title', 'icon']],
            }).then(function (results) {
                // console.log('Query', results);
                results.forEach(res => {
                    self.$btnSearchVisual.find('.dropdown-menu').append(`
                        <a class="dropdown-item" data-id="${res.id}" data-title="${res.title}" data-icon-name="${res.icon}">
                            <span class="material-icons">${res.icon}</span>
                            ${res.title}
                        </a>
                    `)
                })
            });
        },
        _loadCategories: function () {
            var self = this;
            self.$btnSearchCategory.find('.dropdown-menu').empty();
            self.$btnSearchCategory.find('.dropdown-menu').append(`
                <a class="dropdown-item" data-id="0" data-title="All Categories">
                    All Categories
                </a>
            `)
            self._rpc({
                model: 'izi.analysis.category',
                method: 'search_read',
                args: [[], ['id', 'name']],
            }).then(function (results) {
                // console.log('Query', results);
                results.forEach(res => {
                    self.$btnSearchCategory.find('.dropdown-menu').append(`
                        <a class="dropdown-item" data-id="${res.id}" data-title="${res.name}">
                            ${res.name}
                        </a>
                    `)
                })
            });
        },
        _testQuery: function (ev) {
            ev.stopPropagation();
            var self = this;
            var query = self.$editor.getValue();
            if (self.selectedTable) {
                self._rpc({
                    model: 'izi.table',
                    method: 'ui_test_query',
                    args: [self.selectedTable, query],
                }).then(function (results) {
                    // console.log('Test Query', results);
                    if (results.data && results.data.length > 0) {
                        new swal('Success', `Your query is good to go! Here is the example results: ${results.message}`, 'success');
                    } else {
                        new swal('Failed', results.message, 'error');
                    }
                });
            }
        },
        _executeQuery: function (ev) {
            ev.stopPropagation();
            var self = this;
            var query = self.$editor.getValue();
            if (!self.selectedAnalysis) {
                new swal('Failed', 'You have to save the analysis first before executing the query!', 'error');
            }
            if (self.selectedTable) {
                var confirmation_message;
                if (self.selectAnalysis) {
                    confirmation_message = `
                        Executing table query will drop the table fields and creating the new ones. \
                        You may lose metrics / dimensions configuration of analysis that used this table. \
                        You can create a new table or duplicate the query to avoid this. \
                        Do you confirm to execute the query?
                    `;
                } else {
                    confirmation_message = `
                        Executing table query will generate table fields. \
                        Do you confirm to execute the query?
                    `;
                }
                new swal({
                    title: "Execute Query Confirmation",
                    text: confirmation_message,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    heightAuto : false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (self.selectAnalysis) {
                            self._rpc({
                                model: 'izi.analysis',
                                method: 'ui_execute_query',
                                args: [self.selectedAnalysis, self.selectedTable, query],
                            }).then(function (results) {
                                // console.log('Execute Query', results);
                                if (results.status == 200) {
                                    self._loadFields();
                                    new swal('Success', `Your query is executed successfully. The fields has been reset.`, 'success');
                                } else {
                                    new swal('Failed', results.message, 'error');
                                }
                            });
                        } else {
                            self._rpc({
                                model: 'izi.table',
                                method: 'ui_execute_query',
                                args: [self.selectedTable, query],
                            }).then(function (results) {
                                // console.log('Execute Query', results);
                                if (results.status == 200) {
                                    self._loadFields();
                                    new swal('Success', `Your query is executed successfully. The fields has been reset.`, 'success');
                                } else {
                                    new swal('Failed', results.message, 'error');
                                }
                            });
                        }
                    }
                });
            }
        },
        _onClickBackground: function (ev) {
            var self = this;
            this._super.apply(this, arguments);
        },
        _onKeyupAnalysisName: function(ev) {
            var self = this;
            var keyword = $(ev.currentTarget).val();
            if (self.typingTimer)
                clearTimeout(self.typingTimer);
            self.keyword = keyword;
            self.typingTimer = setTimeout(function() {
                self._loadAnalysisItems();
            }, self.doneTypingInterval);
        },
        _onClickSearchVisual: function(ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            var text = $(ev.currentTarget).data('title');
            var icon = $(ev.currentTarget).data('icon-name');
            this.selectedVisualType = id;
            self._loadAnalysisItems();
            self.$btnSearchVisual.find('.dropdown-toggle .title').text(text);
            self.$btnSearchVisual.find('.dropdown-toggle .material-icons').text(icon);
        },
        _onClickSearchCategory: function(ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            var text = $(ev.currentTarget).data('title');
            this.selectedCategory = id;
            self._loadAnalysisItems();
            self.$btnSearchCategory.find('.dropdown-toggle .title').text(text);
        },
        _onSelectAnalysisItem: function (ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            self.selectedAnalysis = id;
            self.selectedDashboard = self.parent.selectedDashboard;
            if (self.selectedAnalysis && self.selectedDashboard) {
                self._rpc({
                    model: 'izi.dashboard.block',
                    method: 'create',
                    args: [{
                        'analysis_id': self.selectedAnalysis,
                        'dashboard_id': self.selectedDashboard,
                    }],
                }).then(function (result) {
                    self.parent._selectDashboard(self.parent.selectedDashboard, self.parent.selectedDashboardName, self.parent.selectedDashboardWriteDate, self.parent.selectedDashboardThemeName);
                    new swal('Success', `Analysis has been added to ${self.parent.selectedDashboardName}!`, 'success');
                    self.destroy();
                });
            }
        },
        _onClickEditAnalysisItemWizard: function (ev) {
            ev.stopPropagation();
            var self = this;
            var $parent = $(ev.currentTarget).closest('.izi_select_analysis_item');
            var id = $parent.data('id');
            self.selectedAnalysis = id;

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
                        self.parent._selectDashboard(self.parent.selectedDashboard, self.parent.selectedDashboardName, self.parent.selectedDashboardWriteDate, self.parent.selectedDashboardThemeName);
                    },
                });
                self.destroy();
            }
        },
        _onClickNewAnalysisWizard: function (ev) {
            ev.stopPropagation();
            var self = this;
            self.do_action({
                type: 'ir.actions.act_window',
                name: _t('Analysis'),
                target: 'new',
                res_id: false,
                res_model: 'izi.analysis',
                views: [[false, 'form']],
                context: { 
                    'active_test': false,
                    'dashboard_id': self.parent.selectedDashboard || false,
                },
            }, {
                on_close: function () {
                    self.parent._selectDashboard(self.parent.selectedDashboard, self.parent.selectedDashboardName, self.parent.selectedDashboardWriteDate, self.parent.selectedDashboardThemeName);
                    // new swal('Success', `Analysis has been added to ${self.parent.selectedDashboardName}!`, 'success');
                },
            });
            self.destroy();
        },
        _onClickEditAnalysisItem: function (ev) {
            ev.stopPropagation();
            var self = this;
            var $parent = $(ev.currentTarget).closest('.izi_select_analysis_item');
            var id = $parent.data('id');
            var name = $parent.data('name');
            var source_name = $parent.data('source_name');
            var table_name = $parent.data('table_name');
            var source_id = $parent.data('source_id');
            var table_id = $parent.data('table_id');
            self.selectedAnalysis = id;
            self.$analysisName.val(name);
            self.selectedSource = source_id;
            self.selectedTable = table_id;
            // Set Source
            self.$selectSource.elm.select2('data', {'id': source_id, 'name': source_name});
            self.$selectTable.setDomain([['source_id', '=', source_id]]);
            self.$selectTable.elm.select2('data', {'id': table_id, 'name': table_name});

            self._loadFields();
            self._loadQuery();
            self._openSlide(self.$formContainer);
            self._closeSlide(self.$analysisContainer);

            self.$btnTableEdit.show();
            self.$btnTableNew.show();
            self.$btnTableSearch.show();
        },
        _onClickNewAnalysis: function(ev) {
            var self = this;
            self.$analysisName.val('').removeAttr('value');
            self.selectedAnalysis = 0;
            self.selectedSource = 0;
            self.selectedTable = 0;
            self.$selectSource.elm.removeAttr('value');
            self.$selectSource.elm.select2('destroy');
            self.$selectSource.init();
            self.$selectTable.elm.removeAttr('value');
            self.$selectTable.elm.select2('destroy');
            self.$selectTable.init();
            self.$fieldMetricContainer.empty();
            self.$fieldDimensionContainer.empty();
            self.$editor.setValue('');
            self._openSlide(self.$formContainer);
            self._closeSlide(self.$analysisContainer);
            const id = self.$selectTable.elm.attr('id');
            $(`#s2id_${id}`).hide();
            self.$formQuery.hide();
            self.$formFields.hide();
        },
        _successMessage: function (message) {
            var self = this;
            if (!message)
                message = 'Operation Success.'
            new swal('Success', message, 'success');
        },
        _dangerMessage: function (message) {
            var self = this;
            if (!message)
                message = 'Failed on Operation.'
            new swal('Failed', message, 'error');
        },
        _onClickSaveAnalysis: function (ev) {
            ev.stopPropagation();
            var self = this;
            var success = self._saveAnalysis();
            if (success) {
                // self._openSlide(self.$analysisContainer);
                // self._closeSlide(self.$formContainer);
            }
        },
        _saveAnalysis: function() {
            var self = this;
            var analysisName = self.$analysisName.val();
            if (!analysisName) {
                new swal('Failed', 'Please input the analysis name!', 'error');
                return false;
            }
            if (!self.selectedSource) {
                new swal('Failed', 'Please select the data source for this analysis!', 'error');
                return false;
            }
            if (!self.selectedTable) {
                new swal('Failed', 'Please select the table for this analysis!', 'error');
                return false;
            }
            var data = {
                'name': analysisName,
                'source_id': self.selectedSource,
                'table_id': self.selectedTable,
            }
            if (self.selectedAnalysis) {
                self._writeAnalysis(self.selectedAnalysis, data);
            } else if (self.selectedAnalysis == 0) {
                self._createAnalysis(data);
            }
            return true;
        },
        _onClickCloseAnalysis: function (ev) {
            ev.stopPropagation();
            var self = this;
            self._openSlide(self.$analysisContainer);
            self._closeSlide(self.$formContainer);
            const id = self.$selectTable.elm.attr('id');
            $(`#s2id_${id}`).hide();
            self.$btnTableNew.hide();
            self.$btnTableSearch.hide();
            self.$btnTableEdit.hide();
            self.$btnTableSave.hide();
            self.$btnTableCancel.hide();
            self.$tableName.hide();
        },
        
        _onClickDeleteAnalysis: function (ev) {
            var self = this;
            ev.stopPropagation();
            if (self.selectedAnalysis) {
                new swal({
                    title: "Remove Analysis",
                    text: `
                        Do you confirm to remove the analysis?
                    `,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    heightAuto : false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        self._rpc({
                            model: 'izi.analysis',
                            method: 'unlink',
                            args: [self.selectedAnalysis],
                        }).then(function (result) {
                            new swal('Success', `Analysis has been deleted successfully`, 'success');
                            self._loadAnalysisItems();
                            self._openSlide(self.$analysisContainer);
                            self._closeSlide(self.$formContainer);
                        });
                    }
                });
            }
        },

        _onClickNewTable: function(ev){
            var self = this;
            self.$btnTableNew.hide();
            self.$btnTableSave.show();
            self.$btnTableCancel.show();
            self.$tableName.show();
            const id = self.$selectTable.elm.attr('id');
            $(`#s2id_${id}`).hide();
            self.$btnTableEdit.hide();
            self.$editor.setValue('\n# -- Query example\n# select\n# \trp.id,\n# \trp.name,\n# \trp.street,\n# \trp.city,\n# \trcs.name as state,\n# \trc.name as country,\n# \trcp.name as company,\n# \trp.create_date as create_date\n# from\n# \tres_partner rp\n# left join res_company rcp on\n# \t(rcp.id = rp.company_id)\n# left join res_country_state rcs on\n# \t(rcs.id = rp.state_id)\n# left join res_country rc on\n# \t(rc.id = rp.country_id);\n');
            self.$formFields.hide();
            self.$formQuery.show();
            self.$btnTestQuery.hide();
            self.$btnExecuteQuery.hide();
            self.selectedTable = null;
        },
        _onClickSearchTable: function(ev) {
            var self = this;
            if (self.selectedSource) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Source'),
                    target: 'new',
                    res_id: self.selectedSource,
                    res_model: 'izi.data.source',
                    views: [[false, 'form']],
                    context: {'active_test':false},
                });
            }
        },
        _onClickCancelTable: function(ev){
            var self = this;
            self.$btnTableNew.show();
            self.$btnTableSearch.show();
            self.$btnTableSave.hide();
            self.$btnTableCancel.hide();
            self.$tableName.hide();
            const id = self.$selectTable.elm.attr('id');
            $(`#s2id_${id}`).show();
            self.$selectTable.elm.removeAttr('value');
            self.$selectTable.elm.select2('destroy');
            self.$selectTable.init();
            self.$formQuery.hide();
            self.$btnTestQuery.show();
            self.$btnExecuteQuery.show();
        },
        _onClickSaveTable: function(ev) {
            ev.stopPropagation();
            var self = this;
            var tableName = self.$tableName.val();
            if (!self.selectedSource) {
                new swal('Failed', 'Please select the data source for this table!', 'error');
                return false;
            }
            if (!tableName) {
                new swal('Failed', 'Please input the new table name!', 'error');
                return false;
            }
            if (tableName && self.selectedSource) {
                var data = {
                    'name': tableName,
                    'source_id': self.selectedSource,
                    'db_query': self.$editor.getValue(),
                }
                self._rpc({
                    model: 'izi.table',
                    method: 'create',
                    args: [data],
                }).then(function (result) {
                    if (result) {
                        // console.log('Create Table',  result);
                        self.selectedTable = result;
                        self._loadFields();
                        self._loadQuery();
                        self.$selectTable.elm.select2('data', { 'id': result, 'name': tableName });
                        new swal('Success', `Table has been saved successfully. You can click anywhere to close the wizard.`, 'success');
                        self.$tableName.show();
                        self.$btnTableEdit.show();
                        self.$btnTableNew.show();
                        self.$btnTableSave.hide();
                        self.$btnTableCancel.hide();
                        self.$btnTableSearch.show();
                        self.$formFields.show();
                        self.$btnTestQuery.show();
                        self.$btnExecuteQuery.show();
                    }
                });
            }
        },
        _writeAnalysis: function (id, data) {
            var self = this;
            self._rpc({
                model: 'izi.analysis',
                method: 'write',
                args: [id, data],
                context: {'by_user': true},
            }).then(function (result) {
                new swal('Success', `Analysis has been saved successfully. You can click anywhere to close the wizard.`, 'success');
                self._loadAnalysisItems(id);
            });
        },
        _createAnalysis: function (data) {
            var self = this;
            self._rpc({
                model: 'izi.analysis',
                method: 'create',
                args: [data],
                context: {'by_user': true},
            }).then(function (result) {
                self.selectedAnalysis = result;
                new swal('Success', `Analysis has been saved successfully. You can click anywhere to close the wizard.`, 'success');
                self._loadAnalysisItems(result);
            });
        },
        _onSelectDataSource: function () {
            var self = this;
            self.$sourceContainer.slideToggle("slow");
        },
        _onSelectTable: function () {
            var self = this;
            self.$tableContainer.slideToggle("slow");
        },
        _openSlide: function ($elm) {
            var self = this;
            if ($elm.is(":hidden")) {
                $elm.slideToggle("slow");
            }
        },
        _closeSlide: function ($elm) {
            var self = this;
            if ($elm.is(":visible")) {
                $elm.slideToggle("slow");
            }
        },
        _checkSelectedTable: function () {
            var self = this;
            if (self.selectedTable) {
                self._rpc({
                    model: 'izi.table',
                    method: 'read',
                    args: [self.selectedTable, ['table_name']],
                }).then(function (results) {
                    results.forEach(res => {
                        if (!res.table_name) {
                            self._loadQuery();
                            self.$formQuery.show();
                            self.$btnTableEdit.show();
                            self.$btnTestQuery.show();
                            self.$btnExecuteQuery.show();
                        } else {
                            self.$formQuery.hide();
                            self.$btnTableEdit.hide();
                            self.$btnTestQuery.show();
                            self.$btnExecuteQuery.show();
                        }
                    })
                });
            }
        },
        _onClickEditTable: function (ev) {
            var self = this;
            if (self.selectedTable) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Table'),
                    target: 'new',
                    res_id: self.selectedTable,
                    res_model: 'izi.table',
                    views: [[false, 'form']],
                    context: { 'active_test': false },
                });
            }
        },
    });

    return IZIAddAnalysis;
});