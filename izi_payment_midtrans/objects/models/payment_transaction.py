# -*- coding: utf-8 -*-

import pytz
import logging

# noinspection PyProtectedMember
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError, UserError
from odoo.tools import float_compare

# noinspection PyUnresolvedReferences
from odoo.addons.izi_payment_midtrans.objects.generic.utils import is_valid_signature_key

_logger = logging.getLogger(__name__)


class PaymentTransaction(models.Model):
    _inherit = 'payment.transaction'

    midtrans_snap_token = fields.Char(string="SNAP Token", readonly=True)
    midtrans_payment_type = fields.Char(string="Payment Type", readonly=True)
    midtrans_transaction_status = fields.Char(string="Transaction Status", readonly=True)
    midtrans_fraud_status = fields.Char(string="Fraud Status", readonly=True)
    midtrans_channel_response_message = fields.Char(string="Channel Response Message", readonly=True)
    midtrans_currency = fields.Char("Currency Code", readonly=True)
    midtrans_response = fields.Text(string="Response")

    def get_payment_type_name(self):
        self.ensure_one()
        return self.midtrans_payment_type.title().replace('_', ' ')

    # noinspection PyProtectedMember
    def get_payment_instruction_pdf_url(self):
        self.ensure_one()
        pdf_url = "https://app.sandbox.midtrans.com/snap/v1/transactions/%s/pdf"
        if self.acquirer_id._is_production():
            pdf_url = "https://app.midtrans.com/snap/v1/transactions/%s/pdf"
        return pdf_url % self.midtrans_snap_token

    # noinspection SpellCheckingInspection
    def has_payment_instructions(self):
        self.ensure_one()
        return self.state == 'pending' and self.midtrans_payment_type in ['bank_transfer', 'echannel', 'indomaret',
                                                                          'alfamart']

    def _log_msg(self, state):
        msg = 'Received notification for {status} Midtrans payment {reference}: set as {action}.'
        state_map = {
            'pending': {'status': 'PENDING', 'action': 'PENDING'},
            'challenge': {'status': 'CHALLENGED', 'action': 'AUTHORIZED'},
            'success': {'status': 'SUCCESS', 'action': 'DONE'},
            'settlement': {'status': 'SETTLEMENT', 'action': 'DONE'},
            'cancel': {'status': 'CANCELLED', 'action': 'CANCEL'},
            'expired': {'status': 'EXPIRED', 'action': 'ERROR'},
            'reject': {'status': 'REJECTED', 'action': 'ERROR'},
            'error': {'status': 'REJECTED', 'action': 'ERROR'}
        }

        return msg.format(status=state_map[state]['status'], reference=self.reference,
                          action=state_map[state]['action'])

    @api.model
    def _midtrans_form_get_tx_from_data(self, data):
        transaction_obj = self.env['payment.transaction']

        # make sure acquirer send reference and acquirer reference
        reference, midtrans_token = data.get('order_id'), data.get('transaction_id')
        if data.get('validation_method') == 'manual':
            if not reference:
                error_msg = _('Midtrans: received data with missing reference (%s)') % reference
                _logger.info(error_msg)
                raise ValidationError(error_msg)
        elif data.get('validation_method') == 'notification':
            if not reference or not midtrans_token:
                error_msg = _(
                    'Midtrans: received data with missing reference (%s) or acquirer reference (%s)') % (
                                reference, midtrans_token)
                _logger.info(error_msg)
                raise ValidationError(error_msg)

        # find transaction using acquirer reference
        transaction = transaction_obj.search([('reference', '=', reference)])
        if not transaction or len(transaction) > 1:
            error_msg = 'Midtrans: received data for reference %s' % reference
            if not transaction:
                error_msg += '; no order found'
            else:
                error_msg += '; multiple order found'
            _logger.info(error_msg)
            raise ValidationError(error_msg)
        return transaction[0]

    def _midtrans_form_get_invalid_parameters(self, data):
        _logger.info('Processing data from Midtrans')

        currency_obj = self.env['res.currency']

        invalid_parameters = []

        if data.get('validation_method') == 'notification':
            # check acquirer reference
            midtrans_token = data.get('transaction_id')
            if self.acquirer_reference and self.acquirer_reference != midtrans_token:
                invalid_parameters.append(('transaction_id', midtrans_token, self.acquirer_reference))

            # check amount and currency
            midtrans_gross_amount = float(data.get('gross_amount', '0.0'))
            midtrans_gross_amount_currency = currency_obj.search([('name', '=', data.get('currency'))], limit=1)
            if not midtrans_gross_amount_currency:
                raise ValidationError("No active currency for %s." % data.get('currency'))
            elif midtrans_gross_amount_currency != self.currency_id:
                midtrans_gross_amount = midtrans_gross_amount_currency.compute(midtrans_gross_amount, self.currency_id)
            if float_compare(midtrans_gross_amount, (self.amount + self.fees), 2) != 0:
                invalid_parameters.append(('gross_amount', midtrans_gross_amount, '%.2f' % self.amount + self.fees))

            # check merchant ID
            if self.acquirer_id.midtrans_merchant_id != data.get('merchant_id'):
                invalid_parameters.append(
                    ('merchant_id', data.get('merchant_id'), self.acquirer_id.midtrans_merchant_id))

        return invalid_parameters

    def _midtrans_form_validate(self, data):
        _logger.info('Validating payment from Midtrans')

        acquirer = self.acquirer_id

        # If there is no signature_key in data, system will try to get status of transaction from acquirer
        status_response = validation_method = False
        if 'signature_key' not in data:
            status_response = acquirer.midtrans_core().transactions.status(self.reference)
        else:
            status_response = data

        # Collecting variables
        signature_key = status_response.get('signature_key')
        status_code = int(status_response.get('status_code'))
        transaction_status = status_response.get('transaction_status')
        fraud_status = status_response.get('fraud_status')
        payment_type = status_response.get('payment_type')

        # Validate received signature_key
        if not is_valid_signature_key(signature_key, status_response, acquirer.midtrans_core().api_config.server_key):
            _logger.warning("Invalid signature_key received.")
            return False

        # Date from Midtrans in UTC+7, need to convert it to UTC before store in DB
        midtrans_tz = pytz.timezone("Asia/Jakarta")
        midtrans_datetime = midtrans_tz.localize(fields.Datetime.to_datetime(status_response.get('transaction_time')))
        transaction_time = midtrans_datetime.astimezone(pytz.utc).replace(tzinfo=None)

        res = {
            'date': transaction_time,
            'acquirer_reference': status_response.get('transaction_id'),
            'state_message': status_response.get('status_message'),
            'midtrans_payment_type': payment_type,
            'midtrans_transaction_status': transaction_status,
            'midtrans_fraud_status': fraud_status,
            'midtrans_channel_response_message': status_response.get('channel_response_message'),
            'midtrans_currency': status_response.get('currency')
        }

        if status_code == 200:
            if transaction_status in ['capture', 'settlement'] and fraud_status == 'accept':
                if self.state != 'done':
                    self._set_transaction_done()
                    if transaction_status == 'settlement':
                        _logger.info(self._log_msg('settlement'))
                    else:
                        _logger.info(self._log_msg('success'))
                    return self.write(res)
            elif transaction_status == 'cancel':
                if self.state != 'cancel':
                    self._set_transaction_cancel()
                    _logger.info(self._log_msg('cancel'))
                    return self.write(res)
            elif transaction_status == 'deny':
                if self.state != 'error':
                    self._set_transaction_error(status_response.get('status_message'))
                    _logger.warning(self._log_msg('reject'))
                    return self.write(res)
        elif status_code == 201:
            if payment_type == 'credit_card':
                if transaction_status in ['authorize', 'capture'] or fraud_status == 'challenge':
                    if self.state != 'authorized':
                        self._set_transaction_authorized()
                        _logger.warning(self._log_msg('challenge'))
                        return self.write(res)
            else:
                if transaction_status == 'pending' and fraud_status == 'accept':
                    if self.state != 'pending':
                        self._set_transaction_pending()
                        _logger.info(self._log_msg('pending'))
                        return self.write(res)
        elif status_code == 202:
            if transaction_status == 'deny':
                if self.state != 'error':
                    self._set_transaction_error(status_response.get('status_message'))
                    _logger.warning(self._log_msg('reject'))
                    return self.write(res)
            elif transaction_status == 'cancel':
                if self.state != 'cancel':
                    self._set_transaction_cancel()
                    _logger.info(self._log_msg('cancel'))
                    return self.write(res)
            elif transaction_status == 'expire':
                if self.state != 'error':
                    res['state_message'] = 'Transaction on Midtrans was expired.'
                    res['date'] = fields.Datetime.now()
                    self._set_transaction_error(res['state_message'])
                    _logger.info(self._log_msg('expired'))
                    return self.write(res)

        elif status_response.get('status_code').startswith('4'):
            if status_code == 407 and transaction_status == 'expire':
                if self.state != 'error':
                    res['state_message'] = 'Transaction on Midtrans was expired.'
                    res['date'] = fields.Datetime.now()
                    self._set_transaction_error(res['state_message'])
                    _logger.info(self._log_msg('expired'))
                    return self.write(res)
            else:
                if self.state != 'error':
                    self._set_transaction_error(status_response.get('status_message'))
                    _logger.info(self._log_msg('error'))
                    return self.write({'state_message': status_response.get('status_message')})
        return True

    def midtrans_s2s_capture_transaction(self):
        self.ensure_one()

        acquirer = self.acquirer_id

        if self.midtrans_fraud_status != 'challenge':
            raise UserError(
                "The fraud status of transaction is %s instead of %s" % (acquirer.midtrans_fraud_status, 'challenge'))

        _logger.info('Approve a transaction with `challenge` fraud status')
        approve_response = acquirer.midtrans_core().transactions.approve(self.acquirer_reference)
        return approve_response

    def midtrans_s2s_void_transaction(self):
        self.ensure_one()

        acquirer = self.acquirer_id

        if self.midtrans_fraud_status != 'challenge':
            raise UserError(
                "The fraud status of transaction is %s instead of %s" % (acquirer.midtrans_fraud_status, 'challenge'))

        _logger.info('Deny a transaction with `challenge` fraud status')
        deny_response = acquirer.midtrans_core().transactions.deny(self.acquirer_reference)
        return deny_response

    def midtrans_s2s_update_transaction_status(self):
        self.ensure_one()
        res = False
        dict_response = self.acquirer_id.midtrans_core().transactions.status(self.acquirer_reference)

        if int(dict_response.get('status_code')) in [200, 201, 202]:
            res = self.form_feedback(dict_response, 'midtrans')
            if not res:
                self._set_transaction_error('Validation error occurred. Please contact your administrator.')
        return res
