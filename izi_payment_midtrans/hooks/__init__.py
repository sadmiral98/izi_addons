# -*- coding: utf-8 -*-
import pkg_resources
from odoo import api, SUPERUSER_ID
from odoo.exceptions import Warning


def pre_init_hook(cr):
    env = api.Environment(cr, SUPERUSER_ID, {})
    # noinspection PyTypeChecker
    # py_modules = dict(tuple(str(ws).split()) for ws in pkg_resources.working_set)
    # if py_modules['midtransclient'] != '1.1.1':
    #     raise Warning("The midtrans client python library version should be 'midtransclient==1.1.1'.")

    company = env.user.company_id
    if not company.chart_template_id:
        raise Warning("To generate journal for this payment acquirer automatically, please make sure to setup Fiscal "
                      "Localization on Invoicing/Accounting Settings before installing this module!")
    return True


# noinspection PyProtectedMember
def post_init_hook(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    module_obj = env['ir.module.module']
    acquirer_obj = env['payment.acquirer']
    journal_obj = env['account.journal']

    acquirer_modules = module_obj.search([('name', 'like', 'izi_payment_%'), ('state', 'in', ['to install'])])
    acquirer_names = [a.name.split('_')[-1] for a in acquirer_modules]

    company = env.user.company_id
    acquirers = acquirer_obj.search(
        [('provider', 'in', acquirer_names), ('journal_id', '=', False), ('company_id', '=', company.id)])

    for acquirer in acquirers.filtered(lambda l: not l.journal_id and l.company_id.chart_template_id):
        acquirer.journal_id = journal_obj.create(acquirer._prepare_account_journal_vals())
    return True
