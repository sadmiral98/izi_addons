# -*- coding: utf-8 -*-
from odoo import http, _, fields
from odoo.http import *
from odoo.http import request

class IZIController(http.Controller):
    def check_api_key(self, izi_lab_api_key):
        res = {
            'status': 200,
            'message': 'OK',
        }
        if izi_lab_api_key:
            user = request.env['res.users'].sudo().search([('izi_lab_api_key', '=', izi_lab_api_key)])
            if not user:
                res = {
                    'status': 401,
                    'message': 'API key is invalid. Please recheck your API key and your subscription status on your IZI Lab Account.',
                }
            else:
                if not user.izi_lab_subscription_expiration_date:
                    res = {
                        'status': 401,
                        'message': 'You do not have any subscription yet. Please activate your subscription in your IZI Lab Account to access IZI Analytic Dashboard premium features.',
                    }
                
                elif user.izi_lab_subscription_expiration_date <= fields.Date.today():
                    res = {
                        'status': 401,
                        'message': 'Your subscription has expired. Please continue your subscription in your IZI Lab Account to access IZI Analytic Dashboard premium features.',
                    }
        else:
            res = {
                'status': 401,
                'message': 'API key is invalid. Please recheck your API key and your subscription status on your IZI Lab Account.',
            }
        return res
    
    @http.route('/lab/companion/submit', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def post_submit_to_companion(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            table_keywords = body.get('table_keywords', '')
            params = body.get('params', {})
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            
            # Handle Query
            result, query_type, params = request.env['izi.ai.query.master'].sudo().handle_query(messages, params)
            res = {
                'status': 200,
                'new_message_content': result,
                'query_type': query_type,
                'params': params,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res

    @http.route('/lab/companion/get_embedding', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_companion_embedding(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            result = request.env['izi.ai.query.master'].sudo().get_embedding(messages)
            if result:
                res = {
                    'status': 200,
                    'result': str(result),
                }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res