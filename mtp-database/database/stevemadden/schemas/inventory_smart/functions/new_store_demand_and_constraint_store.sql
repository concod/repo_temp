--liquibase formatted sql
--changeset liquibase:new_store_demand_and_constraint_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0_4,MTP-34907 changed select statement labels:liquibase_project_start
--comment: changed join condition with channel and changed select condition to fix a bug MTP-34907
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_demand_and_constraint_store(input refcursor, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_demand_and_constraint_store(input refcursor, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
 	declare
 		_query_combine text;
 		_query_table_filters text;
 		_client_columns text;
 		_query_l0_name text := '';
 	begin 	

		if length ($3)> 0 then
 			_client_columns := ','||$3;
 		else 
 			_client_columns := '';
 		end if;

 		_query_combine := '
		with new_store_data as (
			select
			mapping_code,
			original_reserved as demand_estimated, 
			forecast_estimated, 
			nsr.sister_store_code store_code, 
			nsr.product_code,
			l0_name, 
			l1_name, 
			l2_name,
			l3_name,
			l4_name,
 			nsr.size, 
			nsr.article, 
			store_name, 
			nsr.channel,
			nsr.wos, 
			nsr.min_stock,
			nsr.max_stock,
  			cm.aps
			' || _client_columns || '
			from "global".new_store_reserve nsr
			join "global".product_attributes_filter paf using (product_code) 
			join "global".store_attributes_filter saf using (store_code) 
			join inventory_smart.constraint_master cm using (mapping_code, l0_name)
			where nsr.store_code = ''' || $2 ||'''
		)
 		select * from new_store_data';
 			raise notice '%', _query_combine;
 			open $1 for execute _query_combine;
 			RETURN $1;
 		end
 	$function$
;
