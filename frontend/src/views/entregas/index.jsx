import { Box, Typography, Stack } from '@mui/material';
import Icon from '../../ui-component/Icon';

export default function EntregasView() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          border: '1px solid #E1E7DD',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 4px 18px rgba(35, 52, 40, 0.025)'
        }}
      >
        {/* ENCABEZADO DE LA SECCIÓN */}
        <Box
          sx={{
            px: { xs: 2.5, md: 3.5 },
            py: 3,
            borderBottom: '1px solid #E8ECE5'
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Georgia, serif',
              fontSize: 23,
              fontWeight: 600,
              color: '#343B32'
            }}
          >
            Entregas de material
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: '#788174',
              mt: 0.5
            }}
          >
            Administración y seguimiento de entregas de fotografías y videos.
          </Typography>
        </Box>

        {/* ESTADO INFORMATIVO */}
        <Box
          sx={{
            px: 3,
            py: { xs: 5, md: 7 },
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Stack
            alignItems="center"
            spacing={2}
            sx={{
              maxWidth: 430,
              textAlign: 'center'
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '18px',
                bgcolor: '#EEF3EC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#254C40',
                fontSize: 28
              }}
            >
              <Icon name="package-check" />
            </Box>

            <Typography
              sx={{
                fontFamily: 'Georgia, serif',
                fontSize: 22,
                fontWeight: 600,
                color: '#343B32'
              }}
            >
              Seguimiento de entregas
            </Typography>

            <Typography
              sx={{
                fontSize: 14,
                lineHeight: 1.8,
                color: '#788174'
              }}
            >
              Aquí podrás administrar las entregas de material fotográfico
              y audiovisual asociado a los eventos del estudio.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
