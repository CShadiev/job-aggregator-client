import { LinkOutlined } from "@ant-design/icons";
import {
  Alert,
  Flex,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { formatDateTime } from "../../utils/date";
import { formatScore, scoreStatus } from "../../utils/format";
import type { JobFeedItem, JobFeedParams } from "../../types/jobs";
import JobStatusEditor from "./JobStatusEditor";
import "./JobList.sass";

interface JobListProps {
  listKey: string;
  jobs: JobFeedItem[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  filterContext: JobFeedParams;
  onPageChange: (page: number, pageSize: number) => void;
  emptyTitle: string;
  emptyDescription: string;
  allowSkip?: boolean;
}

export default function JobList({
  listKey,
  jobs,
  total,
  page,
  pageSize,
  loading,
  filterContext,
  onPageChange,
  emptyTitle,
  emptyDescription,
  allowSkip = false,
}: JobListProps) {
  const columns: TableColumnsType<JobFeedItem> = [
    {
      title: "Job",
      key: "job",
      width: "28%",
      onCell: () => ({
        style: { wordBreak: "break-word", whiteSpace: "normal" },
      }),
      render: (_, record) => (
        <Flex vertical gap={4}>
          <Typography.Link href={record.job.url} target="_blank">
            {record.job.title}
            <LinkOutlined style={{ marginInlineStart: 6 }} />
          </Typography.Link>
          <Typography.Text strong>{record.job.company}</Typography.Text>
          <Space size={[4, 4]} wrap>
            <Tag>{record.job.source}</Tag>
            {record.job.remote ? <Tag color="green">Remote</Tag> : null}
            {record.job.location ? (
              <Typography.Text type="secondary">
                {record.job.location}
              </Typography.Text>
            ) : null}
          </Space>
        </Flex>
      ),
    },
    {
      title: "Match scores",
      key: "scores",
      width: "18%",
      render: (_, record) => (
        <Flex vertical gap={12}>
          <div>
            <Typography.Text type="secondary">CV</Typography.Text>
            <Progress
              percent={record.fit.cv_ats_match_score}
              size="small"
              status={scoreStatus(record.fit.cv_ats_match_score)}
              format={(value) => formatScore(value ?? 0)}
            />
          </div>
          <div>
            <Typography.Text type="secondary">Profile</Typography.Text>
            <Progress
              percent={record.fit.profile_ats_match_score}
              size="small"
              status={scoreStatus(record.fit.profile_ats_match_score)}
              format={(value) => formatScore(value ?? 0)}
            />
          </div>
        </Flex>
      ),
    },
    {
      title: "Deal breakers",
      key: "deal_breakers",
      width: "18%",
      onCell: () => ({
        style: { wordBreak: "break-word", whiteSpace: "normal" },
      }),
      render: (_, record) =>
        record.fit.deal_breakers.length > 0 ? (
          <Flex vertical gap={4}>
            {record.fit.deal_breakers.map((item) => (
              <Tag key={item} color="red" className="deal-breaker-tag">
                {item}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">None</Typography.Text>
        ),
    },
    {
      title: "Application",
      key: "status",
      width: "20%",
      render: (_, record) => (
        <JobStatusEditor
          jobUid={record.job.uid}
          status={record.status}
          filterContext={filterContext}
          allowSkip={allowSkip}
        />
      ),
    },
    {
      title: "Posted",
      key: "posted_at",
      width: "10%",
      render: (_, record) => (
        <Typography.Text>{formatDateTime(record.job.posted_at)}</Typography.Text>
      ),
    },
  ];

  return (
    <Table<JobFeedItem>
      className="job-list"
      key={listKey}
      rowKey={(record) => record.job.uid}
      columns={columns}
      dataSource={jobs}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: (count) => `${count} jobs`,
        onChange: onPageChange,
      }}
      expandable={{
        expandedRowRender: (record) => (
          <Flex vertical gap={12}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {record.fit.summary}
            </Typography.Paragraph>
            {record.job.tags.length > 0 ? (
              <Space size={[4, 4]} wrap>
                {record.job.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            ) : null}
          </Flex>
        ),
        rowExpandable: (record) =>
          Boolean(record.fit.summary || record.job.tags.length > 0),
      }}
      locale={{
        emptyText: (
          <Alert
            type="info"
            showIcon
            message={emptyTitle}
            description={emptyDescription}
          />
        ),
      }}
    />
  );
}
