# -*- coding: utf-8 -*-

from hashlib import sha512


def is_valid_signature_key(received_signature, data, server_key):
    order_id = data['order_id']
    status_code = data['status_code']
    gross_amount = data['gross_amount']
    signature = sha512("{}{}{}{}".format(order_id, status_code, gross_amount, server_key).encode()).hexdigest()
    return signature == received_signature
