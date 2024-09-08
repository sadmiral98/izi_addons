# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
from odoo import models
from datetime import date, datetime
from decimal import Decimal
from mysql.connector import FieldType
from odoo.exceptions import ValidationError


class IZITableDBMYSQL(models.Model):
    _inherit = 'izi.table'

    def get_table_fields_db_mysql(self, **kwargs):
        self.ensure_one()
        conn = self.source_id.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)

        Field = self.env['izi.table.field']

        field_by_name = kwargs.get('field_by_name')
        table_query = kwargs.get('table_query')
        fkey_by_table_column = self.source_id.get_foreignkey_field_db_mysql()

        try:
            cursor.execute('SELECT * FROM %s LIMIT 1' % table_query)
        except Exception as e:
            raise ValidationError(e)
        # Get and loop column description with env.cr.description from query given above
        for desc in cursor.description:
            field_name = desc[0]
            field_title = field_name.replace('_', ' ').title()
            field_type_origin = self.source_id.mapping_field_origin_db_mysql(FieldType.get_info(desc[1]))
            field_type = Field.get_field_type_mapping(field_type_origin, self.source_id.type)
            foreign_table = None
            foreign_column = None
            if fkey_by_table_column.get('%s,%s' % (self.table_name, field_name)) is not None:
                fkey = fkey_by_table_column.get('%s,%s' % (self.table_name, field_name))
                field_type = 'foreignkey'
                foreign_table = fkey.get('foreign_table_name')
                foreign_column = fkey.get('foreign_column_name')

            # Check to create or update field
            if field_name not in field_by_name:
                field = Field.create({
                    'name': field_title,
                    'field_name': field_name,
                    'field_type': field_type,
                    'field_type_origin': field_type_origin,
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
                if fkey_by_table_column.get('%s,%s' % (self.table_name, field_name)) is not None:
                    if field.field_type != field_type or field.foreign_table != foreign_table or \
                            field.foreign_column != foreign_column:
                        field.field_type = field_type
                        field.foreign_table = foreign_table
                        field.foreign_column = foreign_column
                field_by_name.pop(field_name)

        self.source_id.close_connection_cursor_db_mysql(conn, cursor)

        return {
            'field_by_name': field_by_name
        }

    def get_table_datas_db_mysql(self, **kwargs):
        self.ensure_one()
        conn = self.source_id.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)

        cursor.execute(kwargs.get('query'))
        res_data = self.source_id.dictfetchall_db_mysql(cursor)
        self.source_id.close_connection_cursor_db_mysql(conn, cursor)
        return {
            'data': res_data,
        }

    def get_data_query_db_mysql(self, **kwargs):
        self.ensure_one()
        conn = self.source_id.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)

        cursor.execute(kwargs.get('query'))
        res_data = self.source_id.dictfetchall_db_mysql(cursor)
        self.source_id.close_connection_cursor_db_mysql(conn, cursor)
        return res_data

    def get_field_type_origin_db_mysql(self, **kwargs):
        self.ensure_one()
        value = kwargs.get('value')
        type_origin = 'VARCHAR'
        if isinstance(value, bool):
            type_origin = 'TINYINT'
        elif self.check_if_datetime_format(value) or isinstance(value, datetime):
            type_origin = 'DATETIME'
        elif self.check_if_date_format(value) or isinstance(value, date):
            type_origin = 'DATE'
        elif isinstance(value, int):
            type_origin = 'INT'
        elif isinstance(value, float):
            type_origin = 'FLOAT'
        elif isinstance(value, Decimal):
            type_origin = 'DECIMAL'
        return type_origin
