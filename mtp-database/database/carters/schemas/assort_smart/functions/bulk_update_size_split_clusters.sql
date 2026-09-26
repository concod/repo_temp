--liquibase formatted sql
--changeset paras.jain@impactanalytics.co_update_sp liquibase:bulk_update_size_split_clusters runOnChange:true stripComments:false splitStatements:false context:MTP-87189 labels:liquibase_project_start
--comment: Updating SP bulk_update_size_split_clusters MTP-87189
--rollback: SELECT 1



DROP FUNCTION  IF EXISTS assort_smart.bulk_update_size_split_clusters(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_size_split_clusters(json_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update entries including cluster_name
    UPDATE assort_smart.size_split_master AS ssm
    SET
        buy_units = data.buy_units
    FROM (
        SELECT
            (record->>'plan_code')::INT AS plan_code,
            record->>'final_level' AS final_level,
            record->>'choice_id' AS choice_id,
            record->>'size_name' AS size_name,
            record->>'cluster_name' AS cluster,
            (record->>'buy_units')::FLOAT8 AS buy_units
        FROM jsonb_array_elements(json_data) AS record
    ) AS data
    WHERE ssm.plan_code = data.plan_code
      AND ssm.final_level = data.final_level
      AND ssm.choice_id = data.choice_id
      AND ssm.size_name = data.size_name
      AND ssm.cluster = data.cluster;

    RAISE NOTICE 'Cluster-based size split master updated.';
END;
$function$
;
