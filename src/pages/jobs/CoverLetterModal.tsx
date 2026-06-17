import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Divider,
  Flex,
  Input,
  Modal,
  Skeleton,
  Space,
  Typography,
} from "antd";
import { useMemo, useState, type ReactNode } from "react";
import {
  downloadCoverLetterPdf,
  useCoverLetter,
  useUpdateCoverLetter,
} from "../../requests/coverLetter";
import type {
  CoverLetterContent,
  CoverLetterSection,
} from "../../types/jobs";
import "./CoverLetterModal.sass";

interface CoverLetterModalProps {
  jobUid: string | null;
  jobTitle?: string;
  company?: string;
  open: boolean;
  onClose: () => void;
}

interface EditContext {
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
}

type LinkField = "linkedin" | "website";

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface FieldEditorProps {
  initial: string;
  multiline: boolean;
  onCommit: (next: string) => void;
  onCancel: () => void;
}

function FieldEditor({
  initial,
  multiline,
  onCommit,
  onCancel,
}: FieldEditorProps) {
  const [draft, setDraft] = useState(initial);
  const commit = () => onCommit(draft.trim());

  if (multiline) {
    return (
      <Input.TextArea
        autoFocus
        autoSize={{ minRows: 2 }}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
      />
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onPressEnter={commit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    />
  );
}

interface InlineEditableProps {
  editKey: string;
  value: string;
  placeholder: string;
  ctx: EditContext;
  onCommit: (next: string) => void;
  render: (text: string) => ReactNode;
  multiline?: boolean;
  block?: boolean;
}

function InlineEditable({
  editKey,
  value,
  placeholder,
  ctx,
  onCommit,
  render,
  multiline = false,
  block = true,
}: InlineEditableProps) {
  const active = ctx.activeKey === editKey;

  if (active) {
    return (
      <FieldEditor
        initial={value}
        multiline={multiline}
        onCommit={(next) => {
          onCommit(next);
          ctx.setActiveKey(null);
        }}
        onCancel={() => ctx.setActiveKey(null)}
      />
    );
  }

  const Wrapper = block ? "div" : "span";

  return (
    <Wrapper
      className="cl-editable"
      role="button"
      tabIndex={0}
      onClick={() => ctx.setActiveKey(editKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter") ctx.setActiveKey(editKey);
      }}
    >
      {value ? (
        render(value)
      ) : (
        <span className="cl-placeholder">{placeholder}</span>
      )}
    </Wrapper>
  );
}

interface SectionEditorProps {
  initial: CoverLetterSection;
  onCommit: (next: CoverLetterSection) => void;
  onCancel: () => void;
  onRemove: () => void;
}

function SectionEditor({
  initial,
  onCommit,
  onCancel,
  onRemove,
}: SectionEditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.content.join("\n\n"));

  const commit = () => {
    const content = body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
    onCommit({ title: title.trim(), content });
  };

  return (
    <div className="cl-section cl-section--editing">
      <Input
        autoFocus
        value={title}
        placeholder="Section title"
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input.TextArea
        value={body}
        autoSize={{ minRows: 3 }}
        placeholder="Section content (separate paragraphs with a blank line)"
        onChange={(event) => setBody(event.target.value)}
      />
      <Flex justify="space-between" align="center">
        <Button danger size="small" type="text" onClick={onRemove}>
          Remove section
        </Button>
        <Space>
          <Button size="small" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={commit}>
            Done
          </Button>
        </Space>
      </Flex>
    </div>
  );
}

interface SectionBlockProps {
  index: number;
  section: CoverLetterSection;
  ctx: EditContext;
  onChange: (next: CoverLetterSection) => void;
  onRemove: () => void;
}

function SectionBlock({
  index,
  section,
  ctx,
  onChange,
  onRemove,
}: SectionBlockProps) {
  const editKey = `section-${index}`;
  const active = ctx.activeKey === editKey;

  if (active) {
    return (
      <SectionEditor
        initial={section}
        onCommit={(next) => {
          onChange(next);
          ctx.setActiveKey(null);
        }}
        onCancel={() => ctx.setActiveKey(null)}
        onRemove={onRemove}
      />
    );
  }

  return (
    <div
      className="cl-section cl-editable"
      role="button"
      tabIndex={0}
      onClick={() => ctx.setActiveKey(editKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter") ctx.setActiveKey(editKey);
      }}
    >
      {section.title ? (
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          {section.title}
        </Typography.Title>
      ) : (
        <span className="cl-placeholder">Untitled section</span>
      )}
      {section.content.length > 0 ? (
        section.content.map((paragraph, paragraphIndex) => (
          <Typography.Paragraph
            key={paragraphIndex}
            style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}
          >
            {paragraph}
          </Typography.Paragraph>
        ))
      ) : (
        <span className="cl-placeholder">Click to add content</span>
      )}
    </div>
  );
}

export default function CoverLetterModal({
  jobUid,
  jobTitle,
  company,
  open,
  onClose,
}: CoverLetterModalProps) {
  const { message, modal } = App.useApp();
  const query = useCoverLetter(open ? jobUid : null);
  const { mutate: save, isPending: isSaving } = useUpdateCoverLetter(
    jobUid ?? ""
  );

  const [draft, setDraft] = useState<CoverLetterContent | null>(null);
  const [syncedData, setSyncedData] = useState<CoverLetterContent | undefined>(
    undefined
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Seed the editable draft from server data during render (no effect needed).
  // Re-runs whenever a different cover letter is loaded.
  if (query.data !== syncedData) {
    setSyncedData(query.data);
    setDraft(query.data ?? null);
    setActiveKey(null);
  }

  const dirty = useMemo(() => {
    if (!draft || !query.data) return false;
    return JSON.stringify(draft) !== JSON.stringify(query.data);
  }, [draft, query.data]);

  const ctx: EditContext = { activeKey, setActiveKey };

  const update = (patch: Partial<CoverLetterContent>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const updateSection = (index: number, next: CoverLetterSection) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, sectionIndex) =>
              sectionIndex === index ? next : section
            ),
          }
        : current
    );

  const removeSection = (index: number) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: current.sections.filter(
              (_, sectionIndex) => sectionIndex !== index
            ),
          }
        : current
    );

  const addSection = () => {
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: [...current.sections, { title: "", content: [] }],
          }
        : current
    );
    setActiveKey(`section-${draft?.sections.length ?? 0}`);
  };

  const doClose = () => {
    // Drop the local draft so reopening always starts from server state.
    setActiveKey(null);
    setSyncedData(undefined);
    setDraft(null);
    onClose();
  };

  const handleClose = () => {
    if (dirty) {
      modal.confirm({
        title: "Discard unsaved changes?",
        content:
          "You have edits that have not been saved. Closing now will discard them.",
        okText: "Discard",
        okButtonProps: { danger: true },
        cancelText: "Keep editing",
        onOk: doClose,
      });
      return;
    }
    doClose();
  };

  const handleSave = () => {
    if (!draft || !jobUid) return;
    save(draft, {
      onSuccess: () => message.success("Cover letter saved"),
      onError: () => message.error("Could not save the cover letter"),
    });
  };

  const handleDownload = async () => {
    if (!jobUid) return;
    const baseName =
      [company, jobTitle].filter(Boolean).join("-") || "cover-letter";
    try {
      setIsDownloading(true);
      await downloadCoverLetterPdf(
        jobUid,
        `${sanitizeFileName(baseName)}-cover-letter.pdf`
      );
    } catch {
      message.error("Could not download the PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderLinkMap = (field: LinkField, map: Record<string, string>) =>
    Object.entries(map).map(([label, link]) => (
      <span className="cl-contact-item" key={`${field}-${label}`}>
        <Typography.Text type="secondary">{label}:&nbsp;</Typography.Text>
        <InlineEditable
          editKey={`${field}-${label}`}
          value={link}
          placeholder="https://..."
          block={false}
          ctx={ctx}
          onCommit={(next) =>
            update({
              [field]: { ...map, [label]: next },
            } as Partial<CoverLetterContent>)
          }
          render={(text) => <Typography.Text>{text}</Typography.Text>}
        />
      </span>
    ));

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Cover letter"
      width={760}
      maskClosable={false}
      destroyOnHidden
      footer={
        <Flex justify="space-between" align="center">
          <Button
            icon={<DownloadOutlined />}
            loading={isDownloading}
            disabled={!query.data}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
          <Space>
            <Button onClick={handleClose}>Close</Button>
            <Button
              type="primary"
              loading={isSaving}
              disabled={!dirty}
              onClick={handleSave}
            >
              Save changes
            </Button>
          </Space>
        </Flex>
      }
    >
      {query.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : query.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load cover letter"
          description={
            query.error instanceof Error
              ? query.error.message
              : "Something went wrong while fetching the cover letter."
          }
        />
      ) : draft ? (
        <div className="cl-document">
          <InlineEditable
            editKey="name"
            value={draft.name}
            placeholder="Your name"
            ctx={ctx}
            onCommit={(next) => update({ name: next })}
            render={(text) => (
              <Typography.Title level={3} style={{ margin: 0 }}>
                {text}
              </Typography.Title>
            )}
          />
          <InlineEditable
            editKey="title"
            value={draft.title}
            placeholder="Your title"
            ctx={ctx}
            onCommit={(next) => update({ title: next })}
            render={(text) => (
              <Typography.Text type="secondary" style={{ fontSize: 16 }}>
                {text}
              </Typography.Text>
            )}
          />
          <Flex wrap gap="small" align="center" className="cl-contact">
            <InlineEditable
              editKey="email"
              value={draft.email}
              placeholder="email@example.com"
              block={false}
              ctx={ctx}
              onCommit={(next) => update({ email: next })}
              render={(text) => <Typography.Text>{text}</Typography.Text>}
            />
            {renderLinkMap("linkedin", draft.linkedin)}
            {renderLinkMap("website", draft.website)}
          </Flex>

          <Divider />

          <Flex vertical gap={4}>
            {draft.sections.map((section, index) => (
              <SectionBlock
                key={index}
                index={index}
                section={section}
                ctx={ctx}
                onChange={(next) => updateSection(index, next)}
                onRemove={() => removeSection(index)}
              />
            ))}
          </Flex>

          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={addSection}
            style={{ marginTop: 12 }}
          >
            Add section
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
