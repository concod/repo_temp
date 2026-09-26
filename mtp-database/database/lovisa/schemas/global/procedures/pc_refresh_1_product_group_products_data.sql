--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_1_product_group_products_data_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_refresh_1_product_group_products_data_8

DROP PROCEDURE IF EXISTS global.pc_refresh_1_product_group_products_data;


CREATE OR REPLACE PROCEDURE global.pc_refresh_1_product_group_products_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.pc_refresh_1_product_group_products_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_pg_ids integer[];
	_pg_id integer;
	pg_hierarchy_record record;
	new_pg_products integer[];
	pg_hierarchy_where text[];
	new_pg_products_query text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
	select
		array_agg(pg_id) into _pg_ids
	from
		pricesmart.tb_product_group tpg
	where
		tpg.pg_grouping_type = 1
		and tpg.is_deleted = 0;

	if array_length(_pg_ids, 1) <> 0 then
		raise notice 'pgs present';
		foreach _pg_id in array _pg_ids loop
			raise notice 'pg_id : %', _pg_id;

			SELECT
			    h.pg_id,
			    h.l0_ids,-- onboarding changes to be done here
			    h.l1_ids,
			    h.l2_ids,
			    h.l3_ids,
			    h.l4_ids,
				h.l5_ids,
			    h.realism_ids,
			    h.size_ids,
				h.light_type_ids,
			    h.derived_status_ids
			INTO
				pg_hierarchy_record
			FROM
			    pricesmart.tb_pg_hierarchy_agg_data h
			WHERE
			    h.pg_id = _pg_id;
			raise notice 'pg_hierarchy_record : %', pg_hierarchy_record;

			new_pg_products = null::integer[];
			new_pg_products = global.fn_fetch_product_ids_by_hierarchy(pg_hierarchy_record.l0_ids, pg_hierarchy_record.l1_ids, pg_hierarchy_record.l2_ids, pg_hierarchy_record.l3_ids, pg_hierarchy_record.l4_ids, pg_hierarchy_record.l5_ids, pg_hierarchy_record.realism_ids, pg_hierarchy_record.size_ids, pg_hierarchy_record.light_type_ids, pg_hierarchy_record.derived_status_ids);
			raise notice 'new_pg_products_query: %', new_pg_products;

			-- Delete Old Pg Products.
			delete from pricesmart.tb_pg_product tpp where tpp.pg_id = _pg_id;

			-- Insert New Pg Products.
			if array_length(new_pg_products, 1) > 0 then
				insert into pricesmart.tb_pg_product(pg_id, product_id)
				select _pg_id as pg_id, unnest(new_pg_products) as product_id;
			end if;

			-- Update New Pg Products Count.
			update pricesmart.tb_product_group set products_count = array_length(new_pg_products, 1) where pg_id = _pg_id;
			raise notice 'Pg Update Complete';

			new_pg_products = null::integer[];
			pg_hierarchy_where = null::text[];
			pg_hierarchy_record = null;
		end loop;

		-- Refresh markdown products.
		perform price_markdown.fn_refresh_product_group_products_count();

	else
		raise notice 'no pgs';
	end if;


		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
