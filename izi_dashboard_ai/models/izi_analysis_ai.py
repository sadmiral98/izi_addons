from odoo import models, fields, api, _
from odoo.exceptions import UserError
import openai
from openai import OpenAI
from retry.api import retry_call
from itertools import combinations
from bs4 import BeautifulSoup
import base64
import random
import json
from datetime import datetime
from io import BytesIO

PROMPT_TEMPLATE_DESCRIPTION = '''
You are a data analyst. Please explain the analysis below in plain %s.
Do not explain the data itself, just explain the importance of the analysis, the interesting data or the outliers, and the conclusion or recommendation for the business.
Do not explain the visualization.
For numbers, use abbreviation like million, billion, thousand, etc (in selected language)
Explain it point by point and separate each point with a period and new line (line break).
You must answer in html format and you can use bold and italic.
Do not change the font size and font family.

Example Format:
<h3>Monthly Sales By Product Category Analysis</h3>
<p>This analysis shows the monthly sales for each product category, including office furniture and services. The data used for this analysis includes three months of sales data, from April 2023 to June 2023.</p>
<p>It is interesting to note that:</p>
<ul>
  <li>Office furniture had the highest sales in May 2023, with a total of <b>$ 141 Thousands</b>.</li>
  <li>Services had the lowest sales overall, with a total of <b>$ 7.4 Thousand</b> over the three months.</li>
  <li>June 2023 had the lowest total sales overall, with a total of <b>$ 62 Thousands</b> for all product categories.</li>
</ul>
<p>Based on this analysis, the business can focus on promoting and improving the sales of office furniture, which has shown to be the most profitable product category. Additionally, the business can consider expanding their services offerings to increase their sales in that category.</p>
'''

PROMPT_TEMPLATE_DESCRIPTION_SHORT = '''
You are a data analyst. Please explain the analysis below in plain %s.
But do not translate the data label, keep as it is from the data.
Do not explain the data itself, just explain the importance of the analysis and the interesting data or the outliers.
Do not explain the visualization.
For numbers, use abbreviation like million, billion, thousand, etc (in selected language)
You must answer in html format and you can use bold and italic.
Do not change the font size and font family.
Explain in 1 paragraph only!

Example Format:
<p>This analysis shows the monthly sales for each product category, including office furniture and services. The data used for this analysis includes three months of sales data, from April 2023 to June 2023.
It is interesting to note that office furniture had the highest sales in May 2023, with a total of <b>$ 141 Thousands</b>. Services had the lowest sales overall, with a total of <b>$ 7.4 Thousand</b> over the three months.
June 2023 had the lowest total sales overall, with a total of <b>$ 62 Thousands</b> for all product categories.</p>
'''

PROMPT_TEMPLATE_INSIGHT_WITH_PARAMETER_LINKED = '''
You are a data analyst. Please explain the insights from the 'Data' analysis below in language %s.

User will give you Parent data (remember it as 'PARENT'), and Data (Remember it as 'DATA'). Explain the insight from this 'DATA' based on the 'PARENT' we already have. Explain the important or interesting data or the outliers. Do not explain the visualization.
For Example, the 'PARENT' is "May", and the parameter is "Highest Sales in 2024" , while the 'DATA' user gave is a lists of products sold on May. so the data explanation can be :
"'PARENT' had the 'parameter' because product A had the most sales in 2024 for 1000 Qty"

For numbers, use abbreviation like million, billion, thousand, etc (in selected language).
You must answer in html format and you can use bold and italic in the HTML.
Do not change the font size and font family. Give 10 insights!! About Highest data or lowest data or other interesting data in an json array.
Do not forget to return what interesting or important parameter you use for the response.

Give also the information which record you explain for example "Order Month: January 2024" to analyse further. Use the available fields and values from the data the user gave you.
Remember! Use the exact same field name and value from the data!
Remember! Only return insight from the 'DATA' for future analysis, no need to return insight of 'PARENT' again!

Example Format:
{
    "insights": [
        {
            "content": "<p>Ery Rivaldi had the highest number of sales with a count of <b>30</b>. With a highest sales status is <b>Cancelled</b> for <b>21</b>.</p>",
            "records": [
                "Status: Cancelled"
            ],
            "parameter" : "Highest sales status for Ery Rivaldi",
        },
        {
            "content": "<p> May is the highest sales. Product that had most sales in May is Office Chair on <b>300</b> Sales</p>",
            "records": [
                "Product: Office Chair",
            ],
            "parameter" : "Highest Product Sales on May",
        },
        {
            "content": "<p>June 2023 had the lowest total sales overall, with a total of <b>$ 62 Thousands</b> for all product categories.</p>",
            "records": [
                "M: June 2023"
            ],
            "parameter" : "Lowest sales overall",
        },
    ],
}
'''

PROMPT_TEMPLATE_INSIGHT_WITH_PARAMETER = '''
You are a data analyst. Please explain the insights from the analysis below in language %s.

1. First explain the insights, only explain the important or interesting data or the outliers. Do not explain the visualization.
For numbers, use abbreviation like million, billion, thousand, etc (in selected language).
You must answer in html format and you can use bold and italic in the HTML.
Do not change the font size and font family. Give 10 insights!! About Highest data or lowest data or other interesting data in an json array.
Do not forget to return what interesting or important parameter you use for the response.

Give also the information which record you explain for example "Order Month: January 2024" to analyse further. Use the available fields and values from the data the user gave you.
Remember! Use the exact same field name and value from the data!

Example Format:
{
    "insights": [
        {
            "content": "<p>Office furniture had the highest sales in May 2023, with a total of <b>$ 141 Thousands</b>.</p>",
            "records": [
                "M: May 2023"
            ],
            "parameter" : "Highest sales in May 2023"
        },
        {
            "content": "<p>Services had the lowest sales overall, with a total of <b>$ 7.4 Thousand</b> over the three months.</p>",
            "records": [
                "M: Jan 2023", 
                "M: Feb 2023", 
                "M: Mar 2023"
            ],
            "parameter" : "Lowest sales overall"
        },
        {
            "content": "<p>June 2023 had the lowest total sales overall, with a total of <b>$ 62 Thousands</b> for all product categories.</p>",
            "records": [
                "M: June 2023"
            ],
            "parameter" : "Lowest sales overall"
        },
        {
            "content": "<p>...</p>",
            "records": [
                "M: May 2023"
            ],
            "parameter" : ""
        },
    ],
}
'''

PROMPT_TEMPLATE_INSIGHT = '''
You are a data analyst. Please explain the insights from the analysis below in language %s.

1. First explain the insights, only explain the important or interesting data or the outliers. Do not explain the visualization.
For numbers, use abbreviation like million, billion, thousand, etc (in selected language).
You must answer in html format and you can use bold and italic in the HTML.
Do not change the font size and font family. Give 10 insights in an json array.

Give also the information which record you explain for example "Order Month: January 2024" to analyse further. Use the available fields and values from the data the user gave you.
Remember! Use the exact same field name and value from the data!

Example Format:
{
    "insights": [
        {
            "content": "<p>Office furniture had the highest sales in May 2023, with a total of <b>$ 141 Thousands</b>.</p>",
            "records": [
                "M: May 2023"
            ],
        },
        {
            "content": "<p>Services had the lowest sales overall, with a total of <b>$ 7.4 Thousand</b> over the three months.</p>",
            "records": [
                "M: Jan 2023", 
                "M: Feb 2023", 
                "M: Mar 2023"
            ],
        },
        {
            "content": "<p>June 2023 had the lowest total sales overall, with a total of <b>$ 62 Thousands</b> for all product categories.</p>",
            "records": [
                "M: June 2023"
            ],
        },
    ],
}
'''

PROMPT_TEMPLATE_CREATE = '''
You are a data analyst. I want to create a chart. I will give you the chart title and the metric fields and dimension fields of the table source.
You will select the right metric and dimension from the fields I gave you, to create the chart based on my title.

You will answer in this format only do not add any additional text:
metric=...
dimension=...
sort=...
visual_type=...
limit=...

visual_type can be selected from bar,line,table,pie,scorecard

For example, if I ask:
I want to create a chart titled "Top Customer"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=amount_total:sum
dimension=customer
sort=amount_total:desc
visual_type=bar
limit=10

For example, if I ask:
I want to create a chart titled "Monthly Sales"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=amount_total:sum
dimension=date_order:month
sort=date_order:asc
visual_type=line
limit=100

For example, if I ask:
I want to create a chart titled "All Sales Data in Table"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=amount_total:sum
metric=quantity:sum
metric=id:sum
dimension=date_order:day
dimension=product
dimension=product_category
dimension=customer
dimension=so_number
sort=so_number:asc
visual_type=table
limit=100

For example, if I ask:
I want to create a chart titled "Product Sales in Pie"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=amount_total:sum
dimension=product
sort=amount_total:desc
visual_type=pie
limit=10

if I ask to make a chart with title that does not show any dimension. Just answer with a metric and visual type scorecard.

For example, a chart title without dimension :
I want to create a chart titled "Total Sales"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=amount_total:sum
visual_type=scorecard
limit=100

For example, a chart title without dimension:
I want to create a chart titled "Total Product Sold"
with the metric fields: amount_total,quantity,id;
with the dimension fields: date_order,product,product_category,customer,so_number;

You will answer:
metric=quantity:sum
visual_type=scorecard
limit=100
'''

PROMPT_TEMPLATE_EXPLORE = '''
You are a data analyst. 
I will give you a table name and its fields' names and types.
Give me 20 analysis that you think can be built with this table.
Some analysis in timeseries, line chart, multiple metrics / dimensions are preferable (in day, week, month).
Some analysis in bar chart, multiple metrics / dimensions are preferable.
Some analysis in pie chart.
If it has multiple metrics, some analysis in scatter chart.
The rest can be in radar, flower, or any other charts.
You can only use field_names from the table.
You MUST answer in this FORMAT without any additional text (ignore the comment):

Analysis Name; Metrics; Dimensions; Visual Type; Description
# Visual type can only be filled with one of these values = ["bar", "line", "pie", "row", "scatter"]
# You can have multiple metrics and dimensions, separated by comma (,)
# For dimension of date type, you can add the date format before the field name, separated by colon (:) possible values of date_format = ["year", "month", "week", "day"]

Example Format:
Monthly Sales By Product Category; sum:total; month:date_order,product; bar; This analysis shows the monthly sales for each product category.
Daily Sales; sum:total; day:date_order; line; This analysis shows the daily sales.
Top Products; sum:total; product; pie; This analysis shows the top products by sales.
Product Counts; count:product; product; table; This analysis shows the number of products.
Sales Quantity By Category; sum:qty; product_category; pie; This analysis shows the top products by quantity sold.
'''

PROMPT_TEMPLATE_SCRIPT = '''
You are a code generator.
Only answer in %s syntax!
DO NOT ADD ANY OTHER TEXT, CODE ONLY!
DO NOT ADD "python" TEXT, CODE ONLY!
DO NOT ANSWER WITH THE ORIGIN CODE!
AND JUST ANSWER YOUR CODE THAT CONTINUE THE ORIGIN CODE!
You will continue the ORIGIN CODE below.
%s
'''

PROMPT_TEMPLATE_SCRIPT_LAST_ERROR = '''
You have generated code like this before, but it gives error %s
This is your previous code. FIX IT.
DO NOT ADD ANY OTHER TEXT, CODE ONLY!
%s
'''

PROMPT_TEMPLATE_CONSULT_SPECIFIC_TABLE_ASK_ANALYSIS = '''
You are a Data Consultant.
You will give any answer or suggestion related to Data Management, Solution, Analytic to the users questions.
Answer in %s language! in JSON format!

If you are asked to give suggestion what kind of chart or analytic should the user create. Check the table information that given later.
From those fields, give your 10 reccomendations what questions can be answered with this data and explanation why it is important. For example: "What is the top selling products?",
"When was the sales reached its peak?", etc.

Return the formatted answer without any additional texts. In QUESTION format!
Answer in short sentences.

{
    "response": "# START_SUMMARY
1. Top selling products
2. <Question 2>
3. <Question 3>
4. <Question 4>
5. <Question 5>
6. <Question 6>
7. <Question 7>
8. <Question 8>
9. <Question 9>
10. <Question 10>
# END_SUMMARY
"
}
'''

PROMPT_TEMPLATE_CONSULT_SPECIFIC_TABLE_MD = '''
You are a Data Consultant.
You will give any answer or suggestion related to Data Management, Solution, Analytic to the users questions.
Answer in %s language! in JSON format!

If you are asked with simple question that do not need to check any data,
JUST answer in text in "response". DO NOT ADD new key in the JSON. FOLLOW THE EXAMPLE!
EXAMPLE: How to do filters in odoo?
{
    "response": "We can use domain in Odoo like this ..."
}
EXAMPLE: What is the best analysis I can make from this data?
{
    "response": "You can analyse the product category sales, because ..."
}

If you are asked a question that must be answer with data, first check the table information that given later,
then you can define the metric fields, the dimension fields, and the sort fields to aggregate values for the answer.
Only use numeric / number / float / integer fields as the metrics, even if you use it to count rows!
Field format on dimensions can only be filled with day, week, month, quarter, and year.
If you are asked to drill down an analysis on specific condition, add filters and aggregate / group the data further
with other related fields.

If you need to define new fields to do computation (like percentage from value and target), you can define a
PSQL query from the table. If you define a new query, always SELECT FROM "source_table_name".
If all the fields already there in the table information, DO NOT DEFINE A NEW QUERY!

You can check the data from conversation above, but if you do not find any data or any field related to the questions, it means
you have to recalculate it again by defining the metrics and the dimensions from the very first table information.
DO NOT just answer with there is no sufficient field / information, without checking the table information.

EXAMPLE: How many order in 2023?
{
    "response": {
        "metrics": [{
            "field_name": "amount_total",
            "calculation": "count"
        }],
        "filters": [{
            "field_name": "date_order",
            "operator": ">=",
            "value": "2023-01-01"
        },{
            "field_name": "date_order",
            "operator": "<=",
            "value": "2023-12-31"
        }]
    }
}

EXAMPLE: What are the sales values on monthly basis in 2023?
{
    "response": {
        "metrics": [{
            "field_name": "amount_total",
            "calculation": "sum"
        }],
        "dimensions": [{
            "field_name": "date_order",
            "field_format": "month"
        }],
        "sorts": [{
            "field_name": "date_order",
            "sort": "asc"
        }],
        "limit": 10,
        "filters": [{
            "field_name": "date_order",
            "operator": ">=",
            "value": "2023-01-01"
        },{
            "field_name": "date_order",
            "operator": "<=",
            "value": "2023-12-31"
        }]
    }
}

EXAMPLE: Get 10 products with the highest percentage of sales achievement in 2024!
{
    "response": {
        "query": "
            SELECT
                -- Original Fields
                SUM(sales) AS sales,
                SUM(sales_target) AS sales_target,
                product,
                -- Include New Fields
                (SUM(sales)/COALESCE(NULLIF(sales_target, 0), 1) * 100) AS achievement_percentage
            FROM source_table_name
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
        }]
    }
}

Answer in short sentences. Focus on the question, avoid too much explanation except if the user want you to elaborate.
Check all the fields in the table, use the closest / most suitable fields to answer the question.
If you give a formula, do not use Latex or other format but use a simple python example or plain text with basic numerical operator.
'''

PROMPT_DECIDE = '''
You are an intelligent decision-making system integrated to Odoo ERP.
You will be provided by a question. Based on the question asked, decide which function to use between "action", "analytic", "search".
Return in JSON Format
The decision criteria are as follows:

1. If the question is related to data analytic that CONTAINS specific word = "ANALYSIS" OR "REPORT" (not case sensitive and might be in another languages). The type will be "analytic", otherwise use type "action".
If type "analytic", you have to give also the "table_keyword" (show which table is to get the data from) selected from "AVAILABLE_TABLE_KEYWORDS" that will be defined later. 
If there is no "table_keyword" that can answer the question, you can always choose from default Odoo table_name i.e (sale_order, sale_order_line, etc)
return
{
    "type": "analytic",
    "answer": "",
    "table_keyword": "mart_sales"
}

2. If the question can be answered by SEARCHING DATA, creating, or updating records or internal data in Odoo, OR ANY DATA RELATED WITHOUT WORD = "ANALYSIS" OR "REPORT",
return
{
    "type": "action",
    "answer": ""
}

3. If the question does not meet any criteria above,
return
{
    "type": "search",
    "answer": ""
}

Do not return anything else.

Example Question:
Make me a chart of top 10 customer this year
Answer:
{
    "type": "analytic",
    "answer": "",
    "table_keyword": "sales_customer_table"
}

Example Question 2:
Create a new sales order from customer "Azure"
Answer 2:
{
    "type": "action",
    "answer": ""
}

Example Question 3:
Top Product sales in 2023
Answer 3:
{
    "type": "analytic",
    "answer": "",
    "table_keyword": "sale_order_line"
}

Example Question 4:
What is the benefit of product A?
Answer 4:
{
    "type": "search",
    "answer": ""
}

Example Question 5:
How to create sales order in Odoo?
Answer 5:
{
    "type": "search",
    "answer": ""
}

Example Question 6:
How to be a successfull businessman?
Answer 6:
{
    "type": "search",
    "answer": ""
}

Example Question 7:
What products is customer "Azure" purchase in the last sales order
Answer 7:
{
    "type": "action",
    "answer": ""
}
'''

PROMPT_GENERATE_ANSWER_BY_KNOWLEDGE = '''
You are a professional assistant.
You will be provided by a question and the knowledge.
Your task is to give an professional answer to the questioner based on the knowledge.

IMPORTANT:
- Your answer maximum character is on 1000 - 1200 characters."
- You are STRONGLY not allowed to answer outside of knowledge provided!
- Do not inform me like 'Based on the provided knowledge' etc..
- Answer with the same languange as the question and knowledge!
- If the knowledge is False, find the answer from the whole conversations first to get any context!
- If still no answers, then you can answer with your own knowledges!
- DO NOT ANSWER WITH ANY MARKDOWN notation! Just plain text!
- DO NOT ANSWER WITH ANY MARKDOWN notation! Just plain text!
- DO NOT ANSWER WITH ANY MARKDOWN notation! Just plain text!

'''

PROMPT_GENERATE_ANSWER = '''
You are a professional assistant.
You will be provided by a question and the generated result.
Your task is to give an professional answer to the questioner using generated result.

IMPORTANT:
- Your answer maximum character is on 1000 - 1200 characters.
- If user choosing to continue, then continue the answer with the rest of the records.
- If generated result is a dictionary, DO Not tell about the ID and the model_name!
- If generated result is a dictionary, you must wrap the Name of result inside the <url> element, put the id and model name inside the <url>. must follow the example!
- Do not answer with any markdown notation, only return text with HTML like in the example!

Example question 1:
How much sales count with customer DKE?
Example generated result 1:
43
Example answer 1:
There is <b>43 Sales Count</b> in this system with customer DKE.

Example question 2:
Whats the name of sales order in February 2024?
Example generated result 2:
[{'id': 146, 'name': 'S00146', 'model_name': 'sale.order'}, {'id': 145, 'name': 'S00145', 'model_name': 'sale.order'}]
Example answer 2:
The name of Sales Orders on <b>February 2024</b> are <url id=146 model_name='sale.order'> SOO146 </url>, <url id=145 model_name='sale.order'> SOO145 </url>

Example question 3:
Create new PO for Customer John Mayer with product Bolt for 5 Pcs!
Example generated result 3:
[{'id': 17, 'name': 'P0017', 'model_name': 'purchase.order'}]
Example answer 3:
New Purchase Order has been created with name <url id=17 model_name='purchase.order'> P0017'</url>
'''


PROMPT_BUILD_PYTHON_CODE = '''
You are an Odoo programmer.

IMPORTANT:
- Your ONLY task is to generate Python code related to Odoo 17, based on the question provided.
- The code should be a Python function named `generated_ai_function`.
- Read the whole conversations to get any context!
- NEVER include any explanations, comments, or additional text.
- ONLY return the Python code inside the function.
- If the question involves related records (e.g., finding records in one model based on another model), you MUST use 'in' in the domain, and the related record should use .ids to be an array.
- If the question involves finding records based on a `Selection` field label (e.g., finding orders with state "RFQ"), you MUST map the label to the corresponding key and use it in the search domain.
- Follow the Odoo 17 basic database structure.
- If the code involves conditions, loops, or function calls, ensure that **all parentheses, brackets, and quotes are properly closed and matched**. This is critical to avoid syntax errors.
- ALWAYS double-check the syntax to ensure there are no typos, especially in critical areas like parentheses and brackets.
- If the question is about a specific record, provide the id, name, model name, and other field (if asked).
- Handle cases where there might be multiple related records (e.g., multiple partners).
- ALWAYS include all necessary imports and dependencies like `fields`, `datetime`, `_`, etc., **inside the function itself** to avoid any "not defined" errors.
- ALWAYS use "ilike" instead "=" if the search is for product's name
- IF the search of record does not found, try to find another similar record and return the suggestion.

Example question 1:
How much sales count with customer DKE?

Example answer 1:
def generated_ai_function(self):
    partner_domain = [('name', 'ilike', 'DKE')]
    partners = self.env['res.partner'].search( partner_domain )
    sales_domain = [('partner_id', 'in', partners.ids )]
    sales = self.env['sale.order'].search( sales_domain )
    return len(sales)

Example question 2:
Whats the name of sales order in February 2024?

Example answer 2:
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
    return vals

Example question 3:
Give me a list of Purchase order transactions on "RFQ" status.

Example answer 3:
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
    return vals

Example question 4:
Create a sales order for the customer named 'Ery'.

Example answer 4:
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
    return "No partner found with the name 'Ery'"

Example question 5:
Update P0001, change product "bolt" quantity to 50.

Example answer 5:
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
    return "Product 'bolt' not found in sales order S00151"

Example question 6:
Create a purchase order for customer "Azure", with product "sambal merah"

Example answer 6:
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
        }
    return "No partner found with the name 'Ery' or product 'Small Desk' not found"
'''

PROMPT_TEMPLATE_CONSULT_SPECIFIC_TABLE_SQL = '''
You are a Data Consultant.
You will give any answer or suggestion related to Data Management, Solution, Analytic to the users questions.
Answer in %s language!

If you are asked a question that must be answer with data, first check the table information that given later.
If the question CAN be answered by query that table, just answer with an SQL query with this format! Use source_table_name as the table name.
If you are asked to drill down an analysis, create a new SQL Query to group the data even more from different dimension.
Example:
# START_CODE_SQL
SELECT 
    SUM(amount_total) as amount_total, 
    product_name as product_name
FROM
    source_table_name
GROUP BY
    product_name
WHERE date >= '2022-01-01'
LIMIT 10
# END_CODE_SQL

Answer in short sentences. Focus on the question, avoid too much explanation except if the user want you to elaborate.
Check all the fields in the table, use the closest / most suitable fields to answer the question.
If you give a SQL Query or Python Code, please wrap the code or sql query with starting and ending line: "# START_CODE_SQL", "# START_CODE_PYTHON", "# END_CODE_SQL", "# END_CODE_PYTHON"
REMEMBER do not forget to add  "# START_CODE_SQL", "# END_CODE_SQL", for SQL Query.
If you give a SQL Query, always add alias for each fields.
Always use name instead of id for the fields used as the dimensions.
Always use PostgreSQL syntax!
If you give a formula, do not use Latex or other format but use a simple python example or plain text with basic numerical operator
Return the formatted answer without any additional texts.
'''

PROMPT_TEMPLATE_CONSULT_ALL_TABLES = '''
You are a Data Consultant.
You will give any answer or suggestion related to Data Management, Solution, Analytic to the users questions.
Answer in %s language! in JSON format!
1. If you are asked to give suggestion what kind of chart or analytic should the user create,
ask the user back about the company objectives, company industry, and key business processes.

2. The users are using Odoo ERP. So you should use only Odoo tables or models if asked to get the data.
You can see available tables or fields from Odoo documentation, github, or other latest public information in the internet.

If you give a sample code, please wrap the code or sql query with starting and ending line: "# START_CODE_SQL", "# START_CODE_PYTHON", "# END_CODE_SQL", "# END_CODE_PYTHON"
If you give a SQL Query, always add alias for each fields
Always use name instead of id for the fields used as the dimensions.
Always use PostgreSQL syntax!
If you give a formula, do not use Latex or other format but use a simple python example or plain text with basic numerical operator
Answer in short sentences. Focus on the question, avoid too much explanation except if the user want you to elaborate.
'''

PROMPT_TEMPLATE_CONSULT_EXPLAIN = '''
You are a Data Consultant.
You will give an explanation based on the data given, to answer the users questions.
Your explanation will first to answer the question. Then, you can also point out some interesting
findings in the data.
Always answer with the same languange as the question!

EXAMPLE: 
Question: What is the most popular product?
Data: Product A: 10.000, Product B: 5.000
The most popular product is Product A with sales value 10.000. The second most popular ....
(The Question is in English, so answer in english Too)

If you give a formula, do not use Latex or other format but use a plain text with basic numerical operator
Do not answer in markup / markdown / any html formatting. Just plain text.
Question: %s
Data: %s
'''

class IZIAnalysis(models.Model):
    _inherit = 'izi.analysis'

    def get_client_key(self):
        OPENAI_API_KEY = self.env['ir.config_parameter'].sudo().get_param('openapi_api_key')
        client = OpenAI(api_key=OPENAI_API_KEY)
        return client

    @api.model
    def get_ai_description(self, body):
        description = False
        analysis_name = body.get('analysis_name')
        visual_type_name = body.get('visual_type_name')
        data = body.get('data')
        is_short = body.get('is_short')
        if analysis_name and visual_type_name and data:
            language = body.get('language', 'English (US)')
            prompt = PROMPT_TEMPLATE_DESCRIPTION % language
            if is_short:
                prompt = PROMPT_TEMPLATE_DESCRIPTION_SHORT % language
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": "Analysis Name = %s. Visualization = %s. Data = %s." % (analysis_name, visual_type_name, str(data))},
            ]
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                description = response.choices[0].message.content
            except openai.APIError as e:
                #Handle API error here, e.g. retry or log
                description = (f"OpenAI API returned an API Error: {e}")
                pass
            except openai.APIConnectionError as e:
                #Handle connection error here
                description = (f"Failed to connect to OpenAI API: {e}")
                pass
            except openai.RateLimitError as e:
                #Handle rate limit error (we recommend using exponential backoff)
                description = (f"OpenAI API request exceeded rate limit: {e}")
                pass
            except Exception as e:
                pass
        return description

    def get_clicked_parent(self,clicked_parent):
        parts = clicked_parent.split('/')
        return parts[-1].strip()
    
    @api.model
    def get_ai_insight(self, body):
        insight = False
        parent_insight = False
        analysis_name = body.get('analysis_name')
        visual_type_name = body.get('visual_type_name')
        data = body.get('data')
        drilldown_level = body.get('drilldown_level')
        languange = body.get('languange')
        # print(languange)
        insight_model = self.env['izi.analysis.insight']
        if analysis_name and visual_type_name and data:
            if drilldown_level == 0:
                prompt = PROMPT_TEMPLATE_INSIGHT_WITH_PARAMETER % languange
                # prompt = PROMPT_TEMPLATE_INSIGHT % language
                messages = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Analysis Name = %s. Visualization = %s. Data = %s." % (analysis_name, visual_type_name, str(data))},
                ]
            else:
                prompt = PROMPT_TEMPLATE_INSIGHT_WITH_PARAMETER_LINKED % languange
                parent_obj = insight_model.search([
                    ('izi_lab_api_key','=',body.get('izi_lab_api_key')),
                    ('analysis_name','=',analysis_name),
                    ('drilldown_level','=',drilldown_level - 1),
                    ('languange','=',languange)
                ], order='id desc', limit=1)
                parent_data = parent_obj.content
                clicked_parent = body.get('drilldown_title')
                clicked_parent = self.get_clicked_parent(clicked_parent)
                
                parent_data_json = json.loads(parent_data)
                parent_insights = parent_data_json["insights"]

                parent_insight = self.find_parent_insight(parent_insights,clicked_parent)
                messages = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Analysis Name = %s. Visualization = %s. Parent_Datas = %s. Data = %s." % (analysis_name, visual_type_name, parent_insight, str(data))},
                ]

            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    response_format={"type": "json_object"},
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                insight = response.choices[0].message.content
                pass
            except openai.APIError as e:
                #Handle API error here, e.g. retry or log
                insight = (f"OpenAI API returned an API Error: {e}")
                pass
            except openai.APIConnectionError as e:
                #Handle connection error here
                insight = (f"Failed to connect to OpenAI API: {e}")
                pass
            except openai.RateLimitError as e:
                #Handle rate limit error (we recommend using exponential backoff)
                insight = (f"OpenAI API request exceeded rate limit: {e}")
                pass
            except Exception as e:
                pass
        return insight, parent_insight

    def find_parent_insight(self,parent_insights,clicked_parent):
        matched_insight = None
        for insight in parent_insights:
            for record in insight["records"]:
                if any(clicked_parent in record for record in insight["records"]):
                    matched_insight = insight
                    break
            if matched_insight:
                break
        
        return matched_insight

    def get_analysis_explore(self, body):
        data = body.get('data')
        fields = data.get('fields')
        explore_results = []
        metric_fields = []
        date_fields = []
        dimension_fields = []
        for field in fields:
            field_name = field.get('field_name')
            field_type = field.get('field_type')
            if field_type == 'number' and '_id' not in field_name:
                metric_fields.append(field_name)
            elif field_type in ('date', 'datetime'):
                date_fields.append(field_name)
                dimension_fields.append(field_name)
            elif field_type != 'number':
                dimension_fields.append(field_name)

        # 2 Metrics 1 Dimension
        # Scatter
        # Line
        two_metrics_results = []
        comb_metrics = combinations(set(metric_fields), 2)
        for metrics in comb_metrics:
            metric_values = []
            metric_names = []
            metric_name = ''
            for metric in metrics:
                metric_values.append({
                    'field_name': metric,
                    'calculation': 'sum',
                })
                metric_names.append(metric.replace('_', ' '))
            metric_name = (' & ').join(metric_names)
            metric_name = metric_name + ' '
            for dimension in dimension_fields:
                dimension_name = ''
                dimension_value = {
                    'field_name': dimension,
                }
                dimension_name += 'By ' + dimension.replace('_name', '').replace('_id', '').replace('_', ' ')  + ' '
                if dimension in date_fields:
                    dimension_value['field_format'] = random.choice(('day', 'week', 'month', 'year'))
                two_metrics_results.append({
                    'name': (metric_name + dimension_name).title().strip(),
                    'metrics': metric_values,
                    'dimensions': [dimension_value],
                    'visual_type': random.choice(('line', 'scatter')),
                    'description': '',
                })
        if len(two_metrics_results) > 10:
            explore_results += random.sample(two_metrics_results, 10)
        else:
            explore_results += two_metrics_results

        # 1 Metric 2 Dimension
        # Bar
        # Line (Date Fields)
        two_dimensions_results = []
        for metric in metric_fields:
            metric_name = ''
            calc = random.choice(('sum', 'avg'))
            metric_value = {
                'field_name': metric,
                'calculation': 'sum',
            }
            metric_name += metric.replace('_', ' ') + ' '
            comb_dimensions = combinations(set(dimension_fields), 2)
            for dimensions in comb_dimensions:
                dimension_values = []
                dimension_name = ''
                visual_type = random.choice(('bar', 'row'))
                for dimension in dimensions:
                    dimension_value = {
                        'field_name': dimension,
                    }
                    if dimension in date_fields:
                        dimension_value['field_format'] = random.choice(('day', 'week', 'month', 'year'))
                        dimension_values.insert(0, dimension_value)
                        visual_type = 'line'
                    else:
                        dimension_values.append(dimension_value)
                    dimension_name += 'By ' + dimension.replace('_name', '').replace('_id', '').replace('_', ' ') + ' '
                two_dimensions_results.append({
                    'name': (metric_name + dimension_name).title().strip(),
                    'metrics': [metric_value],
                    'dimensions': dimension_values,
                    'visual_type': visual_type,
                    'description': '',
                })
        if len(two_dimensions_results) > 10:
            explore_results += random.sample(two_dimensions_results, 10)
        else:
            explore_results += two_dimensions_results

        # 1 Metric 1 Dimension
        # Pie
        # Bar
        one_metric_one_dimension_results = []
        for metric in metric_fields:
            metric_name = ''
            calc = random.choice(('sum', 'avg'))
            metric_value = {
                'field_name': metric,
                'calculation': 'sum',
            }
            metric_name += metric.replace('_', ' ') + ' '
            for dimension in dimension_fields:
                dimension_name = ''
                dimension_value = {
                    'field_name': dimension,
                }
                dimension_name += 'By ' + dimension.replace('_name', '').replace('_id', '').replace('_', ' ')  + ' '
                visual_type = random.choice(('pie', 'bar', 'row'))
                if dimension in date_fields:
                    dimension_value['field_format'] = random.choice(('day', 'week', 'month', 'year'))
                    visual_type = 'line'
                one_metric_one_dimension_results.append({
                    'name': (metric_name + dimension_name).title().strip(),
                    'metrics': [metric_value],
                    'dimensions': [dimension_value],
                    'visual_type': visual_type,
                    'description': '',
                })
        if len(one_metric_one_dimension_results) > 50:
            explore_results += random.sample(one_metric_one_dimension_results, 50)
        else:
            explore_results += one_metric_one_dimension_results

        return explore_results

    def get_ai_analysis_explore(self, body):
        explore_results = []
        data = body.get('data')
        if data:
            prompt = PROMPT_TEMPLATE_EXPLORE
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": "%s" % (str(data))},
            ]
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                # response = retry_call(openai.ChatCompletion.create,
                #     fargs=[{
                #         "model": openai_model,
                #         "messages": messages,
                #         "top_p": 0.2,
                #         "frequency_penalty": 0,
                #         "presence_penalty": 0,
                #         "user": self.env.user.name,
                #     }],
                #     tries=3,
                #     delay=1,
                #     backoff=2,
                #     max_delay=120,
                #     logger=None)
                response = client.chat.completions.create(
                    model=openai_model,
                    messages=messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                res = response.choices[0].message.content
                res = res.split('\n')
                if res:
                    for exp in res:
                        exp = exp.strip()
                        exp = exp.split(';')
                        exp = [x.strip() for x in exp]
                        if len(exp) == 5:
                            metrics_vals = exp[1].split(',')
                            metrics = []
                            for metric_val in metrics_vals:
                                metric_val = metric_val.split(':')
                                metrics.append({
                                    'field_name': metric_val[1],
                                    'calculation': metric_val[0]
                                })
                            dimensions_vals = exp[2].split(',')
                            dimensions = []
                            for dimension_val in dimensions_vals:
                                dimension_val = dimension_val.split(':')
                                if len(dimension_val) == 1:
                                    dimensions.append({
                                        'field_name': dimension_val[0],
                                    })
                                elif len(dimension_val) == 2:
                                    dimensions.append({
                                        'field_name': dimension_val[1],
                                        'field_format': dimension_val[0] if dimension_val[0] in ['day', 'week', 'month', 'year'] else False
                                    })
                            explore_results.append({
                                'name': exp[0],
                                'metrics': metrics,
                                'dimensions': dimensions,
                                'visual_type': exp[3],
                                'description': exp[4],
                            })
            except openai.APIError as e:
                #Handle API error here, e.g. retry or log
                res = (f"OpenAI API returned an API Error: {e}")
                pass
            except openai.APIConnectionError as e:
                #Handle connection error here
                res = (f"Failed to connect to OpenAI API: {e}")
                pass
            except openai.RateLimitError as e:
                #Handle rate limit error (we recommend using exponential backoff)
                res = (f"OpenAI API request exceeded rate limit: {e}")
                pass
            except Exception as e:
                pass
        return explore_results
    
    def get_analysis_create(self, body):
        res = False
        title = body.get('title')
        metrics = body.get('metrics')
        dimensions = body.get('dimensions')
        if title and (metrics or dimensions):
            metrics = (',').join([str(m) for m in metrics])
            dimensions = (',').join([str(d) for d in dimensions])
            prompt = PROMPT_TEMPLATE_CREATE
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": "Title = %s. Metric Fields = %s. Dimension Fields = %s." % (title, metrics, dimensions)},
            ]
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                res = response.choices[0].message.content
            except openai.APIError as e:
                #Handle API error here, e.g. retry or log
                res = (f"OpenAI API returned an API Error: {e}")
                pass
            except openai.APIConnectionError as e:
                #Handle connection error here
                res = (f"Failed to connect to OpenAI API: {e}")
                pass
            except openai.RateLimitError as e:
                #Handle rate limit error (we recommend using exponential backoff)
                res = (f"OpenAI API request exceeded rate limit: {e}")
                pass
            except Exception as e:
                pass
        return res
    
    def get_ai_script(self, script_type, origin_code, last_generated_code='', last_error_message=''):
        code = ''
        if script_type and origin_code:
            prompt = PROMPT_TEMPLATE_SCRIPT % (script_type, origin_code)
            messages = [
                {"role": "system", "content": prompt},
            ]
            if last_generated_code and last_error_message:
                prompt_last_error = PROMPT_TEMPLATE_SCRIPT_LAST_ERROR % (last_error_message, last_generated_code)
                messages.append({"role": "system", "content": prompt_last_error})
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                code = response.choices[0].message.content
            except Exception as e:
                pass
        if code:
            code = code.replace('import', '# import')
            code = code.replace('from', '# from')
            code = code.replace('```python', '')
            code = code.replace('```', '')
        return code

    def get_ai_ask_explain(self, question, data, language):
        new_message_content = ''
        messages = []
        if question and data:
            prompt = PROMPT_TEMPLATE_CONSULT_EXPLAIN % (str(question), str(data))
            messages.insert(0, {"role": "system", "content": prompt})

            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
            except Exception as e:
                new_message_content = str(e)
        return new_message_content
    
    def get_ai_ask_decide(self, table_keywords, messages):
        result = ''
        if messages:
            # Prompt For Table Keywords
            prompt = 'AVAILABLE_TABLE_KEYWORDS\n\n%s' % (table_keywords)
            messages.insert(0, {"role": "system", "content": prompt})

            # Prompt For Decide Which Type Is The Query
            prompt = PROMPT_DECIDE
            messages.insert(0, {"role": "system", "content": prompt})
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    response_format={"type": "json_object"},
                    messages= messages,
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

    def get_ai_generate_answer(self, messages, language):
        new_message_content = ''
        if messages:
            prompt = PROMPT_GENERATE_ANSWER
            messages.insert(0, {"role": "system", "content": prompt})
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
            except Exception as e:
                new_message_content = str(e)
        return new_message_content


    def get_ai_answer_by_knowledge(self, messages, knowledge):
        new_message_content = ''
        if messages:
            prompt = PROMPT_GENERATE_ANSWER_BY_KNOWLEDGE
            messages.insert(0, {"role": "system", "content": prompt})
            last_message_content = messages[-1]['content']
            content_with_knowledge = f"Question = {last_message_content}, Knowledge = {knowledge}"
            messages[-1]['content'] = content_with_knowledge
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
                # new_message_content = new_message_content.replace('import', '# import')
                # new_message_content = new_message_content.replace('from', '# from')
                new_message_content = new_message_content.replace('```python', '')
                new_message_content = new_message_content.replace('```', '')
            except Exception as e:
                new_message_content = str(e)
        return new_message_content

    def get_ai_action_python(self, messages, table_information, language):
        new_message_content = ''
        if messages:
            prompt = PROMPT_BUILD_PYTHON_CODE
            messages.insert(0, {"role": "system", "content": prompt})
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
                # new_message_content = new_message_content.replace('import', '# import')
                # new_message_content = new_message_content.replace('from', '# from')
                new_message_content = new_message_content.replace('```python', '')
                new_message_content = new_message_content.replace('```', '')
            except Exception as e:
                new_message_content = str(e)
        return new_message_content
    
    def get_ai_ask(self, messages, table_information, table_prompt, language):
        new_message_content = ''
        if messages:
            if table_information:
                table_prompt = 'Table Information\n%s\n\n\nTable Fields\n%s' % (table_prompt, table_information)
                messages.insert(0, {"role": "system", "content": table_prompt})
                prompt = PROMPT_TEMPLATE_CONSULT_SPECIFIC_TABLE_MD % (language or 'English')
                messages.insert(0, {"role": "system", "content": prompt})
                messages.insert(0, {"role": "system", "content": "Now is %s" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'))})
            else:
                prompt = PROMPT_TEMPLATE_CONSULT_ALL_TABLES % (language or 'English')
                messages.insert(0, {"role": "system", "content": prompt})
            
            # Check Last Message
            if messages and messages[-1]['content'] == 'What analysis can you generate?':
                messages.append({"role": "system", "content": PROMPT_TEMPLATE_CONSULT_SPECIFIC_TABLE_ASK_ANALYSIS % (language or 'English')})
                
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    response_format={"type": "json_object"},
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                new_message_content = response.choices[0].message.content
                new_message_content = json.loads(new_message_content)
                if new_message_content.get('response'):
                    new_message_content = new_message_content.get('response')
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
        return new_message_content
        
    def get_ai_general_response(self, instructions):
        code = ''
        if instructions:
            messages = [
                {"role": "system", "content": instructions},
                {"role": "user", "content": instructions},
            ]
            try:
                client = self.get_client_key()
                openai_model = self.env['ir.config_parameter'].sudo().get_param('openapi_model') or 'gpt-3.5-turbo'
                response = client.chat.completions.create(
                    model=openai_model,
                    messages= messages,
                    top_p=0.2,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user = self.env.user.name,
                )
                code = response.choices[0].message.content
            except Exception as e:
                pass
        return code
    
    def get_ai_speech_text(self, body):
        try:
            client = self.get_client_key()
            
            base64_audio = body['audio']
            audio_data = base64.b64decode(base64_audio)
            audio_file = BytesIO(audio_data)
            audio_file.name = "audio.wav" 
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="text"
            )
            res = transcription
        except openai.APIError as e:
            #Handle API error here, e.g. retry or log
            res = (f"OpenAI API returned an API Error: {e}")
            pass
        except openai.APIConnectionError as e:
            #Handle connection error here
            res = (f"Failed to connect to OpenAI API: {e}")
            pass
        except openai.RateLimitError as e:
            #Handle rate limit error (we recommend using exponential backoff)
            res = (f"OpenAI API request exceeded rate limit: {e}")
            pass
        except Exception as e:
            pass
        
        return res


    def get_ai_speech(self, body):
        message = BeautifulSoup(body.get('data'), 'html.parser').get_text()

        try:
            client = self.get_client_key()
            response = client.audio.speech.create(
                model="tts-1",
                voice='alloy',
                input=message
            )

            for chunk in response.iter_bytes():
                res = base64.b64encode(chunk).decode()
                
        except openai.APIError as e:
            #Handle API error here, e.g. retry or log
            res = (f"OpenAI API returned an API Error: {e}")
            pass
        except openai.APIConnectionError as e:
            #Handle connection error here
            res = (f"Failed to connect to OpenAI API: {e}")
            pass
        except openai.RateLimitError as e:
            #Handle rate limit error (we recommend using exponential backoff)
            res = (f"OpenAI API request exceeded rate limit: {e}")
            pass
        except Exception as e:
            pass
        
        return res
        