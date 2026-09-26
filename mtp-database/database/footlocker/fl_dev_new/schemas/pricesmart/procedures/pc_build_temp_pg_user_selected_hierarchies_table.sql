--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_build_temp_pg_user_selected_hierarchies_table_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_build_temp_pg_user_selected_hierarchies_table_1

DROP PROCEDURE if exists pricesmart.pc_build_temp_pg_user_selected_hierarchies_table;


CREATE OR REPLACE PROCEDURE pricesmart.pc_build_temp_pg_user_selected_hierarchies_table(IN _pg_ids integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    rec1 RECORD;
    case_list TEXT := '';
    agg_list TEXT := '';
    final_sql TEXT;
BEGIN
    IF _pg_ids IS NULL OR array_length(_pg_ids, 1) IS NULL THEN
        RAISE NOTICE 'No PG IDs provided. Exiting procedure.';
        RETURN;
    END IF;

    FOR rec1 IN
        SELECT id_mapping, request_key
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = TRUE
        ORDER BY id_mapping
    LOOP
        case_list := case_list ||
            format(
                '    CASE WHEN tph.hierarchy_level = %s THEN tph.hierarchy_value ELSE NULL::integer END AS %I,' || E'\n',
                rec1.id_mapping,
                rec1.request_key
            );

        agg_list := agg_list ||
            format(
                '    array_agg(DISTINCT ach.%I) FILTER (WHERE ach.%I IS NOT NULL) AS %I,' || E'\n',
                rec1.request_key, rec1.request_key, rec1.request_key
            );
    END LOOP;
	case_list := regexp_replace(case_list, ',\n$', E'\n');
    agg_list  := regexp_replace(agg_list, ',\n$', E'\n');

    -- Build final SQL
    final_sql := format($sql$
        CREATE TEMP TABLE tb_refresh_temp_pg_actual_hierarchy ON COMMIT DROP AS
       	WITH pg_actual_hierarchies AS (
            SELECT
                tph.pg_id,
				%s
            FROM pricesmart.tb_pg_hierarchy tph
            WHERE tph.is_deleted = 0
              AND tph.is_temporary = 0
              AND tph.pg_id = ANY (%L)
        )
        SELECT
            ach.pg_id,
			%s
        FROM pg_actual_hierarchies ach
        GROUP BY ach.pg_id;
    $sql$, case_list, _pg_ids, agg_list);

    RAISE NOTICE 'Generated SQL:%', chr(10) || final_sql;
    EXECUTE final_sql;
END;
$procedure$
;
