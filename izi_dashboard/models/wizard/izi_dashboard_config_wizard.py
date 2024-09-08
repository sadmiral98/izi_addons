from odoo import fields, models, api, _
from odoo.exceptions import UserError
import json
import base64
from datetime import datetime
import re

CODE_TEMPLATE = '''[
    {   
        "source": "Odoo",
        "name": "Total Partner By City By Company",
        "description": "This analysis shows total partner by city in each company. The purposes of the analysis are to give users information about how many partner and help them distribute workforce to handle the partners", 
        "method": "model",
        "table": "res_partner",
        "limit": 100,
        "domain": [["id", "<", 1000]],
        "visual_type": "pie",
        "metrics": [
            {
                "calculation": "count",
                "field": "id"
            }
        ],
        "dimensions": [
            {
                "field": "city"
            },
            {
                "field": "company_id"
            }
        ],
        "sorts": [
            {
                "field": "city",
                "sort": "asc"
            }
        ],
        "xywh": [0, 0, 4, 4]
    },
    {
        "source": "Odoo",
        "name": "Total Daily Registered Partner",
        "description": "This analysis shows total daily registered partner. The benefit of the analysis is to show the increase / decrease of registered partner in a period of time.", 
        "method": "query",
        "query": "SELECT COUNT(id) as total, create_date as date FROM res_partner GROUP BY create_date;",
        "limit": 0,
        "visual_type": "line",
        "metrics": [
            {
                "calculation": "sum",
                "field": "total"
            }
        ],
        "dimensions": [
            {
                "field": "date",
                "format": "day"
            }
        ],
        "sorts": [
            {
                "field": "date",
                "sort": "asc"
            }
        ],
        "xywh": [0, 0, 4, 4]
    }
]
'''

class IZIDashboardConfigWizard(models.TransientModel):
    _name = 'izi.dashboard.config.wizard'
    _description = 'IZI Dashboard Config Wizard'

    dashboard_id = fields.Many2one('izi.dashboard', string="Dashboard", required=True, ondelete='cascade')
    code = fields.Char('Code', required=False, default=CODE_TEMPLATE)
    code_file = fields.Binary('Code File', required=False)
    code_filename = fields.Char('Filename', required=False)

    def process_wizard(self, data=False):
        res = {
            'status': 200,
            'successes': [],
            'errors': [],
        }
        try:
            if not data:
                if self.code_file:
                    data = json.loads(base64.decodestring(self.code_file).decode('utf-8'))
                elif self.code:
                    data = json.loads(self.code)
        except Exception as e:
            raise UserError(str(e))
        if data:
            # Check If Data Is List
            if not isinstance(data, list):
                data = [data]
            # Create Analysis and Dashboard Block
            x = 0
            y = 50
            for dt in data:
                try:
                    self.env.cr.commit()
                    if dt['method'] == 'model':
                        # Table
                        table_name = dt.get('table_name')
                        table = self.env['izi.table'].search([('table_name', '=', table_name)], limit=1)
                        if not table:
                            raise UserError(_('Table %s Not Found') % table_name)
                        if not table.model_id:
                            raise UserError(_('Table %s Has No Model') % table_name)
                        model_id = table.model_id.id
                        table_model_id = table.id
                    elif dt['method'] == 'query':
                        db_query = dt.get('query')

                    # Source
                    source_name = dt.get('source')
                    source = self.env['izi.data.source'].search([('name', '=', source_name)], limit=1)
                    if not source:
                        raise UserError(_('Source %s Not Found') % source_name)
                    
                    # Check If Analysis Name Already Exist
                    # dt['name'] = dt.get('name').strip() + ' ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    analysis = self.env['izi.analysis'].search([('name', '=', dt.get('name'))], limit=1)
                    # analysis = False
                    
                    # Visual Type
                    visual_type_name = dt.get('visual_type')
                    visual_type = self.env['izi.visual.type'].search([('name', '=', visual_type_name)], limit=1)
                    if not visual_type:
                        raise UserError(_('Visual Type %s Not Found') % visual_type_name)

                    analysis_vals = {
                        'name': dt.get('name'),
                        'source_id': source.id,
                        'method': dt.get('method'),
                        'limit': dt.get('limit'),
                        'domain': dt.get('domain'),
                        'visual_type_id': visual_type.id,
                        'use_render_visual_script': dt.get('use_render_visual_script'),
                        'render_visual_script': dt.get('render_visual_script'),
                    }
                    if dt['method'] == 'model':
                        analysis_vals['table_id'] = table.id
                        analysis_vals['model_id'] = model_id
                        analysis_vals['table_id'] = table_model_id
                    elif dt['method'] == 'query':
                        analysis_vals['db_query'] = db_query
                        if not analysis:
                            analysis = self.env['izi.analysis'].create(analysis_vals)
                        else:
                            analysis.write(analysis_vals)
                        analysis.build_query()
                        table = analysis.table_id
                        analysis_vals = {}
                    elif dt['method'] == 'table_view':
                        table_name = dt.get('table_name')
                        table = self.env['izi.table'].search([('name', '=', table_name)], limit=1)
                        if not table:
                            if dt.get('query'):
                                table = self.env['izi.table'].create({
                                    'name': table_name,
                                    'source_id': source.id,
                                    'db_query': dt.get('query'),
                                })
                                table.get_table_fields()
                                analysis_vals['db_query'] = dt.get('query')
                        analysis_vals['table_id'] = table.id
                        if not analysis:
                            analysis = self.env['izi.analysis'].create(analysis_vals)
                        else:
                            analysis.write(analysis_vals)
                        analysis.build_query()

                    # Metrics
                    metrics_values = []
                    for metric in dt.get('metrics'):
                        field_name = metric.get('field')
                        if not field_name:
                            continue
                        field = self.env['izi.table.field'].search([('field_name', '=', field_name), ('table_id', '=', table.id)], limit=1)
                        if not field:
                            continue
                            raise UserError(_('Field %s Not Found') % field_name)
                        metrics_values.append((0, 0, {
                            'calculation': metric.get('calculation'),
                            'field_id': field.id,
                        }))
                    analysis_vals['metric_ids'] = metrics_values

                    # Date Field
                    date_field_name = dt.get('date_field')
                    if date_field_name:
                        date_field = self.env['izi.table.field'].search([('field_name', '=', date_field_name), ('table_id', '=', table.id)], limit=1)
                        if date_field:
                            analysis_vals['date_field_id'] = date_field.id
                    
                    # Dimensions
                    dimensions_values = []
                    for dimension in dt.get('dimensions'):
                        field_name = dimension.get('field')
                        if not field_name:
                            continue
                        field = self.env['izi.table.field'].search([('field_name', '=', field_name), ('table_id', '=', table.id)], limit=1)
                        if not field:
                            continue
                            raise UserError(_('Field %s Not Found') % field_name)
                        # Check If Field Is Date or Datetime
                        if field.field_type == 'date' or field.field_type == 'datetime':
                            dimensions_values = [(0, 0, {
                                'field_id': field.id,
                                'field_format': dimension.get('format') if dimension.get('format') in ['day', 'week', 'month', 'year'] else False,
                            })] + dimensions_values
                            if not analysis_vals.get('date_field_id'):
                                analysis_vals['date_field_id'] = field.id
                        else:
                            dimensions_values += [(0, 0, {
                                'field_id': field.id,
                                'field_format': dimension.get('format') if dimension.get('format') in ['day', 'week', 'month', 'year'] else False,
                            })]
                    if dimensions_values:
                        analysis_vals['dimension_ids'] = dimensions_values
                    elif not dimensions_values and visual_type.name in ['pie', 'bar', 'line']:
                        raise UserError(_('Visual Type %s Must Have At Least One Dimension') % visual_type.name)

                    # Sorts
                    sorts_values = []
                    for sort in dt.get('sorts'):
                        field_name = sort.get('field')
                        if not field_name:
                            continue
                        field = self.env['izi.table.field'].search([('field_name', '=', field_name), ('table_id', '=', table.id)], limit=1)
                        if not field:
                            continue
                            raise UserError(_('Field %s Not Found') % field_name)
                        sorts_values.append((0, 0, {
                            'field_id': field.id,
                            'sort': sort.get('sort'),
                        }))
                    if sorts_values:
                        analysis_vals['sort_ids'] = sorts_values
                    if not analysis:
                        analysis = self.env['izi.analysis'].create(analysis_vals)
                    else:
                        analysis.metric_ids.unlink()
                        analysis.dimension_ids.unlink()
                        analysis.sort_ids.unlink()
                        analysis.write(analysis_vals)
                    
                    # Check Dashboard Block
                    block = self.env['izi.dashboard.block'].search([('analysis_id', '=', analysis.id), ('dashboard_id', '=', self.dashboard_id.id)], limit=1)
                    if not block:
                        block_vals = {
                            'analysis_id': analysis.id,
                            'dashboard_id': self.dashboard_id.id,
                            'gs_x': x,
                            'gs_y': y,
                            'gs_w': dt.get('xywh')[2],
                            'gs_h': dt.get('xywh')[3],
                        }
                        x += 6
                        if x >= 12:
                            x = 0
                            y += 4
                        self.env['izi.dashboard.block'].create(block_vals)
                    res['successes'].append({
                        'name': dt.get('name'),
                    })
                    self.env.cr.commit()
                except Exception as e:
                    self.env.cr.rollback()
                    res['errors'].append({
                        'name': dt.get('name'),
                        'error': str(e),
                    })
                    continue
                    raise UserError(str(e))
        return res
