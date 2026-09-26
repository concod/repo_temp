--liquibase formatted sql
--changeset liquibase:po_rebalance_base_if_not_exists stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: po_rebalance_base_if_not_exists

CREATE TABLE IF NOT EXISTS inventory_smart.po_rebalance_base (
	product_code varchar NULL,
	loc_code varchar NULL,
	channel varchar NULL,
	fiscal_year_week int4 NULL,
	dc_inv_bop_post_allocation float4 NULL,
	po_inbound float4 NULL,
	total_store_forecast float4 NULL,
	total_store_wos_demand int4 NULL,
	total_target_store_inv float4 NULL,
	store_allocation_unconstrained float4 NULL,
	l4w_ss float4 NULL,
	lw_ss float4 NULL,
	total_store_bop_inv float4 NULL,
	safety_stock float4 NULL,
	dc_inv_wos float4 NULL,
	store_inv_wos float4 NULL
);