odoo.define('izi_payment_midtrans.midtrans', function (require) {

  // noinspection NpmUsedModulesInstalled
  const core = require('web.core');
  const _t = core._t;
  // noinspection NpmUsedModulesInstalled
  const ajax = require('web.ajax');
  let msg;

  function validatePayment(result) {
    msg = _t("Please wait while we are confirming your payment...");
    $.blockUI({
      'message': '<h2 class="text-white"><img src="/web/static/src/img/spin.png" class="fa-pulse" alt="loading"/>' +
        '    <br />' + msg +
        '</h2>'
    });
    let param = $.param({
      order_id: result.order_id,
      status_code: result.status_code,
      transaction_status: result.transaction_status
    });
    window.location.href = '/payment/midtrans/validate?' + param;
  }

  function processPayment() {
    console.log("Halo");
    const $payment_form = $('form[provider="midtrans"]');
    $.blockUI({'css': {color: '#fff'}});
    let action_url = '/payment/midtrans/token';
    let param = _.object(_.map($payment_form.serializeArray(), _.values));

    ajax.jsonRpc(action_url, 'call', param).then(function (data) {
      if (data.hasOwnProperty('error_messages')) {
        alert(data.error_messages);
        msg = _t("Something went wrong, please refresh this page and try again. If you still facing the problem please contact us!");
        $.blockUI({
          'message': '<h2 class="text-white">' + msg + '</h2>'
        });
      } else {
        // noinspection JSUnresolvedVariable
        if (data.snap_mode === 'redirect') {
          if ($.blockUI) {
            msg = _t("Just one more second, we are redirecting you to payment page...");
            $.blockUI({
              'message': '<h2 class="text-white"><img src="/web/static/src/img/spin.png" class="fa-pulse" alt="loading"/>' +
                '    <br />' + msg +
                '</h2>'
            });
          }
          window.location.href = data.redirect_url
        } else { // noinspection JSUnresolvedVariable
          if (data.snap_mode === 'pop-up') {
            // noinspection JSUnresolvedVariable
            snap.pay(data.token, {
              onSuccess: function (result) {
                validatePayment(result);
              },
              onPending: function (result) {
                validatePayment(result);
              },
              onError: function (result) {
                validatePayment(result);
              },
              onClose: function () {
                msg = _t("Oops, you just close the payment pop-up, this page will be refreshed...");
                $.blockUI({
                  'message': '<h2 class="text-white">' + '<br />' + msg + '</h2>'
                });
                location.reload();
              }
            })
          }
        }
      }
    }).catch(function (data) {
      alert(data.message);
      console.debug(data);
    });
  }

  return processPayment;
});