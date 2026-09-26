--liquibase formatted sql
--changeset liquibase:new_store_store_groups runOnChange:true stripComments:false splitStatements:false context:MTP-30830 labels:MTP-30830
--comment: MTP-30830 fetch store groups based on retail facility code 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_store_groups(input refcursor, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_store_groups(input refcursor, jsonb, jsonb, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 calling_statement :
    select * from inventory_smart.new_store_store_groups('abc',
        '{"l0_name": [{"type": "list", "operator": "in", "values": ["101_BRIDAL"]}], "l1_name": [], "l2_name": []}', 
        '{"store_code":["D.2660"]}',
        1
        );
		COMMIT;
 */
DECLARE
    _query_combine text := '';
    _query_ph text := '';
    _query_sa text := '';
    _cache_payload jsonb := jsonb_build_object(
        'product_attributes', $2, 
        'store_attributes', $3, 
        'application_code', $4);
begin
	_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_sa := global.form_main_table_filters('store_attributes', $3);
   	-- raise notice '% query sa is ',_query_combine;
	_query_combine := '
	with ph_data as (
		select ph_code from inventory_smart.ph_master '||_query_ph||' 
	)
	,default_store_groups as (
		select unnest(default_store_groups) sg_code from inventory_smart.ph_configuration_mapping join
		ph_data using (ph_code)
		group by 1
	)
	,store_groups as (
		select name, sg_code from (
			select channel, sg_code, name, store_code from global.store_groups sg
			join global.store_groups_mapping using (sg_code) 
			join default_store_groups using (sg_code)
			where store_code in (select store_code from global.store_attributes_filter saf '||_query_sa||' ) and sg.application_code = ' || concat($4) ||' and sg.is_deleted = false 
		) x group by 1,2
	) 
	select * from store_groups;
	';

	raise notice '%',_query_combine;
    open $1 for execute _query_combine;
    RETURN $1;
END;
$function$
;

