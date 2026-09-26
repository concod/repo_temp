--liquibase formatted sql
--changeset liquibase:sync_aggregation_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_aggregation_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_aggregation_mapping();
CREATE OR REPLACE PROCEDURE public.sync_aggregation_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_aggregation_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	_query text;
 	_agg_level_db text;
 	_drop_query text;
 	_alter_query_1 text;
 	_alter_query_2 text;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	
	 	_drop_query  := 'delete from global.aggregation_mapping';
	 	_agg_level_db := global.fetch_aggregation_level();
	 	if _agg_level_db is not null and _agg_level_db <> 'product_code'
	 	then
		 	_query:= 'with article_product_map as (
							select '
								|| _agg_level_db ||
								' ,max(product_code) as product_code
							from
								global.product_attributes_filter paf
							where
								paf.is_deleted is false
							group by '
								|| _agg_level_db ||
							
							')
							Insert into global.aggregation_mapping (aggregation_code, store_code, dc_code, fc_code, is_active, validity, mapping_type)
							select '
								|| _agg_level_db ||
								' ,store_code,
								dc_code,
								fc_code,
								is_active,
								validity,
								case
									when (mapping_type = ''product_dc'') then ''aggregation_dc''
									when (mapping_type = ''product_fc'') then ''aggregation_fc''
								end as mapping_type
								
							from
								article_product_map apm
							join global.product_mapping pm on
								apm.product_code = pm.product_code
								and pm.mapping_type in (''product_dc'', ''product_fc'')
							group by '
								||_agg_level_db || ' ,
								store_code,
								dc_code,
								fc_code,
								is_active,
								validity,
								mapping_type
						';
			raise notice 'query to refresh %', _query;
			execute _drop_query;
			raise notice 'table dropped successfully';
			execute _query;
		end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$
;

