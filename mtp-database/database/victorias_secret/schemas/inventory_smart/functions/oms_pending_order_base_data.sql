--liquibase formatted sql
--changeset liquibase:oms_pending_order_base_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_pending_order_base_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_pending_order_base_data(week_qc_time boolean);
CREATE OR REPLACE FUNCTION inventory_smart.oms_pending_order_base_data(week_qc_time boolean DEFAULT false)
 RETURNS TABLE(product_code character varying, dc_id character varying, channel character varying, vendor_code character varying, not_before_date date, pending_fw_nb integer, pending_fw_rd integer, order_quantity integer)
 LANGUAGE plpgsql
AS $function$
declare 
    query_part_1 text;
    query_elt text;
    query_part_2 text;
    final_query text;
begin
    query_part_1 := 'SELECT
    oor.product_code,
    oor.loc_code AS dc_id,
    channel,
    oor.vendor_code,
    oor.editable_expected_receipt_date AS not_before_date,
    fdm1.fiscal_year_week AS pending_fw_nb,
    fdm2.fiscal_year_week AS pending_fw_rd,
    order_quantity
FROM
    (
WITH
ct1 AS(
    SELECT
        product_code ,
        loc_code,
        channel,
        vendor_code,
        order_quantity,
        editable_expected_receipt_date,
        fdm.fiscal_year_week AS editable_nbd_week,
        order_gen_type,
        order_status_id
    FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
global.fiscal_date_mapping fdm ON
        oor.editable_expected_receipt_date = fdm.calendar_date)';
    if week_qc_time then
        query_elt := ',ct2 AS (
    SELECT
        *
    FROM
        inventory_smart.oms_qc_days)
    SELECT
        ct1.*,
        ct2.qc_days,
        (ct1.editable_expected_receipt_date + ct2.qc_days) AS elt_date_dynamic
    FROM
        ct1
    LEFT JOIN ct2 
ON
        ct1.product_code = ct2.product_code
        AND ct1.vendor_code = ct2.vendor_code
        AND ct1.loc_code = ct2.dc_id
        AND ct1.editable_nbd_week = ct2.vlt_week) oor';
    else
        query_elt := 'select
            ct1.*,
            (ct1.editable_expected_receipt_date) as elt_date_dynamic
        from
            ct1
            ) oor';
    end if;
    query_part_2 := '
LEFT JOIN global.fiscal_date_mapping fdm1 ON
    oor.editable_expected_receipt_date = fdm1.calendar_date
LEFT JOIN global.fiscal_date_mapping fdm2 ON
    oor.elt_date_dynamic = fdm2.calendar_date
WHERE
    order_status_id IN (-1, 1, 2)';
    final_query := query_part_1 || query_elt || query_part_2;
    RAISE NOTICE 'Executing query: %', final_query;
    return query execute final_query;
end;
$function$
;

