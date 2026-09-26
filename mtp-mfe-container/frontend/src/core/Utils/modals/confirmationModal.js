import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const ConfirmationModal = ({ title, content, onClose, open, className }) => {
    const handleCancel = () => {
        onClose();
    };

    const handleOk = () => {
        onClose('ok');
    };

    return (
        <Dialog
            className={className}
            maxWidth="xs"
            open={open}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {content}
            </DialogContent>
            <DialogActions>
                {/* Todo : Make the buttons generic too */}
                <Button autoFocus onClick={handleCancel}>
                    Cancel
                </Button>
                <Button onClick={handleOk}>Ok</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationModal;