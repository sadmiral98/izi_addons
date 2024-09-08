odoo.define('izi_dashboard.IZISelectFilterTemp', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var core = require('web.core');
    var QWeb = core.qweb;
    var _t = core._t;
    var datepicker = require('web.datepicker');
    
    var IZITags = require('izi_dashboard.IZITags');
    var IZISelectFilterTemp = Widget.extend({
        template: 'IZISelectFilterTemp',
        events: {
            'click .izi_select_field_filter_temp': '_onClickSelectFieldFilterTemp',
            'click .izi_select_date_format': '_onClickSelectDateFormat',
            'click #izi_export_capture1': '_onClickCaptureAnalysis',
        },

        /**
         * @override
         */
        init: function (parent, $visual, args) {
            this._super.apply(this, arguments);
            
            this.parent = parent;
            this.$visual = $visual;
            this.analysis_id;
            if (args) {
                this.block_id = args.block_id;
                this.analysis_id = args.analysis_id;
            }
            this.filter_types = ['string_search', 'date_range', 'date_format'];
            this.$filter = {};
            this.filters;
            this.fields;
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
            self.$btnExportCapture = self.$('#izi_export_capture1');
            self.$btnExportLoading = self.$('#izi_export_capture_loading1');

            // Filters
            self.filter_types.forEach(type => {
                self.$filter[type] = {};
                self.$filter[type].elm = self.$(`#izi_analysis_filter_temp_${type}`);
                self.$filter[type].field_id = false;
                self.$filter[type].field_name = false;
                self.$filter[type].values = [];
                self._initFilter(type);
            });
        },

        /**
         * Private Method
         */
        _initFilter: function(type) {
            var self = this;

            // String Search
            if (type == 'string_search') {
                self.$filter[type].elm.find('.izi_analysis_filter_temp_content').empty();
                self.$filter[type].elm.find('.izi_analysis_filter_temp_content').append('<input class="izi_select2"/>');
                self.$filter[type].values = [];
                new IZITags(self, {
                    'elm': self.$filter[type].elm.find('.izi_select2'),
                    'multiple': true,
                    'placeholder': 'Values',
                    'onChange': function(text, values) {
                        self.$filter[type].values = values;
                        self._checkFilterValues();
                    },
                });
            }
            
            // DateRange
            if (type == 'date_range') {
                self.$filter[type].elm.find('.izi_analysis_filter_temp_content').empty();
                self.$filter[type].values = [null, null];
                var $dateFrom = new datepicker.DateWidget(self);
                $dateFrom.appendTo(self.$filter[type].elm.find('.izi_analysis_filter_temp_content')).then((function () {
                    // $dateFrom.setValue(moment(this.value));
                    $dateFrom.$el.find('input').addClass('izi_input').attr('placeholder', 'Date From');
                    $dateFrom.on('datetime_changed', self, function () {
                        self.$filter[type].values[0] = $dateFrom.getValue() ? moment($dateFrom.getValue()).format('YYYY-MM-DD') : null;
                        self._checkFilterValues();
                    });
                }));
                var $dateTo = new datepicker.DateWidget(self);
                $dateTo.appendTo(self.$filter[type].elm.find('.izi_analysis_filter_temp_content')).then((function () {
                    // $dateTo.setValue(moment(this.value));
                    $dateTo.$el.find('input').addClass('izi_input').attr('placeholder', 'Date To');
                    $dateTo.on('datetime_changed', self, function () {
                        self.$filter[type].values[1] = $dateTo.getValue() ? moment($dateTo.getValue()).format('YYYY-MM-DD') : null;
                        self._checkFilterValues();
                    });
                }));
            }

            //Date Format
            if (type == 'date_format') {
                self.$filter[type].elm.find('.izi_analysis_filter_temp_content').empty();
                self.$filter[type].values = [];
                self.$filter[type].elm.find('.izi_analysis_filter_temp_content').append(`
                    <div class="izi_dropdown izi_block_left izi_inline dropdown">
                        <button class="izi_m0 izi_py0 izi_pl0 izi_no_border dropdown-toggle" data-toggle="dropdown" type="button">
                            Select Date
                        </button>
                        <div class="dropdown-menu">
                            <a class="dropdown-item izi_select_date_format" data-date_format="today">Today</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="this_week">This Week</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="this_month">This Month</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="this_year">This Year</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="mtd">Month to Date</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="ytd">Year to Date</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_week">Last Week</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_month">Last Month</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_two_months">Last 2 Months</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_three_months">Last 3 Months</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_year">Last Year</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_30">Last 10 Days</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_30">Last 30 Days</a>
                            <a class="dropdown-item izi_select_date_format" data-date_format="last_30">Last 60 Days</a>
                        </div>
                    </div>
                `);
            }
        },
        _loadFilters: function(callback) {
            var self = this;
            if (self.analysis_id) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_get_filter_info',
                    args: [self.analysis_id],
                }).then(function (result) {
                    if (result) {
                        self.filters = result.filters;
                        self.fields = result.fields;
                        // Add Filters
                        var unfiltered_types = self.filter_types;
                        self.filters.forEach(filter => {
                            self.$filter[filter.type].elm.addClass('active').attr('title', filter.name);
                            self.$filter[filter.type].field_id = filter.id;
                            self.$filter[filter.type].field_name = filter.field_name;
                            unfiltered_types = unfiltered_types.filter(function(e) { return e !== filter.type })
                        });
                        unfiltered_types.forEach(type => {
                            self.$filter[type].field_id = false;
                            self.$filter[type].field_name = false;
                            self.$filter[type].values = [];
                            self.$filter[type].elm.removeClass('active').attr('title', 'Select Filter');
                            self._initFilter(type);
                        });

                        // Add Fields
                        self.filter_types.forEach(type => {
                            self.$filter[type].elm.find('.izi_analysis_filter_temp_title .dropdown-menu').empty();
                            self.$filter[type].elm.find('.izi_analysis_filter_temp_title .dropdown-menu').append(`<a class="dropdown-item izi_select_field_filter_temp izi_col_transparent" data-type="${type}" data-id="-1">None</a>`);
                            self.fields[type].forEach(field => {
                                var activeClass = self.$filter[type].field_id == field.id ? 'active' : ''
                                var $elm = `
                                    <a class="dropdown-item izi_select_field_filter_temp ${activeClass}" data-type="${type}" data-id="${field.id}">${field.name}</a>
                                `;
                                self.$filter[type].elm.find('.izi_analysis_filter_temp_title .dropdown-menu').append($elm);
                            });
                            
                        });

                        // Callback
                        if(callback) callback(result);
                    }
                });
            }
        },
        _onClickSelectFieldFilterTemp: function(ev) {
            var self = this;
            var type = $(ev.currentTarget).data('type');
            var field_id = $(ev.currentTarget).data('id');
            var name = $(ev.currentTarget).text();
            if (self.analysis_id && field_id && type) {
                self._rpc({
                    model: 'izi.analysis',
                    method: 'ui_add_filter_temp_by_field',
                    args: [self.analysis_id, field_id, type],
                }).then(function (result) {
                    self._loadFilters(function(result) {
                        self._checkFilterValues();
                    });
                    self._initFilter(type);
                })
            }
        },
        _onClickSelectDateFormat: function(ev) {
            var self = this;
            self.$filter['date_format'].values[0] = $(ev.currentTarget).data('date_format');
            var text = $(ev.currentTarget).text();
            self.$filter['date_format'].elm.find('.izi_analysis_filter_temp_content .dropdown-toggle').text(text);
            self._checkFilterValues();
        },
        _onClickCaptureAnalysis: function (ev) {
            var self = this;
            self.$btnExportCapture.hide();
            self.$btnExportLoading.show();

            ev.stopPropagation();
                var btn = $(self).button('loading');
                html2canvas(document.querySelector('.izi_view_analysis'), {useCORS: true, allowTaint: false}).then(function(canvas){
                    window.jsPDF = window.jspdf.jsPDF;
                    var doc = new jsPDF("p", "mm", "a4");
                    var img = canvas.toDataURL("image/jpeg", 0.90);
                    var imgProps= doc.getImageProperties(img);
                    var pageHeight = 295;
                    var width = doc.internal.pageSize.getWidth();
                    var height = (imgProps.height * width) / imgProps.width;
                    var heightLeft = height;
                    var position = 0;
                    
                    doc.addImage(img,'JPEG', 0, 0, width, height, 'FAST');
                    heightLeft -= pageHeight;
                    while (heightLeft >= 0) {
                        position = heightLeft - height;
                        doc.addPage();
                        doc.addImage(img, 'JPEG', 0, position,  width, height, 'FAST');
                        heightLeft -= pageHeight;
                    };
                    doc.save($('.izi_title').text() + '.pdf');
                    new swal('Success', `Analysis has been Captured.`, 'success');
                    btn.button('reset');

                    self.$btnExportCapture.show();
                    self.$btnExportLoading.hide();
                });
        },

        _checkFilterValues: function() {
            var self = this;
            var filter_temp_values = [];
            self.filter_types.forEach(type => {
                // console.log(self.$filter[type]);
                if (self.$filter[type].field_name && self.$filter[type].values && self.$filter[type].values.length) {
                    filter_temp_values.push([self.$filter[type].field_name, type, self.$filter[type].values]);
                } 
            });
            if (self.$visual && filter_temp_values) {
                var args = {
                    'filter_temp_values': filter_temp_values,
                }
                self.$visual._renderVisual(args);
            }
        },
    });

    return IZISelectFilterTemp;
});