odoo.define('izi_dashboard.IZITags', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var ajax = require('web.ajax');
    var core = require('web.core');
    var view_dialogs = require('web.view_dialogs');
    var QWeb = core.qweb;
    var _t = core._t;
    
    class IZITags {
        constructor(parent, args) {
            var self = this;
            self.parent = parent;
            self.elm = args.elm;
            self.multiple = args.multiple;
            self.placeholder = args.placeholder;
            self.initData = args.initData || (args.multiple ? null : {});
            self.onChange = args.onChange;
            self.selectedId;
            self.selectedText = '';
            self.init();
            self.initOnChange();
        }
        set(key, value) {
            var self = this;
            self[key] = value;
        }
        destroy() {
            var self = this;
            self.elm.select2('destroy');
        }
        init(){
            var self = this;
            var typingTimer;
            var loadingRPC = false;
            self.elm.select2({
                multiple: self.multiple,
                allowClear: true, 
                tags: [],
                tokenSeparators: [','], 
                minimumResultsForSearch: 10, 
                placeholder: self.placeholder,
                minimumInputLength: 1,
            })
        }
        initOnChange() {
            var self = this;
            self.elm.select2('val', []).on("change", function (e) {
                // console.log(e.val);
                if (e.added) {
                    self.selectedText = e.added['text'];
                }
                self.onChange(self.selectedText, e.val);
            })
        }
    }
    return IZITags;
})
