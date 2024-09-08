from odoo import http
from odoo.http import request
from odoo.addons.sale.controllers.portal import CustomerPortal

class IZILabPortal(CustomerPortal):
    def _prepare_portal_layout_values(self):
        response = super(IZILabPortal, self)._prepare_portal_layout_values()
        if request.env.user and request.env.user.izi_lab_api_key:
            response.update({
                'izi_lab_api_key': request.env.user.izi_lab_api_key,
                'izi_lab_subscription_expiration_date': request.env.user.izi_lab_subscription_expiration_date,
            })
        return response