odoo.define('izi_payment_midtrans.payment_processing', function (require) {
  'use strict';

  // noinspection NpmUsedModulesInstalled
  let publicWidget = require('web.public.widget');

  publicWidget.registry.PaymentProcessing.include({
    xmlDependencies: [
      '/payment/static/src/xml/payment_processing.xml',
      '/izi_payment_midtrans/static/src/xml/payment_processing.xml'
    ],
  })
});