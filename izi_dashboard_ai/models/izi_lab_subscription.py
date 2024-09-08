from odoo import models, fields, api, _
from odoo.exceptions import UserError
import random, string
# Import Relative Delta
from dateutil.relativedelta import relativedelta

class ResUsers(models.Model):
    _inherit = 'res.users'

    izi_lab_api_key = fields.Char('IZI Lab API Key')
    izi_lab_subscription_expiration_date = fields.Date('IZI Lab Subscription Expiration Date')
    izi_lab_subscription_ids = fields.One2many('izi.lab.subscription', 'user_id', string='Subscriptions')

    # Inherit Create
    @api.model
    def create(self, vals):
        res = super().create(vals)
        if not res.izi_lab_api_key:
            res.izi_lab_api_key = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
            res.izi_lab_subscription_expiration_date = fields.Date.today() + relativedelta(months=1)
        return res

class AccountMove(models.Model):
    _inherit = 'account.move'

    izi_lab_subscription_ids = fields.One2many('izi.lab.subscription', 'invoice_id', string='Subscriptions')

class IZILabSubscription(models.Model):
    _name = 'izi.lab.subscription'
    _description = 'IZI Lab Subscription'

    user_id = fields.Many2one('res.users', string='User')
    name = fields.Char('Subscription Name')
    type = fields.Selection([('subscription', 'Subscription'), ('analysis', 'Analysis')], string='Subscription Type')
    status = fields.Selection([('active', 'Active'), ('inactive', 'Inactive')], string='Subscription Status')
    date_start = fields.Date('Subscription Start Date')
    date_end = fields.Date('Subscription End Date')
    invoice_id = fields.Many2one('account.move', string='Invoice')
    product_id = fields.Many2one('product.product', string='Product')

    @api.model
    def activate_subscription(self):
        paid_invoices = self.env['account.move'].search([('payment_state', 'in', ['paid', 'in_payment']), ('move_type', '=', 'out_invoice'), ('izi_lab_subscription_ids', '=', False)])
        for invoice in paid_invoices:
            for line in invoice.invoice_line_ids:
                if line.product_id.izi_lab_subscription and invoice.partner_id.user_ids and line.product_id.izi_lab_subscription_num_month:
                    user = invoice.partner_id.user_ids[0]
                    prev_date_end = user.izi_lab_subscription_expiration_date
                    if not prev_date_end or prev_date_end < fields.Date.today():
                        prev_date_end = fields.Date.today()
                    if line.product_id.izi_lab_subscription_num_month:
                        date_end = prev_date_end + relativedelta(months=line.product_id.izi_lab_subscription_num_month * line.quantity)
                    else:
                        date_end = prev_date_end + relativedelta(months=line.quantity)
                    subscription = self.create({
                        'user_id': user.id,
                        'name': line.product_id.name,
                        'type': 'subscription',
                        'status': 'active',
                        'date_start': prev_date_end,
                        'date_end': date_end,
                        'invoice_id': invoice.id,
                        'product_id': line.product_id.id,
                    })
                    user.izi_lab_subscription_expiration_date = date_end
                    invoice.izi_lab_subscription_ids = [(4, subscription.id)]
                elif line.product_id.analysis_id and invoice.partner_id.user_ids:
                    user = invoice.partner_id.user_ids[0]
                    subscription = self.create({
                        'user_id': user.id,
                        'name': line.product_id.name,
                        'type': 'analysis',
                        'status': 'active',
                        'date_start': invoice.date,
                        'date_end': invoice.date,
                        'invoice_id': invoice.id,
                        'product_id': line.product_id.id,
                    })
                    invoice.izi_lab_subscription_ids = [(4, subscription.id)]

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    izi_lab_subscription = fields.Boolean('IZI Lab Subscription')
    izi_lab_subscription_num_month = fields.Integer('Number of Months')
    analysis_id = fields.Many2one('izi.analysis', string='Analysis')