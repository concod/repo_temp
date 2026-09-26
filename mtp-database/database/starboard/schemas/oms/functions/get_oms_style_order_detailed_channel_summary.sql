--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:Added_style_order_summary_dc_view_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-94352 labels:style_order_summary_v1
--comment: take distinct for raw_roq and roq_unconstrained
--rollback: SELECT 1

Drop function if exists oms.get_oms_style_order_detailed_channel_summary(refcursor,jsonb,jsonb,text,text,text,text);

CREATE OR REPLACE FUNCTION oms.get_oms_style_order_detailed_channel_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
v_order_detailed_summary_sql TEXT := '';
v_order_filter text := '';
v_choice_filter text := '';
v_time_filter text := '';
v_meta_cls text := '';
v_where text := '';
search_json jsonb := '{}';
limit_json jsonb := '{}';
sort_json jsonb := '{}';
v_sort_cls text := '';
v_limit_cls text := '';
v_product_filter_sql text := '';

begin
-- Generate product attribute filter SQL
v_product_filter_sql := oms.form_main_table_filters('product_attributes_filter',
product_filter);
-- Add product attributes filter join
v_where := 'JOIN (SELECT * FROM global.product_attributes_filter ' || v_product_filter_sql || ') paf ON paf.product_code = oor.product_code';
-- Generate Order filter
    if order_group_id is not null then
        v_order_filter := 'oor.order_group_id = ''' || order_group_id || '''';
else
        v_order_filter := '0=1';
-- No order filter applied if the value is null
end if;
-- Generate Choice filter dynamically
    if styles is not null then
        v_choice_filter := 'oor.article IN (' || styles || ')';
else
        v_choice_filter := '0=1';
-- No Choice filter applied if the array is empty
end if;
-- Generate month and fiscal month filter
    if (months is not null
and months <> '')
or (fiscal_weeks is not null
and fiscal_weeks <> '') then
        v_time_filter := '(';

if months is not null
and months <> '' then
            v_time_filter := v_time_filter || 'UPPER(TRIM(oor.month)) IN (' || upper(months) || ')';
end if;

if fiscal_weeks is not null
and fiscal_weeks <> '' then
            if months is not null
and months <> '' then
                v_time_filter := v_time_filter || ' OR ';
end if;

v_time_filter := v_time_filter || 'oor.fiscal_year_week IN (' || fiscal_weeks || ')';
end if;

v_time_filter := v_time_filter || ')';
else
        v_time_filter := '1=1';
-- No time filter applied if both arrays are empty
end if;

search_json = meta;

if meta <> '{}'
and meta -> 'limit' is not null then
-- Extract the 'limit' object
limit_json := meta -> 'limit';

search_json := search_json - 'limit';

v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
end if;

if meta <> '{}'
and meta -> 'sort' is not null then
-- Extract the 'sort' object
sort_json := meta -> 'sort';

search_json := search_json - 'sort';

v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json)) ;
end if;
-- Generate meta conditions dynamically if provided
    if meta <> '{}' then
        v_meta_cls := global.form_table_query(search_json);

v_meta_cls := replace(v_meta_cls, 'loc_code', 'oor.loc_code');
end if;
-- Build the main query
v_order_detailed_summary_sql := '
WITH shipment_modes AS (
    SELECT 
        oclt.loc_code,
        oclt.article,
		oclt.mode_shipment,
        MAX(oclt.po_to_order_processing) as po_to_order_processing,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''shipment_mode'', oclt.mode_shipment,
                ''lead_time'', oclt.lead_time,
                ''default_mode'', oclt.default_mode
            )
        ) AS shipment_modes
    FROM 
        oms.oms_constraints_lead_time oclt
    GROUP BY 
        oclt.loc_code, 
        oclt.article,
        oclt.mode_shipment
),
oor_cte AS (
    SELECT *
    FROM oms.oms_orders_recommended oor
    WHERE ' || v_order_filter || ' AND ' || v_choice_filter || ' AND ' || v_time_filter || '
),
paf_cte AS (
    SELECT *
    FROM global.product_attributes_filter  
    ' || v_product_filter_sql || '
),
loc_code_grouping_cte AS (
    SELECT
        saf.dc_name,
		paf.size,
        max(oor.order_group_id) as order_group_id,
        max(oor.article) as article,
        max(paf.primary_vendor_name) as primary_vendor_name,
        max(oor.id) as id,
        MAX(oor.mode_shipment) as mode_shipment,
        SUM(oor.order_quantity) as order_quantity,
        SUM(oor.unit_cost * oor.order_quantity) as order_cost,
        SUM(oor.elt_projected_bop) as projected_bop,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) as system_inv,
        sum(oor.elt_projected_safety_stock) as safety_stock,
        sum(oor.unit_cost) as unit_cost,
        SUM(oor.raw_roq) as raw_roq,
		SUM(oor.elt_projected_store_inv) as store_inv,
        SUM(oor.roq_unconstrained * paf.cost) as roq_unconstrained,
        AVG(oor.lead_time)::integer as lead_time,
        SUM(oor.roq_constrained) as roq_constrained,
        MIN(ok.min_order_quantity_sku) as min_order_quantity,
        MAX(ok.max_order_quantity_sku) as max_order_quantity,
		MAX(sm.shipment_modes::TEXT)::JSON AS shipment_modes,
		MAX(oor.order_type) as order_type,
        MAX(sm.po_to_order_processing) as po_to_order_processing,
        oor.editable_expected_receipt_date,
        oor.order_placement_date,
        -- projected_delivery_date,
		oor.expected_receipt_date,
        oor.order_status_id
    FROM
        oor_cte oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN 
        shipment_modes sm ON sm.loc_code = oor.loc_code AND sm.article = oor.article 
    LEFT JOIN
        oms.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    JOIN paf_cte paf ON paf.product_code = oor.product_code
    LEFT JOIN
        global.store_attributes_filter saf ON oor.loc_code = saf.store_code
    GROUP BY 
       saf.dc_name,
		paf.size,
       oor.editable_expected_receipt_date,
       oor.order_placement_date,
	   oor.expected_receipt_date,
       oor.order_status_id
)

select
dc_name,
MAX(mode_shipment) as mode_shipment,
SUM(order_quantity) as order_quantity,
SUM(order_cost) as order_cost,
SUM(projected_bop) as projected_bop,
MAX(shipment_modes::TEXT)::JSON AS shipment_modes,
SUM(system_inv) as system_inv,
sum(safety_stock) as safety_stock,
sum(unit_cost) as unit_cost,
SUM(raw_roq) as raw_roq,
SUM(roq_unconstrained) as roq_unconstrained,
MAX(lead_time) as lead_time,
SUM(roq_constrained) as roq_constrained,
MIN(min_order_quantity) as min_order_quantity,
MAX(max_order_quantity) as max_order_quantity,
MAX(po_to_order_processing) as po_to_order_processing,
MAX(order_type) as order_type,
sum(store_inv) as store_inv,
editable_expected_receipt_date,
order_placement_date,
expected_receipt_date,
order_status_id,

JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', id,
            ''order_group_id'', order_group_id,
            ''article'', article,
            ''primary_vendor_name'', primary_vendor_name,
            ''size'', size,
            ''order_placement_date'', order_placement_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            ''expected_receipt_date'', expected_receipt_date,
            ''order_quantity'', order_quantity,
            ''order_cost'', order_cost,
			''store_inv'', store_inv,
            ''projected_bop'', projected_bop,
            ''system_inv'', system_inv,
            ''safety_stock'', safety_stock,
            ''unit_cost'', unit_cost,
            ''raw_roq'', raw_roq,
            ''roq_unconstrained'', roq_unconstrained,
            ''lead_time'', lead_time,
            ''roq_constrained'', roq_constrained,
            ''min_order_quantity'', min_order_quantity,
            ''max_order_quantity'', max_order_quantity,
            ''po_to_order_processing'', po_to_order_processing,
            ''order_status_id'', order_status_id,
            ''order_type'', order_type
        )
' || v_sort_cls || '
    ) AS status_obj from loc_code_grouping_cte
'||v_meta_cls|| '  
    group by dc_name, editable_expected_receipt_date, order_placement_date, expected_receipt_date, order_status_id
        ' || v_limit_cls || '';

raise notice 'v_order_detailed_summary_sql: %',
v_order_detailed_summary_sql;
-- Open the cursor for the constructed query
    open input for execute v_order_detailed_summary_sql;

return input;
end
$function$
;