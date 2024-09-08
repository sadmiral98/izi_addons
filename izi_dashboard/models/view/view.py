# -*- coding: utf-8 -*-
from odoo import api, fields, models, _

class View(models.Model):
    _inherit = 'ir.ui.view'
    type = fields.Selection(
        selection_add=[
            ('izianalysis', 'IZI Analysis'),
            ('izidashboard', 'IZI Dashboard'),
        ]
    )

class ActWindowView(models.Model):
    _inherit = 'ir.actions.act_window.view'
    view_mode = fields.Selection(
        selection_add=[
            ('izianalysis', 'IZI Analysis'),
            ('izidashboard', 'IZI Dashboard'),
        ],
        ondelete={
            'izianalysis': 'cascade',
            'izidashboard': 'cascade',
        }
    )