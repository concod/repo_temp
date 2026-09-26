--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:constraints_store_bulk_update_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release 2.0 labels:constraints_store_bulk_update_by_filters
--comment: convert SP to like wrapper to process data for each department
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_bulk_update_by_filters(jsonb, jsonb, text, text, text, text, integer, text, jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
	_l0_name text[] := inventory_smart.get_l0_name_from_input($1);
	_l0_name1 text;
	_1_text text;
	_tq jsonb := (($10 - 'sort') - 'limit');
	_query_table_filters text;
	_search_query text;
	_channel text[] := inventory_smart.get_channel_from_input_new($2);
	_store_invalid_max_query text;
	_update_column text = ' ';
	_query_combine text = ' ';
	_channel_where_condition text;
	_channel_and_conditions text;
	_channel_max_invalid_conditions text;
	_query_pa text := '';
	_query_sa text := '';
	_query_mapping text := '';
	_query_sg text := '';
BEGIN
	_query_pa := global.form_main_table_filters('product_attributes_filter', $1);
	_query_sa := global.form_main_table_filters('store_attributes_filter', $2);
	_query_mapping := global.form_main_table_filters('product_attributes_filter', $9);
	_query_table_filters := global.form_table_query(_tq);
	
	RAISE NOTICE '_query_table_filters%', _query_table_filters;
	
	IF length(_query_table_filters) > 0 THEN
		IF length($4) > 0 THEN
			_update_column := _update_column || ' min_stock = ' || $4::int || ',';
		END IF;
		IF length($5) > 0 THEN
			_update_column := _update_column || ' max_stock = ' || $5::int || ',';
		END IF;
		IF length($6) > 0 THEN
			_update_column := _update_column || ' wos = ' || $6::int || ',';
		END IF;
		
		_update_column := _update_column || ' updated_at = now(), updated_by = ' || $7;
	
		IF $8 <> '' then
			_query_sg := 'where exists (select 1 from (select store_code, article from inventory_smart.article_store_grade where grade = '''||$8||''') arf where (store_code,article) = (paf.store_code,paf.article))';
		else
			_query_sg := 'where not exists (select 1 from (select store_code, article from inventory_smart.article_store_grade) arf where (store_code,article) = (paf.store_code,paf.article))';
		END IF;

		
		_query_combine := '
			UPDATE inventory_smart.constraint_master t1
			SET ' || _update_column || '
			FROM (
				SELECT paf.product_code, paf.store_code, paf.l0_name
				FROM (
						SELECT
							paf.product_code,
							paf.l0_name,
							paf.article,
							saf.store_code,
							asg.grade as store_grade,
							cm.min_stock as min_store, 
 					    	cm.max_stock as max_store, 
 					    	cm.min_stock as min_store_sum, 
 					    	cm.max_stock as max_store_sum, 
							email AS updated_by, 
 							to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') as updated_at
						FROM (select * from inventory_smart.constraint_master '||_query_mapping||')  cm
						JOIN (SELECT * FROM global.product_attributes_filter ' || _query_pa || ') paf
						USING (product_code, l0_name)
						LEFT JOIN (SELECT * FROM global.store_attributes_filter saf ' || _query_sa || ') saf
						USING (store_code)
						left join inventory_smart.article_store_grade asg on cm.store_code = asg.store_code and paf.article = asg.article
						LEFT JOIN global.user_master um
						ON um.user_code = cm.updated_by
						' || _query_table_filters || ' 
					) paf
					 '||_query_sg||'
				) x
				WHERE t1.product_code = x.product_code
					AND t1.store_code = x.store_code
					AND t1.l0_name = x.l0_name';
				
		RAISE NOTICE '_search_query%', _query_combine;
		
		IF cardinality(_channel) = 0 THEN
			RAISE NOTICE 'no channel passed %,', _channel;
			_channel_where_condition := ' ';
			_channel_and_conditions := ' ';
			_channel_max_invalid_conditions := ' WHERE cm.min_stock > cm.max_stock AND cm.l0_name IN (''' || array_to_string(_l0_name, ''',''') || ''')';
		ELSE
			_channel_where_condition := ' WHERE c.channel IN (''' || array_to_string(_channel, ''',''') || ''')';
			_channel_and_conditions := ' AND t1.channel IN (''' || array_to_string(_channel, ''',''') || ''')';
			_channel_max_invalid_conditions := ' WHERE cm.min_stock > cm.max_stock AND cm.channel IN (''' || array_to_string(_channel, ''',''') || ''') AND cm.l0_name IN (''' || array_to_string(_l0_name, ''',''') || ''')';
		END IF;
		
		_store_invalid_max_query := '
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
        raise notice '_store_invalid_max_query %', _store_invalid_max_query;
		RAISE NOTICE '%', _query_combine;
		
		EXECUTE _query_combine;
		EXECUTE _store_invalid_max_query;
	END IF;
	
	IF length(_query_table_filters) = 0 THEN
		FOR _l0_name1 IN SELECT unnest(_l0_name)
		LOOP
			_1_text := ' [ {"type": "list","operator": "in", "values": [ "' || _l0_name1 || '"] } ]';
			RAISE NOTICE 'after%', _1_text::text;
			$1 := jsonb_set($1, '{l0_name}', to_jsonb(_1_text), true);
			RAISE NOTICE 'after%', $1::text;
			PERFORM inventory_smart.constraints_store_bulk_update($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
		END LOOP;
	END IF;
END
$function$
;