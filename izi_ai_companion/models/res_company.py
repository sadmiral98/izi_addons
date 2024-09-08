from odoo import models, fields, api, _
from odoo.exceptions import UserError

class ResCompany(models.Model):
    _inherit = 'res.company'

    vector_db_name = fields.Char('Vector Database Name')
    vector_db_user = fields.Char('Vector Database User')
    vector_db_pass = fields.Char('Vector Database Pass')
    vector_db_host = fields.Char('Vector Database Host')
    vector_db_port = fields.Char('Vector Database Port')
    default_threshold = fields.Float('Default Similarity Threshold',required=True, default='0.4')
    default_limit = fields.Integer('Default Similarity Limit',required=True, default='1')
    paragraphs_chunk_limit = fields.Integer('Paragraphs Chunks Limit', default = '10')


    def get_vector_config(self):
        if self.vector_db_pass:
            conn_params = {
                "dbname": self.vector_db_name,
                "user": self.vector_db_user,
                "password": self.vector_db_pass,
                "host": self.vector_db_host,
                "port": self.vector_db_port
            }
        else:
            conn_params = {
                "dbname": self.vector_db_name,
                "user": self.vector_db_user,
                "host": self.vector_db_host,
                "port": self.vector_db_port
            }

        return conn_params
