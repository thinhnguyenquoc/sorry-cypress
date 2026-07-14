import {
  ArrowBack as ArrowBackIcon,
  Loop as LoopIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Toolbar } from '@sorry-cypress/dashboard/components';
import {
  GetRunQuery,
  useGetRunQuery,
} from '@sorry-cypress/dashboard/generated/graphql';
import {
  getProjectPath,
  getRunPath,
  NavItemType,
  setNav,
} from '@sorry-cypress/dashboard/lib/navigation';
import { environment } from '@sorry-cypress/dashboard/state/environment';
import React, {
  FunctionComponent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const RunReportView: FunctionComponent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const { loading, error, data } = useGetRunQuery({
    variables: { runId: id! },
  });

  updateNav(data);

  const masterServerUrl = environment.MASTER_SERVER_URL;
  const ciBuildId = data?.run?.meta?.ciBuildId;
  const reportUrl = masterServerUrl && ciBuildId
    ? `${masterServerUrl}/reports/builds/${encodeURIComponent(ciBuildId)}/index.html`
    : null;

  const handleRefresh = () => {
    setIframeLoaded(false);
    setIframeError(false);
    setIframeKey((k) => k + 1);
  };

  if (loading) {
    return (
      <>
        <Grid container justifyContent="right" spacing={1}>
          <Grid item>
            <Skeleton variant="rectangular" height={37} width={120} sx={{ mb: 2 }} animation="wave" />
          </Grid>
          <Grid item>
            <Skeleton variant="rectangular" height={37} width={120} sx={{ mb: 2 }} animation="wave" />
          </Grid>
        </Grid>
        <Skeleton variant="rectangular" height="80vh" animation="wave" />
      </>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="filled">
        {error.toString()}
      </Alert>
    );
  }

  if (!data?.run) {
    return (
      <Alert severity="error" variant="filled">
        Non-existing run
      </Alert>
    );
  }

  if (!masterServerUrl) {
    return (
      <Alert severity="warning" variant="filled">
        MASTER_SERVER_URL is not configured. Please set it in docker-compose.
      </Alert>
    );
  }

  if (!reportUrl) {
    return (
      <Alert severity="info" variant="filled">
        No report available for this run.
      </Alert>
    );
  }

  return (
    <>
      <Toolbar
        actions={[
          {
            key: 'backToRun',
            text: 'Back to Run',
            icon: ArrowBackIcon,
            toggleButton: false,
            onClick: () => navigate(`/${getRunPath(id!)}`),
          },
          {
            key: 'refreshReport',
            text: 'Refresh Report',
            icon: RefreshIcon,
            toggleButton: false,
            onClick: handleRefresh,
          },
          {
            key: 'openNewTab',
            text: 'Open in New Tab',
            icon: OpenInNewIcon,
            toggleButton: false,
            onClick: () => window.open(reportUrl, '_blank', 'noopener,noreferrer'),
          },
        ]}
      />

      {/* Build ID label */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Report for build:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            bgcolor: 'action.hover',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            fontSize: '0.8rem',
          }}
        >
          {ciBuildId}
        </Typography>
        <Tooltip title={reportUrl}>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{
              maxWidth: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'help',
            }}
          >
            {reportUrl}
          </Typography>
        </Tooltip>
      </Box>

      {/* Iframe container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 220px)',
          minHeight: 500,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {/* Loading overlay */}
        {!iframeLoaded && !iframeError && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              zIndex: 1,
              bgcolor: 'background.paper',
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              Loading report...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {iframeError && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              zIndex: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Keep patient to get report
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The report may not have been generated yet for this build.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Try opening directly
            </Button>
          </Box>
        )}

        <Box
          key={iframeKey}
          ref={iframeRef}
          component="iframe"
          src={reportUrl}
          title={`HTML Report - ${ciBuildId}`}
          onLoad={() => setIframeLoaded(true)}
          onError={() => {
            setIframeLoaded(true);
            setIframeError(true);
          }}
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            opacity: iframeLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </Box>
    </>
  );
};

const updateNav = (data?: GetRunQuery) =>
  useLayoutEffect(() => {
    if (!data?.run) {
      setNav([]);
      return;
    }
    setNav([
      {
        type: NavItemType.projects,
        label: 'Projects',
        link: './projects',
      },
      {
        type: NavItemType.project,
        label: data.run.meta.projectId,
        link: getProjectPath(data.run.meta.projectId),
      },
      {
        type: NavItemType.latestRuns,
        label: 'Runs',
        link: getProjectPath(data.run.meta.projectId),
      },
      {
        type: NavItemType.run,
        label: data.run.meta.ciBuildId,
        link: getRunPath(data.run.runId),
      },
    ]);
  }, [data]);
