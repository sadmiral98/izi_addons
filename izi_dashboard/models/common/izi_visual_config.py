# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields


class IZIVisualConfig(models.Model):
    _name = 'izi.visual.config'
    _description = 'IZI Visual Config'

    name = fields.Char('Name', required=True)
    title = fields.Char('Title', required=True)
    config_type = fields.Selection([
        ('input_string', 'Input String'),
        ('input_number', 'Input Number'),
        ('selection_string', 'Selection String'),
        ('selection_number', 'Selection Number'),
        ('toggle', 'Toggle'),
    ])
    default_config_value = fields.Char(string='Default Config Value')
    visual_type_ids = fields.Many2many(comodel_name='izi.visual.type', string='Visual Type')
    visual_config_value_ids = fields.Many2many(comodel_name='izi.visual.config.value', string='Visual Config Value')

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Visual Config Name Already Exist.')
    ]
