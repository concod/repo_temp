--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co_update_sp liquibase:add_final_level_for_partiton_pruning runOnChange:true stripComments:false splitStatements:false context:MTP-87189 labels:liquibase_project_start
--comment: Adding final_level for partition pruning
--rollback: SELECT 1



DROP FUNCTION IF EXISTS assort_smart.bulk_update_size_split_clusters(text, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_size_split_clusters(final_lvl text, update_data jsonb, insert_data jsonb, delivery_split_update_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    line_plan_code INT;
    size_plan_code INT;
BEGIN

    -- Section 1: INSERT into size_split_master
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
        final_lvl,
        ins->>'style_id',
        ins->>'choice_id',
        ins->>'color_id',
        ins->>'size_name',
        ins->>'cluster_name',
        (ins->>'buy_units')::FLOAT8,
        ins->>'style_tag',
        ins->>'style_name',
        ins->>'color_name'
    FROM jsonb_array_elements(insert_data) AS ins
    where ins->>'final_level' = final_lvl;

    RAISE NOTICE 'Inserted % new rows into size_split_master.', 
        (SELECT COUNT(*) FROM jsonb_array_elements(insert_data));

    -- Section 2: UPDATE size_split_master
    WITH upd AS (
    SELECT
        (upd_rec->>'plan_code')::INT AS plan_code,
        final_lvl AS final_level,
        upd_rec->>'choice_id' AS choice_id,
        upd_rec->>'size_name' AS size_name,
        upd_rec->>'cluster_name' AS cluster,
        (upd_rec->>'buy_units')::FLOAT8 AS new_buy_units
    FROM jsonb_array_elements(update_data) AS upd_rec
    where upd_rec->>'final_level' = final_lvl
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
      AND ssm.final_level = final_lvl
      AND ssm.choice_id = t.choice_id
      AND ssm.size_name = t.size_name
      AND ssm.cluster = t.cluster;

    RAISE NOTICE 'Updated existing sizes in size_split_master.';

    -- Section 3: UPDATE size_delivery_split (ONLY for sizes that already exist)
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

    RAISE NOTICE 'Updated existing sizes in size_delivery_split.';

    -- Section 4: INSERT into size_delivery_split (ONLY for NEW sizes)
    -- Get the line plan code from size plan code
    SELECT DISTINCT (del_rec->>'plan_code')::INT INTO size_plan_code
    FROM jsonb_array_elements(delivery_split_update_data) AS del_rec
    LIMIT 1;

    SELECT line_review_plan_master_id INTO line_plan_code
    FROM assort_smart.line_review_size_pack_mapper
    WHERE size_pack_plan_master_id = size_plan_code;

    -- Safeguard: Ensure mapping exists
    IF line_plan_code IS NULL THEN
        RAISE EXCEPTION 'No line plan code mapping found for size plan code %. Check line_review_size_pack_mapper table.', size_plan_code;
    END IF;

    RAISE NOTICE 'Using line plan code % (mapped from size plan code %) for delivery data.', line_plan_code, size_plan_code;

    -- Insert only sizes that DON'T already exist in size_delivery_split
    INSERT INTO assort_smart.size_delivery_split (
        plan_code, 
        choice_id, 
        style_id, 
        color_id, 
        delivery, 
        delivery_date, 
        delivery_perc, 
        order_placed, 
        size_name, 
        buy_units,
        style_name,
        color_name
    )
    SELECT DISTINCT
        u.plan_code,
        u.choice_id,
        COALESCE(ins.style_id, ssm.style_id) AS style_id,
        COALESCE(ins.color_id, ssm.color_id) AS color_id,
        lpcld.delivery,
        lpcld.delivery_start_date AS delivery_date,
        lpcld.launch_delivery_perc AS delivery_perc,
        false AS order_placed,
        u.size_name,
        u.new_buy_units * lpcld.launch_delivery_perc AS buy_units,
        COALESCE(ins.style_name, ssm.style_name) AS style_name,
        COALESCE(ins.color_name, ssm.color_name) AS color_name
    FROM (
        SELECT
            (del_rec->>'plan_code')::INT AS plan_code,
            del_rec->>'choice_id' AS choice_id,
            del_rec->>'size_name' AS size_name,
            (del_rec->>'buy_units')::FLOAT8 AS new_buy_units
        FROM jsonb_array_elements(delivery_split_update_data) AS del_rec
    ) u
    -- Get fields from insert_data for new sizes
    LEFT JOIN (
        SELECT
            (ins->>'plan_code')::INT AS plan_code,
            ins->>'choice_id' AS choice_id,
            ins->>'size_name' AS size_name,
            ins->>'style_id' AS style_id,
            ins->>'color_id' AS color_id,
            ins->>'style_name' AS style_name,
            ins->>'color_name' AS color_name
        FROM jsonb_array_elements(insert_data) AS ins
    ) ins
        ON ins.plan_code = u.plan_code
        AND ins.choice_id = u.choice_id
        AND ins.size_name = u.size_name
    -- Fallback to size_split_master for existing sizes
    LEFT JOIN (
        SELECT DISTINCT 
            plan_code, 
            choice_id, 
            style_id, 
            color_id, 
            style_name, 
            color_name
        FROM assort_smart.size_split_master
    ) ssm
        ON ssm.plan_code = u.plan_code
        AND ssm.choice_id = u.choice_id
    -- Get delivery info using LINE plan code
    INNER JOIN assort_smart.line_plan_choice_launch_delivery lpcld
        ON lpcld.plan_code = line_plan_code
        AND lpcld.placeholder_choice_id = u.choice_id
    -- CRITICAL: Only insert if this exact combination doesn't exist
    WHERE NOT EXISTS (
        SELECT 1
        FROM assort_smart.size_delivery_split sds
        WHERE sds.plan_code = u.plan_code
          AND sds.choice_id = u.choice_id
          AND sds.size_name = u.size_name
          AND sds.delivery = lpcld.delivery
    );

    RAISE NOTICE 'Inserted new sizes into size_delivery_split.';

END;
$function$;