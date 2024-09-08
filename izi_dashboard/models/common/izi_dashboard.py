# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import api, models, fields, _
from odoo.exceptions import ValidationError
from random import randint

class IZIDashboardFilter(models.Model):
    _name = 'izi.dashboard.filter'
    _description = 'IZI Dashboard Filter'
    
    name = fields.Char(required=True)
    dashboard_id = fields.Many2one('izi.dashboard', string="Dashboard", required=True, ondelete='cascade')
    selection_type = fields.Selection([('single', 'Single'), ('multiple', 'Multiple')], string="Selection Type", required=True)
    source_type = fields.Selection([('model', 'Model'), ('table', 'Table'), ('predefined', 'Predefined')], string="Source Type", required=True)
    table_id = fields.Many2one('izi.table', string="Table")
    table_field_id = fields.Many2one('izi.table.field', string="Field")
    model_id = fields.Many2one('ir.model', string="Model")
    model_field_id = fields.Many2one('ir.model.fields', string="Field Model")
    model_field_values = fields.Selection([('id', 'Use ID'), ('field', 'Use Field Values')], default='field', string="Field Values")
    query_special_variable = fields.Char(string="Query Special Variable")
    value_ids = fields.Many2many('izi.dashboard.filter.value', string="Values")
    filter_analysis_ids = fields.One2many('izi.dashboard.filter.analysis', 'filter_id', string="Filter Analysis")
    
    @api.model
    def fetch_values(self, params, query=''):
        limit = params.get('limit', 10)
        text_field = params.get('textField', 'name')
        field = text_field
        model = params.get('model', False)
        table = params.get('table', False)
        db_query = params.get('dbQuery', False)
        filter_id = params.get('filterId', False)
        filter = False
        field_type = False
        if filter_id:
            filter = self.env['izi.dashboard.filter'].browse(filter_id)
            if filter.table_field_id:
                field_type = filter.table_field_id.field_type
        if not table and model:
            table = model.replace('.', '_')
        if not table and db_query:
            table = ' (%s) table_query ' % (db_query.replace(';', ''))

        res = []
        if model:
            model_field = self.env['ir.model.fields'].search([('model_id', '=', model), ('name', '=', field)], limit=1)
            if model_field.ttype == 'many2one':
                model = model_field.relation
                table = model.replace('.', '_')
                field = 'name'
                text_field = 'name as %s' % (text_field)
            if not model_field.store:
                res = self.env[model].search_read([(field, 'ilike', query)], ['id', field], limit=10)
                return res
        if params.get('sourceType') == 'model' and params.get('modelFieldValues') == 'id':
            self.env.cr.execute('''
                SELECT
                    id, %s
                FROM %s
                WHERE
                    %s ILIKE '%%%s%%'
                GROUP BY id, %s
                LIMIT %s
            ''' % (text_field, table, field, query, field, limit))
            res = self.env.cr.dictfetchall()
        else:
            if field_type == 'number':
                if not query:
                    self.env.cr.execute('''
                        SELECT
                            %s
                        FROM %s
                        GROUP BY %s
                        LIMIT %s
                    ''' % (text_field, table, field, limit))
                    res = self.env.cr.dictfetchall()
                else:
                    self.env.cr.execute('''
                        SELECT
                            %s
                        FROM %s
                        WHERE
                            %s = '%s'
                        GROUP BY %s
                        LIMIT %s
                    ''' % (text_field, table, field, query, field, limit))
                    res = self.env.cr.dictfetchall()
            else:
                self.env.cr.execute('''
                    SELECT
                        %s
                    FROM %s
                    WHERE
                        %s ILIKE '%%%s%%'
                    GROUP BY %s
                    LIMIT %s
                ''' % (text_field, table, field, query, field, limit))
                res = self.env.cr.dictfetchall()
        return res

    def fetch_by_dashboard(self, dashboard_id):
        res = []
        filters = self.env['izi.dashboard.filter'].search([('dashboard_id', '=', dashboard_id)]) 
        for filter in filters:
            filter_vals = {
                'id': filter.id,
                'name': filter.name,
                'selection_type': filter.selection_type,
                'source_type': filter.source_type,
            } 
            values = [] 
            if filter.source_type == 'model':
                model = filter.model_id.model
                model_field_name = filter.model_field_id.name
                filter_vals['params'] = {
                    'sourceType': filter.source_type,
                    'model': model,
                    'table': model.replace('.', '_'),
                    'textField': model_field_name,
                    'fields': ['id', model_field_name],
                    'domain': [],
                    'limit': 10,
                    'modelFieldValues': filter.model_field_values,
                    'filterId': filter.id,
                }
            elif filter.source_type == 'table':
                table_field_name = filter.table_field_id.field_name
                filter_vals['params'] = {
                    'sourceType': filter.source_type,
                    'model': filter.table_id.model_id.model,
                    'table': filter.table_id.table_name,
                    'dbQuery': filter.table_id.db_query,
                    'textField': table_field_name,
                    'fields': ['id', table_field_name],
                    'domain': [],
                    'limit': 10,
                    'modelFieldValues': 'field',
                    'filterId': filter.id,
                }
            elif filter.source_type == 'predefined':
                for filter_value in filter.value_ids:
                    values.append({
                        'name': filter_value.name,
                        'value': filter_value.value or filter_value.name,
                        'id': filter_value.value or filter_value.name,
                    })
            filter_vals['values'] = values
            res.append(filter_vals)
        return res

class IZIDashboardFilterValue(models.Model):
    _name = 'izi.dashboard.filter.value'
    _description = 'IZI Dashboard Filter Value'
    
    filter_id = fields.Many2one('izi.dashboard.filter', string="Filter")
    name = fields.Char(string="Name")
    value = fields.Char(string="Value")

class IZIDashboardFilterAnalysis(models.Model):
    _name = 'izi.dashboard.filter.analysis'
    _description = 'IZI Dashboard Filter Analysis'
    
    name = fields.Char(string="Name")
    
    filter_id = fields.Many2one('izi.dashboard.filter', string="Filter", required=True, ondelete='cascade')
    dashboard_id = fields.Many2one('izi.dashboard', related='filter_id.dashboard_id')
    allowed_analysis_ids = fields.Many2many('izi.analysis', related='dashboard_id.analysis_ids', string='Allowed Analysis')
    analysis_id = fields.Many2one('izi.analysis', string="Analysis", required=True, ondelete='cascade')
    table_id = fields.Many2one('izi.table', string="Table", related='analysis_id.table_id')
    allowed_field_ids = fields.One2many('izi.table.field', string="Analysis Fields", related='table_id.field_ids')
    field_id = fields.Many2one('izi.table.field', string="Field", required=True)
    operator = fields.Selection([('=', '='), ('!=', '!='), ('>', '>'), ('>=', '>='), ('<', '<'), ('<=', '<='), ('like', 'like'), ('ilike', 'ilike'), ('in', 'in'), ('not in', 'not in')], default='=', string="Operator", required=True)

class IZIAnalysis(models.Model):
    _inherit = 'izi.analysis'
    
    filter_analysis_ids = fields.One2many('izi.dashboard.filter.analysis', 'analysis_id', string="Filter Analysis")

class IZIDashboard(models.Model):
    _name = 'izi.dashboard'
    _description = 'IZI Dashboard'
    _order = 'sequence,id'

    def _default_theme(self):
        default_theme = False
        try:
            default_theme = self.env.ref('izi_dashboard.izi_dashboard_theme_colorful').id
        except Exception as e:
            pass
        return default_theme

    name = fields.Char('Name', required=True)
    block_ids = fields.One2many(comodel_name='izi.dashboard.block',
                                inverse_name='dashboard_id', string='Dashboard Blocks')
    theme_id = fields.Many2one(comodel_name='izi.dashboard.theme', string='Theme', default=_default_theme)
    theme_name = fields.Char(related='theme_id.name', string='Theme Name')
    animation = fields.Boolean('Enable Animation', default=True)
    group_ids = fields.Many2many(comodel_name='res.groups', string='Groups')
    new_block_position = fields.Selection([
        ('top', 'Top'),
        ('bottom', 'Bottom'),
    ], default='top', string='New Chart Position', required=True)
    sequence = fields.Integer(string='Sequence')
    date_format = fields.Selection([
        ('today', 'Today'),
        ('this_week', 'This Week'),
        ('this_month', 'This Month'),
        ('this_year', 'This Year'),
        ('mtd', 'Month to Date'),
        ('ytd', 'Year to Date'),
        ('last_week', 'Last Week'),
        ('last_month', 'Last Month'),
        ('last_two_months', 'Last 2 Months'),
        ('last_three_months', 'Last 3 Months'),
        ('last_year', 'Last Year'),
        ('last_10', 'Last 10 Days'),
        ('last_30', 'Last 30 Days'),
        ('last_60', 'Last 60 Days'),
        ('custom', 'Custom Range'),
    ], default=False, string='Date Filter')
    start_date = fields.Date('Start Date')
    end_date = fields.Date('End Date')
    menu_ids = fields.One2many('ir.ui.menu', 'dashboard_id', string='Menus')
    refresh_interval = fields.Integer('Refresh Interval in Seconds')
    filter_ids = fields.One2many('izi.dashboard.filter', 'dashboard_id', string="Filters")
    analysis_ids = fields.Many2many('izi.analysis', 'izi_dashboard_block', 'dashboard_id', 'analysis_id', string='Analysis')
    rtl = fields.Boolean('RTL (Right to Left)', default=False)

    @api.model
    def get_user_groups(self):
        manager_dashboard = self.env.ref('izi_dashboard.group_manager_dashboard')
        manager_analysis = self.env.ref('izi_data.group_manager_analysis')
        user_groups = self.env.user.groups_id
        user_dashboard = {
            'user_group_dashboard': 'Manager' if manager_dashboard.id in user_groups.ids else 'User',
            'user_group_analysis': 'Manager' if manager_analysis.id in user_groups.ids else 'User'
        }
        return user_dashboard

    def write(self, vals):
        if vals.get('refresh_interval', False) and vals.get('refresh_interval') < 10:
            raise ValidationError('Refresh interval have to be more than 10 seconds')
        res = super(IZIDashboard, self).write(vals)
        return res
    
    def action_save_and_close(self):
        return True

    def action_duplicate(self):
        self.ensure_one()
        self.copy({
            'name': '%s #%s' % (self.name, str(randint(1, 100000))),
        })


class IrMenu(models.Model):
    _inherit = 'ir.ui.menu'

    dashboard_id = fields.Many2one('izi.dashboard', string='Dashboard')
    
    @api.model
    def create(self, vals):
        rec = super(IrMenu, self).create(vals)
        if rec.dashboard_id:
            action = self.env['ir.actions.act_window'].create({
                'res_model': 'izi.dashboard',
                'target': 'current',
                'view_mode': 'izidashboard',
                'context': '''{'dashboard_id': %s}''' % (rec.dashboard_id.id)
            })
            rec.action = 'ir.actions.act_window,%s' % action.id
        return rec