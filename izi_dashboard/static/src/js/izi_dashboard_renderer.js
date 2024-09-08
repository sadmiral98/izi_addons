odoo.define('izi_dashboard.IZIDashboardRenderer', function (require) {
    "use strict";
    
    var AbstractRenderer = require('web.AbstractRenderer');
    var IZIViewDashboard = require('izi_dashboard.IZIViewDashboard');
    var IZIConfigDashboard = require('izi_dashboard.IZIConfigDashboard');
    return AbstractRenderer.extend({
        template: "IZIDashboard",
        events: _.extend({}, AbstractRenderer.prototype.events, {
        }),
        init: function (parent, state, params) {
            var self = this;
            this._super.apply(this, arguments);
            // console.log("Init App Renderer", this, parent, state, params);
            self.parent = parent;
            if (parent.actions) self.actions = parent.actions;
            // Define Global Variables
        },
        start: function () {
            var self = this;
            // console.log("Start App Renderer");

            // Dashboard Component
            var $viewDashboard = new IZIViewDashboard(self);
            var $configDashboard = new IZIConfigDashboard(self, $viewDashboard);
            $configDashboard.appendTo(self.$el);
            $viewDashboard.appendTo(self.$el);
        },
        destroy: function() {
            // console.log("Destroy App Renderer");
            this._super.apply(this, arguments);
        },
    });

});
