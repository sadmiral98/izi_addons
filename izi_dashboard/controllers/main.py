# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah

from odoo import http, fields
from datetime import timedelta
from odoo.http import request
import json
import string
import random
def token_generator(size=32, chars=string.ascii_lowercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

class DashboardWebsiteController(http.Controller):
    def make_error_response(self, status, error, error_descrip):
        return request.make_response(json.dumps({
            'data': {
                'error': error,
                'error_descrip': error_descrip,
            },
            'code': status,
        }, default=str), headers=[
            ('Content-Type', 'application/json'),
        ])

    def make_valid_response(self, body):
        return request.make_response(json.dumps({
            'data': body,
            'code': 200
        }, default=str), headers=[
            ('Content-Type', 'application/json'),
        ])
    
    @http.route('/izi/dashboard/<int:dashboard_id>/token', auth='public', type='http', cors='*', csrf=False)
    def get_access_token(self, dashboard_id, **kw):
        # Get System Parameter: Access Key
        access_key = request.env['ir.config_parameter'].sudo().get_param('izi_dashboard.access_key')
        if not access_key:
            return self.make_error_response(500, 'Error', 'Access Key is not set. Dashboard access is not allowed!')
        # Get HTTP Headers Access Key
        request_access_key = request.httprequest.headers.get('Access-Key', '')
        if request_access_key != access_key:
            return self.make_error_response(401, 'Unauthorized', 'Access Key is Not Valid')
        
        # Whitelist IP Address
        ip_address = request.httprequest.remote_addr
        whitelist_ip_addresses = request.env['ir.config_parameter'].sudo().get_param('izi_dashboard.whitelist_ip_addresses')
        if whitelist_ip_addresses:
            whitelist_ip_addresses = whitelist_ip_addresses.split(',')
            whitelist_ip_addresses = [ip.strip() for ip in whitelist_ip_addresses]
            if ip_address not in whitelist_ip_addresses:
                return self.make_error_response(401, 'Unauthorized', 'IP Address is Not Allowed')
        
        # If Valid, Generate Access Token
        # Generate 16 character Random String
        # Expired in 1 Hour
        access_token = request.env['izi.dashboard.token'].sudo().create({
            'name': 'Dashboard Access Token',
            'token': token_generator(),
            'is_active': True,
            'dashboard_id': int(dashboard_id),
            'expired_date': fields.Datetime.now() + timedelta(hours=1),
        })
        return self.make_valid_response({
            'access_token': access_token.token,
            'expired_date': access_token.expired_date,
        })
    
    @http.route('/izi/dashboard/<int:dashboard_id>/page', auth='public', type='http', website=True, cors='*', csrf=False)
    def get_dashboard_page(self, dashboard_id, **kw):
        return request.render('izi_dashboard.dashboard_page', {
            'dashboard_id': dashboard_id,
            'access_token': kw.get('access_token'),
            'kwargs_string': json.dumps(kw),
        })
    
    @http.route('/izi/dashboard/<int:dashboard_id>', auth='public', type='http', cors='*', csrf=False)
    def get_dashboard(self, dashboard_id, **kw):
        # Get System Parameter
        access_token = request.env['izi.dashboard.token'].sudo().search([('expired_date', '>=', fields.Datetime.now()), ('dashboard_id', '=', dashboard_id), ('is_active', '=', True), ('token', '=', kw.get('access_token', ''))], limit=1)
        if not access_token:
            return self.make_error_response(401, 'Unauthorized', 'Invalid or Expired Access Token')
        # access_token.is_active = False
        request.env.cr.commit()
        
        if not dashboard_id:
            return self.make_error_response(500, 'Error', 'Dashboard ID is Required')
        dashboard = request.env['izi.dashboard'].sudo().browse(dashboard_id)
        # Search Read Dashboard Block By Dashboard Id
        blocks = request.env['izi.dashboard.block'].sudo().search_read(
            domain=[['dashboard_id', '=', dashboard_id]],
            fields=['id', 'gs_x', 'gs_y', 'gs_w', 'gs_h', 'min_gs_w', 'min_gs_h', 'analysis_id', 'animation', 'refresh_interval', 'visual_type_name', 'rtl'],
        )
        data = {
            'theme_name': dashboard.theme_name,
            'blocks': blocks,
        }
        return self.make_valid_response(data)

    @http.route('/izi/analysis/<int:analysis_id>/data', auth='public', type='http', cors='*', csrf=False)
    def get_analysis_data(self, analysis_id, **kw):
        # Get System Parameter
        access_token = request.env['izi.dashboard.token'].sudo().search([('expired_date', '>=', fields.Datetime.now()), ('is_active', '=', True), ('token', '=', kw.get('access_token', ''))], limit=1)
        if not access_token:
            return self.make_error_response(401, 'Unauthorized', 'Invalid or Expired Access Token')
        
        if not analysis_id:
            return self.make_error_response(500, 'Error', 'Analysis ID is required')
        analysis = request.env['izi.analysis'].sudo().browse(analysis_id)
        if not analysis:
            return self.make_error_response(500, 'Error', 'Analysis not found')
        filters = {}
        for key in kw:
            if key != 'access_token':
                filters[key] = kw[key]
        result = analysis.get_analysis_data_dashboard(**{'filters': filters})
        return self.make_valid_response(result)

    @http.route('/izi/dashboard/server_action', type='http', auth='public', methods=['POST'], csrf=False)
    def server_action_handler(self, **kw):
        json_string = (request.httprequest.data).decode('utf-8')
        data = json.loads(json_string)
        cron = request.env['ir.actions.server'].search([('name', '=', data.get('name', ''))])
        if cron:
            cron.with_context(data.get('context', {})).run()