--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:constraints_store_bulk_update_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release 3_1_1 labels:MTP-94201
--comment: MTP-94201
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_bulk_update_by_filters(input refcursor, jsonb, jsonb, text, text, text, text, integer, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_ph_sort text ;
		_ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _sub_limit int;
       	_sub_offset int;
		_dummy text;
		_val text;
		_sa_search text := '';
 		_client_columns text;
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
 		_channel_max_invalid_conditions text := '';
 	    _query_table_filters text := '';
 		_query_combine text := '';
		_temp_str text;
 		_store_invalid_max_query text := '';
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'client_columns',$4, 'min_value', $5,'max_value', $6,'wos_value', $7, 'user_id', $8);
 		_update_column text := ' ';
 		_statement_cte_1 text := '';
   		_where_clause_cte_1 text := '';
    	_select_1 text := 'select 1 as success';
    	_final_select_cte text := '';
 	
 --		_cache_dependencies text[] := '{inventory_smart.constraint_master}';
 	begin
 		SELECT * FROM inventory_smart.form_search_sort_clause($9, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		SELECT * FROM inventory_smart.form_search_sort_clause($9, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;

 		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	
		raise notice '_overall_search %', _overall_search;
 		_channel_max_invalid_conditions = ' where cm.min_stock > cm.max_stock and cm.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])';
 	
 	
 		if length ($4)> 0 then
 			_client_columns := ','||$4;
 		else 
 			_client_columns := '';
 		end if;
 		if length($5)>0 then 
 			_update_column := _update_column || ' min_stock = '||$5::int || ',';
 		end if;
 		if length($6)>0 then 
 			_update_column := _update_column || ' max_stock = '||$6::int || ',';
 		end if;
 		if length($7)>0 then 
 			_update_column := _update_column || ' wos = '||$7::int || ',';
 		end if;
 		_update_column := _update_column || ' updated_at = now(), updated_by = ' || $8;
 		raise notice '_update_column %', _update_column;
 	    raise notice '_query_table_filters %', _query_table_filters;

		if $2->'sizes' IS NOT NULL THEN
	        select value into _temp_str from json_each_text($2::json) where key='sizes';
	       	select concat(jsonb_agg(value)) into _val from json_array_elements_text(((json_extract_path(_temp_str::json, '0')::json)->>'values')::json);
	      	_temp_str =  replace(replace(replace(_val,'"',''''),'[',''),']','');
			RAISE NOTICE 'size %',_temp_str;
			_temp_str = 'WHERE product->>''size'' in (' || _temp_str || ')';
			RAISE NOTICE ' _temp_str %',_temp_str;   	
	    ELSE
	       	_temp_str = ''; 
		END IF;
 	   
 		if $10 ilike 'record_count' then 
			_statement_cte_1 := 'with count as (select count(distinct mapping_code) as record_count, count(distinct article) as sku_count';
			_where_clause_cte_1 := '';
			_final_select_cte := ')
						SELECT * FROM constraint_data where True'||_overall_search||') x
						) select jsonb_build_object(''record_count'', record_count, ''sku_count'', sku_count) as count from count 
						';		
		else
			_statement_cte_1 := 'update inventory_smart.constraint_master t1 set ' || _update_column ;
			_final_select_cte := ') select channel , mapping_code from constraint_data where True'||_overall_search||'
 			) b where b.mapping_code = t1.mapping_code 
 				and t1.channel = '''||_channel||''';';
		end if;
			
 		_query_combine := 
 			_statement_cte_1 ||'
 		from (
 			WITH ph_master_data as(
				select 
 					        *,
 							unnest(product_code_size_map) as product,
							unnest(product_codes) as product_code
 					      FROM 
 					        inventory_smart.ph_master 
 					      	' || _query_pa || ' '||_ph_search||'
 							 and channel = ''' ||replace (_channel,',','')||'''
				),
				product_codes as (
					select distinct product_code from ph_master_data
					'||_temp_str||'
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
 						product->>''size'' as size,
 					    paf.article,
						style,
             			color,
 					    saf.store_name, 
 					    saf.channel,
						saf.retail_facility_code
 					  FROM 
 					    (
 					      select * from ph_master_data
 					    ) paf 
 					    join (select mapping_code, l0_name, product_code, store_code from global.product_mapping_product_store where l0_name = any('''|| concat(_l0_name) ||'''::varchar[]) and product_code in (select product_code from product_codes)) pmps on paf.product->>''product_code'' = pmps.product_code 
 						left join inventory_smart.article_store_grade asg using (store_code, article)
 					    join (
 					      select 
 					        *
 					      FROM 
 					        global.store_attributes_filter saf 
 					      	' || _query_sa || ' '||_sa_search||'
 					    ) saf using(store_code)
 				) -- select * from product_master_filters_data
				,
 				constraint_data AS (
 					select * from (
 					  SELECT 
 					    pmps.product_code, 
						pmps.mapping_code,
 					    pmps.store_code,
 						pmps.size,
						pmps.ph_code,
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
						pmps.retail_facility_code,
						pmps.product_description,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = ''AAA'' then 1
 							when asg.grade = ''AA'' then 2
 							when asg.grade = ''A'' then 3
 							when asg.grade = ''B'' then 4
 							when asg.grade = ''C'' then 5
 							when asg.grade = ''D'' then 6
 							else 11
 						end as store_grade_priority,
 					    c.wos, 
 					    c.min_stock as min_store, 
 					    c.max_stock as max_store, 
 					    c.min_stock as min_store_sum, 
 					    c.max_stock as max_store_sum,
 					    c.transit_time as transit_time_sum, 
 					    email AS updated_by, 
 						to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') as updated_at
 	--					coalesce(c.updated_at, c.created_at) as updated_at
 					  FROM 
 					    inventory_smart.constraint_master c 
 					    join product_master_filters_data pmps using(mapping_code)
 					    LEFT JOIN global.user_master um on c.updated_by = um.user_code
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article and pmps.ph_code = asg.ph_code
						where c.l0_name = any('''|| concat(_l0_name) ||'''::varchar[]) and c.channel = ''' || _channel || '''
						and c.mapping_code is not null
 					)as a
						'||_final_select_cte||' 
				';
		
 		-- update values whose max_store is less than min_store
 		
 		_store_invalid_max_query  := '
			update inventory_smart.constraint_master t1 
				set max_stock = t1.min_stock
			from (
			select 
				mapping_code,
				channel,
				l0_name
			from inventory_smart.constraint_master cm 
			'||_channel_max_invalid_conditions||'
			) t2 where t1.l0_name = any('''|| concat(_l0_name) ||'''::varchar[]) and t1.mapping_code = t2.mapping_code and t1.l0_name = t2.l0_name';
 		
 		raise notice '%', _query_combine;

 		if $10 ilike 'record_count' then
			OPEN $1 FOR EXECUTE _query_combine;
			return $1;
		else 
			execute _query_combine;
			execute _store_invalid_max_query;
			OPEN $1 FOR EXECUTE _select_1;
			return $1;
		end if;
	
 	end
 $function$
;