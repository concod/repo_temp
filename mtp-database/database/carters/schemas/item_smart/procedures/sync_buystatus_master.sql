--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:sync_buystatus_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.sync_buystatus_master


DROP PROCEDURE if exists item_smart.sync_buystatus_master();

CREATE OR REPLACE PROCEDURE item_smart.sync_buystatus_master()
LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Clear the target table
    DELETE FROM item_smart.buystatus_master;

    -- Insert transformed data
    INSERT INTO item_smart.buystatus_master
    SELECT DISTINCT dept,channel, season, hierarchy_code,
           100 AS total_receipt_units,
           'Initial' AS status_value
    FROM (
        WITH hier AS (
            SELECT country AS dept, channel, hierarchy_code
            FROM item_smart.wp_master
            LEFT JOIN item_smart.mv_product_hierarchies_filter mphf
            USING (hierarchy_code)
            WHERE country = 'USA'
        ),
        season_week_mapping AS (
            SELECT DISTINCT name, fiscal_year_week AS current_week
            FROM global.fiscal_date_mapping
            JOIN global.season_master a
              ON fiscal_week_begin_date BETWEEN a.season_start_date AND a.season_end_date
            WHERE calendar_date > '2024-01-01'
              AND calendar_date < '2028-01-01'
        )
        SELECT hier.*, swm.name AS season
        FROM hier
        CROSS JOIN (
            SELECT DISTINCT name
            FROM season_week_mapping
        ) swm
    ) sub;
END;
$procedure$;



