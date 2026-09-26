--liquibase formatted sql
--changeset liquibase:estimate_constraint_store_list_download runOnChange:true stripComments:false splitStatements:false context:query_fix-1
--comment: query fix-1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_constraint_store_list_download(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_constraint_store_list_download(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_channel_where_condition text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_query_combine_format text := '';
       	l0_name_updated text := '';
        _temp_str text;
        _val text;
	begin 		

		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);

		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		
		if $2->'sizes' IS NOT NULL THEN
	        select value into _temp_str from json_each_text($2::json) where key='sizes';
	       	select concat(jsonb_agg(value)) into _val from json_array_elements_text(((json_extract_path(_temp_str::json, '0')::json)->>'values')::json);
	      	_temp_str =  replace(replace(replace(_val,'"',''''),'[',''),']','');
			RAISE NOTICE 'size %',_temp_str;
			_temp_str = 'where product->>''size'' in (' || _temp_str || ')';
			RAISE NOTICE ' _temp_str %',_temp_str;   	
	    ELSE
	       	_temp_str = ''; 
	    END IF; 	
        _query_combine_format := $$
        	with paf as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				$$||_query_pa||$$ and channel = '$$||_channel||$$'
			),
			saf as (
				select * FROM global.store_attributes_filter saf 
			 	$$||_query_sa||$$
			),
			product_master_filters_data AS (
					  SELECT
					    pmps.product_code, 
 					    pmps.mapping_code, 
 					    pmps.store_code,
 						paf.article_status_tag,
 						paf.ph_code,
 					    paf.l0_name, 
 					    paf.l1_name,
						paf.l2_name,
 						paf.l3_name,
						paf.l4_name,
						paf.product_description,
						paf.model_description, 
						paf.style_color_id,
						paf.brand,
						paf.supersede_flag,
 						product->>'size' as size,
						product->>'order' as size_order,
 					    paf.article,
						paf.style,
						paf.color,
 					    saf.store_name, 
 					    saf.channel,
						saf.retail_facility_code
					  FROM (
					      SELECT *, UNNEST(product_code_size_map) as product
					      FROM paf
					  ) paf  
					  join (select * from global.product_mapping_product_store where l0_name = $$||l0_name_updated||$$) pmps on paf.product->>'product_code' = pmps.product_code and paf.l0_name = pmps.l0_name		
					  join saf using(store_code)
					  $$||_temp_str||$$
				) -- select * from product_master_filters_data
				, 
				constraint_data_1 AS (
					  SELECT 
						pmps.ph_code,
					  	pmps.product_code, 
 					    pmps.store_code,
						pmps.mapping_code,
 						pmps.size,
						pmps.size_order,
 					    pmps.l0_name, 
 					    pmps.l1_name, 
						pmps.l2_name,
 					    pmps.l3_name,
						pmps.l4_name,
 						pmps.article, 
 						pmps.article_status_tag,
 						pmps.style,
                        pmps.color,
 					    pmps.store_name, 
 					    pmps.channel,
						pmps.product_description,
						pmps.model_description, 
						pmps.style_color_id,
						pmps.brand,
						pmps.supersede_flag,
						pmps.retail_facility_code,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = 'AAA' then 1
 							when asg.grade = 'AA' then 2
 							when asg.grade = 'A' then 3
 							when asg.grade = 'B' then 4
 							when asg.grade = 'C' then 5
 							when asg.grade = 'D' then 6
 							else 11
 						end as store_grade_priority,
						c.upload_flag as upload_flag,
 					    c.wos, 
 					    min_store, 
	                    max_store, 
	                    min_store_sum, 
	                    max_store_sum, 
	                    transit_time_sum, 
	                    um.name AS updated_by, 
 						to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE 'EST', 'YYYY-MM-DD HH24:MI:SS') as updated_at
					  FROM 
                   		(select *, 
						c.min_stock as min_store, 
                        c.max_stock as max_store, 
                        c.min_stock as min_store_sum, 
                        c.max_stock as max_store_sum, 
                        c.transit_time as transit_time_sum  from inventory_smart.constraint_master c TABLESAMPLE SYSTEM (0.1)) c 
 					    join product_master_filters_data pmps using(mapping_code, l0_name)
 					    LEFT JOIN global.user_master um on c.updated_by = um.user_code
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article and pmps.ph_code = asg.ph_code
						where c.l0_name = $$||l0_name_updated||$$ AND c.channel = '$$||_channel||$$'
						and c.mapping_code is not null
				)
				select count(*)*1000 as total_count from constraint_data_1
				$$;
	raise notice '_query_combine %', _query_combine_format;
	OPEN $1 FOR EXECUTE _query_combine_format;
	return $1; 		
END;
$function$
;