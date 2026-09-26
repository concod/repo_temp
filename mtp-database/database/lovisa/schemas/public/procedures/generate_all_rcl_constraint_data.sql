--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:generate_all_rcl_constraint_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_sp
--comment: initial changeset for generate_all_rcl_constraint_data_v2
--rollback: SELECT 1

DROP PROCEDURE if EXISTS public.generate_all_rcl_constraint_data();

CREATE OR REPLACE PROCEDURE public.generate_all_rcl_constraint_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_all_rcl_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_l0_name text;
	_sql text;
	_part_sql text[] := array[]::text[];
	_r record;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	set work_mem = '10GB';
	for _r in select name, setting from pg_settings where source = 'session' loop
		raise notice '_r: %', _r;
	end loop;
	for _l0_name in select l0_name from global.product_attributes_filter paf where active and not is_deleted group by 1 order by 1 loop
		_sql := format($$
			create temp table "test_%2$s" ON COMMIT DROP as
			select product_code::text as product_code, article::text as article, store_code::text as store_code from (
				select distinct l0_name, l1_name, range_name, psaf.store_code from global.product_store_attributes_filter psaf join global.store_master sm using(store_code)
				where 
				l0_name = '%1$s'
				and active
				and not is_deleted
			) x join global.product_attributes_filter paf using(l0_name, l1_name, range_name)
			join (
				select article from inventory_smart.dc_pack_inventory group by 1
--				union
--				(select article from inventory_smart.po_master a
--				join global.product_attributes_filter b using(product_code) group by 1)
--			  	union 
--			  	select article from inventory_smart.new_store_inventory_source group by 1
			) dpi on paf.article = dpi.article
			where active
			and not is_deleted
			and l0_name = '%1$s' $$, _l0_name, lower(regexp_replace(_l0_name, '\W+', '', 'g')));
			execute _sql;
			raise notice '_sql: %', _sql;
			_part_sql := array_append(_part_sql, 'select * from inventory_smart.generate_rcl_constraint_data_v2(' || quote_literal(_l0_name) || ', ' || quote_literal('test_' || lower(regexp_replace(_l0_name, '\W+', '', 'g'))) || ')');
	end loop;
	raise notice '_part_sql: %', _part_sql;
	execute 'TRUNCATE TABLE inventory_smart.final_result_table';
	if cardinality(_part_sql) > 0 then
		SET enable_seqscan = off;
		execute 'INSERT INTO inventory_smart.final_result_table ' || ARRAY_TO_STRING(_part_sql, ' UNION ALL ', '');
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
