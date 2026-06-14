import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Collapse,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
} from "antd";
import {
  DEFAULT_JOB_FEED_QUERY,
  SORT_FIELD_LABELS,
  type JobFeedQuery,
  type JobFeedSortField,
  type SortOrder,
} from "../../types/jobs";

interface JobFiltersProps {
  query: JobFeedQuery;
  onApply: (query: JobFeedQuery) => void;
  onReset: () => void;
  loading?: boolean;
}

interface FilterFormValues {
  applied: boolean;
  remote?: "all" | "remote" | "onsite";
  sources?: string[];
  tags?: string[];
  location?: string;
  min_cv_ats_match_score?: number;
  min_profile_ats_match_score?: number;
  exclude_deal_breakers: boolean;
  show_skipped: boolean;
  sort_by: JobFeedSortField;
  sort_order: SortOrder;
}

function queryToFormValues(query: JobFeedQuery): FilterFormValues {
  return {
    applied: query.applied,
    remote:
      query.remote === undefined ? "all" : query.remote ? "remote" : "onsite",
    sources: query.sources,
    tags: query.tags,
    location: query.location,
    min_cv_ats_match_score: query.min_cv_ats_match_score,
    min_profile_ats_match_score: query.min_profile_ats_match_score,
    exclude_deal_breakers: query.exclude_deal_breakers,
    show_skipped: !query.exclude_skipped,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };
}

function formValuesToQuery(values: FilterFormValues): JobFeedQuery {
  return {
    applied: values.applied,
    remote: values.remote === "all" ? undefined : values.remote === "remote",
    sources: values.sources ?? [],
    tags: values.tags ?? [],
    location: values.location?.trim() || undefined,
    min_cv_ats_match_score: values.min_cv_ats_match_score,
    min_profile_ats_match_score: values.min_profile_ats_match_score,
    exclude_deal_breakers: values.exclude_deal_breakers,
    exclude_skipped: !values.show_skipped,
    active_only: false,
    sort_by: values.sort_by,
    sort_order: values.sort_order,
  };
}

export default function JobFilters({
  query,
  onApply,
  onReset,
  loading,
}: JobFiltersProps) {
  const [form] = Form.useForm<FilterFormValues>();

  return (
    <Collapse
      defaultActiveKey={[]}
      items={[
        {
          key: "filters",
          label: (
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined />
              <Typography.Text strong>Discovery filters</Typography.Text>
              <Typography.Text type="secondary">
                Apply to new opportunities only
              </Typography.Text>
            </Flex>
          ),
          children: (
            <Form
              form={form}
              layout="vertical"
              initialValues={queryToFormValues(query)}
              onFinish={(values) => onApply(formValuesToQuery(values))}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Remote" name="remote">
                    <Select
                      options={[
                        { value: "all", label: "All locations" },
                        { value: "remote", label: "Remote only" },
                        { value: "onsite", label: "On-site only" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Location" name="location">
                    <Input placeholder="City, region, or country" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Sources" name="sources">
                    <Select
                      mode="tags"
                      placeholder="e.g. arbeitnow, stepstone"
                      tokenSeparators={[","]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Tags" name="tags">
                    <Select
                      mode="tags"
                      placeholder="e.g. python, react"
                      tokenSeparators={[","]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item
                    label="Min CV match score"
                    name="min_cv_ats_match_score"
                  >
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item
                    label="Min profile match score"
                    name="min_profile_ats_match_score"
                  >
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Sort by" name="sort_by">
                    <Select
                      options={(
                        Object.entries(SORT_FIELD_LABELS) as [
                          JobFeedSortField,
                          string
                        ][]
                      ).map(([value, label]) => ({ value, label }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item label="Sort order" name="sort_order">
                    <Select
                      options={[
                        { value: "desc", label: "Descending" },
                        { value: "asc", label: "Ascending" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item
                    label="Exclude deal breakers"
                    name="exclude_deal_breakers"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8} lg={6}>
                  <Form.Item
                    label="Show skipped jobs"
                    name="show_skipped"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Flex gap={8} wrap="wrap">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={loading}
                >
                  Apply filters
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    form.setFieldsValue(
                      queryToFormValues(DEFAULT_JOB_FEED_QUERY)
                    );
                    onReset();
                  }}
                >
                  Reset
                </Button>
              </Flex>
            </Form>
          ),
        },
      ]}
    />
  );
}
