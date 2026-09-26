--liquibase formatted sql
--changeset tarun.tyagi:reporting_daily_allocation_store_list runOnChange:true stripComments:false splitStatements:false context:MTP-63210 labels:MTP-63210
--comment: updated instock logic in the store list query based on MTP-63210 query updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_store_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_store_list(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    table_filters jsonb,
    _current_date character varying
) RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_combine TEXT := '';
    _pm_filter text := '';
    _query_table_filters TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object('store_attributes', store_attributes, '_current_date', _current_date);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.plan_master', 'global.store_attributes_filter', 'inventory_smart.article_inventory_dashboard', 'inventory_smart.create_allocation_result_flat_gurobi'];
BEGIN
    raise notice '%', store_attributes->>'channel';
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE created_at  >= %L AT TIME ZONE ''America/New_York'' and  created_at  <= %L AT TIME ZONE ''America/New_York'' + interval ''1 DAY''', _current_date, _current_date);
    ELSE
		_pm_filter := format('WHERE created_at  >= %L AT TIME ZONE ''America/New_York'' and  created_at  <= %L AT TIME ZONE ''America/New_York'' + interval ''1 DAY''', now(), now());
    END IF;
    
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_table_filters := global.form_table_query(table_filters);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE TRUE';
    END IF;
	IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
    
    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;
    
    _query_combine := '
        WITH plan_master AS
        (
            SELECT  plan_code
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ''America/New_York'')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false 
        ), product_details AS
        (
            SELECT article
                ,style
                ,style_description
                ,l0_name
                ,l1_name
                ,l2_id
                ,l3_id
                ,l4_id
            FROM global.product_attributes_filter
            ' || _query_pa || '
            group by 1, 2, 3, 4, 5, 6, 7, 8
        ), store_details AS
        (
            SELECT  store_code AS store_number
                ,store_name
                ,country
                ,channel
                ,store_concept
                ,q_str_grade
            FROM global.store_attributes_filter
            ' || _query_sa || '
        ) , allocations_calc_base AS
        (
            SELECT  p.*
                ,least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) AS min_allocation
            FROM inventory_smart.create_allocation_result_flat_gurobi p
            ' || _pm_filter || '
            and exists ( SELECT 1 FROM plan_master where plan_code = allocation_code)
            and exists (select 1 from product_details paf where paf.article = p.article)
        ), daily_inv AS
        (
            SELECT  aid.article
                ,aid.store_code
                ,total_inv                                                             AS str_inv
                ,CASE WHEN wos_oh_oo_it != 0 THEN total_inv / wos_oh_oo_it  ELSE 0 END AS daily_inv
            FROM inventory_smart.article_inventory_dashboard aid
        ), wos_units AS
        (
            SELECT  a.article
                ,a.store_code
                ,allocated_total
                ,CASE WHEN coalesce(daily_inv,0) != 0 THEN allocated_total/coalesce(daily_inv,0)  ELSE 0 END AS wos_units_allocated
            FROM
            (
                SELECT  article
                    ,store                            AS store_code
                    ,SUM(COALESCE(allocated_total,0)) AS allocated_total
                FROM allocations_calc_base
                GROUP BY  1
                        ,2
            ) a
            LEFT JOIN
            daily_inv b using(article, store_code)
        ), allocation_aggregated AS
        (
            SELECT  saf.country
                ,saf.channel
                ,b.allocation_code
                ,b.article
                ,saf.store_number
                ,saf.q_str_grade                      AS store_grade
                ,saf.store_name
                ,saf.store_concept
                ,COALESCE(SUM(b.allocated_total),0)   AS units_allocated
                ,coalesce(SUM(min_allocation),0)      AS min_units_allocation
                ,AVG(coalesce(wos_units_allocated,0)) AS wos_units_allocation
                ,COALESCE(SUM(oh),0)                  AS oh
                ,COALESCE(SUM(oo),0)                  AS oo
                ,COALESCE(SUM(it),0)                  AS it
                ,coalesce (SUM(oh_oo_intransit),0)    AS total_inventory
            FROM allocations_calc_base b
            INNER JOIN store_details saf
            ON saf.store_number = b.store
            LEFT JOIN wos_units c
            ON c.store_code = b.store AND c.article = b.article
            GROUP BY  saf.country
                    ,saf.channel
                    ,allocation_code
                    ,b.article
                    ,store
                    ,q_str_grade
                    ,saf.store_name
                    ,saf.store_number
                    ,store_concept
        )
        SELECT  aa.country
            ,aa.channel
            ,COALESCE(aa.store_grade,'''')                                                                                                  AS store_grade
            ,COALESCE(aa.store_concept,'''')                                                                                                AS store_concept
            ,aa.store_number
            ,aa.store_name
            ,SUM(aa.units_allocated)                                                                                                      AS units_allocated
            ,SUM(aa.min_units_allocation)                                                                                                 AS min_units_allocation
            ,CASE WHEN SUM(aa.units_allocated) != 0 THEN SUM(aa.units_allocated*wos_units_allocation)/SUM(aa.units_allocated)  ELSE 0 END AS wos_units_allocation
            ,SUM(aa.oh)                                                                                                                   AS oh
            ,SUM(aa.it)                                                                                                                   AS it
            ,SUM(aa.oo)                                                                                                                   AS oo
            ,SUM(aa.total_inventory)                                                                                                      AS total_inventory
            ,aa.store_number                 AS key
        FROM plan_master pm
        INNER JOIN allocation_aggregated aa
        ON pm.plan_code = aa.allocation_code
        GROUP BY  aa.country
                ,aa.channel
                ,aa.store_grade
                ,aa.store_concept
                ,aa.store_number
                ,aa.store_name
    ';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_store_list', 'Before returning function value',_query_combine,jsonb_build_object('store attributes',$3,'table_filters',$3,'_current_date',$4)) ;		

    RETURN input;
END
$function$;
