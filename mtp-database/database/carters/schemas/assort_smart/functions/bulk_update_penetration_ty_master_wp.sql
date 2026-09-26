--liquibase formatted sql
--changeset paras.jain@impactanalytics.co_update_sp liquibase:MTP-96040_ADDING_SP_added runOnChange:true stripComments:false splitStatements:false context:MTP-70428 labels:liquibase_project_start
--comment: MTP-96040_ADDING_SP_added_for_carters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.bulk_update_penetration_ty_master_wp(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.bulk_update_penetration_ty_master_wp(update_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    rec jsonb;
    plan_code_val int;
    cluster_code_val text;
    hierarchy_code_val text;
    penetration_ty_val float8;
BEGIN
    -- Loop through each element of the JSON array
    FOR rec IN SELECT * FROM jsonb_array_elements(update_data)
    LOOP
        -- Extract fields from JSON
        plan_code_val       := (rec->>'plan_code')::int;
        cluster_code_val    := (rec->>'cluster_code')::text;
        hierarchy_code_val  := (rec->>'hierarchy_code')::text;
        penetration_ty_val  := (rec->>'penetration_ty')::float8;

        -- Execute update
        EXECUTE format(
            'UPDATE assort_smart.plan_cluster_opt_master_wp
             SET penetration_ty = %L
             WHERE plan_code = %L AND cluster_code = %L AND hierarchy_code = %L;',
            penetration_ty_val,
            plan_code_val,
            cluster_code_val,
            hierarchy_code_val
        );
    END LOOP;

    RAISE NOTICE 'Bulk update of penetration_ty completed.';
END;
$$;