-- Top Customer
-- Highest Value, Highest Frequency
SELECT
    year,
    quarter,
    partner_id,
    customer,
    last_date_order,
    total_order,
    total_value,
    total_discount,
    total_items,
    average_interval,
    average_order_value,
    average_price_unit,
    average_order_items,
    lowest_interval,
    highest_interval,
    lowest_value,
    highest_value,
    all_values,
    all_intervals,
    all_frequency,
    gradient_values,
    gradient_frequency,
    rmse_values,
    rmse_frequency,
    r2_values,
    r2_frequency
FROM izi_customer_behavior
ORDER BY total_value DESC, total_order DESC
LIMIT 100;
