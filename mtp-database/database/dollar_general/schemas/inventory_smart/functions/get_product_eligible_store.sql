--liquibase formatted sql
--changeset jitendra.singh:get_product_eligible_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_product_eligible_store
--rollback: SELECT 1
--function to fetch product stores;
DROP FUNCTION IF EXISTS inventory_smart.get_product_eligible_store(refcursor, jsonb,  vl_unique_identifier text);
CREATE OR REPLACE FUNCTION inventory_smart.get_product_eligible_store(input refcursor, product_store_group jsonb, vl_unique_identifier text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_rcl_input_query_f text := '';
		_rcl_input_query text := '';
		_rcl_input_table text := '';
 	begin
	 	
		_rcl_input_table := 'public.rcl_psm_input_data_' || vl_unique_identifier;
		_rcl_input_query_f := '
		    select
		        psaf.store_code, psaf.psa_code, psg.product_code
		    from
		        global.store_groups sg
		    join global.aggregated_store_groups_mapping asgm 
		    on
		        sg.sg_code = asgm.sg_code
		    join global.product_store_attributes_filter psaf 
		    on
		        asgm.psa_code = psaf.psa_code
		    join
				(
					select product_code, store_group from json_array_elements_text('''||(product_store_group->'store_groups')::json||''') store_group
					cross join json_array_elements_text('''||(product_store_group->'product_codes')::json||''') product_code
				) psg
			on
				psg.store_group = sg.name
            join global.product_mapping_store_dc pmsd
            on pmsd.store_code = psaf.store_code
            '||
            case
	            when jsonb_array_length(product_store_group->'dc_codes') = 0 then ''
	            else 'where pmsd.dc_code = any(array'||(product_store_group->>'dc_codes')||')'
            end
		    ||'
		group by 1, 2, 3
		';
        raise notice '_rcl_input_query_f: %', _rcl_input_query_f;
		execute 'drop table if exists ' || _rcl_input_table ||' cascade; ';
		_rcl_input_query:= 'create unlogged table ' || _rcl_input_table || ' as ( ' || _rcl_input_query_f || ' );';
		raise notice '_rcl_input_query: %', _rcl_input_query;
		execute _rcl_input_query;
		OPEN $1 FOR execute format('
			select
				product_code,
				array_agg(store_code) as store_code
			from global.generate_rcl_psm_data(''%1$s'', 32, current_date)
			group by 1
		', _rcl_input_table);
 		RETURN $1;
 	end
 $function$
;

