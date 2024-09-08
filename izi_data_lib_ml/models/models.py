from odoo import models, fields, api, _
from odoo.exceptions import UserError
import io
from io import StringIO, BytesIO
import pandas
import pycaret

class IZITools(models.TransientModel):
    _inherit = 'izi.tools'

    @api.model
    def lib(self, key):
        lib = {
            'pandas': pandas,
            'pycaret': pycaret,
        }
        if key in lib:
            return lib[key]
        return super(IZITools, self).lib(key)
    
    
    
