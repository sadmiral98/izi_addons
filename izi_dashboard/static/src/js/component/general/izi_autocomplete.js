odoo.define('izi_dashboard.IZIAutocomplete', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var view_dialogs = require('web.view_dialogs');
    var QWeb = core.qweb;
    var _t = core._t;
    
    class IZIAutocomplete {
        constructor(parent, args) {
            var self = this;
            self.parent = parent;
            self.elm = args.elm;
            self.multiple = args.multiple;
            self.placeholder = args.placeholder;
            self.params = args.params;
            self.initData = args.initData || (args.multiple ? null : {});
            if (args.formatFunc) {
                self.formatFunc = args.formatFunc;
            } else {
                self.formatFunc = function format(item) { 
                    return item[self.params.textField || 'name']; 
                }
            }
            self.onChange = args.onChange;
            self.selectedId;
            self.selectedText = '';
            if (args.minimumInput)
                self.minimumInputLength = 1;
            else
                self.minimumInputLength = 0;
            self.data = args.data;
            self.api = args.api;
            self.tags = args.tags || false;
            self.createSearchChoice = args.createSearchChoice || false;
            if (self.data) {
                self.initWithData();
            } else if (self.api) {
                self.initWithAPI();
            } else {
                self.initWithORM();
            }
            self.initOnChange();
        }
        set(key, value) {
            var self = this;
            self[key] = value;
        }
        setDomain(domain) {
            var self = this;
            self.params.domain = domain;
            self.initWithORM();
        }
        destroy() {
            var self = this;
            self.elm.select2('destroy');
        }
        initWithData(){
            var self = this;
            var typingTimer;
            var loadingRPC = false;
            var data = self.data;
            if (!self.multiple) {
                var clearOption = {
                    'id': null,
                    'value': null,
                    'name': 'All',
                }
                data = [clearOption].concat(data);
            }
            self.elm.select2({
                multiple: self.multiple,
                allowClear: true, 
                tokenSeparators: [','], 
                minimumResultsForSearch: 10, 
                placeholder: self.placeholder,
                minimumInputLength: self.minimumInputLength,
                data: { results: data, text: self.params.textField || 'name' },
                formatSelection: self.formatFunc,
                formatResult: self.formatFunc,
                initSelection : function (element, callback) {
                    callback(self.initData);
                }
            })
        }
        initWithORM(){
            var self = this;
            var typingTimer;
            var loadingRPC = false;
            self.elm.select2({
                multiple: self.multiple,
                allowClear: true, 
                tokenSeparators: [','], 
                minimumResultsForSearch: 10, 
                placeholder: self.placeholder,
                minimumInputLength: self.minimumInputLength,
                query: function (query) {
                    var data = {results: []};
                    var domain = [[self.params.textField, 'ilike', query.term]];
                    if (Array.isArray(self.params.domain)  && self.params.domain.length)
                        Array.prototype.push.apply(domain, self.params.domain)
                    clearTimeout(typingTimer);
                    if (query && !loadingRPC && self.params) {
                        typingTimer = setTimeout(function() {
                            //do something
                            loadingRPC = true;
                            ajax.jsonRpc('/web/dataset/call_kw', 'call', {
                                model: 'izi.dashboard.filter',
                                method: 'fetch_values',
                                args: [self.params, query.term],
                                kwargs: {
                                },
                            }).then(function (results) {
                                // console.log('Query', query.term);
                                // console.log('RPC', results);
                                var data = [];
                                var values = [];
                                results.forEach(function (result) {
                                    var dt = {
                                        'name': result[self.params.textField || 'name'],
                                        'value': self.params.modelFieldValues == 'field' ? result[self.params.textField] : result['id'],
                                        'id': self.params.modelFieldValues == 'field' ? result[self.params.textField] : result['id'],
                                    }
                                    if (self.params.textField) {
                                        dt[self.params.textField] = result[self.params.textField];
                                    }
                                    if (!values.includes(dt.value) && dt.value) {
                                        values.push(dt.value);
                                        data.push(dt);
                                    }
                                });
                                if (!self.multiple) {
                                    var clearOption = {
                                        'id': null,
                                        'value': null,
                                        'name': 'All',
                                    }
                                    if (self.params.textField) {
                                        clearOption[self.params.textField] = 'All';
                                    }
                                    data = [clearOption].concat(data);
                                }
                                query.callback({results: data});
                                loadingRPC = false;
                            });
                        }, 500);
                    }
                    
                },
                formatSelection: self.formatFunc,
                formatResult: self.formatFunc,
                initSelection : function (element, callback) {
                    callback(self.initData);
                }
            })
        }
        initWithAPI(){
            var self = this;
            var typingTimer;
            var loadingAPI = false;
            var option = {
                tags: self.tags,
                multiple: self.multiple,
                allowClear: true, 
                tokenSeparators: [','], 
                minimumResultsForSearch: 10, 
                placeholder: self.placeholder,
                minimumInputLength: self.minimumInputLength,
                query: function (query) {
                    clearTimeout(typingTimer);
                    if (query && !loadingAPI && self.api) {
                        var body = self.api.body;
                        if (query.term && body)
                            body.query = query.term;
                        typingTimer = setTimeout(function() {
                            loadingAPI = true;
                            $.ajax({
                                method: self.api.method,
                                url: self.api.url,
                                crossDomain: true,
                                contentType: 'application/json',
                                data: JSON.stringify(body),
                            }).done(function(response) {
                                if (response.result) {
                                    console.log('Response', response.result);
                                    // var data = results;
                                    if (query && response.result) {
                                        query.callback({results: response.result});
                                    }
                                    loadingAPI = false;
                                }
                            });
                        }, 500);
                    }
                    
                },
                formatSelection: function format(item) { 
                    return item[self.params.textField || 'name']; 
                },
                formatResult: self.formatFunc,
                initSelection : function (element, callback) {
                    callback(self.initData);
                }
            };
            if (self.createSearchChoice) {
                option.createSearchChoice = self.createSearchChoice;
            }
            self.elm.select2(option);
        }
        initOnChange() {
            var self = this;
            self.elm.select2('val', []).on("change", function (e) {
                if (e.added) {
                    self.selectedText = e.added[self.params.textField];
                }
                // If e.val Is Array
                if (Array.isArray(e.val)) {
                    // Check If All Elements of e.val Can Be Parsed To Integer
                    var data = e.val;
                    var isInt = data.every(function (item) {
                        return !isNaN(item);
                    });
                    if (isInt) {
                        self.selectedId = data.map(function (item) {
                            return parseInt(item);
                        });
                    } else {
                        self.selectedId = data;
                    }
                } else {
                    // If e.val Is Not Array
                    if (e.val) {
                        // Check If e.val Can Be Parsed To Integer
                        if (!isNaN(e.val)) {
                            self.selectedId = parseInt(e.val);
                        } else {
                            self.selectedId = e.val;
                        }
                    } else {
                        self.selectedId = null;
                    }
                }
                if (!self.selectedId) {
                    self.selectedText = '';
                }
                self.onChange(self.selectedId, self.selectedText);
            })
        }
    }
    return IZIAutocomplete;
})
