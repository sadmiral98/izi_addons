odoo.define('izi_dashboard.IZIAnalysisRenderer', function (require) {
    "use strict";
    
    var AbstractRenderer = require('web.AbstractRenderer');
    var IZIViewAnalysis = require('izi_dashboard.IZIViewAnalysis');
    var IZIConfigAnalysis = require('izi_dashboard.IZIConfigAnalysis');
    return AbstractRenderer.extend({
        template: "IZIAnalysis",
        events: _.extend({}, AbstractRenderer.prototype.events, {
        }),
        init: function (parent, state, params) {
            var self = this;
            this._super.apply(this, arguments);
            // console.log("Init App Renderer", this, parent, state, params);
            self.parent = parent;
            if (parent.actions) self.actions = parent.actions;
        },
        start: function () {
            var self = this;
            // console.log("Start App Renderer");

            // Dashboard Component
            var $viewAnalysis = new IZIViewAnalysis(self);
            self.$viewAnalysis = $viewAnalysis;
            // Analysis Component
            var $configAnalysis = new IZIConfigAnalysis(self, $viewAnalysis);
            self.$configAnalysis = $configAnalysis;

            // Append
            $configAnalysis.appendTo(self.$el);
            $viewAnalysis.appendTo(self.$el);
        },
        destroy: function() {
            // console.log("Destroy App Renderer");
            this._super.apply(this, arguments);
        },
    });

});
