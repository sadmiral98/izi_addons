odoo.define('izi_dashboard.IZIViewDashboardBlock', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var _t = core._t;

    var IZIViewVisual = require('izi_dashboard.IZIViewVisual');
    var IZISelectFilterTemp = require('izi_dashboard.IZISelectFilterTemp');
    var IZIViewDashboardBlock = Widget.extend({
        template: 'IZIViewDashboardBlock',
        events: {
            'click input': '_onClickInput',
            'click .izi_dashboard_block_content': '_onClickContent',
            'click .izi_action_open_analysis': '_openAnalysis',
            'click .izi_action_quick_open_analysis': '_quickOpenAnalysis',
            'click .izi_action_edit_analysis': '_editAnalysis',
            'click .izi_action_open_list_view': '_openListView',
            'click .izi_action_delete_block': '_onClickDeleteBlock',
            'click .izi_action_duplicate_block': '_onClickDuplicateBlock',
            'click .izi_action_export_excel': '_onClickExportExcel',
        },

        /**
         * @override
         */
        init: function (parent, args) {
            this._super.apply(this, arguments);

            this.parent = parent;
            this.id = args.id;
            this.analysis_name = args.analysis_name;
            this.analysis_id = args.analysis_id;
            this.animation = args.animation;
            this.refresh_interval = args.refresh_interval;
            this.filters = args.filters;
            this.index = args.index;
            this.mode = args.mode;
            this.rtl = args.rtl;
            this.args = {}
            this.$visual;
            this.$title;
            this.$filter;
            this.$description;
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
            self.args = {
                'block_id': self.id,
                'analysis_id': self.analysis_id,
                'filters': self.filters,
                'refresh_interval': self.refresh_interval,
                'index': self.index,
                'mode': self.mode,
                'rtl': self.rtl,
            }
            
            if (self.animation) {
                am4core.useTheme(am4themes_animated);
            } else {
                am4core.unuseTheme(am4themes_animated);
            }

            self.$title = self.$el.find('.izi_dashboard_block_header .izi_dashboard_block_title');
            self.$description = $(`<div class="izi_dashboard_block_description"></div>`);
            if (self.mode == 'ai_analysis') {
                self.$el.find('.izi_dashboard_block_content').addClass('izi_mode_analysis');
                self.$description.appendTo(self.$el.find('.izi_dashboard_block_content'));
            }
            self.$visual = new IZIViewVisual(self, self.args);
            self.$visual.appendTo(self.$el.find('.izi_dashboard_block_content'));
            
            // Add Component Filters
            self.$filter = new IZISelectFilterTemp(self, self.$visual);
            self.$filter.appendTo(self.$el.find('.izi_dashboard_block_header'));
            if (self.analysis_id) {
                self.$filter.analysis_id = self.analysis_id;
                self.$filter._loadFilters();
            }
        },

        clearInterval: function() {
            var self = this;
            if (self.$visual && self.$visual.interval) {
                clearInterval(self.$visual.interval);
            }
        },

        destroy: function() {
            var self = this;
            self.$el.remove();
        },

        _getViewVisualByAnalysisId: function(analysis_id) {
            var self = this;
            if (self.parent)
                return self.parent._getViewVisualByAnalysisId(analysis_id);
            return false;
        },

        /**
         * Private Method
         */
        _onClickInput: function (ev) {
            var self = this;
        },

        _onClickExportExcel: function(ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            if (id) {
                var base_url = window.location.origin;
                if (self.$visual) {
                    var filters = JSON.stringify(self.$visual._getFilters());
                    var url = `${base_url}/izi/excel/${id.toString()}?filters=${filters}`;
                    window.open(url, '_blank');
                }
            }
        },

        _onClickDuplicateBlock: function (ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            if (id) {
                new swal({
                    title: "Duplicate Analysis",
                    text: `
                        Do you confirm to duplicate the analysis ?
                    `,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    heightAuto : false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        self._rpc({
                            model: 'izi.dashboard.block',
                            method: 'copy',
                            args: [[id]],
                            kwargs: {},
                        }).then(function (res) {
                            self.parent._loadDashboard();
                        })
                    }
                });
            }
        },

        _onClickDeleteBlock: function (ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            if (id) {
                new swal({
                    title: "Remove Analysis",
                    text: `
                        Do you confirm to remove the analysis ?
                    `,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    heightAuto : false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        self._rpc({
                            model: 'izi.dashboard.block',
                            method: 'unlink',
                            args: [[id]],
                        }).then(function (res) {
                            self.parent._removeItem(id);
                            new swal('Success', `The analysis has been removed \n from this dashboard successfully`, 'success');
                        })
                    }
                });
            }
        },

        _openAnalysis: function () {
            var self = this;
            if (self.analysis_id) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Analysis'),
                    target: 'current',
                    res_id: self.analysis_id,
                    res_model: 'izi.analysis',
                    views: [[false, 'izianalysis']],
                    context: {'analysis_id': self.analysis_id},
                });
            }
        },

        _quickOpenAnalysis: function () {
            var self = this;
            if (self.analysis_id) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Analysis'),
                    target: 'new',
                    res_id: self.analysis_id,
                    res_model: 'izi.analysis',
                    views: [[false, 'izianalysis']],
                    context: {'analysis_id': self.analysis_id},
                },{
                    on_close: function(){
                        self.$visual._renderVisual(self.args)
                    }
                });
            }
        },

        _editAnalysis: function () {
            var self = this;
            if (self.analysis_id) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Analysis'),
                    target: 'new',
                    res_id: self.analysis_id,
                    res_model: 'izi.analysis',
                    views: [[false, 'form']],
                    context: { 'active_test': false },
                }, {
                    on_close: function () {
                        self.$visual._renderVisual(self.args)
                    },
                });
            }
        },

        _onClickContent: function (ev) {
            var self = this;
            // Find if the content has scorecard inside
            if ($(ev.currentTarget).find('.scorecard').length > 0) {
                self._openListView();
            }
        },

        _openListView: function() {
            var self = this;
            if (self.analysis_id) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_get_view_parameters',
                    args: [[self.analysis_id], self.args],
                }).then(function (res) {
                    if (res) {
                        var data = res;
                        if (data.model) {
                            self.do_action({
                                type: 'ir.actions.act_window',
                                name: data.name,
                                res_model: data.model,
                                views: [[false, "list"], [false, "form"]],
                                view_type: 'list',
                                view_mode: 'list',
                                target: 'current',
                                context: {},
                                domain: data.domain,
                            });
                        } else {
                            new swal('Failed', 'Analysis must have model and domain first to open the list view!', 'error');
                        }
                    }
                })
            }
        }

    });

    return IZIViewDashboardBlock;
});