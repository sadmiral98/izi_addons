# -*- coding: utf-8 -*-

from odoo import api, fields, models


class MidtransPaymentType(models.Model):
    _name = 'midtrans.payment.type'
    _description = 'Midtrans Payment Type'

    name = fields.Char(string="Name", required=True)
    code = fields.Char(string="Code", required=True)
    snap_acquirer_id = fields.Many2one(comodel_name="payment.acquirer", string="Acquirer")
