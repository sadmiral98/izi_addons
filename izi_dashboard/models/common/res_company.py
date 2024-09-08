from odoo import models, fields, api, _
from odoo.exceptions import UserError

class ResCompany(models.Model):
    _inherit = 'res.company'

    izi_lab_api_key = fields.Char('IZI Lab API Key')

class IZILabAPIKeyWizard(models.TransientModel):
    _name = 'izi.lab.api.key.wizard'
    _description = 'IZI Lab API Key Wizard'

    izi_lab_api_key = fields.Char('IZI Lab API Key')

    # Default Get
    def default_get(self, fields):
        res = super(IZILabAPIKeyWizard, self).default_get(fields)
        company = self.env.user.company_id
        res['izi_lab_api_key'] = company.izi_lab_api_key
        return res

    def action_update_izi_lab_api_key(self):
        company = self.env.user.company_id
        company.izi_lab_api_key = self.izi_lab_api_key
        return True
    
    def action_access_izi_lab(self):
        izi_lab_url = self.env['ir.config_parameter'].sudo().get_param('izi_lab_url')
        return {
            'type': 'ir.actions.act_url',
            'url': izi_lab_url + '/web/login',
            'target': 'new',
        }

    