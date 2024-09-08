# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields


class IZIVisualConfigValue(models.Model):
    _name = 'izi.visual.config.value'
    _description = 'IZI Visual Config Value'

    name = fields.Char('Name', required=True)
    title = fields.Char('Title', required=True)
    value_type = fields.Selection([
        ('string', 'String'),
        ('number', 'Number'),
        ('boolean', 'Boolean'),
    ])
    visual_config_ids = fields.Many2many(comodel_name='izi.visual.config', string='Visual Config')
