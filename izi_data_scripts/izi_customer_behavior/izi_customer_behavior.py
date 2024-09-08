# Parameters
math = izi.lib('math')
init_table = True
start_date = '2021-10-01'
end_date = '2023-10-01'

# Functions
def get_linear_regression_line(params):
    n = params.get('n')
    x_mean = params.get('x_mean')
    y_mean = params.get('y_mean')
    sxx = 0
    sxy = 0
    x = 0
    while x < n:
        y = params.get('y_array')[x]
        x_x_mean = x - x_mean
        y_y_mean = y - y_mean
        sxy += (x_x_mean * y_y_mean)
        sxx += (x_x_mean * x_x_mean)
        x += 1
    gradient = sxy / sxx
    intercept = y_mean - (gradient * x_mean)
    # Calculate Standard Deviation
    se = 0
    sst = 0
    x = 0
    while x < n:
        y = params.get('y_array')[x]
        y_pred = (gradient * x) + intercept
        y_diff = y - y_pred
        y_diff_squared = y_diff * y_diff
        y_mean_diff = y - y_mean
        y_mean_diff_squared = y_mean_diff * y_mean_diff
        sst += y_mean_diff_squared
        se += y_diff_squared
        x += 1
    mse = se / n
    rmse = math.sqrt(mse)
    r2 = 1 - (se / sst)
    return {
        'gradient': gradient,
        'intercept': intercept,
        'rmse': rmse,
        'r2': r2,
    }

# Prepare Table
if init_table:
    # Data Dummy
    values = {
        'year': 2022,
        'quarter': '2022 Q1',
        'partner_id': 1,
        'customer': 'Gharta Hadisa Halim',
        'last_date_order': '2023-08-01',
        'last_order_days': 30,
        'churned': False,
        
        'total_order': 30,
        'total_value': 200000000.0,
        'total_discount': 2000000.0,
        'total_items': 30,
        'total_lines': 30,
        'total_unique_variants': 30,
        'total_unique_subcontract_variants': 30,
        'total_unique_main_variants': 30,
        
        'average_interval': 4.5,
        'average_order_value': 1000000.0,
        'average_price_unit': 1000000.0,
        'average_order_items': 1000000.0,
        'average_total_lines': 100,
        
        'lowest_interval': 2.1,
        'highest_interval': 9.8,
        'lowest_value': 100000.0,
        'highest_value': 200000000.0,
        
        'all_values': '',
        'all_intervals': '',
        'all_frequency': '',
        'gradient_values': 1.1,
        'gradient_frequency': 1.1,
        'rmse_values': 1.1,
        'rmse_frequency': 1.1,
        'r2_values': 1.1,
        'r2_frequency': 1.1,
        
        'invoice_amount_residual': 100000.0,
        'invoice_amount_total': 0,
        'total_invoices': 10.0,
        'total_unpaid': 10.0,
        'total_late': 10.0,
        'percentage_ontime': 10.0,
        'percentage_late': 10.0,
        'percentage_unpaid': 10.0,
        'percentage_unpaid_value': 10.0,
    }
    # Build Table Schma
    izi_table.get_table_fields_from_dictionary(values)
    izi_table.update_schema_store_table()
    
    # Truncate
    izi.query_execute('TRUNCATE izi_customer_behavior;')
    
    # Insert Data Dummy 
    # izi.query_insert('izi_customer_behavior', values)

# Sales Order Lines
res_sales = izi.query_fetch('''
    SELECT
        so.id as so_id,
        so.name as so_name,
        rp.id as partner_id,
        rp.name as partner_name,
        so.date_order,
        SUM(sol.price_total) as amount_total,
        SUM(sol.product_uom_qty) as product_uom_qty,
        SUM(sol.price_total)/SUM(sol.product_uom_qty) as average_price_unit,
        SUM(sol.price_unit * sol.product_uom_qty * sol.discount / 100) as price_discount,
        COUNT(sol.id) as total_lines
    FROM sale_order_line sol
        LEFT JOIN sale_order so ON (so.id = sol.order_id)
        LEFT JOIN res_partner rp ON (so.partner_id = rp.id)
    WHERE 
        so.date_order >= '%s'
        AND so.date_order < '%s'
        AND so.state NOT IN ('draft', 'cancel')
    GROUP BY
        so.id,
        so.name,
        rp.id,
        rp.name,
        so.date_order
    ORDER BY
        so.date_order ASC
''' % (start_date, end_date))

# Time Grooup
time_group_keys = []
start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d')
end_date_obj = datetime.datetime.strptime(end_date, '%Y-%m-%d')
cur_date_obj = start_date_obj
while cur_date_obj < end_date_obj:
    # Add 1 Month Using Timedelta
    time_group_keys.append(cur_date_obj.strftime('%Y-%m'))
    cur_date_obj = cur_date_obj + datetime.timedelta(days=31)
    cur_date_obj = cur_date_obj.replace(day=1)
# izi.alert(str(time_group_keys))
max_time_group = len(time_group_keys)
    
values_by_customer = {}
for r in res_sales:
    so_id = r['so_id']
    so_name = r['so_name']
    partner_id = r['partner_id']
    partner_name = r['partner_name']
    date_order = r['date_order']
    amount_total = r['amount_total']
    product_uom_qty = r['product_uom_qty']
    average_price_unit = r['average_price_unit']
    price_discount = r['price_discount']
    total_lines = r['total_lines']
    # time_group = date_order.isocalendar()[1]
    time_group = date_order.strftime('%Y-%m')
    
    if partner_id not in values_by_customer:
        values_by_customer[partner_id] = {
            'partner_id': partner_id,
            'customer': partner_name,
            
            'total_order': 0,
            'total_value': 0,
            'total_items': 0,
            'total_discount': 0,
            'total_lines': 0,
            'all_values': {},
            'all_frequency': {},
            'all_intervals': [],
            'all_total_items_per_order': [],
            
            'last_date_order': None,
            
            'highest_value': None,
            'lowest_value': None,
            'highest_interval': None,
            'lowest_interval': None,
        }
    # Add Total
    values_by_customer[partner_id]['total_order'] += 1
    values_by_customer[partner_id]['total_value'] += amount_total
    values_by_customer[partner_id]['total_items'] += product_uom_qty
    values_by_customer[partner_id]['total_discount'] += price_discount
    values_by_customer[partner_id]['total_lines'] += total_lines
    if time_group not in values_by_customer[partner_id]['all_values']:
        values_by_customer[partner_id]['all_values'][time_group] = 0
        values_by_customer[partner_id]['all_frequency'][time_group] = 0
    values_by_customer[partner_id]['all_values'][time_group] += amount_total
    values_by_customer[partner_id]['all_frequency'][time_group] += 1
    
    values_by_customer[partner_id]['all_total_items_per_order'].append(product_uom_qty)
    
    if not values_by_customer[partner_id]['highest_value'] or amount_total > values_by_customer[partner_id]['highest_value']:
        values_by_customer[partner_id]['highest_value'] = amount_total
    if not values_by_customer[partner_id]['lowest_value'] or amount_total < values_by_customer[partner_id]['lowest_value']:
        values_by_customer[partner_id]['lowest_value'] = amount_total
    
    if values_by_customer[partner_id]['last_date_order']:
        last_date_order = values_by_customer[partner_id]['last_date_order']
        diff = date_order - last_date_order
        days = diff.days
        values_by_customer[partner_id]['all_intervals'].append(days)
        values_by_customer[partner_id]['last_date_order'] = date_order
        if days:
            if not values_by_customer[partner_id]['highest_interval'] or days > values_by_customer[partner_id]['highest_interval']:
                values_by_customer[partner_id]['highest_interval'] = days
            if not values_by_customer[partner_id]['lowest_interval'] or days < values_by_customer[partner_id]['lowest_interval']:
                values_by_customer[partner_id]['lowest_interval'] = days
    else:
        values_by_customer[partner_id]['last_date_order'] = date_order

# Invoices
# All Invoices Total Late, Total On Time
# Current AR = Total Amount Residual
# Total Current Unpaid Invoice
res_invoices = izi.query_fetch('''
    SELECT
        am.amount_total,
        am.amount_residual,
        am.invoice_date_due,
        am.invoice_date,
        am.date_paid_off,
        am.partner_id
    FROM
        account_move am
    WHERE
        am.move_type = 'out_invoice'
''')
invoice_vals_by_partner_id = {}
for r in res_invoices:
    if r['partner_id'] not in invoice_vals_by_partner_id:
        invoice_vals_by_partner_id[r['partner_id']] = {
            'amount_residual': 0,
            'amount_total': 0,
            'total_invoices': 0,
            'total_unpaid': 0,
            'total_late': 0,
        }
    invoice_vals_by_partner_id[r['partner_id']]['total_invoices'] += 1
    invoice_vals_by_partner_id[r['partner_id']]['amount_total'] += r['amount_total']
    invoice_vals_by_partner_id[r['partner_id']]['amount_residual'] += r['amount_residual']
    if r['amount_residual'] > 1000:
        invoice_vals_by_partner_id[r['partner_id']]['total_unpaid'] += 1
    if r.get('date_paid_off') and r['date_paid_off'] > r['invoice_date_due']:
        invoice_vals_by_partner_id[r['partner_id']]['total_late'] += 1

# Unique Variants
res_variants = izi.query_fetch('''
    SELECT
        sol.product_id,
        so.partner_id,
        pt.rebrand_customer_id
    FROM 
        sale_order_line sol
    LEFT JOIN sale_order so ON (so.id = sol.order_id)
    LEFT JOIN product_product pp ON (sol.product_id = pp.id)
    LEFT JOIN product_template pt ON (pt.id = pp.product_tmpl_id)
    WHERE
        so.state IN ('sale', 'done')
    GROUP BY
        sol.product_id,
        so.partner_id,
        pt.rebrand_customer_id
''')
products_by_partner_id = {}
main_products_by_partner_id = {}
subcontract_products_by_partner_id = {}
for r in res_variants:
    if r['partner_id'] not in products_by_partner_id:
        products_by_partner_id[r['partner_id']] = []
        main_products_by_partner_id[r['partner_id']] = []
        subcontract_products_by_partner_id[r['partner_id']] = []
    if r['product_id'] not in products_by_partner_id[r['partner_id']]:
        products_by_partner_id[r['partner_id']].append(r['product_id'])
    # Subcontract & Main
    if r['rebrand_customer_id']:
        if r['product_id'] not in subcontract_products_by_partner_id[r['partner_id']]:
            subcontract_products_by_partner_id[r['partner_id']].append(r['product_id'])
    else:
        if r['product_id'] not in main_products_by_partner_id[r['partner_id']]:
            main_products_by_partner_id[r['partner_id']].append(r['product_id'])

# Total
for partner_id in values_by_customer:
    values = values_by_customer[partner_id]
    all_values = values_by_customer[partner_id]['all_values']
    all_intervals = values_by_customer[partner_id]['all_intervals']
    all_frequency = values_by_customer[partner_id]['all_frequency']
    total_value = values_by_customer[partner_id]['total_value']
    total_order = values_by_customer[partner_id]['total_order']
    total_items = values_by_customer[partner_id]['total_items']
    total_lines = values_by_customer[partner_id]['total_lines']
    last_date_order = values_by_customer[partner_id]['last_date_order']
    
    average_interval = (sum(all_intervals) / len(all_intervals)) if len(all_intervals) > 0 else 0
    values_by_customer[partner_id]['average_interval'] = average_interval
    
    average_price_unit = (total_value / total_items) if total_items > 0 else 0
    values_by_customer[partner_id]['average_price_unit'] = average_price_unit
    
    average_order_value = total_value / total_order if total_order > 0 else 0
    values_by_customer[partner_id]['average_order_value'] = average_order_value
    
    average_order_items = total_items / total_order if total_order > 0 else 0
    values_by_customer[partner_id]['average_order_items'] = average_order_items

    average_total_lines = total_lines / total_order if total_order > 0 else 0
    values_by_customer[partner_id]['average_total_lines'] = average_total_lines
    
    values_by_customer[partner_id]['last_date_order'] = last_date_order.strftime('%Y-%m-%d')
    last_order_days = (datetime.datetime.strptime(end_date, '%Y-%m-%d') - last_date_order).days
    values_by_customer[partner_id]['last_order_days'] = last_order_days

    churned = False
    max_interval = 90
    if average_interval * 5 > max_interval:
        max_interval = average_interval * 5
    if last_order_days > max_interval:
        churned = True
    values_by_customer[partner_id]['churned'] = churned
    
    # Calculate All Values & Frequency
    new_values = []
    new_frequency = []
    total_values = 0
    total_frequency = 0
    total_index = 0
    i = 0
    while i < max_time_group:
        val = 0
        if time_group_keys[i] in all_values:
            val = all_values[time_group_keys[i]]
        total_values += val
        new_values.append(val)
        
        freq = 0
        if time_group_keys[i] in all_frequency:
            freq = all_frequency[time_group_keys[i]]
        total_frequency += freq
        new_frequency.append(freq)
        total_index += i
        i += 1
        
    avg_values = total_values / max_time_group
    avg_frequency = total_frequency / max_time_group
    avg_index = total_index / max_time_group
    
    # Calculate Gradient Of The Linear Regression Line
    # Init
    gradient_values = 0
    intercept_values = 0
    rmse_values = 0
    r2_values = 0
    gradient_frequency = 0
    intercept_frequency = 0
    rmse_frequency = 0
    r2_frequency = 0
    if total_values and total_frequency:
        # Values
        res_values = get_linear_regression_line({
            'n': max_time_group,
            'x_mean': avg_index,
            'y_mean': avg_values,
            'y_array': new_values,
        })
        gradient_values = res_values['gradient']
        intercept_values = res_values['intercept']
        rmse_values = res_values['rmse']
        r2_values = res_values['r2']
    
        # Frequency
        res_frequency = get_linear_regression_line({
            'n': max_time_group,
            'x_mean': avg_index,
            'y_mean': avg_frequency,
            'y_array': new_frequency,
        })
        gradient_frequency = res_frequency['gradient']
        intercept_frequency = res_frequency['intercept']
        rmse_frequency = res_frequency['rmse']
        r2_frequency = res_frequency['r2']
    
    # Insert
    all_values = str(new_values)
    all_frequency = str(new_frequency)
    all_intervals = str(all_intervals)
    
    # Total Unique Variants
    total_unique_variants = 0
    if partner_id in products_by_partner_id:
        total_unique_variants = len(products_by_partner_id[partner_id])
    total_unique_subcontract_variants = 0
    if partner_id in subcontract_products_by_partner_id:
        total_unique_subcontract_variants = len(subcontract_products_by_partner_id[partner_id])
    total_unique_main_variants = 0
    if partner_id in main_products_by_partner_id:
        total_unique_main_variants = len(main_products_by_partner_id[partner_id])
        
    # Invoices
    invoice_vals = {}
    if partner_id in invoice_vals_by_partner_id:
        invoice_vals = invoice_vals_by_partner_id[partner_id]
    if invoice_vals:
        invoice_amount_residual = invoice_vals.get('amount_residual', 0)
        invoice_amount_total = invoice_vals.get('amount_total', 0)
        total_invoices = invoice_vals.get('total_invoices', 0)
        total_unpaid = invoice_vals.get('total_unpaid', 0)
        total_late = invoice_vals.get('total_late', 0)
        percentage_ontime = 0
        percentage_late = 0
        percentage_unpaid = 0
        percentage_unpaid_value = 0
        if total_invoices:
            percentage_ontime = (total_invoices - total_late) / total_invoices * 100
            percentage_late = total_late / total_invoices * 100
            percentage_unpaid = total_unpaid / total_invoices * 100
        if invoice_amount_total:
            percentage_unpaid_value = invoice_amount_residual / invoice_amount_total * 100
        
    insert_values = {
        'year': 2022,
        'quarter': '2022 Q1',
        'partner_id': values['partner_id'],
        'customer': values['customer'],
        'last_date_order': values['last_date_order'],
        'last_order_days': values['last_order_days'],
        'churned': values['churned'],
        
        'total_order': values['total_order'],
        'total_value': values['total_value'],
        'total_discount': values['total_discount'],
        'total_items': values['total_items'],
        'total_lines': values['total_lines'],
        'total_unique_variants': total_unique_variants,
        'total_unique_subcontract_variants': total_unique_subcontract_variants,
        'total_unique_main_variants': total_unique_main_variants,
        
        'average_interval': values['average_interval'],
        'average_order_value': values['average_order_value'],
        'average_price_unit': values['average_price_unit'],
        'average_order_items': values['average_order_items'],
        'average_total_lines': values['average_total_lines'],
        
        'lowest_interval': values['lowest_interval'],
        'highest_interval': values['highest_interval'],
        'lowest_value': values['lowest_value'],
        'highest_value': values['highest_value'],
        
        'all_values': all_values,
        'all_intervals': all_intervals,
        'all_frequency': all_frequency,
        'gradient_values': gradient_values,
        'gradient_frequency': gradient_frequency,
        'rmse_values': rmse_values,
        'rmse_frequency': rmse_frequency,
        'r2_values': r2_values,
        'r2_frequency': r2_frequency,
        
        'invoice_amount_residual': invoice_amount_residual,
        'invoice_amount_total': invoice_amount_total,
        'total_invoices': total_invoices,
        'total_unpaid': total_unpaid,
        'total_late': total_late,
        'percentage_ontime': percentage_ontime,
        'percentage_late': percentage_late,
        'percentage_unpaid': percentage_unpaid,
        'percentage_unpaid_value': percentage_unpaid_value,
    }
    # izi.alert(str(insert_values))
    izi.query_insert('izi_customer_behavior', insert_values)
    
# izi.alert(len(values_by_customer))