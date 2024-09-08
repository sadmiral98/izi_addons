odoo.define('izi_dashboard.IZISelectDimension', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var QWeb = core.qweb;
    
    var IZISelectDimension = Widget.extend({
        template: 'IZISelectDimension',
        events: {
            'click .izi_select_dimension_item': '_onSelectDimension',
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

        start: function() {
            var self = this;
            this._super.apply(this, arguments);
            // Add Content
            if (self.parent.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_get_analysis_info',
                    args: [self.parent.selectedAnalysis],
                }).then(function (result) {
                    // console.log('Get Dimensions', result)
                    self.fields = result.fields_for_dimensions;
                    self.fields.forEach(field => {
                        var $content = $(QWeb.render('IZISelectDimensionItem', {
                            name: field.name,
                            id: field.id,
                            field_type: field.field_type,
                            field_icon: IZIFieldIcon.getIcon(field.field_type),
                        }));
                        self.$el.append($content)
                    });
                })
            }
        },

        /**
         * Private Method
         */
        _onSelectDimension: function(ev) {
            var self = this;
            var field_id = $(ev.currentTarget).data('id');
            if (self.parent.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_add_dimension_by_field',
                    args: [self.parent.selectedAnalysis, field_id],
                }).then(function (result) {
                    // console.log('Add Dimension', result);
                    self.parent._loadAnalysisInfo();
                    self.parent._onClickAddDimension();
                    self.parent._renderVisual();
                })
            }
        },
    });

    return IZISelectDimension;
});