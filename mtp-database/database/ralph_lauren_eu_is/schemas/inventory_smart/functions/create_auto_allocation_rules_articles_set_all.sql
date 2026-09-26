--liquibase formatted sql
--changeset subhrajit.makur:create_alloc_rules_exceptions_sql_change runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start_and_added_unique_on_article_mod
--comment: initial changeset for create_auto_allocation_rules_articles_set_all added Unique on Article alterations fix sql format
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.create_auto_allocation_rules_articles_set_all(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.create_auto_allocation_rules_articles_set_all(input refcursor, jsonb, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_ph text := inventory_smart.form_main_table_filters('ph_master', $2);
    _channel text[] := inventory_smart.get_channel_from_input_new($3);
    _channel_and_postfix_condition text := '';
    _channel_pcm_where_condition text := '';
    _channel_and_prefix_condition text := '';
    _query_combine text;
    _sql text;
    _result text;
    _record_count int;
    _query_rule_details jsonb := $5; 
    article_record RECORD; 
   inputs text;
BEGIN
    IF cardinality(_channel) = 0 THEN
        RAISE NOTICE 'No channel passed: %', _channel;
    ELSE
        _channel_and_postfix_condition := ' channel in (''' || array_to_string(_channel, ''',''') || ''') and ';
        _channel_pcm_where_condition := ' where pcm.channel in (''' || array_to_string(_channel, ''',''') || ''')';
        _channel_and_prefix_condition := ' and ph.channel in (''' || array_to_string(_channel, ''',''') || ''')';
    END IF;

    _query_combine := FORMAT('SELECT distinct article FROM (SELECT ph.* FROM inventory_smart.ph_master ph %s %s) AS x %s',
                            _query_ph, _channel_and_prefix_condition, global.form_table_query($4));
    
   	-- raise notice '% _query_combine', _query_combine;
    
   	_result := 'select jsonb_build_object(''record_count'', _record_count, ''sku_count'', _record_count) as count from ( SELECT count(1) as _record_count FROM (' || _query_combine || ') AS subquery) as a' ;

    if $6 ilike 'record_count' then 
        OPEN input FOR EXECUTE _result;
       
    else  
    	OPEN input FOR execute _query_combine;
    	inputs = input ;
        loop
            FETCH input INTO article_record;
            EXIT WHEN NOT FOUND; 
            
			_sql := FORMAT('INSERT INTO inventory_smart.alloc_rule_product_mapping(rule_code, article, is_active, created_at, updated_by, created_by)
			                VALUES(%L, %L, %L, NOW()::timestamptz, %L, %L)
			                ON CONFLICT (article) DO UPDATE SET
			                    rule_code = EXCLUDED.rule_code,
			                    is_active = EXCLUDED.is_active,
			                    updated_at = NOW()::timestamptz,
			                    updated_by = EXCLUDED.updated_by',
			                COALESCE(_query_rule_details->>'rule_code', 'NULL'),
			                article_record.article,
			                COALESCE(_query_rule_details->>'is_active', 'NULL'),
			                COALESCE(_query_rule_details->>'updated_by', 'NULL'),
			                COALESCE(_query_rule_details->>'created_by', 'NULL')
			               );


	 		EXECUTE _sql;
        END LOOP;
       CLOSE input;
       OPEN input FOR EXECUTE _result;
    end if;
   
	RETURN inputs;
    
END;
$function$;