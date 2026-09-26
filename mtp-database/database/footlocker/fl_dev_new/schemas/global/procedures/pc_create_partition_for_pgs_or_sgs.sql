--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_create_partition_for_pgs_or_sgs_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pg_change_1 for pc_create_partition_for_pgs_or_sgs_1

DROP PROCEDURE IF EXISTS global.pc_create_partition_for_pgs_or_sgs;

CREATE OR REPLACE PROCEDURE global.pc_create_partition_for_pgs_or_sgs(IN _table_name text, IN _id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.pc_create_partition_for_pgs_or_sgs';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	partition_table_name text;
	partition_create_query text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    partition_table_name = format('%s_%s', _table_name, _id::text);
    partition_create_query = format(
        'CREATE TABLE IF NOT EXISTS global.%I PARTITION OF global.%I FOR VALUES IN (%L)',
        partition_table_name, _table_name, _id::text
    );
    
    -- Raise notice to show the generated query
    RAISE NOTICE 'partition_create_query: %', partition_create_query;

    -- Execute the partition creation query
    EXECUTE partition_create_query;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
