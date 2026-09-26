--liquibase formatted sql
--changeset himansh.bhardwaj:adding_on_floor_date_and_markdown_date  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding_on_floor_date_and_markdown_date
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_markdown_alert();
CREATE OR REPLACE PROCEDURE public.sync_markdown_alert()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_markdown_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

  DELETE FROM inventory_smart.markdown_alert;

  INSERT INTO inventory_smart.markdown_alert (
    l7_code, article, color, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, available_dc_oh, store_oh, store_it, store_oo, planned_clearance_date, dc_mapped, vir_reservation_remaining_pdu_remaining, iob, fwos, instock_percentage, markdown_flag, markdown_is_resolved, article_description, display_article, product_group, dc_assignment, on_floor_date, markdown_date
  )
  SELECT
    l7_code, article, color, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, available_dc_oh::jsonb, store_oh, store_it, store_oo, planned_clearance_date, dc_mapped, vir_reservation_remaining_pdu_remaining::jsonb, iob::jsonb, fwos, instock_percentage, markdown_flag, markdown_is_resolved, article_description, display_article, product_group, dc_mapped as dc_assignment, on_floor_date, markdown_date
  FROM public.markdown_alert x
  LEFT JOIN (Select distinct article,display_article from global.product_attributes_filter paf) paf
  USING(article)
  left join
			(
			select distinct article,array(SELECT jsonb_array_elements_text(product_group::jsonb))::varchar[] as product_group from
			(
			select distinct article,product_groups ->> 'name' as product_group 
			from
				(
				select
					article,
					json_build_object(
					'name',
					array_agg(distinct name)) as product_groups
				from
					(
					select
						distinct a.product_code,
						paf.article,
						a.pg_code,
						b.name
					from
						global.product_groups_mapping a
					inner join (
						select
							distinct pg_code,
							name,
							is_deleted
						from
							global.product_groups) b
							using(pg_code)
					inner join global.product_attributes_filter paf 
					using(product_code)
					where b.is_deleted is false ) b
				group by
					1 
				) a ) b ) b
  using(article);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;