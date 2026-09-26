--liquibase formatted sql
--changeset liquibase:product_rule_sg_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-70622 labels:MTP-70622
--comment: MTP-70622-add-total-record-count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_sg_mapping(refcursor, text, _varchar, int4, _int4, _int4, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_sg_mapping(input refcursor, text, character varying[], integer, integer[], integer[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
_query_combine text := '';
_query_table_filters text := '';
_channel_where_condition text := '';
_cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'application_code', $4, 'available_list', $5, 'default_list', $6);
begin
	
	if cardinality($3) = 0 then
		raise notice 'no channel passs %,',$3;
		_channel_where_condition = ' ';
	else
		_channel_where_condition = ' where channel in (''' || array_to_string($3, ''',''', '') || ''')';
	end if;
	
	raise notice '%',_channel_where_condition;
	_query_table_filters := global.form_table_query($7);
	_query_combine := '
with ph_data as (
				select * from (select 
					l0_name, l1_name, l3_name, l4_name, ph_code, channel
				from inventory_smart.ph_master ph where article = ''' || $2 || ''') as x
		)
--		select * from ph_data;
		,
		store_group_mapping as (
			select 
				psaf.store_code,
				psaf.psa_code,
				psaf.psa_name,
				sgm.sg_code,
				sg."name" as sg_name
				from ph_data ph
				join "global".product_store_attributes_filter psaf 
					on ph.l0_name = psaf.l0_name
					and ph.l1_name = psaf.l1_name
					and ph.l3_name = psaf.l3_name
					and ph.l4_name = psaf.l4_name
				join "global".aggregated_store_groups_mapping sgm 
				join "global".store_groups sg using (sg_code)
				on sgm.psa_code = psaf.psa_code 
				where sg.application_code = ' || concat($4) ||' and sg.is_deleted = false
				group by 1, 2, 3, 4, 5
		)
--		select * from store_group_mapping;
		,
		store_count_mapping as (
			select 
				sg_code, 
				sg_name, 
				psa_name, 
				count(distinct store_code) store_count 
			from store_group_mapping sgm 
			group by 1,2,3
		)
--		select * from store_count_mapping;
		,final_result as (
			select sg_code, sg_name,
			case when sgm.default_sg is null then false else true end as mapped,
			json_agg(json_build_object(''psa_name'', psa_name, ''store_count'', store_count)) as store_details
			from store_count_mapping psm
			left join (select unnest('''|| concat($6) ||'''::int[]) as default_sg) as sgm on sgm.default_sg = psm.sg_code
			group by 1,2,3 order by mapped desc
		)
		SELECT *, COUNT(1) OVER() AS count FROM final_result' || _query_table_filters;
	raise notice '%',_query_combine;
	open $1 for execute _query_combine;
	RETURN $1;
 	end
$function$
;
