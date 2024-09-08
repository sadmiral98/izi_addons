# -*- coding: utf-8 -*-
# from odoo import http


# class IziDataLibMysql(http.Controller):
#     @http.route('/izi_data_lib_spreadsheet/izi_data_lib_spreadsheet/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/izi_data_lib_spreadsheet/izi_data_lib_spreadsheet/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('izi_data_lib_spreadsheet.listing', {
#             'root': '/izi_data_lib_spreadsheet/izi_data_lib_spreadsheet',
#             'objects': http.request.env['izi_data_lib_spreadsheet.izi_data_lib_spreadsheet'].search([]),
#         })

#     @http.route('/izi_data_lib_spreadsheet/izi_data_lib_spreadsheet/objects/<model("izi_data_lib_spreadsheet.izi_data_lib_spreadsheet"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('izi_data_lib_spreadsheet.object', {
#             'object': obj
#         })
