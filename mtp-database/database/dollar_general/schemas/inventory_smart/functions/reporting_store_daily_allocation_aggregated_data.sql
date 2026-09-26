--liquibase formatted sql
--changeset tarun.tyagi:reporting_store_daily_allocation_aggregated_data runOnChange:true stripComments:false splitStatements:false context:MTP-88383 labels:MTP-88383
--comment: MTP-88383 adding partition date condition for carfg table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, jsonb, jsonb, date);
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, product_attributes jsonb, store_attributes jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    _current_date character varying
    ) RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_store_details TEXT := '';
    _carfg_filter TEXT := '';
    _query_reserve_units TEXT := '';
    _query_allocations TEXT := '';
    _query_product_details TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
BEGIN
	_pm_filter := format('WHERE (created_at AT TIME ZONE ''America/Chicago'')::date = %L::date AND status = 3 AND is_deleted = false', _current_date);
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _carfg_filter := format('WHERE carfg.created_at >= ''%1$s 00:00:00-05''::timestamptz AND carfg.created_at < (''%1$s''::date + interval ''1 day'') AT TIME ZONE ''America/Chicago''', _current_date);
    ELSE
        _carfg_filter := format('WHERE carfg.created_at >= ''%1$s 00:00:00-05''::timestamptz AND carfg.created_at < (''%1$s''::date + interval ''1 day'') AT TIME ZONE ''America/Chicago''', (now() at time zone 'America/Chicago')::date);
    END IF;
   	_query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
   	
	IF _query_pa = '' THEN
        _query_pa := 'WHERE TRUE';
    END IF;
	IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;

	RAISE NOTICE 'query pm --> %', _pm_filter;
	RAISE NOTICE 'query sa --> %', _query_sa;
	RAISE NOTICE 'query sa --> %', _query_sa;

    _query_combine := '
		WITH allocation_cte AS
            (
                SELECT  1 AS id
					,carfg.article
                    ,carfg.store
                    ,carfg.allocation_code
                    ,carfg.retail_size_cd                                                                                              AS size
                    ,carfg.pack_dc_allocation
                    ,LEAST(carfg.allocated_total::int,GREATEST(0,carfg.min::int - carfg.oh_oo_intransit::int))                         AS min_units_allocated
                    ,carfg.allocated_total - LEAST(carfg.allocated_total::int,GREATEST(0,carfg.min::int - carfg.oh_oo_intransit::int)) AS wos_units_allocated
                FROM inventory_smart.create_allocation_result_flat_gurobi carfg
                JOIN
                (
                    SELECT  article
                    FROM global.product_attributes_filter ' || _query_pa || '
                ) paf
                ON paf.article = carfg.article
                JOIN
                (
                    SELECT  store_code
                    FROM global.store_attributes_filter ' || _query_sa || '
                ) saf
                ON saf.store_code = carfg.store
                JOIN
                (
                    SELECT  plan_code
                    FROM inventory_smart.plan_master ' || _pm_filter || '
                ) pm
                ON pm.plan_code = carfg.allocation_code
                ' || _carfg_filter || '
            ) 
            , flat_allocation_cte AS
            (
                SELECT  *
                    ,js.key AS dc_code
                    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
                    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
                    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) packs_available_qty
                FROM allocation_cte, jsonb_each
                (allocation_cte.pack_dc_allocation
                ) AS js
            )
            , flat_allocation_cte2 AS
            (
                SELECT  *
                FROM
                (
                    SELECT  fa.*
                        ,CASE WHEN pack_type is not null THEN pack_type
                                WHEN array_length(string_to_array(pack_type_id,''_''),1) > 2 THEN ''eaches''  ELSE ''packs'' END AS pack_type
                        ,coalesce(units_in_pack,1)                                                                             AS units_in_pack
                        ,packs_available_qty::integer * COALESCE(units_in_pack::integer,1)                                     AS available_qty
                        ,packs_allocated_qty::integer * COALESCE(units_in_pack::integer,1)                                     AS allocated_qty
                    FROM flat_allocation_cte fa
                    LEFT JOIN inventory_smart.dc_pack_configuration dpc 
                    USING (article, pack_type_id, size)
                ) a
                WHERE allocated_qty > 0
            )
            , dc_aggregate_cte AS
            (
                SELECT  id
					,article
					,SUM(available_qty) AS available_qty
				FROM ( 
                    SELECT  id
						,article
                        ,size
                        ,dc_code
                        ,TRUNC(MAX(available_qty)::numeric, 0) AS available_qty
                    FROM 
                        flat_allocation_cte2
                    GROUP BY 
                        id, article, size, dc_code
                ) a
				GROUP BY id, article
            )
            , allocation_aggregate_cte AS
            (
                SELECT  id,
					article,
					SUM(allocated_qty)       AS unit_allocated,
					SUM(min_units_allocated) AS min_unit_allocated,
					SUM(wos_units_allocated) AS wos_unit_allocated,
					count(distinct store)    AS store_count
                FROM 
                    flat_allocation_cte2
                GROUP BY 
                    id, article
			)
			, final_cte AS
			(
				SELECT 
					aa.id,
					aa.article,
					aa.unit_allocated,
					aa.min_unit_allocated,
					aa.wos_unit_allocated,
					aa.store_count,
					GREATEST(dca.available_qty - aa.unit_allocated, 0) AS dc_available,
					0 as reserve_quantity
				FROM 
					dc_aggregate_cte dca
				JOIN 
					allocation_aggregate_cte aa ON dca.article = aa.article
			)
			, final_cte2 AS
			(
				SELECT 	id
					,count(distinct article)  AS style_color_count
					,sum(unit_allocated)  AS unit_allocated
					,sum(dc_available)  AS dc_available
				FROM final_cte
				GROUP BY id
			)
			SELECT id
				,allocation_count
				,style_color_count
				,unit_allocated
				,dc_available
			FROM final_cte2
			JOIN (
				SELECT  id
					,COUNT(DISTINCT allocation_code) AS allocation_count
				FROM allocation_cte
				GROUP BY id
			) a
			USING (id);
	';

    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$
;
