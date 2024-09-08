odoo.define('izi_dashboard.IZIDashboardView', function (require) {
    "use strict";
    
    var core = require('web.core');
    var AbstractView = require('web.AbstractView');
    var view_registry = require('web.view_registry');
    var _lt = core._lt;
    var IZIDashboardModel = require('izi_dashboard.IZIDashboardModel');
    var IZIDashboardController = require('izi_dashboard.IZIDashboardController');
    var IZIDashboardRenderer = require('izi_dashboard.IZIDashboardRenderer');
    var IZIDashboardView = AbstractView.extend({
        template: "IZIDashboard",
        display_name: _lt('IZIDashboard'),
        events: {
        },
        icon: 'fa-tachometer',
        config: _.extend({},AbstractView.prototype.config, {
            Model: IZIDashboardModel,
            Controller: IZIDashboardController,
            Renderer: IZIDashboardRenderer,
        }),
        viewType: 'izidashboard',
        withControlPanel: false,
        withSearchPanel: false,
    
        init: function () {
            this._super.apply(this, arguments);
        },
    });
    
    view_registry.add('izidashboard', IZIDashboardView);
    
    return IZIDashboardView;
});