--liquibase formatted sql
--changeset akshay.jain@impactanalytics:persist_rcl_pmps_exceptions_main_table_temp_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:persist_rcl_pmps_exceptions_main_table_temp_2
--comment: rectified spelling error1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.persist_rcl_pmps_exceptions_main_table(_action text, _persisted_temp_tbl_name text);
CREATE OR REPLACE FUNCTION global.persist_rcl_pmps_exceptions_main_table(_action text, _persisted_temp_tbl_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    /*
    Description: Inputs: $1 = persistent temp table name, $2 = jsonb array of set all/selections filters, $3 = new values for the filters, $4 = meta filters, $5 = created by.
    This function is an intermediate one to update the persistent temp table with the user selected values. first need to create temp table by calling global.rcl_create_pmps_exception function.
    sample call: select * from global.update_rcl_create_pmps_exceptions('rule_store_groups_temp1', '[{"rule_code":2, "store_code":10005347}, {"rule_code":3, "store_code":138800005}]', '[{"validity":"{[2024-09-01,2024-10-31]}"}]', '{}', 99);
    */
begin
	
	if _action = 'save' then
    
		execute 'insert into global.rcl_product_mapping_product_store_exceptions (rcl_code, rule_code, validity, store_code, created_at, updated_at, created_by, updated_by, psa_name, psa_code) 
		select i.rcl_code, i.rule_code, i.validity, i.store_code, now(), now(), i.created_by, i.updated_by, i.psa_name, i.psa_code from global.rcl_psm_new_exception_' || _persisted_temp_tbl_name  || ' i where validity is not null
		on conflict (rule_code, store_code, rcl_code) DO UPDATE
		SET validity = EXCLUDED.validity, updated_at = now(), updated_by = EXCLUDED.updated_by';
	
	end if;
	
	execute 'drop table global.rcl_psm_new_exception_' || _persisted_temp_tbl_name;
    
END;
$function$
;

