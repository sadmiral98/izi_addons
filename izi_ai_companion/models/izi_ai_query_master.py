from odoo import models, fields, api, _
from odoo.exceptions import UserError
import openai
from openai import OpenAI
import psycopg2
from psycopg2 import sql
import requests
import json

PROMPT_DECIDE = '''
You are an intelligent decision-making system integrated to Odoo ERP.
You will be provided by a set of conversation. 
Based on the last question asked and the previous conversation, 
DECIDE 2 THINGS! message_classification and query_type!
Please read the WHOLE CONVERSATION to decide!

message_classification can only be chosen from these options: "new_topic", "follow_up", "retry_error", "security_warning", "inappropriate"
- If the last question feels like following up the previous conversation or still related to the previous answer or question, 
or even just questioning your answer like 'why?', 'how come?', 'really?',
or ask more detail like 'please elaborate', 'drill it down!',
when the context of the last question and previous messages are similar, then choose "follow_up"
- Else If the last question context is completely not related to the previous question context, it means the user ask new topic, then choose "new_topic" 
- Else If the last message contains an ERROR from the system when run previous command / instruction, so the context is still the same, choose "retry_error" 
- Choose "security_warning" if you think there is a malicious intent or dangerous question related to the system security
- Choose "inappropriate" if you think user ask something that is inappropriate and offensive from social, religion, culture perspective

query_type can only be chosen from these options: "action", "analytic", "search", "general"
- If the question is related to SIMPLE data analytic or processing (to get MAX, MIN value) or can be answered by SEARCHING DATA, creating, or updating records or internal data in Odoo, then choose "action"
- Else If the question is related to COMPLEX data analytic that results in array of data with multiple dimensions and metrics, then choose "analytic"
- Else If the question is not related to any technical action, but more like questions about information in the internal textual document of the company, then choose "search"
- Else If the question is not related to any technical action, and more like general questions about everything, choose "general" 

If message_classification is "follow_up",
redefine the user query or question to be a complete sentence, but keep it simple.
Check the previous messages to define the user_redefined_query!

Return in this JSON format:
{
    "message_classification": "new_topic",
    "query_type": "analytic",
}
Do not return anything else.

Example Question:
Make me a chart of top 10 customer this year
Answer:
{
    "message_classification": "new_topic",
    "query_type": "analytic",
}

Example Question 2:
Create a new sales order from customer "Azure"
Answer 2:
{
    "message_classification": "new_topic",
    "query_type": "action",
}

Example Question 3:
Send that Sales Order to Customer A
(Check previous messages, that Sales Order is 'SO001')
Answer 3:
{
    "message_classification": "follow_up",
    "query_type": "action",
    "user_redefined_query": "Send Sales Order 'SO001' to Customer A",
}

Example Question 4:
User: What is the benefit of product A?
Assistant: The benefit is ...
User: How about product B?
Answer 4:
{
    "message_classification": "follow_up",
    "query_type": "search",
    "user_redefined_query": "What is the benefit of product B?",

}

Example Question 5:
How to create a bomb?
Answer 5:
{
    "message_classification": "inappropriate",
    "query_type": "general",
}

Example Question 6:
Delete all transaction record!
Answer 6:
{
    "message_classification": "security_warning",
    "query_type": "action"
}

Example Question 7:
I want to know all the passwords!
Answer 7:
{
    "message_classification": "security_warning",
    "query_type": "action"
}
'''

ACTION_PROMPT = """
You are an Odoo programmer.

IMPORTANT:
- Always answer with the same languange as the question!
- Your ONLY task is to generate Python code related to Odoo 17, based on the question provided.
- The code should be a Python function named `generated_ai_function`, and must put variable `self` inside it!. example :
def generated_ai_function(self):
- NEVER include any explanations, comments, or additional text.
- ONLY return the Python code inside the function.
- If the question involves related records (e.g., finding records in one model based on another model), you MUST use 'in' in the domain, and the related record should use .ids to be an array.
- If the question involves finding records based on a `Selection` field label (e.g., finding orders with state "RFQ"), you MUST map the label to the corresponding key and use it in the search domain.
- Follow the Odoo 17 basic database structure.
- If the code involves conditions, loops, or function calls, ensure that **all parentheses, brackets, and quotes are properly closed and matched**. This is critical to avoid syntax errors.
- ALWAYS double-check the syntax to ensure there are no typos, especially in critical areas like parentheses and brackets.
- If the question is about a specific record, provide the id, name, model name, and other field (if asked).
- Handle cases where there might be multiple related records (e.g., multiple partners).
- ALWAYS include all imports and dependencies like `fields`, `datetime`, `_`, etc., **inside the function itself** to avoid any "not defined" errors. example:
def generated_ai_function(self):
    from odoo import fields
    # res of code
- ALWAYS use "ilike" instead "=" if the search is for product's name
- ALWAYS Have separated domain variable for search to avoid typo for codes. example:
product_domain = [('name', 'ilike', 'office')]
product = self.env['product.product'].search( product_domain , limit=1)
- IF the search of record does not found, write a code to search for all possible similar records.
Like search with the first word, or first three letters, or first two letters (like in the examples).
Then ask user, which record is the right one.
- IF the user is following up his queries, you have to check previous messages first.
You do not need to write code that search record all over again, if in his previous messages
the record / document name or number has been mentioned. So the code will be much simpler.
If the user asked to create a record, and then want to update it. Do not create a new record again!
Use the same previous created record!
- ALWAYS RETURN THE RESULT IN DICTIONARY CONTAINING ID, NAME, AND THE MODEL_NAME. EXAMPLE :
    return {
        'id': model_obj.id,
        'name': model_obj.name,
        'model_name': model_obj._name
    }
- IF THE RESULT IS MORE THAN ONE, LOOP EACH RECORDS AND RETURN THE ID, NAME, AND MODEL NAME IN DICTIONARY ARRAYS. EXAMPLE :
    vals = []
    for sale in sales:
        vals.append({
            'id':sale.id,
            'name':sale.name,
            'model_name':sale.model_name,
        })
    return vals

- Sometimes users ask more than 1 question at a time.
Always define a follow_up_question too to the user, based on the users questions that has not been answered.
Else, you can also define a follow_up_question based on the action you made.

Follow the format below in JSON format!
{
"code":"
def generated_ai_function(self):
    sales_domain = [( 'date_order', '>=', '2024-02-01' ), ( 'date_order', '<', '2024-03-01' )]
    sales = self.env['sale.order'].search( sales_domain )
    vals = []
    for sale in sales:
        vals.append({
            'id':sale.id,
            'name':sale.name,
            'model_name':sale._name
        })
    return vals",
"follow_up_question": "Do you want to check which sales order is not invoiced yet?"
}
"""

ACTION_EXAMPLE_PROMPT = """
Example question 1:
How much sales count with customer Derma Konsep Estetika?

Example answer 1:
{
"code":"
def generated_ai_function(self):
    partner_domain = [('name', 'ilike', 'Derma Konsep Estetika')]
    partners = self.env['res.partner'].search( partner_domain )
    if not partners:
        # Search Possible Records Then Return And Ask User
        first_word_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Derma')], ['id', 'name'], limit=10)
        first_three_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Der%')], ['id', 'name'], limit=10)
        first_two_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'De%')], ['id', 'name'], limit=10)
        first_one_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'D%')], ['id', 'name'], limit=10)
        return {
            'message': 'Partner Not Found'
            'possible_records': str(first_word_partners + first_three_letters_partners + first_two_letters_partners + first_one_letters_partners),
        }

    sales_domain = [('partner_id', 'in', partners.ids )]
    sales = self.env['sale.order'].search( sales_domain )
    return len(sales)",
"follow_up_question": ""
}

Example question 2:
Whats the name of sales order in February 2024?

Example answer 2:
{
"code":"
def generated_ai_function(self):
    sales_domain = [( 'date_order', '>=', '2024-02-01' ), ( 'date_order', '<', '2024-03-01' )]
    sales = self.env['sale.order'].search( sales_domain )
    vals = []
    for sale in sales:
        vals.append({
            'id':sale.id,
            'name':sale.name,
            'model_name':sale._name
        })
    return vals",
"follow_up_question": ""
}

Example question 3:
Give me a list of Purchase order transactions on "RFQ" status.

Example answer 3:
{
"code":"
def generated_ai_function(self):
    purchase_orders_domain = [( 'state', '=', 'RFQ' )]
    purchase_orders = self.env['purchase.order'].search( purchase_orders_domain)
    if !len(purchase_orders):
        state_to_find = 'RFQ'
        state_selection = dict(self.env['purchase.order'].fields_get(allfields=['state'])['state']['selection'])
        state = ''
        for key, value in state_selection.items():
            if value == state_to_find:
                state = key
        purchase_orders_domain = [('state', '=', state)]
        purchase_orders = self.env['purchase.order'].search( purchase_orders_domain )
    vals = []
    for po in purchase_orders:
        vals.append({
            'id': po.id,
            'name': po.name,
            'model_name': po._name
        })
    return vals",
"follow_up_question": ""
}

Example question 4:
Create a sales order for the customer named 'Ery'.

Example answer 4:
{
"code":"
def generated_ai_function(self):
    from odoo import fields
    
    partner_domain = [('name', 'ilike', 'Ery')]
    partner = self.env['res.partner'].search(partner_domain, limit=1)
    if partner:
        sale_order = self.env['sale.order'].create({
            'partner_id': partner.id,
            'date_order': fields.Date.today(),
        })
        return {
            'id': sale_order.id,
            'name': sale_order.name,
            'model_name': sale_order._name
        }
    else:
        # Search Possible Records Then Return And Ask User
        first_word_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Ery')], ['id', 'name'], limit=10)
        first_three_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Ery%')], ['id', 'name'], limit=10)
        first_two_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Er%')], ['id', 'name'], limit=10)
        first_one_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'E%')], ['id', 'name'], limit=10)
        return {
            'message': 'Partner Not Found'
            'possible_records': str(first_word_partners + first_three_letters_partners + first_two_letters_partners + first_one_letters_partners),
        }",
"follow_up_question": "Which products do you want to add to the sales order?"
}

Example question 5:
Update that PO, change product "bolt" quantity to 50. Also check if any other PO also contain "bolt".
(Check previous messages with the same context, found that PO refer to "P0001")
(There are two queries the user asked, solve the first one then make the second query as follow_up_question)

Example answer 5:
{
"code":"
def generated_ai_function(self):
    purchase_order = self.env['purchase.order'].search([('name', '=', 'P0001')], limit=1)
    if sale_order:
        product_bolt = self.env['product.product'].search([('name', 'ilike', 'bolt')], limit=1)
        if product_bolt:
            sale_order_line = self.env['sale.order.line'].search([('order_id', '=', sale_order.id), ('product_id', '=', product_bolt.id)], limit=1)
            if sale_order_line:
                sale_order_line.write({
                    'price_unit': 1.0
                })
                return "Price of product 'bolt' updated successfully in sales order S00151"
    else:
        # Search Possible Records Then Return And Ask User
        first_word_products = self.env['product.product'].search_read([('name', 'ilike', 'bolt')], ['id', 'name'], limit=10)
        first_three_letters_products = self.env['product.product'].search_read([('name', 'ilike', 'bol%')], ['id', 'name'], limit=10)
        first_two_letters_products = self.env['product.product'].search_read([('name', 'ilike', 'bo%')], ['id', 'name'], limit=10)
        first_one_letters_products = self.env['product.product'].search_read([('name', 'ilike', 'b%')], ['id', 'name'], limit=10)
        return {
            'message': 'Product Not Found'
            'possible_records': str(first_word_products + first_three_letters_products + first_two_letters_products + first_one_letters_products),
        }",
"follow_up_question": "Do you want to check if any other PO also contain 'bolt'?" (The second query the user asked)
}

Example question 6:
Create a purchase order for that customer with previous product!
(Check previous messages with the same context, found customer named "Azure" and product "Sambal Merah")

Example answer 6:
{
"code":"
def generated_ai_function(self):
    from odoo import fields

    partner_domain = [('name', 'ilike', 'Azure')]
    partner = self.env['res.partner'].search(partner_domain, limit=1)

    product_domain = [('name', 'ilike', 'Sambal Merah')]
    product = self.env['product.product'].search(product_domain, limit=1)

    #suggestion :
    if not product:
        search_terms = query.split()
        domain = ['|'] * (len(search_terms) - 1)  # Prepare OR conditions
        for term in search_terms:
            domain.append(('name', 'ilike', term))
        
        suggestion_product = self.env['product.product'].search(domain, limit=5)
        if suggestion_product:
            suggestion_product_name = suggestion_product.mapped('name')
            return f"Product sambal merah is not found, do you mean { suggestion_product_name } ?"
        
    if not partner:
        # Search Possible Records Then Return And Ask User
        first_word_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Ery')], ['id', 'name'], limit=10)
        first_three_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Ery%')], ['id', 'name'], limit=10)
        first_two_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'Er%')], ['id', 'name'], limit=10)
        first_one_letters_partners = self.env['res.partner'].search_read([('name', 'ilike', 'E%')], ['id', 'name'], limit=10)
        return {
            'message': 'Partner Not Found'
            'possible_records': str(first_word_partners + first_three_letters_partners + first_two_letters_partners + first_one_letters_partners),
        }

    if partner and product:
        purchase_order = self.env['purchase.order'].create({
            'partner_id': partner.id,
            'date_order': fields.Date.today(),
            'order_line': [(0, 0, {
                'product_id': product.id,
                'product_uom_qty': 2,
            })]
        })
        return {
            'id': purchase_order.id,
            'name': purchase_order.name,
            'model_name': purchase_order._name
        }",
"follow_up_question": ""
}
"""

ANALYTIC_PROMPT = """
You are a Data Consultant. You are going to create a SQL Query or some JSON configuration to extract and process
data from Odoo ERP.

First, you can check if there is any data from the conversation above.
If the question can be answered with previous data in the conversation, you dont need to do recalculation,
Directly answer the question based on the data.

Otherwise, create a new calculation by building a PostgreSQL Query from table information / instruction that will be given later.
Use only table on the instruction. Do not use any other table, except there is no instruction, 
only then you can use your latest knowledge of Odoo tables.
And SELECT some other fields that are related to the table even if it is not related to questions.
For example, LEFT JOIN res_partner FROM sale_order to get partner name even if the question is about sales value.
It can be used for drilling down the data later.

If you are using alias or "AS" in query "SELECT field", do not forget to use the alias instead of the original field_name,
in the metrics and dimensions!
If you are using LIKE or ILIKE, do not forget to add '%' to the string value!

Then you can define the metric fields, the dimension fields, and the sort fields to aggregate values for the answer.
Only use numeric / number / float / integer fields as the metrics, even if you use it to count rows!
Metric calculation can only be filled with count, sum, avg only!
Field format on dimensions can only be filled with day, week, month, quarter, and year.
If you are asked to drill down an analysis on specific condition, add filters and aggregate / group the data further
with other related fields.

Sometimes users ask more than 1 question at a time.
Always define a follow_up_question too to the user, based on the users questions that has not been answered.
Else, you can also define a follow_up_question based on the analysis you made,
for example, you can ask if the user want to drilldown the analysis, or
if the user want to know more about the data.

Follow the format below and return in JSON format!
"""

ANALYTIC_EXAMPLE_PROMPT = """
EXAMPLE: What are the sales values on Dec 2023?
(Check the conversation above and found related data already available)
{
    "recalculation": false,
    "message": "According to the data above, the sales value on Dec 2023 is ...", 
    "follow_up_question": "Do you want to know which customer on Dec 2023 has the most sales?"
}

EXAMPLE: What are the sales values on monthly basis in 2023?
(Check the conversation above and not found any related data)
{
    "recalculation": true,
    "query": "
        SELECT
            sum(sol.product_uom_qty) as sold_quantity,
            sum(sol.qty_delivered) as delivered_quantity,
            sum(sol.qty_invoiced) as invoiced_quantity,
            sum(so.amount_total) as sales_value_total, -- Use Alias
            sum(sol.price_total) as price_total,
            sum(sol.price_subtotal) as price_subtotal,
            sum(sol.price_tax) as price_tax,
            sum(sol.price_unit) as price_unit,
            so.date_order as transaction_date, -- Use Alias
            so.commitment_date as delivery_date,
            so.state as order_state,
            pp.default_code as default_code,
            pt.name ->> 'en_US' as product_name,
            pt.type as type,
            pc.name as category,
            rp.name as customer,
            rcs.name as state,
            rp.city as city
        FROM sale_order_line sol
        LEFT JOIN sale_order so on so.id = sol.order_id
        LEFT JOIN product_product pp on sol.product_id = pp.id
        LEFT JOIN product_template pt on pp.product_tmpl_id = pt.id
        LEFT JOIN product_category pc on pt.categ_id = pc.id
        LEFT JOIN res_partner rp on so.partner_id = rp.id
        LEFT JOIN res_country_state rcs on rp.state_id = rcs.id
        GROUP BY
            so.date_order,
            so.commitment_date,
            so.state,
            pp.default_code,
            pt.name,
            pt.type,
            pc.name,
            rp.name,
            rcs.name,
            rp.city
    ",
    "metrics": [{
        "field_name": "sales_value_total", # (Use The Alias)
        "calculation": "sum"
    }],
    "dimensions": [{
        "field_name": "transaction_date", # (Use The Alias)
        "field_format": "month"
    }],
    "sorts": [{
        "field_name": "transaction_date", # (Use The Alias)
        "sort": "asc"
    }],
    "limit": 10,
    "filters": [{
        "field_name": "transaction_date", # (Use The Alias)
        "operator": ">=",
        "value": "2023-01-01"
    },{
        "field_name": "transaction_date", # (Use The Alias)
        "operator": "<=",
        "value": "2023-12-31"
    }],
    "follow_up_question": "Do you want to drill down the analysis on the lowest sales months, like January?"
}


EXAMPLE: Get 10 products with the highest percentage of sales achievement in 2024!
(Check the conversation above and not found any related data)
{
    "recalculation": true,
    "query": "
        SELECT
            -- Original Fields
            SUM(sales) AS sales,
            SUM(sales_target) AS sales_target,
            product,
            -- Include New Fields
            (SUM(sales)/COALESCE(NULLIF(sales_target, 0), 1) * 100) AS achievement_percentage
        FROM example_custom_sales_target_table
        WHERE 
            date_order >= '2024-01-01'
            AND date_order <= '2024-12-31'
        GROUP BY
            product
        LIMIT 10
    ",
    "metrics": [{
        "field_name": "achievement_percentage",
        "calculation": "sum"
    }],
    "dimensions": [{
        "field_name": "product",
    }],
    "sorts": [{
        "field_name": "achievement_percentage",
        "sort": "desc"
    }],
    "limit": 10,
    "filters": [{
        "field_name": "date_order",
        "operator": ">=",
        "value": "2024-01-01"
    },{
        "field_name": "date_order",
        "operator": "<=",
        "value": "2024-12-31"
    }],
    "follow_up_question": "Do you want to also check which product has the least achievement percentage?"
}
"""

GENERAL_PROMPT = """
You will provided by a question, answer with the same languange as the question!
Follow the instruction given below!
Just restructure the answer to become complete formal sentences in text, you can also answer with bullets / points.
"""

GENERAL_PROMPT_LLM = """
You will provided by a question, answer it with your own latest knowledges.
Always answer with the same languange as the question!
"""

FOLLOW_UP_PROMPT = """
THIS USER IS FOLLOWING UP HIS PREVIOUS MESSAGES.
So you have to CHECK CAREFULLY previous recent messages to answer the user last question / message.
The last message has the same message with the previous ones!
So understand the context and answer accordingly!

Below is your instruction!
"""

RETRY_ERROR_PROMPT = """
THIS IS YOUR RETRY TO ANSWER USER QUERY CORRECTLY.
Previously you give wrong answer that resulted in an error. Below is the error message from the users engine.
So answer the last question again with better result based on the error message!

Below is your instruction!
"""

# models
EMBEDDING_MODEL = "text-embedding-ada-002"
GPT_MODEL = "gpt-3.5-turbo"

class IZIAiQueryMaster(models.Model):
    _name = 'izi.ai.query.master'
    _description = 'izi.ai.query.master Table'
    _rec_name = 'query'

    query = fields.Char('Query')
    query_type = fields.Selection([
        ('action', 'Action'),
        ('analytic', 'Analytic'),
        ('search', 'Search'),
        ('general', 'General'),
    ], string='Query Type', required=True)
    description = fields.Text('Description')
    default_prompt = fields.Text('Default Prompt')
    instructional_prompt = fields.Text('Instructional Prompt')
    response = fields.Text('Response')
    version = fields.Selection([
        ('14', 'V14'),
        ('15', 'V15'),
        ('16', 'V16'),
        ('17', 'V17'),
    ], string='Version')
    
    def get_client_key(self):
        OPENAI_API_KEY = self.env['ir.config_parameter'].sudo().get_param('openapi_api_key')
        client = OpenAI(api_key=OPENAI_API_KEY)
        return client
    
    # @api.model
    # def create(self, vals):
    #     rec = super(IZIAiQueryMaster, self).create(vals)
    #     return rec
    
    def unlink(self):
        vector_db_config = self.env.company.get_vector_config()
        conn = psycopg2.connect(**vector_db_config)
        cur = conn.cursor()
        for rec in self:
            cur.execute("""
                DELETE FROM vector_izi_ai_query_master
                WHERE query_master_id = %s
            """, (rec.id,))
        conn.commit()
        cur.close()
        conn.close()
        res = super(IZIAiQueryMaster, self).unlink()
        return res
    
    def update_default_prompt(self):
        return False

    def get_embedding(self, text):
        client = self.get_client_key()
        response = client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        embedding = response.data[0].embedding
        token = response.usage.total_tokens

        # return embedding, token
        return embedding
    def store_embedding(self):
        embedding_description = str(self.get_embedding(self.description))
        embedding_query = str(self.get_embedding(self.query))
        vector_db_config = self.env.company.get_vector_config()
        conn = psycopg2.connect(**vector_db_config)
        cur = conn.cursor()
        # hapus vector yang sudah masuk.
        cur.execute("""
            DELETE FROM vector_izi_ai_query_master
            WHERE query_master_id = %s
        """, (self.id,))
        cur.execute("""
            INSERT INTO vector_izi_ai_query_master (
                query,
                query_type,
                description,
                instructional_prompt,
                response,
                version,
                query_master_id,
                embedding_query,
                embedding_description
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (self.query,self.query_type,self.description,self.instructional_prompt,self.response,self.version, self.id, embedding_query, embedding_description))

        conn.commit()
        cur.close()
        conn.close()

    def get_response(self):
        check = self.check_vector_db_exist()
        if check:
            messages = [{"role": "user", "content": self.query}]
            query_type = self.query_type
            # Default Main Prompt
            default_prompt = ''
            if query_type == 'action':
                default_prompt = ACTION_PROMPT
            elif query_type == 'analytic':
                default_prompt = ANALYTIC_PROMPT
            elif query_type == 'search':
                default_prompt = GENERAL_PROMPT
            elif query_type == 'general':
                default_prompt = GENERAL_PROMPT

            # Instructional Prompt & Example Answer
            # If Not Set, Use Default Instructional / Example Prompt
            instructional_prompt = self.instructional_prompt or ''
            if not instructional_prompt:
                if query_type == 'analytic':
                    instructional_prompt = ANALYTIC_EXAMPLE_PROMPT
                    
            # Final Prompt
            final_prompt = default_prompt + '\n\nInstruction:\n' + instructional_prompt + '\n\n Question:\n' + (self.query or '') + '\n\n Answer:\n' + (self.response or '')
            if final_prompt:
                messages.insert(0, {"role": "system", "content": final_prompt})
            
            new_message_content = ''
            if messages:
                try:
                    openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                    client = self.get_client_key()
                    response = client.chat.completions.create(
                        model=openai_model,
                        messages= messages,
                        top_p=0.2,
                        frequency_penalty=0,
                        presence_penalty=0,
                        user = self.env.user.name,
                    )
                    new_message_content = response.choices[0].message.content
                    if type(new_message_content) == str:
                        new_message_content = new_message_content.replace('```python\n', '')
                        new_message_content = new_message_content.replace('```javascript\n', '')
                        new_message_content = new_message_content.replace('```sql\n', '')
                        new_message_content = new_message_content.replace('```python', '')
                        new_message_content = new_message_content.replace('```javascript', '')
                        new_message_content = new_message_content.replace('```sql', '')
                        new_message_content = new_message_content.replace('```', '')
                        new_message_content = new_message_content.replace('**', '')
                except Exception as e:
                    new_message_content = str(e)
            self.response = new_message_content

    def check_vector_db_exist(self):
        result = True
        init = False

        try:
            vector_db_config = self.env.company.get_vector_config()
            # conn = psycopg2.connect(dbname="postgres", **vector_db_config)
            conn = psycopg2.connect(**{**vector_db_config, "dbname": "postgres"})
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(sql.SQL("SELECT 1 FROM pg_database WHERE datname = %s"), [vector_db_config['dbname']])
            exists = cur.fetchone()
            if not exists:
                cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(vector_db_config['dbname'])))
                print(f"Database '{vector_db_config['dbname']}' created successfully.")
                init = True
            else:
                print(f"Database '{vector_db_config['dbname']}' already exists.")
            cur.close()
            conn.close()
            if init:
                self.init_db_vector()
        except Exception as e:
            print(f"\n\nError Check Vector: {e}")
            result = False

        return result
    
    def init_db_vector(self):
        vector_db_config = self.env.company.get_vector_config()
        conn = psycopg2.connect(**vector_db_config)
        cur = conn.cursor()
        # Enable the vector plugin
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        print(f"Vector plugin enabled successfully on database {vector_db_config['dbname']}.")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS vector_izi_ai_query_master (
                id SERIAL PRIMARY KEY,
                query TEXT,
                query_type VARCHAR(50),
                description TEXT,
                instructional_prompt TEXT,
                response TEXT,
                version VARCHAR(50),
                query_master_id INT,
                embedding_query VECTOR(1536),
                embedding_description VECTOR(1536)
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
    
    def query_similar(self, embedding, field_name='description'):
        threshold = 0.4
        limit = 1
        embedding = str(embedding)
        result = False
        field_name = f"embedding_{field_name}"
        try:
            vector_db_config = self.env.company.get_vector_config()
            conn = psycopg2.connect(**vector_db_config)
            if self.env.company.default_threshold:
                threshold = self.env.company.default_threshold
            cur = conn.cursor()
            query = f"""
                SELECT query, response, query_master_id, vector_izi.{field_name} <-> %s AS similarity
                FROM vector_izi_ai_query_master vector_izi
                WHERE vector_izi.{field_name} <-> %s <= %s
                ORDER BY similarity
                LIMIT %s
            """
            cur.execute(query, (embedding, embedding, threshold, limit))
            result = cur.fetchall()

            cur.close()
            conn.close()
        except Exception as e:
            print(f"\n\nError Query Similar: {e}")
        
        return result

    # 
    # API FUNCTIONS
    # 
    def handle_query(self, messages, params={}):
        # Parameters
        last_prompt = ''
        last_topic = ''
        if params:
            last_prompt = params.get('last_prompt', '')
            last_topic = params.get('last_topic', '')

        # First Let LLM Decide The Message Classification and Query Type First
        # Handle By Message Classification
        query_info = self.get_ai_ask_decide(messages)
        message_classification = False
        llm_query_type = False
        user_redefined_query = ''
        params['user_redefined_query'] = ''
        if query_info:
            message_classification = query_info.get('message_classification')
            llm_query_type = query_info.get('query_type')
            query_type = llm_query_type
            if messages and message_classification == 'follow_up' and query_info.get('user_redefined_query'):
                user_redefined_query = query_info.get('user_redefined_query', '')
                params['user_redefined_query'] = user_redefined_query

        else:
            raise UserError('Error While Getting Query Information!') 

        # Default Main Prompt
        default_prompt = ''
        if query_type == 'action':
            default_prompt = ACTION_PROMPT + '\n\n' + ACTION_EXAMPLE_PROMPT
        elif query_type == 'analytic':
            default_prompt = ANALYTIC_PROMPT + '\n\n' + ANALYTIC_EXAMPLE_PROMPT
        elif query_type == 'search':
            default_prompt = GENERAL_PROMPT
        elif query_type == 'general':
            default_prompt = GENERAL_PROMPT

        # Slice Messages To The Last Topic + N_messages Before Last Topic
        if messages and len(messages) > 0:
            sliced_messages = []
            i = len(messages) - 1
            last_topic_index = 0
            N_messages = 4
            while i >= 0 and i >= (last_topic_index - N_messages):
                msg = messages[i]
                sliced_messages.insert(0, msg)
                if (msg.get('role') == 'user' and msg.get('content') == last_topic):
                    last_topic_index = i
                i -= 1
            messages = sliced_messages.copy()

        # New Topic
        if message_classification == 'new_topic':
            # Last Topic Is The Last User Query In New Topic Classification
            if messages and messages[-1] and (messages[-1]).get('content'):
                last_topic = (messages[-1]).get('content')
                last_prompt = ''
                params['last_topic'] = last_topic
                params['last_prompt'] = last_prompt

            # If It Is A New Topic, Can We Just Ask LLM The Last Query From The User?
            # Or At Least Only N Messages From The Last
            N_messages = 6
            if len(messages) > N_messages:
                messages = messages[-N_messages:]
                messages.insert(0, {"role": "system", "content": "There are other previous messages before..."})

            # We Will Check Query Type From Query Master With RAG First
            # Query Type From LLM Is The Second Opinion, 
            result, query_type, instructional_prompt = self.get_companion_rag(messages)
            if result:
                # Store The Last RAG Form To Be Used In Follow Up / Retry Error Correctly
                last_prompt = instructional_prompt
                params['last_prompt'] = last_prompt
            else:
                # If Not Found
                query_type = llm_query_type
                if message_classification == 'new_topic':
                    result = self.process_ai_answers(default_prompt, messages, query_type)

        elif message_classification == 'follow_up':
            if messages and user_redefined_query:
                messages[-1]['content'] = user_redefined_query
            result, query_type, instructional_prompt = self.get_companion_rag(messages)
            if result:
                last_prompt = instructional_prompt
                params['last_prompt'] = last_prompt
            else:
                query_type = llm_query_type
                # If The User Query Is Follow Up, Retain The Last Prompt To Increase Accuracy On The Same Context
                final_follow_up_prompt = FOLLOW_UP_PROMPT + '\n' + last_prompt + '\n' + default_prompt
                result = self.process_ai_answers(final_follow_up_prompt, messages, query_type)

        elif message_classification == 'retry_error':
            # If The User Query Is Retry Error, Retain The Last Prompt To Increase Accuracy On The Same Context
            final_retry_error_prompt = RETRY_ERROR_PROMPT + '\n' + last_prompt + '\n' + default_prompt
            result = self.process_ai_answers(final_retry_error_prompt, messages, query_type)

        elif message_classification == 'security_warning':
            query_type = "general"
            result = "Your query has been flagged as a potential security concern. Please refrain from sharing or inquiring about sensitive security-related information. If this was a mistake, please contact our support team for further assistance."

        elif message_classification == 'inappropriate':
            query_type = "general"
            result = self.process_ai_answers(default_prompt, messages, query_type)
            # result = "Your message has been flagged as inappropriate. Please be respectful and adhere to the guidelines to maintain a positive environment for all users. If this was a mistake, please contact our support team for further assistance."

        else:
            query_type = "general"
            result = self.process_ai_answers(default_prompt, messages, query_type)

        return result, query_type, params


    def get_ai_ask_decide(self, messages):
        result = ''
        if messages:
            decide_messages = messages.copy()
            # Prompt For Decide Which Type Is The Query
            prompt = PROMPT_DECIDE
            decide_messages.insert(0, {"role": "system", "content": prompt})
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    response_format={"type": "json_object"},
                    messages= decide_messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                result = response.choices[0].message.content
                result = json.loads(result)
            except Exception as e:
                result = str(e)
        return result
    
    def get_companion_rag(self, messages):
        last_message = messages[-1]['content']
        example_response = ''
        example_query = ''
        query_master_id = ''
        query_type = ''
        result = False
        instructional_prompt = ''

        embedding_messages = self.get_embedding(last_message)
        knowledge_query = self.query_similar(embedding_messages, "query")
        knowledge_description = self.query_similar(embedding_messages, "description")
        
        if knowledge_query:
            threshold_query = knowledge_query[0][3]
            example_response = knowledge_query[0][1]
            example_query = knowledge_query[0][0]
            query_master_id = knowledge_query[0][2]
            
        elif knowledge_description:
            threshold_description = knowledge_description[0][3]
            example_response = knowledge_description[0][1]
            example_query = knowledge_description[0][0]
            query_master_id = knowledge_description[0][2]
        example_response = example_response.replace('```python', '')
        example_response = example_response.replace('```', '')

        if query_master_id:
            query_master_obj=self.browse(int(query_master_id))
            query_type = query_master_obj.query_type
            # Default Main Prompt
            default_prompt = ''
            if query_type == 'action':
                default_prompt = ACTION_PROMPT
            elif query_type == 'analytic':
                default_prompt = ANALYTIC_PROMPT
            elif query_type == 'search':
                default_prompt = GENERAL_PROMPT
            elif query_type == 'general':
                default_prompt = GENERAL_PROMPT

            # Instructional Prompt & Example Answer
            # If Not Set, Use Default Instructional / Example Prompt
            instructional_prompt = query_master_obj.instructional_prompt or ''
            if not instructional_prompt:
                if query_type == 'analytic':
                    instructional_prompt = ANALYTIC_EXAMPLE_PROMPT
                    
            # Final Prompt
            final_prompt = default_prompt + '\n\nInstruction:\n' + instructional_prompt + '\n\n Question:\n' + example_query + '\n\n Answer:\n' + example_response
            result = query_master_obj.process_ai_answers(final_prompt, messages, query_type)

        return result, query_type, instructional_prompt

    def process_ai_answers(self, prompt, messages, query_type):
        response_format = {"type": "text"}
        if prompt:
            messages.insert(-1, {"role": "system", "content": prompt})
            if query_type in ('analytic', 'action'):
                response_format = {"type": "json_object"}
        if messages:
            try:
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                client = self.get_client_key()
                response = client.chat.completions.create(
                    model=openai_model,
                    response_format=response_format,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
                if type(new_message_content) == str:
                    new_message_content = new_message_content.replace('```python\n', '')
                    new_message_content = new_message_content.replace('```javascript\n', '')
                    new_message_content = new_message_content.replace('```sql\n', '')
                    new_message_content = new_message_content.replace('```python', '')
                    new_message_content = new_message_content.replace('```javascript', '')
                    new_message_content = new_message_content.replace('```sql', '')
                    new_message_content = new_message_content.replace('```', '')
                    new_message_content = new_message_content.replace('**', '')
                    if query_type in ('analytic', 'action'):
                        new_message_content = json.loads(new_message_content)
            except Exception as e:
                new_message_content = str(e)
        return new_message_content
