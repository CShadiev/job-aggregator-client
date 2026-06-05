import { Flex, Select, Typography } from "antd";
import { APPLIED_POSTED_WINDOW_OPTIONS } from "../../types/jobs";

interface AppliedJobsControlsProps {
  postedWithinDays: number;
  onPostedWithinDaysChange: (days: number) => void;
  count: number;
  loading?: boolean;
}

export default function AppliedJobsControls({
  postedWithinDays,
  onPostedWithinDaysChange,
  count,
  loading,
}: AppliedJobsControlsProps) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={16}
      wrap="wrap"
    >
      <Typography.Text type="secondary">
        {loading ? "Loading applications…" : `${count} applications in view`}
      </Typography.Text>
      <Flex align="center" gap={8} wrap="wrap">
        <Typography.Text>Posted within</Typography.Text>
        <Select
          value={postedWithinDays}
          style={{ minWidth: 160 }}
          options={APPLIED_POSTED_WINDOW_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={onPostedWithinDaysChange}
        />
      </Flex>
    </Flex>
  );
}
