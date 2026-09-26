--liquibase formatted sql
--changeset raghav.kirkol:SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS  public.sync_tb_pack_min_max();

CREATE OR REPLACE PROCEDURE public.sync_tb_pack_min_max()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_pack_min_max';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  INSERT INTO size_smart.tb_pack_min_max (
    l0_name,
    l1_name,
    l3_name,
    l5_name,
    display_article,
    pack_min,
    pack_max,
    created_at,
    updated_at
  )
  -- Insert from article_null = 0 (all go in)
  (
    SELECT DISTINCT
      l0_name,
      l1_name,
      l3_name,
      l5_name,
      display_article,
      pack_min,
      pack_max,
      created_at::timestamptz AT TIME ZONE 'Asia/Kolkata',
      updated_at::timestamptz AT TIME ZONE 'Asia/Kolkata'
    FROM public.size_SSC
    WHERE article_null = 0
  )

  UNION ALL

  -- Insert  from article_null = 1, excluding any matching l0_name, l1_name, l3_name, l5_name from article_null = 0
  (
    SELECT DISTINCT
      s1.l0_name,
      s1.l1_name,
      s1.l3_name,
      s1.l5_name,
      s1.display_article,
      s1.pack_min,
      s1.pack_max,
      s1.created_at::timestamptz AT TIME ZONE 'Asia/Kolkata',
      s1.updated_at::timestamptz AT TIME ZONE 'Asia/Kolkata'
    FROM public.size_SSC s1
    WHERE s1.article_null = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.size_SSC s0
        WHERE s0.article_null = 0
          AND s0.l0_name = s1.l0_name
          AND s0.l1_name = s1.l1_name
          AND s0.l3_name = s1.l3_name
          AND s0.l5_name = s1.l5_name
          AND s0.display_article = s1.display_article
      )
  )

  ON CONFLICT (
    l0_name,
    l1_name,
    l3_name,
    l5_name,
    display_article
  ) DO UPDATE
  SET
    pack_min = EXCLUDED.pack_min,
    pack_max = EXCLUDED.pack_max,
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
