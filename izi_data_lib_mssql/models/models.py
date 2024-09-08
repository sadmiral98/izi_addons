from odoo import models, fields, api, _
from odoo.exceptions import UserError
import pymssql

class IZITools(models.TransientModel):
    _inherit = 'izi.tools'

    @api.model
    def lib(self, key):
        lib = {
           'pymssql': pymssql,
        }
        if key in lib:
            return lib[key]
        return super(IZITools, self).lib(key)
