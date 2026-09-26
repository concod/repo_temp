--liquibase formatted sql
--changeset liquibase:store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_list(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_list(
        input refcursor, 
        product_attribute_query jsonb,
        store_attribute_query jsonb, 
        application_code integer,
        client_columns text,
        meta_query jsonb,
        product_rule_attribute_query jsonb
)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _product_rule_query text := '';
    _query_sa text := '';
    data_query text := '';
    _query_table_filters text := '';
    temp_refcursor refcursor := '';
BEGIN
	temp_refcursor := 'cursor_' || to_char(current_timestamp, 'YYYYMMDDHH24MISSUS');
    _product_rule_query := inventory_smart.product_rule(temp_refcursor, 
                                                        product_attribute_query, 
                                                        store_attribute_query, 
                                                        application_code, 
                                                        client_columns, 
                                                        meta_query, 
                                                        product_rule_attribute_query);
    _query_sa := global.form_main_table_filters('store_attributes_query', $3);
    _query_table_filters := global.form_table_query(meta_query);
    data_query := FORMAT('
        with ph_base as (
            select bs.*, unnest(product_codes) as product_code from (
                %s -- _product_rule_query
            ) bs
        ),
        product_store as (
            select ph.*, pmps.store_code, saf.store_name,saf.retail_facility_code from ph_base ph
            inner join "global".product_mapping_product_store pmps using (product_code) 
            inner join "global".store_attributes_filter saf 
            using(store_code, channel)
            %s -- store filter
            AND saf.active
        ),
        filtered_data as (
            select * from product_store
            %s -- meta filter
        )
        select store_code, store_name,retail_facility_code from filtered_data
        GROUP BY store_code, store_name,retail_facility_code
    ', _product_rule_query, _query_sa,  _query_table_filters);
		
    raise notice 'Query: %', data_query;
    OPEN $1 FOR EXECUTE data_query;
    RETURN data_query;
END;
$function$
;