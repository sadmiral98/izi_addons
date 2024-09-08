# Parameters
math = izi.lib('math')
ShopeeAPI = izi.lib('ShopeeAPI')
json = izi.lib('json')

init_table = True
start_time = '2023-10-01 00:00:00'
end_time = '2023-10-15 00:00:00'

# Functions

# Prepare Table
if init_table:
    # Data Dummy
    values = {
        'date_order': '2023-01-01',
        'mp_invoice_number': 'INV/2023/0001',
        'mp_account_id': 1,
        'mp_account_name': 'Shopee PT A',
        'sale_order_id': 1,
        'sale_order_name': 'SO/2023/0001',
        'mp_awb_number': 'AWB/2023/0001',
        'mp_amount_total': 1000000.00,
        'mp_order_status': 'delivered',
        'raw_data': 'RAW_DATA',
        'error_message': 'ERROR_MESSAGE',
        'sync_date': '2023-01-01 00:00:00',
        'sync_status': 'SUCCESS_LIST', # SUCCESS_LIST, SUCCESS_DETAIL, SUCCESS_AWB, SUCCESS_SALE_ORDER, ERROR_LIST, ERROR_DETAIL, ERROR_AWB, ERROR_SALE_ORDER
    }
    # Build Table Schma
    izi_table.get_table_fields_from_dictionary(values)
    izi_table.update_schema_store_table()
    
    # Truncate
    izi.query_execute('TRUNCATE izi_marketplace_order;')
    
    # Insert Data Dummy 
    # izi.query_insert('izi_marketplace_order', values)

# SHOPEE
mp_accounts = env['mp.account'].search([('marketplace', '=', 'shopee')])
for mp_account in mp_accounts:
    sp_account = mp_account.shopee_get_account()
    api = ShopeeAPI(sp_account)
    # Get Order List
    order_data_raw = []
    order_ids = []
    from_timestamp = api.to_api_timestamp(datetime.datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S"))
    to_timestamp = api.to_api_timestamp(datetime.datetime.strptime(end_time, "%Y-%m-%d %H:%M:%S"))
    params = {
        'time_range_field': 'create_time',
        'time_from': from_timestamp,
        'time_to': to_timestamp,
        'response_optional_fields': 'order_status'
    }
    unlimited = True
    if unlimited:
        cursor = ""
        while unlimited:
            params.update({
                'page_size': 100,
                'cursor': cursor
            })
            prepared_request = api.build_request('order_list',
                                                    sp_account.partner_id,
                                                    sp_account.partner_key,
                                                    sp_account.shop_id,
                                                    sp_account.access_token,
                                                    ** {
                                                        'params': params
                                                    })
            response_data = api.process_response('order_list', api.request(**prepared_request))
            if response_data['order_list']:
                order_data_raw.extend(response_data['order_list'])
                for res_order in response_data['order_list']:
                    order_ids.append(res_order['order_sn'])
                if not response_data['next_cursor']:
                    unlimited = False
                else:
                    cursor = response_data['next_cursor']
            else:
                unlimited = False
    # Insert
    for data_raw in order_data_raw:
        # izi.alert(str(data_raw))
        values = {
            'mp_invoice_number': data_raw.get('order_sn'),
            'mp_account_id': mp_account.id,
            'mp_account_name': mp_account.name,
            'sale_order_id': None,
            'sale_order_name': None,
            'mp_awb_number': None,
            'mp_amount_total': 0,
            'mp_order_status': data_raw.get('order_status'),
            'raw_data': json.dumps(data_raw),
            'error_message': None,
            'sync_date': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'sync_status': 'SUCCESS_LIST',
        }
        izi.query_insert('izi_marketplace_order', values)
