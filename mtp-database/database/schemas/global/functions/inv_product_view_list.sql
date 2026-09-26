--liquibase formatted sql
--changeset liquibase:inv_product_view_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inv_product_view_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.inv_product_view_list(input date, date, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.inv_product_view_list(input date, date, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, dc character varying, weeks jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_table_filters text := '';
	_query_pa text;
	_query_combine text;
	_pa_filter_cnt int := 0;
	_pm_con text := 'SELECT pm.* FROM (SELECT product_code, product_name from global.product_master) pm';
	fw_id varchar;
	start_date date;
	end_date date;
	_fw_id_con text := 'case';
	begin
		SELECT count(*) INTO _pa_filter_cnt from jsonb_each_text($3);
		_query_table_filters := "global".form_table_query($4);
		if _pa_filter_cnt > 0 then
			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
			_pm_con := _pm_con || ' JOIN (' || _query_pa || ') pa ON pm.product_code = pa.product_code ' || _query_table_filters;
		end if;
		for fw_id, start_date, end_date in select
				concat(fy, '-', fw)::varchar as fw_id,
				fiscal_week_begin_date,
				fiscal_week_end_date
			from
				global.fc_fy_fw_level
			where
				date >= $1
				and
			date <= $2
			group by
				1,
				2,
				3 order by 2,3 asc loop 
			_fw_id_con := _fw_id_con || ' when date >= ''' || start_date || ''' and date <= ''' || end_date || ''' then ''' || fw_id || '''';
			raise notice '%,%,%',fw_id, start_date, end_date;
		end loop;
		_fw_id_con := _fw_id_con || 'end as fw_id';
 		_query_combine := '
			select
				product_code,
				product_name,
				name as dc,
				jsonb_agg(jsonb_build_object(''fw_id'', fw_id, ''available_qty'', available_qty, ''required_qty'', required_qty)) as weeks
			from
				(
				select
					pm.product_code,
					pm.product_name,
					dc.name,
					inv.fw_id,
					sum(inv.oh) as available_qty,
					sum(inv.oo) as required_qty
				from
					(' || _pm_con || ') pm
				left join (
					select
						' || _fw_id_con || ',
						product_code,
						store_code,
						oh,
						oo
					from
						global.inventory_master
					where
						date >= ''' || $1 || '''
						and date <= ''' || $2 || '''
					) inv
			 on
					pm.product_code = inv.product_code
				join (
					select
						dc.name,
						sm.store_code
					from
						global.distribution_centres dc
					join global.store_master sm on
						dc.dc_code = sm.dc_code) dc
			on
					inv.store_code = dc.store_code
				group by
					pm.product_code,
					pm.product_name,
					dc.name,
					inv.fw_id) x
			group by
				1,
				2,
				3';
--		_query_combine := 'select fc.fy, fc.fw, fc.fiscal_week_begin_date, pm.product_name, sm.store_name, qc.* from (' || _query_combine || ') qc join "global".fc_fy_fw_level fc on qc.date = fc.date JOIN "global".product_master pm on qc.product_code = pm.product_code JOIN "global".store_master sm on qc.store_code = sm.store_code';
--		raise notice '%',_query_combine;
		return query execute _query_combine;
	end
$function$
;
