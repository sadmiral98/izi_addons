// Element
$(`#${idElm}`).append(`
    <div class="button_container">
        <div class="izi_btn collapsed izi_recalculate_btn">
            <span class="material-icons izi_btn_icon_left">calculate</span> Recalculate
        </div>
        <div style="display:none;" class="izi_btn collapsed izi_refresh_btn">
            <span class="material-icons izi_btn_icon_left">refresh</span> Refresh
        </div>
        <div class="izi_btn collapsed izi_gsheet_btn">
            <span class="material-icons izi_btn_icon_left">table</span> Spreadsheet
        </div>
        <div class="izi_btn collapsed izi_process_btn">
            <span class="material-icons izi_btn_icon_left">update</span> Process
        </div>
    </div>
    <div class="grid_container"></div>
    <br/>
    <br/>
    <div class="button_container">
        <div class="izi_btn collapsed izi_save_btn">
            <span class="material-icons izi_btn_icon_left">check</span> Save
        </div>
    </div>
    <div class="grid_schedule_container"></div>
`);

// Main
// Sum & Average
var total_row = [
    '', 
    '', '', '', '', '',
    '', '', '', '', '',
    '',
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0,
];
table_data.forEach(function(row) {
    for (var i = 12; i <= 22; i++) {
        total_row[i] += row[i] || 0;
    }
})
table_data.unshift(total_row);
// if (table_data.length) {
//     var avg_row = [
//         '', 
//         '', '', '', '', '',
//         '', '', '', '', '',
//         '',
//         0, 0, 0, 0, 0,
//         0, 0, 0, 0, 0,
//         0,
//     ];
//     for (var i = 12; i <= 22; i++) {
//         avg_row[i] = total_row[i] / table_data.length;
//     }
//     table_data.unshift(avg_row);
// }

// columns = self.formatTableColumns(result);
columns = customFormatTableColumns(result);
var config = {
    columns: columns,
    data: table_data,
    sort: true,
    resizable: true,
    pagination: {
        limit: 40,
    },
    className: {
        td: 'custom-td',
        tr: 'custom-tr',
        th: 'custom-th',
        table: 'custom-table',
    },
    style: { 
        table: { 
            'white-space': 'nowrap'
        }
    },
    // search: true,
};
$(`#${idElm} .grid_container`).empty();
self.grid = new gridjs.Grid(config).render($(`#${idElm} .grid_container`).get(0));

// Generate Columns
var raw_data = result.data;
var schedule_columns = ['Product', 'Target Production'];
var formatted_schedule_columns = [
    {
        name: 'Product',
        formatter:  function (cell, row) {
            return gridjs.html(`
                <span style="text-wrap: wrap; min-width: 200px; display:block;">${cell}</span>
            `)
        }
    },
    {
        name: 'Target Production',
        formatter:  function (cell, row) {
            return gridjs.html(`
                <input type="number" class="custom-td-input total_tp" disabled="disabled" value="${parseFloat(cell)}"/>
            `)
        }
    }
];
var formatted_production_columns = [];
var qty_by_product_by_week = {};
var percentage_by_product_by_week = {};
var total_tp_by_product = {};
raw_data.forEach(function(dt) {
    var product = dt['Product'];
    var week = dt['Week'];
    
    if (!(product in qty_by_product_by_week)) {
        qty_by_product_by_week[product] = {};
    }
    qty_by_product_by_week[product][week] = `${parseInt(dt['STOCK'] + dt['FIN'])};${parseInt(dt['REQ'] + dt['OSR'])};${parseInt(dt['ATP'])}`;
    
    if (!(product in total_tp_by_product)) {
        total_tp_by_product[product] = 0;
    }
    total_tp_by_product[product] += parseFloat(dt['TP']);
    
    if (!(product in percentage_by_product_by_week)) {
        percentage_by_product_by_week[product] = {};
    }
    percentage_by_product_by_week[product][week] = parseInt(dt['Weekly Percentage'] || 0);
    
    if (!schedule_columns.includes(week)) {
        schedule_columns.push(week);
        // var week_column = customFormatScheduleColumn(week);
        var week_column = customInputPercentageColumn(week);
        formatted_schedule_columns.push(week_column);
    }
});

// Generate Data
var schedule_data = [];
for (var product in qty_by_product_by_week) {
    var row = [];
    schedule_columns.forEach(function(col) {
        if (col == 'Product') {
            row.push(product);
        } else if (col == 'Target Production') {
            row.push(total_tp_by_product[product]);
        } else {
            // row.push(qty_by_product_by_week[product][col]);
            row.push(percentage_by_product_by_week[product][col]);
        }
    });
    schedule_data.push(row);
}

// Generate Config
// Schedule Table
var schedule_config = {
    columns: formatted_schedule_columns,
    data: schedule_data,
    sort: true,
    resizable: true,
    pagination: {
        limit: 40,
    },
    className: {
        td: 'custom-td',
        tr: 'custom-tr',
        th: 'custom-th',
        table: 'custom-table',
    },
    style: { 
        table: { 
            'white-space': 'nowrap'
        }
    },
    // search: true,
};
$(`#${idElm} .grid_schedule_container`).empty();
self.grid_schedule = new gridjs.Grid(schedule_config).render($(`#${idElm} .grid_schedule_container`).get(0));

// Event Listener
$(`#${idElm}`).off('click', '.izi_process_btn');
$(`#${idElm}`).on('click', '.izi_process_btn', function() {
   processProcurement(); 
});

$(`#${idElm}`).off('click', '.izi_recalculate_btn');
$(`#${idElm}`).on('click', '.izi_recalculate_btn', function() {
   recalculatePlan(); 
});

$(`#${idElm}`).off('click', '.izi_refresh_btn');
$(`#${idElm}`).on('click', '.izi_refresh_btn', function() {
   refreshPlan(); 
});

$(`#${idElm}`).off('click', '.production_link');
$(`#${idElm}`).on('click', '.production_link', function(ev) {
    var productionId = parseInt($(ev.currentTarget).attr('data-id'));
    openProduction(productionId);
});

$(`#${idElm}`).off('click', '.sales_link');
$(`#${idElm}`).on('click', '.sales_link', function(ev) {
    var salesId = parseInt($(ev.currentTarget).attr('data-id'));
    openSales(salesId);
});

$(`#${idElm}`).off('click', '.izi_gsheet_btn');
$(`#${idElm}`).on('click', '.izi_gsheet_btn', function(ev) {
    var url = 'https://docs.google.com/spreadsheets/d/1O1oY52UitXLaFtwkF65X6Guq6zLUl_2snny2MwoPwaY';
    window.open(url, "_blank");
});

$(`#${idElm}`).off('change', '.percentage_input');
$(`#${idElm}`).on('change', '.percentage_input', function(ev) {
    var total_elm = $(ev.currentTarget).closest('tr').find('.total_tp');
    if (total_elm && total_elm.length) {
        var total_tp = parseFloat($(total_elm[0]).val());
        var weekly_percentage = parseFloat($(ev.currentTarget).val());
        var weekly_tp = Math.ceil(total_tp * weekly_percentage / 100);
        var weekly_elm = $(ev.currentTarget).closest('div.weekly_input').find('.value_input');
        $(weekly_elm).val(weekly_tp);
    }
});

// Functions
function initialData() {
    alert('Initial');
}

function recalculatePlan() {
    // console.log(result);
    new swal({
        title: "Confirm Recalculation",
        text: `
            Do you want to recalculate the Production Plan? It will take a few minutes to complete.
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: 'Yes',
        heightAuto : false,
    }).then((res) => {
        if (res.isConfirmed && result.data) {
            self._rpc({
                model: 'ir.actions.server',
                method: 'run_by_name',
                args: [[], ['Scheduler Weekly Production Plan']],
                context: {
                    run_params: {
                    },
                },
            }).then(function (results) {
                var args = {}
                if (self.filters) {
                    args.filters = self.filters;
                    args.mode = self.mode;
                }
                self._renderVisual(args);
            });
        }
    });
}

function refreshPlan() {
    self._rpc({
        model: 'ir.actions.server',
        method: 'run_by_name',
        args: [[], ['Scheduler Weekly Production Plan']],
        context: {
            run_params: {
                'action': 'refresh',
            },
        },
    }).then(function (results) {
        var args = {}
        if (self.filters) {
            args.filters = self.filters;
            args.mode = self.mode;
        }
        self._renderVisual(args);
    });
}

function processProcurement() {
    var data = result.data;
    var order_line_by_partner_id = {};
    var order_line_confirmation_msg_array = [];
    data.forEach(function(item) {
        if (item.ATP > 0 && item['Actionable Produce']) {
            var product_id = item['Product Id'];
            var partner_id = item['Supplier Id'];
            // console.log(item);
            if (partner_id) {
                if (!(partner_id in order_line_by_partner_id)) {
                    order_line_by_partner_id[partner_id] = [];
                }
                var qty = Math.ceil(item['ATP'] - item['PRO']);
                if (product_id && partner_id && qty && qty > 0) {
                    var line_value = [0, 0, {
                        'product_id': product_id,
                        'product_qty': qty,
                        'estimation_price_unit': item['Vendor Price'] || 0,
                    }];
                    order_line_by_partner_id[partner_id].push(line_value);
                    order_line_confirmation_msg_array.push(`${item.Product} (${qty})`);
                }
            }
        }
    });
    var order_line_confirmation_msg = order_line_confirmation_msg_array.join(", ");
    // console.log(order_line_confirmation_msg, order_line_confirmation_msg_array);
    // console.log(result);
    new swal({
        title: "Confirm",
        text: `
            Do you confirm to process the Purchase Request / Manufacturing Order for these products? \n
            ${order_line_confirmation_msg}
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: 'Yes',
        heightAuto : false,
    }).then((res) => {
        if (res.isConfirmed && result.data) {
            
            for (const partner_id in order_line_by_partner_id) {
                // console.log(`${partner_id}: ${order_line_by_partner_id[partner_id]}`);
                var values = {
                    // 'partner_id': parseInt(partner_id),
                    'line_ids': order_line_by_partner_id[partner_id],
                }
                // console.log(values);
                self._rpc({
                    model: 'purchase.request',
                    method: 'create',
                    args: [values],
                }).then(function (response) {
                    console.log('Response PO', response);
                    refreshPlan();
                });
            }
        }
    });
}

function indexFields(label) {
    return result.fields.indexOf(label);
}

function openProduction(productionId) {
    console.log('Production', productionId);
    self.do_action({
        type: 'ir.actions.act_window',
        name: 'Purchase',
        res_model: 'purchase.order',
        res_id: productionId,
        views: [[false, "form"]],
        target: 'new',
        context: {},
    });
}

function openSales(salesId) {
    console.log('Sales', salesId);
    self.do_action({
        type: 'ir.actions.act_window',
        name: 'Sales',
        res_model: 'sale.order',
        res_id: salesId,
        views: [[false, "form"]],
        target: 'new',
        context: {},
    });
}

// Columns
function customFormatTableColumns(result) {
    var columns = [];
    var prefix_by_field = result.prefix_by_field;
    var suffix_by_field = result.suffix_by_field;
    var decimal_places_by_field = result.decimal_places_by_field;
    var is_metric_by_field = result.is_metric_by_field;
    var locale_code_by_field = result.locale_code_by_field;
    if (result && result.fields) {
        result.fields.forEach(function (field) {
            if (field in is_metric_by_field) {
                var prefix = '';
                var suffix = '';
                var decimal_places = 0;
                var locale_code = 'en-US';
                if (field in prefix_by_field) {
                    prefix = prefix_by_field[field] + ' ';
                }
                if (field in suffix_by_field) {
                    suffix = ' ' + suffix_by_field[field];
                }
                if (field in decimal_places_by_field) {
                    decimal_places = decimal_places_by_field[field];
                }
                if (field in locale_code_by_field) {
                    locale_code = locale_code_by_field[field];
                }
                var column = {
                    name: field,
                    metric: true,
                    formatter: (cell) => gridjs.html(`
                        <span style="text-align:right;" class="custom-td-content">
                            ${prefix}
                            ${parseFloat(cell).toLocaleString(locale_code, 
                                {minimumFractionDigits: decimal_places, maximumFractionDigits: decimal_places})}
                            ${suffix}
                        </span>
                    `)
                };
                // Custom
                if (field == 'To Produce' || field == 'Weekly Percentage' || field == 'Vendor Price' || field == 'MIN' || field == 'MAX') {
                    column = {
                        name: 'Hidden',
                        hidden: true,
                    };
                }
                columns.push(column);
            } else {
                // Custom
                if (field == 'Supplier Id' || field == 'Product Id' || field == 'Actionable Produce') {
                    column = {
                        name: 'Hidden',
                        hidden: true,
                    };
                    columns.push(column);
                } else if (field == 'Material Check') {
                    column = {
                        name: 'Material Check',
                        formatter: function (cell, row) {
                            if (!cell) {
                                return gridjs.html(`
                                `)
                            }
                            // console.log(cell.split('\n'));
                            var cell_rows = cell.split('\n');
                            var cell_table_html = '';
                            cell_rows.forEach((cell_row, index) => {
                                var cell_row_html = '';
                                var cell_datas = cell_row.split(';');
                                cell_datas.forEach((cell_data, index) => {
                                    if (index === 0) {
                                        cell_row_html += `
                                            <td style="width:50%; min-width: 100px; text-wrap: wrap; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: left;">
                                                ${cell_data}
                                            </td>`;
                                    } else {
                                        cell_row_html += `
                                            <td style="width:25%; text-wrap: wrap; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: right;">
                                                ${parseFloat(cell_data).toLocaleString('en-EN')}
                                            </td>`;
                                    }
                                });
                                if (cell_row_html !== '')
                                    cell_row_html = `<tr>${cell_row_html}</tr>`;
                                cell_table_html += cell_row_html;
                            });
                            if (cell_table_html !== '')
                                cell_table_html = `<table style="width:100%;">${cell_table_html}</table>`;
                            // console.log(cell);
                            return gridjs.html(`
                                ${cell_table_html}
                            `)
                        }
                    };
                    columns.push(column);
                } else if (field == 'Reference') {
                    column = {
                        name: 'Reference',
                        formatter: function (cell, row) {
                            if (!cell) {
                                return gridjs.html(`
                                `)
                            }
                            var cell_rows = cell.split('\n');
                            var cell_table_html = '';
                            cell_rows.forEach((cell_row, index) => {
                                var cell_row_html = '';
                                var cell_datas = cell_row.split(';');
                                cell_datas.forEach((cell_data, index) => {
                                    if (index === 1) {
                                        cell_row_html += `
                                            <td style="width:75%; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: left;">
                                                ${cell_data}
                                            </td>`;
                                    } else if (index > 1) {
                                        cell_row_html += `
                                            <td style="width:25%; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: right;">
                                                ${parseFloat(cell_data).toLocaleString('en-EN')}
                                            </td>`;
                                    }
                                });
                                if (cell_row_html !== '') {
                                    var production_id = 0;
                                    if (cell_datas)
                                        production_id = cell_datas[0]
                                    cell_row_html = `<tr class="production_link" data-id="${production_id}">${cell_row_html}</tr>`;
                                }
                                cell_table_html += cell_row_html;
                            });
                            if (cell_table_html !== '')
                                cell_table_html = `<table style="width:100%;">${cell_table_html}</table>`;
                            return gridjs.html(`
                                ${cell_table_html}
                            `)
                        }
                    };
                    columns.push(column);
                } else if (field == 'Sales Info') {
                    column = {
                        name: 'Sales Info',
                        formatter: function (cell, row) {
                            if (!cell) {
                                return gridjs.html(`
                                `)
                            }
                            var cell_rows = cell.split('\n');
                            var cell_table_html = '';
                            cell_rows.forEach((cell_row, index) => {
                                var cell_row_html = '';
                                var cell_datas = cell_row.split(';');
                                cell_datas.forEach((cell_data, index) => {
                                    if (index === 1) {
                                        cell_row_html += `
                                            <td style="width:75%; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: left;">
                                                ${cell_data}
                                            </td>`;
                                    } else if (index > 1) {
                                        cell_row_html += `
                                            <td style="width:25%; font-size: 10px; border:1px solid #CCC;padding: 2px 4px;text-align: right;">
                                                ${parseFloat(cell_data).toLocaleString('en-EN')}
                                            </td>`;
                                    }
                                });
                                if (cell_row_html !== '') {
                                    var sales_id = 0;
                                    if (cell_datas)
                                        sales_id = cell_datas[0]
                                    cell_row_html = `<tr class="sales_link" data-id="${sales_id}">${cell_row_html}</tr>`;
                                }
                                cell_table_html += cell_row_html;
                            });
                            if (cell_table_html !== '')
                                cell_table_html = `<table style="width:100%;">${cell_table_html}</table>`;
                            return gridjs.html(`
                                ${cell_table_html}
                            `)
                        }
                    };
                    columns.push(column);
                } else if (field == 'Production Info') {
                    column = {
                        name: 'Production Info',
                        formatter:  function (cell, row) {
                            return gridjs.html(`
                                <pre>${cell}</pre>
                            `)
                        }
                    };
                    columns.push(column);
                } else if (field == 'Product') {
                    column = {
                        name: 'Product',
                        formatter:  function (cell, row) {
                            return gridjs.html(`
                                <span style="text-wrap: wrap; min-width: 250px; display:block;">${cell}</span>
                            `)
                        }
                    };
                    columns.push(column);
                } else {
                    columns.push(field);
                }
            }
        });
    }
    return columns;
}

function customFormatScheduleColumn(week) {
    var column = {
        name: week,
        formatter: function (cell, row) {
            if (!cell) {
                return gridjs.html(`
                `)
            }
            // console.log(cell.split('\n'));
            var cell_rows = cell.split('\n');
            var cell_table_html = '';
            cell_rows.forEach((cell_row, index) => {
                var cell_row_html = '';
                var cell_datas = cell_row.split(';');
                cell_datas.forEach((cell_data, index) => {
                    cell_row_html += `
                        <td style="width:33%; min-width: 50px; text-wrap: wrap; font-size: 13px; border:1px solid #CCC;padding: 4px 8px;text-align: right;">
                            ${parseFloat(cell_data).toLocaleString('en-EN')}
                        </td>`;
                });
                if (cell_row_html !== '')
                    cell_row_html = `<tr>${cell_row_html}</tr>`;
                cell_table_html += cell_row_html;
            });
            if (cell_table_html !== '')
                cell_table_html = `<table style="width:100%;">${cell_table_html}</table>`;
            // console.log(cell);
            return gridjs.html(`
                ${cell_table_html}
            `)
        }
    };
    return column;
}

function customInputPercentageColumn(week) {
    var column = {
        name: week,
        formatter: function (cell, row) {
            return gridjs.html(`
                <div class="weekly_input" style="display: flex;">
                    <div class="percent">
                        <input type="number" class="custom-td-input percentage_input" value="${parseFloat(cell)}"/>
                    </div>
                    <div>
                        <input type="number" class="custom-td-input value_input" disabled="disabled" value="${Math.ceil(parseFloat(cell) * parseFloat(row.cells[1].data) / 100)}"/>
                    </div>
                </div>
            `)
        }
    };
    return column;
}

// Styling
$(`#${idElm}`).append(`
    <style>
        #${idElm} {
            flex-direction: column;
        }
        #${idElm} .button_container {
            margin: 20px;
            margin-bottom: 0px;
            margin-top: 10px;
            display: flex;
            flex-direction: row;
        }
        #${idElm} .button_container .izi_btn{
            font-size: 13px;
            border-radius: 6px;
            border: 1px solid #EEE;
            background: #FAFAFA;
            padding: 6px 16px;
            color: #666;
            font-weight: 500;
            margin: 0px;
            margin-right: 4px;
            outline: none;
        }
        #${idElm} .gridjs-container {
            padding-right: 20px;
        }
        #${idElm} .gridjs-container th.gridjs-th.custom-th {
            padding: 5px;
            min-width: 70px;
            font-size: 14px;
            max-width: 250px;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td {
            background: transparent;
            padding: 2px 4px;
            border-color: white;
            font-size: 14px;
            vertical-align: top;
            max-width: 250px;
            overflow: hidden;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .green-td {
            background: greenyellow;
            opacity: 1;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .yellow-td {
            background: yellow;
            opacity: 1;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .red-td {
            background: red;
            color: white;
            opacity: 1;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .custom-td-content {
            padding: 8px;
            display: block;
        }
        #${idElm} .gridjs-container tr.gridjs-tr.custom-tr:nth-child(even) {
            background: #F4F4F4;
        }
        #${idElm} .gridjs-container tr.gridjs-tr.custom-tr:hover {
            background: #EEE;
            cursor: pointer;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .material-icons-outlined {
            padding: 8px 4px;
            margin: 2px;
            flex: 1;
            text-align: center;
            border-radius: 6px;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .material-icons-outlined:hover {
            background: #DDD;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .custom-td-input {
            width: 100px;
            margin: 4px auto;
            padding: 4px;
            border: 1px solid #DDD;
            border-radius: 4px;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .custom-td-input.bold-input {
            font-weight: bold;
            border: 2px solid #875A7B;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .green-tag,
        #${idElm} .gridjs-container td.gridjs-td.custom-td .red-tag {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            padding: 4px;
            margin: 4px auto;
            background: greenyellow;
            color: black;
            border-radius: 4px;
            display: block;
            width: 60px;
            text-align: center;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .red-tag {
            background: red;
            color: white;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .bold-td,
        #${idElm} .gridjs-container td.gridjs-td.custom-td .bold-sm-td {
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
        }
        #${idElm} .gridjs-container td.gridjs-td.custom-td .bold-sm-td {
            font-size: 10px;
            padding: 10px;
        }
        #${idElm} div.percent {
          display: inline-block;
          position: relative;
        }
        #${idElm} div.percent::after {
          position: absolute;
          top: 8px;
          right: .5em;
          transition: all .05s ease-in-out;
        }
        #${idElm} div.percent:hover::after,
        #${idElm} div.percent:focus-within::after {
          right: 1.5em;
        }
        @supports (-moz-appearance:none) {
          #${idElm} div::after {
            right: 1.5em;
          }
        }
        #${idElm} .percent::after {
          content: '%';
        }
    <style>
`);

// For Total
$(`#${idElm}`).append(`
    <style>
        #${idElm} .grid_container .gridjs-container tr.gridjs-tr.custom-tr:first-of-type {
            font-weight: bold;
        }
    <style>
`);
