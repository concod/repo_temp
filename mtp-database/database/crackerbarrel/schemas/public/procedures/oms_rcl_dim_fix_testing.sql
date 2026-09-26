--liquibase formatted sql
--changeset kaustubh.gupta:added oms_rcl_dim_fix_testing runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added oms_rcl_dim_fix_testing
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.oms_rcl_dim_fix_testing();
CREATE OR REPLACE PROCEDURE public.oms_rcl_dim_fix_testing()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.oms_rcl_dim_fix_testing';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

with 

raw_dim as (
select distinct a.rule_code, a.rcl_dimension ->> 'article' article, concat(
            case when l0_name is null or l0_name = '' then '' else concat('{"l0_name":"', l0_name, '",') end,
            case when l1_name is null or l1_name = '' then '' else concat('"l1_name":"', l1_name, '",') end,
            case when l2_name is null or l2_name = '' then '' else concat('"l2_name":"', l2_name, '",') end,
            case when l3_name is null or l3_name = '' then '' else concat('"l3_name":"', l3_name, '",') end,
            case when l4_name is null or l4_name = '' then '' else concat('"l4_name":"', l4_name, '",') end,
            case when l5_name is null or l5_name = '' then '' else concat('"l5_name":"', l5_name, '",') end,
            case when primary_trait_desc is null or primary_trait_desc = '' then '' else concat('"primary_trait_desc":"', primary_trait_desc, '",') end,
            case when article is null or article = '' then '' else concat('"article":"', article, '"}') end
        )::jsonb as raw_dim
from inventory_smart.rcl_oms_constraint_master_rule a
left join global.product_attributes_filter b
on a.rcl_dimension ->> 'article' = b.article 
where b.rcl_hash ->> '50063' <> md5(a.rcl_dimension::text) and ia_sku_type in ('baby_sku', 'eaches')
)

update inventory_smart.rcl_oms_constraint_master_rule a
set rcl_dimension = b.raw_dim
from raw_dim b
where a.rule_code = b.rule_code;

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