# -*- coding: utf-8 -*-
# from odoo import http


# class IziDataLibMssql(http.Controller):
#     @http.route('/izi_data_lib_mssql/izi_data_lib_mssql/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/izi_data_lib_mssql/izi_data_lib_mssql/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('izi_data_lib_mssql.listing', {
#             'root': '/izi_data_lib_mssql/izi_data_lib_mssql',
#             'objects': http.request.env['izi_data_lib_mssql.izi_data_lib_mssql'].search([]),
#         })

#     @http.route('/izi_data_lib_mssql/izi_data_lib_mssql/objects/<model("izi_data_lib_mssql.izi_data_lib_mssql"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('izi_data_lib_mssql.object', {
#             'object': obj
#         })
