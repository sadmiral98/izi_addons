# -*- coding: utf-8 -*-

from odoo import api, fields, models
from datetime import date


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def set_quotation_expired(self):
        sale_order_ids = self.env['sale.order'].search([('validity_date', '<', date.today())])
        for sale_order in sale_order_ids:
            transaction = sale_order.transaction_ids.get_last_transaction()
            if transaction.midtrans_transaction_status == 'pending':
                acquirer = transaction.acquirer_id
                expire_response = acquirer.midtrans_core().transactions.expire(transaction.acquirer_reference)
                if int(expire_response.get('status_code')) in [407]:
                    res = transaction.form_feedback(expire_response, 'midtrans')
                    if not res:
                        transaction._set_transaction_error('Validation error occurred. Please contact your administrator.')

    def set_quotation_cancel(self):
        payment_transaction_ids = self.env['payment.transaction'].search([('state', '=', 'error'), ('provider', '=', 'midtrans')])
        for payment_transaction in payment_transaction_ids:
            for sale_order in filter(lambda x: x.state != 'cancel', payment_transaction.sale_order_ids):
                sale_order.state = 'cancel'