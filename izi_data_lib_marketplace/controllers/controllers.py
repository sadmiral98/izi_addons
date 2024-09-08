# -*- coding: utf-8 -*-
# from odoo import http


# class IziDataLibMysql(http.Controller):
#     @http.route('/izi_data_lib_marketplace/izi_data_lib_marketplace/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/izi_data_lib_marketplace/izi_data_lib_marketplace/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('izi_data_lib_marketplace.listing', {
#             'root': '/izi_data_lib_marketplace/izi_data_lib_marketplace',
#             'objects': http.request.env['izi_data_lib_marketplace.izi_data_lib_marketplace'].search([]),
#         })

#     @http.route('/izi_data_lib_marketplace/izi_data_lib_marketplace/objects/<model("izi_data_lib_marketplace.izi_data_lib_marketplace"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('izi_data_lib_marketplace.object', {
#             'object': obj
#         })
