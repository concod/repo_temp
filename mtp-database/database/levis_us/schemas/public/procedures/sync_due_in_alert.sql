--liquibase formatted sql
--changeset himansh.bhardwaj:adding_on_floor_date_and_markdown_date  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding_on_floor_date_and_markdown_date
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_due_in_alert();
CREATE OR REPLACE PROCEDURE public.sync_due_in_alert()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_due_in_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from 
          inventory_smart.due_in_alert
        where 
          true;
        insert into inventory_smart.due_in_alert (
           l7_code,article,color,l3_name,l4_name,l5_name,l6_name,fiscal_year,
           fiscal_week,available_due_in_to_allocate,action,dc_mapped,
           due_in_alert_is_resolved,due_in_alert_flag,l0_name,l2_name,article_description,
           display_article,l1_name,po_code,product_group,dc_assignment, on_floor_date, markdown_date
        ) 
        SELECT 
           l7_code,article,color,l3_name,l4_name,l5_name,l6_name,fiscal_year,
           fiscal_week,available_due_in_to_allocate,action,dc_mapped,
           due_in_alert_is_resolved,due_in_alert_flag,l0_name,l2_name,article_description,
           display_article,l1_name,po_code,product_group,paf.dc_assignment, on_floor_date, markdown_date
        FROM 
          public.due_in_alert x
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
				using(article)
		left join (
			Select article,max(dc_assignment) as dc_assignment
			from global.product_attributes_filter 
            group by 1
		) paf
		using(article)
;
          
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$
;
