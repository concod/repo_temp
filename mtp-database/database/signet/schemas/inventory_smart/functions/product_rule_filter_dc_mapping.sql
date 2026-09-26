--liquibase formatted sql
--changeset harshit.bole@impactanalytics.co:product_rule_filter_dc_mapping stripComments:false splitStatements:false runOnChange:true context:third Release labels:JIRA_NO 
--comment Add comment describing your change

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
    _query_sa := global.form_main_table_filters('store_attributes', $3);
    _query_table_filters := global.form_table_query($4);
    _query_combine := '
		with product_store_mapping as (  
		select x.dc_code, dc.name from (
			select distinct pmpd.dc_code from 				
				(select article product_code from inventory_smart.ph_master ' || _query_ph || ') ph					
				join "global".product_mapping_product_dc pmpd on pmpd.product_code = ph.product_code
				) x
			join "global".distribution_centres dc using (dc_code)
		)			
		select * from product_store_mapping' ;
     raise notice '%',_query_combine;
    open $1 for execute _query_combine;
    RETURN $1;
END;
$function$
;
