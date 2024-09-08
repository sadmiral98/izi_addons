odoo.define('izi_dashboard.IZITemplate', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    
    var IZITemplate = Widget.extend({
        template: 'IZITemplate',
        events: {
            'click input': '_onClickInput',
            'click button': '_onClickButton',
        },

        /**
         * @override
         */
        init: function (parent) {
            this._super.apply(this, arguments);
            
            this.parent = parent;
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

        },

        /**
         * Private Method
         */
        _onClickInput: function(ev) {
            var self = this;
        },

        _onClickButton: function(ev) {
            var self = this;
        }
    });

    return IZITemplate;
});