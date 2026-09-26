import React from 'react';
import NetworkChart from './NetworkChart/index.jsx';

const transformRouteData = (routes) => {
  // Create maps to store unique nodes and their types
  const nodesMap = new Map();
  const storeGroups = new Map();
  const links = [];
  const linkLabels = {};
  const nodeLevels = {};

  // First pass: Create Vendor and DC nodes, and collect store information
  routes.forEach(route => {
    const {
      source_node_id,
      source_node_name,
      destination_node_id,
      destination_node_name,
      route_type_name,
      lead_time,
      shipping_mode
    } = route;

    // Handle Vendor and DC nodes
    if (route_type_name === 'Vendor-DC') {
      // Add Vendor node
      if (!nodesMap.has(source_node_id)) {
        nodesMap.set(source_node_id, {
          id: source_node_id.toString(),
          text: source_node_name,
          type: 'Vendor'
        });
        nodeLevels[source_node_id.toString()] = 0;
      }

      // Add DC node
      if (!nodesMap.has(destination_node_id)) {
        nodesMap.set(destination_node_id, {
          id: destination_node_id.toString(),
          text: destination_node_name,
          type: 'DC'
        });
        nodeLevels[destination_node_id.toString()] = 1;
      }

      // Add Vendor-DC link
      const linkKey = `${source_node_id}-${destination_node_id}`;
      links.push([source_node_id.toString(), destination_node_id.toString()]);
      linkLabels[linkKey] = `${lead_time} days (${shipping_mode})`;
    }

    // Handle DC-DC routes
    if (route_type_name === 'DC-DC') {
      // Add source DC node if it doesn't exist
      if (!nodesMap.has(source_node_id)) {
        nodesMap.set(source_node_id, {
          id: source_node_id.toString(),
          text: source_node_name,
          type: 'DC'
        });
        nodeLevels[source_node_id.toString()] = 1;
      }

      // Add destination DC node if it doesn't exist
      if (!nodesMap.has(destination_node_id)) {
        nodesMap.set(destination_node_id, {
          id: destination_node_id.toString(),
          text: destination_node_name,
          type: 'DC'
        });
        nodeLevels[destination_node_id.toString()] = 1;
      }

      // Add DC-DC link
      const linkKey = `${source_node_id}-${destination_node_id}`;
      links.push([source_node_id.toString(), destination_node_id.toString()]);
      linkLabels[linkKey] = `${lead_time} days (${shipping_mode})`;
    }

    // Collect store information under DC
    if (route_type_name === 'DC-Store') {
      const dcId = source_node_id.toString();

      // Initialize store group for this DC if not exists
      if (!storeGroups.has(dcId)) {
        storeGroups.set(dcId, {
          id: `store-group-${dcId}`,
          text: `${source_node_name} Stores`,
          type: 'Store',
          details: {
            text: `${source_node_name} Stores`,
            stores: []
          }
        });
        nodeLevels[`store-group-${dcId}`] = 2;
      }

      // Add store to the DC's group
      const group = storeGroups.get(dcId);
      group.details.stores.push({
        name: destination_node_name,
        deliveryTime: `${lead_time} days`
      });

      // Update the link information
      if (!links.some(([start, end]) => start === dcId && end === `store-group-${dcId}`)) {
        links.push([dcId, `store-group-${dcId}`]);
        linkLabels[`${dcId}-store-group-${dcId}`] = `${lead_time} days (${shipping_mode})`;
      }
    }
  });

  // Add store group nodes to the main nodes map
  storeGroups.forEach((group) => {
    nodesMap.set(group.id, group);
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
    nodeLevels,
    linkLabels,
    storeDetails: Object.fromEntries(
      Array.from(storeGroups.entries()).map(([dcId, group]) => [dcId, group.details])
    )
  };
};

const Network = ({ networkData }) => {
  const baseNetworkProps = transformRouteData(networkData?.routes);

  return <NetworkChart {...baseNetworkProps} networkName={networkData.network_name} />;
};

export default Network;
