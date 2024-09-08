from odoo import models, fields, api, _
from odoo.exceptions import UserError
import io
import pathlib
from io import StringIO, BytesIO
import pandas
import requests
import gspread
from oauth2client.service_account import ServiceAccountCredentials

class IZITools(models.TransientModel):
    _inherit = 'izi.tools'

    @api.model
    def lib(self, key):
        lib = {
            'pandas': pandas,
            'requests': requests,
        }
        if key in lib:
            return lib[key]
        return super(IZITools, self).lib(key)
    
    @api.model
    def requests(self, method, url, headers={}, data={}):
        response = requests.request(method, url=url, headers=headers, data=data)
        return response

    @api.model
    def requests_io(self, method, url, headers={}, data={}):
        response = requests.request(method, url=url, headers=headers, data=data)
        return io.StringIO(response.content.decode('utf-8'))
    
    @api.model
    def read_csv(self, url, **kwargs):
        data = []
        try:
            df = pandas.read_csv(
                url,
                **kwargs
            )
            data = df.to_dict('records')
        except Exception as e:
            raise UserError(str(e))
        return data
    
    @api.model
    def read_excel(self, url, **kwargs):
        data = []
        try:
            df = pandas.read_excel(
                url,
                **kwargs
            )
            data = df.to_dict('records')
        except Exception as e:
            raise UserError(str(e))
        return data

    @api.model
    def read_attachment(self, attachment, **kwargs):
        self.check_su()
        data = []
        if not attachment:
            raise UserError('Attachment Not Found')
        try:
            if attachment.mimetype in ('application/vnd.ms-excel', 'text/csv'):
                df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
            elif attachment.mimetype == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                df = pandas.read_excel(BytesIO(attachment.raw))
            else:
                df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
            data = df.to_dict('records')
        except Exception as e:
            raise UserError(str(e))
        return data

    @api.model
    def read_attachment_by_name(self, attachment_name, **kwargs):
        self.check_su()
        Attachment = self.env['ir.attachment']
        attachment = Attachment.search([('name', '=', attachment_name)], limit=1)
        data = []
        if not attachment_name:
            raise UserError('Attachment Name Not Found')
        try:
            if attachment.mimetype in ('application/vnd.ms-excel', 'text/csv'):
                if pathlib.Path(attachment.name).suffix == '.xls':
                    df = pandas.read_excel(BytesIO(attachment.raw))
                else:
                    df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
            elif attachment.mimetype == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                df = pandas.read_excel(BytesIO(attachment.raw))
            else:
                df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
            data = df.to_dict('records')
        except Exception as e:
            raise UserError(str(e))
        return data
    
    @api.model
    def read_attachment_df(self, attachment, **kwargs):
        self.check_su()
        df = False
        if not attachment:
            raise UserError('Attachment Not Found')
        try:
            if attachment.mimetype in ('application/vnd.ms-excel', 'text/csv'):
                df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
            elif attachment.mimetype == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                df = pandas.read_excel(BytesIO(attachment.raw))
            else:
                df = pandas.read_csv(BytesIO(attachment.raw), encoding="latin1")
        except Exception as e:
            raise UserError(str(e))
        return df

    @api.model
    def gsheet_error_message(self, error):
        message = 'Something wrong from your google spreadsheet.\n\nError Details:\n%s' % error
        raise UserError(message)
    
    @api.model
    def gsheet_credential_handler(self, gsheet_credential):
        self.check_su()
        attachment = self.env['ir.attachment'].search([('name', '=', gsheet_credential)])
        if attachment.mimetype != 'application/json':
            self.gsheet_error_message('The credential must be json file.')
        credential = dict(pandas.read_json(BytesIO(attachment.raw), typ='series'))
        return credential
    
    @api.model
    def get_authorized_gsheet(self, gsheet_id, gsheet_credential):
        self.check_su()
        spreadsheet = False
        try:
            # Load credentials from the dictionary
            credential_dict = self.gsheet_credential_handler(gsheet_credential)
            credential = ServiceAccountCredentials.from_json_keyfile_dict(credential_dict)
            # Authorize with gspread
            gc = gspread.authorize(credential)

            #open the google spreadsheet
            spreadsheet = gc.open_by_key(gsheet_id)
        except Exception as e:
            self.gsheet_error_message(e.__doc__)
        return spreadsheet
    
    @api.model
    def get_unauthorized_gsheet(self, gsheet_id, gsheet_name):
        self.check_su()
        data = []
        try:
            gsheet_url = "https://docs.google.com/spreadsheets/d/{}/gviz/tq?tqx=out:csv&sheet={}".format(
                gsheet_id, gsheet_name.replace(' ', '%20'))
            df = pandas.read_csv(gsheet_url)
            data = df.to_dict('records')
        except Exception as e:
            self.gsheet_error_message(e.__doc__)
        return data

    @api.model
    def read_google_spreadsheet(self, gsheet_id='', gsheet_name='', gsheet_credential=''):
        self.check_su()
        data = []
        if not gsheet_credential:
            # Get data from unauthorized google spreadsheet
            data = self.get_unauthorized_gsheet(gsheet_id, gsheet_name)
        else:
            # Get data from authorized google spreadsheet
            spreadsheet = self.get_authorized_gsheet(gsheet_id, gsheet_credential)
            try:
                worksheet = spreadsheet.worksheet(gsheet_name) if gsheet_name else spreadsheet.get_worksheet(0)
                data = worksheet.get_all_records()
            except Exception as e:
                self.gsheet_error_message(e)
        return data

    @api.model
    def write_google_spreadsheet(self, gsheet_id='', gsheet_name='', gsheet_credential='', data=[]):
        self.check_su()
        # Get authorized Google Spreadsheet
        spreadsheet = self.get_authorized_gsheet(gsheet_id, gsheet_credential)

        try:
            worksheet = spreadsheet.worksheet(gsheet_name) if gsheet_name else spreadsheet.get_worksheet(0)

            # Write DataFrame to Google Spreadsheet
            df = pandas.DataFrame(data)
            header = df.columns.values.tolist()
            values = df.values.tolist()

            # Clear existing content in the worksheet
            worksheet.clear()

            # Update the worksheet with header and values using named arguments
            worksheet.update([header] + values)
        except Exception as e:
            self.gsheet_error_message(e.__doc__)
        
    @api.model
    def insert_google_spreadsheet(self, izi_table=False, gsheet_id='', gsheet_name='', gsheet_credential=''):
        self.check_su()
        raw_data = self.read_google_spreadsheet(gsheet_id, gsheet_name, gsheet_credential)

        if raw_data:
            # Convert keys to lowercase and replace spaces with underscores
            data = [{key.lower().replace(' ', '_'): value for key, value in datas.items()} for datas in raw_data]

            # Build Table Schma
            init_table = data[0]
            izi_table.get_table_fields_from_dictionary(init_table)
            izi_table.update_schema_store_table()
            
            # Truncate
            self.query_execute('TRUNCATE %s;' % izi_table.store_table_name)

            # Insert Data
            for r in data:
                self.query_insert('%s' % izi_table.store_table_name, r)
