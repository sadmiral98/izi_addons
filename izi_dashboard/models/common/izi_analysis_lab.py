from odoo import models, fields, api, _
from odoo.exceptions import UserError
import requests

class IZIAnalysis(models.Model):
    _inherit = 'izi.analysis'

    ai_analysis_text = fields.Text('AI Analysis Text', default='There is no description yet.')
    ai_explore_analysis_ids = fields.One2many('izi.analysis', 'parent_analysis_id', string='AI Explore Analysis')
    parent_analysis_id = fields.Many2one('izi.analysis', string='Parent Analysis')

    def start_lab_analysis_explore(self):
        result = {
            'status': 200,
            'analysis_explore_ids': [],
        }
        res_explore_values = []
        izi_lab_url = self.env['ir.config_parameter'].sudo().get_param('izi_lab_url')
        if not izi_lab_url:
            raise UserError(_('Please set IZI Lab URL in System Parameters.'))
        ai_explore_data = {
            'table_name': self.table_id.name,
            'fields': [],
        }
        for field in self.table_id.field_ids:
            ai_explore_data['fields'].append({
                'field_name': field.field_name,
                'field_type': field.field_type,
            })
        try:
            res = requests.post('''%s/lab/analysis/explore''' % (izi_lab_url), json={
                'izi_lab_api_key': self.env.company.izi_lab_api_key,
                'data': ai_explore_data,
            }, timeout=120)
            res = res.json()
            if res.get('result') and res.get('result').get('status') == 200 and res.get('result').get('explore'):
                res_explore_values = res.get('result').get('explore')
            elif res.get('result') and res.get('result').get('status') and res.get('result').get('status') != 200:
                return {
                    'status': res.get('result').get('status'),
                    'message': res.get('result').get('message') or '',
                }
        except Exception as e:
            pass
        
        if not res_explore_values:
            res_explore_values = []
        analysis_explores = []
        existing_analysis_explore = self.env['izi.analysis'].search(['|', ('active', '=', False), ('active', '=', True), ('parent_analysis_id', '=', self.id)])
        existing_analysis_explore.unlink()
        index = 0
        for val in res_explore_values:
            metric_values = []
            sort_values = []
            if val.get('metrics'):
                for metric in val.get('metrics'):
                    metric_field_name = metric.get('field_name')
                    metric_calculation = metric.get('calculation')
                    metric_field = self.env['izi.table.field'].search([('table_id', '=', self.table_id.id), ('field_name', '=', metric_field_name)], limit=1)
                    if metric_field:
                        metric_values.append((0, 0, {
                            'field_id': metric_field.id,
                            'calculation': metric_calculation,
                        }))
                        sort_values.append((0, 0, {
                            'field_id': metric_field.id,
                            'sort': 'desc',
                        }))
            dimension_values = []
            if val.get('dimensions'):
                for dimension in val.get('dimensions'):
                    dimension_field_name = dimension.get('field_name')
                    dimension_field_format = dimension.get('field_format')
                    dimension_field = self.env['izi.table.field'].search([('table_id', '=', self.table_id.id), ('field_name', '=', dimension_field_name)], limit=1)
                    if dimension_field:
                        dimension_values.append((0, 0, {
                            'field_id': dimension_field.id,
                            'field_format': dimension_field_format,
                        }))
            visual_type_name = val.get('visual_type')
            visual_type = self.env['izi.visual.type'].search([('name', '=', visual_type_name)], limit=1)
            if metric_values and visual_type:
                index += 1
                new_analysis = self.copy({
                    'name': val.get('name'),
                    'metric_ids': metric_values,
                    'dimension_ids': dimension_values,
                    'sort_ids': sort_values,
                    'visual_type_id': visual_type.id,
                    'parent_analysis_id': self.id,
                    'limit': 5,
                    'active': False,
                })
                for vc in new_analysis.analysis_visual_config_ids:
                    if vc.visual_config_id.name == 'legendPosition':
                        vc.write({
                            'string_value': 'none',
                        })
                    if vc.visual_config_id.name == 'rotateLabel':
                        vc.write({
                            'string_value': 'true',
                        })
                analysis_explores.append({
                    'id': new_analysis.id,
                    'name': new_analysis.name,
                })
        return {
            'status': 200,
            'analysis_explores': analysis_explores,
        }
    
    def save_lab_analysis_explore(self, dashboard_id):
        for analysis in self:
            analysis.write({
                'active': True,
                'limit': 50,
                'parent_analysis_id': False,
            })
            for vc in analysis.analysis_visual_config_ids:
                if vc.visual_config_id.name == 'legendPosition':
                    vc.write({
                        'string_value': 'right',
                    })
            if dashboard_id:
                self.env['izi.dashboard.block'].create({
                    'dashboard_id': dashboard_id,
                    'analysis_id': analysis.id,
                })
        return True

    def action_get_lab_analysis_text(self, ai_analysis_data):
        result = {
            'status': 200,
            'ai_analysis_text': self.ai_analysis_text,
        }
        izi_lab_url = self.env['ir.config_parameter'].sudo().get_param('izi_lab_url')
        if not izi_lab_url:
            raise UserError(_('Please set IZI Lab URL in System Parameters.'))
        analysis_name = self.name
        visual_type_name = self.visual_type_id.name
        try:
            res = requests.post('''%s/lab/analysis/description''' % (izi_lab_url), json={
                'izi_lab_api_key': self.env.company.izi_lab_api_key,
                'analysis_name': analysis_name,
                'visual_type_name': visual_type_name,
                'data': ai_analysis_data,
            }, timeout=120)
            res = res.json()
            if res.get('result') and res.get('result').get('status') == 200 and res.get('result').get('description'):
                description = res.get('result').get('description')
                self.ai_analysis_text = description
            elif res.get('result') and res.get('result').get('status') and res.get('result').get('status') != 200:
                result = {
                    'status': res.get('result').get('status'),
                    'message': res.get('result').get('message') or '',
                }
        except Exception as e:
            pass
        result['ai_analysis_text'] = self.ai_analysis_text
        return result
    
    def action_get_lab_script(self, instruction):
        result = {
            'status': 200,
            'code': '',
        }
        izi_lab_url = self.env['ir.config_parameter'].sudo().get_param('izi_lab_url')
        if not izi_lab_url:
            raise UserError(_('Please set IZI Lab URL in System Parameters.'))
        try:
            res = requests.post('''%s/lab/analysis/script''' % (izi_lab_url), json={
                'izi_lab_api_key': self.env.company.izi_lab_api_key,
                'instruction': instruction,
            }, timeout=120)
            res = res.json()
            if res.get('result') and res.get('result').get('status') == 200 and res.get('result').get('code'):
                code = res.get('result').get('code')
                result['code'] = code
            elif res.get('result') and res.get('result').get('status') and res.get('result').get('status') != 200:
                result = {
                    'status': res.get('result').get('status'),
                    'message': res.get('result').get('message') or '',
                }
        except Exception as e:
            result = {
                'status': 400,
                'message': str(e),
            }
        return result
        