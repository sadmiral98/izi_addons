odoo.define('izi_dashboard.IZIViewAnalysis', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    
    var IZIViewVisual = require('izi_dashboard.IZIViewVisual');
    var IZISelectFilterTemp = require('izi_dashboard.IZISelectFilterTemp');
    var IZIViewAnalysis = Widget.extend({
        template: 'IZIViewAnalysis',
        events: {
            'click .izi_view_analysis_explore_container': '_onClickAnalysisExpore',
            'click .izi_submit_analysis_explore': '_onClickSubmitAnalysisExpore',
            'click .izi_view_analysis_explore_bg': '_onClickBgAnalysisExpore',
            'click .izi_update_script': '_onClickUpdateScript',
            'click .izi_close_script': '_onClickCloseScript',
            'click .izi_toggle_float_script': '_onClickToggleFloatScript',
            'click .izi_script_ai': '_onClickContinueScriptAI',
        },

        /**
         * @override
         */
        init: function (parent) {
            var self = this;
            this._super.apply(this, arguments);
            
            self.parent = parent;
            self.$visual;
            self.$title;
            self.$filter;
            self.analysis_id;
            self.selectedAnalysisExplores = [];
            self.selectedDashboardExplore;
            self.$editor;
            self.$editorContainer;
            self.lastScript = '';
            self.floatingScriptEditor = false;
            self.scriptEditorType = '';
            self.scriptType = '';
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

            am4core.useTheme(am4themes_animated);

            self.$title = self.$el.find('.izi_dashboard_block_header .izi_dashboard_block_title');
            
            // Add Component Visual View
            self.$visual = new IZIViewVisual(self);
            self.$visual.appendTo(self.$el.find('.izi_dashboard_block_content'));

            // Add Component Filters
            self.$filter = new IZISelectFilterTemp(self, self.$visual);
            self.$filter.appendTo(self.$el.find('.izi_dashboard_block_header'));

            // Analysis Explore
            self.$viewAnalysisExplore = self.$('.izi_view_analysis_explore');

            // Check If Opened In A Modal Dialog
            // Add Class If So
            setTimeout(function () {
                var $dialog = self.$el.closest('.modal-dialog');
                if ($dialog.length) {
                    $dialog.addClass('izi_modal_dialog_full');
                }
            }, 1000);
        },

        _getViewVisualByAnalysisId: function (analysis_id) {
            var self = this;
            if (self.$visual.analysis_id == analysis_id)
                return self.$visual;
            return false;
        },

        _setAnalysisId: function (analysis_id) {
            var self = this;
            self.analysis_id = analysis_id;
            if (self.$filter) {
                self.$filter.analysis_id = analysis_id;
                self.$filter._loadFilters();
            }
        },

        _onClickBgAnalysisExpore: function (ev) {
            var self = this;
            self.$viewAnalysisExplore.closest('.izi_dialog').hide();
        },

        _onClickAnalysisExpore: function (ev) {
            var self = this;
            var analysis_id = $(ev.currentTarget).data('analysis-id');
            if ($(ev.currentTarget).hasClass('active')) {
                $(ev.currentTarget).removeClass('active');
                // Check if analysis_id is in selectedAnalysisExplores
                var index = self.selectedAnalysisExplores.indexOf(analysis_id);
                if (index > -1) {
                    self.selectedAnalysisExplores.splice(index, 1);
                }
            } else {
                $(ev.currentTarget).addClass('active');
                // Check if analysis_id is not in selectedAnalysisExplores
                var index = self.selectedAnalysisExplores.indexOf(analysis_id);
                if (index == -1) {
                    self.selectedAnalysisExplores.push(analysis_id);
                }
                
            }
        },

        _onClickSubmitAnalysisExpore: function (ev) {
            var self = this;
            new swal({
                title: "Confirmation",
                text: `
                    Do you confirm to save the selected analysis (${self.selectedAnalysisExplores.length})?
                `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: 'Yes',
                heightAuto : false,
            }).then((result) => {
                if (result.isConfirmed) {
                    console.log(self.selectedAnalysisExplores);
                    self._rpc({
                        model: 'izi.analysis',
                        method: 'save_lab_analysis_explore',
                        args: [self.selectedAnalysisExplores, self.selectedDashboardExplore],
                    }).then(function (result) {
                        new swal('Success', `Analysis has been successfully saved`, 'success');
                        self.$viewAnalysisExplore.closest('.izi_dialog').hide();
                    });
                }
            });
        },

        _loadVisualScriptEditor: function () {
            var self = this;
            // Query Editor
            ace.config.set('basePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('modePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('themePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('workerPath', '/izi_dashboard/static/lib/ace-1.3.1/');
            self.$editor = ace.edit('izi_script_editor', {
                fontSize: "12px",
                fontFamily: "JetBrainsMono",
            });
            self.$editor.setTheme('ace/theme/chrome');
            self.$editor.setOption({ 
                useWorker: false,
            });
            self._activateCustomCommand();
            self.scriptEditorType = 'Javascript';
            self.$editor.session.setMode('ace/mode/javascript');
            self.$editorContainer = self.$('.izi_dashboard_script_editor');
            self.$editorContainer.draggable();
            self.$editorContainer.resizable();
            self.$editorContainer.attr('style', 'background: white;');
            self.$editorContainer.find('h4').attr('style', 'color: black;');
            self.$editorContainer.find('.izi_dashboard_script_type').attr('src', '/izi_dashboard/static/src/img/js.png');
            self._resetScriptEditor();
        },

        _loadDataScriptEditor: function (type) {
            var self = this;
            // Query Editor
            ace.config.set('basePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('modePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('themePath', '/izi_dashboard/static/lib/ace-1.3.1/');
            ace.config.set('workerPath', '/izi_dashboard/static/lib/ace-1.3.1/');
            self.$editor = ace.edit('izi_script_editor', {
                fontSize: "12px",
                fontFamily: "JetBrainsMono",
            });
            self.$editor.setTheme('ace/theme/monokai');
            self.$editor.setOption({ 
                useWorker: false,
            });
            self._activateCustomCommand();
            self.$editorContainer = self.$('.izi_dashboard_script_editor');
            if (type == 'python') {
                self.scriptEditorType = 'Python';
                self.$editor.session.setMode('ace/mode/python');
                self.$editorContainer.find('.izi_dashboard_script_type').attr('src', '/izi_dashboard/static/src/img/python.png');
            } else if (type == 'sql') {
                self.scriptEditorType = 'PostgreSQL';
                self.$editor.session.setMode('ace/mode/sql');
                self.$editorContainer.find('.izi_dashboard_script_type').attr('src', '/izi_dashboard/static/src/img/psql.png');
            }
            self.$editorContainer.draggable();
            self.$editorContainer.resizable();
            self.$editorContainer.attr('style', 'background: #272823;');
            self.$editorContainer.find('h4').attr('style', 'color: white;');
            self.$editor.resize();
            self._resetScriptEditor();
        },

        _resetScriptEditor: function() {
            var self = this;
            if (self.$editorContainer) {
                self.$editorContainer.attr('style', '');

                // Title and Value
                self.$editorContainer.find('h4').text('');
                self.$editorContainer.find('.izi_update_script').attr('data-analysis-id', 0);
                self.$editorContainer.find('.izi_update_script').attr('data-analysis-name', '');
                self.$editorContainer.find('.izi_update_script').attr('data-block-id', 0);
                self.$editorContainer.find('.izi_update_script').attr('data-script-type', '');
                
                // Default Not Floating
                // self.$editorContainer.removeClass('floating');
                // self.$editorContainer.css('top', 'auto');
                // self.$editorContainer.css('bottom', 'auto');
                // self.$editorContainer.css('left', 'auto');
                // self.$editorContainer.css('right', 'auto');
                // self.floatingScriptEditor = false;

                // Default Floating
                self.$editorContainer.addClass('floating');
                self.$editorContainer.css('top', '20px');
                self.$editorContainer.css('bottom', '20px');
                self.$editorContainer.css('left', '20px');
                self.$editorContainer.css('right', '20px');
                self.$editorContainer.css('width', 'auto');
                self.$editorContainer.css('height', 'auto');
                self.floatingScriptEditor = true;

                // Resize
                self.$editor.resize();

                // Disable Scroll
                var $dialog = self.$el.closest('.modal-dialog');
                if ($dialog.length) {
                    $dialog.addClass('izi_modal_dialog_no_scroll');
                }
            }
        },

        _closeScript : function () {
            var self = this;
            if (self.$editorContainer) {
                self.$editorContainer.hide();
                self._resetScriptEditor();
                // Enable Scroll
                var $dialog = self.$el.closest('.modal-dialog');
                if ($dialog.length) {
                    $dialog.removeClass('izi_modal_dialog_no_scroll');
                }
            }
        },

        _onClickCloseScript: function () {
            var self = this;
            var script = self.$editor.getValue();
            if (script == self.lastScript) {
                self._closeScript();
            } else {
                new swal({
                    title: "Close Script Editor",
                    text: `
                        Do you confirm to close the script editor and discard the changes?
                    `,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                    heightAuto : false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        self._closeScript();
                    }
                });
            }
        },

        _activateCustomCommand: function () {
            var self = this;
            if (self.$editor) {
                self.$editor.commands.addCommand({
                    name: 'Ask GPT To Complete Code',
                    bindKey: {
                        win: 'Ctrl-G',
                        mac: 'Command-G'
                    },
                    exec: function(editor) {
                        self._onClickContinueScriptAI();
                    },
                    readOnly: false,
                });
                self.$editor.commands.addCommand({
                    name: 'Ask GPT General Question',
                    bindKey: {
                        win: 'Ctrl-Shift-G',
                        mac: 'Command-Shift-G'
                    },
                    exec: function(editor) {
                        self._onClickGeneralScriptAI();
                    },
                    readOnly: false,
                });
                self.$editor.commands.addCommand({
                    name: 'Save',
                    bindKey: {
                        win: 'Ctrl-S',
                        mac: 'Command-S'
                    },
                    exec: function(editor) {
                        var script = self.$editor.getValue();
                        if (script != self.lastScript) {
                            self._onClickUpdateScript(undefined, false, function() {
                                // if (self.floatingScriptEditor)
                                //     self._onClickToggleFloatScript();
                            });
                        }
                    },
                    readOnly: true,
                });
                self.$editor.commands.addCommand({
                    name: 'Save and Run',
                    bindKey: {
                        win: 'Ctrl-Shift-S',
                        mac: 'Command-Shift-S'
                    },
                    exec: function(editor) {
                        var script = self.$editor.getValue();
                        if (script != self.lastScript) {
                            self._onClickUpdateScript(undefined, true, function() {
                                // if (self.floatingScriptEditor)
                                //     self._onClickToggleFloatScript();
                            });
                        }
                    },
                    readOnly: true,
                });
                self.$editor.commands.addCommand({
                    name: 'Toggle Float',
                    bindKey: {
                        win: 'Ctrl-B',
                        mac: 'Command-B'
                    },
                    exec: function(editor) {
                        self._onClickToggleFloatScript();
                    },
                    readOnly: true,
                });
            }
        },

        _onClickContinueScriptAI: function(ev) {
            var self = this;
            if (self.$editor && self.analysis_id) {
                var cur_pos = self.$editor.getCursorPosition();
                var row = cur_pos.row;
                var col = cur_pos.column;
                var spaces = '';
                for (var i = 0; i < col; i++) {
                    spaces += ' ';
                }
                var previous_code = '';
                var total_line = 0;
                while (row >= 0) {
                    if (previous_code == '') {
                        previous_code = self.$editor.session.getLine(row);
                    } else {
                        var line = self.$editor.session.getLine(row);
                        previous_code = line + '\n' + previous_code;
                    }
                    row--;
                    total_line++;
                    if (total_line > 20)
                        break;
                }
                // row = cur_pos.row + 1;
                // total_line = 0;
                // var maximum_line = self.$editor.session.getLength()
                // var next_code  = '';
                // if (row <= maximum_line)
                //     var next_code = '\n' + self.$editor.session.getLine(row);
                // while (row <= maximum_line) {
                //     var line = self.$editor.session.getLine(row);
                //     next_code = next_code + '\n' + line;
                //     row++;
                //     total_line++;
                //     if (total_line > 5)
                //         break;
                // }
                if (previous_code) {
                    // Instruction to AI
                    var instruction = `You are a code generator. 
                        You will continue the code below.
                        Only answer in ${self.scriptEditorType} syntax!
                        DO NOT ADD ANY OTHER TEXT!
                        DO NOT ANSWER WITH THE PREVIOUS CODE!
                        JUST ANSWER YOUR CODE THAT CONTINUE THIS CODE!
                        ONLY ANSWER WITH 1-2 LINES!
                        \n${previous_code}`
                    self._rpc({
                        model: 'izi.analysis',
                        method: 'action_get_lab_script',
                        args: [self.analysis_id, instruction],
                    }).then(function (result) {
                        if (result.status == 200) {
                            // Insert Answer From AI
                            var code = result.code;
                            var cur_line_code = self.$editor.session.getLine(cur_pos.row);
                            var cur_line_code_trim = cur_line_code.trimStart();
                            if (code.includes(cur_line_code_trim)) {
                                code = code.replace(cur_line_code_trim, '');
                            }
                            self.$editor.session.insert({
                                row: cur_pos.row,
                                column: cur_pos.column,
                            }, code);
                            
                        } else {
                            if (result.status == 401) {
                                new swal('Need Access', result.message, 'warning');
                                self.do_action({
                                    type: 'ir.actions.act_window',
                                    name: _t('Need API Access'),
                                    target: 'new',
                                    res_model: 'izi.lab.api.key.wizard',
                                    views: [[false, 'form']],
                                    context: {},
                                },{
                                    on_close: function(){
                                    }
                                });
                            } else
                                new swal('Error', result.message, 'error');
                        }
                    }); 
                }               
            }
        },

        _onClickGeneralScriptAI: function (ev) {
            var self = this;
            if (self.$editor && self.analysis_id) {
                var comment_char = false;
                if (self.scriptEditorType == 'Python') {
                    comment_char = '#';
                } else if (self.scriptEditorType == 'PostgreSQL') {
                    comment_char = '--';
                } else if (self.scriptEditorType == 'Javascript') {
                    comment_char = '//';
                }
                var cur_pos = self.$editor.getCursorPosition();
                var row = cur_pos.row;
                var col = cur_pos.column;
                var spaces = '';
                for (var i = 0; i < col; i++) {
                    spaces += ' ';
                }
                var comment_string = ''
                row = row - 1;
                while (row >= 0) {
                    var line = self.$editor.session.getLine(row);
                    var line_string = line.split(comment_char)
                    if (line_string.length > 1) {
                        if (comment_string != '')
                            comment_string = line_string[1].trim() + '\n' + comment_string;
                        else
                            comment_string = line_string[1].trim();
                    } else {
                        // Not Found Comment Char Anymore
                        break;
                    }
                    row--;
                }
                if (comment_string == '' && cur_pos.row > 0) {
                    comment_string = self.$editor.session.getLine(cur_pos.row - 1).trim();
                }
                // Instruction to AI
                var instruction = `${comment_string}`
                self._rpc({
                    model: 'izi.analysis',
                    method: 'action_get_lab_script',
                    args: [self.analysis_id, instruction],
                }).then(function (result) {
                    if (result.status == 200) {
                        // Insert Answer From AI
                        var code = result.code;
                        var codes = code.split('\n');
                        var spaced_codes = [];
                        codes.forEach(ans => {
                            spaced_codes.push(spaces + ans);
                        });
                        code = spaced_codes.join('\n') + '\n';
                        self.$editor.session.insert({
                            row: cur_pos.row,
                            column: 0,
                        }, code);
                        
                    } else {
                        if (result.status == 401) {
                            new swal('Need Access', result.message, 'warning');
                            self.do_action({
                                type: 'ir.actions.act_window',
                                name: _t('Need API Access'),
                                target: 'new',
                                res_model: 'izi.lab.api.key.wizard',
                                views: [[false, 'form']],
                                context: {},
                            },{
                                on_close: function(){
                                }
                            });
                        } else
                            new swal('Error', result.message, 'error');
                    }
                });
            }
        },

        _onClickToggleFloatScript: function () {
            var self = this;
            if (self.$editorContainer) {
                if (!self.floatingScriptEditor) {
                    self.$editorContainer.addClass('floating');
                    self.$editorContainer.css('top', '20px');
                    self.$editorContainer.css('bottom', '20px');
                    self.$editorContainer.css('left', '20px');
                    self.$editorContainer.css('right', '20px');
                    self.$editorContainer.css('width', 'auto');
                    self.$editorContainer.css('height', 'auto');
                    self.$editor.resize();
                    self.floatingScriptEditor = true;
                    self.$visual._renderVisual();
                } else {
                    self.$editorContainer.removeClass('floating');
                    self.$editorContainer.css('top', 'auto');
                    self.$editorContainer.css('bottom', 'auto');
                    self.$editorContainer.css('left', 'auto');
                    self.$editorContainer.css('right', 'auto');
                    self.$editor.resize();
                    self.floatingScriptEditor = false;
                    self.$visual._renderVisual();
                }
            }
        },

        _onClickUpdateScript: function (ev, to_execute=true, callback=false) {
            var self = this;
            var script = self.$editor.getValue();
            var analysis_id = self.analysis_id;
            var script_type = self.scriptType;

            new swal({
                title: "Update Script",
                text: `
                    Do you confirm to update ${script_type} script for this analysis ?
                `,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: 'Yes',
                heightAuto : false,
            }).then((result) => {
                if (result.isConfirmed && script_type) {
                    if (script_type == 'visual') {
                        self._rpc({
                            model: 'izi.analysis',
                            method: 'write',
                            args: [[analysis_id], {render_visual_script: script, use_render_visual_script: true}],
                        }).then(function (res) {
                            console.log('Update Script', res);
                            if (self.parent && self.parent.$configAnalysis) {
                                self.parent.$configAnalysis._loadAnalysisInfo();
                                self.parent.$configAnalysis._renderVisual();
                            }
                            self.lastScript = script;
                            if (callback) {
                                callback();
                            }
                        });
                    } else if (script_type == 'data') {
                        self._rpc({
                            model: 'izi.analysis',
                            method: 'write_data_script',
                            args: [[analysis_id], script, to_execute],
                        }).then(function (res) {
                            console.log('Update Script', res);
                            if (self.parent && self.parent.$configAnalysis) {
                                self.parent.$configAnalysis._loadAnalysisInfo();
                                self.parent.$configAnalysis._renderVisual();
                            }
                            self.lastScript = script;
                            if (callback) {
                                callback();
                            }
                        });
                    }
                }
            });
        },
    });

    return IZIViewAnalysis;
});