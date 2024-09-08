odoo.define('izi_dashboard.IZIAnalysisView', function (require) {
    "use strict";
    
    var core = require('web.core');
    var AbstractView = require('web.AbstractView');
    var view_registry = require('web.view_registry');
    var _lt = core._lt;
    var IZIAnalysisModel = require('izi_dashboard.IZIAnalysisModel');
    var IZIAnalysisController = require('izi_dashboard.IZIAnalysisController');
    var IZIAnalysisRenderer = require('izi_dashboard.IZIAnalysisRenderer');
    var IZIAnalysisView = AbstractView.extend({
        template: "IZIAnalysis",
        display_name: _lt('IZIAnalysis'),
        events: {
        },
        icon: 'fa-tachometer',
        config: _.extend({},AbstractView.prototype.config, {
            Model: IZIAnalysisModel,
            Controller: IZIAnalysisController,
            Renderer: IZIAnalysisRenderer,
        }),
        viewType: 'izianalysis',
        withControlPanel: false,
        withSearchPanel: false,
    
        init: function () {
            this._super.apply(this, arguments);
        },
    });
    
    view_registry.add('izianalysis', IZIAnalysisView);
    
    return IZIAnalysisView;
});