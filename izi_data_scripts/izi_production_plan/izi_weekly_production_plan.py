# Parameters
# Get Parameter Month
init_table = False
# start_date = '2023-08-01'
num_of_weeks = 4

action = False
if self._context.get('run_params') and param('action'):
    action = param('action')

# Processing Dates
# start_date_obj = datetime.datetime.strptime(start_date, "%Y-%m-%d")

# Check Config
gs_id = '1O1oY52UitXLaFtwkF65X6Guq6zLUl_2snny2MwoPwaY'
gs_config = izi.read_google_spreadsheet(gs_id, 'Config')
use_forecast = 0
for r in gs_config:
    if r['Start Date']:
        start_date_obj = datetime.datetime.strptime(r['Start Date'], "%Y-%m-%d")
    if r['Number Of Weeks']:
        num_of_weeks = int(r['Number Of Weeks'])
    if r['Use Forecast Instead Of Sales Orders']:
        use_forecast = int(r['Use Forecast Instead Of Sales Orders'])
    break

if not start_date_obj:
    start_date_obj = datetime.datetime.today()
start_date_obj = start_date_obj - datetime.timedelta(days=start_date_obj.weekday())
end_date_obj = start_date_obj + datetime.timedelta(days=7 * (num_of_weeks - 1))
last_week_date_obj = start_date_obj - datetime.timedelta(days=7)
last_10_weeks_date_obj = start_date_obj - datetime.timedelta(days=7 * 52)
next_week_date_obj = start_date_obj + datetime.timedelta(days=7)
first_day_month_obj = start_date_obj.replace(day=1)
start_date = start_date_obj.strftime("%Y-%m-%d")
end_date = end_date_obj.strftime("%Y-%m-%d")
first_day_month = first_day_month_obj.strftime("%Y-%m-%d")
last_week_date = last_week_date_obj.strftime("%Y-%m-%d")
last_10_weeks_date = last_10_weeks_date_obj.strftime("%Y-%m-%d")
next_week_date = next_week_date_obj.strftime("%Y-%m-%d")
plants = []
plants_dict = []
# izi.alert(str(start_date))

# Capacity Per Category
capacity_by_category_by_plant = {
    'RUAHAN': {
        'CW': 2250,
    },
    'SFF': {
        'CW': 50000,
    },
    'FG': {
        'CW': 40000,
    },
}

# Prepare Table
if init_table:
    # Data Dummy
    values = {
        'priority': 1,
        'plant': 'CW',
        'week': 'W1',
        'date': '2022-01-01',
        'stock_cover': 10.0,
        'product_id': 1,
        'product': 'AN 5G DKE Expert',
        'category': 'FG',
        'material_category': 'R_AN',
        'vendor_price': 100.5,
        
        # Hidden
        'min_stock': 1000.0,
        'max_stock': 2000.0,
        
        # Real First Week & Forecast Next Week
        'request': 2000.0,
        'outstanding_request': 2000.0,
        'buffer_stock': 2000.0,
        
        'initial_stock': 500.0,
        
        'outstanding_production': 0.0,
        'weekly_percentage': 0.5,
        'target_production': 1500.0,
        'available_to_produce': 1000.0,
        'producing': 200.0,
        
        'forecast_out': 500.0,
        'forecast_in': 500.0,
        'produced': 200.0,
        
        'available_capacity': 1000.0,
        'material_check': 'SFF AN 5G;1500;20000\nBox;1500;120000\nSticker;1500;5105',
        'production_info': '',
        'sales_info': '',
        
        'supplier_id': 1,
        'finish_date': '2022-01-01',
        'actionable_produce': True,
    }
    # Build Table Schma
    izi_table.get_table_fields_from_dictionary(values)
    izi_table.update_schema_store_table()
    
    # Truncate
    # izi.query_execute('TRUNCATE izi_weekly_production_plan;')
    
    # Insert Data Dummy
    # izi.query_insert('izi_weekly_production_plan', values)

# Truncate / Delete Old Data
if not action:
    izi.query_execute('TRUNCATE izi_weekly_production_plan;')
    izi.query_execute('TRUNCATE izi_weekly_ruahan_batch_size;')

# Get Data From Spreadsheet
# Google Sheet
gs_id = False
gs_id = '1O1oY52UitXLaFtwkF65X6Guq6zLUl_2snny2MwoPwaY'
gs_product_by_product_id = {}
gs_product_by_product_name = {}
gs_priority_product_ids = []
gs_sales_by_date_by_product_id = {}
gs_sales_by_product_id = {}
gs_sales_by_product_name = {}
gs_outstanding_sales_by_date_by_product_id = {}
gs_stock_by_date_by_product_id = {}
gs_stock_by_date_by_product_id_by_plant = {}
gs_capacity_by_category_by_plant = {}
request_share_by_category_by_plant = {}
percentage_by_week_by_product_by_plant = {}
if gs_id:
    # Product
    gs_product = izi.read_google_spreadsheet(gs_id, 'Product')
    for r in gs_product:
        # if r.get('Product ID'):
        #     gs_product_by_product_id[r['Product ID']] = {
        #         'min_week': r['Min Week'],
        #         'max_week': r['Max Week'],
        #         'lead_time': r['Lead Time'],
        #     }
        if r.get('Name'):
            gs_product_by_product_name[r['Name']] = {
                'min_week': r['Min Week'],
                'max_week': r['Max Week'],
                'lead_time': r['Lead Time'],
                'buffer_week': r['Max Week'],
            }
    
    # Sales
    gs_sales = izi.read_google_spreadsheet(gs_id, 'Sales')
    for r in gs_sales:
        if r.get('Product ID'):
            # date = r.get('Date', False)
            # if date:
            #     date_obj = datetime.datetime.strptime(date, "%Y-%m-%d")
            #     date_obj = date_obj - datetime.timedelta(days=date_obj.weekday())
            #     date = date_obj.strftime("%Y-%m-%d")
            product_id = r['Product ID']
            product_name = r['Name']
            qty = r.get('Quantity', 0)
            delivered = r.get('Delivered', 0)
            if product_id not in gs_sales_by_product_id:
                gs_sales_by_product_id[product_id] = 0
            gs_sales_by_product_id[product_id] += qty
            if product_name not in gs_sales_by_product_name:
                gs_sales_by_product_name[product_name] = 0
            gs_sales_by_product_name[product_name] += qty
            # if date not in gs_sales_by_date_by_product_id:
            #     gs_sales_by_date_by_product_id[date] = {}
            # if product_id not in gs_sales_by_date_by_product_id[date]:
            #     gs_sales_by_date_by_product_id[date][product_id] = 0
            # gs_sales_by_date_by_product_id[date][product_id] += qty
            # if date <= start_date:
            #     if start_date not in gs_outstanding_sales_by_date_by_product_id:
            #         gs_outstanding_sales_by_date_by_product_id[start_date] = {}
            #     if product_id not in gs_outstanding_sales_by_date_by_product_id[start_date]:
            #         gs_outstanding_sales_by_date_by_product_id[start_date][product_id] = 0
            #     gs_outstanding_sales_by_date_by_product_id[start_date][product_id] += (qty - delivered)
    
    # Stock At Date
    gs_stock = izi.read_google_spreadsheet(gs_id, 'Stock')
    for r in gs_stock:
        if r.get('Product ID'):
            date = r['Date']
            date_obj = datetime.datetime.strptime(date, "%Y-%m-%d")
            date_obj = date_obj - datetime.timedelta(days=date_obj.weekday())
            date = date_obj.strftime("%Y-%m-%d")
            product_id = r['Product ID']
            plant = r['Plant']
            qty = r.get('Quantity', 0)
            if date not in gs_stock_by_date_by_product_id:
                gs_stock_by_date_by_product_id[date] = {}
                gs_stock_by_date_by_product_id_by_plant[date] = {}
            if product_id not in gs_stock_by_date_by_product_id[date]:
                gs_stock_by_date_by_product_id[date][product_id] = 0
                gs_stock_by_date_by_product_id_by_plant[date][product_id] = {}
            if plant not in gs_stock_by_date_by_product_id_by_plant[date][product_id]:
                gs_stock_by_date_by_product_id_by_plant[date][product_id][plant] = 0
            gs_stock_by_date_by_product_id[date][product_id] += qty
            gs_stock_by_date_by_product_id_by_plant[date][product_id][plant] += qty
    
    # Capacity
    gs_capacity = izi.read_google_spreadsheet(gs_id, 'Plant')
    for r in gs_capacity:
        category = r['Category']
        plant = r['Plant']
        if category not in gs_capacity_by_category_by_plant:
            gs_capacity_by_category_by_plant[category] = {}
        gs_capacity_by_category_by_plant[category][plant] = r['Weekly Capacity']
        if category not in request_share_by_category_by_plant:
            request_share_by_category_by_plant[category] = {}
        request_share_by_category_by_plant[category][plant] = r['Request Share']
        if r['Type'] in ['MAIN', 'SUB'] and r['Plant'] not in plants:
            plants.append(r['Plant'])
            plants_dict.append(r)
    
    # Check
    for category in request_share_by_category_by_plant:
        total_share = 0
        for plant in request_share_by_category_by_plant[category]:
            total_share += request_share_by_category_by_plant[category][plant]
        if not (total_share == 0 or total_share == 100):
            izi.alert('Total Request Share is not 100%% or 0%% in this category %s!' % (category))
            
    # Percentage
    gs_percentage = izi.read_google_spreadsheet(gs_id, 'Percentage')
    for r in gs_percentage:
        product = r['Product']
        plant = r['Plant']
        total_percentage = float(r['Total Percentage'])
        if total_percentage < 0 or total_percentage > 100:
            izi.alert('Total Percentage Must Be > 0 and <= 100!')
        for key in r:
            if key not in ('Product', 'Plant', 'TP', 'Total Percentage'):
                if 'W' in key:
                    week = key
                    if week not in percentage_by_week_by_product_by_plant:
                        percentage_by_week_by_product_by_plant[week] = {}
                    if product not in percentage_by_week_by_product_by_plant[week]:
                        percentage_by_week_by_product_by_plant[week][product] = {}
                    if plant not in percentage_by_week_by_product_by_plant[week][product]:
                        percentage_by_week_by_product_by_plant[week][product][plant] = r[week]
    
    
# izi.alert(str(plants))
# izi.alert(str(gs_outstanding_sales_by_date_by_product_id))

# Monthly Target
res_target = izi.query_fetch('''
    SELECT *
    FROM izi_monthly_sales_forecast
    WHERE date = '%s'
    ORDER BY stock_cover ASC, outstanding_forecast_sales ASC
''' % (first_day_month))
target_by_product_id = {}
product_ids = []
for r in res_target:
    # if r.get('product') and 'DMC' not in r.get('product'):
    #     continue
    if r.get('product_id'):
        target_by_product_id[r.get('product_id')] = r
    if r.get('product_id') not in product_ids:
        product_ids.append(r.get('product_id'))
        
# Get Product IDS
res_product_ids = izi.query_fetch('''
    SELECT 
        product,
        default_code,
        supplier_id,
        product_id,
        category,
        material_category,
        uom_id,
        bom_id,
        bom_details,
        lead_time,
        min_week,
        max_week,
        plant,
        vendor_price
    FROM izi_manufacture_product
''')

mrp_product_by_product_id = {}
for r in res_product_ids:
    mrp_product_by_product_id[r.get('product_id')] = r
        
# izi.alert(str(mrp_product_by_product_id))
# UoM By ID
uoms = env['uom.uom'].search([])
uom_by_id = {}
for uom in uoms:
    uom_by_id[uom.id] = uom

# Define fg_to_rm_product_ids = [fg_product_ids, rm1_product_ids, rm2_product_ids, rm3_product_ids]
fg_to_rm_product_ids = []
rm_to_fg_product_ids = []
cur_product_ids = product_ids
# cur_product_ids = []
# for product_id in product_ids:
#     if 'NTO' in product_id:
#         cur_product_ids.append(product_id)
# izi.alert(str(product_ids))
fg_to_rm_product_ids.append(cur_product_ids)
rm_to_fg_product_ids.append(cur_product_ids)

while cur_product_ids:
    line_product_ids = []
    for product_id in cur_product_ids:
        # MRP Product
        if product_id not in mrp_product_by_product_id:
            continue
            izi.alert('This Product ID %s is not found!' % (product_id))
        mrp_product = mrp_product_by_product_id[product_id]
        
        # BoM Details
        bom_details = mrp_product.get('bom_details', None)
        bom_line_ratio = {}
        if bom_details:
            bom_details = bom_details.split('\n')
            for bom_line_dt in bom_details:
                bom_line_dt = bom_line_dt.split(';')
                if len(bom_line_dt) == 3:
                    line_product_id = int(bom_line_dt[0])
                    if line_product_id not in line_product_ids:
                        line_product_ids.append(line_product_id)
    if not line_product_ids:
        break
    else:
        fg_to_rm_product_ids.append(line_product_ids)
        rm_to_fg_product_ids.insert(0, line_product_ids)
    cur_product_ids = line_product_ids
# izi.alert(str(rm_to_fg_product_ids))

# Insert
all_product_ids = []
product_ids_string = []
for product_ids in fg_to_rm_product_ids:
    for product_id in product_ids:
        product_ids_string.append('%s' % (product_id))
        all_product_ids.append(product_id)
product_ids_string = ','.join(product_ids_string)

# Weekly Ruahan Batch Size
res_batch = izi.query_fetch('''
    SELECT * 
    FROM izi_weekly_ruahan_batch_size
    WHERE
        date >= '%s'
        AND date <= '%s'
''' % (start_date, end_date))
batch_size_by_date_by_product_id_by_plant = {}
new_batch_size_by_date_by_product_id_by_plant_by_plant = {}
for r in res_batch:
    date = r['date'].strftime("%Y-%m-%d")
    product_id = r['product_id']
    plant = r['plant']
    if date not in batch_size_by_date_by_product_id_by_plant:
        batch_size_by_date_by_product_id_by_plant[date] = {}
    if product_id not in batch_size_by_date_by_product_id_by_plant[date]:
        batch_size_by_date_by_product_id_by_plant[date][product_id] = {}
    batch_size_by_date_by_product_id_by_plant[date][product_id][plant] = r['batch_size']
# izi.alert(str(batch_size_by_date_by_product_id_by_plant))

# Important Variables To Store Reservation, Indirect Request, Forecast Quantity, etc.
# Reserve
reserve_by_date_by_product_id = {}
# Indirect
indirect_request_by_date_by_product_id = {}
# Forecast In / Out
forecast_in_by_date_by_product_id = {}
# Most Important Variable To Store Value to Insert
values_by_date_by_product_id = {}
# Get Real Stock and Sales Data
stock_by_date_by_product_id = {}
sales_by_date_by_product_id = {}
outstanding_sales_by_date_by_product_id = {}
outstanding_production_by_date_by_product_id = {}
producing_by_date_by_product_id = {}
produced_by_date_by_product_id = {}
production_info_by_date_by_product_id = {}
sales_info_by_date_by_product_id = {}
# Forecast From Previous Period (Week), Sales (-), Previous ATP (+), and others
forecast_stock_by_date_by_product_id = {}
# Outstanding Request 
outstanding_request_by_date_by_product_id = {}
# Left Capacity
left_capacity_by_date_by_category = {}

# By Plant
total_target_production_by_product_id_by_plant = {}
stock_by_date_by_product_id_by_plant = {}
outstanding_production_by_date_by_product_id_by_plant = {}
producing_by_date_by_product_id_by_plant = {}
produced_by_date_by_product_id_by_plant = {}
left_capacity_by_date_by_category_by_plant = {}
forecast_stock_by_date_by_product_id_by_plant = {}
forecast_in_by_date_by_product_id_by_plant = {}
indirect_request_by_date_by_product_id_by_plant = {}
values_by_date_by_product_id_by_plant = {}
reserve_by_date_by_product_id_by_plant = {}
production_info_by_date_by_product_id_by_plant = {}
outstanding_request_by_date_by_product_id_by_plant = {}

# Initiate Variables
week = 0
while week < num_of_weeks:
    week += 1
    # Add 7 Days With Datetime
    cur_date = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    # Go To The First Day of The Week. On Monday.
    cur_date = cur_date - datetime.timedelta(days=cur_date.weekday())
    cur_date = cur_date + datetime.timedelta(days=7 * (week - 1))
    next_date = cur_date + datetime.timedelta(days=7)
    prev_date = cur_date - datetime.timedelta(days=7)
    cur_date = cur_date.strftime("%Y-%m-%d")
    next_date = next_date.strftime("%Y-%m-%d")
    prev_date = prev_date.strftime("%Y-%m-%d")
    
    # Initiate Variable
    values_by_date_by_product_id[cur_date] = {}
    reserve_by_date_by_product_id[cur_date] = {}
    indirect_request_by_date_by_product_id[cur_date] = {}
    stock_by_date_by_product_id[cur_date] = {}
    sales_by_date_by_product_id[cur_date] = {}
    outstanding_sales_by_date_by_product_id[cur_date] = {}
    outstanding_production_by_date_by_product_id[cur_date] = {}
    producing_by_date_by_product_id[cur_date] = {}
    produced_by_date_by_product_id[cur_date] = {}
    production_info_by_date_by_product_id[cur_date] = {}
    forecast_stock_by_date_by_product_id[cur_date] = {}
    forecast_in_by_date_by_product_id[cur_date] = {}
    outstanding_request_by_date_by_product_id[cur_date] = {}
    sales_info_by_date_by_product_id[cur_date] = {}
    
    # By Plant
    stock_by_date_by_product_id_by_plant[cur_date] = {}
    outstanding_production_by_date_by_product_id_by_plant[cur_date] = {}
    producing_by_date_by_product_id_by_plant[cur_date] = {}
    produced_by_date_by_product_id_by_plant[cur_date] = {}
    forecast_in_by_date_by_product_id_by_plant[cur_date] = {}
    indirect_request_by_date_by_product_id_by_plant[cur_date] = {}
    values_by_date_by_product_id_by_plant[cur_date] = {}
    forecast_stock_by_date_by_product_id_by_plant[cur_date] = {}
    reserve_by_date_by_product_id_by_plant[cur_date] = {}
    production_info_by_date_by_product_id_by_plant[cur_date] = {}
    outstanding_request_by_date_by_product_id_by_plant[cur_date] = {}
    if gs_capacity_by_category_by_plant:
        left_capacity_by_date_by_category_by_plant[cur_date] = gs_capacity_by_category_by_plant.copy()
    else:
        left_capacity_by_date_by_category_by_plant[cur_date] = capacity_by_category.copy()

# izi.alert('Checkpoint 0')

# Prepare Initial Data
# Initial Real Transaction Data
# Stock, Sales, Outstanding Sales, Outstanding Production
# Stock At Start Date
# Total Stock
overall_stock_categories = ['FG', 'RM']
res_stock = izi.query_fetch('''
    SELECT 
        product_id,
        SUM(stock) as stock
    FROM izi_stock_at_date
    WHERE
        date = '%s'
    GROUP BY
        product_id
''' % (start_date))
for r in res_stock:
    product_id = r.get('product_id')
    if product_id:
        stock_by_date_by_product_id[start_date][product_id] = r.get('stock')
        
# Stock By Plant
res_stock = izi.query_fetch('''
    SELECT 
        product_id,
        plant,
        SUM(stock) as stock
    FROM izi_stock_at_date
    WHERE
        date = '%s'
    GROUP BY
        product_id,
        plant
''' % (start_date))
for r in res_stock:
    product_id = r.get('product_id')
    plant = r.get('plant')
    if product_id:
        if product_id not in stock_by_date_by_product_id_by_plant[start_date]:
            stock_by_date_by_product_id_by_plant[start_date][product_id] = {}
        stock_by_date_by_product_id_by_plant[start_date][product_id][plant] = r.get('stock')
# izi.alert(str(stock_by_date_by_product_id_by_plant))

# Sales Order Line
# Current Sales Is Only From Last Week
res_sales = izi.query_fetch('''
    SELECT 
        so.id,
        so.name as so_name,
        pt.name,
        pp.id as product_id,
        SUM(product_uom_qty) as product_uom_qty,
        SUM(qty_delivered) as qty_delivered,
        SUM(product_uom_qty - qty_delivered) as quantity
    FROM sale_order_line sol
    LEFT JOIN sale_order so ON (so.id = sol.order_id)
    LEFT JOIN product_product pp ON (sol.product_id = pp.id)
    LEFT JOIN product_template pt ON (pt.id = pp.product_tmpl_id)
    WHERE 
        so.date_order >= '%s'
        AND so.date_order < '%s'
        AND so.state IN ('sale', 'done')
        AND pp.id IN (%s)
    GROUP BY
        so.id,
        so.name,
        pt.name,
        pp.id
''' % (start_date, next_week_date, product_ids_string))
sales_by_date_by_product_id[start_date] = {}
for r in res_sales:
    if r['product_id'] not in sales_by_date_by_product_id[start_date]:
        sales_by_date_by_product_id[start_date][r['product_id']] = 0
    sales_by_date_by_product_id[start_date][r['product_id']] += r['quantity']
    if r['product_id'] not in sales_info_by_date_by_product_id[start_date]:
        sales_info_by_date_by_product_id[start_date][r['product_id']] = []
    sales_info_by_date_by_product_id[start_date][r['product_id']].append('%s;%s;%s;%s' % (r.get('id'), r.get('so_name'), r.get('product_uom_qty', 0), r.get('qty_delivered', 0)))

# Outstanding Sales
res_outstanding_sales = izi.query_fetch('''
    SELECT 
        so.id,
        so.name as so_name,
        pt.name,
        pp.id as product_id,
        SUM(product_uom_qty) as product_uom_qty,
        SUM(qty_delivered) as qty_delivered,
        SUM(product_uom_qty - qty_delivered) as quantity
    FROM sale_order_line sol
    LEFT JOIN sale_order so ON (so.id = sol.order_id)
    LEFT JOIN product_product pp ON (sol.product_id = pp.id)
    LEFT JOIN product_template pt ON (pt.id = pp.product_tmpl_id)
    WHERE 
        so.date_order >= '%s'
        AND so.date_order < '%s'
        AND so.state IN ('sale', 'done')
        AND pp.id IN (%s)
    GROUP BY
        so.id,
        so.name,
        pt.name,
        pp.id
''' % (last_10_weeks_date, start_date, product_ids_string))
outstanding_sales_by_date_by_product_id[start_date] = {}
for r in res_outstanding_sales:
    if r['product_id'] not in outstanding_sales_by_date_by_product_id[start_date]:
        outstanding_sales_by_date_by_product_id[start_date][r['product_id']] = 0
    if r['quantity'] > 0:
        outstanding_sales_by_date_by_product_id[start_date][r['product_id']] += r['quantity']
    if r['product_id'] not in sales_info_by_date_by_product_id[start_date]:
        sales_info_by_date_by_product_id[start_date][r['product_id']] = []
    if r.get('quantity', 0):
        sales_info_by_date_by_product_id[start_date][r['product_id']].append('%s;%s;%s;%s' % (r.get('id'), r.get('so_name'), r.get('product_uom_qty', 0), r.get('qty_delivered', 0)))

# Producing (Confirm PO Line)
res_pol = izi.query_fetch('''
    SELECT
        po.id,
        po.name,
        po.date_order,
        pp.id as product_id,
        sw.code as warehouse,
        SUM(pol.product_qty) as product_qty,
        SUM(pol.qty_received) as qty_received
    FROM
        purchase_order_line pol
        LEFT JOIN purchase_order po ON (pol.order_id = po.id)
        LEFT JOIN product_product pp ON (pol.product_id = pp.id)
        LEFT JOIN product_template pt ON (pt.id = pp.product_tmpl_id)
        LEFT JOIN stock_picking_type spt ON (spt.id = po.picking_type_id)
        LEFT JOIN stock_warehouse sw ON (sw.id = spt.warehouse_id)
    WHERE 
        po.date_order >= '%s'
        AND po.date_order < '%s'
        AND po.state NOT IN ('cancel', 'reject')
        AND pp.id IN (%s)
    GROUP BY
        po.id,
        po.name,
        po.date_order,
        pp.id,
        sw.code
''' % (start_date, next_week_date, product_ids_string))
for r in res_pol:
    product_id = r.get('product_id')
    if (product_id not in produced_by_date_by_product_id[start_date]):
        produced_by_date_by_product_id[start_date][product_id] = 0
        produced_by_date_by_product_id_by_plant[start_date][product_id] = {}
    if (product_id not in producing_by_date_by_product_id[start_date]):
        producing_by_date_by_product_id[start_date][product_id] = 0
        producing_by_date_by_product_id_by_plant[start_date][product_id] = {}
    if (product_id not in production_info_by_date_by_product_id[start_date]):
        production_info_by_date_by_product_id[start_date][product_id] = []
        production_info_by_date_by_product_id_by_plant[start_date][product_id] = {}
    producing_by_date_by_product_id[start_date][product_id] += (r.get('product_qty', 0) - r.get('qty_received', 0))
    produced_by_date_by_product_id[start_date][product_id] += r.get('qty_received', 0)
    production_info_by_date_by_product_id[start_date][product_id].append('%s;%s;%s;%s' % (r.get('id'), r.get('name'), r.get('product_qty', 0), r.get('qty_received', 0)))
    
    # By Plant
    plant = r.get('warehouse')
    if plant not in produced_by_date_by_product_id_by_plant[start_date][product_id]:
        produced_by_date_by_product_id_by_plant[start_date][product_id][plant] = 0
    if plant not in producing_by_date_by_product_id_by_plant[start_date][product_id]:
        producing_by_date_by_product_id_by_plant[start_date][product_id][plant] = 0
    if plant not in production_info_by_date_by_product_id_by_plant[start_date][product_id]:
        production_info_by_date_by_product_id_by_plant[start_date][product_id][plant] = []
    producing_by_date_by_product_id_by_plant[start_date][product_id][plant] += (r.get('product_qty', 0) - r.get('qty_received', 0))
    produced_by_date_by_product_id_by_plant[start_date][product_id][plant] += r.get('qty_received', 0)
    production_info_by_date_by_product_id_by_plant[start_date][product_id][plant].append('%s;%s;%s;%s' % (r.get('id'), r.get('name'), r.get('product_qty', 0), r.get('qty_received', 0)))
    
# Outstanding Production
res_pol = izi.query_fetch('''
    SELECT
        po.id,
        po.name,
        po.date_order,
        pp.id as product_id,
        sw.code as warehouse,
        SUM(pol.product_qty) as product_qty,
        SUM(pol.qty_received) as qty_received
    FROM
        purchase_order_line pol
        LEFT JOIN purchase_order po ON (pol.order_id = po.id)
        LEFT JOIN product_product pp ON (pol.product_id = pp.id)
        LEFT JOIN product_template pt ON (pt.id = pp.product_tmpl_id)
        LEFT JOIN stock_picking_type spt ON (spt.id = po.picking_type_id)
        LEFT JOIN stock_warehouse sw ON (sw.id = spt.warehouse_id)
    WHERE 
        po.date_order >= '%s'
        AND po.date_order < '%s'
        AND po.state NOT IN ('cancel', 'reject')
        AND pp.id IN (%s)
    GROUP BY
        po.id,
        po.name,
        po.date_order,
        pp.id,
        sw.code
''' % (last_10_weeks_date, start_date, product_ids_string))
# If is_producing true, Then all previous not done production will be start all over again as producing (calculate material again).
is_producing = False
for r in res_pol:
    product_id = r.get('product_id')
    plant = r.get('warehouse')
    
    if (r.get('product_qty', 0) - r.get('qty_received', 0)):
        if (product_id not in production_info_by_date_by_product_id[start_date]):
            production_info_by_date_by_product_id[start_date][product_id] = []
            production_info_by_date_by_product_id_by_plant[start_date][product_id] = {}
        production_info_by_date_by_product_id[start_date][product_id].append('%s;%s;%s;%s' % (r.get('id'), r.get('name'), r.get('product_qty', 0), r.get('qty_received', 0)))
        
        if plant not in production_info_by_date_by_product_id_by_plant[start_date][product_id]:
            production_info_by_date_by_product_id_by_plant[start_date][product_id][plant] = []
        production_info_by_date_by_product_id_by_plant[start_date][product_id][plant].append('%s;%s;%s;%s' % (r.get('id'), r.get('name'), r.get('product_qty', 0), r.get('qty_received', 0)))
        
        # There is A Bug
        # If Producing
        # if is_producing:
        #     if (product_id not in producing_by_date_by_product_id[start_date]):
        #         producing_by_date_by_product_id[start_date][product_id] = 0
        #         producing_by_date_by_product_id_by_plant[start_date][product_id] = {}
        #     if (product_id not in produced_by_date_by_product_id[start_date]):
        #         produced_by_date_by_product_id[start_date][product_id] = 0
        #         produced_by_date_by_product_id_by_plant[start_date][product_id] = {}
        #     producing_by_date_by_product_id[start_date][product_id] += (r.get('product_qty', 0) - r.get('qty_received', 0))
        #     produced_by_date_by_product_id[start_date][product_id] += (r.get('qty_received', 0))
        
        #     # By Plant
        #     if plant not in produced_by_date_by_product_id_by_plant[start_date][product_id]:
        #         produced_by_date_by_product_id_by_plant[start_date][product_id][plant] = 0
        #     if plant not in producing_by_date_by_product_id_by_plant[start_date][product_id]:
        #         producing_by_date_by_product_id_by_plant[start_date][product_id][plant] = 0
        #     producing_by_date_by_product_id_by_plant[start_date][product_id][plant] += (r.get('product_qty', 0) - r.get('qty_received', 0))
        #     produced_by_date_by_product_id_by_plant[start_date][product_id][plant] += r.get('qty_received', 0)
        
        # If Outstanding
        if not is_producing:
            if (product_id not in outstanding_production_by_date_by_product_id[start_date]):
                outstanding_production_by_date_by_product_id[start_date][product_id] = 0
            outstanding_production_by_date_by_product_id[start_date][product_id] += (r.get('product_qty', 0) - r.get('qty_received', 0))
            
            # Forecast In
            date_order_obj = r.get('date_order')
            outstanding_qty = (r.get('product_qty', 0) - r.get('qty_received', 0))
            if outstanding_qty:
                if product_id in mrp_product_by_product_id:
                    mrp_product = mrp_product_by_product_id[product_id]
                    lead_time = mrp_product.get('lead_time', 1)
                # Overwrite With Google Sheet
                if product_id in gs_product_by_product_id:
                    lead_time = gs_product_by_product_id[product_id].get('lead_time', lead_time)
                
                finish_date_obj = date_order_obj + datetime.timedelta(days=lead_time)
                # Set to The First Day of The Week. On Monday.
                finish_date_obj = finish_date_obj - datetime.timedelta(days=finish_date_obj.weekday())
                finish_date = finish_date_obj.strftime("%Y-%m-%d")
                # Compare To Start Date
                if finish_date < start_date:
                    finish_date = start_date
                    finish_date_obj = start_date_obj
                
                # Add Forecast In In That Date
                if finish_date not in forecast_in_by_date_by_product_id:
                    forecast_in_by_date_by_product_id[finish_date] = {}
                if product_id not in forecast_in_by_date_by_product_id[finish_date]:
                    forecast_in_by_date_by_product_id[finish_date][product_id] = 0
                forecast_in_by_date_by_product_id[finish_date][product_id] += outstanding_qty
                    
                # Add Waiting Date and Waiting Production Qty
                waiting_date_obj = datetime.datetime.strptime(start_date, "%Y-%m-%d") + datetime.timedelta(days=7)
                waiting_date = waiting_date_obj.strftime("%Y-%m-%d")
                while waiting_date < finish_date:
                    if waiting_date not in outstanding_production_by_date_by_product_id:
                        outstanding_production_by_date_by_product_id[waiting_date] = {}
                    if product_id not in outstanding_production_by_date_by_product_id[waiting_date]:
                        outstanding_production_by_date_by_product_id[waiting_date][product_id] = 0
                    outstanding_production_by_date_by_product_id[waiting_date][product_id] += outstanding_qty
                    # Iterate
                    waiting_date_obj = waiting_date_obj + datetime.timedelta(days=7)
                    waiting_date = waiting_date_obj.strftime("%Y-%m-%d")

# Start Production Plan
# Iterate Product IDs
# izi.alert('Checkpoint 1')
week = 0
while week < num_of_weeks:
    week += 1
    # Add 7 Days With Datetime
    cur_date = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    # Go To The First Day of The Week. On Monday.
    cur_date = cur_date - datetime.timedelta(days=cur_date.weekday())
    cur_date = cur_date + datetime.timedelta(days=7 * (week - 1))
    next_date = cur_date + datetime.timedelta(days=7)
    prev_date = cur_date - datetime.timedelta(days=7)
    week_string = cur_date.strftime("%W")
    cur_date = cur_date.strftime("%Y-%m-%d")
    next_date = next_date.strftime("%Y-%m-%d")
    prev_date = prev_date.strftime("%Y-%m-%d")
    
    # Looping By Plant
    for plant in plants:
        
        # Normal. Main Code.
        # First Iteration To Calculate The Production Target From FG To RM
        for product_ids in fg_to_rm_product_ids:
            # Main
            index = 1
            last_index = 1
            last_stock_cover = False
            for product_id in product_ids:
                if product_id not in mrp_product_by_product_id:
                    continue
                    izi.alert('This Product ID %s is not found!' % (product_id))
                mrp_product = mrp_product_by_product_id[product_id]
                supplier_id = mrp_product.get('supplier_id', None)
                product_name = mrp_product.get('product', None)
                min_week = mrp_product.get('min_week', 0)
                max_week = mrp_product.get('max_week', 0)
                lead_time = mrp_product.get('lead_time', 1)
                category = mrp_product.get('category', None)
                product_plant = mrp_product.get('plant', None)
                vendor_price = mrp_product.get('vendor_price', 0) or 0
                
                # Check Plant
                if category == 'FG' and product_plant != 'ALL' and product_plant != plant:
                    continue
                
                # Request Share
                request_share = 1
                if category == 'FG' and product_plant == 'ALL':
                    request_share = request_share_by_category_by_plant.get(category, {}).get(plant, 0) / 100
                
                # Rules For RM and PM.
                # Min = Lead Time / 7. Max = 2 * Min.
                if category in ('PM', 'RM'):
                    # min_week = lead_time / 7
                    # max_week = 2 * min_week
                    min_week = 0
                    max_week = 0
                
                # Overwrite With Google Sheet
                # if product_id in gs_product_by_product_id:
                #     min_week = gs_product_by_product_id[product_id].get('min_week', min_week)
                #     max_week = gs_product_by_product_id[product_id].get('max_week', max_week)
                #     lead_time = gs_product_by_product_id[product_id].get('lead_time', lead_time)
                if product_name in gs_product_by_product_name:
                    min_week = gs_product_by_product_name[product_name].get('min_week', min_week)
                    max_week = gs_product_by_product_name[product_name].get('max_week', max_week)
                    lead_time = gs_product_by_product_name[product_name].get('lead_time', lead_time)
                
                # BoM Details
                bom_details = mrp_product.get('bom_details', None)
                bom_line_ratio = {}
                if bom_details:
                    bom_details = bom_details.split('\n')
                    for bom_line_dt in bom_details:
                        bom_line_dt = bom_line_dt.split(';')
                        if len(bom_line_dt) == 3:
                            component_id = int(bom_line_dt[0])
                            component_ratio = float(bom_line_dt[2])
                            bom_line_ratio[component_id] = component_ratio
                
                # Stock
                # Real Stock
                initial_stock = 0
                if cur_date == start_date:
                    if category in overall_stock_categories:
                        initial_stock = stock_by_date_by_product_id[cur_date].get(product_id, 0)
                    else:
                        initial_stock = stock_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                        
                    # Check Google Sheet
                    initial_stock = gs_stock_by_date_by_product_id_by_plant.get(cur_date, {}).get(product_id, {}).get(plant, initial_stock)
                    
                    # Request Share
                    initial_stock = initial_stock * request_share
                    
                # Forecast Stock
                initial_stock = forecast_stock_by_date_by_product_id_by_plant.get(cur_date, {}).get(product_id, {}).get(plant, initial_stock)
                
                # Forecast In
                # Add Forecast Stock With Forecast In From Long Time Producing
                forecast_in = forecast_in_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                    
                # Checking
                # if product_id == 'NTO 60 ml DKE Expert' and week_string == '39' and plant == 'PPG':
                #     izi.alert(str((plant, initial_stock)))
                
                # Forecast Sales & Stock Cover 
                stock_cover = 0
                forecast_sales = 0
                if product_id in target_by_product_id:
                    stock_cover = target_by_product_id.get(product_id).get('stock_cover', 0)
                    if stock_cover != last_stock_cover:
                        last_stock_cover = stock_cover
                        last_index = index
                    forecast_sales = target_by_product_id.get(product_id).get('outstanding_forecast_sales', 0)
                
                sales = sales_by_date_by_product_id[cur_date].get(product_id, 0)
                outstanding_sales = outstanding_sales_by_date_by_product_id[cur_date].get(product_id, 0)
                
                # Check Google Sheet
                if product_id in gs_sales_by_product_id:
                    if cur_date == start_date:
                        forecast_sales += gs_sales_by_product_id[product_id]
                if product_name in gs_sales_by_product_name:
                    if cur_date == start_date:
                        forecast_sales += gs_sales_by_product_name[product_name]
                
                # Check Google Sheet
                # if cur_date in gs_sales_by_date_by_product_id:
                #     if product_id in gs_sales_by_date_by_product_id[cur_date]:
                #         sales = gs_sales_by_date_by_product_id[cur_date][product_id]
                #         forecast_sales = gs_sales_by_date_by_product_id[cur_date][product_id]
                
                # Check Google Sheet
                # if cur_date in gs_outstanding_sales_by_date_by_product_id:
                #     if product_id in gs_outstanding_sales_by_date_by_product_id[cur_date]:
                #         outstanding_sales = gs_outstanding_sales_by_date_by_product_id[cur_date][product_id]
            
                # Check Indirect
                indirect_request = 0
                if product_id in indirect_request_by_date_by_product_id_by_plant[cur_date]:
                    if plant in indirect_request_by_date_by_product_id_by_plant[cur_date][product_id]:
                        indirect_request = indirect_request_by_date_by_product_id_by_plant[cur_date][product_id][plant]
                        
                sales = sales * request_share
                forecast_sales = forecast_sales * request_share
                outstanding_sales = outstanding_sales * request_share
                
                # Total Request = Sales + Indirect
                if cur_date == start_date:
                    request = (sales + indirect_request) or forecast_sales
                else:
                    request = (sales + indirect_request) or 0
                    
                # If Use Forecast Instead Of Sales Orders
                if use_forecast:
                    if cur_date == start_date:
                        request = indirect_request or forecast_sales
                        # outstanding_sales += sales
                    
                min_stock = request * min_week
                max_stock = request * max_week
                
                # Buffer Stock
                # Equals To Request
                buffer_stock = 0
                if category in ('FG'):
                    buffer_stock = 1 * request
                
                if product_name in gs_product_by_product_name:
                    buffer_week = gs_product_by_product_name[product_name].get('buffer_week', 0)
                    buffer_stock = buffer_week * request
                
                # Checking
                # min_stock = 0
                # max_stock = 0
                
                # Outstanding Request = Outstanding Sales In The First Week
                # Then From Variable For The Next Week
                outstanding_request = outstanding_request_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, outstanding_sales)
                
                # Outstanding Production
                outstanding_production = outstanding_production_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                
                # First Date Real Data
                # Producing Is The Real Progress Of Production Start Compared To ATP
                producing = producing_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                # Produced Is The Real Progress Of Production Done, Stock In Compared To Forecast In
                produced = produced_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                
                # Calculate Target Production Using Min Max. Commented Out
                # Calculate After Stock If Below Min Stock
                # after_stock = initial_stock + forecast_in + outstanding_production + produced - request - outstanding_request
                # if after_stock < min_stock:
                #     target_production = request + outstanding_request + max_stock - initial_stock - forecast_in - outstanding_production - produced
                #     if target_production < 0:
                #         target_production = 0
                # else:
                #     target_production = 0
                
                # Calculate Target Production Using Buffer
                # target_production = request + outstanding_request + buffer_stock - initial_stock - forecast_in - outstanding_production - produced
                target_production = request + outstanding_request + buffer_stock - initial_stock - forecast_in - outstanding_production
                if target_production < 0:
                    target_production = 0
                
                # Total Production
                if product_id not in total_target_production_by_product_id_by_plant:
                    total_target_production_by_product_id_by_plant[product_id] = {}
                if plant not in total_target_production_by_product_id_by_plant[product_id]:
                    total_target_production_by_product_id_by_plant[product_id][plant] = 0
                total_target_production_by_product_id_by_plant[product_id][plant] += target_production
                # Check Percentage
                week_str = 'W%s' % (week_string)
                if (cur_date == start_date) :
                    weekly_percentage = 100
                else:
                    weekly_percentage = 0
                weekly_percentage = percentage_by_week_by_product_by_plant.get(week_str, {}).get(product_name, {}).get(plant, weekly_percentage)
                target_production = int((total_target_production_by_product_id_by_plant[product_id][plant] * weekly_percentage / 100) + 0.49)
                
                # Checking Target Production
                # if week_str == 'W40' and product_name == '[R_BC] R Butter Cream' and plant == 'CW':
                #     izi.alert(str((target_production, request, outstanding_request, buffer_stock, initial_stock, forecast_in, outstanding_production, produced)))
                #     izi.alert(str((target_production, weekly_percentage, indirect_request, request, min_stock, max_stock, max_week)))
                #     izi.alert(target_production)
                #     izi.alert(str(percentage_by_week_by_product_by_plant))
                #     izi.alert(percentage_by_week_by_product_by_plant.get(week_str, {}).get(product_name, {}).get(plant, weekly_percentage))
                        
                # Batch Size
                # Upsize Target Production to Match Batch Size For Ruahan
                if target_production and category == 'RUAHAN':
                    # Get From Table Weekly Ruahan Batch Size
                    if batch_size_by_date_by_product_id_by_plant.get(cur_date, {}).get(product_id, {}).get(plant, 0):
                            if batch_size_by_date_by_product_id_by_plant[cur_date][product_id][plant] > target_production:
                                target_production = batch_size_by_date_by_product_id_by_plant[cur_date][product_id][plant]
                    else:
                        # If Not Found Any Configuration
                        # Save to Table Weekly Ruahan Batch Size 
                        # For This Week Only First
                        if cur_date == start_date:
                            if cur_date not in new_batch_size_by_date_by_product_id_by_plant_by_plant:
                                new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date] = {}
                            if product_id not in new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date]:
                                new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date][product_id] = {}
                            new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date][product_id][plant] = int(target_production)
                            
                # Check Capacity
                # Unlimited Capacity
                if category and category in left_capacity_by_date_by_category_by_plant[cur_date]:
                    if plant in left_capacity_by_date_by_category_by_plant[cur_date][category]:
                        # izi.alert(str((left_capacity, product_id, target_production)))
                        if left_capacity_by_date_by_category_by_plant[cur_date][category][plant] > 0:
                            if target_production <= left_capacity_by_date_by_category_by_plant[cur_date][category][plant]:
                                left_capacity_by_date_by_category_by_plant[cur_date][category][plant] -= target_production
                            else:
                                target_production = left_capacity_by_date_by_category_by_plant[cur_date][category][plant]
                                left_capacity_by_date_by_category_by_plant[cur_date][category][plant] = 0
                        else:
                            target_production = 0
                    
                # Checking
                # if week_str == 'W40' and product_name == '[R_BC] R Butter Cream' and plant == 'CW':
                #     izi.alert(str((target_production, request, outstanding_request, buffer_stock, initial_stock, forecast_in, outstanding_production, produced)))
                #     izi.alert(str((target_production, weekly_percentage, indirect_request, request, min_stock, max_stock, max_week)))
                #     izi.alert(target_production)
                #     izi.alert(str(percentage_by_week_by_product_by_plant))
                #     izi.alert(percentage_by_week_by_product_by_plant.get(week_str, {}).get(product_name, {}).get(plant, weekly_percentage))
                    
                # Comparing Target Production and Real Producing This Active Week
                # If Target Production < Real Producing
                if target_production < producing:
                    target_production = producing
                
                # Only Set Target To Raw Material
                # Do Not Check Material Available Quantity
                if target_production and bom_line_ratio:
                    for line_product_id in bom_line_ratio:
                        component_ratio = bom_line_ratio[line_product_id]
                        # Component Request
                        component_request = target_production * component_ratio
                        
                        # Indirect Request For Material
                        if line_product_id not in indirect_request_by_date_by_product_id_by_plant[cur_date]:
                            indirect_request_by_date_by_product_id_by_plant[cur_date][line_product_id] = {}
                        if plant not in indirect_request_by_date_by_product_id_by_plant[cur_date][line_product_id]:
                            indirect_request_by_date_by_product_id_by_plant[cur_date][line_product_id][plant] = 0
                        indirect_request_by_date_by_product_id_by_plant[cur_date][line_product_id][plant] += component_request
                
                # Just Set Available To Produce = Target Production For Now
                available_to_produce = target_production
                material_check = ''
                production_info = ''
                actionable_produce = True if cur_date == start_date else False
                
                # Checking
                # if week_str == 'W40' and product_name == '[R_BC] R Butter Cream' and plant == 'CW':
                #     izi.alert(str((target_production, request, outstanding_request, buffer_stock, initial_stock, forecast_in, outstanding_production, produced)))
                #     izi.alert(str((target_production, weekly_percentage, indirect_request, request, min_stock, max_stock, max_week)))
                #     izi.alert(target_production)
                #     izi.alert(str(percentage_by_week_by_product_by_plant))
                #     izi.alert(percentage_by_week_by_product_by_plant.get(week_str, {}).get(product_name, {}).get(plant, weekly_percentage))
                
                #Round Up Data
                def round_up(x):
                    if x == int(x):
                        return int(x)
                    return int(x) + 1
                    
                # Weeks
                insert_values = {
                    'priority': index,
                    'plant': plant,
                    'week': 'W%s' % (week_string),
                    'date': cur_date,
                    'stock_cover': stock_cover,
                    'product': product_name,
                    'product_id': product_id,
                    'category': mrp_product.get('category'),
                    'material_category': mrp_product.get('material_category'),
                    'vendor_price': vendor_price,
                    
                    'min_stock': min_stock,
                    'max_stock': max_stock,
                    
                    'request': request,
                    'outstanding_request': outstanding_request,
                    'buffer_stock': buffer_stock,
                    
                    'initial_stock': initial_stock,
                    
                    'outstanding_production': outstanding_production,
                    'target_production': round_up(target_production),
                    'available_to_produce': available_to_produce,
                    'producing': producing,
                    
                    'material_check': material_check,
                    'available_capacity': 0,
                    
                    'forecast_out': 0,
                    'forecast_in': forecast_in,
                    'produced': produced,
                    'production_info': production_info,
                    
                    'supplier_id': supplier_id,
                    'actionable_produce': actionable_produce,
                    'weekly_percentage': weekly_percentage,
                }
                if product_id not in values_by_date_by_product_id_by_plant[cur_date]:
                    values_by_date_by_product_id_by_plant[cur_date][product_id] = {}
                values_by_date_by_product_id_by_plant[cur_date][product_id][plant] = insert_values
                # izi.query_insert('izi_weekly_production_plan', insert_values)
                index += 1
               
        # izi.alert('Checkpoint 2')
        # Second Iteration To Calculate Schedule, Forecast In, Ending Stock, Outstanding Request From RM to FG
        for product_ids in rm_to_fg_product_ids:
            # Main
            for product_id in product_ids:
                if product_id not in mrp_product_by_product_id:
                    continue
                    izi.alert('This Product ID %s is not found!' % (product_id))
                mrp_product = mrp_product_by_product_id[product_id]
                supplier_id = mrp_product.get('supplier_id', None)
                product_name = mrp_product.get('product', None)
                min_week = mrp_product.get('min_week', 0)
                max_week = mrp_product.get('max_week', 0)
                lead_time = mrp_product.get('lead_time', 1)
                category = mrp_product.get('category', None)
                product_plant = mrp_product.get('plant', None)
                
                # Check Plant
                if category == 'FG' and product_plant != 'ALL' and product_plant != plant:
                    continue
                
                # Request Share
                request_share = 1
                if category == 'FG' and product_plant == 'ALL':
                    request_share = request_share_by_category_by_plant.get(category, {}).get(plant, 0) / 100
                
                # Rules For RM and PM.
                # Min = Lead Time / 7. Max = 2 * Min.
                if category in ('PM', 'RM'):
                    min_week = lead_time / 7
                    max_week = 2 * min_week
                
                # Overwrite With Google Sheet
                if product_id in gs_product_by_product_id:
                    min_week = gs_product_by_product_id[product_id].get('min_week', min_week)
                    max_week = gs_product_by_product_id[product_id].get('max_week', max_week)
                    lead_time = gs_product_by_product_id[product_id].get('lead_time', lead_time)
                
                # BoM Details
                bom_details = mrp_product.get('bom_details', None)
                bom_line_ratio = {}
                if bom_details:
                    bom_details = bom_details.split('\n')
                    for bom_line_dt in bom_details:
                        bom_line_dt = bom_line_dt.split(';')
                        if len(bom_line_dt) == 3:
                            component_id = int(bom_line_dt[0])
                            component_ratio = float(bom_line_dt[2])
                            bom_line_ratio[component_id] = component_ratio
                
                # Stock
                # Real Stock
                initial_stock = 0
                if cur_date == start_date:
                    if category in overall_stock_categories:
                        initial_stock = stock_by_date_by_product_id[cur_date].get(product_id, 0)
                    else:
                        initial_stock = stock_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                        
                    # Check Google Sheet
                    initial_stock = gs_stock_by_date_by_product_id_by_plant.get(cur_date, {}).get(product_id, {}).get(plant, initial_stock)
                    
                    # Request Share
                    initial_stock = initial_stock * request_share
                            
                # Forecast Stock
                initial_stock = forecast_stock_by_date_by_product_id_by_plant.get(cur_date, {}).get(product_id, {}).get(plant, initial_stock)
                
                # Forecast In
                # Add Forecast Stock With Forecast In From Long Time Producing
                forecast_in = forecast_in_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, 0)
                
                # Get Target Production From Previous Loop
                # The Target Production Will Never Change
                values = values_by_date_by_product_id_by_plant[cur_date][product_id][plant]
                target_production = values.get('target_production')
                stock_cover = values.get('stock_cover')
                min_stock = values.get('min_stock')
                max_stock = values.get('max_stock')
                request = values.get('request')
                outstanding_request = values.get('outstanding_request')
                producing = values.get('producing')
                produced = values.get('produced')
                
                available_to_produce = target_production
                material_check = ''
                
                # Checking
                # if product_id == 'Stiker NTO DELOUISA ' and week_string == '38':
                #     izi.alert('Check Product ID %s\nStock %s\nReq %s\nTP %s' % (
                #         product_id, initial_stock, request, target_production,))
                            
                if target_production and bom_line_ratio:
                    for line_product_id in bom_line_ratio:
                        component_ratio = bom_line_ratio[line_product_id]
                        # Component Stock
                        component_category = mrp_product_by_product_id.get(line_product_id, {}).get('category', 'RM')
                        if component_category in overall_stock_categories:
                            component_stock = stock_by_date_by_product_id[cur_date].get(line_product_id, 0)
                        else:
                            component_stock = stock_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, 0)
                            
                        # Checking
                        # if product_id == 'Stiker NTO DELOUISA ' and week_string == '38':
                        #     izi.alert('Check Component Product ID %s\nStock %s\nCategory %s' % (
                        #         line_product_id, component_stock, category))
                        
                        # Forecast Component Stock
                        component_stock = forecast_stock_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, component_stock)
                        
                        # Forecast In Component Stock
                        # Add Forecast Stock With Forecast In From Production With Lead Time
                        component_forecast_in = forecast_in_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, 0)
                        
                        # Component Request
                        component_request = target_production * component_ratio
                        
                        # Component Reserve By Previous Products
                        component_reserve = reserve_by_date_by_product_id_by_plant.get(cur_date, {}).get(line_product_id, {}).get(plant, 0)
                        
                        # Calculate Available To Produce
                        if (component_stock + component_forecast_in - component_reserve) < component_request:
                            temporary_atp = target_production * (component_stock + component_forecast_in - component_reserve) / component_request
                            if (temporary_atp < available_to_produce) and temporary_atp > 0:
                                available_to_produce = temporary_atp
                            elif temporary_atp == 0:
                                available_to_produce = 0
                    
                    # Checking 
                    # if product_id == 'Stiker NTO DELOUISA ' and week_string == '38':
                    #     izi.alert('Check Product ID %s\nStock %s\nReq %s\nATP %s' % (
                    #         product_id, initial_stock, request, available_to_produce,))
                    
                    # Insert New Reservation, Add to Reserve
                    for line_product_id in bom_line_ratio:
                        component_ratio = bom_line_ratio[line_product_id]
                        # Component Stock
                        component_category = mrp_product_by_product_id.get(line_product_id, {}).get('category', 'RM')
                        if component_category in overall_stock_categories:
                            component_stock = stock_by_date_by_product_id[cur_date].get(line_product_id, 0)
                        else:
                            component_stock = stock_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, 0)
                        
                        # Forecast Component Stock
                        component_stock = forecast_stock_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, component_stock)
                        
                        # Forecast In Component Stock
                        # Add Forecast Stock With Forecast In From Production With Lead Time
                        component_forecast_in = forecast_in_by_date_by_product_id_by_plant[cur_date].get(line_product_id, {}).get(plant, 0)
                        
                        # Component Request
                        component_request = target_production * component_ratio
                        
                        # Component Reserve By Previous Products
                        component_reserve = reserve_by_date_by_product_id_by_plant.get(cur_date, {}).get(line_product_id, {}).get(plant, 0)
                        
                        # DO NOT Calculate Available To Produce Again
                        
                        # Insert New Reservation, Add to Reserve
                        if line_product_id not in reserve_by_date_by_product_id_by_plant[cur_date]:
                            reserve_by_date_by_product_id_by_plant[cur_date][line_product_id] = {}
                        if plant not in reserve_by_date_by_product_id_by_plant[cur_date][line_product_id]:
                            reserve_by_date_by_product_id_by_plant[cur_date][line_product_id][plant] = 0
                        to_reserve = int((component_request * (available_to_produce / target_production)) + 0.5)
                        reserve_by_date_by_product_id_by_plant[cur_date][line_product_id][plant] += to_reserve
                    
                        # Material Check String
                        line_product_sku = mrp_product_by_product_id.get(line_product_id, {}).get('default_code', '')
                        if not material_check:
                            material_check = '%s;%s;%s' % (line_product_sku,
                                # int(component_stock),
                                int(component_stock - component_reserve + component_forecast_in),
                                int(to_reserve))
                        else:
                            material_check += '\n%s;%s;%s' % (line_product_sku,
                                # int(component_stock),
                                int(component_stock - component_reserve + component_forecast_in),
                                int(to_reserve))
                
                # Checking
                # if product_id == 'NTO CH.DERMACLICK by dr. Anisa Charismawati' and week_string == '38':
                #     izi.alert(str((forecast_in, available_to_produce, forecast_in_by_date_by_product_id[cur_date][product_id])))
                
                # Schedule Production
                # Set Production Date
                finish_date = None
                if available_to_produce:
                    # Is A Raw Material to Purchase. Not to Produce.
                    finish_date_obj = datetime.datetime.strptime(cur_date, "%Y-%m-%d") + datetime.timedelta(days=lead_time)
                    # Set to The First Day of The Week. On Monday.
                    finish_date_obj = finish_date_obj - datetime.timedelta(days=finish_date_obj.weekday())
                    finish_date = finish_date_obj.strftime("%Y-%m-%d")
                    
                    # Add Forecast In In That Date
                    if finish_date not in forecast_in_by_date_by_product_id_by_plant:
                        forecast_in_by_date_by_product_id_by_plant[finish_date] = {}
                    if product_id not in forecast_in_by_date_by_product_id_by_plant[finish_date]:
                        forecast_in_by_date_by_product_id_by_plant[finish_date][product_id] = {}
                    if plant not in forecast_in_by_date_by_product_id_by_plant[finish_date][product_id]:
                        forecast_in_by_date_by_product_id_by_plant[finish_date][product_id][plant] = 0
                    forecast_in_by_date_by_product_id_by_plant[finish_date][product_id][plant] += available_to_produce
                    
                    # Add To Forecast In If This Week
                    if finish_date == cur_date:
                        forecast_in += available_to_produce
                        
                    # Add Waiting Date and Waiting Production Qty
                    waiting_date_obj = datetime.datetime.strptime(cur_date, "%Y-%m-%d") + datetime.timedelta(days=7)
                    waiting_date = waiting_date_obj.strftime("%Y-%m-%d")
                    while waiting_date < finish_date:
                        if waiting_date not in outstanding_production_by_date_by_product_id_by_plant:
                            outstanding_production_by_date_by_product_id_by_plant[waiting_date] = {}
                        if product_id not in outstanding_production_by_date_by_product_id_by_plant[waiting_date]:
                            outstanding_production_by_date_by_product_id_by_plant[waiting_date][product_id] = {}
                        if plant not in outstanding_production_by_date_by_product_id_by_plant[waiting_date][product_id]:
                            outstanding_production_by_date_by_product_id_by_plant[waiting_date][product_id][plant] = 0
                        outstanding_production_by_date_by_product_id_by_plant[waiting_date][product_id][plant] += available_to_produce
                        # Iterate
                        waiting_date_obj = waiting_date_obj + datetime.timedelta(days=7)
                        waiting_date = waiting_date_obj.strftime("%Y-%m-%d")
                
                production_info = production_info_by_date_by_product_id_by_plant[cur_date].get(product_id, {}).get(plant, '')
                if production_info:
                    production_info = '\n'.join(production_info)
                # izi.alert(str(production_info))
                
                # Helper Variable Forecast Out
                forecast_out = (request + outstanding_request)
                if (initial_stock + forecast_in + produced) < (request + outstanding_request):
                    forecast_out = (initial_stock + forecast_in + produced)
                
                # Stock Calculation For Next Period
                if next_date not in forecast_stock_by_date_by_product_id_by_plant:
                    forecast_stock_by_date_by_product_id_by_plant[next_date] = {}
                if product_id not in forecast_stock_by_date_by_product_id_by_plant[next_date]:
                    forecast_stock_by_date_by_product_id_by_plant[next_date][product_id] = {}
                forecast_stock_by_date_by_product_id_by_plant[next_date][product_id][plant] = initial_stock + forecast_in + produced - forecast_out
                
                # Checking 
                # if product_id == 'Maxdecal Clear HD VPF100-127' and week_string == '38' and plant == 'CW':
                #     izi.alert(str(forecast_stock_by_date_by_product_id_by_plant[next_date][product_id]))
                # if product_id == 'NTO CH.DERMACLICK by dr. Anisa Charismawati' and week_string == '37':
                #     izi.alert('Check Product ID %s\nStock %s\nReq %s\nATP %s\nIn %s\nOut %s\nNext Date Stock %s' % (product_id,
                #         initial_stock, request, available_to_produce, forecast_in, forecast_out, forecast_in_by_date_by_product_id))
                
                # Outstanding Request For Next Period
                if next_date not in outstanding_request_by_date_by_product_id_by_plant:
                    outstanding_request_by_date_by_product_id_by_plant[next_date] = {}
                if product_id not in outstanding_request_by_date_by_product_id_by_plant[next_date]:
                    outstanding_request_by_date_by_product_id_by_plant[next_date][product_id] = {}
                outstanding_request_by_date_by_product_id_by_plant[next_date][product_id][plant] = (request + outstanding_request) - forecast_out
                
                # Sales Info
                sales_info = sales_info_by_date_by_product_id[cur_date].get(product_id, '')
                if sales_info:
                    sales_info = '\n'.join(sales_info)
                    
                # izi.alert('Checkpoint New 100!')
                # Weeks
                insert_values = values_by_date_by_product_id_by_plant[cur_date][product_id][plant]
                insert_values.update({
                    'forecast_out': forecast_out,
                    'forecast_in': forecast_in,
                    'available_to_produce': available_to_produce,
                    'material_check': material_check,
                    'production_info': production_info,
                    'sales_info': sales_info,
                    'finish_date': finish_date,
                })

# izi.alert('Checkpoint 3')
# Write to Database
if not action:
    # Write Production Plan To Database
    for cur_date in values_by_date_by_product_id_by_plant:
        for product_id in values_by_date_by_product_id_by_plant[cur_date]:
            for plant in values_by_date_by_product_id_by_plant[cur_date][product_id]:
                insert_values = values_by_date_by_product_id_by_plant[cur_date][product_id][plant]
                # izi.alert(len(insert_values))
                izi.query_insert('izi_weekly_production_plan', insert_values)
        
    # Write Batch Size To Database
    for cur_date in new_batch_size_by_date_by_product_id_by_plant_by_plant:
        for product_id in new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date]:
            mrp_product = False
            if product_id in mrp_product_by_product_id:
                mrp_product = mrp_product_by_product_id[product_id]
            for plant in new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date][product_id]:
                insert_values = {
                    'plant': plant,
                    'date': cur_date,
                    'product_id': product_id,
                    'product': mrp_product.get('product', None),
                    'target_production': new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date][product_id][plant],
                    'batch_size': new_batch_size_by_date_by_product_id_by_plant_by_plant[cur_date][product_id][plant],
                }
                izi.query_insert('izi_weekly_ruahan_batch_size', insert_values)