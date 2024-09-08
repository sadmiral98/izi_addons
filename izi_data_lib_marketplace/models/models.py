from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.addons.izi_shopee.objects.utils.shopee.api import ShopeeAPI

class IZITools(models.TransientModel):
    _inherit = 'izi.tools'

    @api.model
    def lib(self, key):
        lib = {
           'ShopeeAPI': ShopeeAPI,
        }
        if key in lib:
            return lib[key]
        return super(IZITools, self).lib(key)
    
