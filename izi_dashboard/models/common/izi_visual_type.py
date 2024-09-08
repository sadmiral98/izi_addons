# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields


class IZIVisualType(models.Model):
    _name = 'izi.visual.type'
    _rec_name = 'title'
    _description = 'IZI Visual Type'

    name = fields.Char(string='Name', required=True)
    title = fields.Char(string='Title', required=True)
    icon = fields.Char(string='Icon')
    default_gs_w = fields.Integer(string='Default Gridstack W')
    default_gs_h = fields.Integer(string='Default Gridstack H')
    min_gs_w = fields.Integer(string='Minimum Gridstack W')
    min_gs_h = fields.Integer(string='Minimum Gridstack H')
    max_gs_w = fields.Integer(string='Maximum Gridstack W')
    max_gs_h = fields.Integer(string='Maximum Gridstack H')
    visual_config_ids = fields.Many2many(comodel_name='izi.visual.config', string='Visual Config')

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Visual Type Name Already Exist.')
    ]

    def get_visual_config(self, visual_type, analysis_id=False):
        res = []
        visual_type_ids = self.env['izi.visual.type'].search([('name', '=', visual_type)])
        analysis_id = self.env['izi.analysis'].browse(analysis_id)
        config_value_by_config_id = {}
        config_value_id_by_config_id = {}
        analysis_visual_config_by_config_id = {}
        for analysis_visual_config in analysis_id.analysis_visual_config_ids:
            config_type = analysis_visual_config.visual_config_id.config_type
            config_value = analysis_visual_config.string_value
            if config_type == 'input_number':
                config_value = int(config_value)
            elif config_type == 'toggle':
                config_value = True if config_value == 'true' else False
            elif 'selection' in config_type:
                value_type = analysis_visual_config.visual_config_value_id.value_type
                if value_type == 'number':
                    config_value = int(config_value)
            config_value_by_config_id[analysis_visual_config.visual_config_id.id] = config_value
            config_value_id = analysis_visual_config.visual_config_value_id.id
            if config_value_id is False:
                config_value_id = None
            config_value_id_by_config_id[analysis_visual_config.visual_config_id.id] = config_value_id
            analysis_visual_config_by_config_id[analysis_visual_config.visual_config_id.id] = analysis_visual_config.id
        for visual_type_id in visual_type_ids:
            for visual_config in visual_type_id.visual_config_ids:
                visual_config_values = []
                for visual_config_value in visual_config.visual_config_value_ids:
                    visual_config_values.append({
                        'id': visual_config_value.id,
                        'name': visual_config_value.name,
                        'title': visual_config_value.title,
                        'value_type': visual_config_value.value_type,
                    })
                config_type = visual_config.config_type
                default_config_value = visual_config.default_config_value
                if config_type == 'input_number':
                    default_config_value = int(default_config_value)
                elif config_type == 'toggle':
                    default_config_value = True if default_config_value == 'true' else False
                elif config_type == 'selection_number':
                    default_config_value = int(default_config_value)
                res.append({
                    'id': visual_config.id,
                    'name': visual_config.name,
                    'title': visual_config.title,
                    'config_type': visual_config.config_type,
                    'default_config_value': default_config_value,
                    'config_value': config_value_by_config_id.get(visual_config.id),
                    'config_value_id': config_value_id_by_config_id.get(visual_config.id),
                    'visual_config_values': visual_config_values,
                    'analysis_visual_config_id': analysis_visual_config_by_config_id.get(visual_config.id),
                })
        return res
