--liquibase formatted sql
--changeset paras.jain@impactanalytics.co_update_sp liquibase:MTP-96040_ADDING_SP runOnChange:true stripComments:false splitStatements:false context:MTP-70428 labels:liquibase_project_start
--comment: MTP-96040_ADDING_SP
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort_smart.bulk_update_penetration_ty(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_penetration_ty(json_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE assort_smart.plan_cluster_opt_attribute_wp
    SET penetration_ty = (json_obj->>'penetration_ty')::FLOAT
    FROM (
        SELECT
            (jsonb_array_elements(json_data)->>'plan_clu_opt_id')::BIGINT as plan_clu_opt_id,
            (jsonb_array_elements(json_data)->>'sub_attribute_name')::TEXT as sub_attribute_name,
            jsonb_array_elements(json_data) as json_obj
    ) as updates
    WHERE plan_cluster_opt_attribute_wp.plan_clu_opt_id = updates.plan_clu_opt_id
    AND plan_cluster_opt_attribute_wp.sub_attribute_name = updates.sub_attribute_name;

    RAISE NOTICE 'Bulk update for penetration_ty completed.';
END;
$function$;