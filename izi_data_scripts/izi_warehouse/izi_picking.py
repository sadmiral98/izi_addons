if not records or len(records) != 1 or records.picking_type_id.name != 'Re-Stock (STS)':
  izi.alert('Must Be A Re-Stock (STS) Transfer!')

gs_id = '1vudkZyjwNVkfpiB8ITlpLOrzCQCopwM5Rq5nTZNjdMk'
res_data = izi.read_google_spreadsheet(gs_id, 'StorageForScript')
# izi.alert(str(res_data))
product_ids = []
product_id_by_name = {}
product_name_by_id = {}
uom_by_name = {}
uom_by_id = {}
for r in res_data:
  product_name = r.get('Product').strip()
  # izi.alert(product_name)
  if product_name:
    product_name = product_name.replace('[', '')
    product_name = product_name.replace('] ', '#')
    product_name = product_name.split('#')
    if product_name and len(product_name) == 2:
      default_code = product_name[0]
      product_name = product_name[1]
      product = env['product.product'].search([('name', '=', product_name), ('default_code', '=', default_code)])
      # izi.alert(str((default_code, product_name, len(product))))
      if product.id not in product_ids:
        product_ids.append(product.id)
        product_id_by_name[r.get('Product').strip()] = product.id
        product_name_by_id[product.id] = r.get('Product').strip()
        uom_by_name[r.get('Product').strip()] = product.uom_id.id
        uom_by_id[product.id] = product.uom_id.id
    
# izi.alert(str(product_ids))
product_ids_string = ['%s' % product_id for product_id in product_ids]
product_ids_string = ','.join(product_ids_string)
# Checking
# izi.alert(str(product_ids_string))

res_quants = izi.query_fetch('''
  SELECT
    sq.product_id,
    spl.name,
    spl.expiration_date,
    (sq.quantity - sq.reserved_quantity) as quantity,
    sq.lot_id,
    sq.location_id
  FROM stock_quant sq
    LEFT JOIN stock_location sl ON (sq.location_id = sl.id)
    LEFT JOIN stock_production_lot spl ON (sq.lot_id = spl.id)
  WHERE
    (sl.complete_name ILIKE 'DKE/Stock%%' OR sl.complete_name = 'DKE/Stock')
    AND sq.product_id IN (%s)
    -- AND spl.expiration_date IS NOT NULL
  ORDER BY
    sq.quantity DESC,
    spl.expiration_date ASC
''' % (product_ids_string))
# Checking
for q in res_quants:
  q['expired_date'] = ''
  if q['expiration_date']:
    q['expired_date'] = q['expiration_date'].strftime('%Y-%m')
  q['available_qty'] = q['quantity']
# izi.alert(str(res_quants))

# Main
row_index = 2
move_qty_by_product = {}
all_stock_move_lines = []
for r in res_data:
  product_name = r.get('Product').strip()
  product_id = product_id_by_name[product_name]
  uom_id = uom_by_name[product_name]
  dest_loc_name = r.get('Destination Location').strip()
  dest_loc = env['stock.location'].search([('complete_name', '=', dest_loc_name)])
  if not dest_loc:
    izi.alert('Location Not Found')
  qty = int(r.get('Qty'))
  expired_date = r.get('Expired Date').strip()
  
  # Search Quants
  stock_move_lines = []
  need_qty = qty
  for q in res_quants:
    if need_qty <= 0:
      break
    q_product_id = q['product_id']
    q_expired_date = q['expired_date']
    q_qty = q['available_qty']
    # izi.alert(q_expired_date)
    if q_product_id == product_id and q_qty > 0:
      if q_expired_date == expired_date:
        if q_qty >= need_qty:
          stock_move_lines.append({
            'product_id': product_id,
            'lot_id': q['lot_id'],
            'location_id': q['location_id'],
            'location_dest_id': dest_loc.id,
            'product_uom_qty': need_qty,
            'qty_done': need_qty,
            'product_uom_id': uom_id,
          })
          q['available_qty'] -= need_qty
          need_qty = 0
        else:
          stock_move_lines.append({
            'product_id': product_id,
            'lot_id': q['lot_id'],
            'location_id': q['location_id'],
            'location_dest_id': dest_loc.id,
            'product_uom_qty': q['available_qty'],
            'qty_done': q['available_qty'],
            'product_uom_id': uom_id,
          })
          need_qty -= q['available_qty']
          q['available_qty'] = 0
  
  # Search Again Without Checking Expired
  if need_qty > 0:
    for q in res_quants:
      if need_qty <= 0:
        break
      q_product_id = q['product_id']
      q_expired_date = q['expired_date']
      q_qty = q['available_qty']
      # izi.alert(q_expired_date)
      if q_product_id == product_id and q_qty > 0:
        if q_qty >= need_qty:
          stock_move_lines.append({
            'product_id': product_id,
            'lot_id': q['lot_id'],
            'location_id': q['location_id'],
            'location_dest_id': dest_loc.id,
            'product_uom_qty': need_qty,
            'qty_done': need_qty,
            'product_uom_id': uom_id,
          })
          q['available_qty'] -= need_qty
          need_qty = 0
        else:
          stock_move_lines.append({
            'product_id': product_id,
            'lot_id': q['lot_id'],
            'location_id': q['location_id'],
            'location_dest_id': dest_loc.id,
            'product_uom_qty': q['available_qty'],
            'qty_done': q['available_qty'],
            'product_uom_id': uom_id,
          })
          need_qty -= q['available_qty']
          q['available_qty'] = 0
  all_stock_move_lines.extend(stock_move_lines)
  # if need_qty > 0:
    # Checking
    # izi.alert('Quant Not Enough! Row %s, Product %s, Exp Date %s, Qty %s, Still Need %s\nSelected Quants %s' % 
    #   (row_index, product_name, expired_date, qty, need_qty, str(stock_move_lines)))
  # else:
    # Checking
    # izi.alert('Quant Enough! Row %s, Product %s, Exp Date %s, Qty %s\nSelected Quants %s' % 
    #   (row_index, product_name, expired_date, qty, str(stock_move_lines)))
    
  # Create Stock Move From Stock Move Lines Data
  # izi.alert(str(stock_move_lines))
  for sml in stock_move_lines:
    if sml['product_id'] not in move_qty_by_product:
      move_qty_by_product[sml['product_id']] = 0
    move_qty_by_product[sml['product_id']] += sml['product_uom_qty']
    
  row_index += 1

# Create Stock Move
record.write({
  'immediate_transfer': False,
})
for sml in all_stock_move_lines:
  product_id = sml.get('product_id')
  qty = sml.get('product_uom_qty')
  uom_id = uom_by_id[product_id]
  product_name = product_name_by_id[product_id]
  env['stock.move'].create({
    'product_id': sml.get('product_id'),
    'name': product_name,
    'product_uom_qty': qty,
    'product_uom': uom_id,
    'location_id': sml.get('location_id'),
    'location_dest_id': sml.get('location_dest_id'),
    'picking_id': record.id,
  })
  
record.action_confirm()
record.action_assign()
  
