--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:bulk_update_constraint_validity stripComments:false splitStatements:false runOnChange:true context:MTP-100367  labels:MTP-100367
--comment: MTP-100367
DROP FUNCTION IF EXISTS inventory_smart.bulk_update_constraint_validity(jsonb, jsonb, jsonb, jsonb, integer, integer[], text);
DROP FUNCTION IF EXISTS inventory_smart.bulk_update_constraint_validity(jsonb, jsonb, jsonb, jsonb, integer, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.bulk_update_constraint_validity(_pf jsonb, _sf jsonb, _tf jsonb, _nv jsonb, _updated_by integer, _mapping_codes jsonb, _return_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$ 
	declare 
		_query_pa text := '';
    	_query_sa text := '';
		_query_ca text := '';
   		_tq jsonb := (($3 - 'sort') - 'limit');
   		_selected_records text := '';
   		_query_table_filters text;
   		_set jsonb;
   		_l0_name text := (inventory_smart.get_l0_name_from_input(_pf)::text[])[1];
   		v_cnt numeric;
   		_temp_table text := gen_random_uuid();
   		_temp_data_table text := gen_random_uuid();
   		_result jsonb;
   		_mapping_code_con text;
	begin

		_query_pa := inventory_smart.form_main_table_filters(
		'ph_master',
	    $1
	    );
		raise notice '_query_pa: %', _query_pa;
	    _query_sa := global.form_main_table_filters(
	    'store_attributes_filter',
	    $2
	    );
			raise notice '_query_sa: %', _query_sa;
		_query_ca := global.form_main_table_filters_v2(
	    'constraint_master',
	    $6
	    );
		raise notice '_query_ca: %', _query_ca;
   		_mapping_code_con := case when _mapping_codes = '{}'::jsonb or COALESCE(_query_ca, '') = '' then 'WHERE l0_name = ' || quote_literal(_l0_name) else _query_ca || ' and l0_name = ' || quote_literal(_l0_name) end;

	   _query_table_filters := global.form_table_query(_tq);
		raise notice '_query_table_filters: %', _query_table_filters;
	  execute 'drop table if exists "' || _temp_table || '";';
	 _selected_records :=
		'
--	with selected_records as materialized (
			create temp table "' || _temp_table || '" on commit drop as
			select * from 
			(select product_code,store_code,l0_name, mapping_code,
				max(wos) as wos,
				max(transit_time) as transit_time,
				max(safety_stock) as safety_stock,
				max(min_stock) as min_store,
				max(max_stock) as max_store,
				max(aps) as aps,
				max(ros) as ros,
				max(updated_by) as updated_by,
				max(created_by) as created_by,
				max(channel) as channel
							from (
							  select 
							 paf.product_code,
							 paf.l0_name,
							 paf.l1_name,
							 paf.l2_name,
							 paf.article,
							 paf.product_description,
							 paf.product_channel_name,
							 paf.planning_ownership,
							 paf.merchandise_brand,
				    		 paf.metal_color,
				    		 paf.metal_type,
							 paf.merchandise_brand,
							 paf.merchandise_category,
							 paf.sku_grade,
							 paf.drop_ship_ind,
							 asg.grade store_grade,
							 saf.district,
							 saf.store_code,
							 saf.store_name,
							 saf.dma_name as dma,
							cm.mapping_code,
							cm.wos,
				cm.transit_time,
				cm.safety_stock,
				cm.min_stock,
				cm.max_stock,
				cm.aps,
				cm.ros,
				cm.updated_by,
				cm.created_by,
				cm.channel
			  from (select * from inventory_smart.constraint_master ' || _mapping_code_con || ') cm  join
			  (select *, article as product_code from inventory_smart.ph_master ' || _query_pa || ') paf
			  using (product_code)
			  join (select * from global.store_attributes_filter saf  ' || _query_sa || ') saf	
			  using (store_code)
			  left join (select article as product_code, store_code, grade, ph_code, store_channel from inventory_smart.article_store_grade) asg on (asg.store_code = saf.store_code AND asg.product_code = paf.product_code)
			  ) paf
			  ' || _query_table_filters || '
			   group by product_code,store_code,l0_name, mapping_code)  final;' ;
--			)
	raise notice '_selected_records: %', _selected_records;
		execute _selected_records;
		IF _return_type = 'record_count' then
			execute 'select jsonb_build_object(''record_count'', count(distinct mapping_code), ''sku_count'', count(distinct product_code)) as count from "'|| _temp_table ||'"' into _result;
			return _result;
		ELSE
			execute 'delete from inventory_smart.constraint_master where l0_name = ' || quote_literal(_l0_name) || ' and mapping_code in (select mapping_code from "' || _temp_table || '");';
	--		commit;
			for _set in select value from jsonb_array_elements(_nv) loop 
				raise notice '_set: %', _set;
					execute 'drop table if exists "' || _temp_data_table || '";';
					execute 'create temp table "' || _temp_data_table || '" as
					select 
						(' || case when _set->>'wos' is null then 'NULL' else quote_literal(_set->>'wos') end || ')::float4 as wos,
						(' || case when _set->>'transit_time' is null then 'NULL' else quote_literal(_set->>'transit_time') end || ')::float4 as transit_time,
						(' || case when _set->>'safety_stock' is null then 'NULL' else quote_literal(_set->>'safety_stock') end || ')::float4 as safety_stock,
						(' || case when _set->>'min_stock' is null then 'NULL' else quote_literal(_set->>'min_stock') end || ')::float4 as min_stock,
						(' || case when _set->>'max_stock' is null then 'NULL' else quote_literal(_set->>'max_stock') end || ')::float4 as max_stock,
						(' || case when _set->>'aps' is null then 'NULL' else quote_literal(_set->>'aps') end || ')::float4 as aps,
						(' || case when _set->>'ros' is null then 'NULL' else quote_literal(_set->>'ros') end || ')::float4 as ros,
						(' || case when _set->>'created_by' is null then 'NULL' else quote_literal(_set->>'created_by') end || ')::int4 as created_by';
					execute 'INSERT INTO inventory_smart.constraint_master
					(mapping_code, l0_name, product_code, store_code, channel, updated_at, updated_by, created_by, wos, transit_time, safety_stock, min_stock, max_stock, aps, ros)
					select x.mapping_code, x.l0_name, x.product_code, x.store_code, x.channel, now(), ' || quote_literal(_updated_by) || ', x.created_by, coalesce(y.wos, x.wos), coalesce(y.transit_time, x.transit_time), coalesce(y.safety_stock, x.safety_stock), coalesce(y.min_stock, x.min_store), coalesce(y.max_stock, x.max_store), coalesce(y.aps, x.aps), coalesce(y.ros, x.ros) from "' || _temp_table || '" x cross join "' || _temp_data_table || '" y;';
		--	commit;
			end loop;
	    end if;
--	execute _selected_records;
--	GET DIAGNOSTICS v_cnt = ROW_COUNT;
	execute 'select json_build_object(''record_count'', 0, ''sku_count'', 0)' into _result;
	return _result;
	end
$function$
;

 --rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1;