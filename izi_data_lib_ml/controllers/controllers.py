# -*- coding: utf-8 -*-
# from odoo import http


# class IziDataLibMysql(http.Controller):
#     @http.route('/izi_data_lib_ml/izi_data_lib_ml/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/izi_data_lib_ml/izi_data_lib_ml/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('izi_data_lib_ml.listing', {
#             'root': '/izi_data_lib_ml/izi_data_lib_ml',
#             'objects': http.request.env['izi_data_lib_ml.izi_data_lib_ml'].search([]),
#         })

#     @http.route('/izi_data_lib_ml/izi_data_lib_ml/objects/<model("izi_data_lib_ml.izi_data_lib_ml"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('izi_data_lib_ml.object', {
#             'object': obj
#         })
