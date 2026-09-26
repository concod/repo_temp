--liquibase formatted sql
--changeset rajan.sahu:replacing_lateral_join_with_cte_for_store_count_calculation runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-134746
--comment: replacing LATERAL join with CTE for store count calculation
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.create_store_transfer_configuration(text, jsonb, bool, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.create_store_transfer_configuration(_temp_tbl_name text, product_filter jsonb, store_store_transfer_flow boolean, _config jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql text;
	_pa_query text := '';
    _select_columns text := coalesce(_config->>'additional_select_columns', '');
    _optimisation_level text;
    _transfer_strategy text;
    extra_cte text := '';
    base_query text := $q$
        CREATE TABLE IF NOT EXISTS public.%I AS
        WITH paf_filtered AS (
            SELECT paf.*
            FROM global.product_attributes_filter paf %s
            and paf.active
        )%s
        SELECT
			distinct
            paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            ppm.ph_code,
            %s
            %s
        FROM paf_filtered paf
        join inventory_smart.ph_master ppm using(article)
        join (select distinct article from inventory_smart.article_inventory_dashboard aid where oh > 0) aid using (article)
        %s
    $q$;
    config_fields text;
    join_clause text;
BEGIN
	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    raise notice '_pa_query: %', _pa_query;
    EXECUTE format('DROP TABLE IF EXISTS public.%I', _temp_tbl_name);

    _optimisation_level := coalesce(_config->>'optimisation_level', '');
	_transfer_strategy := coalesce(_config->>'transfer_strategy', '');

    IF store_store_transfer_flow THEN
        extra_cte := $q$,
        stores_per_article_rule AS (
            SELECT
                aid2.article,
                sm.rule_id,
                COUNT(DISTINCT sm.source_store_code) AS total_stores
            FROM inventory_smart.store_mapping sm
            JOIN inventory_smart.article_inventory_dashboard aid2
              ON aid2.store_code = sm.source_store_code
             AND aid2.oh > 0
            GROUP BY aid2.article, sm.rule_id
        )
        $q$;
        config_fields := $q$
            stc.optimisation_level,
            stc.transfer_strategy,
            stc.transfer_rule_id,
            COALESCE(spar.total_stores, 0) AS total_stores,
            COALESCE(SUM(sdav.oh) OVER (PARTITION BY paf.article), 0) AS total_dc_inventory,
            NULLIF((stc.config_params ->> 'dc_inventory_threshold')::int, NULL) AS dc_inventory_threshold,
            NULLIF((stc.config_params ->> 'fixed_push_percent')::numeric, NULL) AS fixed_push_percent,
            NULLIF((stc.config_params ->> 'source_wos_threshold_multiplier')::float8, NULL) AS source_wos_threshold_multiplier,
            NULLIF((stc.config_params ->> 'dest_wos_threshold_multiplier')::float8, NULL) AS dest_wos_threshold_multiplier
        $q$;
        join_clause := '
        INNER JOIN inventory_smart.store_transfer_config stc ON stc.article = paf.article 
        LEFT JOIN inventory_smart.sku_dc_available_units sdav ON sdav.article = paf.article
        LEFT JOIN stores_per_article_rule spar
          ON spar.article = stc.article
         AND spar.rule_id = stc.transfer_rule_id';
    ELSE
        extra_cte := '';
        config_fields := $q$
            COALESCE(stc.optimisation_level, %L) AS optimisation_level,
            COALESCE(stc.transfer_strategy, %L) AS transfer_strategy,
            COALESCE(stc.transfer_rule_id, 6) AS transfer_rule_id,
            CASE WHEN stc.article IS NULL
                THEN COALESCE(stt.dc_inventory_threshold, 0)
                ELSE NULLIF((stc.config_params ->> 'dc_inventory_threshold')::int, NULL)
            END AS dc_inventory_threshold,
            CASE WHEN stc.article IS NULL
                THEN COALESCE(stt.fixed_push_percent, 0)
                ELSE NULLIF((stc.config_params ->> 'fixed_push_percent')::numeric, NULL)
            END AS fixed_push_percent,
            CASE WHEN stc.article IS NULL
                THEN COALESCE(stt.source_wos_threshold_multiplier, 0)
                ELSE NULLIF((stc.config_params ->> 'source_wos_threshold_multiplier')::float8, NULL)
            END AS source_wos_threshold_multiplier,
            CASE WHEN stc.article IS NULL
                THEN COALESCE(stt.dest_wos_threshold_multiplier, 0)
                ELSE NULLIF((stc.config_params ->> 'dest_wos_threshold_multiplier')::float8, NULL)
            END AS dest_wos_threshold_multiplier
        $q$;
        join_clause := '
        LEFT JOIN inventory_smart.store_transfer_config stc ON stc.article = paf.article 
        LEFT JOIN inventory_smart.store_transfer_thresholds stt ON stt.article = paf.article 
        WHERE (stc.article IS NOT NULL OR stt.article IS NOT NULL)';
    END IF;

    sql := format(base_query, _temp_tbl_name, _pa_query, extra_cte, _select_columns, config_fields, join_clause);
    sql := format(sql, _optimisation_level, _transfer_strategy);
    raise notice 'MAIN_QUERY : %', sql;
	EXECUTE sql;

END;
$function$
;