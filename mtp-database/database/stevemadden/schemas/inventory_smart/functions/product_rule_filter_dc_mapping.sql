--liquibase formatted sql
--changeset mithun.rangaswamy@impactanalytics.co:product_rule_filter_dc_mapping stripComments:false splitStatements:false runOnChange:true context:Second Release labels:MTP-36126 
--comment: MTP-36126

 /* YOUR REPLACEABLE OBJECT SQL */

 --rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1;
DROP FUNCTION IF EXISTS inventory_smart.product_rule_filter_dc_mapping(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_filter_dc_mapping(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text := '';
    _query_ph text := '';
    _query_sa text := '';
   _query_l0_name text := '';
   _query_table_filters text := '';
begin
	select $2->>'l0_name' into _query_l0_name;
	_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);
	-- raise notice 'l0 query%',_query_l0_name; 
    _query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
    _query_sa := global.form_main_table_filters('store_attributes', $3 - 'is_deleted');
    _query_table_filters := global.form_table_query($4);
    _query_combine := '
        with product_store_mapping as (  
			select x.dc_code, dc.name from (
				select distinct pmpd.dc_code from 				
						(select l0_name, unnest(product_codes) product_code from inventory_smart.ph_master ) ph					
				join    "global".product_mapping_product_dc pmpd on pmpd.product_code = ph.product_code
				) x
				join "global".distribution_centres dc using (dc_code)
				JOIN "global".store_attributes_filter saf ON saf.dc_code = dc.dc_code  ' || _query_sa || '
			
		)			
		select * from product_store_mapping' ||_query_table_filters;
	raise notice 'query sa -->% %',_query_sa, $3;
     raise notice 'query combineeeeee->%',_query_combine;
    open $1 for execute _query_combine;
    RETURN $1;
END;
$function$
;
