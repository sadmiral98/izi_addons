odoo.define('izi_dashboard.IZISelectFilter', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var QWeb = core.qweb;

    var IZISelectFilter = Widget.extend({
        template: 'IZISelectFilter',
        events: {
            'click .izi_select_filter_item': '_onSelectFilter',
        },

        /**
         * @override
         */
        init: function (parent) {
            this._super.apply(this, arguments);

            this.parent = parent;
            this.fields = [];
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
            // Add Content
            if (self.parent.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_get_analysis_info',
                    args: [self.parent.selectedAnalysis],
                }).then(function (result) {
                    // console.log('Get Filters', result)
                    self.fields = result.fields_for_filters;
                    self.fields.forEach(field => {
                        var $content = $(QWeb.render('IZISelectFilterItem', {
                            name: field.name,
                            id: field.id,
                            field_type: field.field_type,
                            field_icon: IZIFieldIcon.getIcon(field.field_type),
                            filter_operators: result.filter_operators,
                        }));
                        self.$el.append($content)
                    });
                })
            }
        },

        /**
         * Private Method
         */
        _onSelectFilter: function (ev) {
            var self = this;
            var field_id = $(ev.currentTarget).data('id');
            var logical_operator = $('#select_form_filter_' + field_id).find('#select_condition_' + field_id).val();
            var operator_id = $('#select_form_filter_' + field_id).find('#select_operator_' + field_id).val();
            var value = $('#select_form_filter_' + field_id).find('#select_value_' + field_id).val();
            if (self.parent.selectedAnalysis) {
                var data = {
                    'field_id': field_id,
                    'operator_id': operator_id,
                    'condition': logical_operator,
                    'value': value,
                }
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_add_filter_by_field',
                    args: [self.parent.selectedAnalysis, data],
                }).then(function (result) {
                    self.parent._loadAnalysisInfo();
                    self.parent._onClickAddFilter();
                    self.parent._renderVisual();
                })
            }
        },
    });

    return IZISelectFilter;
});