# Parameters
init_table = True

# Initialize

# Prepare Table
if init_table and izi_table:
    # Data Dummy
    values = {
        'product_id': 1,
        'default_code': 'AN 5G',
        # Name of Product With Information of Variants (Display Name?)
        'product': 'AN 5G DKE Expert',
        # Category: FG, SFF, R, RM, PM
        'category': 'FG',
        # Material Category Follow The SKU Code of Ruahan Product: R_AN, R_AG, R_BFS
        'material_category': 'R_AN',
        # Procure Method: 'Manufacture', 'Buy', 'Subcontract'
        'procure_method': 'Subcontract',
        # Active Bill of Material ID
        'bom_id': 1,
        # Is Priority, Check If The Customer Priority?
        'is_priority': 'Yes',
        # Is Subcontracted / Makloon
        'is_subcontract': 'Yes',
        # Manufacture Lead Time / Purchase Lead Time (In Days)
        'lead_time': 1,
        'uom_id': 'pcs',
        'supplier_id': 1,
        'bom_details': '1;RM1;200\n2;RM2;10',
        'min_week': 2,
        'max_week': 4,
        'plant': 'CW',
        'vendor_price': 100.0,
    }
    # Build Table Schma
    izi_table.get_table_fields_from_dictionary(values)
    izi_table.update_schema_store_table()
    
    # Truncate
    izi.query_execute('TRUNCATE izi_manufacture_product;')
    
    # Insert Data Dummy
    # izi.query_insert('izi_manufacture_product', values)
    

# Get All Products
products = env['product.product'].search([('type', '=', 'product')])
boms = env['mrp.bom'].search([('type', '!=', 'phantom'), ('code', '!=', 'Relable')])
kits = env['mrp.bom'].search([('type', '=', 'phantom')])
makloons = env['makloon.product'].search([])
# Bill of Material
bom_by_product_tmpl_id = {}
for bom in boms:
    product_tmpl_id = bom.product_tmpl_id.id
    if product_tmpl_id not in bom_by_product_tmpl_id:
        bom_by_product_tmpl_id[product_tmpl_id] = bom
    else:
        if bom.write_date > bom_by_product_tmpl_id[product_tmpl_id].write_date:
            bom_by_product_tmpl_id[product_tmpl_id] = bom

# Kit
kit_by_product_tmpl_id = {}
for kit in kits:
    product_tmpl_id = kit.product_tmpl_id.id
    if product_tmpl_id not in kit_by_product_tmpl_id:
        kit_by_product_tmpl_id[product_tmpl_id] = kit
    else:
        if kit.write_date > kit_by_product_tmpl_id[product_tmpl_id].write_date:
            kit_by_product_tmpl_id[product_tmpl_id] = kit

# Makloon
vendor_by_product_id = {}
for makloon in makloons:
    if makloon.product_makloon_id:
        vendor_by_product_id[makloon.product_makloon_id.id] = makloon.vendor

for product in products:
    product_category = product.categ_id
    while product_category.parent_id:
        product_category = product_category.parent_id
    product_category_name = product_category.name.upper()
    customer_priority = True if product.rebrand_customer_id.customer_priority == 'priority' else False
    product_subcontract = True if product.rebrand_customer_id else False
    vendor_price = 0
    
    product_bom = None
    if product.product_tmpl_id.id in bom_by_product_tmpl_id:
        product_bom = bom_by_product_tmpl_id[product.product_tmpl_id.id].id
    
    if product_category_name in ['SFF', 'FG']:
        procure_method = 'Subcontract'
    elif product_category_name == 'ruahan':
        procure_method = 'Manufacture'
    elif product_category_name == 'RM' :
        procure_method = 'Buy'
    else:
        procure_method = ''
        
    # Makloon
    plant = None
    if product_category_name == 'FG':
        if product.id in vendor_by_product_id:
            vendor = vendor_by_product_id[product.id]
            if vendor == 'gizi':
                plant = 'CW'
            elif vendor == 'maxima':
                plant = 'PPM'
            elif vendor == 'gemma':
                plant = 'PPG'
        if not product.rebrand_customer_id:
            plant = 'ALL'
        
    # Material Category
    bom_details = []
    material_category = ''
    if product.product_tmpl_id.id in bom_by_product_tmpl_id:
        bom = bom_by_product_tmpl_id[product.product_tmpl_id.id]
        # 1 Unit FG In BoM Unit
        fg_qty_in_bom = product.uom_id._compute_quantity(1, bom.product_uom_id, round=True)
        
        bom_lines = env['mrp.bom.line'].search([('bom_id', '=', bom.id)], order='product_id asc')
        for component in bom_lines:
            component_category = component.product_id.categ_id.name
            
            # Get BoM Details
            component_qty_in_bom = component.product_qty * fg_qty_in_bom / bom.product_qty
            component_qty = component.product_uom_id._compute_quantity(
                component_qty_in_bom, component.product_id.uom_id, round=True)
                
            # Check Kit
            has_kit = False
            if component.product_id.product_tmpl_id.id in kit_by_product_tmpl_id:
                has_kit = True
                kit = kit_by_product_tmpl_id[component.product_id.product_tmpl_id.id]
                kit_lines = env['mrp.bom.line'].search([('bom_id', '=', kit.id)], order='product_id asc')
                for kit_line in kit_lines:
                    # Ignore UoM. Assumption : Always In Unit.
                    kit_line_qty = kit_line.product_qty * component_qty / kit.product_qty
                    # Add BoM Details
                    bom_details.append('%s;%s;%s' % (kit_line.product_id.id, kit_line.product_id.default_code, kit_line_qty))
            
            # Add BoM Details
            if not has_kit:
                bom_details.append('%s;%s;%s' % (component.product_id.id, component.product_id.default_code, component_qty))
            
            # Search For Ruahan
            if 'ruahan' in component_category:
                material_category = component.product_id.default_code
                # break
            else:
                for sub_bom in component.product_id.bom_ids:
                    for sub_component in sub_bom.bom_line_ids:
                        sub_component_category = sub_component.product_id.categ_id.name
                        if 'ruahan' in sub_component_category:
                            material_category = sub_component.product_id.default_code
                            break
                    if material_category:
                        break
                # if material_category:
                #     break

    if not material_category:
        material_category = ''
        
    # Supplier
    purchase_lead_time = 0
    supplier_id = None
    if product.product_tmpl_id.seller_ids:
        if product.product_tmpl_id.seller_ids[0]:
            supplier_id = product.seller_ids[0].name.id
            if product.seller_ids[0].delay:
                purchase_lead_time = product.seller_ids[0].delay
            if product.seller_ids[0].price:
                vendor_price = product.seller_ids[0].price
    
    lead_time = product.produce_delay or purchase_lead_time or None
    if product_category_name == 'FG':
        if not lead_time:
            lead_time = 1
        min_week = 1
        max_week = 1
    elif product_category_name == 'SFF':
        if not lead_time:
            lead_time = 1
        min_week = 1
        max_week = 1
    elif product_category_name == 'RUAHAN':
        if not lead_time:
            lead_time = 7
        min_week = 1
        max_week = 1
    elif product_category_name == 'RM' :
        if not lead_time:
            lead_time = 60
        min_week = 1
        max_week = 1
    else:
        if not lead_time:
            lead_time = 1
        min_week = 1
        max_week = 1
        
    # BoM Details
    if bom_details:
        bom_details = '\n'.join(bom_details)
        # izi.alert(bom_details)
    else:
        bom_details = None
    
    values = {
        'product_id': product.id,
        'product': product.display_name,
        'default_code' : product.default_code,
        'category' : product_category_name,
        'material_category' : material_category,
        'procure_method' : procure_method,
        'bom_id':product_bom,
        'is_priority' : 'Yes' if customer_priority == True else 'No',
        'is_subcontract' : 'Yes' if product_subcontract == True else 'No',
        'lead_time' : lead_time,
        'uom_id' : product.uom_id.name,
        'supplier_id': supplier_id or None,
        'bom_details': bom_details,
        'min_week': min_week,
        'max_week': max_week,
        'plant': plant,
        'vendor_price': vendor_price,
    }
    # Testing
    # if product.default_code == 'SFF NO70 - 60 ml Standar DKE':
    #     izi.alert(product.name)
    
    izi.query_insert('izi_manufacture_product', values)
    
    
    
