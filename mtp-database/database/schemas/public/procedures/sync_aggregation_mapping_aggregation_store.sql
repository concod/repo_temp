--liquibase formatted sql
--changeset liquibase:sync_aggregation_mapping_aggregation_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_aggregation_mapping_aggregation_store
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_aggregation_mapping_aggregation_store();
CREATE OR REPLACE PROCEDURE public.sync_aggregation_mapping_aggregation_store()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_aggregation_mapping_aggregation_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	_query text;
 	_agg_level_db text;
 	_drop_query text;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	_drop_query  := 'Delete from global.aggregation_mapping_aggregation_store';
	 	_agg_level_db := global.fetch_aggregation_level();
	 	if _agg_level_db is not null and _agg_level_db <> 'product_code'
	 	then
		 	_query:= 'WITH article_product_map AS (
						SELECT '
						|| _agg_level_db ||
						', MAX(product_code) AS product_code
							FROM
							global.product_attributes_filter paf
							WHERE
							paf.is_deleted IS FALSE
							GROUP BY '
							|| _agg_level_db ||
						')
						Insert into global.aggregation_mapping_aggregation_store (aggregation_code, store_code, validity, is_active, l0_name, mapping_type)
							SELECT
							apm.' || _agg_level_db || ' AS aggregation_code,
							pmps.store_code,
							pmps.validity,
							pmps.is_active,
							pmps.l0_name,
							''aggregation_store'' as mapping_type
						FROM
						article_product_map apm
						JOIN global.product_mapping_product_store pmps ON pmps.product_code = apm.product_code
						GROUP BY
						apm.' || _agg_level_db || ',
						pmps.store_code,
						pmps.validity,
						pmps.is_active,
						pmps.l0_name,
						pmps.mapping_type';
			raise notice 'query to refresh %', _query;
			execute _drop_query;
			call global.build_list_partitions('aggregation_mapping_aggregation_store');
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

