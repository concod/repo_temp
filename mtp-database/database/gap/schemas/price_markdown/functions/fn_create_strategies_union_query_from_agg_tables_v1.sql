--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_strategies_union_query_from_agg_tables_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_create_strategies_union_query_from_agg_tables_v1
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_create_strategies_union_query_from_agg_tables_v1;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategies_union_query_from_agg_tables_v1(strategy_ids integer[], table_type text, in_pcd_ids integer[] DEFAULT NULL::integer[], start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS text
	LANGUAGE plpgsql
AS $function$

DECLARE
    strategy_id integer;
    table_name text;
    final_union_query text := '';
    table_name_format text := 'price_markdown.tb_%s_agg_%s';
    query text;
   
    table_schema text := 'price_markdown';
    required_table_type text :=  concat('%_agg_', table_type);
    tables_select_name_format text :=  'SELECT array_agg(table_name) as table_names, count(*)as table_count FROM information_schema.tables  WHERE table_schema = ''%s'' and table_name like ''%s''';
    tables_select_name_query text;
    table_names record;
begin
    IF array_length(strategy_ids, 1) > 0 then
        tables_select_name_query = FORMAT(tables_select_name_format, table_schema, required_table_type);
       	raise notice ' tables_select_name_query --- %', tables_select_name_query;
        execute tables_select_name_query into table_names;
        
        FOREACH strategy_id IN ARRAY strategy_ids
        loop 
            if table_names.table_count = 0 or not FORMAT('tb_%s_agg_%s', strategy_id::text, table_type) = any(table_names.table_names) then
            	raise notice 'inside if condition ------';
                continue;
            end if;
            
            table_name := FORMAT(table_name_format,strategy_id::text,table_type);
           	raise notice ' table_name --- %', table_name;
            query := 'select strategy_id, product_level_id, store_level_id, recommendation_date, recommended_offer_percentage, effective_price_point, pcd_id, sales_units, margin, revenue, status, created_at, updated_at, created_by, updated_by, rem_inv, spend from ' || table_name;
            if start_date is not null and end_date is not null then
                query := query || Format(' where recommendation_date between %1$L and %2$L and pcd_id = any(%3$L)', start_date, end_date, in_pcd_ids);
            elsif start_date is not null then  
                query := query || Format(' where recommendation_date >= %1$L and pcd_id = any(%3$L)', start_date,in_pcd_ids);
            elsif end_date is not null then 
                query := query || Format(' where recommendation_date <= %1$L and pcd_id = any(%3$L)', end_date,in_pcd_ids);
            end if;
            raise notice 'Query: %',query;
            final_union_query := final_union_query || query || ' union all ';
        END LOOP;
        final_union_query = left(final_union_query,length(final_union_query)-11);
    else
        final_union_query = 'SELECT null::integer, null::integer, null::integer, null::date, null::double precision, null::double precision, null::integer, null::double precision, null::double precision, null::double precision, null::smallint, null::timestamp with time zone, null::timestamp with time zone, null::integer, null::integer, null::double precision, null::double precision';
    END IF;
   
   	raise notice ' final union query %', final_union_query;
    if final_union_query = '' then -- In case if one strategy_id is received as param, and it doesent have requisted table_metrics, then this case will hit.
        final_union_query := 'SELECT null::integer strategy_id,null::integer product_level_id, null::integer store_level_id, 
		null::date recommendation_date, null::double precision recommended_offer_percentage,null::double precision effective_price_point, 
		null::integer pcd_id,  null::double precision, null::double precision sales_units, null::double precision margin,
		null::double precision revenue,null::smallint status,null::timestamp with time zone created_at,null::timestamp with time zone updated_at, 
		null::integer created_by,null::integer updated_by,null::double precision rem_inv, null::double precision spend';
end if;
	final_union_query := format('(%1$s)' , final_union_query);
	raise notice 'final_union_query -- %' , final_union_query;
    return  final_union_query;
END;
$function$
;