# -*- coding: utf-8 -*-
# from odoo import http


# class IziDataLibMysql(http.Controller):
#     @http.route('/izi_data_lib_mysql/izi_data_lib_mysql/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/izi_data_lib_mysql/izi_data_lib_mysql/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('izi_data_lib_mysql.listing', {
#             'root': '/izi_data_lib_mysql/izi_data_lib_mysql',
#             'objects': http.request.env['izi_data_lib_mysql.izi_data_lib_mysql'].search([]),
#         })

#     @http.route('/izi_data_lib_mysql/izi_data_lib_mysql/objects/<model("izi_data_lib_mysql.izi_data_lib_mysql"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('izi_data_lib_mysql.object', {
#             'object': obj
#         })
