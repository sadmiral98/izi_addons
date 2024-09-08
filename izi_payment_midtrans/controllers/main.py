# -*- coding: utf-8 -*-

import logging
import pprint

import pytz
from midtransclient import MidtransAPIError

from odoo import http, fields
from odoo.exceptions import ValidationError
from odoo.http import request

_logger = logging.getLogger(__name__)


class MidtransController(http.Controller):

    # noinspection PyProtectedMember,PyMethodMayBeStatic
    def _midtrans_validate_data(self, **kwargs):
        transaction_obj = request.env['payment.transaction']

        res = False
        reference = kwargs.get('order_id')
        transaction = transaction_obj.sudo().search([('reference', '=', reference)])
        if int(kwargs.get('status_code')) in [200, 201, 202]:
            res = transaction.form_feedback(kwargs, 'midtrans')
            if not res and transaction:
                transaction._set_transaction_error('Validation error occurred. Please contact your administrator.')
        return res

    # noinspection PyProtectedMember
    @http.route('/payment/midtrans/token', type='json', auth='public', website=True)
    def midtrans_get_token(self, **post):
        """Get midtrans token or redirect URL"""

        acquirer_obj = request.env['payment.acquirer']
        sale_obj = request.env['sale.order']
        transaction_obj = request.env['payment.transaction']

        acquirer_id = int(post.get('acquirer_id'))
        order_id = int(post.get('order_id'))
        last_transaction_id = request.session.get('__website_sale_last_tx_id')

        acquirer = acquirer_obj.sudo().browse(acquirer_id)
        order = sale_obj.sudo().browse(order_id)
        last_transaction = transaction_obj.sudo().browse(last_transaction_id)

        param = {
            "transaction_details": {
                "order_id": post.get('reference'),
                "gross_amount": post.get('gross_amount')
            },
            "customer_details": {
                "first_name": post.get('partner_first_name'),
                "last_name": post.get('partner_last_name'),
                "email": post.get('partner_email'),
                "phone": post.get('partner_phone'),
                "billing_address": {
                    "first_name": post.get('billing_partner_first_name'),
                    "last_name": post.get('billing_partner_last_name'),
                    "email": post.get('billing_partner_email'),
                    "phone": post.get('billing_partner_phone'),
                    "address": post.get('billing_partner_address'),
                    "city": post.get('billing_partner_city'),
                    "postal_code": post.get('billing_partner_postal_code'),
                    # "country_code": post.get('billing_partner_country_code')
                }
            },
            "enabled_payments": acquirer.midtrans_snap_payment_type_ids.mapped('code'),
            "credit_card": {
                "secure": True
            },
            "callbacks": {
                "finish": post.get('callback_url')
            }
        }

        if acquirer.midtrans_snap_custom_expiry:
            # Prepare start time for expiry
            midtrans_tz = pytz.timezone("Asia/Jakarta")
            current_datetime = pytz.utc.localize(fields.Datetime.now()).astimezone(midtrans_tz)

            # Assign expiry time
            param['expiry'] = {
                "start_time": current_datetime.strftime("%Y-%m-%d %H:%M:%S %z"),
                "duration": acquirer.midtrans_snap_expiry_duration,
                "unit": acquirer.midtrans_snap_expiry_unit
            }

        item_details = []
        amount_total = 0
        for line in order.order_line:
            if not line.product_uom_qty:
                continue
            price_unit_total = line.price_total / line.product_uom_qty
            price_unit_total = int(round(price_unit_total))
            amount_total += price_unit_total * line.product_uom_qty
            item = {
                "price": price_unit_total,
                "quantity": int(round(line.product_uom_qty)),
                "name": line.name[:50],
                "category": line.product_id.categ_id.name[:50],
                "merchant_name": request.website.company_id.name[:50]
            }
            if line.product_id.default_code:
                item.update({'id': line.product_id.default_code})

            item_details.append(item)

        param['item_details'] = item_details
        param['transaction_details']['gross_amount'] = amount_total

        _logger.info("Midtrans: Creating snap transaction...")
        try:
            midtrans_transaction = acquirer.midtrans_snap().create_transaction(param)
            last_transaction.write({'midtrans_snap_token': midtrans_transaction.get('token')})
            _logger.debug('Received snap transaction token %s', pprint.pformat(midtrans_transaction))
        except MidtransAPIError as e:
            return e.api_response_dict

        response = midtrans_transaction.copy()
        if acquirer.midtrans_method == 'snap':
            if acquirer.midtrans_redirect:
                response['snap_mode'] = 'redirect'
            else:
                response['snap_mode'] = 'pop-up'
                response['is_production'] = acquirer._is_production()
                response['client_key'] = acquirer.midtrans_client_key
        return response

    # noinspection PyProtectedMember
    @http.route('/payment/midtrans/validate', type='http', auth='public', website=True, sitemap=False)
    def midtrans_validate(self, **kwargs):
        _logger.info('Beginning Midtrans validation form_feedback with post data %s', pprint.pformat(kwargs))  # debug
        try:
            kwargs.update({'validation_method': 'manual'})
            self._midtrans_validate_data(**kwargs)
        except ValidationError:
            _logger.exception('Unable to validate the Midtrans payment')
        return request.redirect('/payment/process')

    @http.route('/payment/midtrans/notification', type='json', auth='public', csrf=False)
    def midtrans_notification(self):
        post = request.jsonrequest.copy()

        transaction_obj = request.env['payment.transaction']
        reference = post.get('order_id')
        transaction = transaction_obj.sudo().search([('reference', '=', reference)])
        if not transaction.midtrans_response:
            transaction.update({'midtrans_response': post})
        _logger.info('Beginning Midtrans notification form_feedback with post data %s', pprint.pformat(post))  # debug
        try:
            post.update({'validation_method': 'notification'})
            self._midtrans_validate_data(**post)
        except ValidationError:
            _logger.exception('Unable to validate the Midtrans payment')
        return ''
