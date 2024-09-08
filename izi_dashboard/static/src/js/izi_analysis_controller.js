odoo.define('izi_dashboard.IZIAnalysisController', function (require) {
    "use strict";

    var AbstractController = require('web.AbstractController');
    return AbstractController.extend({
        init: function (parent, model, renderer, params) {
            params.viewType = "izianalysis";
            this._super.apply(this, arguments);
        }
    });

});