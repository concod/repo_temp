--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_refresh_1_product_group_products_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_refresh_1_product_group_products_data_1

DROP PROCEDURE if exists pricesmart.pc_refresh_1_product_group_products_data;


CREATE OR REPLACE PROCEDURE pricesmart.pc_refresh_1_product_group_products_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'pricesmart.pc_refresh_1_product_group_products_data';
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
    -- refresh added so that once product master is updated the hierarchy data in mvw needs to be only of active products.
    -- refresh MATERIALIZED VIEW "price_markdown".mvw_pg_hierarchy_agg_data with data;

	select
		array_agg(pg_id) into _pg_ids
	from
		pricesmart.tb_product_group tpg
	where
		tpg.pg_grouping_type = 1
		and tpg.is_deleted = 0;

	if array_length(_pg_ids, 1) <> 0 then
		raise notice 'pgs present';
		-- Create pricesmart.tmp_pg_actual_hierarchy with actual pg hierarchy.
		call pricesmart.pc_build_temp_pg_user_selected_hierarchies_table(_pg_ids);

		foreach _pg_id in array _pg_ids loop
			raise notice 'pg_id : %', _pg_id;

			-- Get Updated Products for PG.
			new_pg_products = null::integer[];
			new_pg_products = pricesmart.fn_get_updated_products_for_pg(_pg_id);
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
		-- perform price_markdown.fn_refresh_product_group_products_count();

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
