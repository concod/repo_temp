--liquibase formatted sql
--changeset ishaan.singh:added sp for sync_new_store_store_group_addition runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-492
--comment: 	added new store new insert logic
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_new_store_store_group_addition();
CREATE OR REPLACE PROCEDURE public.sync_new_store_store_group_addition()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_store_group_addition';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO global.store_groups(name, special_classification, is_deleted, created_at, updated_at, created_by, updated_by, channel, application_code, extra)
        SELECT  
        saf.retail_facility_code AS name,
        'manual' AS special_classification,
        false AS is_deleted,
        NOW() AS created_at,
        NOW() AS updated_at,
        155 AS created_by,
        155 AS updated_by,
        saf.channel,
        1 AS application_code,
        json_build_object('new_store', saf.store_code,'is_new_store_sg', 'TRUE') AS extra
    FROM global.new_store_data a
    JOIN global.store_attributes_filter saf 
    USING (store_code)
    WHERE allocation_start_date >= CURRENT_DATE
    and open_date >= current_date
     AND saf.retail_facility_code NOT IN (
          SELECT name FROM global.store_groups
      );

     insert into "global".store_groups_mapping
     select sg_code,store_code  from "global".store_groups 
     join "global".store_attributes_filter
     on name = retail_facility_code  
     where sg_code not in (SELECT sg_code FROM "global".store_groups_mapping);
     
     insert into "global".store_groups_mapping(sg_code,store_code) 
    select store_group,store_code from(
    select foo.store_group ,foo.store_code,b.open_date from(
    select store_code, unnest(array(SELECT CAST(elem AS integer) FROM unnest(a.store_groups) AS elem)) as store_group from global.new_store_data  a
    ) as foo
   
    left join "global".store_attributes_filter b
    using(store_code)
    where open_date = current_date
    and store_code not in (select store_code from  "global".store_groups_mapping)
    )as foo1;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;