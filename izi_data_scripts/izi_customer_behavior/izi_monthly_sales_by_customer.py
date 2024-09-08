# Parameters
init_table = True
start_date = '2021-10-01'
end_date = '2023-10-01'

# Prepare Table
if init_table and izi_table:
    # Data Dummy
    values = {
        'id': 1,
        'month': '1-Jan',
        'year': '2023',
        'value': 123.5,
        'quantity': 100.5,
    }
    # Build Table Schma
    izi_table.get_table_fields_from_dictionary(values)
    izi_table.update_schema_store_table()
    
    # Truncate
    izi.query_execute('TRUNCATE izi_monthly_sales_by_customer;')
    
# Get Monthly Sales By Area By Customer From Sales Order Line
res = izi.query_fetch('''
    SELECT
        to_char(sol.create_date, 'MM') AS month,
        to_char(sol.create_date, 'YYYY') AS year,
        SUM(sol.product_uom_qty) AS quantity,
        SUM(sol.price_total) AS value,
        so.partner_id AS customer_id,
        rp.name AS customer
    FROM sale_order_line sol
        LEFT JOIN sale_order so ON so.id = sol.order_id
        LEFT JOIN res_partner rp ON rp.id = so.partner_id
    WHERE
        so.state IN ('sale', 'done')
        AND so.date_order BETWEEN '%s' AND '%s'
    GROUP BY
        month,
        year,
        customer_id,
        customer    
''' % (start_date, end_date))

month_dict = {
    '01': '01 Jan',
    '02': '02 Feb',
    '03': '03 Mar',
    '04': '04 Apr',
    '05': '05 May',
    '06': '06 Jun',
    '07': '07 Jul',
    '08': '08 Aug',
    '09': '09 Sep',
    '10': '10 Oct',
    '11': '11 Nov',
    '12': '12 Dec',
}

for r in res:
    year = r.get('year')
    month = r.get('month')
    month_name = month_dict.get(month)
    customer_id = r.get('customer_id')
    customer = r.get('customer')
    value = r.get('value', 0)
    quantity = r.get('quantity', 0)
    values = {
        'month': month_name,
        'year': year,
        'customer_id': customer_id,
        'customer': customer,
        'value': value,
        'quantity': quantity,
    }
    izi.query_insert('izi_monthly_sales_by_customer', values)