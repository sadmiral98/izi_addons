# -*- coding: utf-8 -*-

import midtransclient
from werkzeug import urls

from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.http import request
# noinspection PyUnresolvedReferences
from odoo.addons.izi_payment_midtrans.objects.generic.midtransclient import MidtransHttpClient

MIDTRANS_METHOD = [
    ('snap', 'Snap'),
    ('core', 'Core API')
]

MIDTRANS_EXPIRY_UNITS = [
    ('minute', 'Minute'),
    ('hour', 'Hour'),
    ('day', 'Day')
]


class PaymentAcquirer(models.Model):
    _inherit = 'payment.acquirer'

    provider = fields.Selection(selection_add=[('midtrans', 'Midtrans')], ondelete={'midtrans': 'set default'})
    midtrans_method = fields.Selection(string="Midtrans Method", selection=MIDTRANS_METHOD,
                                       required_if_provider="midtrans")
    midtrans_merchant_id = fields.Char(string="Midtrans Merchant ID", required_if_provider="midtrans",
                                       groups="base.group_user")
    midtrans_client_key = fields.Char(string="Midtrans Client Key", required_if_provider="midtrans",
                                      groups="base.group_user")
    midtrans_server_key = fields.Char(string="Midtrans Server Key", required_if_provider="midtrans",
                                      groups="base.group_user")
    midtrans_snap_payment_type_ids = fields.One2many(comodel_name="midtrans.payment.type",
                                                     inverse_name="snap_acquirer_id",
                                                     string="Payment Types")
    # TODO: Rename midtrans_redirect to midtrans_snap_redirect
    midtrans_redirect = fields.Boolean(string="SNAP Redirect Mode")
    midtrans_snap_custom_expiry = fields.Boolean(string="SNAP Set Custom Expiry", default=False)
    midtrans_snap_expiry_duration = fields.Integer(string="SNAP Expiry Duration", required=False, default=1)
    midtrans_snap_expiry_unit = fields.Selection(string="SNAP Expiry Unit", selection=MIDTRANS_EXPIRY_UNITS,
                                                 required=False, default="day")

    # noinspection PyProtectedMember
    def get_base_url(self):
        self.ensure_one()
        url = ''
        if request:
            url = request.httprequest.environ.get('HTTP_ORIGIN')

        if not url and 'website_id' in self and self.website_id:
            url = self.website_id._get_http_domain()

        return url or self.env['ir.config_parameter'].sudo().get_param('web.base.url')

    def _is_production(self):
        self.ensure_one()
        return self.state == 'enabled'

    # noinspection DuplicatedCode
    def midtrans_snap(self, is_production=False, server_key=False, client_key=False):
        self.ensure_one()
        headers = {'X-Append-Notification': urls.url_join(self.get_base_url(), '/payment/midtrans/notification')}

        snap = midtransclient.Snap(
            is_production=is_production or self._is_production(),
            server_key=server_key or self.midtrans_server_key,
            client_key=client_key or self.midtrans_client_key,
        )
        # snap = midtransclient.Snap()
        # snap.api_config.set(is_production=is_production or self._is_production())
        # snap.api_config.set(server_key=server_key or self.midtrans_server_key)
        # snap.api_config.set(client_key=client_key or self.midtrans_client_key)
        # snap.http_client = MidtransHttpClient(headers=headers)
        return snap

    # noinspection DuplicatedCode
    def midtrans_core(self, is_production=False, server_key=False, client_key=False):
        self.ensure_one()
        headers = {'X-Append-Notification': urls.url_join(self.get_base_url(), '/payment/midtrans/notification')}

        core = midtransclient.CoreApi(
            is_production=is_production or self._is_production(),
            server_key=server_key or self.midtrans_server_key,
            client_key=client_key or self.midtrans_client_key,
        )
        # core = midtransclient.CoreApi()
        # core.api_config.set(is_production=is_production or self._is_production())
        # core.api_config.set(server_key=server_key or self.midtrans_server_key)
        # core.api_config.set(client_key=client_key or self.midtrans_client_key)
        # core.http_client = MidtransHttpClient(headers=headers)
        return core

    # noinspection PyProtectedMember
    def _get_feature_support(self):
        """Get advanced feature support by provider.

        Each provider should add its technical in the corresponding
        key for the following features:
            * fees: support payment fees computations
            * authorize: support authorizing payment (separates
                         authorization and capture)
            * tokenize: support saving payment data in a payment.tokenize
                        object
        """
        res = super(PaymentAcquirer, self)._get_feature_support()
        res['authorize'].append('midtrans')
        return res

    def midtrans_form_generate_values(self, values):
        order = request.website.sale_get_order()
        amount = values['amount']
        currency = values['currency']

        # make sure the transaction currency is in IDR
        currency_idr = self.env.ref('base.IDR')
        if currency.id != currency_idr.id:
            if not currency_idr.active:
                raise UserError("Midtrans payment acquirer require IDR currency enabled.")

            # currency conversion
            values['amount'] = int(round(currency.compute(amount, currency_idr)))
        else:
            values['amount'] = int(round(amount))

        midtrans_tx_values = dict(values)
        midtrans_tx_values.update({
            'order_id': order.id,
            'callback_url': urls.url_join(self.get_base_url(), '/payment/midtrans/validate')
        })
        return midtrans_tx_values
