--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_strategies_union_query_from_agg_tables_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_create_strategies_union_query_from_agg_tables
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_create_strategies_union_query_from_agg_tables;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategies_union_query_from_agg_tables(strategy_ids integer[], table_type text, start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS TABLE(strategy_id integer, product_level_id integer, store_level_id integer, recommendation_date date, recommended_offer_percentage double precision, effective_price_point double precision, pcd_id integer, sales_units double precision, margin double precision, revenue double precision, status smallint, created_at timestamp with time zone, updated_at timestamp with time zone, created_by integer, updated_by integer, rem_inv double precision, spend double precision)
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
        execute tables_select_name_query into table_names;

        FOREACH strategy_id IN ARRAY strategy_ids
        loop
            if table_names.table_count = 0 or not FORMAT('tb_%s_agg_%s', strategy_id::text, table_type) = any(table_names.table_names) then
                continue;
            end if;

            table_name := FORMAT(table_name_format,strategy_id::text,table_type);
            query := 'select strategy_id, product_level_id, store_level_id, recommendation_date, recommended_offer_percentage, effective_price_point, pcd_id, sales_units, margin, revenue, status, created_at, updated_at, created_by, updated_by, rem_inv, spend from ' || table_name;
            if start_date is not null and end_date is not null then
                query := query || Format(' where recommendation_date between %L and %L', start_date, end_date);
            elsif start_date is not null then
                query := query || Format(' where recommendation_date >= %L', start_date);
            elsif end_date is not null then
                query := query || Format(' where recommendation_date <= %L', end_date);
            end if;
            raise notice 'Query: %',query;
            final_union_query := final_union_query || query || ' union all ';
        END LOOP;
        final_union_query = left(final_union_query,length(final_union_query)-11);
    else
        final_union_query = 'SELECT null::integer, null::integer, null::integer, null::date, null::double precision, null::double precision, null::integer, null::double precision, null::double precision, null::double precision, null::smallint, null::timestamp with time zone, null::timestamp with time zone, null::integer, null::integer, null::double precision, null::double precision';
    END IF;

    if final_union_query = '' then -- In case if one strategy_id is received as param, and it doesent have requisted table_metrics, then this case will hit.
        final_union_query = 'SELECT null::integer, null::integer, null::integer, null::date, null::double precision, null::double precision, null::integer, null::double precision, null::double precision, null::double precision, null::smallint, null::timestamp with time zone, null::timestamp with time zone, null::integer, null::integer, null::double precision, null::double precision';
    end if;
    return query execute final_union_query;
END;
$function$
;
