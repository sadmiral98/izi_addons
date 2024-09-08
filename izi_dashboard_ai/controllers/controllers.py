# -*- coding: utf-8 -*-
from odoo import http, _, fields
from odoo.http import *
from odoo.http import request

class IZIController(http.Controller):
    @http.route('/lab/analysis', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis(self, **kw):
        res = []
        body = request.jsonrequest
        domain = [('method', '!=', 'kpi'), ('premium', '=', True)]
        if body.get('query'):
            domain.append(('name', 'ilike', body.get('query')))
        analysis = request.env['izi.analysis'].sudo().search(domain, limit=10)
        for al in analysis:
            res.append({
                'id': al.id,
                'name': al.name,
                'category': al.category_id.name if al.category_id else 'General',
                'visual_type': al.visual_type_id.name if al.visual_type_id else '',
                'visual_type_icon': al.visual_type_id.icon if al.visual_type_id else '',
                'premium': 'Premium' if al.premium else False,
            })
        return res
    
    @http.route('/lab/analysis/<int:analysis_id>/config', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_config(self, analysis_id, **kw):
        res = {}
        body = request.jsonrequest
        izi_lab_api_key = body.get('izi_lab_api_key')
        try:
            if analysis_id == 0 and body.get('name'):
                res_check = self.check_api_key(izi_lab_api_key)
                if res_check.get('status') != 200:
                    return res_check
                keyword = body.get('name')
                res = request.env['izi.dashboard'].sudo().get_ai_search(keyword)
                if res and res.get('status') == 200 and res.get('config'):
                    config = res.get('config')
                    res = {
                        'status': 200,
                        'config': config,
                    }
                else:
                    res = {
                        'status': 500,
                        'message': res.get('message'),
                    }
            elif analysis_id > 0:
                analysis = request.env['izi.analysis'].sudo().browse(analysis_id)
                if analysis and analysis.premium:
                    res_check = self.check_api_key(izi_lab_api_key)
                    if res_check.get('status') != 200:
                        return res_check
                config = analysis.get_config()
                res = {
                    'status': 200,
                    'config': config,
                }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
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
    
    @http.route('/lab/check', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def post_check_api_key(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            res = {
                'status': 200,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res

    @http.route('/lab/analysis/description', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_description(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            description = request.env['izi.analysis'].sudo().get_ai_description(body)
            res = {
                'status': 200,
                'description': description,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res

    @http.route('/lab/analysis/insight', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_insight(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check

            drilldown_level = body.get('drilldown_level')
            languange = body.get('languange')
            analysis_name = body.get('analysis_name')
            insight_model = request.env['izi.analysis.insight'].sudo()
            result,parent = request.env['izi.analysis'].sudo().get_ai_insight(body)
            insight_model.sudo().create({
                'izi_lab_api_key' : body.get('izi_lab_api_key'),
                'analysis_name' : analysis_name,
                'drilldown_level' : drilldown_level,
                'languange' : languange,
                'content' : result
            })

            res = {
                'status': 200,
                'result': result,
                'parent': parent
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/ai/speech/text', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_ai_speech_text(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            ai_speech_text = request.env['izi.analysis'].sudo().get_ai_speech_text(body['data'])
            res = {
                'status': 200,
                'ai_speech_text': ai_speech_text,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/ai/speech', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_ai_speech(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            ai_speech = request.env['izi.analysis'].sudo().get_ai_speech(body)
            res = {
                'status': 200,
                'ai_speech': ai_speech,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    

    @http.route('/lab/analysis/explore', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_explore(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            explore = request.env['izi.analysis'].sudo().get_analysis_explore(body)
            res = {
                'status': 200,
                'explore': explore,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/script', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_script(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            script_type = body.get('script_type')
            origin_code = body.get('origin_code')
            last_generated_code = body.get('last_generated_code')
            last_error_message = body.get('last_error_message')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            code = request.env['izi.analysis'].sudo().get_ai_script(script_type, origin_code, last_generated_code, last_error_message)
            res = {
                'status': 200,
                'code': code,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/decide', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_decide(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            table_keywords = body.get('table_keywords', '')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            result = request.env['izi.analysis'].sudo().get_ai_ask_decide(table_keywords, messages)
            res = {
                'status': 200,
                'result': result,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res

    @http.route('/lab/analysis/generate_answer', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_generate_answer(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            language = body.get('language', False)
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            new_message_content = request.env['izi.analysis'].sudo().get_ai_generate_answer(messages, language)
            res = {
                'status': 200,
                'new_message_content': new_message_content,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    @http.route('/lab/analysis/answer_by_knowledge', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_answer_by_knowledge(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            knowledge = body.get('knowledge', '')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            new_message_content = request.env['izi.analysis'].sudo().get_ai_answer_by_knowledge(messages, knowledge)
            res = {
                'status': 200,
                'new_message_content': new_message_content,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    @http.route('/lab/analysis/action', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_action(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            table_information = body.get('table_information', '')
            language = body.get('language', False)
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            new_message_content = request.env['izi.analysis'].sudo().get_ai_action_python(messages, table_information, language)
            res = {
                'status': 200,
                'new_message_content': new_message_content,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/ask', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_ask(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            messages = body.get('messages')
            table_information = body.get('table_information', '')
            table_prompt = body.get('table_prompt', '')
            language = body.get('language', False)
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            new_message_content = request.env['izi.analysis'].sudo().get_ai_ask(messages, table_information, table_prompt, language)
            res = {
                'status': 200,
                'new_message_content': new_message_content,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/ask/explain', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_ask_explain(self, **kw):
        res = {}
        body = request.jsonrequest
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            question = body.get('question', '')
            data = body.get('data', '')
            language = body.get('language', False)
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            new_message_content = request.env['izi.analysis'].sudo().get_ai_ask_explain(question, data, language)
            res = {
                'status': 200,
                'new_message_content': new_message_content,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res
    
    @http.route('/lab/analysis/create', auth='public', method=['POST'], csrf=False, type='json', cors='*')
    def get_analysis_create(self, **kw):
        res = {}
        body = request.jsonrequest
        data = body.get('data', {})
        try:
            izi_lab_api_key = body.get('izi_lab_api_key')
            res_check = self.check_api_key(izi_lab_api_key)
            if res_check.get('status') != 200:
                return res_check
            result = request.env['izi.analysis'].sudo().get_analysis_create(data)
            res = {
                'status': 200,
                'result': result,
            }
        except Exception as e:
            res = {
                'status': 500,
                'message': str(e),
            }
        return res