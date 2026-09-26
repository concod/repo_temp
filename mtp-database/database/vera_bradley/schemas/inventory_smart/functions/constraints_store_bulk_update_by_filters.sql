--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:constraints_store_bulk_update_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release 3.1 labels:constraints_store_bulk_update_by_filters
--comment: added one extra parameter
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
		_client_columns text;
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_table_filters text := '';
		_query_combine text := '';
		_store_invalid_max_query text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'client_columns',$4, 'min_value', $5,'max_value', $6,'wos_value', $7, 'user_id', $8);
		_tq jsonb := (($9 - 'sort') - 'limit');
		_update_column text := ' ';
		_select_1 text := 'select 1 as success';
--		_cache_dependencies text[] := '{inventory_smart.constraint_master}';
	begin
		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
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
		_query_table_filters := global.form_table_query(_tq);
		_query_combine := '
		update inventory_smart.constraint_master t1
			set ' || _update_column || '
		from (
			WITH product_master_filters_data AS (
					  SELECT 
					    pmps.product_code, 
					    pmps.mapping_code, 
					    pmps.store_code,
						asg.grade as store_grade,
						case 
							when asg.grade = ''A+'' then 1
							when asg.grade = ''A'' then 2
							when asg.grade = ''B+'' then 3
							when asg.grade = ''B'' then 4
							when asg.grade  = ''C+'' then 5
							when asg.grade = ''C'' then 6
							when asg.grade = ''D+'' then 7
							when asg.grade = ''D'' then 8
							when asg.grade = ''Combo'' then 9
							when asg.grade = ''NG'' then 10
							else 11
						end as store_grade_priority,
					    paf.l0_name, 
					    l1_name, 
					    l2_name,
						product->>''size'' as size, 
					    article, 
					    store_name, 
					    channel
						' || _client_columns || '
					  FROM 
					    (
					      select 
					        l0_name, 
					        l1_name, 
					        l2_name, 
					        article,
							unnest(product_code_size_map) as product
							' || _client_columns || '
					      FROM 
					        inventory_smart.ph_master 
					      	' || _query_pa || '
							 and channel = ''' ||replace (_channel,',','')||'''
					    ) paf 
					    join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name 
						left join inventory_smart.article_store_grade asg using (store_code, article)
					    join (
					      select 
					        store_code, 
					        saf.store_name, 
					        saf.channel, 
					        saf.region 
					      FROM 
					        global.store_attributes_filter saf 
					      	' || _query_sa || '
					    ) saf using(store_code)
				) -- select * from product_master_filters_data
				, 
				constraint_data AS (
					select * from (
					  SELECT 
					    pmps.product_code, 
					    pmps.store_code,
						pmps.mapping_code,
					    l0_name, 
					    l1_name, 
					    l2_name, 
					    pmps.article, 
					    size, 
					    store_name, 
					    pmps.channel, 
					    c.wos, 
					    c.min_stock as min_store, 
					    c.max_stock as max_store, 
					    c.min_stock as min_store_sum, 
					    c.max_stock as max_store_sum, 
					    c.transit_time as transit_time_sum, 
					    email AS updated_by, 
						to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') as updated_at
	--					coalesce(c.updated_at, c.created_at) as updated_at
						' || _client_columns || '
					  FROM 
					    (select * from inventory_smart.constraint_master where channel = ''' || _channel || ''') c 
					    join product_master_filters_data pmps using(mapping_code, l0_name) 
					    LEFT JOIN global.user_master um on c.updated_by = um.user_code
						order by store_code, article asc
					)as a ' || _query_table_filters || '
				) select channel , mapping_code from constraint_data
			) b where b.mapping_code = t1.mapping_code 
				and t1.channel = '''||_channel||'''';
		
		-- update values whose max_store is less than min_store
		
		_store_invalid_max_query  := '
			update inventory_smart.constraint_master t1 
				set max_stock = t1.min_stock
			from (
			select 
				mapping_code,
				channel
			from inventory_smart.constraint_master cm 
			where cm.min_stock > cm.max_stock and cm.channel = '''||_channel||'''
			) t2 where t1.mapping_code = t2.mapping_code and t1.channel = '''||_channel||'''
		';
		
		raise notice '%', _query_combine;
		execute _query_combine;
		execute _store_invalid_max_query;
		OPEN $1 FOR EXECUTE _select_1;
		return $1;

	end
$function$
;