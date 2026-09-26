--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co_update_sp liquibase:bulk_update_size_split_clusters runOnChange:true stripComments:false splitStatements:false context:MTP-87189 labels:liquibase_project_start
--comment: Updating SP bulk_update_size_split_clusters to update data in size_delivery_split
--rollback: SELECT 1



DROP FUNCTION IF EXISTS assort_smart.bulk_update_size_split_clusters(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_size_split_clusters(update_data jsonb, insert_data jsonb, delivery_split_update_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
BEGIN

	-- insert
	INSERT INTO assort_smart.size_split_master (
        plan_code,
        season,
        season_code,
        channel,
        sub_channel,
        hierarchy_code,
        final_level,
        style_id,
        choice_id,
        color_id,
        size_name,
        cluster,
        buy_units,
        style_tag,
        style_name,
        color_name
    )
    SELECT
        (ins->>'plan_code')::INT,
        ins->>'season',
        NULLIF(ins->>'season_code', '')::INT,
        NULLIF(ins->>'channel', '')::INT,
        NULLIF(ins->>'sub_channel', '')::INT,
        ins->>'hierarchy_code',
        ins->>'final_level',
        ins->>'style_id',
        ins->>'choice_id',
        ins->>'color_id',
        ins->>'size_name',
        ins->>'cluster_name',
        (ins->>'buy_units')::FLOAT8,
        ins->>'style_tag',
        ins->>'style_name',
        ins->>'color_name'
    FROM jsonb_array_elements(insert_data) AS ins;

	RAISE NOTICE 'Inserted new rows into size_split_master.';

	-- update
    WITH upd AS (
    SELECT
        (upd_rec->>'plan_code')::INT AS plan_code,
        upd_rec->>'final_level' AS final_level,
        upd_rec->>'choice_id' AS choice_id,
        upd_rec->>'size_name' AS size_name,
        upd_rec->>'cluster_name' AS cluster,
        (upd_rec->>'buy_units')::FLOAT8 AS new_buy_units
    FROM jsonb_array_elements(update_data) AS upd_rec
    ),
    totals AS (
        SELECT
            u.plan_code, u.final_level, u.choice_id, u.size_name, u.cluster,
            u.new_buy_units,
            SUM(ssm.buy_units) AS total_existing,
            COUNT(*) AS store_count
        FROM assort_smart.size_split_master ssm
        INNER JOIN upd u
            ON ssm.plan_code = u.plan_code
            AND ssm.final_level = u.final_level
            AND ssm.choice_id = u.choice_id
            AND ssm.size_name = u.size_name
            AND ssm.cluster = u.cluster
        GROUP BY u.plan_code, u.final_level, u.choice_id, u.size_name, u.cluster, u.new_buy_units
    )
    UPDATE assort_smart.size_split_master ssm
    SET buy_units = ssm.buy_units + CASE
        WHEN t.total_existing = 0
            THEN (t.new_buy_units - t.total_existing) / t.store_count
        ELSE
            (t.new_buy_units - t.total_existing) * (ssm.buy_units / t.total_existing)
    END
    FROM totals t
    WHERE ssm.plan_code = t.plan_code
      AND ssm.final_level = t.final_level
      AND ssm.choice_id = t.choice_id
      AND ssm.size_name = t.size_name
      AND ssm.cluster = t.cluster;

    -- update delivery split
    WITH upd AS (
        SELECT
            (del_rec->>'plan_code')::INT AS plan_code,
            del_rec->>'choice_id' AS choice_id,
            del_rec->>'size_name' AS size_name,
            (del_rec->>'buy_units')::FLOAT8 AS new_buy_units
        FROM jsonb_array_elements(delivery_split_update_data) AS del_rec
    ),
    sds_totals AS (
        SELECT u.plan_code, u.choice_id, u.size_name, u.new_buy_units,
               SUM(sds.buy_units) AS total_existing
        FROM assort_smart.size_delivery_split sds
        INNER JOIN upd u
            ON sds.plan_code = u.plan_code
            AND sds.choice_id = u.choice_id
            AND sds.size_name = u.size_name
        GROUP BY u.plan_code, u.choice_id, u.size_name, u.new_buy_units
    )
    UPDATE assort_smart.size_delivery_split sds
    SET buy_units = sds.buy_units + (t.new_buy_units - t.total_existing) * sds.delivery_perc
    FROM sds_totals t
    WHERE sds.plan_code = t.plan_code
      AND sds.choice_id = t.choice_id
      AND sds.size_name = t.size_name;
END;
$function$
;
