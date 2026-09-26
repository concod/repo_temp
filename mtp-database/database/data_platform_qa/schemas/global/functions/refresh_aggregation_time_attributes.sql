--liquibase formatted sql
--changeset akshay@impactanalytics.co:refresh_aggregation_time_attributes_updated_at runOnChange:true stripComments:false splitStatements:false context:refresh_aggregation_time_attributes_inline labels:refresh_aggregation_time_attributes_updated
--comment: handled updatation of updated by and at info in refresh logic
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.refresh_aggregation_time_attributes(input text[]);
DROP FUNCTION IF EXISTS global.refresh_aggregation_time_attributes(input text[], text[]);
CREATE OR REPLACE FUNCTION global.refresh_aggregation_time_attributes(input text[], text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_query text;
 	_dc_store_map_query text;
 	_keys text[] := array['created_by']::text[];
 	_prod_lst text[] := array[$1]::text[];
 	_agg_lst text[] := array[]::text[];
 	_store_code varchar;
 	_dc_code int;
 	_dc_name varchar;
 	_agg_level_db text;
 	_del_query text;
 	l0_name_lst text[] := array[$2]::text[];
 	l0_name_phrase text := ' ';
 	begin
	 	if $2 is not null then 
	 		l0_name_phrase :=  ' and l0_name in (' || ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(l0_name_lst) elem), ',') || ') ';
	 	end if;
	 	raise notice 'test % ', l0_name_phrase; 
	 	_agg_level_db := global.fetch_aggregation_level();
	 	if _agg_level_db is not null and _agg_level_db <> 'product_code'
	 	then
		 	 _query:= 'SELECT array(select DISTINCT ' || _agg_level_db || ' FROM global.product_attributes_filter WHERE product_code IN (' || ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_prod_lst) elem), ',') || '))';
		 	raise notice 'reached here %', _query;
			EXECUTE _query INTO _agg_lst;
			_del_query = 'delete from global.aggregation_time_attributes where aggregation_code in (' || ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_agg_lst) elem), ',') || ') and attribute_name = ''status''';
			raise notice 'delete here %', _del_query;
			execute _del_query;
		 	--delete from global.aggregation_time_attributes where aggregation_code in (ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_agg_lst) elem), ',')) and attribute_name = 'status';
		 	raise notice 'reached here %', _agg_lst;
		 	_query:= 'WITH article_product_map AS (
					        SELECT max(product_code) as product_code, ' || _agg_level_db || ' 
					        FROM global.product_attributes_filter 
					        WHERE ' || _agg_level_db  || ' in (' ||  ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_agg_lst) elem), ',') || 
					    ') and is_deleted is False group by ' || _agg_level_db ||' ), article_level_status AS (
					        SELECT 
					            ' || _agg_level_db || ',
					            psl.product_code,
					            attribute_name,
					            attribute_value,
					            start_time,
					            end_time,
								updated_by,
								updated_at
					        FROM 
					            article_product_map apm
					            JOIN global.product_time_attributes psl ON apm.product_code = psl.product_code and psl.attribute_name = ''status'' ' || l0_name_phrase || 
					    ' )
					    INSERT INTO global.aggregation_time_attributes (aggregation_code, attribute_name, attribute_value, start_time, end_time, updated_by, updated_at)
					    SELECT 
					        ' || _agg_level_db || ',
					        attribute_name,
					        attribute_value,
					        start_time,
					        end_time,
							updated_by,
							max(updated_at)
					    FROM 
					        article_level_status
					    GROUP BY 
					        ' || _agg_level_db || ', attribute_name, attribute_value, start_time, end_time, updated_by';
					raise notice 'recdcsd %', _query;
					execute _query;
					
					end if;
		--raise notice 'recdcsd %', _query;
	 	
 	end $function$
;
