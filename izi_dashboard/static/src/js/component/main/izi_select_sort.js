odoo.define('izi_dashboard.IZISelectSort', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var QWeb = core.qweb;
    
    var IZISelectSort = Widget.extend({
        template: 'IZISelectSort',
        events: {
            'click .izi_select_sort_item': '_onSelectSort',
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
                    // console.log('Get Sorts', result)
                    self.fields = result.fields_for_sorts;
                    self.fields.forEach(field => {
                        var $content = $(QWeb.render('IZISelectSortItem', {
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
        _onSelectSort: function(ev) {
            var self = this;
            var field_id = $(ev.currentTarget).data('id');
            if (self.parent.selectedAnalysis) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_add_sort_by_field',
                    args: [self.parent.selectedAnalysis, field_id],
                }).then(function (result) {
                    self.parent._loadAnalysisInfo();
                    self.parent._onClickAddSort();
                    self.parent._renderVisual();
                })
            }
        },
    });

    return IZISelectSort;
});