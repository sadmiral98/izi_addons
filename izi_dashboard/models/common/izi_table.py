# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models, _


class IZITable(models.Model):
    _inherit = 'izi.table'

    def ui_test_query(self, query):
        res = {
            'data': [],
            'message': False,
            'status': 500,
        }
        try:
            table_query = 'select * from (%s) table_query limit 1' % (query)
            table_query = table_query.replace(';', '')
            func_check_query = getattr(self.source_id, 'check_query_%s' % self.source_id.type)
            func_check_query(**{
                'query': table_query,
            })
            func_get_data_query = getattr(self, 'get_data_query_%s' % self.source_id.type)
            query_result = func_get_data_query(**{
                'query': table_query,
            })
            res.update({
                'data': query_result,
                'message': str(query_result),
                'status': 200,
            })
            self.env.cr.rollback()
        except Exception as e:
            self.env.cr.rollback()
            res.update({
                'message': str(e),
                'status': 500,
            })
        return res

    def ui_execute_query(self, query):
        self.ensure_one()
        res = {
            'data': [],
            'message': False,
            'status': 500,
        }
        try:
            # Get Query Field Names
            test_result = self.ui_test_query(query)
            test_data = test_result['data']
            # Update Query
            self.db_query = query
            # Execute Query
            self.get_table_fields()
            # Results
            res.update({
                'data': test_data,
                'message': 'Success',
                'status': 200,
            })
        except Exception as e:
            self.env.cr.rollback()
            res.update({
                'message': str(e),
                'status': 500,
            })
        return res
