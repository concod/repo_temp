--liquibase formatted sql
--changeset liquibase:po_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.po_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.po_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(po_code integer, source_po_code character varying, product_code character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_quantity real, description text, line_number integer, product_description text, is_updated boolean, attributes jsonb, dc_map json)
 LANGUAGE plpgsql
AS $function$
/*  
 * Function/Procedure name: global.po_list
 * Created by: Ashish Gupta 
 * Created at: 15-Dec-2020
 * No of input parameter: 3
 * Parameter Description : $1 = table_name
 *                         $2 = attribute table_filter   
 * 						   $3 =	pagination (limit)		
 * Purpose: This function been created to get the list of products 
 * Calling Statement:   
 *  select * from global.po_list('{}','{"style": []}', '{"search": [{"column": "product_code", "pattern": "044736010612"}], "sort": [], "range": [], "limit": {"limit": 10, "page": 1}}')
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    12-Jan-2022:    Added active flag to filter out the inactive product  added stattement (where main.active )
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'SELECT * FROM (select
			po.po_code,
			po.source_po_code,
			po.product_code,
			po.created_at,
			po.updated_at,
			po.total_quantity,
			po.description,
			po.line_number,
			pm.product_description,
			(case
				when po.updated_at > po.created_at then true
				else false
			end) as is_updated,
			attr.attributes,
			po_dc.dc_map
		from
			"global".product_order_master po
		join (SELECT main.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code where main.active ) pm
		on
			po.product_code = pm.product_code
		left join (
			select
				po_code,
				json_agg(
					json_build_object(
						''dc'', dc,
						''quantity'', quantity,
						''quantity_perc'', quantity_perc
					)
				) as dc_map
			from
				"global".product_order_dc_mapping
			group by
				po_code) po_dc on
			po.po_code = po_dc.po_code
		left join (
			select
				poa1.po_code,
				jsonb_build_object(
					''issue_date'', poa1.issue_date,
		    		''expected_receive_date'', poa2.expected_receive_date,
		    		''vendor_name'', poa3.vendor_name
		    ) as attributes
			from
				(
				select
					po_code,
					attribute_value as issue_date
				from
					"global".product_order_attributes
				where
					attribute_name = ''issue_date'') poa1
			left join (
				select
					po_code,
					attribute_value as expected_receive_date
				from
					"global".product_order_attributes
				where
					attribute_name = ''expected_receive_date'') poa2 on
				poa1.po_code = poa2.po_code
			left join (
				select
					po_code,
					attribute_value as vendor_name
				from
					"global".product_order_attributes
				where
					attribute_name = ''vendor_name'') poa3 on
				poa2.po_code = poa3.po_code
			group by
				1,
				2) attr
		on
			po.po_code = attr.po_code) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
