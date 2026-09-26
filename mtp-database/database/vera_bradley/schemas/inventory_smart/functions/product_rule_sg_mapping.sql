--liquibase formatted sql
--changeset liquibase:product_rule_sg_mapping runOnChange:true stripComments:false splitStatements:false context:Release_2_0_1 labels:MTP-21995
--comment: bugfix: MTP-21995-Store group popup throwing error
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_sg_mapping(input refcursor, text, character varying[], integer, integer[], integer[], jsonb);
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
_sg_query text := '';
begin
	
 	IF array_length($6, 1) IS NULL OR array_length($6, 1) = 0 THEN
 		_sg_query := ' false ';
 	else
 		_sg_query := 'sg.sg_code IN (''' || array_to_string($6, ''',''') || ''')';
 	end if;
	
	if cardinality($3) = 0 then
		raise notice 'no channel passs %,',$3;
		_channel_where_condition = ' ';
	else
		_channel_where_condition = ' where channel in (''' || array_to_string($3, ''',''', '') || ''')';
	end if;
	
	raise notice '%',_channel_where_condition;
	_query_table_filters := global.form_table_query($7);
	_query_combine := '
		with product_store_mapping as (
			select 
				article,
				saf.store_code,
				saf.store_name
				from "global".product_attributes_filter paf 
				join global.product_mapping_product_store pmps on pmps.product_code = paf.product_code and pmps.l0_name = paf.l0_name 
				join "global".store_attributes_filter saf on pmps.store_code = saf.store_code
				where article = '''|| $2 ||''' and is_active = true and validity is not null and saf.is_deleted = false
				group by 1,2,3
		)
		--select * from product_store_mapping psm 
		, available_store_groups as (
			select 
				sg.sg_code,
				sg."name" as sg_name
--				psm.store_code,
--				psm.store_name
			from 
			product_store_mapping psm
			join "global".store_groups_mapping sgm on
			sgm.store_code = psm.store_code
			join (select * from "global".store_groups ' || _channel_where_condition || ') sg on sgm.sg_code = sg.sg_code 
			where sg.application_code = ' || concat($4) ||' and sg.is_deleted = false
			group by 1,2
		)
		--select * from available_store_groups
		, disabled_store_groups as (
			SELECT
		        sg.sg_code,
		        sg."name" AS sg_name,
		        true AS is_disabled,
				''[]''::jsonb AS store_details
		    FROM
		        "global".store_groups sg
		    WHERE
		        sg.application_code = ' || concat($4) || ' AND sg.is_deleted = false
		        AND '|| _sg_query ||'
		        AND sg.sg_code NOT IN (
            SELECT sg_code FROM available_store_groups
        	)
		)
		, store_group_with_all_store_codes as (
			select 
				asg.sg_code,
				asg.sg_name,
				saf2.store_code,
				saf2.store_name
			from 
				available_store_groups asg
			join "global".store_groups_mapping sgm2 on asg.sg_code = sgm2.sg_code
			join "global".store_attributes_filter saf2 on sgm2.store_code = saf2.store_code 
			where saf2.active
			group by 1,2,3,4
			order by 1,2,3
		)
		,final_result as (
			SELECT
		        sg_code, sg_name, is_disabled,
		        CASE WHEN sgmapping.default_sg IS NULL THEN false ELSE true END AS mapped,
		        store_details
		    FROM (
		        SELECT
		            sg_code,
		            sg_name,
		            false AS is_disabled,
		            json_agg(json_build_object(''store_code'', store_code, ''store_name'', store_name))::jsonb AS store_details
		        FROM
		            store_group_with_all_store_codes asg
		        GROUP BY
		            1, 2, 3
		        UNION ALL
		        SELECT * FROM disabled_store_groups
		    ) asg
		    LEFT JOIN (
		        SELECT unnest('''|| concat($6) ||'''::int[]) AS default_sg
		    ) AS sgmapping ON sgmapping.default_sg = asg.sg_code
		    GROUP BY
		        1, 2, 3, 4, 5
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
