# StoreCapacityNewTable Context

## APIs (all v3: `isV3: true`)

| Level | Endpoint | Payload |
|-------|----------|---------|
| Store list | `POST .../capacity-breach/store-level` | `{ allocation_code, article, ignore_allocation_code, plan_type, breached_only }` |
| Store detail | `POST .../capacity-breach/store-detail` | Same + `store_code` (no `breached_only`) |

**Service:** `store-capacity-service.js` → `getStoreCapacityData`, `getStoreCapacityStoreDetail`

## Response shapes

**Store level:** `{ table_config: Column[], table_data: Row[] }`

**Store detail:**
```js
{
  table_config: {
    hierarchy: Column[],  // parent grid, l0_name grouped
    article: Column[],    // expand detail grid
  },
  table_data: [{
    l0_name, ...,
    articles: Row[]       // per hierarchy row
  }]
}
```

## UI structure

```
StoreCapacityNewTable (parent)
├── store_code link click → nestedTable (ArticlesTable pattern)
└── StoreCapacityDetailTable (child)
    ├── columns from table_config.hierarchy
    ├── l0_name → agGroupCellRenderer (expand)
    └── detailCellRenderer → article table (SizeViewDetailsTable pattern)
        ├── columns from table_config.article (store in ref — AG Grid caches renderer)
        └── rowdata from params.data.articles (each hierarchy row in table_data)
            └── allocated_qty link → StoreCapacityPopup (onClick must mutate column after formatter — cellRenderer closes over same item ref)
```

## Custom renderers (parent)
- `store_code` → link button
- `store_name` → ColoredBadge + redWarning if `breached_capacity_groups > 0`

## Header options
- `topCenterOptions` — info Alert banner
- `topRightOptions` — tooltip + "View breached only" Switch

## Files
- `StoreCapacityNewTable.jsx` — parent table
- `StoreCapacityDetailTable.jsx` — store drill-down + l0_name/article expand

## References
- nestedTable: `ArticlesTable.jsx` (2313-2316)
- masterDetail: `SizeViewDetailsTable.jsx` (171-223)
- cellRenderer: `Store-Transfer-Rule_New_Flow/index.jsx`, `ruleTypeCellRenderer.js`
