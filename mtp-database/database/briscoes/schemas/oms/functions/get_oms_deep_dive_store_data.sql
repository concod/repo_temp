--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:oms_vendor_store_deep_dive_base runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:MTP-134278
--comment: MTP-134278 - Initial commit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_deep_dive_store_data(jsonb, text, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_deep_dive_store_data(
    product_filter jsonb, 
    end_date text, 
    store_filter jsonb DEFAULT '{}'::jsonb,
    debug boolean DEFAULT false
)
RETURNS TABLE(
    product_code character varying,
    dc_id character varying,
    channel character varying,
    fiscal_year_week bigint,
    month character varying,
    week date,
    total_stores_count integer,
    predicted_qty double precision,
    total_store_forecast real,
    ly_sales double precision,
    ly_oh double precision,
    store_inv double precision,
    safety_stock double precision,
    eff_lead_time integer,
    receipt1 bigint,
    approved_receipt real,
    lost_sales double precision,
    inventory_deficit bigint,
    total_mins bigint,
    week_end_date date
)
LANGUAGE plpgsql
AS $function$
DECLARE
    where_paf_condition TEXT := '';
    where_saf_condition TEXT := '';
    transform_query TEXT := '';
BEGIN
    where_paf_condition := inventory_smart.form_main_table_filters('ph_master', product_filter);
    where_saf_condition := inventory_smart.form_main_table_filters('ph_master', store_filter);
   
    IF where_saf_condition IS NULL OR where_saf_condition = '' THEN
        where_saf_condition := 'WHERE 1=1';
    END IF;
   
    IF debug THEN
        RAISE NOTICE 'Where PAF Condition: %', where_paf_condition;
        RAISE NOTICE 'Where SAF Condition: %', where_saf_condition;
    END IF;

    transform_query := '
    WITH filtered_store_data AS (
        SELECT store_code
        FROM global.store_attributes_filter 
        ' || where_saf_condition || '
        AND active = True AND special_classification = ''STORE''
    ),
    ss AS (
        SELECT DISTINCT oor.product_code::varchar, oor.vendor_code::varchar, oor.store_code::varchar
        FROM inventory_smart.oms_orders_recommended_store oor
        INNER JOIN filtered_store_data ON oor.store_code = filtered_store_data.store_code
        ' || where_paf_condition || '
    ),
 fdm AS (
        SELECT DISTINCT fiscal_week_end_date, fiscal_year_week 
        FROM global.fiscal_date_mapping
		WHERE fiscal_year_week < ''' || end_date || '''
    )
    SELECT 
        x.product_code,
        x.store_code as dc_id,
        x.channel,
        x.fiscal_year_week,
        x.month,
        x.week,
        x.total_stores_count,
        x.predicted_qty, 
        x.total_store_forecast,
        x.ly_sales,
        x.ly_oh,
        x.store_inv, 
        x.safety_stock,
        x.eff_lead_time,
        x.receipt1, 
        x.approved_receipt,
        x.lost_sales,
        x.inventory_deficit,
        x.total_mins,
		fdm.fiscal_week_end_date AS week_end_date
    FROM inventory_smart.oms_deep_dive_base_store x 
    JOIN ss USING(product_code, vendor_code, store_code)
    JOIN fdm ON x.fiscal_year_week = fdm.fiscal_year_week';

    IF debug THEN
        RAISE NOTICE 'Transform Query: %', transform_query;
    END IF;

    RETURN QUERY EXECUTE transform_query;
END;
$function$;