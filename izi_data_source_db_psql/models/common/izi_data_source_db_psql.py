# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
import psycopg2

from odoo import models, fields
from odoo.exceptions import ValidationError


class IZIDataSourceDBPSQL(models.Model):
    _inherit = 'izi.data.source'

    type = fields.Selection(
        selection_add=[
            ('db_psql', 'Database PostgreSQL'),
        ])
    db_psql_host = fields.Char(string='Postgres DB Host')
    db_psql_port = fields.Char(string='Postgres DB Port')
    db_psql_name = fields.Char(string='Postgres DB Name')
    db_psql_schema = fields.Char(string='Postgres DB Schema')
    db_psql_user = fields.Char(string='Postgres DB User')
    db_psql_password = fields.Char(string='Postgres DB Password')
    db_psql_timeout = fields.Integer(string='Postgres DB Timeout (seconds)', default=120)

    def get_cursor_db_psql(self):
        self.ensure_one()
        try:
            conn = psycopg2.connect(
                host=self.db_psql_host,
                port=self.db_psql_port,
                database=self.db_psql_name,
                user=self.db_psql_user,
                password=self.db_psql_password,
                options='-c search_path=%s,statement_timeout=%s' % (self.db_psql_schema, str(
                    (self.db_psql_timeout if self.db_psql_timeout else 120) * 1000))
            )
            if not self.db_psql_password:
                conn = psycopg2.connect(
                    host=self.db_psql_host,
                    port=self.db_psql_port,
                    database=self.db_psql_name,
                    user=self.db_psql_user,
                    options='-c search_path=%s,statement_timeout=%s' % (self.db_psql_schema, str(
                        (self.db_psql_timeout if self.db_psql_timeout else 120) * 1000))
                )
            cur = conn.cursor()
            return cur
        except Exception as e:
            raise ValidationError(e)

    def close_cursor_db_psql(self, cursor):
        self.ensure_one()
        cursor.close()

    def get_schema_db_psql(self):
        self.ensure_one()
        return self.db_psql_schema

    def dictfetchall_db_psql(self, cursor):
        self.ensure_one()
        rows = cursor.fetchall()
        columns = list(cursor.description)
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col.name] = row[i]
            data.append(row_dict)
        return data

    def authenticate_db_psql(self):
        self.ensure_one()
        if self.db_psql_host and self.db_psql_port and self.db_psql_name and self.db_psql_schema \
                and self.db_psql_user:
            try:
                cursor = self.get_cursor_db_psql()
                cursor.execute('''
                    SELECT * FROM information_schema.tables WHERE table_schema = '%s';
                ''' % self.db_psql_schema)
                rows = cursor.fetchall()
                if rows:
                    self.state = 'ready'
                self.close_cursor_db_psql(cursor)
            except Exception as e:
                raise ValidationError('Failed Authenticate Access: %s' % (str(e)))
        else:
            raise ValidationError(
                'Host, Port, Database, Schema, and User are required to create a connection to PostgreSQL Database.')

    def get_foreignkey_field_db_psql(self):
        self.ensure_one()

        cursor = self.get_cursor_db_psql()
        schema_name = self.get_schema_db_psql()

        # Get Foreign Key Field
        cursor.execute('''
            SELECT
                kcu.table_schema,
                kcu.constraint_name,
                kcu.table_name,
                kcu.column_name,
                ccu.table_schema foreign_table_schema,
                ccu.table_name foreign_table_name,
                ccu.column_name foreign_column_name
            FROM
                information_schema.key_column_usage kcu
            JOIN information_schema.table_constraints tc ON
                (kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema)
            JOIN information_schema.constraint_column_usage ccu ON
                (kcu.constraint_name = ccu.constraint_name AND kcu.table_schema = ccu.table_schema)
            WHERE
                tc.constraint_type = 'FOREIGN KEY'
                AND kcu.table_schema = '{schema_name}'
                AND ccu.table_schema = '{schema_name}'
        '''.format(schema_name=schema_name))
        fkey_records = self.dictfetchall_db_psql(cursor)
        fkey_by_table_column = {}
        for fkey in fkey_records:
            fkey_by_table_column['%s,%s' % (fkey.get('table_name'), fkey.get('column_name'))] = fkey

        self.close_cursor_db_psql(cursor)

        return fkey_by_table_column

    def get_source_tables_db_psql(self, **kwargs):
        self.ensure_one()

        cursor = self.get_cursor_db_psql()
        schema_name = self.get_schema_db_psql()

        Table = self.env['izi.table']
        Field = self.env['izi.table.field']

        table_by_name = kwargs.get('table_by_name')
        field_by_name = kwargs.get('field_by_name')
        fkey_by_table_column = self.get_foreignkey_field_db_odoo()

        # Get mapping oid and field type FROM pg_type
        typ_by_oid = {}
        cursor.execute("SELECT oid, typname FROM pg_type")
        dict_typs = self.dictfetchall_db_psql(cursor)
        for typ in dict_typs:
            typ_by_oid[typ.get('oid')] = typ.get('typname')

        # Get Tables
        cursor.execute("SELECT * FROM information_schema.tables WHERE table_schema = '%s' %s" %
                       (schema_name, kwargs.get('table_filter_query')))
        table_records = self.dictfetchall_db_psql(cursor)
        for table_record in table_records:
            table_name = table_record.get('table_name')
            table_desc = table_record.get('table_name').replace('_', ' ').title()

            # Create or Get Tables
            table = table_by_name.get(table_name)
            if table_name not in table_by_name:
                table = Table.create({
                    'active': False,
                    'name': table_desc,
                    'table_name': table_name,
                    'source_id': self.id,
                })
                field_by_name[table_name] = {}
            else:
                table_by_name.pop(table_name)

            cursor.execute("SELECT * FROM %s LIMIT 1" % table_name)
            # Get and loop column description with env.cr.description from query given above
            for desc in cursor.description:
                field_name = desc.name
                field_title = field_name.replace('_', ' ').title()
                field_type_origin = typ_by_oid.get(desc.type_code)
                field_type = Field.get_field_type_mapping(field_type_origin, self.type)
                foreign_table = None
                foreign_column = None
                if fkey_by_table_column.get('%s,%s' % (table_name, field_name)) is not None:
                    fkey = fkey_by_table_column.get('%s,%s' % (table_name, field_name))
                    field_type = 'foreignkey'
                    foreign_table = fkey.get('foreign_table_name')
                    foreign_column = fkey.get('foreign_column_name')

                # Check to create or update field
                if field_name not in field_by_name[table_name]:
                    field = Field.create({
                        'name': field_title,
                        'field_name': field_name,
                        'field_type': field_type,
                        'field_type_origin': field_type_origin,
                        'table_id': table.id,
                        'foreign_table': foreign_table,
                        'foreign_column': foreign_column,
                    })
                else:
                    field = field_by_name[table_name][field_name]
                    if field.name != field_title or field.field_type_origin != field_type_origin or \
                            field.field_type != field_type:
                        field.name = field_title
                        field.field_type_origin = field_type_origin
                        field.field_type = field_type
                    if fkey_by_table_column.get('%s,%s' % (table_name, field_name)) is not None:
                        if field.field_type != field_type or field.foreign_table != foreign_table or \
                                field.foreign_column != foreign_column:
                            field.field_type = field_type
                            field.foreign_table = foreign_table
                            field.foreign_column = foreign_column
                    field_by_name[table_name].pop(field_name)

        self.close_cursor_db_psql(cursor)

        return {
            'table_by_name': table_by_name,
            'field_by_name': field_by_name
        }

    def get_source_fields_db_psql(self, **kwargs):
        self.ensure_one()

        cursor = self.get_cursor_db_psql()

        Field = self.env['izi.table.field']

        table_by_name = kwargs.get('table_by_name')
        field_by_name = kwargs.get('field_by_name')
        fkey_by_table_column = self.get_foreignkey_field_db_psql()

        # Get mapping oid and field type FROM pg_type
        typ_by_oid = {}
        cursor.execute("SELECT oid, typname FROM pg_type")
        dict_typs = self.dictfetchall_db_psql(cursor)
        for typ in dict_typs:
            typ_by_oid[typ.get('oid')] = typ.get('typname')

        for table_name in table_by_name:

            table = table_by_name.get(table_name)

            if not table.table_name:
                table.get_table_fields()
                continue

            cursor.execute("SELECT * FROM %s LIMIT 1" % table_name)
            # Get and loop column description with env.cr.description from query given above
            for desc in cursor.description:
                field_name = desc.name
                field_title = field_name.replace('_', ' ').title()
                field_type_origin = typ_by_oid.get(desc.type_code)
                field_type = Field.get_field_type_mapping(field_type_origin, self.type)
                foreign_table = None
                foreign_column = None
                if fkey_by_table_column.get('%s,%s' % (table_name, field_name)) is not None:
                    fkey = fkey_by_table_column.get('%s,%s' % (table_name, field_name))
                    field_type = 'foreignkey'
                    foreign_table = fkey.get('foreign_table_name')
                    foreign_column = fkey.get('foreign_column_name')

                # Check to create or update field
                if field_name not in field_by_name[table_name]:
                    field = Field.create({
                        'name': field_title,
                        'field_name': field_name,
                        'field_type': field_type,
                        'field_type_origin': field_type_origin,
                        'table_id': table.id,
                        'foreign_table': foreign_table,
                        'foreign_column': foreign_column,
                    })
                else:
                    field = field_by_name[table_name][field_name]
                    if field.name != field_title or field.field_type_origin != field_type_origin or \
                            field.field_type != field_type:
                        field.name = field_title
                        field.field_type_origin = field_type_origin
                        field.field_type = field_type
                    if fkey_by_table_column.get('%s,%s' % (table_name, field_name)) is not None:
                        if field.field_type != field_type or field.foreign_table != foreign_table or \
                                field.foreign_column != foreign_column:
                            field.field_type = field_type
                            field.foreign_table = foreign_table
                            field.foreign_column = foreign_column
                    field_by_name[table_name].pop(field_name)

        self.close_cursor_db_psql(cursor)

        return {
            'field_by_name': field_by_name
        }

    def check_query_db_psql(self, **kwargs):
        query = kwargs.get('query')
        if query is False or query is None:
            return True

        escape_characters = ['\"', '\'', '\\', '\n', '\r', '\t', '\b', '\f']
        for char in escape_characters:
            query = query.replace(char, ' ')
        query = " ".join(query.split()).lower()

        forbidden_queries = ['drop database', 'drop schema', 'drop table', 'truncate table', 'delete from',
                             'delete user', 'select true', 'insert into', 'create table']
        for forbidden_query in forbidden_queries:
            if forbidden_query in query.lower():
                raise ValidationError("Query is not allowed to contain '%s'" % forbidden_query)

    def get_source_query_filters_db_psql(self):
        self.ensure_one()
        table_filter_query = ''
        if self.table_filter:
            table_filters = []
            for table_filter in self.table_filter.split(','):
                table_filters.append('$$%s$$' % table_filter)
            table_filter_query = ','.join(table_filters)
            table_filter_query = 'AND table_name IN (%s)' % table_filter_query
        return table_filter_query
