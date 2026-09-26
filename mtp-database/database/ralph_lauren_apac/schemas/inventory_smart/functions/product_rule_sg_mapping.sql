--liquibase formatted sql
--changeset liquibase:product_rule_sg_mapping_V2 runOnChange:true stripComments:false splitStatements:false context:Release_2_0_1 labels:MTP-73019,MTP-95842,MTP-98653,MTP-117291
--comment: added retail region filter for fetching store groups, syntax error fixed,MTP-98653,MTP-117291
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_sg_mapping(input refcursor, text, character varying[], text, integer, integer[], integer[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_sg_mapping(input refcursor, text, character varying[], text, integer, integer[], integer[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
_query_combine text := '';
_query_table_filters text := '';
_channel_where_condition text := '';
_cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'retail_region', $4, 'application_code', $5, 'available_list', $6, 'default_list', $7);
 _sg_query text := '';
begin
 	IF array_length($7, 1) IS NULL OR array_length($7, 1) = 0 THEN
 		_sg_query := ' false ';
 	else
 		_sg_query := 'sg.sg_code IN (''' || array_to_string($7, ''',''') || ''')';
 	end if;

	if cardinality($3) = 0 then
		raise notice 'no channel passs %,',$3;
		_channel_where_condition = ' ';
	else
		_channel_where_condition = ' where channel in (''' || array_to_string($3, ''',''', '') || ''')';
	end if;
	
	raise notice '%',_channel_where_condition;
	_query_table_filters := global.form_table_query($8);
	_query_combine := '
		with product_store_mapping as (
			select 
				article,
				saf.store_code,
				saf.store_name
				from "global".product_attributes_filter paf 
				join global.product_mapping_product_store pmps on pmps.product_code = paf.product_code and pmps.l0_name = paf.l0_name 
				join "global".store_attributes_filter saf on pmps.store_code = saf.store_code
				where article = '''|| $2 ||''' and is_active = true and validity is not null and saf.is_deleted = false and saf.active = true
				and saf.retail_region = ''' || $4 ||'''
				group by 1,2,3
		)
		--select * from product_store_mapping psm 
		,config_store_groups as ( 
		 select article, ph_code, pcm.default_store_groups,pcm.default_store_groups_selected
				from inventory_smart.ph_master 
				left join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)
				' || _channel_where_condition || ' and article = '''|| $2 ||''' 
		)
		--select * from config_store_groups;
		, available_store_groups as (
			select 
				sg.sg_code,
				sg."name" as sg_name,
				case when sg.sg_code = ANY(default_store_groups) then true else false end as available,
				case when sg.sg_code = ANY(default_store_groups_selected) then true else false end as selected
--				psm.store_code,
--				psm.store_name
			from 
			product_store_mapping psm
			join "global".store_groups_mapping sgm on
			sgm.store_code = psm.store_code
			join (select * from "global".store_groups ' || _channel_where_condition || ') sg on sgm.sg_code = sg.sg_code 
			left join config_store_groups using(article)
			where sg.application_code = ' || concat($5) ||' and sg.is_deleted = false
			group by 1,2,3,4
		)
		, disabled_store_groups as (
			SELECT
		        sg.sg_code,
		        sg."name" AS sg_name,
		        true AS is_disabled,
				true as available,
				false as selected,
				''[]''::jsonb AS store_details
		    FROM
		        "global".store_groups sg
		    WHERE
		        sg.application_code = ' || concat($5) || ' AND sg.is_deleted = false
		        AND '|| _sg_query ||'
		        AND sg.sg_code NOT IN (
            SELECT sg_code FROM available_store_groups
        	)
		)
		--select * from available_store_groups
		, store_group_with_all_store_codes as (
			select 
				asg.sg_code,
				asg.sg_name,
				asg.available,
				asg.selected,
				saf2.store_code,
				saf2.store_name,
				saf2.currency_cd,
				saf2.retail_facility_code
			from 
				available_store_groups asg
			join "global".store_groups_mapping sgm2 on asg.sg_code = sgm2.sg_code
			join "global".store_attributes_filter saf2 on sgm2.store_code = saf2.store_code
			group by 1,2,3,4,5,6,7
		)
		,final_result as (
			SELECT
		        sg_code, sg_name, is_disabled, available, selected,
		        CASE WHEN sgmapping.default_sg IS NULL THEN false ELSE true END AS mapped,
		        store_details
		    FROM (
		        SELECT
		            sg_code,
		            sg_name,
		            false AS is_disabled, available, selected,
		            json_agg(json_build_object(''retail_facility_code'', retail_facility_code, ''store_name'', store_name,''currency_cd'',currency_cd))::jsonb as store_details
		        FROM
		            store_group_with_all_store_codes asg
		        GROUP BY
		            1, 2, 3, 4, 5
		        UNION ALL
		        SELECT * FROM disabled_store_groups
		    ) asg
		    LEFT JOIN (
		        SELECT unnest('''|| concat($7) ||'''::int[]) AS default_sg
		    ) AS sgmapping ON sgmapping.default_sg = asg.sg_code
		    GROUP BY
		        1, 2, 3, 4, 5, 6, 7
		    ORDER BY
		        mapped desc, is_disabled asc
		)
		select * from final_result' || _query_table_filters;
	raise notice '%',_query_combine;
	open $1 for execute _query_combine;
	RETURN $1;
 	end
$function$
;