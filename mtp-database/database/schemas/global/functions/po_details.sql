--liquibase formatted sql
--changeset liquibase:po_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.po_details(input integer);
CREATE OR REPLACE FUNCTION global.po_details(input integer)
 RETURNS TABLE(po_code integer, source_po_code character varying, product_code character varying, created_at timestamp with time zone, updated_at timestamp with time zone, total_quantity real, description text, line_number integer, product_name character varying, product_description text, style character varying, size character varying, color character varying, is_updated boolean, attributes jsonb, dc_map json)
 LANGUAGE plpgsql
AS $function$
declare
	_pm_filters jsonb;
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_product_code text;
	_product_code_sql text;
	begin
		_product_code_sql := 'select product_code from "global".product_order_master where po_code = ' || $1;
		execute _product_code_sql into _product_code;
--		raise notice '%',_product_code;
		_pm_filters := '{"product_code":[{"type":"list", "operator":"in", "values":["' || _product_code || '"]}]}';
--		raise notice '%',_pm_filters;
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', _pm_filters));
 		_query_pa := "global".form_attribute_table_filters('product_attributes', 'product_code', '{"style":[], "size":[], "color":[]}');
		_query_combine := 'select
			po.po_code,
			po.source_po_code,
			po.product_code,
			po.created_at,
			po.updated_at,
			po.total_quantity,
			po.description,
			po.line_number,
			pm.product_name,
			pm.product_description,
			pm.style,
			pm.size,
			pm.color,
			(case
				when po.updated_at > po.created_at then true
				else false
			end) as is_updated,
			attr.attributes,
			po_dc.dc_map
		from
			(SELECT * FROM "global".product_order_master where po_code = ' || $1 || ') po
		join (SELECT main.*, attributes.size, attributes.color, attributes.style FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code) pm
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
			where po_code = ' || $1 || '
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
					po_code = ' || $1 || ' and
					attribute_name = ''issue_date'') poa1
			left join (
				select
					po_code,
					attribute_value as expected_receive_date
				from
					"global".product_order_attributes
				where
					po_code = ' || $1 || ' and
					attribute_name = ''expected_receive_date'') poa2 on
				poa1.po_code = poa2.po_code
			left join (
				select
					po_code,
					attribute_value as vendor_name
				from
					"global".product_order_attributes
				where
					po_code = ' || $1 || ' and
					attribute_name = ''vendor_name'') poa3 on
				poa2.po_code = poa3.po_code
			group by
				1,
				2) attr
		on
			po.po_code = attr.po_code';
--		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
