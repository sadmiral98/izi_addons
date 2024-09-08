from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError


class IrAttachment(models.Model):
    _name = 'ir.attachment'
    _inherit = 'ir.attachment'

    table_id = fields.Many2one('izi.table', string='Table')
    table_date = fields.Date('Date')
    analytic = fields.Boolean('For Analytic Purpose')

    @api.model
    def create(self, values):
        record = super(IrAttachment, self).create(values)
        if record.table_id:
            if record.mimetype not in ('application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
                raise UserError('Analytic table attachments must be in .csv or .xlsx format')
            record.analytic = True
        return record
