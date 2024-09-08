odoo.define('izi_dashboard.IZISelectDashboard', function (require) {
    "use strict";

    var IZIDialog = require('izi_dashboard.IZIDialog');
    var core = require('web.core');
    var QWeb = core.qweb;
    var session = require('web.session');
    var _t = core._t;

    var IZISelectDashboard = IZIDialog.extend({
        template: 'IZISelectDashboard',
        events: {
            'click .izi_select_dashboard_item': '_onSelectDashboardItem',
            'click .izi_new_dashboard_item': '_onClickNewDashboardWizard',
            'click .izi_edit_dashboard_item': '_onClickEditDashboardWizard',
            'click .izi_dialog_bg': '_onClickBackground',
            'keydown .izi_search_dashboard_name': '_onKeyupDashboardName',
        },

        /**
         * @override
         */
        init: function (parent, $content) {
            this._super.apply(this, arguments);

            this.parent = parent;
            this.$content = $content;
            this.allDashboards = [];
            this.selectedDashboard;
            this.keyword;
            this.typingTimer;
            this.doneTypingInterval = 500;
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

        start: function () {
            var self = this;
            this._super.apply(this, arguments);
            
            self.$dashboardContainer = self.$el.find('.izi_select_dashboard_item_container');
            self._loadDashboardItems();
        },

        /**
         * Private Method
         */
         _loadDashboardItems: function (selectDashboard=false) {
            var self = this;
            var keywordType = self.keyword ? self.keyword : "";
            self.$dashboardContainer.empty();
            self._rpc({
                model: 'izi.dashboard',
                method: 'search_read',
                args: [[], ['id', 'name', 'write_date', 'theme_name', 'date_format', 'start_date', 'end_date']],
            }).then(function (results) {
                self.allDashboards = results;
                // New Dashboard
                var $new = `
                <div class="izi_new_dashboard_item izi_select_item izi_select_item_blue">
                    <div class="izi_title" t-esc="name">New Dashboard</div>
                    <div class="izi_subtitle" t-esc="source_table">
                        Create new dashboard
                    </div>
                    <div class="izi_select_item_icon">
                        <span class="material-icons">add</span>
                    </div>
                </div>
                `;
                self.$dashboardContainer.append($new);

                var filteredDashboard = self.allDashboards.filter(function (el)
                {
                    return el.name.toLowerCase().includes(keywordType.toLowerCase());
                });

                // Render Dashboard Item
                filteredDashboard.forEach(dashboard => {
                    var $content = $(QWeb.render('IZISelectDashboardItem', {
                        name: `${dashboard.name}`,
                        id: dashboard.id,
                        write_date: moment(dashboard.write_date).format('LLL'),
                        theme_name: `${dashboard.theme_name}`,
                    }));
                    self.$dashboardContainer.append($content)
                });
            })
        },
        _onClickBackground: function (ev) {
            var self = this;
            this._super.apply(this, arguments);
        },
        _onKeyupDashboardName: function(ev) {
            var self = this;
            var keyword = $(ev.currentTarget).val();
            if (self.typingTimer)
                clearTimeout(self.typingTimer);
            self.keyword = keyword;
            self.typingTimer = setTimeout(function() {
                self._loadDashboardItems();
            }, self.doneTypingInterval);
        },
        _onSelectDashboardItem: function (ev) {
            var self = this;
            var id = $(ev.currentTarget).data('id');
            var name = $(ev.currentTarget).data('name');
            self.selectedDashboard = id;
            self.allDashboards.forEach(dashboard => {
                if (dashboard.id == id) {
                    self.parent._selectDashboard(id, name, dashboard.write_date, dashboard.theme_name, dashboard.date_format, dashboard.start_date, dashboard.end_date);
                }
            });
            self.destroy();
        },

        _onClickEditDashboardWizard: function(ev) {
            ev.stopPropagation();
            var self = this;
            var $parent = $(ev.currentTarget).closest('.izi_select_dashboard_item');
            var id = $parent.data('id');
            self.selectedDashboard = id;
            if (self.selectedDashboard) {
                self.do_action({
                    type: 'ir.actions.act_window',
                    name: _t('Dashboard'),
                    target: 'new',
                    res_id: self.selectedDashboard,
                    res_model: 'izi.dashboard',
                    views: [[false, 'form']],
                    context: { 'active_test': false },
                },{
                    on_close: function(){
                        self._loadDashboardItems();
                    },
                });
            }
        },
        
        _onClickNewDashboardWizard: function(ev) {
            ev.stopPropagation();
            var self = this;
            self.do_action({
                type: 'ir.actions.act_window',
                name: _t('Dashboard'),
                target: 'new',
                res_id: false,
                res_model: 'izi.dashboard',
                views: [[false, 'form']],
                context: { 'active_test': false },
            },{
                on_close: function(){
                    self._loadDashboardItems();
                },
            });
        },
        _onClickNewDashboard: function(ev) {
            var self = this;
            new swal({
                title: "Confirmation",
                text: `
                    Do you confirm to create a new dashboard? After create a dashboard, \
                    you can add an analysis from analysis menu.
                `,
                icon: "info",
                showCancelButton: true,
                confirmButtonText: 'Yes',
                heightAuto : false,
            }).then((result) => {
                if (result.isConfirmed) {
                    var name = 'Untitled Dashboard';
                    self._rpc({
                        model: 'izi.dashboard',
                        method: 'create',
                        args: [{
                            'name': name,
                        }],
                    }).then(function (result) {
                        if (result) {
                            new swal('Success', `Your dashboard has been created successfully.`, 'success');
                            // self.parent._selectDashboard(result, name, moment.utc().format('YYYY-MM-DD HH:mm:ss z'));
                            self.destroy();
                        } else {
                            new swal('Failed', 'There is an error while creating the dashboard', 'error');
                        }
                    });
                }
            });
        }
    });

    return IZISelectDashboard;
});