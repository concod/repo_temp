--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_reco_finalized_v2_snapshot stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_reco_finalized_v2_snapshot

CREATE TABLE base_pricing.bp_price_reco_finalized_v2_snapshot (
    LIKE base_pricing.bp_price_reco_finalized_v2 
    INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY LIST (strategy_id);