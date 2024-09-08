odoo.define('izi_dashboard.IZIAnalysisModel', function (require) {
    "use strict";

    var AbstractModel = require('web.AbstractModel');
    return AbstractModel.extend({
        init: function () {
            this._super.apply(this, arguments);
        },
    });

});