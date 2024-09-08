# -*- coding: utf-8 -*-

# from odoo import models, fields, api


# class izi_dashboard_ai(models.Model):
#     _name = 'izi_dashboard_ai.izi_dashboard_ai'
#     _description = 'izi_dashboard_ai.izi_dashboard_ai'

#     name = fields.Char()
#     value = fields.Integer()
#     value2 = fields.Float(compute="_value_pc", store=True)
#     description = fields.Text()
#
#     @api.depends('value')
#     def _value_pc(self):
#         for record in self:
#             record.value2 = float(record.value) / 100
