from odoo import models, fields, api, _
from odoo.exceptions import UserError
from openai import OpenAI
import json

MAX_RETRY_COUNT = 3
PROMPT_TEMPLATE_2 = '''
You are a data analyst. 
If I give you a keyword, give me 2 dashboard analysis related to the keyword.
The data source is Odoo 14 Community Edition with default modules.
I have installed these modules in the Odoo: <MODULES>

The keyword is usually follow this format: 
<Calculation> <Metric 1>, <Metric 2> By <Dimension 1> By <Dimension 2> <Other Notes>
For Example:
Total Sales and Untaxed Daily (Metric 1: Total Sales, Metric 2: Total Untaxed, Dimension 1: Date in Daily Format, Date Field: Date Order)
Top Products by Sales (Metric 1: Total Sales, Dimension 1: Product, Date Field: Date Order)
Top Sales by Product by City (Metric 1: Total Sales, Dimension 1: Product, Dimension 2: City, Date Field: Date Order)
Daily Sales by State (Metric 1: Total Sales, Dimension 1: Date in Daily Format, Dimension 2: State, Date Field: Date Order) # If there is date dimension, the date dimension is always the first dimension.
April and May 2023 Sales Comparison By Product (Metric 1: Total Sales, Dimension 1: Date in Month Format, Dimension 2: Product, Other Notes: Filter April and May 2023 , Date Field: Date Order)
Top Sales by Product by City in April 2023 (Metric 1: Total Sales, Dimension 1: Product, Dimension 2: City, Other Notes: Filter April 2023 only, Date Field: Date Order)

YOU WILL ANSWER in this FORMAT without any other text, and have to follow this FORMAT (Ignore the comment after #):
[
    {
        "source": "Odoo", # Always fill with "Odoo"
        "name": "Total Sales and Untaxed Daily", # Name of the analysis
        "method": "query", # Always fill with "query"
        "query": "SELECT SUM(amount_total) as total, SUM(amount_untaxed) as untaxed, date_order as date FROM sale_order GROUP BY date_order;", # PostgreSQL query, the field name MUST BE AVAILABLE in Odoo 14 Community Edition default modules without any modification / customization and the ones I have installed.
        "visual_type": "line", # Can be filled with one of these values = ["table", "bar", "line", "pie", "row", "bar_line", "row_line", "scrcard_basic", "scrcard_trend", "scrcard_progress", "bullet_bar", "bullet_row", "radar", "flower", "radialBar", "scatter"]
        "metrics": [
            {
                "calculation": "sum", # First metric is required. Can be filled with one of these values = ["sum", "avg", "count"]
                "field": "total"
            },
            {
                "calculation": "sum", # Second or third metric is optional. If the metric is multiple, the dimension is only one.
                "field": "untaxed"
            }
        ],
        "dimensions": [
            {
                "field": "date",
                "format": "day" # Optional, can be filled with one of these values = ["day", "week", "month", "year"] if the field is date or datetime
            }
        ],
        "sorts": [
            {
                "field": "date",
                "sort": "asc" # Can be filled with one of these values = ["asc", "desc"]
            }
        ],
        "date_field": "date", # Always get at least one date / datetime field from query
        "limit": 50, # Limit the data to show in the chart. Must be filled with integer from 50 to 100 if the first dimension is not date field. If the first dimension is date field, the limit is 1000.
        "xywh": [0, 0, 6, 4] # Always fill with [0, 0, 6, 4]
    }, 
    {
        "source": "Odoo",
        "name": "Top Products",
        "method": "query",
        "query": "SELECT SUM(sol.price_subtotal) as total, pt.name as product, date_trunc('day', so.date_order) as date FROM sale_order_line sol LEFT JOIN sale_order so ON sol.order_id = so.id LEFT JOIN product_product pp ON sol.product_id = pp.id LEFT JOIN product_template pt ON pp.product_tmpl_id = pt.id GROUP BY pt.name, date_trunc('day', so.date_order);", # Use name field instead of id field. Even if the analysis do not require a field date, you must get the date field from query.
        "visual_type": "bar",
        "metrics": [
            {
                "calculation": "sum",
                "field": "total"
            }
        ],
        "dimensions": [
            {
                "field": "product"
            }
        ],
        "sorts": [
            {
                "field": "total",
                "sort": "desc"
            }
        ],
        "date_field": "date", # Even if the analysis do not require a field date, you must fill this field with the date field from query.
        "limit": 50,
        "xywh": [0, 0, 6, 4]
    },
    {
        "source": "Odoo",
        "name": "Top Sales by Product by City",
        "method": "query",
        "query": "SELECT SUM(sol.price_subtotal) as total, pt.name as product, rp.city as city, date_trunc('day', so.date_order) as date FROM sale_order_line sol LEFT JOIN sale_order so ON sol.order_id = so.id LEFT JOIN res_partner rp ON so.partner_id = rp.id LEFT JOIN product_product pp ON sol.product_id = pp.id LEFT JOIN product_template pt ON pp.product_tmpl_id = pt.id GROUP BY rp.city, pt.name, date_trunc('day', so.date_order);", # Use name field instead of id field. Even if the analysis do not require a field date, you must get the date field from query.
        "visual_type": "bar",
        "metrics": [
            {
                "calculation": "sum",
                "field": "total"
            }
        ],
        "dimensions": [
            {
                "field": "product"
            },
            {
                "field": "city" # Second dimension. If there is date dimension, the date dimension is always the first dimension.
            }
        ],
        "sorts": [
            {
                "field": "city",
                "sort": "asc"
            }
        ],
        "date_field": "date", # Even if the analysis do not require a field date, you must fill this field with the date field from query.
        "limit": 50,
        "xywh": [0, 0, 6, 4]
    },
    {
        "source": "Odoo",
        "name": "Daily Sales by State",
        "method": "query",
        "query": "SELECT SUM(amount_total) as total, state, date_order as date FROM sale_order GROUP BY date_order, state;",
        "visual_type": "line",
        "metrics": [
            {
                "calculation": "sum",
                "field": "total"
            }
        ],
        "dimensions": [
            {
                "field": "date",
                "format": "day"
            },
            {
                "field": "state"
            }
        ],
        "sorts": [
            {
                "field": "date",
                "sort": "asc"
            }
        ],
        "date_field": "date",
        "limit": 1000, # If there is date dimension, the limit is 1000.
        "xywh": [0, 0, 6, 4]
    },
    {
        "source": "Odoo",
        "name": "April and May 2023 Sales Comparison By Product",
        "method": "query",
        "query": "SELECT SUM(amount_total) as total, date_order as date, pt.name as product FROM sale_order so LEFT JOIN product_product pp ON so.product_id = pp.id LEFT JOIN product_template pt ON pp.product_tmpl_id = pt.id WHERE date_order >= '2023-04-01' AND date_order <= '2023-05-31' GROUP BY date_order, pt.name;",
        "visual_type": "bar",
        "metrics": [
            {
                "calculation": "sum",
                "field": "total"
            }
        ],
        "dimensions": [
            {
                "field": "date",
                "format": "month"
            },
            {
                "field": "product"
            }
        ],
        "sorts": [
            {
                "field": "date",
                "sort": "asc"
            }
        ],
        "date_field": "date",
        "limit": 50,
        "xywh": [0, 0, 6, 4]
    }
]
'''

class IZIDashboard(models.Model):
    _inherit = 'izi.dashboard'

    def get_client_key(self):
        OPENAI_API_KEY = self.env['ir.config_parameter'].sudo().get_param('openapi_api_key')
        client = OpenAI(api_key=OPENAI_API_KEY)
        return client

    @api.model
    def get_ai_search(self, keyword):
        res = {
            'status': 500,
        }
        prompt = PROMPT_TEMPLATE_2.replace('<MODULES>', ','.join(self.env['ir.module.module'].search([('state', '=', 'installed')]).mapped('name')))
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": "Keyword = %s. YOU WILL ANSWER in the same FORMAT without any other text." % keyword},
        ]
        client = self.get_client_key()
        openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
        response = client.chat.completions.create(
            model=openai_model,
            messages= messages,
            # model="text-davinci-003",
            # prompt=prompt,
            top_p=0.2,
            frequency_penalty=0,
            presence_penalty=0,
            user = self.env.user.name,
        )
        try:
            code = response.choices[0].message.content
            res = {
                'message': code,
                'status': 200,
                'config': json.loads(code),
            }
            
        except Exception as e:
            res = {
                'message': str(e),
                'status': 500,
            }
        return res

    # def action_ai_search(self, keyword, delete_analysis=False):
    #     res = {
    #         'status': 500,
    #     }
    #     prompt = PROMPT_TEMPLATE_2.replace('<MODULES>', ','.join(self.env['ir.module.module'].search([('state', '=', 'installed')]).mapped('name')))
    #     messages = [
    #         {"role": "system", "content": prompt},
    #         {"role": "user", "content": "Keyword = %s. YOU WILL ANSWER in the same FORMAT without any other text." % keyword},
    #     ]
    #     openai.api_key = self.env['ir.config_parameter'].sudo().get_param('openapi_api_key')
    #     responsclient.chat.completions.create(
    #         model=openai_model,
    #         messages= messages,
    #         # model="text-davinci-003",
    #         # prompt=prompt,
    #         top_p=0.2,
    #         frequency_penalty=0,
    #         presence_penalty=0,
    #         user = self.env.user.name,
    #     )
    #     try:
    #         if delete_analysis:
    #             self.analysis_ids.unlink()
    #         code = response['choices'][0]['message']['content']
    #         messages.append({"role": "assistant", "content": code})
            
    #         # Call izi.dashboard.config.wizard to create dashboard
    #         res = self.env['izi.dashboard.config.wizard'].create({
    #             'dashboard_id': self.id,
    #             'code': code,
    #         }).process_wizard()

    #         # Retry the error analysis
    #         res = self.retry_ai_search(res, messages)
            
    #     except Exception as e:
    #         res = {
    #             'message': str(e),
    #             'status': 500,
    #         }
    #     return res
    
    # def retry_ai_search(self, res, messages, retry_count=0):
    #     if retry_count > MAX_RETRY_COUNT:
    #         return res
    #     if res['errors'] and len(res['errors']) > len(res['successes']):
    #         retry_count += 1
    #         retry_message = 'There is error in these analysis. Please fix the error and retry. YOU WILL ANSWER in the same previous FORMAT without any other text.\n'
    #         for err in res['errors']:
    #             retry_message += '%s: %s\n' % (err['name'], err['error'])
    #         messages.append({"role": "user", "content": retry_message})
    #         responsclient.chat.completions.create(
    #             model=openai_model,
    #             messages= messages,
    #             top_p=0.2,
    #             frequency_penalty=0,
    #             presence_penalty=0,
    #             user = self.env.user.name,
    #         )
    #         code = response['choices'][0]['message']['content']
    #         messages.append({"role": "assistant", "content": code})
    #         res = self.env['izi.dashboard.config.wizard'].create({
    #             'dashboard_id': self.id,
    #             'code': code,
    #         }).process_wizard()
    #         if res['errors'] and len(res['errors']) > len(res['successes']):
    #             self.retry_ai_search(res, messages, retry_count)
    #     return res
    
    # def convert_csv_code_to_dict(self, csv_code):
    #     json_code = []
    #     for line in csv_code.split('\n'):
    #         try:
    #             if line:
    #                 line = line.split('|')
    #                 js = {
    #                     'source': 'Odoo',
    #                     'name': line[0],
    #                     'method': line[1],
    #                     'query': line[2],
    #                     'visual_type': line[3],
    #                     'metrics': [
    #                         {
    #                             'calculation': line[4],
    #                             'field': line[5],
    #                         }
    #                     ],
    #                     'dimensions': [],
    #                     'sorts': [],
    #                     'xywh': [0, 0, 4, 3],
    #                 }
    #                 if len(line) >= 7 and line[6]:
    #                     js['dimensions'].append({
    #                         'field': line[6],
    #                     })
    #                 if len(line) >= 8 and line[7]:
    #                     js['dimensions'].append({
    #                         'field': line[7],
    #                     })
    #                 if len(line) >= 10 and line[8] and line[9]:
    #                     js['sorts'].append({
    #                         'field': line[8],
    #                         'sort': line[9],
    #                     })
    #                 json_code.append(js)
    #         except Exception as e:
    #             continue
    #     return json_code

    