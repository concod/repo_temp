--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_postprocess_create_gurobi_tb_versions_26022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_postprocess_create_gurobi_tb_versions

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_create_gurobi_tb_versions;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_create_gurobi_tb_versions(
    IN _gurobi_input_table text,
    IN _currency_type text,
    IN _sku_store text,
    IN _store_master text,
    IN _price_points text,
    IN _forex_table text,
    IN _strategy_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	local_query TEXT;
	dominating_query TEXT;
    global_query TEXT;

    v_local_table   TEXT := _gurobi_input_table || '_local_' || _strategy_id;
    v_dom_table     TEXT := _gurobi_input_table || '_dominating_' || _strategy_id;
    v_global_table  TEXT := _gurobi_input_table || '_global_' || _strategy_id;
    _input_table     TEXT := _gurobi_input_table || '_' || _strategy_id;

BEGIN
    IF _currency_type = 'local' THEN

        -- Create Local table
		EXECUTE format('DROP TABLE IF EXISTS %1$s', v_local_table);
		
		local_query = format('CREATE TABLE %1$s AS SELECT * FROM %2$s', v_local_table, _input_table);
        RAISE NOTICE 'Creating Local table from input: %', local_query;
		EXECUTE local_query;


        -- Create DOMINATING table
        EXECUTE format('DROP TABLE IF EXISTS %1$s', v_dom_table);

        dominating_query = format(
            'CREATE TABLE %1$s AS
            WITH inp AS (
                SELECT product_level_id::int4, store_level_id::int4, event::bigint, stat_id::int4
                FROM %2$s
            ),
            mapped AS (
                SELECT
                    i.product_level_id, i.store_level_id, i.event, i.stat_id,
                    m.product_id, m.store_id,
                    m.price_with_vat::float8 AS local_base_price_with_vat,
                    sm.currency_id::bigint AS local_currency_id,
                    sm.s0_id AS territory_id, sm.s1_id AS country_id
                FROM inp i
                JOIN %3$s_%7$s m ON m.product_level_id = i.product_level_id AND m.store_level_id = i.store_level_id
                JOIN %4$s sm ON sm.store_id = m.store_id
            ),
            dom_curr AS (
                SELECT DISTINCT territory_id, country_id, dominating_currency_id::bigint AS dom_currency_id
                FROM global.tb_country_currency_mapping
            ),
            dom_pp AS (
                SELECT stat_id::int4, currency_id::bigint, currency_value::float8 AS eff_spwvat
                FROM %5$s
            ),
            fx AS (
                SELECT source_currency_id::bigint, target_currency_id::bigint, planned_conversion_multiplier::float8 AS mult
                FROM %6$s
				WHERE date = (select max(date) from %6$s)
            ),
            expanded AS (
                SELECT distinct
                    m.product_level_id, m.store_level_id, m.event, m.stat_id,
                    dc.dom_currency_id,
                    (m.local_base_price_with_vat * f.mult) AS local_base_in_dom,
                    dp.eff_spwvat AS dom_spwvat
                FROM mapped m
                JOIN dom_curr dc ON dc.country_id = m.country_id AND dc.territory_id = m.territory_id
                JOIN fx f ON f.source_currency_id = m.local_currency_id AND f.target_currency_id = dc.dom_currency_id
                JOIN dom_pp dp ON dp.stat_id = m.stat_id AND dp.currency_id = dc.dom_currency_id
            ),
            roll AS (
                SELECT
                    e.product_level_id, e.store_level_id, e.event, e.stat_id,
                    MIN(e.dom_currency_id)::bigint AS currency_id,
                    AVG(e.local_base_in_dom)::float8 AS avg_local_base_in_dom,
                    AVG(e.dom_spwvat)::float8 AS avg_dom_spwvat
                FROM expanded e
                GROUP BY e.product_level_id, e.store_level_id, e.event, e.stat_id
            )
            SELECT
                r.product_level_id::int4, r.store_level_id::int4, r.event,
                ''percent_off_'' || ROUND((1 - r.avg_dom_spwvat / NULLIF(r.avg_local_base_in_dom, 0)) * 100)::int AS offer_identifier,
                r.currency_id, r.stat_id,
                r.avg_dom_spwvat::float4 AS effective_price_point,
                ROUND((1 - r.avg_dom_spwvat / NULLIF(r.avg_local_base_in_dom, 0)) * 100)::float8 AS base_percentage
            FROM roll r;',
            v_dom_table, _input_table, _sku_store, _store_master, _price_points, _forex_table, _strategy_id
        );

        RAISE NOTICE 'Executing Dominating SQL query %', dominating_query;
        EXECUTE dominating_query;

        -- Create GLOBAL table
        EXECUTE format('DROP TABLE IF EXISTS %1$s', v_global_table);

        global_query := format(
            'CREATE TABLE %1$s AS
            WITH inp AS (
                SELECT product_level_id::int4, store_level_id::int4, event::bigint, stat_id::int4
                FROM %2$s
            ),
            mapped AS (
                SELECT
                    i.product_level_id, i.store_level_id, i.event, i.stat_id,
                    m.product_id, m.store_id,
                    m.price_with_vat::float8 AS local_base_price_with_vat,
                    sm.currency_id::bigint AS local_currency_id,
                    sm.s0_id AS territory_id, sm.s1_id AS country_id
                FROM inp i
                JOIN %3$s_%7$s m ON m.product_level_id = i.product_level_id AND m.store_level_id = i.store_level_id
                JOIN %4$s sm ON sm.store_id = m.store_id
            ),
            ccm_default AS (
                SELECT DISTINCT territory_id, country_id, default_currency_id::bigint AS default_currency_id
                FROM global.tb_country_currency_mapping
            ),
            glob_pp AS (
                SELECT stat_id::int4, currency_id::bigint,country_id::bigint, currency_value::float8 AS eff_spwvat
                FROM %5$s
            ),
            fx AS (
                SELECT source_currency_id::bigint, target_currency_id::bigint, planned_conversion_multiplier::float8 AS mult
                FROM %6$s
				WHERE date = (select max(date) from %6$s)
            ),
            expanded AS (
                SELECT distinct
                    m.product_level_id, m.store_level_id, m.event, m.stat_id,
                    cd.default_currency_id,
                    (m.local_base_price_with_vat * f.mult) AS local_base_in_global,
                    gp.eff_spwvat AS global_spwvat
                FROM mapped m
                JOIN ccm_default cd ON cd.country_id = m.country_id AND cd.territory_id = m.territory_id
                JOIN fx f ON f.source_currency_id = m.local_currency_id AND f.target_currency_id = cd.default_currency_id
                JOIN glob_pp gp ON gp.stat_id = m.stat_id AND gp.currency_id = cd.default_currency_id
				AND gp.country_id = m.country_id
            ),
            roll AS (
                SELECT
                    e.product_level_id, e.store_level_id, e.event, e.stat_id,
                    MIN(e.default_currency_id)::bigint AS currency_id,
                    AVG(e.local_base_in_global)::float8 AS avg_local_base_in_global,
                    AVG(e.global_spwvat)::float8 AS avg_global_spwvat
                FROM expanded e
                GROUP BY e.product_level_id, e.store_level_id, e.event, e.stat_id
            )
            SELECT
                r.product_level_id::int4, r.store_level_id::int4, r.event,
                ''percent_off_'' || ROUND((1 - r.avg_global_spwvat / NULLIF(r.avg_local_base_in_global, 0)) * 100)::int AS offer_identifier,
                r.currency_id, r.stat_id,
                r.avg_global_spwvat::float4 AS effective_price_point,
                ROUND((1 - r.avg_global_spwvat / NULLIF(r.avg_local_base_in_global, 0)) * 100)::float8 AS base_percentage
            FROM roll r;',
            v_global_table, _input_table, _sku_store, _store_master, _price_points, _forex_table, _strategy_id
        );

        RAISE NOTICE 'Executing Global SQL query %', global_query;
        EXECUTE global_query;

    ELSIF _currency_type = 'dominating' THEN
        RAISE NOTICE 'Input is Dominating';
		
	    -- Create Local table
		EXECUTE format('DROP TABLE IF EXISTS %1$s', v_local_table);
		
		local_query = format('CREATE TABLE %1$s (LIKE %2$s INCLUDING ALL)', v_local_table, _input_table);
        RAISE NOTICE 'Creating Local table from input - only schema: %', local_query;
		EXECUTE local_query;
		
		-- Create dominating table
		EXECUTE format('DROP TABLE IF EXISTS %1$s', v_dom_table);
		
		dominating_query = format('CREATE TABLE %1$s AS SELECT * FROM %2$s', v_dom_table, _input_table);
        RAISE NOTICE 'Creating Local table from input: %', dominating_query;
		EXECUTE dominating_query;	
		
		-- Create global table
        EXECUTE format('DROP TABLE IF EXISTS %1$s', v_global_table);

        global_query := format(
            'CREATE TABLE %1$s AS
            WITH inp AS (
                SELECT product_level_id::int4, store_level_id::int4, event::bigint, stat_id::int4
                FROM %2$s
            ),
            mapped AS (
                SELECT
                    i.product_level_id, i.store_level_id, i.event, i.stat_id,
                    m.product_id, m.store_id,
                    m.price_with_vat::float8 AS local_base_price_with_vat,
                    sm.currency_id::bigint AS local_currency_id,
                    sm.s0_id AS territory_id, sm.s1_id AS country_id
                FROM inp i
                JOIN %3$s_%7$s m ON m.product_level_id = i.product_level_id AND m.store_level_id = i.store_level_id
                JOIN %4$s sm ON sm.store_id = m.store_id
            ),
            ccm_default AS (
                SELECT DISTINCT territory_id, country_id, default_currency_id::bigint AS default_currency_id
                FROM global.tb_country_currency_mapping
            ),
            glob_pp AS (
                SELECT stat_id::int4, currency_id::bigint, country_id::bigint, currency_value::float8 AS eff_spwvat
                FROM %5$s
            ),
            fx AS (
                SELECT source_currency_id::bigint, target_currency_id::bigint, planned_conversion_multiplier::float8 AS mult
                FROM %6$s
				WHERE date = (select max(date) from %6$s)
            ),
            expanded AS (
                SELECT distinct
                    m.product_level_id, m.store_level_id, m.event, m.stat_id,
                    cd.default_currency_id,
                    (m.local_base_price_with_vat * f.mult) AS local_base_in_global,
                    gp.eff_spwvat AS global_spwvat
                FROM mapped m
                JOIN ccm_default cd ON cd.country_id = m.country_id AND cd.territory_id = m.territory_id
                JOIN fx f ON f.source_currency_id = m.local_currency_id AND f.target_currency_id = cd.default_currency_id
                JOIN glob_pp gp ON gp.stat_id = m.stat_id AND gp.currency_id = cd.default_currency_id
					AND gp.country_id = m.country_id
            ),
            roll AS (
                SELECT
                    e.product_level_id, e.store_level_id, e.event, e.stat_id,
                    MIN(e.default_currency_id)::bigint AS currency_id,
                    AVG(e.local_base_in_global)::float8 AS avg_local_base_in_global,
                    AVG(e.global_spwvat)::float8 AS avg_global_spwvat
                FROM expanded e
                GROUP BY e.product_level_id, e.store_level_id, e.event, e.stat_id
            )
            SELECT
                r.product_level_id::int4, r.store_level_id::int4, r.event,
                ''percent_off_'' || ROUND((1 - r.avg_global_spwvat / NULLIF(r.avg_local_base_in_global, 0)) * 100)::int AS offer_identifier,
                r.currency_id, r.stat_id,
                r.avg_global_spwvat::float4 AS effective_price_point,
                ROUND((1 - r.avg_global_spwvat / NULLIF(r.avg_local_base_in_global, 0)) * 100)::float8 AS base_percentage
            FROM roll r;',
            v_global_table, _input_table, _sku_store, _store_master, _price_points, _forex_table, _strategy_id
        );

        RAISE NOTICE 'Executing Global SQL query: %', global_query;
        EXECUTE global_query;
    END IF;

    RAISE NOTICE 'Procedure completed for currency type: %', _currency_type;
END;
$procedure$
;