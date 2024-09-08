# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models
from odoo.exceptions import ValidationError


class IZIAnalysisDBMYSQL(models.Model):
    _inherit = 'izi.analysis'

    def get_analysis_data_db_mysql(self, **kwargs):
        self.ensure_one()
        conn = self.source_id.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)

        try:
            cursor.execute(kwargs.get('query'))
        except Exception as e:
            raise ValidationError(e)
        res_data = self.source_id.dictfetchall_db_mysql(cursor)
        self.source_id.close_connection_cursor_db_mysql(conn, cursor)
        return {
            'res_data': res_data,
        }

    def get_field_metric_format_db_mysql(self, **kwargs):
        self.ensure_one()
        query = '%s' % (kwargs.get('field_name'))
        if not kwargs.get('field_format'):
            return query
        if kwargs.get('field_type') in ('date', 'datetime'):
            date_format = {
                'year': "date_format({field_name}, '%Y')".format(field_name=kwargs.get('field_name')),
                'month': "date_format({field_name}, '%b %Y')".format(field_name=kwargs.get('field_name')),
                'week': "concat('Week ', date_format({field_name}, '%V'), ' ', date_format({field_name}, '%X'))"
                .format(field_name=kwargs.get('field_name')),
                'day': "date_format({field_name}, '%d %b %Y')".format(field_name=kwargs.get('field_name')),
            }
            if kwargs.get('field_format') in date_format:
                query = date_format.get(kwargs.get('field_format'))
        return query

    def get_field_dimension_format_db_mysql(self, **kwargs):
        self.ensure_one()
        query = '%s' % kwargs.get('field_name')
        if not kwargs.get('field_format'):
            return query
        if kwargs.get('field_type') in ('date', 'datetime'):
            date_format = {
                'year': 'year({field_name})'.format(field_name=kwargs.get('field_name')),
                'month': 'year({field_name}), month({field_name})'.format(field_name=kwargs.get('field_name')),
                'week': 'year({field_name}), week({field_name})'.format(field_name=kwargs.get('field_name')),
                'day': 'year({field_name}), month({field_name}), date({field_name})'.format(
                    field_name=kwargs.get('field_name')),
            }
            if kwargs.get('field_format') in date_format:
                query = date_format.get(kwargs.get('field_format'))
        return query

    def get_field_sort_format_db_mysql(self, **kwargs):
        self.ensure_one()
        query = '%s %s' % (kwargs.get('field_name'), kwargs.get('sort'))
        if not kwargs.get('field_format'):
            return query
        if kwargs.get('field_type') in ('date', 'datetime'):
            date_format = {
                'year': 'year({field_name}) {sort}'.format(field_name=kwargs.get('field_name'),
                                                           sort=kwargs.get('sort')),
                'month': 'year({field_name}) {sort}, month({field_name}) {sort}'.format(
                    field_name=kwargs.get('field_name'), sort=kwargs.get('sort')),
                'week': 'year({field_name}) {sort}, week({field_name}) {sort}'.format(
                    field_name=kwargs.get('field_name'), sort=kwargs.get('sort')),
                'day': 'year({field_name}) {sort}, month({field_name}) {sort}, date({field_name}) {sort}'.format(
                    field_name=kwargs.get('field_name'), sort=kwargs.get('sort')),
            }
            if kwargs.get('field_format') in date_format:
                query = date_format.get(kwargs.get('field_format'))
        return query

    def get_filter_temp_query_db_mysql(self, **kwargs):
        self.ensure_one()
        filter_temp_result = False
        filter_field = kwargs.get('filter_value')[0]
        filter_type = kwargs.get('filter_value')[1]
        filter_list = kwargs.get('filter_value')[2]

        if filter_type == 'string_search':
            string_search_query = []
            for value in filter_list:
                string_search_query.append("lower(%s) like '%s'" % (filter_field, '%' + value.lower() + '%'))
            filter_temp_result = {
                'query': string_search_query,
                'join_operator': 'or'
            }

        elif filter_type == 'date_range':
            date_range_query = []

            start_date = filter_list[0]

            end_date = False
            if len(filter_list) == 2:
                end_date = filter_list[1]

            if start_date is not False and start_date is not None:
                date_range_query.append("%s >= '%s'" % (filter_field, start_date))

            if end_date is not False and end_date is not None:
                date_range_query.append("%s <= '%s'" % (filter_field, end_date))

            filter_temp_result = {
                'query': date_range_query,
                'join_operator': 'and'
            }

        elif filter_type == 'date_format':
            date_format_query = []

            date_format = filter_list[0]

            date_range = self.get_date_range_by_date_format(date_format)

            start_date = date_range.get('start_date')
            end_date = date_range.get('end_date')

            if start_date is not False and start_date is not None:
                date_format_query.append("%s >= '%s'" % (filter_field, start_date))

            if end_date is not False and end_date is not None:
                date_format_query.append("%s <= '%s'" % (filter_field, end_date))

            filter_temp_result = {
                'query': date_format_query,
                'join_operator': 'and'
            }

        return filter_temp_result
