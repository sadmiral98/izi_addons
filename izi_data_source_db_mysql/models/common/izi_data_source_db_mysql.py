# -*- coding: utf-8 -*-
# Copyright 2022 IZI PT Solusi Usaha Mudah
import mysql.connector as connector

from odoo import models, fields
from odoo.exceptions import ValidationError
from mysql.connector import FieldType


class IZIDataSourceDBMYSQL(models.Model):
    _inherit = 'izi.data.source'

    type = fields.Selection(
        selection_add=[
            ('db_mysql', 'Database MySQL'),
        ])
    db_mysql_host = fields.Char(string='MySQL DB Host')
    db_mysql_port = fields.Char(string='MySQL DB Port')
    db_mysql_name = fields.Char(string='MySQL DB Name')
    db_mysql_schema = fields.Char(string='MySQL DB Schema')
    db_mysql_user = fields.Char(string='MySQL DB User')
    db_mysql_password = fields.Char(string='MySQL DB Password')
    db_mysql_timeout = fields.Integer(string='MySQL DB Timeout (seconds)', default=120)

    def get_connection_db_mysql(self):
        self.ensure_one()
        try:
            config = {
                "connection_timeout": self.db_mysql_timeout if self.db_mysql_timeout else 120,
                "user": self.db_mysql_user,
                "host": self.db_mysql_host,
                "port": self.db_mysql_port,
                "database": self.db_mysql_name,
            }
            if self.db_mysql_password:
                config.update({
                    'password': self.db_mysql_password,
                })
            c = connector.connect(**config)
            return c
        except Exception as e:
            raise ValidationError(e)

    def close_connection_cursor_db_mysql(self, conn, cursor):
        self.ensure_one()
        cursor.close()
        conn.close()

    def get_schema_db_mysql(self):
        self.ensure_one()
        return self.db_mysql_schema

    def dictfetchall_db_mysql(self, cursor):
        self.ensure_one()
        rows = cursor.fetchall()
        columns = list(cursor.description)
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col[0]] = row[i]
            data.append(row_dict)
        return data

    def authenticate_db_mysql(self):
        self.ensure_one()
        if self.db_mysql_host and self.db_mysql_port and self.db_mysql_name and self.db_mysql_schema \
                and self.db_mysql_user:
            try:
                conn = self.get_connection_db_mysql()
                cursor = conn.cursor(buffered=True)
                cursor.execute('''
                    SELECT table_name FROM information_schema.tables WHERE table_schema = '%s'
                ''' % self.db_mysql_schema)
                result = cursor.fetchall()
                if result:
                    self.state = 'ready'
                else:
                    self.state = 'new'
                self.close_connection_cursor_db_mysql(conn, cursor)
            except Exception as e:
                raise ValidationError('Failed Authenticate Access: %s' % (str(e)))
        else:
            raise ValidationError(
                'Host, Port, Database, Schema, and User are required to create a connection to MySQL Database.')

    def get_foreignkey_field_db_mysql(self):
        self.ensure_one()

        conn = self.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)
        schema_name = self.get_schema_db_mysql()

        # Get Foreign Key Field
        cursor.execute('''
            SELECT
                kcu.table_schema,
                kcu.constraint_name,
                kcu.table_name,
                kcu.column_name,
                kcu.referenced_table_schema foreign_table_schema,
                kcu.referenced_table_name foreign_table_name,
                kcu.referenced_column_name foreign_column_name
            FROM
                information_schema.key_column_usage kcu
            JOIN information_schema.table_constraints tc ON
                (kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema)
            WHERE
                tc.constraint_type = 'FOREIGN KEY'
                AND kcu.table_schema = '{schema_name}'
                AND kcu.referenced_table_schema = '{schema_name}'
        '''.format(schema_name=schema_name))
        fkey_records = self.dictfetchall_db_mysql(cursor)
        fkey_by_table_column = {}
        for fkey in fkey_records:
            fkey_by_table_column['%s,%s' % (fkey.get('table_name'), fkey.get('column_name'))] = fkey

        self.close_connection_cursor_db_mysql(conn, cursor)

        return fkey_by_table_column

    def mapping_field_origin_db_mysql(self, field_type_origin):
        dict_mapper = {
            'DECIMAL': 'DECIMAL',
            'TINY': 'TINYINT',
            'SHORT': 'INT',
            'LONG': 'INT',
            'FLOAT': 'FLOAT',
            'DOUBLE': 'DOUBLE',
            'NULL': 'INT',
            'TIMESTAMP': 'TIMESTAMP',
            'LONGLONG': 'INT',
            'INT24': 'INT',
            'DATE': 'DATE',
            'TIME': 'TIME',
            'DATETIME': 'DATETIME',
            'YEAR': 'YEAR',
            'NEWDATE': 'DATE',
            'VARCHAR': 'VARCHAR',
            'BIT': 'BIT',
            'NEWDECIMAL': 'DECIMAL',
            'INTERVAL': 'VARCHAR',
            'SET': 'VARCHAR',
            'TINY_BLOB': 'TINYBLOB',
            'MEDIUM_BLOB': 'MEDIUMBLOB',
            'LONG_BLOB': 'LONGBLOB',
            'BLOB': 'BLOB',
            'VAR_STRING': 'VARCHAR',
            'STRING': 'VARCHAR',
            'GEOMETRY': 'VARCHAR',
        }
        return dict_mapper.get(field_type_origin)

    def get_source_tables_db_mysql(self, **kwargs):
        self.ensure_one()

        conn = self.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)
        schema_name = self.get_schema_db_mysql()

        Table = self.env['izi.table']
        Field = self.env['izi.table.field']

        table_by_name = kwargs.get('table_by_name')
        field_by_name = kwargs.get('field_by_name')
        fkey_by_table_column = self.get_foreignkey_field_db_mysql()

        # Get Tables
        cursor.execute("SELECT * FROM information_schema.tables WHERE table_schema = '%s' %s" %
                       (schema_name, kwargs.get('table_filter_query')))
        table_records = self.dictfetchall_db_mysql(cursor)
        for table_record in table_records:
            table_name = table_record.get('TABLE_NAME')
            table_desc = table_record.get('TABLE_NAME').replace('_', ' ').title()

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
                field_name = desc[0]
                field_title = field_name.replace('_', ' ').title()
                field_type_origin = self.mapping_field_origin_db_mysql(FieldType.get_info(desc[1]))
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

        self.close_connection_cursor_db_mysql(conn, cursor)

        return {
            'table_by_name': table_by_name,
            'field_by_name': field_by_name
        }

    def get_source_fields_db_mysql(self, **kwargs):
        self.ensure_one()

        conn = self.get_connection_db_mysql()
        cursor = conn.cursor(buffered=True)

        Field = self.env['izi.table.field']

        table_by_name = kwargs.get('table_by_name')
        field_by_name = kwargs.get('field_by_name')
        fkey_by_table_column = self.get_foreignkey_field_db_mysql()

        for table_name in table_by_name:

            table = table_by_name.get(table_name)

            if not table.table_name:
                table.get_table_fields()
                continue

            cursor.execute("SELECT * FROM %s LIMIT 1" % table_name)
            # Get and loop column description with env.cr.description from query given above
            for desc in cursor.description:
                field_name = desc[0]
                field_title = field_name.replace('_', ' ').title()
                field_type_origin = self.mapping_field_origin_db_mysql(FieldType.get_info(desc[1]))
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

        self.close_connection_cursor_db_mysql(conn, cursor)

        return {
            'table_by_name': table_by_name,
            'field_by_name': field_by_name
        }

    def check_query_db_mysql(self, **kwargs):
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

    def get_source_query_filters_db_mysql(self):
        self.ensure_one()
        table_filter_query = ''
        if self.table_filter:
            table_filters = []
            for table_filter in self.table_filter.split(','):
                table_filters.append('\'%s\'' % table_filter)
            table_filter_query = ','.join(table_filters)
            table_filter_query = 'AND table_name IN (%s)' % table_filter_query
        return table_filter_query
