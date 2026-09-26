
--liquibase formatted sql
--changeset chitrakumari.singh@impactanalytics.co liquibase:fix_launch_id_remove  runOnChange:true stripComments:false splitStatements:false context:fix_launch_id_remove labels:liquibase_project_start
--comment: Update SP to copy date properly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_cluster_opt_data(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_cluster_opt_data(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
 pk_id int;
 new_pk_id int;
 _source_table_name text;
 _source_attribute_table_name text;
 _dest_table_name text;
 _dest_attribute_table_name text;
begin
    -- Construct table names dynamically based on plan_type
    _source_table_name := 'assort_smart.plan_cluster_opt_master_' || source_plan_type;
    _source_attribute_table_name := 'assort_smart.plan_cluster_opt_attribute_' || source_plan_type;
    _dest_table_name := 'assort_smart.plan_cluster_opt_master_' || dest_plan_type;
    _dest_attribute_table_name := 'assort_smart.plan_cluster_opt_attribute_' || dest_plan_type;

    -- Loop through all plan_clu_opt_id from the source table
    for pk_id in execute 'SELECT plan_clu_opt_id FROM ' || _source_table_name || ' WHERE plan_code = $1' using existing_plan_code
    loop
        -- Insert data into the target table
        execute 'INSERT INTO ' || _dest_table_name || ' (plan_code, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name,
                optimization_level, carryover_flag, compare_type, new_l3_flag, is_active)
                 SELECT $1, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name, optimization_level, carryover_flag, compare_type, new_l3_flag, is_active
                 FROM ' || _source_table_name || ' WHERE plan_clu_opt_id = $2
                 RETURNING plan_clu_opt_id' 
        into new_pk_id using new_plan_code, pk_id;

        -- Insert into attribute table
        execute 'INSERT INTO ' || _dest_attribute_table_name || ' (plan_clu_opt_id, attribute_name, sub_attribute_name, sell_through, penetration_ly, penetration_ty, total_quantity, margin_percentage)
                 SELECT $1, attribute_name, sub_attribute_name, sell_through, penetration_ly, penetration_ty, total_quantity, margin_percentage
                 FROM ' || _source_attribute_table_name || ' WHERE plan_clu_opt_id = $2'
        using new_pk_id, pk_id;
    end loop;
end;
$function$
;

