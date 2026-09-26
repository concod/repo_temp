--liquibase formatted sql
--changeset aaqib khan :Supdate statement runOnChange:true stripComments:false splitStatements:false context:Release_3_0 labels:levis_test
--comment: update changeset




DROP PROCEDURE IF EXISTS  public.sync_tb_hierarachy_mst();

CREATE OR REPLACE PROCEDURE public.sync_tb_hierarachy_mst()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_hierarachy_mst';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   INSERT INTO size_smart.tb_hierarachy_mst (
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      l4_name,
      l5_name,
      l6_name,
      l7_name,
      l8_name,
    size_grid_name,
      l9_name,
      image_url,
      l10_name,
      l11_name,
      "level",
      created_at,
      updated_at,
      article_version
   )
   SELECT DISTINCT ON (
      l0_name, l1_name, l2_name, l3_name, l4_name,
      l5_name, l6_name, l7_name,  size_grid_name, l8_name, l9_name,
      l10_name, l11_name
   )
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      l4_name,
      l5_name,
      l6_name,
      l7_name,
      l8_name,
      size_grid_name,
      l9_name,
      image_url,
      l10_name,
      l11_name,
      "level"::int,
      created_at::timestamptz,
      updated_at::timestamptz,
      article_version
   FROM public.tb_hierarachy_mst
   ORDER BY
      l0_name, l1_name, l2_name, l3_name, l4_name,
      l5_name, l6_name, l7_name, size_grid_name ,l8_name, l9_name,
      l10_name, l11_name, updated_at DESC

   ON CONFLICT (
      l0_name,
      l8_name,
      l9_name
   ) DO UPDATE
   SET
      "level" = EXCLUDED."level",
      l1_name = EXCLUDED.l1_name,
      l2_name = EXCLUDED.l2_name,
      l3_name = EXCLUDED.l3_name,
      l4_name = EXCLUDED.l4_name,
      l5_name = EXCLUDED.l5_name,
      l6_name = EXCLUDED.l6_name,
      l7_name = EXCLUDED.l7_name,
      article_version = EXCLUDED.article_version,
      size_grid_name = EXCLUDED.size_grid_name,
      updated_at = EXCLUDED.updated_at;
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
