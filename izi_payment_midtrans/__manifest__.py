# -*- coding: utf-8 -*-
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl.html).
# noinspection PyUnresolvedReferences,SpellCheckingInspection
{
    "name": """Midtrans Payment Acquirer""",
    "summary": """Payment Acquirer: Midtrans""",
    "category": "Payment Acquirer",
    "version": "14.0.0.1.0",
    "development_status": "Alpha",  # Options: Alpha|Beta|Production/Stable|Mature
    "auto_install": False,
    "installable": True,
    "application": False,
    "author": "IZI",
    "website": "https://www.iziapp.id",
    "license": "OPL-1",
    "images": [
        'images/main_screenshot.png'
    ],

    # "price": 10.00,
    # "currency": "EUR",

    "depends": [
        # odoo addons
        'base',
        'payment',
        'sale',
        'website_sale',
        # third party addons

        # developed addons
    ],
    "data": [
        # group
        # 'security/res_groups.xml',

        # data

        # action
        # 'views/action.xml',

        # view
        'views/common/payment_acquirer.xml',
        'views/common/payment_transaction.xml',
        'views/template/payment_midtrans_templates.xml',
        'views/template/payment_confirmation_templates.xml',

        # report

        # assets
        'views/assets.xml',

        # wizard

        # onboarding

        # action menu
        # 'views/action_menu.xml',

        # action onboarding
        # 'views/action_onboarding.xml',

        # menu
        # 'views/menu.xml',

        # security
        'security/ir.model.access.csv',

        # data
        'data/payment_acquirer.xml',
        'data/midtrans.payment.type.csv',
        # 'data/ir_cron.xml',
    ],
    "demo": [
        # 'demo/demo.xml',
    ],
    "qweb": [
        # "static/src/xml/{QWEBFILE1}.xml",
    ],

    "post_load": None,
    "pre_init_hook": 'pre_init_hook',
    "post_init_hook": 'post_init_hook',
    "uninstall_hook": None,

    "external_dependencies": {"python": [
        "midtransclient",
    ], "bin": []},
    # "live_test_url": "",
    # "demo_title": "{MODULE_NAME}",
    # "demo_addons": [
    # ],
    # "demo_addons_hidden": [
    # ],
    # "demo_url": "DEMO-URL",
    # "demo_summary": "{SHORT_DESCRIPTION_OF_THE_MODULE}",
    # "demo_images": [
    #    "images/MAIN_IMAGE",
    # ]
}
