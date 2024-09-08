# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields, api


class IZIDashboardBlock(models.Model):
    _name = 'izi.dashboard.block'
    _description = 'IZI Dashboard Block'
    _order = 'gs_y,gs_x,id asc'

    name = fields.Char('Name', related='analysis_id.name')
    animation = fields.Boolean('Enable Animation', related='dashboard_id.animation')
    refresh_interval = fields.Integer('Refresh Interval in Seconds', related='dashboard_id.refresh_interval')
    rtl = fields.Boolean('RTL', related='dashboard_id.rtl')
    analysis_id = fields.Many2one(comodel_name='izi.analysis', string='Analysis', required=True, ondelete='cascade')
    visual_type_id = fields.Many2one(comodel_name='izi.visual.type',
                                     related='analysis_id.visual_type_id', string='Visual Type')
    visual_type_name = fields.Char(related='visual_type_id.name', string='Visual Type Name')
    dashboard_id = fields.Many2one(comodel_name='izi.dashboard', string='Dashboard', required=True, ondelete='cascade')
    # Position and Size on Gridstack.
    gs_x = fields.Integer('Gridstack X', default=0)
    gs_y = fields.Integer('Gridstack Y', default=0)
    gs_w = fields.Integer(string='Gridstack W')
    gs_h = fields.Integer(string='Gridstack H')
    min_gs_w = fields.Integer(string='Minimum Gridstack W', related='visual_type_id.min_gs_w')
    min_gs_h = fields.Integer(string='Minimum Gridstack H', related='visual_type_id.min_gs_h')
    
    def copy(self, default=None):
        max_block = self.search([('dashboard_id', '=', self.dashboard_id.id)], order='gs_y desc', limit=1)
        max_gs_y = max_block.gs_y + max_block.gs_h
        if not default or type(default) != dict:
            default = {}
        default.update({
            'gs_x': 0,
            'gs_y': max_gs_y,
        })
        res = super(IZIDashboardBlock, self).copy(default)
        if self.analysis_id:
            new_analysis = self.analysis_id.copy()
            res.analysis_id = new_analysis.id
        return res
    
    @api.model
    def create(self, vals):
        if 'analysis_id' in vals and 'dashboard_id' in vals:
            visual_type_id = self.env['izi.analysis'].browse(vals['analysis_id']).visual_type_id
            if 'gs_w' not in vals or 'gs_h' not in vals:
                vals['gs_w'] = visual_type_id.default_gs_w
                vals['gs_h'] = visual_type_id.default_gs_h
            if 'gs_x' not in vals or 'gs_y' not in vals:
                # Initialize Spaces
                spaces = {}
                i = 0
                while i < 12:
                    spaces[i] = {}
                    j = 0
                    while j < 100:
                        spaces[i][j] = 0
                        j += 1
                    i += 1
                
                # Fill Spaces With Existing Blockss
                dashboard = self.env['izi.dashboard'].browse(vals.get('dashboard_id'))
                for block in dashboard.block_ids:
                    i = block.gs_x
                    while i < (block.gs_x + block.gs_w):
                        if i not in spaces:
                            spaces[i] = {}
                        j = block.gs_y
                        while j < (block.gs_y + block.gs_h):
                            spaces[i][j] = 1
                            j+= 1
                        i += 1
                
                new_w = visual_type_id.default_gs_w
                new_h = visual_type_id.default_gs_h
                new_x = 0
                new_y = 0
                found = False
                j = 0
                while j < 100:
                    i = 0
                    while i < 12:
                        if i in spaces and spaces[i][j] == 0 and \
                            (i+new_w-1) in spaces and (j+new_h-1) in spaces[i+new_w-1] and \
                            spaces[i+new_w-1][j] == 0 and \
                            spaces[i][j+new_h-1] == 0 and \
                            spaces[i+new_w-1][j+new_h-1] == 0:
                            new_x = i
                            new_y = j
                            found = True
                            break
                        i += 1
                    if found:
                        break
                    j += 1

                if found:
                    vals['gs_x'] = new_x
                    vals['gs_y'] = new_y
        rec = super(IZIDashboardBlock, self).create(vals)
        return rec

    @api.model
    def ui_save_layout(self, layout):
        res = {
            'message': False,
            'status': 500,
        }
        for value in layout:
            block = self.browse(value['id'])
            if block:
                block.write({
                    'gs_x': value['x'],
                    'gs_y': value['y'],
                    'gs_w': value['w'],
                    'gs_h': value['h'],
                })
        res['status'] = 200
        return res
