--liquibase formatted sql
--changeset osho.sharma:product_port_of_call_mapping_list_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-126961
--comment: list product port of call eligibility rows — filters via product_master/product_attributes, data from denormalized table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_port_of_call_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.product_port_of_call_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm text := '';
    _query_pa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _final_query text := '';
BEGIN
    _query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
    _query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
    _query_table_filters := "global".form_table_query($4);

    _query_combine := '
        SELECT *
        FROM (
            SELECT
                ppta.product_code,
                ppta.store_code,
                sm.store_name,
                ppta.port_code,
                ppta.l1_name,
                ppta.l2_name,
                ppta.l3_name,
                ppta.is_eligible,
                ppta.validity,
                ppta.updated_by,
                ppta.updated_at
            FROM global.product_port_of_call_time_attributes ppta
            JOIN global.store_master sm
                ON ppta.store_code = sm.store_code
            JOIN (' || _query_pm || ') pm
                ON ppta.product_code = pm.product_code
            JOIN (' || _query_pa || ') pa
                ON ppta.product_code = pa.product_code
        ) X ' || _query_table_filters;

    IF $5 IS true THEN
        _final_query := 'select count(*) from (' || _query_combine || ') temp';
    ELSE
        _final_query := _query_combine;
    END IF;

    OPEN $1 FOR EXECUTE _final_query;
    RETURN _final_query;
END
$function$;
