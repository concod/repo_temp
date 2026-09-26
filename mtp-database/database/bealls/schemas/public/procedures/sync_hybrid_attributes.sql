--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_hybrid_attributes_with_rcl_support runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-20302
--comment:  rcl hash support sync_hybrid_attributes procedure
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  _rcl_hash text; 
  _worker text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  raise notice 'Running RCL Sync';
  SELECT STRING_AGG(DISTINCT v, ' || ') 
  INTO _rcl_hash
  FROM (
    SELECT
      'jsonb_build_object(' || global.get_rcl_hash_query_v2(rcl_code, level) || ')' AS v,
      UNNEST(level) AS l
    FROM global.rcl_master
    WHERE NOT is_deleted
  ) x;

  PERFORM public.parellel_insert('
    WITH ROWS AS (
      UPDATE global.product_attributes_filter t1
      SET
          rcl_hash = t2.rcl_hash
      FROM (
        SELECT
          product_code,
          ' || _rcl_hash || ' AS rcl_hash
        FROM global.product_attributes_filter paf {where}
        AND paf.active = TRUE
      ) t2
      WHERE t1.product_code = t2.product_code
      RETURNING 1
    )
    SELECT COUNT(1) AS cnt FROM ROWS;',
    50, 'global.product_attributes_filter', 'product_code', NULL, 5000
  );
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;