--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:populate_fc_dc_store_attribute_sp1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start1
--comment: populate_fc_dc_store_attribute1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS "global".populate_fc_dc_store_attribute();

CREATE OR REPLACE PROCEDURE global.populate_fc_dc_store_attribute() 
LANGUAGE plpgsql 
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.populate_fc_dc_store_attribute';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
INSERT INTO
  "global".distribution_centres (
    "name",
    is_active,
    is_deleted,
    linked_store_code
  )
SELECT
  concat(sm.store_code, '_', sm.store_name),
  sm.active,
  sm.is_deleted,
  sm.store_code
FROM
  global.store_master as sm
WHERE
  sm.special_classification = 'WHS' ON CONFLICT (linked_store_code) do
update
set
  is_active = excluded.is_active,
  is_deleted = excluded.is_deleted,
  "name" = excluded."name";
UPDATE
  "global".store_master t1
SET
  dc_code = t2.dc_code
FROM
  "global".distribution_centres t2
WHERE
  t1.store_code = t2.linked_store_code;
DELETE FROM
  "global".store_attributes
WHERE
  attribute_name = 'dc_name';
INSERT INTO
  "global".store_attributes
SELECT
  linked_store_code AS store_code,
  'dc_name' AS attribute_name,
  name AS attribute_value
FROM
  "global".distribution_centres;
CALL global.build_store_attributes_filter('');
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;