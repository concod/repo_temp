--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:constraints_store_bulk_update_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release 2_5_5 labels:MTP-41818
--comment: MTP-41818
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(input refcursor, jsonb, jsonb, text, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(input refcursor, jsonb, jsonb, text, text, text, text, integer, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_bulk_update_by_filters(input refcursor, jsonb, jsonb, text, text, text, text, integer, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	declare
 	_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
 	_l0_name1 text;
 	_1_text text;
 	_tq jsonb := (($9 - 'sort') - 'limit');
 	_query_table_filters text;
 	_search_query text;
 	_channel text[] := inventory_smart.get_channel_from_input_new($3);
 	_store_invalid_max_query text;
 	_update_column text= ' ';
 	_query_combine text =' ';
 	_channel_where_condition text;
 	_channel_and_conditions text;
 	_channel_max_invalid_conditions text;
 	_query_pa text := '';
    _query_sa text := '';
   	_statement_cte_1 text := '';
   	_where_clause_cte_1 text := '';
    _select_1 text := 'select 1 as success';
    _final_select_cte text := '';
    _count_value jsonb;
   	_result jsonb := null;
 	begin 
	 	
	_query_pa := global.form_main_table_filters(
    'product_attributes_filter',
    $2
    );
    _query_sa := global.form_main_table_filters(
    'store_attributes_filter',
    $3
    );
	 	_query_table_filters := global.form_table_query(_tq);
	 	raise notice '_query_table_filters%',_query_table_filters;
	 	if length (_query_table_filters)>0 then 
	 		--_search_query:= 
	 		
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
				
				raise notice '_update_column%',_update_column;

				if $10 ilike 'record_count' then 
					_statement_cte_1 := 'with count as (select count(distinct mapping_code) as record_count, count(distinct product_code) as sku_count';
					_where_clause_cte_1 := '';
					_final_select_cte := ') select jsonb_build_object(''record_count'', record_count, ''sku_count'', sku_count) as count from count';
		
				else
					_statement_cte_1 := 'update inventory_smart.constraint_validity_master t1 set ' || _update_column ;
					_where_clause_cte_1 := ' where t1.product_code= x.product_code and t1.store_code=x.store_code and 
							t1.l0_name =x.l0_name';
					_final_select_cte := '';
				end if;
			
				_query_combine := 
			 		_statement_cte_1 ||'
					 from (select x.product_code,x.store_code,l0_name, mapping_code from (
						  select *
						  from 
						  (
						    select paf.product_code,
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
						 saf.district,
						 saf.store_code,
						 saf.store_name,
						 saf.channel,
						 saf.dma_name as dma,
						  cm.wos,
						 	cm.min_stock as min_store,
						 	cm.max_stock as max_store,
						 	cm.min_stock as min_store_sum,
						 	cm.max_stock as max_store_sum,
						 	cm.transit_time,
						 	um.email AS updated_by,
						  cm.mapping_code
						  from inventory_smart.constraint_validity_master cm  join
						  (select *, article as product_code from inventory_smart.ph_master ' || _query_pa || ') paf
						  using (product_code)
						  join (select * from global.store_attributes_filter saf  ' || _query_sa || ') saf
						  using (store_code)
						  left join global.user_master um on 
						  um.user_code= cm.updated_by
						  where cm.mapping_code is not null
						  ) paf ' ||_query_table_filters|| ' )x
						  ) x  '|| _where_clause_cte_1||'
							
						'||_final_select_cte||' 
						';
						
					raise notice '_search_query%',_query_combine;	
				
					if cardinality(_channel) = 0 then
					raise notice 'no channel passs %,',_channel;
					_channel_where_condition = ' ';
					_channel_and_conditions = ' ';
					_channel_max_invalid_conditions = ' where cm.min_stock > cm.max_stock and cm.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])';
					else
					_channel_where_condition = ' where c.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
					_channel_and_conditions = ' and t1.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
					_channel_max_invalid_conditions = ' where cm.min_stock > cm.max_stock and cm.channel in (''' || array_to_string(_channel, ''',''', '') || ''') and cm.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])';
					end if;
				
				_store_invalid_max_query := '
					 update inventory_smart.constraint_validity_master t1
					 set max_stock = t1.min_stock
					 from (
					 select
					 mapping_code,
					 channel,
					 l0_name
					 from inventory_smart.constraint_validity_master cm
					 '||_channel_max_invalid_conditions||'
					 ) t2 where t1.l0_name = any('''|| concat(_l0_name) ||'''::varchar[]) and t1.mapping_code = t2.mapping_code and t1.l0_name = t2.l0_name';
					raise notice '_store_invalid_max_query %', _store_invalid_max_query;
					raise notice '%', _query_combine;
					
					if $10 ilike 'record_count' then
						OPEN $1 FOR EXECUTE _query_combine;
						return $1;
						close $1;
					else 
						execute _query_combine;
						execute _store_invalid_max_query;
						OPEN $1 FOR EXECUTE _select_1;
						return $1;
					end if;
	 	end if;
	 	
	 	if length (_query_table_filters)=0 then
	 		if $10 ilike 'record_count' then
	 			open $1 FOR SELECT constraints_store_bulk_update as count from inventory_smart.constraints_store_bulk_update('xyz', $2,$3,$4,$5,$6,$7,$8,$9,$10);
	 			return $1;
	  		end if;
			 	for _l0_name1 in 
	 				select unnest (_l0_name) 
	 				loop
 	
	 					_1_text := ' [ {"type": "list","operator": "in", "values": [ "'||_l0_name1||'"] } ]';
	     				raise notice 'after%',_1_text::text;	
	    
	    				$2:= jsonb_set($2,'{l0_name}',to_jsonb(_1_text) , true);
	    			
	    				IF FOUND THEN
        					CLOSE $1;
    					END IF;
	   
	   	 				--raise notice 'after%',$1::text;
	  	
	  					select constraints_store_bulk_update as count from inventory_smart.constraints_store_bulk_update('xy', $2,$3,$4,$5,$6,$7,$8,$9,$10) into _result;				
	  					--FETCH $1 INTO ;
	  					open $1 for select _result;
	  					
	  					raise notice '_result %', _result;		
 				end loop;
 	  	end if;
 	  	raise notice '_result outside %', _result;	
 	    RAISE NOTICE '_result type: %', pg_typeof(_result);
 	 	return $1;
 	  end
 $function$
;