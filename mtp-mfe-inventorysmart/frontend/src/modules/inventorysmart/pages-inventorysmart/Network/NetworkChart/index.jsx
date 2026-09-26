import React, { useState, useEffect } from "react";
import Xarrow from "react-xarrows";
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useStyles } from './styles.js';

const NetworkGraph = ({
    nodes,
    links,
    nodeLevels,
    linkLabels,
    networkName,
    levelColors = {
        Vendor: { bg: '#E8F5E9', border: '#43A047' },  // Green theme for Vendors (swapped)
        DC: { bg: '#FFF3E0', border: '#FB8C00' },      // Orange theme for DCs (swapped)
        Store: { bg: '#FFFFFF', border: '#e0e0e0' }    // White background with light gray border for Stores
    }
}) => {
    const classes = useStyles();
    const [scales, setScales] = useState({});
    const [positions, setPositions] = useState({});
    const [nodePositions, setNodePositions] = useState({});
    const [isDragging, setIsDragging] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Iniialize node positions
    useEffect(() => {
        const initialNodePositions = {};
        nodes.forEach(node => {
            initialNodePositions[node.id] = { x: 0, y: 0 };
        });
        setNodePositions(initialNodePositions);
    }, [nodes]);

    // Mouse event handlers for panning
    const handleMouseDown = (componentId, e) => {
        if (e.target.closest('.draggable-node')) return; // Don't start panning if clicking a node
        setIsDragging(componentId);
        const currentPosition = positions[componentId] || { x: 0, y: 0 };
        setDragStart({
            x: e.clientX - currentPosition.x,
            y: e.clientY - currentPosition.y
        });
    };

    const handleNodeMouseDown = (nodeId, e) => {
        e.stopPropagation();
        setIsDragging(`node-${nodeId}`);
        const nodePosition = nodePositions[nodeId] || { x: 0, y: 0 };
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setDragStart({
            x: e.clientX - nodePosition.x,
            y: e.clientY - nodePosition.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        if (isDragging === 'main') {
            setPositions(prev => ({
                ...prev,
                [isDragging]: {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                }
            }));
        } else if (isDragging.startsWith('node-')) {
            const nodeId = isDragging.replace('node-', '');
            const mainPosition = positions['main'] || { x: 0, y: 0 };
            
            setNodePositions(prev => ({
                ...prev,
                [nodeId]: {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                }
            }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(null);
    };

    // Get all root nodes (level 0)
    const getRootNodes = () => {
        return Object.entries(nodeLevels)
            .filter(([_, level]) => level === 0)
            .map(([id]) => id)
            .sort();
    };

    // Helper function to get all nodes in a component
    const getNodesInComponent = (rootId) => {
        const result = new Set();
        const traverse = (nodeId) => {
            result.add(nodeId);
            links.forEach(([start, end]) => {
                if (start === nodeId) {
                    traverse(end);
                }
            });
        };
        traverse(rootId);
        return Array.from(result);
    };

    // Group nodes by their root component
    const rootNodes = getRootNodes();
    const componentGroups = rootNodes.reduce((acc, rootId) => {
        const componentNodes = getNodesInComponent(rootId);
        const componentLinks = links.filter(([start, end]) => 
            componentNodes.includes(start) && componentNodes.includes(end)
        );
        acc[rootId] = {
            nodes: nodes.filter(node => componentNodes.includes(node.id)),
            links: componentLinks
        };
        return acc;
    }, {});

    // Helper function to get node level
    const getNodeLevel = (id) => {
        return nodeLevels[id] || 0;
    };

    // Helper function to calculate the height of a component
    const calculateComponentHeight = (componentNodes) => {
        // Group nodes by level
        const nodesByLevel = {};
        componentNodes.forEach(node => {
            const level = getNodeLevel(node.id);
            if (!nodesByLevel[level]) nodesByLevel[level] = [];
            nodesByLevel[level].push(node);
        });

        // Calculate total height needed for the component
        let maxHeight = 0;
        Object.values(nodesByLevel).forEach(nodes => {
            // Calculate height needed for this level
            const nodesCount = nodes.length;
            
            // Get the tallest node in this level
            const maxNodeHeight = Math.max(...nodes.map(node => node.height || 40));
            
            // Calculate total height needed for this level including spacing
            const levelHeight = (nodesCount - 1) * 120 + maxNodeHeight; // Reduced spacing between nodes in same level
            
            maxHeight = Math.max(maxHeight, levelHeight);
        });

        return maxHeight + 20; // Minimal padding
    };

    // Calculate vertical offsets for each component
    const componentOffsets = {};
    let currentOffset = 0;
    Object.entries(componentGroups).forEach(([rootId, { nodes: componentNodes }], index) => {
        if (index === 0) {
            componentOffsets[rootId] = 30; // Keep first graph near top
            currentOffset = 30;
        } else {
            // Get height of previous component and add spacing
            const prevRootId = Object.keys(componentGroups)[index - 1];
            const prevHeight = calculateComponentHeight(componentGroups[prevRootId].nodes);
            currentOffset += prevHeight + 150; // Changed from 100px to 150px gap between graphs
            componentOffsets[rootId] = currentOffset;
        }
    });

    // Add node dimension constants at the top of the component
    const NODE_DIMENSIONS = {
        Vendor: { width: 120, height: 40 },
        DC: { width: 120, height: 40 },
        Store: { width: 250, height: (details) => {
            const baseHeight = 40;
            const storeHeight = 30;
            const padding = 15;
            const calculatedHeight = baseHeight + (details.stores.length * storeHeight) + padding;
            return Math.min(calculatedHeight, 145);
        }}
    };

    // Helper function to get node dimensions
    const getNodeDimensions = (node) => {
        const dimensions = NODE_DIMENSIONS[node.type];
        return {
            width: dimensions.width,
            height: typeof dimensions.height === 'function' 
                ? dimensions.height(node.details)
                : dimensions.height
        };
    };

    // Update calculateNodePosition function
    const calculateNodePosition = (id, componentNodes, rootId) => {
        const nodeLevel = getNodeLevel(id);
        const baseOffset = componentOffsets[rootId] || 0;
        
        // Group nodes by level within their component
        const nodesInLevels = {};
        componentNodes.forEach(node => {
            const level = getNodeLevel(node.id);
            if (!nodesInLevels[level]) nodesInLevels[level] = [];
            nodesInLevels[level].push(node.id);
        });

        const nodesAtSameLevel = nodesInLevels[nodeLevel] || [];
        const indexAtLevel = nodesAtSameLevel.indexOf(id);
        const totalNodesAtLevel = nodesAtSameLevel.length;

        // Find node type
        const currentNode = componentNodes.find(node => node.id === id);
        const isStoreGroup = currentNode?.type === 'Store';

        // Adjust horizontal spacing
        const baseHorizontalSpacing = 400; // Base spacing for non-store nodes
        let horizontalPosition;

        if (isStoreGroup) {
            // For store groups, alternate between longer and shorter distances
            const storeGroupIndex = componentNodes
                .filter(node => node.type === 'Store')
                .findIndex(node => node.id === id);
            
            const baseStoreDistance = baseHorizontalSpacing - 100; // Reduce base distance for store groups by 100px
            const alternateOffset = storeGroupIndex % 2 === 0 ? 400 : 0; // Changed from 200px to 300px for even-indexed store groups
            horizontalPosition = 200 + (nodeLevel * baseStoreDistance) + alternateOffset;
        } else {
            // For non-store nodes (Vendors and DCs), use regular spacing
            horizontalPosition = 100 + (nodeLevel * baseHorizontalSpacing);
        }

        // Find the first route (Vendor -> DC -> Store)
        const firstVendor = componentNodes.find(node => node.type === 'Vendor');
        const vendorLinks = links.filter(([start, _]) => start === firstVendor?.id);
        const firstDC = vendorLinks.length > 0 ? 
            componentNodes.find(node => node.id === vendorLinks[0][1]) : null;
        const dcLinks = firstDC ? 
            links.filter(([start, _]) => start === firstDC.id) : [];
        const firstStoreGroup = dcLinks.length > 0 ?
            componentNodes.find(node => node.id === dcLinks[0][1]) : null;

        // Check if this node is part of the first route
        const isFirstRoute = (firstVendor && id === firstVendor.id) ||
            (firstDC && id === firstDC.id) ||
            (firstStoreGroup && id === firstStoreGroup.id);

        // Calculate vertical position
        let verticalPosition;
        const baseVerticalSpacing = 120; // Changed from 150px to 120px for smaller vertical gaps

        if (isFirstRoute) {
            // Place first route nodes in the middle of their section
            verticalPosition = baseOffset + 30;
        } else {
            // For other nodes, ensure they're placed below the first route
            // Calculate how many nodes are above this one at the same level
            const nodesAbove = nodesAtSameLevel.filter((nId, idx) => idx < indexAtLevel).length;
            
            // Start positioning from the first route's vertical position
            const startY = baseOffset + 30;
            
            // Add spacing for each node above
            verticalPosition = startY + ((nodesAbove + 1) * baseVerticalSpacing);
        }

        const nodePosition = nodePositions[id] || { x: 0, y: 0 };

        // Adjust vertical position for store nodes
        if (currentNode?.type === 'Store') {
            // Get store group index to determine if it's closer or farther
            const storeGroupIndex = componentNodes
                .filter(node => node.type === 'Store')
                .findIndex(node => node.id === id);
            
            // Apply different offsets based on store position
            if (storeGroupIndex % 2 === 0) {
                verticalPosition -= 40; // Closer store groups (even index)
            } else {
                verticalPosition -= 60; // Farther store groups (odd index)
            }
        }

        return {
            left: horizontalPosition + nodePosition.x,
            top: verticalPosition + nodePosition.y
        };
    };

    const StoreNode = ({ details }) => (
        <div className={classes.storeNode}>
            <div className={classes.storeHeader}>
                {details.text}
            </div>
            <div className={classes.storeContent}>
                {details.stores.map((store, index) => (
                    <div key={index} className={classes.storeItem}>
                        <div className={classes.storeItemLeft}>
                            <StorefrontIcon style={{ fontSize: '14px', color: '#1976d2' }} />
                            <span>{store.name}</span>
                        </div>
                        <span className={classes.storeItemRight}>{store.deliveryTime}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className={classes.root}>
            <div className={classes.title}>
                {networkName}
            </div>
            <div className={classes.container}>
                <div className={classes.graphContainer}>
                    <div
                        onMouseDown={(e) => handleMouseDown('main', e)}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className={`${classes.draggableArea} ${isDragging === 'main' ? 'dragging' : ''}`}
                        style={{
                            transform: `translate(${(positions['main'] || { x: 0, y: 0 }).x}px, ${(positions['main'] || { x: 0, y: 0 }).y}px) scale(${scales['main'] || 1})`,
                            transformOrigin: "top left"
                        }}>
                        {Object.entries(componentGroups).map(([rootId, { nodes: componentNodes, links: componentLinks }]) => {
                            // Calculate first route nodes for this component
                            const firstVendor = componentNodes.find(node => node.type === 'Vendor');
                            const vendorLinks = links.filter(([start, _]) => start === firstVendor?.id);
                            const firstDC = vendorLinks.length > 0 ? 
                                componentNodes.find(node => node.id === vendorLinks[0][1]) : null;
                            const dcLinks = firstDC ? 
                                links.filter(([start, _]) => start === firstDC.id) : [];
                            const firstStoreGroup = dcLinks.length > 0 ?
                                componentNodes.find(node => node.id === dcLinks[0][1]) : null;
                            
                            const firstRouteNodes = [
                                firstVendor?.id,
                                firstDC?.id,
                                firstStoreGroup?.id
                            ].filter(Boolean);

                            return (
                                <React.Fragment key={rootId}>
                                    {componentNodes.map((model) => {
                                        const colors = levelColors[model.type];
                                        const position = calculateNodePosition(model.id, componentNodes, rootId);
                                        const dimensions = getNodeDimensions(model);

                                        const nodeStyle = {
                                            left: position.left,
                                            top: position.top,
                                            width: dimensions.width,
                                            height: dimensions.height,
                                            backgroundColor: colors.bg,
                                            borderColor: colors.border,
                                            padding: model.type === 'Store' ? '0px' : '0px',
                                            boxShadow: model.type === 'Store' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                        };

                                        return (
                                            <div
                                                key={model.id}
                                                id={model.id}
                                                className={`draggable-node ${classes.node}`}
                                                style={nodeStyle}
                                                onMouseDown={(e) => handleNodeMouseDown(model.id, e)}
                                            >
                                                {model.type === 'Store' ? (
                                                    <StoreNode details={model.details} />
                                                ) : (
                                                    model.text
                                                )}
                                            </div>
                                        );
                                    })}
                                    {componentLinks.map(([start, end]) => {
                                        const startNode = nodes.find(n => n.id === start);
                                        const endNode = nodes.find(n => n.id === end);
                                        const isDCToDC = startNode?.type === 'DC' && endNode?.type === 'DC';
                                        const isFirstRoute = firstRouteNodes.includes(start) && firstRouteNodes.includes(end);
                                        const isDCToStore = startNode?.type === 'DC' && endNode?.type === 'Store';
                                        
                                        let startAnchor = "right";
                                        let endAnchor = "left";
                                        let path = "smooth";
                                        
                                        if (isDCToDC) {
                                            // For DC-DC connections, connect from bottom to top
                                            startAnchor = "top";
                                            endAnchor = "bottom";
                                            path = "straight";
                                        } else if (isDCToStore) {
                                            // For DC-to-Store links, use same configuration as Vendor-DC links
                                            startAnchor = "right";
                                            endAnchor = "left";
                                            path = "straight";
                                        } else if (isFirstRoute) {
                                            // Keep first route straight and horizontal
                                            startAnchor = "right";
                                            endAnchor = "left";
                                            path = "straight";
                                        } else {
                                            // For other paths, use smooth
                                            startAnchor = "right";
                                            endAnchor = "left";
                                            path = "smooth";
                                        }

                                        return (
                                            <Xarrow
                                                key={`${start}-${end}`}
                                                start={start}
                                                end={end}
                                                path={path}
                                                color="#cccccc"
                                                strokeWidth={2}
                                                curveness={isDCToStore ? 0 : 0.2}
                                                headSize={6}
                                                labels={{
                                                    middle: linkLabels[`${start}-${end}`] && (
                                                        <div className={classes.linkLabel}>
                                                            {linkLabels[`${start}-${end}`]}
                                                        </div>
                                                    )
                                                }}
                                                showHead={true}
                                                startAnchor={startAnchor}
                                                endAnchor={endAnchor}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkGraph;