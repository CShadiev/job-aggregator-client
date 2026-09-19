import {
  Button,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Switch,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect } from "react";
import type { ManualJobSubmitRequest } from "../../types/jobs";

interface SubmitJobModalProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ManualJobSubmitRequest, "job_uid">) => void;
}

interface SubmitJobFormValues {
  title: string;
  company: string;
  description_raw: string;
  url: string;
  location?: string;
  remote: boolean;
  tags?: string[];
  job_types?: string[];
  posted_at?: Dayjs | null;
}

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

function formValuesToRequest(
  values: SubmitJobFormValues
): Omit<ManualJobSubmitRequest, "job_uid"> {
  const location = values.location?.trim();
  return {
    title: values.title.trim(),
    company: values.company.trim(),
    description_raw: values.description_raw.trim(),
    url: values.url.trim(),
    location: location && location.length > 0 ? location : undefined,
    remote: values.remote,
    tags: values.tags ?? [],
    job_types: values.job_types ?? [],
    posted_at: values.posted_at?.toISOString(),
  };
}

export default function SubmitJobModal({
  open,
  submitting,
  onClose,
  onSubmit,
}: SubmitJobModalProps) {
  const [form] = Form.useForm<SubmitJobFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Submit a job"
      width={720}
      maskClosable={!submitting}
      keyboard={!submitting}
      destroyOnHidden
      onCancel={handleClose}
      footer={
        <Flex justify="end" gap={8}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
          >
            Submit
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Paste a structured posting. Once the API accepts it, assessment and
        cover letter generation continue in the background.
      </Typography.Paragraph>

      <Form
        form={form}
        layout="vertical"
        disabled={submitting}
        initialValues={{ remote: false, tags: [], job_types: [] }}
        onFinish={(values) => onSubmit(formValuesToRequest(values))}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Title is required" }]}
            >
              <Input placeholder="Senior Backend Engineer" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Company"
              name="company"
              rules={[{ required: true, message: "Company is required" }]}
            >
              <Input placeholder="Acme" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Posting URL"
          name="url"
          rules={[
            { required: true, message: "URL is required" },
            { type: "url", message: "Enter a valid URL" },
          ]}
        >
          <Input placeholder="https://example.com/jobs/senior-engineer" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description_raw"
          rules={[{ required: true, message: "Description is required" }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="Full job description"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Location" name="location">
              <Input placeholder="Berlin, Germany" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Posted at" name="posted_at">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Tags" name="tags">
              <Select
                mode="tags"
                placeholder="e.g. python, kubernetes"
                tokenSeparators={[","]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Job types" name="job_types">
              <Select
                mode="tags"
                placeholder="e.g. full-time"
                tokenSeparators={[","]}
                options={JOB_TYPE_OPTIONS}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Remote" name="remote" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
