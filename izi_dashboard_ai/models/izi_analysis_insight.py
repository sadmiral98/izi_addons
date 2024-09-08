from odoo import models, fields, api, _
from odoo.exceptions import UserError

class IZIAnalysisInsight(models.Model):
    _name = 'izi.analysis.insight'

    izi_lab_api_key = fields.Char('IZI Lab API Key')
    analysis_name = fields.Char('Analysis Name')
    drilldown_level = fields.Integer('Level')
    languange = fields.Char('Languange')
    content = fields.Text('Content')

