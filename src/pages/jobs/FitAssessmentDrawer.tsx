import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import {
  Alert,
  Divider,
  Drawer,
  Flex,
  Progress,
  Skeleton,
  Typography,
  theme,
} from "antd";
import { useFitAssessment } from "../../requests/jobs";
import type { JobPosting } from "../../types/jobs";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatScore, scoreStatus } from "../../utils/format";

interface FitAssessmentDrawerProps {
  job: JobPosting | null;
  open: boolean;
  onClose: () => void;
}

// Points by which the profile score must beat the CV score before the CV is
// called out as underselling the candidate.
const CV_GAP_THRESHOLD = 15;

interface ScoreCardProps {
  label: string;
  score: number;
  description: string;
}

function ScoreCard({ label, score, description }: ScoreCardProps) {
  return (
    <Flex vertical align="center" gap={8} flex={1} style={{ minWidth: 0 }}>
      <Progress
        type="dashboard"
        percent={score}
        size={112}
        status={scoreStatus(score)}
        format={(value) => formatScore(value ?? 0)}
      />
      <Typography.Text strong>{label}</Typography.Text>
      <Typography.Text
        type="secondary"
        style={{ textAlign: "center", fontSize: 13 }}
      >
        {description}
      </Typography.Text>
    </Flex>
  );
}

export default function FitAssessmentDrawer({
  job,
  open,
  onClose,
}: FitAssessmentDrawerProps) {
  const { token } = theme.useToken();
  const { assessment, isLoading, isError, error } = useFitAssessment(
    open && job ? job.uid : null
  );

  const cvGap = assessment
    ? Math.round(
        assessment.profile_ats_match_score - assessment.cv_ats_match_score
      )
    : 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={560}
      destroyOnHidden
      title={
        job ? (
          <Flex vertical>
            <Typography.Text strong ellipsis>
              {job.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontWeight: "normal" }}>
              {job.company}
            </Typography.Text>
          </Flex>
        ) : (
          "Fit assessment"
        )
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title="Unable to load the fit assessment"
          description={getApiErrorMessage(
            error,
            "Something went wrong while fetching the assessment."
          )}
        />
      ) : assessment ? (
        <Flex vertical gap={16}>
          <Flex gap={16} wrap="wrap">
            <ScoreCard
              label="CV match"
              score={assessment.cv_ats_match_score}
              description="How your CV, as submitted, is likely to fare in ATS and recruiter screening."
            />
            <ScoreCard
              label="Profile match"
              score={assessment.profile_ats_match_score}
              description="Your real fit for the role, using your full profile including what the CV leaves out."
            />
          </Flex>

          {cvGap >= CV_GAP_THRESHOLD ? (
            <Alert
              type="info"
              showIcon
              title={`Your profile scores ${cvGap} points higher than your CV`}
              description="Your CV leaves out experience that fits this role. Tailoring it could help you get past the first screening."
            />
          ) : null}

          <Divider style={{ margin: 0 }} />

          <Flex vertical gap={8}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Deal breakers ({assessment.deal_breakers.length})
            </Typography.Title>
            {assessment.deal_breakers.length > 0 ? (
              assessment.deal_breakers.map((item) => (
                <Flex key={item} gap={8} align="baseline">
                  <CloseCircleOutlined style={{ color: token.colorError }} />
                  <Typography.Text>{item}</Typography.Text>
                </Flex>
              ))
            ) : (
              <Flex gap={8} align="baseline">
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Typography.Text type="secondary">
                  No unmet hard requirements were found.
                </Typography.Text>
              </Flex>
            )}
          </Flex>

          <Divider style={{ margin: 0 }} />

          <Flex vertical gap={8}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Summary
            </Typography.Title>
            <Typography.Paragraph
              style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
            >
              {assessment.summary || "No summary was written for this job."}
            </Typography.Paragraph>
          </Flex>
        </Flex>
      ) : null}
    </Drawer>
  );
}
