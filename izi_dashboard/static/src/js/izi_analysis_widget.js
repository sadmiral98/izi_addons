odoo.define('izi_dashboard.IZIAnalysisWidget', function (require) {
    "use strict";

    var core = require('web.core');
    var BasicFields= require('web.basic_fields');
    var AbstractField = require('web.AbstractField');
    var FormController = require('web.FormController');
    var Registry = require('web.field_registry');
    var utils = require('web.utils');
    var session = require('web.session');
    var field_utils = require('web.field_utils');
    var IZIViewVisual = require('izi_dashboard.IZIViewVisual');

    var _t = core._t;
    var QWeb = core.qweb;

    var FieldIZIAnalysis = AbstractField.extend( {
        template: 'FieldIZIAnalysis',
        events: _.extend({}, AbstractField.prototype.events, {
        }),
        init: function (parent, name, record) {
            this._super.apply(this, arguments);
        },

        _renderEdit: function () {
            var self = this;
            self._super();
            self.$el.empty();
            if (self.$el && self.$el.is(':visible')) {
                self.$visual = new IZIViewVisual(self, {
                    analysis_data: JSON.parse(self.value),
                });
                self.$visual.appendTo(self.$el);
            } else {
                setTimeout(function () {
                    self.$visual = new IZIViewVisual(self, {
                        analysis_data: JSON.parse(self.value),
                    });
                    self.$visual.appendTo(self.$el);
                }, 1000);
            }
        },

        _renderReadonly: function () {
            var self = this;
            this._super();
            self.$el.empty();
            if (self.$el && self.$el.is(':visible')) {
                self.$visual = new IZIViewVisual(self, {
                    analysis_data: JSON.parse(self.value),
                });
                self.$visual.appendTo(self.$el);
            } else {
                setTimeout(function () {
                    self.$visual = new IZIViewVisual(self, {
                        analysis_data: JSON.parse(self.value),
                    });
                    self.$visual.appendTo(self.$el);
                }, 1000);
            }   
        },
    });

    // FormController.include( {
    //     saveRecord: function () {
    //         this.$('.save_sign').click();
    //         return this._super.apply(this, arguments);
    //     },
    // });

    Registry.add('izi_analysis', FieldIZIAnalysis);


});
