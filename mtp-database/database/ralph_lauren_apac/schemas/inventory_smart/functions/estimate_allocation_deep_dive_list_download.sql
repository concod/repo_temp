--liquibase formatted sql
--changeset liquibase:estimate_allocation_deep_dive_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:MTP-95887
--comment: MTP-95887
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_allocation_deep_dive_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_allocation_deep_dive_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine text := '';
		_query_filter text := '';
       	json_key text := '';
        json_value text := '';
       	filter_key text := '';
       	filter_value text := '';
        _case_allocation_type text := '';
        _min_created_at timestamp;
        _max_created_at timestamp;
        _allocation_plan_codes varchar[];
        _allocation_plan_codes_str text := '';
       _query_min_max_date_and_allocation_plan_codes_format text := '';
       _plan_codes_formatter jsonb;
       _allocation_type_filter text := '';
	begin
		_query_pa := global.form_main_table_filters(
 		  'product_attributes_filter',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 		FOR json_key, json_value IN SELECT * FROM jsonb_each($4) LOOP
	       	IF json_key = 'custom_filters' then
	       		FOR filter_key, filter_value in SELECT * FROM jsonb_each_text(json_value::jsonb) loop
		       		_query_filter = _query_filter || ' AND ' || filter_value;
	       			RAISE NOTICE 'filter_key: %, filter_value: %', filter_key, filter_value;
	       		end LOOP;
	       		EXIT;
        	end if;
    	END LOOP;
    
    	_query_min_max_date_and_allocation_plan_codes_format := $$
            SELECT
                (min(created_at)::date)::timestamp,
                (max(created_at)::date)::timestamp + interval '23 hours 59 minutes',
                array_agg(pa.plan_code)
            from inventory_smart.plan_master pm
            join (SELECT * FROM inventory_smart.plan_attributes WHERE attribute_name = 'parent_allocation') pa
                on pm.plan_code = pa.plan_code
            WHERE ((pm.updated_at AT TIME ZONE '$$ || inventory_smart.get_tenant_timezone() || $$')::date BETWEEN '{start_date}' AND '{end_date}') and status = 3 {_allocation_type_filter}
        $$;
        _plan_codes_formatter = json_build_object(
            'start_date', $7,
            'end_date', $8,
            '_allocation_type_filter', _allocation_type_filter
        );
       
        execute inventory_smart.format_with_json(_query_min_max_date_and_allocation_plan_codes_format, _plan_codes_formatter)
        into _min_created_at, _max_created_at, _allocation_plan_codes;

        if cardinality(_allocation_plan_codes) > 0 then
            _allocation_plan_codes_str := '{' || array_to_string(_allocation_plan_codes::varchar[], ',') || '}';
        ELSE
            _allocation_plan_codes_str := '{}';
        END IF;
       
       RAISE NOTICE 'Min created at: %, Max created at: %, Allocation Plan codes: %', _min_created_at, _max_created_at, _allocation_plan_codes;

		_query_combine := '
			with allocation as materialized(
                select 
                allocation_code, article, store, pack_dc_allocation,retail_size_cd, pack_dc_allocation_original,
                max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag
                FROM inventory_smart.create_allocation_result_flat_gurobi TABLESAMPLE SYSTEM (1)
                where created_at between '''||_min_created_at||''' and '''||_max_created_at||'''
                and allocation_code = any('''||_allocation_plan_codes_str||'''::varchar[])
				and allocated_total > 0
                '||_query_filter||'
            )
            ,paf2 as materialized ( 
                 SELECT 
                	l0_id, 
                    l0_name,
                    l1_id,
                    l1_name,
                    l2_id,
                    l2_name,
                    l3_id,
                    l3_name,
                    l4_id,
                    l4_name,
                    color_id_og,
                    color_name_og,
                    style_og,
                    item_desc_og,
                    style_color_id_og,
                    size,
                    size_name,
                    pfs_season,
                    dtc_season,
                    article,
                    product_code,
                    vendor,
                    brand,
                    vendor_case_pack,
                    upc,
                    sku,
                    model_description,
                    supersede_flag
                FROM global.product_attributes_filter
                '||_query_pa||'
                and (active and (not is_deleted))
                AND article IN (SELECT article FROM allocation)
		 		ORDER BY product_code
			)
			, paf1 as (
				select *
				from paf2
			)
            ,allocation_filtered as (
                SELECT *, retail_size_cd size FROM allocation
                WHERE article IN (SELECT article FROM paf1)
                    AND store IN (SELECT store_code FROM global.store_attributes_filter '||_query_sa||')
            )
            ,flat1 AS MATERIALIZED (
                SELECT allocation_code, article, store,
                       js.key::int dc_code,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag, 
                       UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text, ''[]'', ''{}''))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text, ''[]'', ''{}''))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text, ''[]'', ''{}''))::numeric[]) available_qty,
                       UNNEST((TRANSLATE((ac.value::json->>''packs_allocated_qty'')::text, ''[]'', ''{}''))::numeric[]) allocated_total_orig
                FROM allocation_filtered,  JSONB_EACH(pack_dc_allocation) js, JSONB_EACH(COALESCE(pack_dc_allocation_original::jsonb, pack_dc_allocation)) ac
                GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
            ),
            packs AS (
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       size,
                       available_qty,
                       allocated_total_orig,
                       allocated_qty packs_allocated_qty,
                       allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat1 USING (article, pack_type_id)
            )
            ,packs_base as (
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       pack_type_id as size,
                       allocated_qty,
                       available_qty,
                       0 as packs_allocated_qty,
                       0 as pack_units_allocated,
                       allocated_qty as loose_allocated_qty,
                       ''E'' as type,
                       allocated_total_orig
                FROM flat1
                WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
                UNION
                SELECT allocation_code, article,
                       dc_code,
                       store,
                       max_supression_flag, oh_oo_intransit, max, min, demand, is_edited, min_influenced_allocation, unedited_min, unedited_max, auto_allocation_run_flag,
                       pack_type_id,
                       size,
                       allocated_qty,
                       available_qty,
                       packs_allocated_qty,
                       allocated_qty as pack_units_allocated,
                       0 as loose_allocated_qty,
                       ''S'' as type, allocated_total_orig
               FROM packs
            )
            ,flat2 AS MATERIALIZED (
                SELECT *
                FROM packs_base
                WHERE (article, size) IN (SELECT article, size FROM paf1) AND (allocation_code,article, size, store) IN (SELECT allocation_code,article, size, store FROM allocation_filtered)
			)
			SELECT count(*)*100 as total_count FROM flat2;';
	raise notice ' %', _query_combine;
	open $1 for execute _query_combine;
    RETURN $1;
	END;
$function$
;