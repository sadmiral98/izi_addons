odoo.define('izi_dashboard.IZIDashboardController', function (require) {
    "use strict";

    var AbstractController = require('web.AbstractController');
    return AbstractController.extend({
        init: function (parent, model, renderer, params) {
            params.viewType = "izidashboard";
            this._super.apply(this, arguments);
        }
    });

});