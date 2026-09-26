--liquibase formatted sql
--changeset nibeel.yunus:get_product_eligible_store runOnChange:true stripComments:false splitStatements:false context:Release labels:Release
--comment: initial changeset for get_product_eligible_store | MTP-116558
--rollback: SELECT 1
--function to fetch product stores;
DROP FUNCTION IF EXISTS inventory_smart.get_product_eligible_store(refcursor, jsonb,  vl_unique_identifier text);
CREATE OR REPLACE FUNCTION inventory_smart.get_product_eligible_store(input refcursor, product_store_group jsonb, vl_unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 	declare
 		_rcl_input_query_f text := '';
		_rcl_input_query text := '';
		_rcl_input_table text := '';
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
		_v_cursor_sql text := '';
 	begin

		_rcl_input_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		_rcl_input_query_f := '
		    select
			    psaf.store_code, psaf.psa_code, paf.product_code
			from
			    global.store_groups sg
			join global.store_groups_mapping asgm 
			on
			    sg.sg_code = asgm.sg_code
			join global.product_store_attributes_filter_store_code psaf 
			on
			    asgm.store_code=psaf.store_code
		    join
				(
					select article, store_group from json_array_elements_text('''||(product_store_group->'store_groups')::json||''') store_group
					cross join json_array_elements_text('''||(product_store_group->'product_codes')::json||''') article
				) psg
			on
				psg.store_group = sg.name
			join global.product_attributes_filter paf on paf.article = psg.article
		    join global.product_mapping_store_dc pmsd
		    on pmsd.store_code = psaf.store_code
			join global.store_attributes_filter saf on saf.store_code = psaf.store_code
			where saf.active 
            '||
            case
	            when jsonb_array_length(product_store_group->'dc_codes') = 0 then ''
	            else 'and pmsd.dc_code = any(array'||(product_store_group->>'dc_codes')||')'
            end
		    ||'
		group by 1, 2, 3
		';
        raise notice '_rcl_input_query_f: %', _rcl_input_query_f;
		execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
		
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_product_eligible_store', 'After table drop cascade','drop table if exists ' || _rcl_input_table ||' cascade; ',jsonb_build_object('product_store_group',$2,'vl_unique_identifier',$3));

		
		_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' as ( ' || _rcl_input_query_f || ' );';
		raise notice '_rcl_input_query: %', _rcl_input_query;
		
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_product_eligible_store', 'Before execute _rcl_input_query',_rcl_input_query,jsonb_build_object('product_store_group',$2,'vl_unique_identifier',$3));

		execute _rcl_input_query;
		OPEN $1 FOR execute format('
			select
				paf.article as product_code,
				array_agg(DISTINCT psm.store_code) as store_code
			from global.generate_rcl_psm_data(''%1$s'', 101, current_date) psm
			join global.product_attributes_filter paf on paf.product_code = psm.product_code
			group by 1
		', _rcl_input_table);
		
		_v_cursor_sql := '
			select
				paf.article as product_code,
				array_agg(DISTINCT psm.store_code) as store_code
			from global.generate_rcl_psm_data('''||_rcl_input_table||''', 101, current_date) psm
			join global.product_attributes_filter paf on paf.product_code = psm.product_code
			group by 1';
		
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.get_product_eligible_store', 'Before returning function value',_v_cursor_sql,jsonb_build_object('product_store_group',$2,'vl_unique_identifier',$3));

 		RETURN $1;
 	end
 $function$
;