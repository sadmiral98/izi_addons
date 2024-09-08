# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, fields


class IZIDashboardTheme(models.Model):
    _name = 'izi.dashboard.theme'
    _description = 'IZI Dashboard Theme'

    name = fields.Char('Name', required=True)

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Dashboard Theme Name Already Exist.')
    ]
