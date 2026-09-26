--liquibase formatted sql
--changeset liquibase:inv_dc_view_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for inv_dc_view_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.inv_dc_view_list(input date, date, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.inv_dc_view_list(input date, date, jsonb, jsonb, jsonb)
 RETURNS TABLE(fy integer, fw integer, fiscal_week_begin_date date, product_name character varying, store_name character varying, product_code character varying, store_code character varying, date date, oh double precision, it double precision, oo double precision, dc_name character varying, level double precision, "position" double precision)
 LANGUAGE plpgsql
AS $function$
declare
	_query_table_filters text := '';
	_query_pa text;
	_query_sa text;
	_query_combine text;
	_pa_filter_cnt int := 0;
	_sa_filter_cnt int := 0;
	_filter_con text := ' ';
	begin
		SELECT count(*) INTO _pa_filter_cnt from jsonb_each_text($3);
		SELECT count(*) INTO _sa_filter_cnt from jsonb_each_text($4);
		_query_table_filters := "global".form_table_query($5);
		if _pa_filter_cnt > 0 then
			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
			_filter_con := _filter_con || ' JOIN (' || _query_pa || ') pa ON inv.product_code = pa.product_code ';
		end if;
		if _sa_filter_cnt > 0 then
			_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
			_filter_con := _filter_con || ' JOIN (' || _query_sa || ') sa ON inv.store_code = sa.store_code ';
		end if;
 		_query_combine := '
			select
				*
			from
				(
				select inv.*, sa.dc_name from (select product_code, store_code, date, oh, it, oo from "global".inventory_master where date >= ''' || $1 || ''' and date <= ''' || $2 || ''') inv
				' || _filter_con || '
			) X' || _query_table_filters;
		_query_combine := 'select fc.fy, fc.fw, fc.fiscal_week_begin_date, pm.product_name, sm.store_name, qc.*, 0::float8 as level, 0::float8 as position from (' || _query_combine || ') qc join "global".fc_fy_fw_level fc on qc.date = fc.date JOIN "global".product_master pm on qc.product_code = pm.product_code JOIN "global".store_master sm on qc.store_code = sm.store_code';
--		raise notice '%',_query_combine;
		return query execute _query_combine;
	end
$function$
;
