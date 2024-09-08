# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
import re

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from odoo.tools.safe_eval import safe_eval

DEFAULT_DB_QUERY = """
# -- Query example
# select
# 	rp.id,
# 	rp.name,
# 	rp.street,
# 	rp.city,
# 	rcs.name as state,
# 	rc.name as country,
# 	rcp.name as company,
# 	rp.create_date as create_date
# from
# 	res_partner rp
# left join res_company rcp on
# 	(rcp.id = rp.company_id)
# left join res_country_state rcs on
# 	(rcs.id = rp.state_id)
# left join res_country rc on
# 	(rc.id = rp.country_id);
"""

DEFAULT_PYTHON_CODE = """# Available variables:
#  - env: Odoo Environment on which the action is triggered
#  - model: Odoo Model of the record on which the action is triggered; is a void recordset
#  - record: record on which the action is triggered; may be void
#  - records: recordset of all records on which the action is triggered in multi-mode; may be void
#  - time, datetime, dateutil, timezone: useful Python libraries
#  - float_compare: Odoo function to compare floats based on specific precisions
#  - log: log(message, level='info'): logging function to record debug information in ir.logging table
#  - UserError: Warning Exception to use with raise
# To return an action, assign: action = {...}

# Using IZI Data Processing Tools
izi = env['izi.tools']
data = []
"""

DEFAULT_PYTHON_CODE_WITH_QUERY = """
res = izi.query_fetch('''%(db_query)s''')

izi.query_execute('TRUNCATE %(store_table_name)s')
for r in res:
  izi.query_insert('%(store_table_name)s', r)
"""

DEFAULT_GET_PYTHON_CODE = """%s
# # Query example
# start_datetime = izi_table.start_datetime;
# end_datetime = izi_table.end_datetime;

# query = '''
# select
# 	rp.id,
# 	rp.name,
# 	rp.street,
# 	rp.city,
# 	rcs.name as state,
# 	rc.name as country,
# 	rcp.name as company,
# 	rp.create_date as create_date
# from
# 	res_partner rp
# left join res_company rcp on
# 	(rcp.id = rp.company_id)
# left join res_country_state rcs on
# 	(rcs.id = rp.state_id)
# left join res_country rc on
# 	(rc.id = rp.country_id)
# where
#     rp.create_date >= '{start_datetime}'
#     and rp.create_date <= '{end_datetime}'
# '''.format(start_datetime=start_datetime, end_datetime=end_datetime);
# data = izi_table.get_data_query(query=query);
""" % DEFAULT_PYTHON_CODE

DEFAULT_DELETE_PYTHON_CODE = """%s
# # Field_date example
# field_date = 'create_date';

# start_datetime = izi_table.start_datetime;
# end_datetime = izi_table.end_datetime;

# condition_query = "WHERE {field_date} >= '{start_datetime}' AND {field_date} <= '{end_datetime}'".format(
#     field_date=field_date, start_datetime=start_datetime, end_datetime=end_datetime);

# izi_table.delete_store_table_data(condition_query=condition_query);
""" % DEFAULT_PYTHON_CODE

DEFAULT_INSERT_PYTHON_CODE = """%s
# izi_table.insert_store_table_data(data=data);
""" % DEFAULT_PYTHON_CODE

DEFAULT_GET_SAMPLE_PYTHON_CODE = """%s
# # You can use data result from a query, or using a map data-sample for ease the code 

# # Example using a map data sample
# data = [{
#     'id': 3,
#     'name': 'Mitchell Admin',
#     'street': '215 Vine St',
#     'city': 'Scranton',
#     'state': 'Pennsylvania',
#     'country': 'United States',
#     'company': 'YourCompany',
#     'create_date': '2022-04-24',
# }];

# # Example using a query
# start_datetime = izi_table.start_datetime;
# end_datetime = izi_table.end_datetime;

# query = '''
# select
# 	rp.id,
# 	rp.name,
# 	rp.street,
# 	rp.city,
# 	rcs.name as state,
# 	rc.name as country,
# 	rcp.name as company,
# 	rp.create_date as create_date
# from
# 	res_partner rp
# left join res_company rcp on
# 	(rcp.id = rp.company_id)
# left join res_country_state rcs on
# 	(rcs.id = rp.state_id)
# left join res_country rc on
# 	(rc.id = rp.country_id)
# where
#     rp.create_date >= '{start_datetime}'
#     and rp.create_date <= '{end_datetime}'
# '''.format(start_datetime=start_datetime, end_datetime=end_datetime);
# data = izi_table.get_data_query(query=query);
""" % DEFAULT_PYTHON_CODE


class IZITable(models.Model):
    _name = 'izi.table'
    _description = 'IZI Table'
    _order = 'name'

    DEFAULT_PYTHON_CODE_IDS = [
        (0, 0, {
            'name': 'Get Data Code',
            'sequence': 1,
            'type_code': 'get',
            'python_code': DEFAULT_GET_PYTHON_CODE,
        }),
        (0, 0, {
            'name': 'Delete Data Code',
            'sequence': 2,
            'type_code': 'delete',
            'python_code': DEFAULT_DELETE_PYTHON_CODE,
        }),
        (0, 0, {
            'name': 'Insert Data Code',
            'sequence': 3,
            'type_code': 'insert',
            'python_code': DEFAULT_INSERT_PYTHON_CODE,
        }),
        (0, 0, {
            'name': 'Get Sample Data Code',
            'sequence': 4,
            'type_code': 'get_sample',
            'python_code': DEFAULT_GET_SAMPLE_PYTHON_CODE,
        }),
    ]

    # Table Flags
    # 1. Existing Tables From Data Sources: table_name IS SET, user_defined FALSE, store_table_name = table_name
    # 2. User Defined Tables: table_name IS NOT SET, user_defined TRUE, is_stored TRUE, store_table_name IS SET
    # 3. Query: table_name IS NOT SET, user_defined TRUE, is_stored FALSE, store_table_name IS NOT SET,
    #    - Direct Query: is_query TRUE
    #    - Saved as Table View: is_query FALSE
    name = fields.Char(string='Name', required=True)
    table_name = fields.Char('Table Name')
    source_id = fields.Many2one('izi.data.source', string='Data Source', required=True, ondelete='cascade')
    model_id = fields.Many2one('ir.model', string='Model')
    field_ids = fields.One2many('izi.table.field', 'table_id', string='Fields')
    analysis_ids = fields.One2many(comodel_name='izi.analysis', inverse_name='table_id', string='Analysis')
    active = fields.Boolean('Active', default=True)
    db_query = fields.Text('Database Query', default='') #, default=DEFAULT_DB_QUERY
    is_query = fields.Boolean(string='Query', default=False)
    is_stored = fields.Boolean(string='Stored', default=False)
    store_table_name = fields.Char(string='Store Table Name', compute='get_store_table_name')

    cron_id = fields.Many2one(comodel_name='ir.cron', string='Scheduler')
    cron_user_id = fields.Many2one(comodel_name='res.users', string='Scheduler User',
                                   related='cron_id.user_id', readonly=False)
    cron_interval_number = fields.Integer(string='Execute Every', related='cron_id.interval_number', readonly=False)
    cron_nextcall = fields.Datetime(string='Next Execution', related='cron_id.nextcall', readonly=False)
    cron_interval_type = fields.Selection(string='Interval Type', related='cron_id.interval_type', readonly=False)
    cron_active = fields.Boolean(string='Is Active', related='cron_id.active', readonly=False)
    cron_code = fields.Text(string='Code', related='cron_id.code', readonly=False)

    store_interval = fields.Selection(string='Interval', selection=[
        ('custom', 'Custom'),
        ('today', 'Today'),
        ('yesterday', 'Yesterday'),
        ('this_week', 'This Week'),
        ('last_week', 'Last Week'),
        ('this_month', 'This Month'),
        ('last_month', 'Last Month'),
        ('this_year', 'This Year'),
        ('last_year', 'Last Year'),
    ], default='today', required=True)

    store_interval_custom_type = fields.Selection(string='Custom Type', selection=[
        ('datetime_range', 'Datetime Range'),
        ('unit_of_time', 'Unit of Time'),
    ], default='datetime_range')
    store_start_datetime = fields.Datetime(string='Start Date Range', default=datetime.today())
    store_end_datetime = fields.Datetime(string='End Date Range', default=datetime.today())
    store_unit_of_time = fields.Selection(string='Unit of Time', selection=[
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
        ('days', 'Days'),
        ('weeks', 'Weeks'),
        ('months', 'Months'),
        ('years', 'Years'),
    ], default='days')
    store_unit_of_time_value = fields.Integer(string='Unit of Time Value')

    start_datetime = fields.Char(string='Start Datetime', compute='get_start_datetime')
    end_datetime = fields.Char(string='End Datetime', compute='get_end_datetime')

    main_code = fields.Text(string='Main Code', related='cron_id.code', readonly=False)
    python_code_ids = fields.One2many(comodel_name='izi.table.python.code',
                                      inverse_name='table_id', string='Python Code')

    user_defined = fields.Boolean(string="User Defined", compute='get_user_defined')
    attachment_ids = fields.One2many('ir.attachment', 'table_id', string='Attachments')

    @api.constrains('name')
    def _constraint_name(self):
        for record in self:
            domain = [('name', '=', record.name), ('is_stored', '=', True)]
            if record.id:
                domain.append(('id', '!=', record.id))
            table_id = self.env['izi.table'].sudo().search(domain)
            if table_id:
                record.name = '%s_%s' % (record.name, record.id)

    @api.model
    def create(self, vals):
        # User Defined Stored Table Automatically Create Scheduler
        if 'is_stored' in vals:
            if vals.get('is_stored'):
                table_cron = self.env['ir.cron'].sudo().create({
                    'name': 'Scheduler %s' % vals.get('name'),
                    'model_id': self.env.ref('izi_data.model_izi_table').id,
                    'state': 'code',
                    'code': False,
                    'interval_number': 1,
                    'interval_type': 'days',
                    'numbercall': -1,
                    'active': False,
                    'code': DEFAULT_PYTHON_CODE,
                    'analytic': True,
                })
                vals.update({
                    'cron_id': table_cron.id,
                })
        rec = super(IZITable, self).create(vals)
        # User Defined Query / Table View Automatically Get Fields
        if rec.user_defined and not rec.is_stored:
            if 'db_query' in vals:
                rec.get_table_fields()
        # User Defined Stored Table
        if rec.user_defined and rec.is_stored:
            rec.update_schema_store_table()
        return rec

    def write(self, vals):
        exist_field_ids = self.field_ids
        # User Defined Stored Table Automatically Create Scheduler
        if 'is_stored' in vals:
            if self.is_stored and vals['is_stored'] is False:
                self.destroy_schema_store_table()
                if self.cron_id:
                    self.cron_id.write({
                        'active': False,
                    })
            elif not self.is_stored and vals['is_stored'] is True:
                table_cron = self.env['ir.cron'].sudo().create({
                    'name': 'Scheduler %s' % self.name,
                    'model_id': self.env.ref('%s.model_%s' % (self._module, '_'.join(self._name.split('.')))).id,
                    'state': 'code',
                    'code': False,
                    'interval_number': 1,
                    'interval_type': 'days',
                    'numbercall': -1,
                    'active': False,
                    'analytic': True,
                })
                vals.update({
                    'cron_id': table_cron.id,
                })
        res = super(IZITable, self).write(vals)
        # User Defined Query / Table View Automatically Get Fields
        if self.user_defined and not self.is_stored:
            if 'db_query' in vals:
                self.get_table_fields()
        return res

    def unlink(self):
        self.destroy_schema_store_table()
        if self.cron_id:
            self.cron_id.unlink()
        for analysis_id in self.analysis_ids:
            analysis_id.unlink()
        return super(IZITable, self).unlink()
    
    def create_store_table_from_view(self):
        self.ensure_one()
        if self.user_defined and not self.is_stored and self.db_query:
            store_name = 'Store %s' % self.name
            store_table_name = 'izi_%s' % (re.sub('[^A-Za-z0-9]+', '_', store_name.lower()))
            field_ids = []
            for field in self.field_ids:
                field_ids.append((0, 0, {
                    'name': field.name,
                    'field_name': field.field_name,
                    'field_type': field.field_type,
                    'field_type_origin_selection': field.field_type_origin,
                    'field_type_origin': field.field_type_origin,
                }))
            izi_table = self.copy({
                'name': store_name,
                'is_stored': True,
                'main_code': DEFAULT_PYTHON_CODE_WITH_QUERY % {
                    'store_table_name': store_table_name,
                    'db_query': self.db_query,
                },
                'field_ids': field_ids,
            })
            izi_table.update_schema_store_table()
            # Open Newly Created Store Table
            return {
                'name': _('Store Table'),
                'view_mode': 'form',
                'res_model': 'izi.table',
                'type': 'ir.actions.act_window',
                'res_id': izi_table.id,
                'target': 'current',
            }

    @api.onchange('is_stored')
    def onchange_is_stored(self):
        self.ensure_one()
        return False
        # if self.is_stored and not self.python_code_ids:
        #     self.python_code_ids = self.DEFAULT_PYTHON_CODE_IDS

    def get_store_table_name(self):
        for izi_table in self:
            izi_table.store_table_name = izi_table.table_name or False
            if izi_table.user_defined and izi_table.is_stored:
                izi_table.store_table_name = 'izi_%s' % (re.sub('[^A-Za-z0-9]+', '_', izi_table.name.lower()))
            # izi_table.store_table_name = ('izi_%s_store_table_%s') % (izi_table.source_id.type, izi_table.id)

    def get_table_fields_from_python_code(self):
        self.ensure_one()
        # Check
        if self.is_stored:
            data_sample = self.with_context(get_data_sample=True).run_python_code()
            if data_sample:
                self.get_table_fields_from_dictionary(data_sample)
    
    def get_table_fields_from_dictionary(self, dictionary):
        self.ensure_one()
        Field = self.env['izi.table.field']
        # Get existing fields based on table
        field_by_name = {}
        for field_record in Field.search([('table_id', '=', self.id)]):
            field_by_name[field_record.field_name] = field_record

        if not dictionary or not isinstance(dictionary, dict):
            raise ValidationError('False Python Code Data. Must Be Dictionary!')
        for key in dictionary:
            field_name = key
            field_title = field_name.replace('_', ' ').title()
            field_type_origin = self.get_field_type_origin(dictionary.get(key))
            field_type = Field.get_field_type_mapping(field_type_origin, self.source_id.type)
            foreign_table = None
            foreign_column = None

            # Check to create or update field
            if field_name not in field_by_name:
                field = Field.create({
                    'name': field_title,
                    'field_name': field_name,
                    'field_type': field_type,
                    'field_type_origin': field_type_origin,
                    'field_type_origin_selection': field_type_origin,
                    'table_id': self.id,
                    'foreign_table': foreign_table,
                    'foreign_column': foreign_column,
                })
            else:
                field = field_by_name[field_name]
                if field.name != field_title or field.field_type_origin != field_type_origin or \
                        field.field_type != field_type:
                    field.name = field_title
                    field.field_type_origin = field_type_origin
                    field.field_type = field_type
                field_by_name.pop(field_name)

    def get_table_fields(self):
        self.ensure_one()

        Field = self.env['izi.table.field']
        # Get existing fields based on table
        field_by_name = {}
        for field_record in Field.search([('table_id', '=', self.id)]):
            field_by_name[field_record.field_name] = field_record

        # Check
        if self.is_stored:
            return True
            # By default, fields in stored tables are defined manually
            # Or it can be generated by python code with different method, 
            # get_table_fields_from_python_code
        else:
            table_query = self.table_name
            if not self.table_name:
                if self.is_stored:
                    table_query = self.store_table_name
                else:
                    table_query = self.db_query.replace(';', '')
                    try:
                        matches = re.findall(r"limit \d+", table_query, re.IGNORECASE)
                        if matches:
                            for match in matches:
                                table_query = table_query.replace(match, 'limit 1')
                        match = re.search(r"limit \d+", table_query, re.IGNORECASE)
                        if match:
                            table_query = table_query.replace(match.group(), 'limit 1')
                        else:
                            table_query = '%s %s' % (table_query, 'limit 1')
                    except Exception:
                        pass
                    table_query = '(%s) table_query' % (table_query)

            func_check_query = getattr(self.source_id, 'check_query_%s' % self.source_id.type)
            func_check_query(**{
                'query': table_query,
            })

            func_get_table_fields = getattr(self, 'get_table_fields_%s' % self.source_id.type)
            result = func_get_table_fields(**{
                'field_by_name': field_by_name,
                'table_query': table_query,
            })

            field_by_name = result.get('field_by_name')

        for field_name in field_by_name:
            for dimension in field_by_name[field_name].analysis_dimension_ids:
                dimension.unlink()
            for metric in field_by_name[field_name].analysis_metric_ids:
                metric.unlink()
            field_by_name[field_name].unlink()

    def get_table_datas(self):
        self.ensure_one()

        res_fields = []

        # Build Metric Query
        field_query = ''
        table_query = self.table_name
        field_queries = []

        for field in self.field_ids:
            field_queries.append('%s' % field.field_name)
            res_fields.append(field.name)
        field_query = ', '.join(field_queries)

        # Check
        if not self.table_name:
            if self.is_stored:
                table_query = self.store_table_name
            else:
                table_query = self.db_query.replace(';', '')
                # Replace Special Variable in Query
                user_id = self.env.user.id
                user_name = self.env.user.name
                company_id = self.env.user.company_id.id
                company_name = self.env.user.company_id.name
                if '#user_id' in table_query:
                    table_query = table_query.replace('#user_id', str(user_id))
                if '#company_id' in table_query:
                    table_query = table_query.replace('#company_id', str(company_id))
                if '#user_name' in table_query:
                    table_query = table_query.replace('#user_name', str(user_name))
                if '#company_name' in table_query:
                    table_query = table_query.replace('#company_name', str(company_name))
                if 'test_query' in self._context:
                    try:
                        matches = re.findall(r"limit \d+", table_query, re.IGNORECASE)
                        if matches:
                            for match in matches:
                                table_query = table_query.replace(match, 'limit 1')
                        match = re.search(r"limit \d+", table_query, re.IGNORECASE)
                        if match:
                            table_query = table_query.replace(match.group(), 'limit 1')
                        else:
                            table_query = table_query = '%s %s' % (table_query, 'limit 1')
                    except Exception:
                        pass
                table_query = '(%s) table_query' % (table_query)

        # Build Query
        limit_query = ''
        if 'test_query' in self._context:
            limit_query = 'limit 1'
        query = 'SELECT %s FROM %s %s' % (field_query, table_query, limit_query)

        func_check_query = getattr(self.source_id, 'check_query_%s' % self.source_id.type)
        func_check_query(**{
            'query': query,
        })

        result = {'data': []}
        if self.is_stored:
            self.env.cr.execute(query)
            result['data'] = self.env.cr.dictfetchall()
        else:
            func_get_table_datas = getattr(self, 'get_table_datas_%s' % self.source_id.type)
            result = func_get_table_datas(**{
                'query': query,
            })

        if 'test_query' not in self._context:
            return result.get('data')
        else:
            title = _("Successfully Get Data")
            message = _("""
                Your table name or table query looks fine!
                Sample Data:
                %s
            """ % (str(result.get('data')[0]) if result.get('data') else str(result.get('data'))))
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': title,
                    'message': message,
                    'sticky': False,
                }
            }

    def build_schema_store_table(self):
        for izi_table in self:
            if izi_table.is_stored and izi_table.user_defined and izi_table.field_ids:
                table_name = izi_table.store_table_name
                list_fields = []
                for izi_field in izi_table.field_ids:
                    list_fields.append("%s %s" % (izi_field.field_name, izi_field.field_type_origin.upper()))
                fields_query = ", ".join(list_fields)
                create_table_query = "CREATE TABLE IF NOT EXISTS %s (%s);" % (
                    table_name, fields_query)
                self.env.cr.execute(create_table_query)

    def destroy_schema_store_table(self):
        for izi_table in self:
            if izi_table.is_stored and izi_table.user_defined and izi_table.field_ids:
                table_name = izi_table.store_table_name
                drop_table_query = "DROP TABLE IF EXISTS %s" % table_name
                self.env.cr.execute(drop_table_query)

    def update_schema_store_table(self):
        for izi_table in self:
            if izi_table.is_stored and izi_table.user_defined and izi_table.field_ids:
                izi_table.destroy_schema_store_table()
                izi_table.build_schema_store_table()

    def delete_store_table_data(self, condition_query=''):
        self.ensure_one()
        if self.is_stored and self.db_query is not False:
            table_name = self.store_table_name
            delete_table_query = "DELETE FROM %s %s" % (table_name, condition_query)
            self.env.cr.execute(delete_table_query)

    def insert_store_table_data(self, data=[], fetch=False):
        self.ensure_one()
        if self.is_stored and self.db_query is not False:
            if data:
                table_name = self.store_table_name

                table_fields = []
                for field in self.field_ids:
                    table_fields.append(field.field_name)
                fields_query = ", ".join(table_fields)

                tuple_datas = []
                for data in data:
                    tuple_data = ()
                    for table_field in table_fields:
                        tuple_data += (data.get(table_field),)
                    tuple_datas.append(tuple_data)

                insert_datas = []
                row_format = ', '.join(['%s' for x in range(len(self.field_ids))])
                for tuple_data in tuple_datas:
                    insert_datas.append(self.env.cr.mogrify(
                        self.env.cr.mogrify("(%s)" % row_format), tuple_data).decode())
                datas_query = ", ".join(insert_datas)

                insert_table_query = "INSERT INTO %s(%s) VALUES %s" % (table_name, fields_query, datas_query)
                self.env.cr.execute(self.env.cr.mogrify(insert_table_query))

                if fetch:
                    return self.env.cr.fetchall()

    def get_data_query(self, query):
        self.ensure_one()
        func_get_data_query = getattr(self, 'get_data_query_%s' % self.source_id.type)
        return func_get_data_query(**{
            'query': query,
        })

    @api.onchange('store_interval', 'store_interval_custom_type', 'store_start_datetime', 'store_end_datetime',
                  'store_unit_of_time', 'store_unit_of_time_value')
    def get_start_datetime(self):
        for izi_table in self:
            start_datetime_obj = datetime.today()

            if izi_table.store_interval != 'custom':
                if izi_table.store_interval == 'yesterday':
                    start_datetime_obj = start_datetime_obj - relativedelta(days=1)
                elif izi_table.store_interval == 'this_week':
                    start_datetime_obj = start_datetime_obj - timedelta(days=start_datetime_obj.weekday())
                elif izi_table.store_interval == 'last_week':
                    start_datetime_obj = start_datetime_obj - relativedelta(weeks=1)
                    start_datetime_obj = start_datetime_obj - timedelta(days=start_datetime_obj.weekday())
                elif izi_table.store_interval == 'this_month':
                    start_datetime_obj = start_datetime_obj.replace(day=1)
                elif izi_table.store_interval == 'last_month':
                    start_datetime_obj = start_datetime_obj - relativedelta(months=1)
                    start_datetime_obj = start_datetime_obj.replace(day=1)
                elif izi_table.store_interval == 'this_year':
                    start_datetime_obj = start_datetime_obj.replace(day=1, month=1)
                elif izi_table.store_interval == 'last_year':
                    start_datetime_obj = start_datetime_obj - relativedelta(years=1)
                    start_datetime_obj = start_datetime_obj.replace(day=1, month=1)
                start_datetime = start_datetime_obj.strftime('%Y-%m-%d')

                izi_table.start_datetime = '%s 00:00:00' % start_datetime
            else:
                if izi_table.store_interval_custom_type == 'datetime_range':
                    if izi_table.store_start_datetime:
                        start_datetime_obj = izi_table.store_start_datetime

                elif izi_table.store_interval_custom_type == 'unit_of_time':
                    interval_value = izi_table.store_unit_of_time_value
                    if izi_table.store_unit_of_time == 'minutes':
                        start_datetime_obj = start_datetime_obj - relativedelta(minutes=interval_value)
                    elif izi_table.store_unit_of_time == 'hours':
                        start_datetime_obj = start_datetime_obj - relativedelta(hours=interval_value)
                    elif izi_table.store_unit_of_time == 'days':
                        start_datetime_obj = start_datetime_obj - relativedelta(days=interval_value)
                    elif izi_table.store_unit_of_time == 'weeks':
                        start_datetime_obj = start_datetime_obj - relativedelta(weeks=interval_value)
                    elif izi_table.store_unit_of_time == 'months':
                        start_datetime_obj = start_datetime_obj - relativedelta(months=interval_value)
                    elif izi_table.store_unit_of_time == 'years':
                        start_datetime_obj = start_datetime_obj - relativedelta(years=interval_value)

                izi_table.start_datetime = start_datetime_obj.strftime('%Y-%m-%d %H:%M:%S')

    @api.onchange('store_interval', 'store_interval_custom_type', 'store_start_datetime', 'store_end_datetime',
                  'store_unit_of_time', 'store_unit_of_time_value')
    def get_end_datetime(self):
        for izi_table in self:
            if izi_table.start_datetime:
                start_datetime_obj = datetime.strptime(izi_table.start_datetime, '%Y-%m-%d %H:%M:%S')
                end_datetime_obj = start_datetime_obj

                if izi_table.store_interval != 'custom':
                    if izi_table.store_interval == 'yesterday':
                        end_datetime_obj = start_datetime_obj
                    elif izi_table.store_interval == 'this_week':
                        end_datetime_obj = start_datetime_obj + relativedelta(days=6)
                    elif izi_table.store_interval == 'last_week':
                        end_datetime_obj = start_datetime_obj + relativedelta(days=6)
                    elif izi_table.store_interval == 'this_month':
                        end_datetime_obj = (start_datetime_obj + relativedelta(months=1)
                                            ).replace(day=1) - relativedelta(days=1)
                    elif izi_table.store_interval == 'last_month':
                        end_datetime_obj = (start_datetime_obj + relativedelta(months=1)
                                            ).replace(day=1) - relativedelta(days=1)
                    elif izi_table.store_interval == 'this_year':
                        end_datetime_obj = start_datetime_obj.replace(day=31, month=12)
                    elif izi_table.store_interval == 'last_year':
                        end_datetime_obj = start_datetime_obj.replace(day=31, month=12)
                    end_datetime = end_datetime_obj.strftime('%Y-%m-%d')

                    izi_table.end_datetime = '%s 23:59:59' % end_datetime

                else:
                    if izi_table.store_interval_custom_type == 'datetime_range':
                        if izi_table.store_end_datetime:
                            end_datetime_obj = izi_table.store_end_datetime

                    elif izi_table.store_interval_custom_type == 'unit_of_time':
                        end_datetime_obj = datetime.today()

                    izi_table.end_datetime = izi_table.store_end_datetime.strftime('%Y-%m-%d %H:%M:%S')

    def method_direct_trigger(self):
        if self.cron_id:
            self.cron_id.with_context(izi_table=self).method_direct_trigger()

    def run_python_code(self):
        self.ensure_one()
        if self.cron_id:
            actions_server = self.cron_id.ir_actions_server_id
            IrActionsServer = self.env['ir.actions.server'].sudo()
            eval_context = IrActionsServer._get_eval_context(actions_server)
            eval_context['izi_table'] = self
            eval_context['data'] = False
            eval_context['user_defined_variables'] = {}
            for python_code_id in self.python_code_ids:

                if 'get_data_sample' in self._context and python_code_id.type_code != 'get_sample':
                    continue

                if 'get_data_sample' not in self._context and python_code_id.type_code != 'get_sample':
                    safe_eval(python_code_id.python_code.strip(), eval_context, mode="exec",
                              nocopy=True)  # nocopy allows to return 'action'
                elif 'get_data_sample' in self._context and python_code_id.type_code == 'get_sample':
                    safe_eval(python_code_id.python_code.strip(), eval_context, mode="exec",
                              nocopy=True)  # nocopy allows to return 'action'
                    break

            if 'get_data_sample' in self._context and eval_context['data']:
                if 'data' not in eval_context:
                    raise ValidationError("eval_context on code get sample data is not containing key 'data'")
                elif len(eval_context['data']) < 1:
                    raise ValidationError(
                        "eval_context['data'] on code get sample data is not containing any sample data")
                return eval_context['data'][0]

    def get_field_type_origin(self, value):
        self.ensure_one()
        func_get_field_type_origin = getattr(self, 'get_field_type_origin_%s' % self.source_id.type)
        return func_get_field_type_origin(**{
            'value': value,
        })

    def check_if_date_format(self, value):
        date_format = "%Y-%m-%d"
        try:
            return bool(datetime.strptime(value, date_format))
        except Exception as e:
            return False

    def check_if_datetime_format(self, value):
        datetime_format = "%Y-%m-%d %H:%M:%S"
        try:
            return bool(datetime.strptime(value, datetime_format))
        except Exception as e:
            return False

    def get_user_defined(self):
        for izi_table in self:
            if izi_table.table_name:
                izi_table.user_defined = False
            else:
                izi_table.user_defined = True


class IZITableField(models.Model):
    _name = 'izi.table.field'
    _description = 'IZI Table Field'
    _order = 'field_type, name'

    name = fields.Char(string='Name', required=True)
    field_name = fields.Char('Field Name')
    field_type = fields.Char('Field Type')
    field_type_selection = fields.Selection([
        ('boolean', 'boolean'),
        ('number', 'number'),
        ('string', 'string'),
        ('byte', 'byte'),
        ('date', 'date'),
        ('datetime', 'datetime'),
        ('timestamp', 'timestamp'),
    ], default=False, string='Field Types')
    field_type_origin = fields.Char(string='Field Type Origin', store=True, compute='_compute_field_type_origin')
    field_type_origin_selection = fields.Selection([
        ('boolean', 'boolean'),
        ('bytea', 'byteA'),
        ('date', 'date'),
        ('float8', 'float8'),
        ('int4', 'int4'),
        ('int8', 'int8'),
        ('text', 'text'),
        ('timestamp', 'timestamp'),
        ('numeric', 'numeric'),
        ('varchar', 'varchar'),
        ('timestamptz', 'timestamptz'),
        ('bit', 'bit'),
        ('bpchar', 'bpchar'),
        ('float4', 'float4'),
    ], default=False, string='Field Types Origin')
    field_id = fields.Many2one('ir.model.fields', string='Field')
    table_id = fields.Many2one('izi.table', string='Table', required=True, ondelete='cascade')
    foreign_table = fields.Char(string='Foreign Table')
    foreign_column = fields.Char(string='Foreign Column')
    analysis_metric_ids = fields.One2many(comodel_name='izi.analysis.metric',
                                          inverse_name='field_id', string='Analysis Metric')
    analysis_dimension_ids = fields.One2many(comodel_name='izi.analysis.dimension',
                                             inverse_name='field_id', string='Analysis Dimension')

    _sql_constraints = [
        ('name_source_unique', 'unique(field_name, table_id)', 'Table Field Name Already Exist.')
    ]

    def get_field_type_mapping(self, type_origin, source_type):
        field_mapping = self.env['izi.table.field.mapping'].search(
            [('name', '=', type_origin), ('source_type', '=', source_type)])
        if field_mapping:
            return field_mapping.type_mapping
        else:
            return None

    @api.onchange('field_type_origin', 'field_type_origin_selection')
    def onchange_field_type_origin(self):
        self.field_type_origin = self.field_type_origin_selection
        field_mapping = self.env['izi.table.field.mapping'].search(
            [('name', '=', self.field_type_origin), ('source_type', '=', self.table_id.source_id.type)])
        if field_mapping:
            self.field_type = field_mapping.type_mapping
        else:
            self.field_type = None

    @api.onchange('name')
    def onchange_name(self):
        if self.name:
            self.field_name = re.sub('[^A-Za-z0-9]+', '_', self.name.lower())

    @api.depends('field_type_origin_selection')
    def _compute_field_type_origin(self):
        for record in self:
            record.field_type_origin = record.field_type_origin_selection

class IZITableFieldMapping(models.Model):
    _name = 'izi.table.field.mapping'
    _description = 'IZI Table Field Mapping'

    name = fields.Char(string='Type Origin', required=True)
    type_mapping = fields.Char(string='Type Mapping', required=True)
    source_type = fields.Char(string='Source Type', required=True)

    _sql_constraints = [
        ('name_source_unique', 'unique(name, source_type)', 'Type Origin Already Exist.')
    ]


class IZITablePythonCode(models.Model):
    _name = 'izi.table.python.code'
    _description = 'IZI Table Python Code'
    _order = 'sequence'

    table_id = fields.Many2one(comodel_name='izi.table', string='Table',
                               readonly=True, required=True, ondelete='cascade')
    name = fields.Char(string='Name', required=True)
    sequence = fields.Integer(string='Sequence', required=True)
    type_code = fields.Selection(string='Type Code', selection=[
        ('get', 'Get'),
        ('delete', 'Delete'),
        ('insert', 'Insert'),
        ('get_sample', 'Get Sample'),
    ])
    python_code = fields.Text(string='Python Code', default=DEFAULT_PYTHON_CODE)

    _sql_constraints = [
        ('table_id_sequence_unique', 'unique(table_id, sequence)', 'Sequence Already Exist.')
    ]
