import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import Icon from './Icon';

export default function LogoutConfirmDialog({ open, onClose, onConfirm }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="logout-dialog-title"
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
            <DialogTitle id="logout-dialog-title" sx={{ fontFamily: 'Georgia, serif', color: '#343B32', px: 3, pt: 3 }}>
                ¿Cerrar sesión?
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ bgcolor: '#E9EDE4', color: '#526047', borderRadius: 2, p: 1.5, display: 'flex' }}>
                        <Icon name="logout" />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#72796D', lineHeight: 1.8 }}>
                        ¿Estás seguro de que deseas cerrar tu sesión? Tendrás que iniciar sesión nuevamente para acceder a tu cuenta.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button variant="outlined" onClick={onClose} sx={{ color: '#526047', borderColor: '#AAB8A1', textTransform: 'none' }}>Cancelar</Button>
                <Button variant="contained" onClick={onConfirm} sx={{ bgcolor: '#68745B', textTransform: 'none', '&:hover': { bgcolor: '#526047' } }}>Cerrar sesión</Button>
            </DialogActions>
        </Dialog>
    );
}
