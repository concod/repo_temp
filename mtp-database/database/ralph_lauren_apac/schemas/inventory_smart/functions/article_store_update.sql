--liquibase formatted sql
--changeset liquibase:article_store_update runOnChange:true stripComments:false splitStatements:false context:MTP-64645 labels:MTP-64645
--comment:  MTP-64645 material & material-store count fixed
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.article_store_update(refcursor, jsonb, jsonb, jsonb, int4, int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.article_store_update(input refcursor, jsonb, jsonb, jsonb, integer, integer, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare 
		query_combine text;
		query_pa text; 
		query_sa text;
		query_search text;
		pattern text;
    	match text[];
		product_search text;
		store_search text;
		_select_1 text := 'select 1 as success';
		_channel text[] := inventory_smart.get_channel_from_input_new($3);
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_l0_name_updated text := ''; 

	BEGIN
		
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into _l0_name_updated;
	
		raise notice '_channel : %',_channel[1];
		raise notice '_l0_name : %',_l0_name;
		
		query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
		query_sa  := $8;
		query_search  := REPLACE(global.form_table_query($4),'WHERE','AND');
		

		
		raise notice 'query_pa = %', query_pa;
		raise notice 'query_sa = %', query_sa;
		raise notice 'query_search = %', query_search;

		-- First pattern to match AND (retail_facility_code::text ILIKE '%00469%')
	    pattern := '\s*AND\s*\(retail_facility_code::text ILIKE ''%\d+%''\)';
	
	    -- Try to find the match using regexp_matches
	    match := regexp_matches(query_search, pattern);
	    
	    IF array_length(match, 1) IS NULL THEN
	        -- If the first pattern does not match, use the second pattern
	        pattern := 'AND\s*\(retail_facility_code\s*=\s*any\s*\(''{(\d+,\s*)*\d+}''\)\)';
	        match := regexp_matches(query_search, pattern);
	    END IF;
	
	    IF array_length(match, 1) IS NOT NULL THEN
	        -- If there is a match, remove the pattern from query_search
	        product_search := regexp_replace(query_search, pattern, '', 'g');
	        store_search := match[1]; -- store the match result
	    ELSE
	        -- If no match, keep the original query_search in product_search
	        product_search := query_search;
	        store_search := '';
	    END IF;
	
	    -- Display the results
	    RAISE NOTICE 'Product Search: %', product_search;
	    RAISE NOTICE 'Store Search: %', store_search;

		if $7 ilike 'record_count' then 
			query_combine = '	
					with ph_temp as materialized (
						select * from
						inventory_smart.ph_master ph '|| query_pa ||'
						'||product_search||'
						)
						-- select * from ph_temp
						
					,saf as materialized (
						select array_agg(store_code) as store_codes FROM "global".store_attributes_filter '|| query_sa || '
						'||store_search||' and active
					)
					,product_store_mapping as (
						select ph_code, channel,
						(
							select array_agg(distinct store_code) from global.product_mapping_product_store 
							WHERE (l0_name::varchar = '||_l0_name_updated||') and is_active = true and product_code = ANY (ph.product_codes)
							and store_code = any(saf.store_codes)
						) as store_codes
						from ph_temp ph cross join saf
					)
					-- select * from product_store_mapping
					,ph_data as (
								select ph_code, channel, array_length(store_codes,1) as store_len from product_store_mapping
								WHERE channel='''||_channel[1]||'''
					)
					-- select * from ph_data
					select jsonb_build_object(''record_count'', record_count , ''sku_count'', sku_count) as count from 
					(select count(distinct ph_code) as sku_count, sum(store_len)  as record_count from ph_data) x
					';	
		end if;
		
		if $7 ilike 'insert_update' then
			query_combine = '
						UPDATE global.product_mapping_product_store 
						SET inv_source_flag = '||$6||', updated_at = now(), updated_by = '||$5||'
						WHERE product_code IN (
						    SELECT  unnest(product_codes) as product_code
						    FROM inventory_smart.ph_master
						    '||query_pa||' '||product_search||'
						) AND store_code IN (
						    SELECT store_code
						    FROM global.store_attributes_filter
						    '||query_sa||' '||store_search||'
						)
					';
		end if;

		raise notice '%', query_combine;
		
		if $7 ilike 'record_count' then 
			OPEN $1 FOR EXECUTE query_combine;
		else
			EXECUTE query_combine;
			OPEN $1 FOR EXECUTE _select_1;
   		end if;	


		return $1; 
			
	END;
$function$
;
