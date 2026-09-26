import { makeStyles } from '@mui/styles';

export const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
        width: "100%",
        height: "100vh"
    },
    title: {
        fontSize: "24px",
        fontWeight: "bold",
        color: "#333",
        padding: "10px 0"
    },
    container: {
        flex: 1,
        background: "#f5f5f5",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
    },
    graphContainer: {
        flex: 1,
        border: '1px solid lightgray',
        borderRadius: '4px',
        position: 'relative',
        minWidth: "1200px",
        minHeight: "800px",
        background: "white",
        overflow: "auto"
    },
    draggableArea: {
        cursor: "grab",
        position: "absolute",
        minWidth: "100%",
        minHeight: "100%",
        width: "fit-content",
        height: "fit-content",
        padding: "60px",
        transition: "transform 0.1s ease-out",
        "&.dragging": {
            cursor: "grabbing",
            transition: "none"
        }
    },
    node: {
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "4px",
        padding: "0px",
        textAlign: "center",
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        minWidth: "100px",
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none'
    },
    storeNode: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    storeHeader: {
        fontSize: '13px',
        fontWeight: '500',
        padding: '10px 12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        color: '#333333'
    },
    storeContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0
    },
    storeItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        fontSize: '12px',
        color: '#333333'
    },
    storeItemLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    storeItemRight: {
        color: '#666666',
        fontSize: '11px'
    },
    linkLabel: {
        fontSize: '12px',
        color: '#666666',
        backgroundColor: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        whiteSpace: 'nowrap'
    }
})); 