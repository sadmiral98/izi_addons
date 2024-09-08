# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields


class IZIAnalysisVisualConfig(models.Model):
    _name = 'izi.analysis.visual.config'
    _description = 'IZI Analysis Visual Config'

    analysis_id = fields.Many2one(comodel_name='izi.analysis', string='Analysis', ondelete='cascade')
    visual_config_id = fields.Many2one(comodel_name='izi.visual.config', string='Visual Config')
    visual_config_value_id = fields.Many2one(comodel_name='izi.visual.config.value', string='Visual Config Value')
    string_value = fields.Text(string='String Value')
