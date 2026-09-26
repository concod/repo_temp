--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:build_kpi_mv runOnChange:true stripComments:false splitStatements:false context:kpi labels:project start
--comment: added lock handling and forcast changes 
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS inventory_smart.build_kpi_mv();
CREATE OR REPLACE PROCEDURE inventory_smart.build_kpi_mv()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    r RECORD;
    resolved_schema text;
    fq_table text;
    mv_name text;
    _sql text;
    kpi_cols_sql text;
    agg_ctes_sql text;
    pick_union_sql text;
    funcs_csv text;
    final_select_list text;
    level_agg_arr varchar[];
    level_select text;
    pivot_cols text;
    join_keys text;
    timestamp_suffix text := to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
    t_extra_cols_sql text;
    pv_kpi_cols_sql text;
    t_level_cols_sql text;
    idx RECORD;
    idxdef1 text;
    idxdef2 text;
    new_index_name text;
    pc_rows_sql text;
    is_alerts_table boolean;
    lock_timeout_ms integer := 5000;
    lock_retry_limit integer := 3;
    lock_retry_wait_seconds integer := 5;
    lock_attempt integer;
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'inventory_smart.build_kpi_mv';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _mv_filter text;
    _version_code int;
    _table_suffix text;
    _has_kpi bool := true;
    _og_column_names text;
BEGIN
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    
    FOR r IN
        SELECT DISTINCT m.table_name
        FROM inventory_smart.module_component_mapping m
        WHERE m.table_name IS NOT NULL
          AND m.level_agg IS NOT NULL
    LOOP
        SELECT t.table_schema
        INTO resolved_schema
        FROM information_schema.tables t
        WHERE t.table_name = r.table_name
        ORDER BY CASE t.table_schema
                   WHEN 'inventory_smart' THEN 1
                   WHEN 'global'          THEN 2
                   ELSE 99
                 END
        LIMIT 1;

        IF resolved_schema IS NULL THEN
            RAISE NOTICE 'Skipping % (no schema found)', r.table_name;
            CONTINUE;
        END IF;

        fq_table := quote_ident(resolved_schema) || '.' || quote_ident(r.table_name);
        
        IF r.table_name like '%_version' THEN
            execute format('select global.get_table_version(''%s'')', fq_table) into _version_code;
            _mv_filter = ' WHERE version_code = ' || _version_code; 
            mv_name := regexp_replace(r.table_name, '_version$', '', 'i');
            _table_suffix := '_version';
        ELSIF r.table_name like '%_base' THEN
            _mv_filter = ' WHERE 1 = 1 ';
            mv_name := regexp_replace(r.table_name, '_base$', '', 'i');
            _table_suffix := '_base';
        END IF;

        SELECT string_agg(
                 format(
                   'MAX(CASE WHEN p.kpi_id = %s THEN p.kpi_value END) AS %I',
                   s.kpi_id,
                   regexp_replace(lower(s.kpi_name), '[^a-z0-9]+', '_', 'g')
                 ),
                 E',\n          '
               )
        INTO kpi_cols_sql
        FROM (
          SELECT DISTINCT kc.kpi_id, kc.kpi_name
          FROM inventory_smart.kpi_module_mapping kmm
          JOIN inventory_smart.module_component_mapping m
            ON m.mapping_id = kmm.module_component_id
          JOIN inventory_smart.kpi_config kc
            ON kc.kpi_id = kmm.kpi_id
          WHERE m.table_name = r.table_name
          AND kc.is_active
        ) s;

        SELECT string_agg(format('t.%I', col), E',\n          ')
        INTO _og_column_names
        FROM (
          SELECT c.column_name AS col
          FROM information_schema.columns c
          WHERE c.table_schema = resolved_schema
            AND c.table_name   = r.table_name
            AND c.column_name not in ('version_code')
          ORDER BY c.ordinal_position
        ) q;

        RAISE NOTICE '_og_column_names: %', _og_column_names;

        IF kpi_cols_sql IS NULL THEN
            RAISE NOTICE 'Skipping % (no KPIs mapped)', r.table_name;
            _sql := format('CREATE MATERIALIZED VIEW inventory_smart.%I AS
                SELECT
                %s
                FROM %s t %s',
                mv_name,
                _og_column_names,
                fq_table,
                _mv_filter);
        ELSE
            SELECT string_agg(
                     format('pv.%I',
                       regexp_replace(lower(s.kpi_name), '[^a-z0-9]+', '_', 'g')
                     ),
                     E',\n          '
                   )
            INTO pv_kpi_cols_sql
            FROM (
              SELECT DISTINCT kc.kpi_id, kc.kpi_name
              FROM inventory_smart.kpi_module_mapping kmm
              JOIN inventory_smart.module_component_mapping m
                ON m.mapping_id = kmm.module_component_id
              JOIN inventory_smart.kpi_config kc
                ON kc.kpi_id = kmm.kpi_id
              WHERE m.table_name = r.table_name
              AND kc.is_active
            ) s;

            SELECT
              array_to_string(
                array_agg(DISTINCT lower(kmm.aggregate_function))
                  FILTER (WHERE kmm.aggregate_function IS NOT NULL),
                ','
              ) AS funcs_csv,
              (
                SELECT m2.level_agg
                FROM inventory_smart.module_component_mapping m2
                WHERE m2.table_name = r.table_name
                  AND m2.level_agg IS NOT NULL
                LIMIT 1
              )::varchar[] AS level_agg_arr
            INTO funcs_csv, level_agg_arr
            FROM inventory_smart.kpi_module_mapping kmm
            JOIN inventory_smart.module_component_mapping m
              ON m.mapping_id = kmm.module_component_id
            JOIN inventory_smart.kpi_config kc
                ON kc.kpi_id = kmm.kpi_id
            WHERE m.table_name = r.table_name
              AND kc.is_active;

            IF funcs_csv IS NULL OR level_agg_arr IS NULL OR array_length(level_agg_arr, 1) IS NULL THEN
                RAISE NOTICE 'Skipping % (funcs_csv or level_agg_arr missing). funcs=% level_agg=%',
                             r.table_name, COALESCE(funcs_csv,'<null>'), level_agg_arr;
                _sql := format('CREATE MATERIALIZED VIEW inventory_smart.%I AS
                    SELECT
                    %s
                    FROM %s t %s',
                    mv_name,
                    _og_column_names,
                    fq_table,
                    _mv_filter);
            ELSE
                SELECT string_agg(format('%I', c), ', ')
                INTO level_select
                FROM unnest(level_agg_arr) AS c;

                SELECT string_agg(format('p.%I', c), ', ')
                INTO pivot_cols
                FROM unnest(level_agg_arr) AS c;

                SELECT string_agg(format('pv.%I = t.%I', c, c), E'\n       AND ')
                INTO join_keys
                FROM unnest(level_agg_arr) AS c;

                SELECT string_agg(format('t.%I', c), E',\n          ')
                INTO t_level_cols_sql
                FROM unnest(level_agg_arr) AS c;

                SELECT string_agg(format('t.%I', col), E',\n          ')
                INTO t_extra_cols_sql
                FROM (
                  SELECT c.column_name AS col
                  FROM information_schema.columns c
                  WHERE c.table_schema = resolved_schema
                    AND c.table_name   = r.table_name
                    AND NOT (c.column_name = ANY(level_agg_arr))
                  ORDER BY c.ordinal_position
                ) q;

                final_select_list :=
                  trim(both E',\n          ' from
                    coalesce(t_level_cols_sql, '') ||
                    CASE WHEN t_level_cols_sql IS NOT NULL AND t_extra_cols_sql IS NOT NULL THEN E',\n          ' ELSE '' END ||
                    coalesce(t_extra_cols_sql, '') ||
                    CASE
                      WHEN (coalesce(t_level_cols_sql,'') <> '' OR coalesce(t_extra_cols_sql,'') <> '')
                           AND coalesce(pv_kpi_cols_sql,'') <> '' THEN E',\n          '
                      ELSE ''
                    END ||
                    coalesce(pv_kpi_cols_sql, '')
                  );

                agg_ctes_sql := array_to_string(
                  ARRAY(
                    SELECT format(
                      '%I_agg AS (
                        SELECT %s, pr.kpi_id, %s AS kpi_value
                        FROM pc_rows pr
                        JOIN kpi_agg ka ON ka.kpi_id = pr.kpi_id
                        WHERE ka.aggregate_function = %L
                        GROUP BY %s, pr.kpi_id
                      )',
                      f,
                      level_select,
                      CASE
                        WHEN f = 'count' THEN 'COUNT(1)'
                        ELSE format('%I(pr.value)', f)
                      END,
                      f,
                      level_select
                    )
                    FROM regexp_split_to_table(funcs_csv, '\s*,\s*') AS f
                  ),
                  E',\n      '
                );

                pick_union_sql := array_to_string(
                  ARRAY(
                    SELECT format('SELECT * FROM %I_agg', f)
                    FROM regexp_split_to_table(funcs_csv, '\s*,\s*') AS f
                  ),
                  E'\n        UNION ALL\n        '
                );

                is_alerts_table := (
                  r.table_name LIKE 'alerts_product_level%'
                  OR r.table_name LIKE 'alerts_product_store_level%'
                  OR r.table_name LIKE 'forecast_alerts%'
                );

                IF is_alerts_table THEN
                    pc_rows_sql := '
                    store_scope AS (
                        SELECT DISTINCT
                          article,
                          store_code
                        FROM inventory_smart.article_inventory_dashboard' || _table_suffix || '
                        WHERE ' || _mv_filter || ' and channel <> ''DC''
                    ),
                    kpi_rows AS (
                        SELECT
                          paf.article,
                          kr.store_code,
                          (elem->>''kpi_id'')::int    AS kpi_id,
                          (elem->>''value'')::numeric AS value,
                          kr.calculation_date,
                          kr.calculated_at
                        FROM inventory_smart.kpi_result kr
                        JOIN global.product_attributes_filter paf
                          ON paf.product_code = kr.product_code
                        JOIN store_scope ss
                          ON ss.article = paf.article
                         AND ss.store_code = kr.store_code
                        JOIN jsonb_array_elements(kr.kpi_values->''kpis'') AS elem ON true
                        JOIN module_scope ms
                          ON ms.kpi_id = (elem->>''kpi_id'')::int
                        WHERE kr.kpi_values IS NOT NULL
                    ),
                    latest_kpi AS (
                        SELECT DISTINCT ON (article, store_code, kpi_id)
                          article,
                          store_code,
                          kpi_id,
                          value
                        FROM kpi_rows
                        ORDER BY article, store_code, kpi_id,
                                 calculation_date DESC, calculated_at DESC
                    ),
                    pc_rows AS (
                        SELECT
                          ss.article,
                          ss.store_code,
                          ms.kpi_id,
                          COALESCE(lk.value, 0) AS value
                        FROM store_scope ss
                        CROSS JOIN (
                          SELECT DISTINCT kpi_id
                          FROM module_scope
                        ) ms
                        LEFT JOIN latest_kpi lk
                          ON lk.article = ss.article
                         AND lk.store_code = ss.store_code
                         AND lk.kpi_id = ms.kpi_id
                    )';
                ELSE
                    pc_rows_sql := '
                    pc_rows AS (
                        SELECT
                          paf.article,
                          kr.store_code,
                          (elem->>''kpi_id'')::int    AS kpi_id,
                          (elem->>''value'')::numeric AS value
                        FROM inventory_smart.kpi_result kr
                        JOIN global.product_attributes_filter paf
                          ON paf.product_code = kr.product_code
                        JOIN jsonb_array_elements(kr.kpi_values->''kpis'') AS elem ON true
                        JOIN module_scope ms
                          ON ms.kpi_id = (elem->>''kpi_id'')::int
                        WHERE kr.kpi_values IS NOT NULL
                    )';
                END IF;

                _sql := format($sql$
                    CREATE MATERIALIZED VIEW inventory_smart.%I AS
                    WITH
                    module_scope AS (
                        SELECT DISTINCT
                          kmm.kpi_id,
                          lower(kmm.aggregate_function) AS aggregate_function,
                          m.level_agg
                        FROM inventory_smart.kpi_module_mapping kmm
                        JOIN inventory_smart.module_component_mapping m
                          ON m.mapping_id = kmm.module_component_id
                        JOIN inventory_smart.kpi_config kc
                        ON kc.kpi_id = kmm.kpi_id
                        WHERE m.table_name = %L
                    AND kc.is_active
                    ),
                    kpi_func AS (
                        SELECT
                          kpi_id,
                          aggregate_function,
                          ROW_NUMBER() OVER (PARTITION BY kpi_id ORDER BY kpi_id) AS rn
                        FROM module_scope
                    ),
                    kpi_agg AS (
                        SELECT
                          kf1.kpi_id,
                          kf1.aggregate_function
                        FROM kpi_func kf1
                        WHERE kf1.rn = 1
                    ),
                    %s,
                    %s,
                    pick_agg AS (
                        %s
                    ),
                    pivoted AS (
                        SELECT
                          %s,
                          %s
                        FROM pick_agg p
                        GROUP BY %s
                    )
                    SELECT
                        %s
                    FROM %s t
                    LEFT JOIN pivoted pv
                     ON %s %s
                $sql$,
                    mv_name,
                    r.table_name,
                    pc_rows_sql,
                    agg_ctes_sql,
                    pick_union_sql,
                    pivot_cols,
                    kpi_cols_sql,
                    level_select,
                    final_select_list,
                    fq_table,
                    join_keys,
                    _mv_filter
                );
            END IF;
        END IF;

        --run drop mv
        lock_attempt := 0;
        LOOP
            lock_attempt := lock_attempt + 1;
            BEGIN
                PERFORM set_config('lock_timeout', lock_timeout_ms::text, true);
                EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS inventory_smart.%I cascade', mv_name);
                PERFORM set_config('lock_timeout', '0', true);
                EXIT;
            EXCEPTION
                WHEN lock_not_available THEN
                    PERFORM set_config('lock_timeout', '0', true);
                    IF lock_attempt >= lock_retry_limit THEN
                        RAISE EXCEPTION
                          'Failed to drop materialized view inventory_smart.% after % attempts due to lock timeout',
                          mv_name,
                          lock_retry_limit;
                    END IF;
                    RAISE NOTICE 'Lock timeout while dropping inventory_smart.%. Retrying in % seconds (attempt %/%)',
                        mv_name,
                        lock_retry_wait_seconds,
                        lock_attempt,
                        lock_retry_limit;
                    PERFORM pg_sleep(lock_retry_wait_seconds);
            END;
        END LOOP;

        --run create mv
        RAISE NOTICE '%', _sql;
        EXECUTE _sql;

        FOR idx IN
            SELECT i.indexname, i.indexdef
            FROM pg_indexes i
            WHERE i.schemaname = resolved_schema
              AND i.tablename  = r.table_name
        LOOP
            new_index_name := substr(
                format('%s_%s_%s', mv_name, idx.indexname, timestamp_suffix),
                1, 60
            );

            idxdef1 := regexp_replace(
                         idx.indexdef,
                         '^CREATE\s+UNIQUE\s+INDEX\s+\S+',
                         format('CREATE UNIQUE INDEX %I', new_index_name),
                         1, 1, 'i'
                       );
            IF idxdef1 = idx.indexdef THEN
                idxdef1 := regexp_replace(
                             idx.indexdef,
                             '^CREATE\s+INDEX\s+\S+',
                             format('CREATE INDEX %I', new_index_name),
                             1, 1, 'i'
                           );
            END IF;

            idxdef2 := replace(
                         idxdef1,
                         format(' ON %I.%I', resolved_schema, r.table_name),
                         format(' ON %I.%I', 'inventory_smart', mv_name)
                       );

            IF idxdef2 LIKE '%' || format('%I.%I', resolved_schema, r.table_name) || '%' THEN
                RAISE NOTICE 'Skipping index % (complex definition not rewritten cleanly)', idx.indexname;
            ELSE
                EXECUTE idxdef2;
                RAISE NOTICE 'Created MV index % on inventory_smart.%', new_index_name, mv_name;
            END IF;
        END LOOP;

        RAISE NOTICE 'Created MV inventory_smart.%', mv_name;
    END LOOP;
    call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END;
$procedure$;