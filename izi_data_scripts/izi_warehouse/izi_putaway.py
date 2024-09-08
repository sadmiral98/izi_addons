put_away_location_capacity = 1000
pack_size = 10

if not records or len(records) != 1:
  izi.alert('Select A Transfer')

put_away_locations = ('DKE/Stock', 'DKE/Picking Area')
if not record.location_dest_id.complete_name in put_away_locations:
  izi.alert('Put Away Can Only Be Used in %s' % (str(put_away_locations)))
  
if not record.state in ('draft', 'confirmed'):
  izi.alert('Put Away Calculation Can Only Be Processed in Draft or Waiting State!')

# Master Product
product_ids = []
product_ids_str = []
product_names = []
product_id_by_name = {}
for ml in record.move_lines:
  product_ids_str.append('%s' % ml.product_id.id)
  product_names.append(ml.product_id.display_name)
  product_id_by_name[ml.product_id.display_name] = ml.product_id.id
product_ids_str = ','.join(product_ids_str)

# Master Location
res_locations = izi.query_fetch('''
  SELECT
    id,
    complete_name
  FROM stock_location
  WHERE
    complete_name LIKE '%s%%'
  ORDER BY complete_name ASC
''' % (record.location_dest_id.complete_name))
# Checking
# izi.alert(str(res_locations))
location_id_by_name = {}
for r in res_locations:
  location_id_by_name[r['complete_name']] = r['id']

# Get Put Away Rules From Odoo
# res_rules = izi.query_fetch('''
#   SELECT *
#   FROM stock_putaway_rule
#   WHERE
#     product_id IN (%s)
#     AND location_in_id = %s
#   ORDER BY
#     sequence ASC
# ''' % (product_ids_str, record.location_dest_id.id))
# # Checking
# # izi.alert(len(res_rules))
# put_away_location_ids = []
# put_away_location_ids_str = []
# put_away_locations_by_product = {}
# for r in res_rules:
#   put_away_location_ids_str.append('%s' % r['location_out_id'])
#   if r['product_id'] not in put_away_locations_by_product:
#     put_away_locations_by_product[r['product_id']] = []
#   put_away_locations_by_product[r['product_id']].append(r['location_out_id'])
# put_away_location_ids_str = ','.join(put_away_location_ids_str)

# Get From Google Sheet
gs_id = '1vudkZyjwNVkfpiB8ITlpLOrzCQCopwM5Rq5nTZNjdMk'
res_rules = izi.read_google_spreadsheet(gs_id, 'Picking%20Area')
put_away_location_ids_str = []
put_away_locations_by_product = {}
for r in res_rules:
  product = r['Product'].strip()
  if product in product_id_by_name:
    product_id = product_id_by_name[product]
    location = r['Location'].strip()
    if location in location_id_by_name:
      location_id = location_id_by_name[location]
      put_away_location_ids_str.append('%s' % location_id)
      if product_id not in put_away_locations_by_product:
        put_away_locations_by_product[product_id] = []
      if location_id not in put_away_locations_by_product[product_id]:
        put_away_locations_by_product[product_id].append(location_id)
put_away_location_ids_str = ','.join(put_away_location_ids_str)

# Checking
# izi.alert(str(put_away_locations_by_product))

res_quants = izi.query_fetch('''
  SELECT
    location_id,
    SUM(quantity) as quantity
  FROM stock_quant
  WHERE
    location_id IN (%s)
  GROUP BY
    location_id
''' % (put_away_location_ids_str))
# Checking
# izi.alert(str(res_quants))
qty_by_location = {}
for r in res_quants:
  qty_by_location[r['location_id']] = r['quantity']

# Main
for ml in record.move_lines:
  demand = ml.product_uom_qty
  put_away_locations = []
  if ml.product_id.id in put_away_locations_by_product:
    put_away_locations = put_away_locations_by_product[ml.product_id.id]
  
  selected_loc_qty = []
  demand_left = demand
  for loc in put_away_locations:
    loc_qty = 0
    if loc in qty_by_location:
      loc_qty = qty_by_location[loc]
    else:
      qty_by_location[loc] = 0
    
    # Check Capacity 
    if demand_left <= 0:
      break
    if loc_qty >= put_away_location_capacity:
      continue
    elif demand_left <= put_away_location_capacity - loc_qty:
      selected_loc_qty.append({
        'location_dest_id': loc,
        'product_uom_qty': demand_left,
      })
      qty_by_location[loc] += demand_left
      demand_left = 0
      break
    else:
      diff = (put_away_location_capacity - loc_qty) % pack_size
      qty_to_store = (put_away_location_capacity - loc_qty) - diff
      if qty_to_store:
        selected_loc_qty.append({
          'location_dest_id': loc,
          'product_uom_qty': qty_to_store,
        })
        demand_left -= qty_to_store
        qty_by_location[loc] += qty_to_store
  
  # Min Qty Loc
  min_loc_qty = 1000 * 1000 * 1000
  min_loc = False
  for loc in put_away_locations:
    loc_qty = 0
    if loc in qty_by_location:
      loc_qty = qty_by_location[loc]
    else:
      qty_by_location[loc] = 0
    if not min_loc or min_loc_qty > loc_qty:
      min_loc = loc
      min_loc_qty = loc_qty
  
  # If There Are Still Demand Left, Put In On Min Qty Loc
  if demand_left and min_loc:
    selected_loc_qty.append({
      'location_dest_id': min_loc,
      'product_uom_qty': demand_left,
    })
  
  # Checking 
  # izi.alert(str(selected_loc_qty))
  
  # Create Stock Move
  index = 0
  for vals in selected_loc_qty:
    if index == 0:
      ml.write({
        'location_dest_id': vals.get('location_dest_id'),
        'product_uom_qty': vals.get('product_uom_qty'),
      })
    else:
      ml.copy({
        'location_dest_id': vals.get('location_dest_id'),
        'product_uom_qty': vals.get('product_uom_qty'),
      })
      
    index += 1
    
    
  

