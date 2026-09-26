--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:mfp_lf_master_new stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: re initial changeset for mfp_lf_master

CREATE TABLE item_smart.mfp_lf_master (
	hierarchy_code float8 NOT NULL,
    l0_name text NOT NULL,
    l1_name text NOT NULL,
    l2_name text NOT NULL,
    l3_name text NOT NULL, 
    l4_name text NOT NULL, 
    s0_name text NOT NULL, 
    channel text NOT NULL, 
    fiscal_year float8 NOT NULL, 
    fiscal_year_season float8 NOT NULL, 
    fiscal_year_quarter float8 NOT NULL, 
    fiscal_year_month float8 NOT NULL, 
    current_week float8 NOT NULL, 
    net_sales_dollars float8 NULL, 
    net_sales_units float8 NULL, 
    written_aur float8 NULL,
    written_auc float8 NULL, 
    written_gm_dollar float8 NULL, 
    written_gm_perc float8 NULL,  
    total_receipt_units float8 NULL, 
    total_recepit_costs float8 NULL,  
    on_order_placed_total_unit float8 NULL,  
    eop_units float8 NULL,
    written_air float8 NULL, 
    created_by int8 DEFAULT 1 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_by int8 DEFAULT 1,
    updated_at timestamptz,
	CONSTRAINT pk_mfp_lf_master PRIMARY KEY (l1_name, current_week, channel, hierarchy_code)
	)
PARTITION BY LIST (l1_name);
CREATE INDEX idx_mfp_lf_master_channel ON item_smart.mfp_lf_master USING btree (channel);
CREATE INDEX idx_mfp_lf_master_curr_wk ON item_smart.mfp_lf_master USING btree (current_week);
CREATE INDEX idx_mfp_lf_master_l1_name ON item_smart.mfp_lf_master USING btree (l1_name);
CREATE INDEX idx_mfp_lf_master_hcode ON item_smart.mfp_lf_master USING btree (hierarchy_code);