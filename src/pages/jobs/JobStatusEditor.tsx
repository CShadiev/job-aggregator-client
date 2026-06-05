import { CheckOutlined, StopOutlined, UndoOutlined } from "@ant-design/icons";
import { Button, Flex, Select, Switch, Tag, Typography } from "antd";
import { useUpdateJobStatus } from "../../requests/jobs";
import {
  APPLICATION_STAGE_LABELS,
  DEFAULT_APPLY_STATUS,
  DEFAULT_SKIP_STATUS,
  type ApplicationStage,
  type JobApplicationStatus,
  type JobFeedParams,
} from "../../types/jobs";

interface JobStatusEditorProps {
  jobUid: string;
  status: JobApplicationStatus | null;
  filterContext: JobFeedParams;
  allowSkip?: boolean;
}

export default function JobStatusEditor({
  jobUid,
  status,
  filterContext,
  allowSkip = false,
}: JobStatusEditorProps) {
  const { updateStatus, isUpdating } = useUpdateJobStatus();

  if (status?.skipped) {
    return (
      <Flex vertical gap={8}>
        <Tag>Skipped</Tag>
        {allowSkip ? (
          <>
            <Button
              size="small"
              icon={<UndoOutlined />}
              loading={isUpdating}
              onClick={() =>
                updateStatus({
                  jobUid,
                  update: { skipped: false },
                  filterContext,
                })
              }
            >
              Unskip
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={isUpdating}
              onClick={() =>
                updateStatus({
                  jobUid,
                  update: DEFAULT_APPLY_STATUS,
                  filterContext,
                })
              }
            >
              Mark as applied
            </Button>
          </>
        ) : null}
      </Flex>
    );
  }

  if (!status) {
    return (
      <Flex vertical gap={8}>
        <Tag>Not applied</Tag>
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          loading={isUpdating}
          onClick={() =>
            updateStatus({
              jobUid,
              update: DEFAULT_APPLY_STATUS,
              filterContext,
            })
          }
        >
          Mark as applied
        </Button>
        {allowSkip ? (
          <Button
            size="small"
            icon={<StopOutlined />}
            loading={isUpdating}
            onClick={() =>
              updateStatus({
                jobUid,
                update: DEFAULT_SKIP_STATUS,
                filterContext,
              })
            }
          >
            Skip
          </Button>
        ) : null}
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <div>
        <Typography.Text type="secondary">Stage</Typography.Text>
        <Select
          style={{ width: "100%", marginTop: 4 }}
          value={status.stage}
          disabled={isUpdating}
          options={(
            Object.entries(APPLICATION_STAGE_LABELS) as [
              ApplicationStage,
              string,
            ][]
          ).map(([value, label]) => ({ value, label }))}
          onChange={(stage) =>
            updateStatus({
              jobUid,
              update: { stage },
              filterContext,
            })
          }
        />
      </div>
      <Flex align="center" gap={8}>
        <Switch
          checked={status.active}
          disabled={isUpdating}
          onChange={(active) =>
            updateStatus({
              jobUid,
              update: { active },
              filterContext,
            })
          }
        />
        <Typography.Text>
          {status.active ? "Active" : "Inactive"}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
