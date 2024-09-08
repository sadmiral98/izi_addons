from odoo import models, fields, api, _
from odoo.exceptions import UserError
import mysql.connector

class IZITools(models.TransientModel):
    _inherit = 'izi.tools'

    @api.model
    def lib(self, key):
        lib = {
           'mysql': mysql.connector,
        }
        if key in lib:
            return lib[key]
        return super(IZITools, self).lib(key)
    
